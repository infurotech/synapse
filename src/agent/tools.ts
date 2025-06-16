/**
 * Defines the structure for a tool that the agent can use.
 */
export interface Tool {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

// Import database utilities
import { TaskOperations, ValidationUtils } from './database-utils';
import { TaskPriority, TaskStatus } from '../services/db/DatabaseSchema';

/**
 * A list of all available tools for the agent.
 */
export const tools: Tool[] = [
  {
    name: 'createTask',
    description: 'Create a new task with title, description, priority, due date, and status',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        priority: { 
          type: 'string', 
          enum: ['high', 'medium', 'low'], 
          description: 'Task priority (high, medium, low)' 
        },
        due_date: { 
          type: 'string', 
          description: 'Due date in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ) or date format (YYYY-MM-DD)' 
        },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          description: 'Task status (pending, in_progress, completed, cancelled)'
        }
      },
      required: ['title', 'priority']
    },
    execute: async (args) => {
      console.log('🔧 [Tools] createTask called with args:', JSON.stringify(args, null, 2));
      
      const { title, description, priority, due_date, status } = args;
      
      // Validate required fields
      if (!title || !priority) {
        console.error('❌ [Tools] createTask validation failed - missing required fields');
        console.error('❌ [Tools] Received title:', title, 'priority:', priority);
        throw new Error('Title and priority are required');
      }

      console.log('✅ [Tools] Required fields validation passed');

      // Validate priority enum
      if (!ValidationUtils.isValidTaskPriority(priority as string)) {
        console.error('❌ [Tools] createTask validation failed - invalid priority:', priority);
        console.error('❌ [Tools] Valid priorities are: high, medium, low');
        throw new Error('Priority must be high, medium, or low');
      }

      console.log('✅ [Tools] Priority validation passed:', priority);

      // Validate status enum if provided
      if (status && !ValidationUtils.isValidTaskStatus(status as string)) {
        console.error('❌ [Tools] createTask validation failed - invalid status:', status);
        console.error('❌ [Tools] Valid statuses are: pending, in_progress, completed, cancelled');
        throw new Error('Status must be pending, in_progress, completed, or cancelled');
      }

      console.log('✅ [Tools] Status validation passed:', status || 'pending (default)');

      const taskData = {
        title: title as string,
        description: description as string,
        due_date: due_date as string,
        priority: priority as TaskPriority,
        status: status as TaskStatus
      };

      console.log('📦 [Tools] Prepared task data for database:', JSON.stringify(taskData, null, 2));

      try {
        console.log('🚀 [Tools] Calling TaskOperations.create...');
        
        // Enhance data validation and preprocessing
        const validateAndFormatDate = (dateStr: string): string => {
          try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date format');
            }
            return date.toISOString().split('T')[0];
          } catch {
            return new Date().toISOString().split('T')[0];
          }
        };

        const processedTaskData = {
          ...taskData,
          title: (taskData.title as string).trim().substring(0, 200),
          description: taskData.description ? 
            (taskData.description as string).trim().substring(0, 1000) : undefined,
          due_date: taskData.due_date ? validateAndFormatDate(taskData.due_date as string) : undefined
        };
        
        // Create task using database operations with enhanced error handling
        const newTask = await TaskOperations.create(processedTaskData);

        console.log('🎉 [Tools] Task creation successful!');
        console.log('📋 [Tools] Created task details:', JSON.stringify(newTask, null, 2));

        const result = {
          success: true,
          task: newTask,
          message: `Task "${processedTaskData.title}" created successfully with ${priority} priority`,
          timestamp: new Date().toISOString(),
          metadata: {
            originalInput: title,
            processedTitle: processedTaskData.title,
            validation: {
              titleTruncated: (title as string).length > 200,
              descriptionTruncated: taskData.description && (taskData.description as string).length > 1000
            }
          }
        };

        console.log('📤 [Tools] Returning enhanced result:', JSON.stringify(result, null, 2));

        return result;
      } catch (error) {
        console.error('💥 [Tools] Task creation failed!');
        console.error('💥 [Tools] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          taskData,
          retryable: error instanceof Error && ['database', 'connection', 'timeout', 'busy'].some(msg => 
            error.message.toLowerCase().includes(msg))
        });
        
        const errorMessage = `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('💥 [Tools] Throwing error:', errorMessage);
        throw new Error(errorMessage);
      }
    }
  },

  {
    name: 'respondToUser',
    description: 'Provide a conversational response to user queries based on internal reasoning without calling other tools',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The user\'s query or message' },
        context: { type: 'string', description: 'Additional context for the response' }
      },
      required: ['query']
    },
    execute: async (args) => {
      console.log('[Tools] respondToUser called with args:', args);
      
      const { query, context } = args;
      
      if (!query) {
        console.log('[Tools] respondToUser validation failed - missing query');
        throw new Error('Query is required');
      }

      // Generate contextual responses based on query content using internal reasoning
      let response = '';
      const queryLower = (query as string).toLowerCase();

      console.log('[Tools] respondToUser analyzing query:', queryLower);

      if (queryLower.includes('hello') || queryLower.includes('hi')) {
        response = 'Hello! I\'m here to help you manage your tasks and answer your questions. What would you like to work on today?';
      } else if (queryLower.includes('help')) {
        response = 'I can help you with creating and managing tasks, as well as answering general questions. Just let me know what you need!';
      } else if (queryLower.includes('thank')) {
        response = 'You\'re welcome! I\'m always here to help you stay organized and productive. Is there anything else you\'d like to work on?';
      } else if (queryLower.includes('how are you')) {
        response = 'I\'m doing great and ready to help you be more productive! How can I assist you today?';
      } else if (queryLower.includes('time') || queryLower.includes('date')) {
        const now = new Date();
        response = `It's currently ${now.toLocaleString()}. Would you like me to help you create a task or answer any questions?`;
      } else if (queryLower.includes('task') && (queryLower.includes('create') || queryLower.includes('add') || queryLower.includes('new'))) {
        response = 'I can help you create a new task! Please provide the task title and priority (high, medium, or low). You can also optionally include a description, due date, and status.';
      } else if (queryLower.includes('priority') || queryLower.includes('urgent') || queryLower.includes('important')) {
        response = 'When creating tasks, you can set the priority as high, medium, or low. High priority tasks should be completed first, medium priority tasks are standard work items, and low priority tasks can be done when time permits.';
      } else if (queryLower.includes('status')) {
        response = 'Tasks can have different statuses: pending (not started), in_progress (currently working on), completed (finished), or cancelled (no longer needed). By default, new tasks are set to pending status.';
      } else {
        // Generic helpful response based on internal reasoning
        response = 'I understand you\'re looking for assistance. I can help you create and manage tasks with proper priorities and due dates, as well as provide information based on my knowledge. Could you tell me more about what you\'d like to accomplish?';
      }

      if (context) {
        response += ` ${context}`;
        console.log('[Tools] respondToUser added context to response');
      }

      console.log('[Tools] respondToUser generated response:', response);

      return {
        success: true,
        response,
        query: query as string,
        timestamp: new Date().toISOString(),
        message: 'Response generated successfully'
      };
    }
  }
];

console.log('[Tools] Tools array initialized with', tools.length, 'tools');
tools.forEach((tool, index) => {
  console.log(`[Tools] Tool ${index + 1}: ${tool.name} - ${tool.description}`);
});

export default tools;
