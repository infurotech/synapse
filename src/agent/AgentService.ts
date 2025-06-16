import { useState, useCallback, useMemo, useRef } from 'react';
import { useWllama } from '../utils/wllama.context';
import { ToolExecutor } from './ToolExecutor';
import { tools } from './tools';
import { Task, Goal } from '../services/db/DatabaseSchema';
import { MemoryManager } from './MemoryManager';
import { AdvancedToolSystem } from './AdvancedToolSystem';

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
    MAX_CONTENT_LENGTH: 10000, // Prevent memory issues with very long responses
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

interface ToolResult extends Record<string, unknown> {
  readonly success: boolean;
  readonly message?: string;
  readonly task?: TaskData;
  readonly tasks?: TaskData[];
  readonly total?: number;
  readonly goal?: GoalData;
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
You are a helpful AI assistant. For simple greetings and casual conversation, use the respondToUser tool to provide friendly responses.

Available tools:
- respondToUser: Provide conversational responses based on internal reasoning

Use this format for tool calls:
THOUGHT: [Your reasoning about what needs to be done]
TOOL_CALL: {"name": "respondToUser", "args": {"query": "INPUT_PLACEHOLDER"}}
FINAL_ANSWER: [Your response to the user]
<|im_end|>`,

    COMPLEX_SYSTEM: `<|im_start|>system
You are a helpful AI assistant with access to productivity tools. Your goal is to help users manage their tasks and provide helpful responses.

When a user asks you to perform an action:
1. First, think about what needs to be done
2. Then, use the appropriate tool(s) to accomplish the task
3. Finally, provide a clear response about what was done

Available tools:
- createTask: Create a new task with title, priority (high/medium/low), description, due_date (ISO format or YYYY-MM-DD), and status (pending/in_progress/completed/cancelled)
- respondToUser: Provide conversational responses to user queries based on internal reasoning without calling other tools

Task Priority Levels:
- high: Urgent tasks that need immediate attention
- medium: Standard tasks with normal priority
- low: Tasks that can be done when time permits

Task Status Options:
- pending: Task not started yet (default)
- in_progress: Currently working on the task
- completed: Task is finished
- cancelled: Task is no longer needed

Use this exact format for tool calls (each on a new line):

THOUGHT: [Your reasoning about what needs to be done]

TOOL_CALL: {"name": "tool_name", "args": {...}}

FINAL_ANSWER: [Your response to the user]

Important: Always put each step (THOUGHT, TOOL_CALL, FINAL_ANSWER) on separate lines with blank lines between them for clarity.

Context from previous conversation:
CONTEXT_PLACEHOLDER
<|im_end|>`
  }), []);

  return useCallback((input: string, context?: string): string => {
    // Cleanup cache periodically
    if (promptCache.current.size > CONFIG.CACHE.MAX_PROMPT_CACHE_SIZE) {
      cleanupCache();
    }

    // Create cache key
    const cacheKey = `${input.substring(0, 100)}-${context?.substring(0, 50) || 'no-context'}-${isSimpleQuery(input)}`;
    
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
      const contextStr = context || 'No previous context available.';
      prompt = `${TEMPLATES.COMPLEX_SYSTEM.replace('CONTEXT_PLACEHOLDER', contextStr)}
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

  // Initialize advanced systems
  const memoryManager = useMemo(() => MemoryManager.getInstance(), []);
  const advancedToolSystem = useMemo(() => new AdvancedToolSystem(), []);

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

  // Enhanced response formatting - only show final answer to users
  const formatResponseForDisplay = useCallback((content: string): string => {
    if (!content || content.length > CONFIG.PARSING.MAX_CONTENT_LENGTH) return '';
    
    // Extract only the final answer for user display
    const finalAnswerMatch = content.match(/FINAL_ANSWER:\s*(.*?)(?=\n(?:THOUGHT:|TOOL_CALL:|FINAL_ANSWER:|$)|$)/s);
    if (finalAnswerMatch && finalAnswerMatch[1]) {
      return finalAnswerMatch[1].trim();
    }
    
    // If no final answer yet, show a loading message
    if (content.includes('THOUGHT:') || content.includes('TOOL_CALL:')) {
      return ''; // Don't show anything until we have a final answer
    }
    
    // Fallback: clean up and show content if no markers found
    return content.replace(/(THOUGHT:|TOOL_CALL:|FINAL_ANSWER:)/g, '').trim();
  }, []);

  // Optimized parsing with better error handling and performance
  const parseAgentResponse = useCallback((response: string, lastParsedLength: number = 0): { steps: AgentStep[], newParsedLength: number } => {
    // Early returns for performance
    if (!response || response.length === lastParsedLength) {
      return { steps: [], newParsedLength: lastParsedLength };
    }

    const newContent = response.slice(lastParsedLength);
    if (!newContent.trim()) {
      return { steps: [], newParsedLength: lastParsedLength };
    }

    // Prevent memory issues with very long responses
    if (newContent.length > CONFIG.PARSING.MAX_CONTENT_LENGTH) {
      console.warn('[AgentService] Response too long, truncating parsing');
      return { steps: [], newParsedLength: lastParsedLength };
    }

    const steps: AgentStep[] = [];
    const matches = [...newContent.matchAll(CONFIG.PARSING.STEP_PATTERN)];
    
    if (matches.length === 0) {
      return { steps: [], newParsedLength: lastParsedLength };
    }

    // Process matches with better error handling
    for (let i = 0; i < matches.length; i++) {
      try {
        const match = matches[i];
        const stepType = match[1];
        const startIndex = match.index!;
        const nextMatch = matches[i + 1];
        const endIndex = nextMatch ? nextMatch.index! : newContent.length;
        const stepContent = newContent.slice(startIndex, endIndex).trim();

        const baseStep = {
          timestamp: new Date(),
          id: generateStepId(),
        };

        switch (stepType) {
          case 'THOUGHT:': {
            const content = stepContent.replace('THOUGHT:', '').trim();
            if (content) {
              steps.push({
                ...baseStep,
                type: 'thought' as const,
                content,
              });
            }
            break;
          }

          case 'TOOL_CALL:': {
            const toolCallStr = stepContent.replace('TOOL_CALL:', '').trim();
            const parsedToolCall = parseToolCall(toolCallStr);
            
            if (parsedToolCall) {
              steps.push({
                ...baseStep,
                type: 'tool_call' as const,
                content: `Calling ${parsedToolCall.name} with args: ${JSON.stringify(parsedToolCall.args)}`,
                toolName: parsedToolCall.name,
                toolArgs: parsedToolCall.args,
              });
            } else {
              steps.push({
                ...baseStep,
                type: 'thought' as const,
                content: `Invalid tool call format: ${toolCallStr.substring(0, 100)}`,
              });
            }
            break;
          }

          case 'FINAL_ANSWER:': {
            const content = stepContent.replace('FINAL_ANSWER:', '').trim();
            if (content) {
              steps.push({
                ...baseStep,
                type: 'final_answer' as const,
                content,
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

    // Calculate safe parsed length more efficiently
    const safeParsedLength = calculateSafeParsedLength(newContent, matches, lastParsedLength, response.length);
    
    return { steps, newParsedLength: safeParsedLength };
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

  // Calculate safe parsed length helper
  const calculateSafeParsedLength = useCallback((
    newContent: string, 
    matches: RegExpMatchArray[], 
    lastParsedLength: number, 
    totalLength: number
  ): number => {
    if (matches.length === 0) return lastParsedLength;

    const lastMatch = matches[matches.length - 1];
    const lastStepStart = lastMatch.index!;
    const lastStepContent = newContent.slice(lastStepStart);

    // More precise completion detection
    if (lastMatch[1] === 'TOOL_CALL:' && lastStepContent.includes('}')) {
      return lastParsedLength + lastStepStart + lastStepContent.indexOf('}') + 1;
    } 
    
    if ((lastMatch[1] === 'THOUGHT:' || lastMatch[1] === 'FINAL_ANSWER:')) {
      const contentAfterMarker = lastStepContent.replace(lastMatch[1], '').trim();
      return contentAfterMarker.length > CONFIG.PARSING.MIN_SUBSTANTIAL_CONTENT ? 
        totalLength : lastParsedLength + lastStepStart;
    }

    return lastParsedLength + lastStepStart;
  }, []);

  // Enhanced tool result formatting with better type safety
  const formatToolResult = useCallback((toolName: string, result: ToolResult): string => {
    if (!result.success) {
      return result.message || 'Operation failed';
    }

    const formatters: Record<string, (result: ToolResult) => string> = {
      createTask: (result) => {
        if (result.task) {
          const task = result.task as TaskData;
          return `Successfully created task "${task.title}" with ${task.priority} priority${
            task.due_date ? ` (due: ${task.due_date})` : ''
          }`;
        }
        return result.message || 'Task created successfully';
      },
      respondToUser: (result) => result.response || result.message || 'Response generated successfully',
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

    try {
      // Validate tool exists before execution
      const toolSchema = toolExecutor.getToolSchema(step.toolName);
      if (!toolSchema) {
        throw new Error(CONFIG.ERROR_MESSAGES.INVALID_TOOL(step.toolName));
      }

      const startTime = performance.now();
      const result = await toolExecutor.executeTool(step.toolName, step.toolArgs);
      const executionTime = performance.now() - startTime;
      
      const toolResult: ToolResult = {
        success: true,
        executionTime,
        ...result as Record<string, unknown>
      };

      return {
        type: 'tool_result',
        content: formatToolResult(step.toolName, toolResult),
        toolResult,
        timestamp: new Date(),
        id: generateStepId(),
      };
    } catch (error) {
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
      onStep: (step: AgentStep) => void,
      context?: string
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
      let lastParsedLength = 0;
      const processedSteps = new Set<string>();
      const startTime = performance.now();

      try {
        // Build context using memory manager
        const memoryContext = memoryManager.buildContext();
        const fullContext = context ? `${context}\n\n${memoryContext}` : memoryContext;
        const prompt = buildPrompt(input, fullContext);

        // Add user message to memory
        memoryManager.addMessage({
          role: 'user',
          content: input,
          timestamp: new Date()
        });

        await createCompletion(prompt, async (piece) => {
          currentResponse += piece;
          
          // Parse new content
          const { steps, newParsedLength } = parseAgentResponse(currentResponse, lastParsedLength);
          lastParsedLength = newParsedLength;
          
          // Process steps with deduplication and error resilience
          const stepPromises: Promise<void>[] = [];
          
          for (const step of steps) {
            const stepKey = `${step.type}-${step.toolName || 'none'}-${step.id}`;
            
            if (processedSteps.has(stepKey)) continue;
            processedSteps.add(stepKey);
            
            // Execute tool calls asynchronously without blocking UI updates
            if (step.type === 'tool_call' && step.toolName && step.toolArgs) {
              const toolPromise = executeAgentStep(step)
                .then(resultStep => {
                  if (resultStep) {
                    onStep(resultStep);
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
                  onStep(errorStep);
                });
              
              stepPromises.push(toolPromise);
            }
            
            onStep(step);
          }
          
          // Send immediate response update for better UI responsiveness
          const formattedResponse = formatResponseForDisplay(currentResponse);
          onResponse(formattedResponse);
          
          // Wait for any pending tool executions in background
          if (stepPromises.length > 0) {
            Promise.all(stepPromises).catch(console.error);
          }
        });

        const executionTime = performance.now() - startTime;
        console.log(`[AgentService] Query completed in ${executionTime.toFixed(2)}ms`);

        // Add assistant response to memory
        memoryManager.addMessage({
          role: 'assistant',
          content: formatResponseForDisplay(currentResponse),
          timestamp: new Date()
        });

        // Log tool metrics for optimization
        if (process.env.NODE_ENV === 'development') {
          console.log('[AgentService] Tool optimization suggestions:', 
            advancedToolSystem.getToolOptimizationSuggestions());
        }

        onComplete();
      } catch (error) {
        console.error('[AgentService] Query processing failed:', error);
        onError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsProcessing(false);
      }
    },
    [loadedModel, createCompletion, buildPrompt, systemState.systemBusy, parseAgentResponse, executeAgentStep, formatResponseForDisplay, isLoadingModel, memoryManager, advancedToolSystem]
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

export type { AgentStep, TaskData, GoalData, ToolResult };

// Optimized utility function for external use
export const formatAgentResponse = (content: string): string => {
  if (!content || content.length > CONFIG.PARSING.MAX_CONTENT_LENGTH) return content;
  
  return content
    .replace(/(\w)(THOUGHT:|TOOL_CALL:|FINAL_ANSWER:)/g, '$1\n\n$2')
    .replace(/(THOUGHT:|TOOL_CALL:|FINAL_ANSWER:)(\w)/g, '$1\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};