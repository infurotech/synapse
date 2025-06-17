import { useState, useCallback, useMemo, useRef } from 'react';
import { useWllama } from '../utils/wllama.context';
import { ToolExecutor } from './ToolExecutor';
import { tools } from './tools';
import { Task, Goal, CalendarEvent, Message, Conversation, User } from '../services/db/DatabaseSchema';
import { MemoryManager } from './MemoryManager';
import { 
  classifyQuery, 
  getFastResponse, 
  ResponseFormatter,
  performanceMonitor 
} from './AgentOptimizations';


// Configuration constants
const CONFIG = {
  ERROR_MESSAGES: {
    MODEL_NOT_LOADED: 'Model is not loaded yet. Please wait.',
    SYSTEM_BUSY: 'System is busy with another operation.',
    MODEL_LOADING: 'Model is currently loading. Please wait.',
    INVALID_TOOL: (toolName: string) => `Invalid tool: ${toolName}`,
    PARSING_ERROR: 'Failed to parse agent response',
  },
  PARSING: {
    MAX_CONTENT_LENGTH: 25000, // Increased for tool calls with calendar details
    MIN_SUBSTANTIAL_CONTENT: 10,
    STEP_PATTERN: /(THOUGHT:|TOOL_CALL:|FINAL_ANSWER:)/g,
    MAX_DEBUG_CONTENT: 200,
  },
  CACHE: {
    MAX_PROMPT_CACHE_SIZE: 50,
    PROMPT_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  },
  PERFORMANCE: {
    // Reserved for future performance optimizations
  }
} as const;

// Enhanced interfaces with better type safety
interface AgentStep {
  readonly type: 'thought' | 'tool_call' | 'tool_result' | 'final_answer' | 'user';
  readonly content: string;
  readonly toolName?: string;
  readonly toolArgs?: Record<string, unknown>;
  readonly toolResult?: ToolResult;
  readonly timestamp: Date;
  readonly id: string;
}

// Use database schema types directly
type TaskData = Task;
type GoalData = Goal;
type CalendarEventData = CalendarEvent;
type MessageData = Message;
type ConversationData = Conversation;
type UserData = User;

interface ToolResult extends Record<string, unknown> {
  readonly success: boolean;
  readonly message?: string;
  readonly task?: TaskData;
  readonly tasks?: TaskData[];
  readonly goal?: GoalData;
  readonly goals?: GoalData[];
  readonly event?: CalendarEventData;
  readonly events?: CalendarEventData[];
  readonly message_data?: MessageData;
  readonly messages?: MessageData[];
  readonly conversation?: ConversationData;
  readonly conversations?: ConversationData[];
  readonly user?: UserData;
  readonly total?: number;
  readonly response?: string;
  readonly query?: string;
  readonly timestamp?: string;
  readonly error?: boolean;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  readonly executionTime?: number;
}

// Cache for prompt templates
interface PromptCacheEntry {
  prompt: string;
  timestamp: number;
}

// Optimized prompt builder with caching and better template management
const usePromptBuilder = () => {
  const promptCache = useRef<Map<string, PromptCacheEntry>>(new Map());

  // Clean up old cache entries
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    promptCache.current.forEach((entry, key) => {
      if (now - entry.timestamp > CONFIG.CACHE.PROMPT_CACHE_TTL) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => promptCache.current.delete(key));
  }, []);

  // Optimized simple query detection
  const isSimpleQuery = useCallback((input: string): boolean => {
    const normalizedInput = input.trim().toLowerCase();
    const simplePatterns = [
      /^(hi|hello|hey|how are you|what'?s up|good (morning|afternoon|evening)|thank you|thanks)\.?$/,
      /^(yes|no|ok|okay|sure|great|awesome|nice)\.?$/,
      /^(bye|goodbye|see you|talk to you later)\.?$/
    ];
    
    return simplePatterns.some(pattern => pattern.test(normalizedInput));
  }, []);

  // Template constants for better maintainability
  const TEMPLATES = useMemo(() => ({
    SIMPLE_SYSTEM: `<|im_start|>system
You are a helpful AI assistant. Respond to the user's message using the respondToUser tool.

Available tools:
- respondToUser: Generate a conversational response

Follow this format exactly:

THOUGHT: I should respond to the user using the respondToUser tool.

TOOL_CALL: {"name": "respondToUser", "args": {"query": "INPUT_PLACEHOLDER"}}

FINAL_ANSWER: [The tool will provide the response]

Do not generate any other text or repeat content.
<|im_end|>`,

    COMPLEX_SYSTEM: `<|im_start|>system
You are a fast, efficient AI assistant specialized in productivity management. Be concise and direct. Keep responses short and focused.

Available tools:
- manageProductivity: Create and manage tasks, calendar events, and goals. Use type parameter to specify "task", "event", "goal", or combinations with OR (e.g., "task OR event")
- respondToUser: Provide conversational responses to user queries based on internal reasoning without calling other tools

manageProductivity tool usage examples:

CREATE operations (IDs are auto-generated, do NOT specify id):
- Task: {"name": "manageProductivity", "args": {"type": "task", "action": "create", "title": "Buy groceries", "priority": "high", "description": "Get milk and bread", "due_date": "2024-01-15", "status": "pending"}}


COMMON PATTERNS:
- For progress tracking: Use "update" on goals to modify current_value
- For task management: Create with "pending" status, update to "in_progress", then "completed"
- For scheduling: Create events with precise start_time and end_time in ISO format

FIELD REQUIREMENTS:
Task Priority: high/medium/low (required for task create)
Task Status: pending/in_progress/completed/cancelled (defaults to pending)

RESPONSE FORMAT - Follow this exact structure (use each section only ONCE):

THOUGHT: [Brief reasoning about what needs to be done]

TOOL_CALL: {"name": "tool_name", "args": {...}}

FINAL_ANSWER: [Clear, helpful response to the user]

EXAMPLE:
THOUGHT: I need to create a task for the user's request.

TOOL_CALL: {"name": "manageProductivity", "args": {"type": "task", "action": "create", "title": "Buy groceries", "priority": "high"}}

FINAL_ANSWER: I've created a high priority task to buy groceries.

IMPORTANT RULES:
- Always put each step (THOUGHT, TOOL_CALL, FINAL_ANSWER) on separate lines with blank lines between them
- Use manageProductivity for any task
- Use respondToUser only for general conversation without database operations
- For multi-step operations, use multiple TOOL_CALL entries if needed
- Keep responses concise and stop after FINAL_ANSWER
- Do not repeat or elaborate unnecessarily
- NEVER repeat THOUGHT: multiple times - use only ONE THOUGHT per response
- Stop generation immediately after FINAL_ANSWER
<|im_end|>`
  }), []);

  return useCallback((input: string): string => {
    // Cleanup cache periodically
    if (promptCache.current.size > CONFIG.CACHE.MAX_PROMPT_CACHE_SIZE) {
      cleanupCache();
    }

    // Create cache key
    const cacheKey = `${input.substring(0, 100)}-${isSimpleQuery(input)}`;
    
    // Check cache first
    const cached = promptCache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE.PROMPT_CACHE_TTL) {
      return cached.prompt;
    }

    let prompt: string;
    
    if (isSimpleQuery(input)) {
      prompt = `${TEMPLATES.SIMPLE_SYSTEM.replace('INPUT_PLACEHOLDER', input.replace(/"/g, '\\"'))}
<|im_start|>user
${input}<|im_end|>
<|im_start|>assistant
`;
    } else {
      prompt = `${TEMPLATES.COMPLEX_SYSTEM}
<|im_start|>user
${input}<|im_end|>
<|im_start|>assistant
`;
    }

    // Cache the result
    promptCache.current.set(cacheKey, {
      prompt,
      timestamp: Date.now()
    });

    return prompt;
  }, [TEMPLATES, isSimpleQuery, cleanupCache]);
};

// Optimized step ID generator
let stepIdCounter = 0;
const generateStepId = (): string => `step_${Date.now()}_${++stepIdCounter}`;

export const useAgent = () => {
  const { 
    loadedModel, 
    createCompletion, 
    isGenerating, 
    stopCompletion,
    isLoadingModel,
    isDownloading 
  } = useWllama();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const buildPrompt = usePromptBuilder();
  
  // Memoize tool executor with error boundary
  const toolExecutor = useMemo(() => {
    try {
      return new ToolExecutor();
    } catch (error) {
      console.error('[AgentService] Failed to initialize ToolExecutor:', error);
      throw new Error('Tool system initialization failed');
    }
  }, []);

  // Initialize memory manager
  const memoryManager = useMemo(() => MemoryManager.getInstance(), []);

  // Removed debounced response formatting for better real-time updates
  
  // Optimized system state computation
  const systemState = useMemo(() => ({
    hasLoadedModel: !!loadedModel,
    isProcessing,
    isGenerating,
    isLoadingModel,
    isDownloading,
    toolsAvailable: tools.length,
    systemBusy: isDownloading || isLoadingModel || isGenerating
  }), [loadedModel, isProcessing, isGenerating, isLoadingModel, isDownloading]);

  // Enhanced response formatting - handle both structured and unstructured responses
  const formatResponseForDisplay = useCallback((content: string): string => {
    if (!content || content.length > CONFIG.PARSING.MAX_CONTENT_LENGTH) return '';
    
    // Check for repetitive content (like "HelloHelloHello")
    const words = content.split(/\s+/);
    if (words.length > 3) {
      const firstWord = words[0]?.toLowerCase();
      const isRepetitive = words.slice(0, 5).every(word => 
        word.toLowerCase().includes(firstWord) || firstWord.includes(word.toLowerCase())
      );
      if (isRepetitive) {
        // Return empty to prevent showing repetitive content
        return '';
      }
    }
    
    // Extract only the final answer for user display
    const finalAnswerMatch = content.match(/FINAL_ANSWER:\s*(.*?)(?=\n(?:THOUGHT:|TOOL_CALL:|FINAL_ANSWER:|$)|$)/s);
    if (finalAnswerMatch && finalAnswerMatch[1]) {
      return finalAnswerMatch[1].trim();
    }
    
    // If we have structured content but no final answer yet, show loading
    if (content.includes('THOUGHT:') || content.includes('TOOL_CALL:')) {
      return ''; // Don't show anything until we have a final answer
    }
    
    // For unstructured content, clean it up and return if it looks valid
    const cleanContent = content.replace(/(THOUGHT:|TOOL_CALL:|FINAL_ANSWER:)/g, '').trim();
    
    // Only show if it's substantial and not repetitive
    if (cleanContent.length > 10 && !cleanContent.toLowerCase().includes('hellohello')) {
      return cleanContent;
    }
    
    return '';
  }, []);

  // Optimized parsing with better error handling and performance - FIXED for streaming
  const parseAgentResponse = useCallback((response: string, lastParsedLength: number = 0): { steps: AgentStep[], newParsedLength: number } => {
    // Early returns for performance
    if (!response || response.length === lastParsedLength) {
      return { steps: [], newParsedLength: lastParsedLength };
    }

    // Parse the ENTIRE response, not just new content, to avoid duplicates
    const fullContent = response;
    if (!fullContent.trim()) {
      return { steps: [], newParsedLength: lastParsedLength };
    }

    // Runaway detection temporarily disabled to allow normal operation
    // TODO: Re-enable with better logic after fixing root cause
    /*
    const thoughtMatches = fullContent.match(/THOUGHT:/g);
    if (thoughtMatches && thoughtMatches.length > 20) {
      const repetitivePattern = /THOUGHT:\s*THOUGHT:|THOUGHT:\s*The\s+THOUGHT:|THTHO|THOUGHT:\s*Th\s*THOUGHT:/i;
      if (repetitivePattern.test(fullContent)) {
        console.warn('[AgentService] Detected runaway THOUGHT generation, stopping parsing');
        return { steps: [], newParsedLength: lastParsedLength };
      }
    }
    */

    // Check for repetitive character patterns (like "THTHOTH...")
    const last200 = fullContent.slice(-200);
    if (last200.length > 100) {
      const uniqueChars = new Set(last200.toLowerCase()).size;
      // More specific check for actual character repetition loops
      if (uniqueChars < 8 && /(.{2,10})\1{3,}/.test(last200)) {
        console.warn('[AgentService] Detected repetitive content pattern, stopping parsing');
        return { steps: [], newParsedLength: lastParsedLength };
      }
    }

    // Prevent memory issues with very long responses
    if (fullContent.length > CONFIG.PARSING.MAX_CONTENT_LENGTH) {
      console.warn('[AgentService] Response too long, truncating parsing. Length:', fullContent.length);
      console.warn('[AgentService] Response preview:', fullContent.substring(0, 500) + '...');
      return { steps: [], newParsedLength: lastParsedLength };
    }

    const steps: AgentStep[] = [];
    const matches = [...fullContent.matchAll(CONFIG.PARSING.STEP_PATTERN)];
    
    if (matches.length === 0) {
      return { steps: [], newParsedLength: response.length };
    }

    // Process matches with better error handling - parse complete steps only
    for (let i = 0; i < matches.length; i++) {
      try {
        const match = matches[i];
        const stepType = match[1];
        const startIndex = match.index!;
        const nextMatch = matches[i + 1];
        const endIndex = nextMatch ? nextMatch.index! : fullContent.length;
        const stepContent = fullContent.slice(startIndex, endIndex).trim();

        const baseStep = {
          timestamp: new Date(),
          id: `${stepType}_${startIndex}`, // Use position-based ID to avoid duplicates
        };

        switch (stepType) {
          case 'THOUGHT:': {
            const content = stepContent.replace('THOUGHT:', '').trim();
            // Only add if content is substantial and different from previous
            if (content && content.length > 10) {
              steps.push({
                ...baseStep,
                type: 'thought' as const,
                content,
                id: `thought_${startIndex}`, // Position-based ID for streaming updates
              });
            }
            break;
          }

          case 'TOOL_CALL:': {
            const toolCallStr = stepContent.replace('TOOL_CALL:', '').trim();
            const parsedToolCall = parseToolCall(toolCallStr);
            
            if (parsedToolCall) {
              // Create stable ID based on tool name and args
              const argsHash = JSON.stringify(parsedToolCall.args).substring(0, 50);
              steps.push({
                ...baseStep,
                type: 'tool_call' as const,
                content: `Using ${parsedToolCall.name}`,
                toolName: parsedToolCall.name,
                toolArgs: parsedToolCall.args,
                id: `tool_${parsedToolCall.name}_${argsHash.replace(/[^a-zA-Z0-9]/g, '_')}`, // Stable ID
              });
            }
            break;
          }

          case 'FINAL_ANSWER:': {
            const content = stepContent.replace('FINAL_ANSWER:', '').trim();
            if (content && content.length > 5) {
              steps.push({
                ...baseStep,
                type: 'final_answer' as const,
                content,
                id: `final_${startIndex}_${content.substring(0, 20).replace(/\s+/g, '_')}`, // Content-based ID
              });
            }
            break;
          }
        }
      } catch (error) {
        console.warn('[AgentService] Error parsing step:', error);
        // Continue processing other steps instead of failing completely
      }
    }

    return { steps, newParsedLength: response.length };
  }, []);

  // Extracted tool call parsing logic
  const parseToolCall = useCallback((toolCallStr: string): { name: string; args: Record<string, unknown> } | null => {
    try {
      // Find JSON boundaries more efficiently
      let jsonStr = toolCallStr;
      const nextStepIndex = jsonStr.search(CONFIG.PARSING.STEP_PATTERN);
      if (nextStepIndex !== -1) {
        jsonStr = jsonStr.slice(0, nextStepIndex).trim();
      }

      // Find last complete JSON object
      const lastBraceIndex = jsonStr.lastIndexOf('}');
      if (lastBraceIndex === -1) return null;
      
      jsonStr = jsonStr.slice(0, lastBraceIndex + 1);
      
      const toolCall = JSON.parse(jsonStr);
      
      // Validate tool call structure
      if (!toolCall.name || typeof toolCall.name !== 'string') {
        return null;
      }
      
      return {
        name: toolCall.name,
        args: toolCall.args || {}
      };
    } catch {
      return null;
    }
  }, []);



  // Enhanced tool result formatting with better type safety
  const formatToolResult = useCallback((toolName: string, result: ToolResult): string => {
    if (!result.success) {
      return result.message || 'Operation failed';
    }

    const formatters: Record<string, (result: ToolResult) => string> = {
      manageProductivity: (result) => {
        // Handle multiple results from unified tool
        if (result.results && Array.isArray(result.results)) {
          const formattedResults = (result.results as Array<Record<string, unknown>>).map(res => {
            if (res.task) {
              const task = res.task as TaskData;
              return `Created task "${task.title}" with ${task.priority} priority${
                task.due_date ? ` (due: ${task.due_date})` : ''
              }`;
            }
            if (res.event) {
              const event = res.event as CalendarEventData;
              return `Created event "${event.title}" from ${event.start_time} to ${event.end_time}`;
            }
            if (res.goal) {
              const goal = res.goal as GoalData;
              return `Created goal "${goal.title}" with target of ${goal.target_value}`;
            }
            if (res.tasks && Array.isArray(res.tasks)) {
              return `Retrieved ${(res.tasks as unknown[]).length} tasks`;
            }
            if (res.events && Array.isArray(res.events)) {
              return `Retrieved ${(res.events as unknown[]).length} events`;
            }
            if (res.goals && Array.isArray(res.goals)) {
              return `Retrieved ${(res.goals as unknown[]).length} goals`;
            }
            return res.message as string || 'Operation completed';
          });
          return formattedResults.join('. ');
        }
        
        // Handle single result
        if (result.task) {
          const task = result.task as TaskData;
          return `Successfully created task "${task.title}" with ${task.priority} priority${
            task.due_date ? ` (due: ${task.due_date})` : ''
          }`;
        }
        return result.message || 'Operation completed successfully';
      },
      respondToUser: (result) => {
        if (result.response) {
          return result.response as string;
        }
        return result.message || 'Response generated successfully';
      },
      default: (result) => result.message || 'Operation completed successfully'
    };

    const formatter = formatters[toolName] || formatters.default;
    return formatter(result);
  }, []);

  // Enhanced error formatting with better categorization
  const formatToolError = useCallback((toolName: string, error: unknown): string => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const baseMessage = `Failed to execute ${toolName}: `;

    // Categorize errors for better user messages
    const errorCategories = [
      { pattern: /required field/i, message: (msg: string) => `Missing required information. ${msg.split(':')[1] || ''}` },
      { pattern: /must be one of/i, message: (msg: string) => `Invalid value provided. ${msg}` },
      { pattern: /database connection/i, message: () => 'Database connection issue. Please try again.' },
      { pattern: /timeout/i, message: () => 'Operation timed out. Please try again.' },
      { pattern: /network/i, message: () => 'Network error. Please check your connection.' }
    ];

    for (const category of errorCategories) {
      if (category.pattern.test(errorMessage)) {
        return baseMessage + category.message(errorMessage);
      }
    }

    return baseMessage + errorMessage;
  }, []);

  // Enhanced error details extraction
  const getErrorDetails = useCallback((error: unknown): Record<string, unknown> => {
    if (error instanceof Error) {
      const details: Record<string, unknown> = {
        type: error.constructor.name,
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      // Add stack trace only in development
      if (process.env.NODE_ENV === 'development') {
        details.stack = error.stack;
      }
      
      // Extract custom error properties safely
      const customProps = Object.getOwnPropertyNames(error)
        .filter(key => !['name', 'message', 'stack'].includes(key))
        .reduce((acc, key) => {
          try {
            acc[key] = (error as unknown as Record<string, unknown>)[key];
          } catch {
            // Ignore properties that can't be accessed
          }
          return acc;
        }, {} as Record<string, unknown>);
      
      return { ...details, ...customProps };
    }
    
    return { 
      type: 'UnknownError',
      message: String(error),
      timestamp: new Date().toISOString()
    };
  }, []);

  // Optimized step execution with better error handling
  const executeAgentStep = useCallback(async (step: AgentStep): Promise<AgentStep | null> => {
    if (step.type !== 'tool_call' || !step.toolName || !step.toolArgs) {
      return null;
    }

    console.group(`🔧 [AgentService] Executing tool: ${step.toolName}`);
    console.log('📥 Tool Arguments:', JSON.stringify(step.toolArgs, null, 2));

    try {
      // Validate tool exists before execution
      const toolSchema = toolExecutor.getToolSchema(step.toolName);
      if (!toolSchema) {
        const error = new Error(CONFIG.ERROR_MESSAGES.INVALID_TOOL(step.toolName));
        console.error('❌ [AgentService] Tool validation failed:', error.message);
        throw error;
      }

      console.log('✅ [AgentService] Tool validation passed, executing...');
      const startTime = performance.now();
      const result = await toolExecutor.executeTool(step.toolName, step.toolArgs);
      const executionTime = performance.now() - startTime;
      
      console.log(`🎯 [AgentService] Tool execution completed in ${executionTime.toFixed(2)}ms`);
      console.log('📤 Tool Result:', JSON.stringify(result, null, 2));
      
      const toolResult: ToolResult = {
        success: true,
        executionTime,
        ...result as Record<string, unknown>
      };

      const stepResult = {
        type: 'tool_result' as const,
        content: formatToolResult(step.toolName, toolResult),
        toolResult,
        timestamp: new Date(),
        id: generateStepId(),
      };

      console.log('✅ [AgentService] Tool execution successful');
      console.groupEnd();
      return stepResult;
    } catch (error) {
      console.error('❌ [AgentService] Tool execution failed:', error);
      console.groupEnd();
      const toolResult: ToolResult = {
        success: false,
        error: true,
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof Error ? 
          ((error as unknown as Record<string, unknown>)['code'] as string) : 
          undefined,
        details: getErrorDetails(error)
      };

      return {
        type: 'tool_result',
        content: formatToolError(step.toolName, error),
        toolResult,
        timestamp: new Date(),
        id: generateStepId(),
      };
    }
  }, [toolExecutor, formatToolResult, formatToolError, getErrorDetails]);

  // Optimized stop processing
  const stopProcessing = useCallback(() => {
    if (isGenerating) {
      stopCompletion();
    }
    setIsProcessing(false);
  }, [isGenerating, stopCompletion]);

  // Enhanced process query with better performance and error handling
  const processQuery = useCallback(
    async (
      input: string,
      onResponse: (text: string) => void,
      onError: (error: Error) => void,
      onComplete: () => void,
      onStep: (step: AgentStep) => void
    ) => {
      // Input validation
      if (!input?.trim()) {
        onError(new Error('Input cannot be empty'));
        return;
      }

      // System state validation
      if (!loadedModel) {
        onError(new Error(CONFIG.ERROR_MESSAGES.MODEL_NOT_LOADED));
        return;
      }

      if (isLoadingModel) {
        onError(new Error(CONFIG.ERROR_MESSAGES.MODEL_LOADING));
        return;
      }

      if (systemState.systemBusy) {
        onError(new Error(CONFIG.ERROR_MESSAGES.SYSTEM_BUSY));
        return;
      }

      setIsProcessing(true);
      let currentResponse = '';
      const processedSteps = new Set<string>();
      const processedToolCalls = new Set<string>(); // Track actual tool calls to prevent duplicates
      const startTime = performance.now();
      const endTimer = performanceMonitor.startTimer('full_query_processing');
      const responseFormatter = new ResponseFormatter();

      try {
        // Optimized fast response system
        const queryType = classifyQuery(input);
        const fastResponse = getFastResponse(input);
        
        if (fastResponse && queryType === 'fast') {
          // Handle fast responses without model processing
          const endTimer = performanceMonitor.startTimer('fast_response');
          
          // Add messages to memory
          memoryManager.addMessage({
            role: 'user',
            content: input,
            timestamp: new Date()
          });
          
          memoryManager.addMessage({
            role: 'assistant',
            content: fastResponse,
            timestamp: new Date()
          });
          
          // Send the response immediately
          onResponse(fastResponse);
          onComplete();
          endTimer();
          return;
        }

        // Optimized context building - limit memory for speed
        const memoryContext = memoryManager.buildContext(1024); // Limit to 1024 tokens for speed
        const prompt = buildPrompt(input);
        
        // Add memory context to the prompt if available (optimized)
        const contextualPrompt = memoryContext && memoryContext.length < 500 ? 
          prompt.replace('<|im_start|>assistant', `${memoryContext}\n<|im_start|>assistant`) : 
          prompt; // Skip context if too long

        // Add user message to memory
        memoryManager.addMessage({
          role: 'user',
          content: input,
          timestamp: new Date()
        });

        await createCompletion(contextualPrompt, async (piece) => {
          currentResponse += piece;
          
          // Early stopping for runaway generation (disabled for debugging)
          if (currentResponse.length > 50000) {
            console.warn('[AgentService] Response too long, stopping generation');
            stopCompletion();
            return;
          }
          
          // Runaway detection temporarily disabled to allow normal operation
          // TODO: Re-enable with better logic after fixing root cause
          
          // Parse new content - get all steps from current response
          const { steps: allSteps } = parseAgentResponse(currentResponse, 0);
          
          // Process agent steps for memory learning
          if (allSteps.length > 0) {
            memoryManager.processAgentSteps(allSteps);
          }
          
          // Process only new steps that haven't been processed yet
          const stepPromises: Promise<void>[] = [];
          
          for (const step of allSteps) {
            // Use the position-based ID for deduplication
            if (processedSteps.has(step.id)) continue;
            processedSteps.add(step.id);
            
            // Execute tool calls with content-based deduplication to prevent duplicates
            if (step.type === 'tool_call' && step.toolName && step.toolArgs) {
              // Create a unique hash for this tool call based on content
              const toolCallHash = `${step.toolName}-${JSON.stringify(step.toolArgs)}`;
              
              // Skip if we've already processed this exact tool call
              if (processedToolCalls.has(toolCallHash)) {
                console.log(`[AgentService] Skipping duplicate tool call: ${toolCallHash}`);
                continue;
              }
              
              // Validate that the tool call appears to be complete before executing
              const toolCallString = JSON.stringify(step.toolArgs);
              if (!toolCallString.includes('"') || toolCallString.length < 10) {
                console.log(`[AgentService] Tool call appears incomplete, skipping: ${toolCallHash}`);
                continue;
              }
              
              processedToolCalls.add(toolCallHash);
              console.log(`[AgentService] Processing new tool call: ${toolCallHash}`);
              
              const toolPromise = executeAgentStep(step)
                .then(resultStep => {
                  if (resultStep) {
                    // Immediate callback for faster UI updates
                    requestAnimationFrame(() => onStep(resultStep));
                  }
                })
                .catch(error => {
                  console.error('[AgentService] Tool execution error:', error);
                  // Create error step for user feedback
                  const errorStep: AgentStep = {
                    type: 'tool_result',
                    content: `Error executing ${step.toolName}: ${error instanceof Error ? error.message : String(error)}`,
                    timestamp: new Date(),
                    id: generateStepId(),
                    toolResult: {
                      success: false,
                      error: true,
                      message: error instanceof Error ? error.message : String(error)
                    }
                  };
                  requestAnimationFrame(() => onStep(errorStep));
                });
              
              stepPromises.push(toolPromise);
            }
            
            onStep(step);
          }
          
          // Optimized response streaming with debouncing
          if (responseFormatter.shouldFormat()) {
          const formattedResponse = formatResponseForDisplay(currentResponse);
            if (formattedResponse) {
              // Use requestAnimationFrame for smoother UI updates
              requestAnimationFrame(() => onResponse(formattedResponse));
            }
          }
          
          // Execute tool promises in parallel without blocking
          if (stepPromises.length > 0) {
            Promise.allSettled(stepPromises).catch(console.error);
          }
        });

        const executionTime = performance.now() - startTime;
        endTimer(); // Record performance metrics
        console.log(`[AgentService] Query completed in ${executionTime.toFixed(2)}ms`);

        // Add assistant response to memory
        memoryManager.addMessage({
          role: 'assistant',
          content: formatResponseForDisplay(currentResponse),
          timestamp: new Date()
        });

        onComplete();
      } catch (error) {
        console.error('[AgentService] Query processing failed:', error);
        onError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsProcessing(false);
      }
    },
    [loadedModel, createCompletion, buildPrompt, systemState.systemBusy, parseAgentResponse, executeAgentStep, formatResponseForDisplay, isLoadingModel, memoryManager]
  );
  
  return {
    processQuery,
    stopProcessing,
    isProcessing: isProcessing || isGenerating,
    isSystemBusy: systemState.systemBusy,
    modelState: {
      loaded: !!loadedModel,
      loading: isLoadingModel,
      downloading: isDownloading
    },
    // Additional performance metrics for debugging
    systemMetrics: process.env.NODE_ENV === 'development' ? systemState : undefined
  };
};

export default useAgent;

export type { AgentStep, TaskData, GoalData, CalendarEventData, MessageData, ConversationData, UserData, ToolResult };

// Optimized utility function for external use
export const formatAgentResponse = (content: string): string => {
  if (!content || content.length > CONFIG.PARSING.MAX_CONTENT_LENGTH) return content;
  
  return content
    .replace(/(\w)(THOUGHT:|TOOL_CALL:|FINAL_ANSWER:)/g, '$1\n\n$2')
    .replace(/(THOUGHT:|TOOL_CALL:|FINAL_ANSWER:)(\w)/g, '$1\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};