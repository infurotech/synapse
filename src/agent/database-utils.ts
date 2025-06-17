/**
 * Database utility functions for agent tools
 */

import { 
  DatabaseAgent, 
  TaskService, 
  GoalService, 
  CalendarEventService, 
  MessageService 
} from '../services/db';
import { Task, TaskPriority, TaskStatus, Goal, CalendarEvent, Message } from '../services/db/DatabaseSchema';

/**
 * Debug logger for database operations
 */
class DatabaseDebugLogger {
  private static logOperation(operation: string, entity: string, data?: unknown, result?: unknown, error?: Error): void {
    const timestamp = new Date().toISOString();
    console.group(`🔍 [DB-DEBUG] ${timestamp} - ${entity.toUpperCase()} ${operation.toUpperCase()}`);
    
    if (data) {
      console.log('📥 Input Data:', JSON.stringify(data, null, 2));
    }
    
    if (error) {
      console.error('❌ OPERATION FAILED');
      console.error('💥 Error:', error.message);
      console.error('📋 Stack:', error.stack);
    } else if (result) {
      console.log('✅ OPERATION SUCCESSFUL');
      console.log('📤 Result:', JSON.stringify(result, null, 2));
    }
    
    console.groupEnd();
  }

  static logTaskOperation(operation: string, data?: unknown, result?: unknown, error?: Error): void {
    this.logOperation(operation, 'task', data, result, error);
  }

  static logGoalOperation(operation: string, data?: unknown, result?: unknown, error?: Error): void {
    this.logOperation(operation, 'goal', data, result, error);
  }

  static logEventOperation(operation: string, data?: unknown, result?: unknown, error?: Error): void {
    this.logOperation(operation, 'event', data, result, error);
  }

  static logMessageOperation(operation: string, data?: unknown, result?: unknown, error?: Error): void {
    this.logOperation(operation, 'message', data, result, error);
  }

  static logToolInvocation(toolName: string, args: unknown): void {
    const timestamp = new Date().toISOString();
    console.group(`🛠️ [TOOL-DEBUG] ${timestamp} - ${toolName.toUpperCase()} INVOKED`);
    console.log('🎯 Tool Arguments:', JSON.stringify(args, null, 2));
    console.groupEnd();
  }
}

/**
 * Initialize database connection if not already initialized
 */
export async function ensureDatabaseConnection(): Promise<DatabaseAgent> {
  console.log('🔌 [DatabaseUtils] ensureDatabaseConnection called');
  
  try {
    const dbAgent = DatabaseAgent.getInstance();
    console.log('📦 [DatabaseUtils] Database agent instance obtained');
    
    // Check if database is already initialized by trying to get connection
    const connection = dbAgent.getConnection();
    if (!connection) {
      console.log('🚀 [DatabaseUtils] Database not initialized, initializing...');
      await dbAgent.initializeDatabase();
      console.log('✅ [DatabaseUtils] Database initialization completed');
      
      // Verify connection was established
      const newConnection = dbAgent.getConnection();
      if (!newConnection) {
        console.error('❌ [DatabaseUtils] Database connection still null after initialization');
        throw new Error('Database connection failed after initialization');
      }
    } else {
      console.log('✅ [DatabaseUtils] Database already initialized');
    }
    
    console.log('✅ [DatabaseUtils] Database connection verified');
    return dbAgent;
  } catch (error) {
    console.error('💥 [DatabaseUtils] Error ensuring database connection:', error);
    throw error;
  }
}

/**
 * Task-related database operations
 */
export class TaskOperations {
  /**
   * Create a new task
   */
  static async create(taskData: {
    title: string;
    description?: string;
    due_date?: string;
    priority: TaskPriority;
    status?: TaskStatus;
  }): Promise<Task> {
    DatabaseDebugLogger.logTaskOperation('create', taskData);
    
    try {
      await ensureDatabaseConnection();
      const taskService = TaskService.getInstance();
      const result = await taskService.createTask(taskData);
      
      DatabaseDebugLogger.logTaskOperation('create', taskData, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logTaskOperation('create', taskData, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get all tasks with optional filters
   */
  static async getAll(filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    DatabaseDebugLogger.logTaskOperation('getAll', filters);
    
    try {
      await ensureDatabaseConnection();
      const taskService = TaskService.getInstance();
      const result = await taskService.getTasks(filters);
      
      DatabaseDebugLogger.logTaskOperation('getAll', filters, { count: result.length, tasks: result });
      return result;
    } catch (error) {
      DatabaseDebugLogger.logTaskOperation('getAll', filters, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  static async getById(id: number): Promise<Task> {
    DatabaseDebugLogger.logTaskOperation('getById', { id });
    
    try {
      await ensureDatabaseConnection();
      const taskService = TaskService.getInstance();
      const result = await taskService.getTaskById(id);
      
      DatabaseDebugLogger.logTaskOperation('getById', { id }, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logTaskOperation('getById', { id }, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Update a task
   */
  static async update(id: number, updates: Partial<Task>): Promise<Task> {
    DatabaseDebugLogger.logTaskOperation('update', { id, updates });
    
    try {
      await ensureDatabaseConnection();
      const taskService = TaskService.getInstance();
      const result = await taskService.updateTask(id, updates);
      
      DatabaseDebugLogger.logTaskOperation('update', { id, updates }, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logTaskOperation('update', { id, updates }, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  static async delete(id: number): Promise<boolean> {
    DatabaseDebugLogger.logTaskOperation('delete', { id });
    
    try {
      await ensureDatabaseConnection();
      const taskService = TaskService.getInstance();
      const result = await taskService.deleteTask(id);
      
      DatabaseDebugLogger.logTaskOperation('delete', { id }, { deleted: result });
      return result;
    } catch (error) {
      DatabaseDebugLogger.logTaskOperation('delete', { id }, undefined, error as Error);
      throw error;
    }
  }
}

/**
 * Goal-related database operations
 */
export class GoalOperations {
  /**
   * Create a new goal
   */
  static async create(goalData: {
    title: string;
    description?: string;
    target_value: number;
    current_value?: number;
    due_date?: string;
    category?: string;
  }): Promise<Goal> {
    DatabaseDebugLogger.logGoalOperation('create', goalData);
    
    try {
      await ensureDatabaseConnection();
      const goalService = GoalService.getInstance();
      const result = await goalService.createGoal(goalData);
      
      DatabaseDebugLogger.logGoalOperation('create', goalData, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logGoalOperation('create', goalData, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get all goals with optional filters
   */
  static async getAll(filters?: {
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<Goal[]> {
    DatabaseDebugLogger.logGoalOperation('getAll', filters);
    
    try {
      await ensureDatabaseConnection();
      const goalService = GoalService.getInstance();
      const result = await goalService.getGoals(filters);
      
      DatabaseDebugLogger.logGoalOperation('getAll', filters, { count: result.length, goals: result });
      return result;
    } catch (error) {
      DatabaseDebugLogger.logGoalOperation('getAll', filters, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get goal by ID
   */
  static async getById(id: number): Promise<Goal> {
    DatabaseDebugLogger.logGoalOperation('getById', { id });
    
    try {
      await ensureDatabaseConnection();
      const goalService = GoalService.getInstance();
      const result = await goalService.getGoalById(id);
      
      DatabaseDebugLogger.logGoalOperation('getById', { id }, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logGoalOperation('getById', { id }, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Update a goal
   */
  static async update(id: number, updates: Partial<Goal>): Promise<Goal> {
    DatabaseDebugLogger.logGoalOperation('update', { id, updates });
    
    try {
      await ensureDatabaseConnection();
      const goalService = GoalService.getInstance();
      const result = await goalService.updateGoal(id, updates);
      
      DatabaseDebugLogger.logGoalOperation('update', { id, updates }, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logGoalOperation('update', { id, updates }, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Delete a goal
   */
  static async delete(id: number): Promise<boolean> {
    DatabaseDebugLogger.logGoalOperation('delete', { id });
    
    try {
      await ensureDatabaseConnection();
      const goalService = GoalService.getInstance();
      const result = await goalService.deleteGoal(id);
      
      DatabaseDebugLogger.logGoalOperation('delete', { id }, { deleted: result });
      return result;
    } catch (error) {
      DatabaseDebugLogger.logGoalOperation('delete', { id }, undefined, error as Error);
      throw error;
    }
  }
}

/**
 * Calendar Event-related database operations
 */
export class CalendarEventOperations {
  /**
   * Create a new calendar event
   */
  static async create(eventData: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
  }): Promise<CalendarEvent> {
    DatabaseDebugLogger.logEventOperation('create', eventData);
    
    try {
      await ensureDatabaseConnection();
      const calendarService = CalendarEventService.getInstance();
      const result = await calendarService.createCalendarEvent(eventData);
      
      DatabaseDebugLogger.logEventOperation('create', eventData, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logEventOperation('create', eventData, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get all calendar events with optional filters
   */
  static async getAll(filters?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<CalendarEvent[]> {
    DatabaseDebugLogger.logEventOperation('getAll', filters);
    
    try {
      await ensureDatabaseConnection();
      const calendarService = CalendarEventService.getInstance();
      const result = await calendarService.getCalendarEvents(filters);
      
      DatabaseDebugLogger.logEventOperation('getAll', filters, { count: result.length, events: result });
      return result;
    } catch (error) {
      DatabaseDebugLogger.logEventOperation('getAll', filters, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get calendar event by ID
   */
  static async getById(id: number): Promise<CalendarEvent> {
    DatabaseDebugLogger.logEventOperation('getById', { id });
    
    try {
      await ensureDatabaseConnection();
      const calendarService = CalendarEventService.getInstance();
      const result = await calendarService.getCalendarEventById(id);
      
      DatabaseDebugLogger.logEventOperation('getById', { id }, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logEventOperation('getById', { id }, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  static async update(id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    DatabaseDebugLogger.logEventOperation('update', { id, updates });
    
    try {
      await ensureDatabaseConnection();
      const calendarService = CalendarEventService.getInstance();
      const result = await calendarService.updateCalendarEvent(id, updates);
      
      DatabaseDebugLogger.logEventOperation('update', { id, updates }, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logEventOperation('update', { id, updates }, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  static async delete(id: number): Promise<boolean> {
    DatabaseDebugLogger.logEventOperation('delete', { id });
    
    try {
      await ensureDatabaseConnection();
      const calendarService = CalendarEventService.getInstance();
      const result = await calendarService.deleteCalendarEvent(id);
      
      DatabaseDebugLogger.logEventOperation('delete', { id }, { deleted: result });
      return result;
    } catch (error) {
      DatabaseDebugLogger.logEventOperation('delete', { id }, undefined, error as Error);
      throw error;
    }
  }
}

/**
 * Message-related database operations
 */
export class MessageOperations {
  /**
   * Create a new message
   */
  static async create(messageData: {
    conversation_id: number;
    content: string;
    media_url?: string;
    is_user_message: boolean;
  }): Promise<Message> {
    DatabaseDebugLogger.logMessageOperation('create', messageData);
    
    try {
      await ensureDatabaseConnection();
      const messageService = MessageService.getInstance();
      const result = await messageService.createMessage(messageData);
      
      DatabaseDebugLogger.logMessageOperation('create', messageData, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logMessageOperation('create', messageData, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get messages by conversation ID
   */
  static async getByConversationId(conversationId: number, limit?: number): Promise<Message[]> {
    DatabaseDebugLogger.logMessageOperation('getByConversationId', { conversationId, limit });
    
    try {
      await ensureDatabaseConnection();
      const messageService = MessageService.getInstance();
      const result = await messageService.getMessagesByConversationId(conversationId, limit);
      
      DatabaseDebugLogger.logMessageOperation('getByConversationId', { conversationId, limit }, { count: result.length, messages: result });
      return result;
    } catch (error) {
      DatabaseDebugLogger.logMessageOperation('getByConversationId', { conversationId, limit }, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get message by ID
   */
  static async getById(id: number): Promise<Message> {
    DatabaseDebugLogger.logMessageOperation('getById', { id });
    
    try {
      await ensureDatabaseConnection();
      const messageService = MessageService.getInstance();
      const result = await messageService.getMessageById(id);
      
      DatabaseDebugLogger.logMessageOperation('getById', { id }, result);
      return result;
    } catch (error) {
      DatabaseDebugLogger.logMessageOperation('getById', { id }, undefined, error as Error);
      throw error;
    }
  }
}

// Export the debug logger for use in tools
export { DatabaseDebugLogger };

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Check if priority is valid
   */
  static isValidTaskPriority(priority: string): priority is TaskPriority {
    return ['high', 'medium', 'low'].includes(priority.toLowerCase());
  }

  /**
   * Check if status is valid
   */
  static isValidTaskStatus(status: string): status is TaskStatus {
    return ['pending', 'in_progress', 'completed', 'cancelled'].includes(status.toLowerCase());
  }

  /**
   * Check if date string is valid
   */
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Format date to ISO string
   */
  static formatDateToISO(dateString: string): string {
    return new Date(dateString).toISOString();
  }
}

export default {
  TaskOperations,
  GoalOperations,
  CalendarEventOperations,
  MessageOperations,
  ValidationUtils,
  ensureDatabaseConnection
}; 
