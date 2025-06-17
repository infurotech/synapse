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
import { TaskOperations, GoalOperations, CalendarEventOperations, ValidationUtils, DatabaseDebugLogger } from './database-utils';
import { TaskPriority, TaskStatus } from '../services/db/DatabaseSchema';

/**
 * A unified tool for managing tasks, calendar events, and goals
 */
export const tools: Tool[] = [
  {
    name: 'manageProductivity',
    description: 'Create and manage tasks, calendar events, and goals. Can handle multiple operations by specifying type parameter with OR separator (e.g., "task OR event OR goal")',
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of operation to perform. Can be "task", "event", "goal", or combinations with OR operator (e.g., "task OR event")',
          enum: ['task', 'event', 'goal', 'task OR event', 'task OR goal', 'event OR goal', 'task OR event OR goal']
        },
        action: {
          type: 'string',
          description: 'Action to perform: create, get, update, delete, list',
          enum: ['create', 'get', 'update', 'delete', 'list']
        },
        // Record identification (required for get, update, delete operations)
        id: {
          type: 'number',
          description: 'ID of the record to get, update, or delete. NOT used for create or list operations (IDs are auto-generated on create)'
        },
        // Common properties for all entity types
        title: {
          type: 'string',
          description: 'Title for task, event, or goal (required for create, optional for update)'
        },
        description: {
          type: 'string',
          description: 'Description for task, event, or goal (optional for create and update)'
        },
        // Task-specific properties
        priority: { 
          type: 'string', 
          enum: ['high', 'medium', 'low'], 
          description: 'Task priority - ONLY for tasks (required for task create, optional for task update)'
        },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          description: 'Task status - ONLY for tasks (optional for create and update, defaults to pending)'
        },
        due_date: {
          type: 'string',
          description: 'Due date in ISO format (YYYY-MM-DD) - for tasks and goals (optional for create and update)'
        },
        // Calendar event-specific properties
        start_time: {
          type: 'string',
          description: 'Start time in ISO format (YYYY-MM-DDTHH:mm:ss) - ONLY for calendar events (required for event create, optional for event update)'
        },
        end_time: {
          type: 'string',
          description: 'End time in ISO format (YYYY-MM-DDTHH:mm:ss) - ONLY for calendar events (required for event create, optional for event update)'
        },
        location: {
          type: 'string',
          description: 'Location for calendar event - ONLY for calendar events (optional for create and update)'
        },
        // Goal-specific properties
        target_value: {
          type: 'number',
          description: 'Target value for goal - ONLY for goals (required for goal create, optional for goal update)'
        },
        current_value: {
          type: 'number',
          description: 'Current progress value for goal - ONLY for goals (optional for create and update, defaults to 0)'
        },
        category: {
          type: 'string',
          description: 'Category for goal - ONLY for goals (optional for create and update)'
        },
        // Filtering for list operations
        filters: {
          type: 'object',
          description: 'Filters for list operations ONLY - not used for other actions',
          properties: {
            status: { type: 'string', description: 'Filter tasks by status' },
            priority: { type: 'string', description: 'Filter tasks by priority' },
            category: { type: 'string', description: 'Filter goals by category' },
            start_date: { type: 'string', description: 'Filter events by start date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'Filter events by end date (YYYY-MM-DD)' },
            limit: { type: 'number', description: 'Maximum number of records to return' },
            offset: { type: 'number', description: 'Number of records to skip (for pagination)' }
          }
        }
      },
      required: ['type', 'action'],
      additionalProperties: false
    },
    execute: async (args) => {
      // Log tool invocation
      DatabaseDebugLogger.logToolInvocation('manageProductivity', args);
      
      const { type, action, ...otherArgs } = args;
      
      if (!type || !action) {
        const error = new Error('Type and action are required');
        console.error('🚨 [manageProductivity] Validation failed:', error.message);
        throw error;
      }

      const types = (type as string).toLowerCase().split(' or ').map(t => t.trim());
      const actionStr = (action as string).toLowerCase();
      
      const results: Record<string, unknown>[] = [];
      
      console.group(`🔧 [manageProductivity] Processing ${types.length} type(s): ${types.join(', ')}`);
      console.log(`📋 Action: ${actionStr}`);
      console.log(`🎯 Arguments:`, otherArgs);

      // Process each type specified
      for (const currentType of types) {
        console.group(`🔄 Processing type: ${currentType}`);
        
        try {
          let result: Record<string, unknown> = {};

          if (currentType === 'task') {
            result = await handleTaskOperation(actionStr, otherArgs);
          } else if (currentType === 'event') {
            result = await handleEventOperation(actionStr, otherArgs);
          } else if (currentType === 'goal') {
            result = await handleGoalOperation(actionStr, otherArgs);
          } else {
            throw new Error(`Invalid type: ${currentType}. Must be 'task', 'event', or 'goal'`);
          }

          console.log(`✅ ${currentType} operation completed successfully`);
          results.push({
            type: currentType,
            action: actionStr,
            ...result
          });

        } catch (error) {
          console.error(`❌ ${currentType} operation failed:`, error);
          results.push({
            type: currentType,
            action: actionStr,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        } finally {
          console.groupEnd();
        }
      }

      const finalResult = {
        success: results.every(r => r.success !== false),
        results,
        timestamp: new Date().toISOString(),
        message: `Processed ${results.length} operation(s)`
      };

      console.log(`🏁 [manageProductivity] Final result:`, finalResult);
      console.groupEnd();

      return finalResult;
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
      const { query, context } = args;
      
      if (!query) {
        throw new Error('Query is required');
      }

      // Generate contextual responses based on query content using internal reasoning
      let response = '';
      const queryLower = (query as string).toLowerCase();

      if (queryLower.includes('hello') || queryLower.includes('hi')) {
        response = 'Hello! I\'m here to help you manage your tasks, calendar events, and goals. What would you like to work on today?';
      } else if (queryLower.includes('help')) {
        response = 'I can help you with creating and managing tasks, scheduling calendar events, setting goals, and answering general questions. Just let me know what you need!';
      } else if (queryLower.includes('thank')) {
        response = 'You\'re welcome! I\'m always here to help you stay organized and productive. Is there anything else you\'d like to work on?';
      } else if (queryLower.includes('how are you')) {
        response = 'I\'m doing great and ready to help you be more productive! How can I assist you today?';
      } else if (queryLower.includes('time') || queryLower.includes('date')) {
        const now = new Date();
        response = `It's currently ${now.toLocaleString()}. Would you like me to help you create a task, schedule an event, or set a goal?`;
      } else if (queryLower.includes('task')) {
        response = 'I can help you create, update, or manage tasks! Tasks can have priorities (high, medium, low), statuses (pending, in_progress, completed, cancelled), and due dates.';
      } else if (queryLower.includes('event') || queryLower.includes('calendar') || queryLower.includes('schedule')) {
        response = 'I can help you create and manage calendar events! Events need start and end times, and can optionally include descriptions and locations.';
      } else if (queryLower.includes('goal')) {
        response = 'I can help you set and track goals! Goals have target values, current progress, categories, and optional due dates to help you stay motivated.';
      } else {
        response = 'I understand you\'re looking for assistance. I can help you manage tasks, calendar events, and goals, as well as provide information based on my knowledge. Could you tell me more about what you\'d like to accomplish?';
      }

      if (context) {
        response += ` ${context}`;
      }

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

/**
 * Handle task operations
 */
async function handleTaskOperation(action: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  console.log(`📝 [handleTaskOperation] Processing ${action} with args:`, args);
  
  switch (action) {
    case 'create': {
      console.log('🔨 [Task-Create] Starting task creation...');
      const { title, description, priority, status, due_date } = args;
      
      if (!title || !priority) {
        const error = new Error('Title and priority are required for creating tasks');
        console.error('❌ [Task-Create] Validation failed:', error.message);
        throw error;
      }

      if (!ValidationUtils.isValidTaskPriority(priority as string)) {
        const error = new Error('Priority must be high, medium, or low');
        console.error('❌ [Task-Create] Invalid priority:', priority);
        throw error;
      }

      if (status && !ValidationUtils.isValidTaskStatus(status as string)) {
        const error = new Error('Status must be pending, in_progress, completed, or cancelled');
        console.error('❌ [Task-Create] Invalid status:', status);
        throw error;
      }

      const taskData = {
        title: (title as string).trim().substring(0, 200),
        description: description ? (description as string).trim().substring(0, 1000) : undefined,
        due_date: due_date ? ValidationUtils.formatDateToISO(due_date as string) : undefined,
        priority: priority as TaskPriority,
        status: status as TaskStatus
      };

      console.log('✅ [Task-Create] Validation passed, creating task with data:', taskData);
      const newTask = await TaskOperations.create(taskData);
      console.log('🎉 [Task-Create] Task created successfully:', newTask);
      
      return {
        success: true,
        task: newTask,
        message: `Task "${taskData.title}" created successfully with ${priority} priority`
      };
    }

    case 'list': {
      console.log('📋 [Task-List] Starting task list retrieval...');
      const { filters } = args;
      console.log('🔍 [Task-List] Filters:', filters);
      
      const tasks = await TaskOperations.getAll(filters as Parameters<typeof TaskOperations.getAll>[0]);
      console.log(`✅ [Task-List] Retrieved ${tasks.length} tasks`);
      
      return {
        success: true,
        tasks,
        count: tasks.length,
        message: `Retrieved ${tasks.length} tasks`
      };
    }

    case 'get': {
      console.log('🔍 [Task-Get] Starting task retrieval...');
      const { id: taskId } = args;
      
      if (!taskId) {
        const error = new Error('ID is required for getting tasks');
        console.error('❌ [Task-Get] Missing ID:', error.message);
        throw error;
      }
      
      console.log('🎯 [Task-Get] Retrieving task with ID:', taskId);
      const task = await TaskOperations.getById(taskId as number);
      console.log('✅ [Task-Get] Task retrieved:', task);
      
      return {
        success: true,
        task,
        message: `Retrieved task "${task.title}"`
      };
    }

    case 'update': {
      console.log('✏️ [Task-Update] Starting task update...');
      const { id: updateTaskId, ...updateData } = args;
      
      if (!updateTaskId) {
        const error = new Error('ID is required for updating tasks');
        console.error('❌ [Task-Update] Missing ID:', error.message);
        throw error;
      }
      
      console.log('🎯 [Task-Update] Updating task ID:', updateTaskId, 'with data:', updateData);
      const updatedTask = await TaskOperations.update(updateTaskId as number, updateData as Parameters<typeof TaskOperations.update>[1]);
      console.log('✅ [Task-Update] Task updated:', updatedTask);
      
      return {
        success: true,
        task: updatedTask,
        message: `Updated task "${updatedTask.title}"`
      };
    }

    case 'delete': {
      console.log('🗑️ [Task-Delete] Starting task deletion...');
      const { id: deleteTaskId } = args;
      
      if (!deleteTaskId) {
        const error = new Error('ID is required for deleting tasks');
        console.error('❌ [Task-Delete] Missing ID:', error.message);
        throw error;
      }
      
      console.log('🎯 [Task-Delete] Deleting task with ID:', deleteTaskId);
      const deleted = await TaskOperations.delete(deleteTaskId as number);
      console.log(`${deleted ? '✅' : '❌'} [Task-Delete] Deletion result:`, deleted);
      
      return {
        success: deleted,
        message: deleted ? 'Task deleted successfully' : 'Task not found'
      };
    }

    default:
      throw new Error(`Invalid action for tasks: ${action}`);
  }
}

/**
 * Handle calendar event operations
 */
async function handleEventOperation(action: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  console.log(`📅 [handleEventOperation] Processing ${action} with args:`, args);
  
  switch (action) {
    case 'create': {
      console.log('🔨 [Event-Create] Starting event creation...');
      const { title, description, start_time, end_time, location } = args;
      
      if (!title || !start_time || !end_time) {
        const error = new Error('Title, start_time, and end_time are required for creating events');
        console.error('❌ [Event-Create] Validation failed:', error.message);
        throw error;
      }

      const eventData = {
        title: (title as string).trim().substring(0, 200),
        description: description ? (description as string).trim().substring(0, 1000) : undefined,
        start_time: start_time as string,
        end_time: end_time as string,
        location: location ? (location as string).trim().substring(0, 200) : undefined
      };

      console.log('✅ [Event-Create] Validation passed, creating event with data:', eventData);
      const newEvent = await CalendarEventOperations.create(eventData);
      console.log('🎉 [Event-Create] Event created successfully:', newEvent);
      
      return {
        success: true,
        event: newEvent,
        message: `Calendar event "${eventData.title}" created successfully`
      };
    }

    case 'list': {
      const { filters } = args;
      const events = await CalendarEventOperations.getAll(filters as Parameters<typeof CalendarEventOperations.getAll>[0]);
      return {
        success: true,
        events,
        count: events.length,
        message: `Retrieved ${events.length} calendar events`
      };
    }

    case 'get': {
      const { id: eventId } = args;
      if (!eventId) {
        throw new Error('ID is required for getting events');
      }
      const event = await CalendarEventOperations.getById(eventId as number);
      return {
        success: true,
        event,
        message: `Retrieved event "${event.title}"`
      };
    }

    case 'update': {
      const { id: updateEventId, ...updateData } = args;
      if (!updateEventId) {
        throw new Error('ID is required for updating events');
      }
      const updatedEvent = await CalendarEventOperations.update(updateEventId as number, updateData as Parameters<typeof CalendarEventOperations.update>[1]);
      return {
        success: true,
        event: updatedEvent,
        message: `Updated event "${updatedEvent.title}"`
      };
    }

    case 'delete': {
      const { id: deleteEventId } = args;
      if (!deleteEventId) {
        throw new Error('ID is required for deleting events');
      }
      const deleted = await CalendarEventOperations.delete(deleteEventId as number);
      return {
        success: deleted,
        message: deleted ? 'Event deleted successfully' : 'Event not found'
      };
    }

    default:
      throw new Error(`Invalid action for events: ${action}`);
  }
}

/**
 * Handle goal operations
 */
async function handleGoalOperation(action: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  console.log(`🎯 [handleGoalOperation] Processing ${action} with args:`, args);
  
  switch (action) {
    case 'create': {
      console.log('🔨 [Goal-Create] Starting goal creation...');
      const { title, description, target_value, current_value, due_date, category } = args;
      
      if (!title || target_value === undefined) {
        const error = new Error('Title and target_value are required for creating goals');
        console.error('❌ [Goal-Create] Validation failed:', error.message);
        throw error;
      }

      const goalData = {
        title: (title as string).trim().substring(0, 200),
        description: description ? (description as string).trim().substring(0, 1000) : undefined,
        target_value: target_value as number,
        current_value: (current_value as number) || 0,
        due_date: due_date ? ValidationUtils.formatDateToISO(due_date as string) : undefined,
        category: category ? (category as string).trim().substring(0, 100) : undefined
      };

      const newGoal = await GoalOperations.create(goalData);
      return {
        success: true,
        goal: newGoal,
        message: `Goal "${goalData.title}" created successfully with target of ${target_value}`
      };
    }

    case 'list': {
      const { filters } = args;
      const goals = await GoalOperations.getAll(filters as Parameters<typeof GoalOperations.getAll>[0]);
      return {
        success: true,
        goals,
        count: goals.length,
        message: `Retrieved ${goals.length} goals`
      };
    }

    case 'get': {
      const { id: goalId } = args;
      if (!goalId) {
        throw new Error('ID is required for getting goals');
      }
      const goal = await GoalOperations.getById(goalId as number);
      return {
        success: true,
        goal,
        message: `Retrieved goal "${goal.title}"`
      };
    }

    case 'update': {
      const { id: updateGoalId, ...updateData } = args;
      if (!updateGoalId) {
        throw new Error('ID is required for updating goals');
      }
      const updatedGoal = await GoalOperations.update(updateGoalId as number, updateData as Parameters<typeof GoalOperations.update>[1]);
      return {
        success: true,
        goal: updatedGoal,
        message: `Updated goal "${updatedGoal.title}"`
      };
    }

    case 'delete': {
      const { id: deleteGoalId } = args;
      if (!deleteGoalId) {
        throw new Error('ID is required for deleting goals');
      }
      const deleted = await GoalOperations.delete(deleteGoalId as number);
      return {
        success: deleted,
        message: deleted ? 'Goal deleted successfully' : 'Goal not found'
      };
    }

    default:
      throw new Error(`Invalid action for goals: ${action}. Goals support create, list, get, update, and delete operations.`);
  }
}

export default tools;
