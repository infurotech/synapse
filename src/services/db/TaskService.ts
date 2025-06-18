import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Task, TaskPriority, TaskStatus } from './DatabaseSchema';
import { DatabaseAgent } from './DatabaseService';

export class TaskService {
  private static instance: TaskService;
  private dbAgent: DatabaseAgent;

  private constructor() {
    this.dbAgent = DatabaseAgent.getInstance();
  }

  public static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  private get db(): SQLiteDBConnection | null {
    return this.dbAgent.getConnection();
  }

  /**
   * Create a new task
   */
  public async createTask(taskData: {
    title: string;
    description?: string;
    due_date?: string;
    priority: TaskPriority;
    status?: TaskStatus;
  }): Promise<Task> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `
      INSERT INTO tasks (title, description, due_date, priority, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const values = [
      taskData.title,
      taskData.description || null,
      taskData.due_date || null,
      taskData.priority,
      taskData.status || TaskStatus.PENDING
    ];

    const result = await this.db.run(query, values);
    
    if (result.changes && result.changes.lastId) {
      const createdTask = await this.getTaskById(result.changes.lastId);
      return createdTask;
    } else {
      throw new Error('Failed to create task - no ID returned');
    }
  }

  /**
   * Get task by ID
   */
  public async getTaskById(id: number): Promise<Task> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `SELECT * FROM tasks WHERE id = ?`;
    
    const result = await this.db.query(query, [id]);

    if (result.values && result.values.length > 0) {
      const task = result.values[0] as Task;
      return task;
    } else {
      throw new Error(`Task with ID ${id} not found`);
    }
  }

  /**
   * Get all tasks with optional filters
   */
  public async getTasks(filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    let query = `SELECT * FROM tasks WHERE 1=1`;
    const values: (string | number)[] = [];

    if (filters?.status) {
      query += ` AND status = ?`;
      values.push(filters.status);
    }

    if (filters?.priority) {
      query += ` AND priority = ?`;
      values.push(filters.priority);
    }

    query += ` ORDER BY created_at DESC`;

    if (filters?.limit) {
      query += ` LIMIT ?`;
      values.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET ?`;
      values.push(filters.offset);
    }

    const result = await this.db.query(query, values);
    return (result.values || []) as Task[];
  }

  /**
   * Update a task
   */
  public async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const updateFields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.due_date !== undefined) {
      updateFields.push('due_date = ?');
      values.push(updates.due_date);
    }
    if (updates.priority !== undefined) {
      updateFields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.db.run(query, values);

    return await this.getTaskById(id);
  }

  /**
   * Delete a task
   */
  public async deleteTask(id: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `DELETE FROM tasks WHERE id = ?`;
    const result = await this.db.run(query, [id]);

    return (result.changes?.changes || 0) > 0;
  }

  /**
   * Batch create tasks for better performance
   */
  public async batchCreateTasks(tasks: Array<{
    title: string;
    description?: string;
    due_date?: string;
    priority: TaskPriority;
    status?: TaskStatus;
  }>): Promise<Task[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    console.log(`[TaskService] Batch creating ${tasks.length} tasks`);
    
    const insertQuery = `
      INSERT INTO tasks (title, description, due_date, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const createdTasks: Task[] = [];
    
    // Use transaction for better performance
    await this.db.execute('BEGIN TRANSACTION');
    
    try {
      for (const taskData of tasks) {
        const values = [
          taskData.title,
          taskData.description || null,
          taskData.due_date || null,
          taskData.priority,
          taskData.status || 'pending'
        ];
        
        const result = await this.db.run(insertQuery, values);
        
        if (result.changes && result.changes.lastId !== undefined) {
          const newTask = await this.getTaskById(result.changes.lastId);
          createdTasks.push(newTask);
        }
      }
      
      await this.db.execute('COMMIT');
      console.log(`[TaskService] Successfully batch created ${createdTasks.length} tasks`);
      
    } catch (error) {
      await this.db.execute('ROLLBACK');
      console.error('[TaskService] Batch task creation failed, rolling back:', error);
      throw error;
    }
    
    return createdTasks;
  }

  /**
   * Search tasks with caching
   */
  public async searchTasks(searchTerm: string, filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    limit?: number;
  }): Promise<Task[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    let query = `
      SELECT * FROM tasks 
      WHERE (title LIKE ? OR description LIKE ?)
    `;
    const params: unknown[] = [`%${searchTerm}%`, `%${searchTerm}%`];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const result = await this.db.query(query, params);
    const tasks: Task[] = result.values?.map((row: unknown[]) => ({
      id: row[0] as number,
      title: row[1] as string,
      description: (row[2] as string | null) || undefined,
      due_date: (row[3] as string | null) || undefined,
      priority: row[4] as TaskPriority,
      status: row[5] as TaskStatus,
      created_at: row[6] as string,
      updated_at: row[7] as string
    })) || [];

    console.log(`[TaskService] Found ${tasks.length} tasks matching search: ${searchTerm}`);
    return tasks;
  }
}

export default TaskService; 
