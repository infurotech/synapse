import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import DatabaseService from './DatabaseService';
import SQLiteHelper from './SQLiteHelper';

/**
 * Task priority levels
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * Task status options
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Task interface
 */
export interface Task {
  id?: number;
  user_id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  created_at?: string;
  updated_at?: string;
}

/**
 * Repository for task operations
 */
export class TaskRepository {
  private db: SQLiteDBConnection | null = null;
  private isDbInitialized: boolean = false;

  constructor() {
    this.db = DatabaseService.getInstance().getConnection();
  }

  /**
   * Ensure the database connection is established
   */
  private async ensureDbConnection(): Promise<void> {
    if (this.isDbInitialized && this.db) {
      return;
    }

    // Try to get the connection again in case it was initialized after constructor
    this.db = DatabaseService.getInstance().getConnection();
    
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    
    this.isDbInitialized = true;
  }

  /**
   * Create a new task
   */
  public async createTask(task: Task): Promise<number> {
    await this.ensureDbConnection();

    try {
      const result = await SQLiteHelper.run(
        this.db!,
        `
          INSERT INTO tasks (user_id, title, description, due_date, priority, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          task.user_id,
          task.title,
          task.description || null,
          task.due_date || null,
          task.priority || 'medium',
          task.status || 'pending'
        ]
      );

      return result.changes?.lastId || 0;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get a task by ID
   */
  public async getTaskById(id: number): Promise<Task | null> {
    await this.ensureDbConnection();

    try {
      const result = await SQLiteHelper.query<Task>(
        this.db!,
        'SELECT * FROM tasks WHERE id = ?',
        [id]
      );

      if (result.values && result.values.length > 0) {
        return result.values[0] as Task;
      }

      return null;
    } catch (error) {
      console.error('Error getting task by ID:', error);
      throw error;
    }
  }

  /**
   * Get all tasks for a user
   */
  public async getTasksByUserId(userId: number): Promise<Task[]> {
    await this.ensureDbConnection();

    try {
      const result = await SQLiteHelper.query<Task>(
        this.db!,
        'SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC, priority DESC',
        [userId]
      );

      return (result.values || []) as Task[];
    } catch (error) {
      console.error('Error getting tasks by user ID:', error);
      throw error;
    }
  }

  /**
   * Get tasks by status for a user
   */
  public async getTasksByStatus(userId: number, status: TaskStatus): Promise<Task[]> {
    await this.ensureDbConnection();

    try {
      const result = await SQLiteHelper.query<Task>(
        this.db!,
        'SELECT * FROM tasks WHERE user_id = ? AND status = ? ORDER BY due_date ASC, priority DESC',
        [userId, status]
      );

      return (result.values || []) as Task[];
    } catch (error) {
      console.error('Error getting tasks by status:', error);
      throw error;
    }
  }

  /**
   * Get tasks due today for a user
   */
  public async getTasksDueToday(userId: number): Promise<Task[]> {
    await this.ensureDbConnection();

    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await SQLiteHelper.query<Task>(
        this.db!,
        `
          SELECT * FROM tasks 
          WHERE user_id = ? 
          AND date(due_date) = date(?) 
          AND status != 'completed' 
          AND status != 'cancelled'
          ORDER BY priority DESC
        `,
        [userId, today]
      );

      return (result.values || []) as Task[];
    } catch (error) {
      console.error('Error getting tasks due today:', error);
      throw error;
    }
  }

  /**
   * Get upcoming tasks for a user
   */
  public async getUpcomingTasks(userId: number, limit: number = 5): Promise<Task[]> {
    await this.ensureDbConnection();

    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await SQLiteHelper.query<Task>(
        this.db!,
        `
          SELECT * FROM tasks 
          WHERE user_id = ? 
          AND date(due_date) >= date(?) 
          AND status != 'completed' 
          AND status != 'cancelled'
          ORDER BY due_date ASC, priority DESC
          LIMIT ?
        `,
        [userId, today, limit]
      );

      return (result.values || []) as Task[];
    } catch (error) {
      console.error('Error getting upcoming tasks:', error);
      throw error;
    }
  }

  /**
   * Update a task
   */
  public async updateTask(task: Task): Promise<boolean> {
    await this.ensureDbConnection();

    if (!task.id) {
      throw new Error('Invalid task ID');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db!,
        `
          UPDATE tasks 
          SET title = ?, 
              description = ?, 
              due_date = ?, 
              priority = ?, 
              status = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `,
        [
          task.title,
          task.description || null,
          task.due_date || null,
          task.priority || 'medium',
          task.status || 'pending',
          task.id,
          task.user_id
        ]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Update task status
   */
  public async updateTaskStatus(id: number, userId: number, status: TaskStatus): Promise<boolean> {
    await this.ensureDbConnection();

    if (!id || !userId) {
      throw new Error('Invalid task ID or user ID');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db!,
        `
          UPDATE tasks 
          SET status = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `,
        [status, id, userId]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  public async deleteTask(id: number, userId: number): Promise<boolean> {
    await this.ensureDbConnection();

    if (!id || !userId) {
      throw new Error('Invalid task ID or user ID');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db!,
        'DELETE FROM tasks WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
}

export default TaskRepository; 