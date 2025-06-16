/**
 * Database utility functions for agent tools
 */

import DatabaseAgent from '../services/db/DatabaseService';
import { Task, TaskPriority, TaskStatus, Goal, Message } from '../services/db/DatabaseSchema';

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
    console.log('🔗 [TaskOperations] create called with data:', JSON.stringify(taskData, null, 2));
    
    try {
      console.log('🔌 [TaskOperations] Ensuring database connection...');
      const dbAgent = await ensureDatabaseConnection();
      console.log('✅ [TaskOperations] Database connection established');
      
      console.log('🗄️ [TaskOperations] Calling dbAgent.createTask...');
      const result = await dbAgent.createTask(taskData);
      console.log('🎯 [TaskOperations] Task creation completed successfully');
      console.log('📋 [TaskOperations] Result:', JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error('💥 [TaskOperations] Error in create method:', error);
      console.error('💥 [TaskOperations] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        taskData
      });
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
    const dbAgent = await ensureDatabaseConnection();
    return await dbAgent.getTasks(filters);
  }

  /**
   * Get task by ID
   */
  static async getById(id: number): Promise<Task> {
    const dbAgent = await ensureDatabaseConnection();
    return await dbAgent.getTaskById(id);
  }

  /**
   * Update a task
   */
  static async update(id: number, updates: Partial<Task>): Promise<Task> {
    const dbAgent = await ensureDatabaseConnection();
    return await dbAgent.updateTask(id, updates);
  }

  /**
   * Delete a task
   */
  static async delete(id: number): Promise<boolean> {
    const dbAgent = await ensureDatabaseConnection();
    return await dbAgent.deleteTask(id);
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
    const dbAgent = await ensureDatabaseConnection();
    return await dbAgent.createGoal(goalData);
  }

  /**
   * Get all goals with optional filters
   */
  static async getAll(filters?: {
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<Goal[]> {
    const dbAgent = await ensureDatabaseConnection();
    return await dbAgent.getGoals(filters);
  }

  /**
   * Get goal by ID
   */
  static async getById(id: number): Promise<Goal> {
    const dbAgent = await ensureDatabaseConnection();
    return await dbAgent.getGoalById(id);
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
    const dbAgent = await ensureDatabaseConnection();
    return await dbAgent.createMessage(messageData);
  }

  /**
   * Get messages by conversation ID
   */
  static async getByConversationId(conversationId: number, limit?: number): Promise<Message[]> {
    const dbAgent = await ensureDatabaseConnection();
    return await dbAgent.getMessagesByConversationId(conversationId, limit);
  }

  /**
   * Get message by ID
   */
  static async getById(id: number): Promise<Message> {
    const dbAgent = await ensureDatabaseConnection();
    return await dbAgent.getMessageById(id);
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Validate task priority
   */
  static isValidTaskPriority(priority: string): priority is TaskPriority {
    return ['high', 'medium', 'low'].includes(priority);
  }

  /**
   * Validate task status
   */
  static isValidTaskStatus(status: string): status is TaskStatus {
    return ['pending', 'in_progress', 'completed', 'cancelled'].includes(status);
  }

  /**
   * Validate date format (basic ISO date check)
   */
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Format date to ISO string
   */
  static formatDateToISO(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date.toISOString();
  }
}

export default {
  TaskOperations,
  GoalOperations,
  MessageOperations,
  ValidationUtils,
  ensureDatabaseConnection
}; 