import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Goal } from './DatabaseSchema';
import { DatabaseAgent } from './DatabaseService';

export class GoalService {
  private static instance: GoalService;
  private dbAgent: DatabaseAgent;

  private constructor() {
    this.dbAgent = DatabaseAgent.getInstance();
  }

  public static getInstance(): GoalService {
    if (!GoalService.instance) {
      GoalService.instance = new GoalService();
    }
    return GoalService.instance;
  }

  private get db(): SQLiteDBConnection | null {
    return this.dbAgent.getConnection();
  }

  /**
   * Create a new goal
   */
  public async createGoal(goalData: {
    title: string;
    description?: string;
    target_value: number;
    current_value?: number;
    due_date?: string;
    category?: string;
  }): Promise<Goal> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `
      INSERT INTO goals (title, description, target_value, current_value, due_date, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      goalData.title,
      goalData.description || null,
      goalData.target_value,
      goalData.current_value || 0,
      goalData.due_date || null,
      goalData.category || null
    ];

    const result = await this.db.run(query, values);
    
    if (result.changes && result.changes.lastId) {
      return await this.getGoalById(result.changes.lastId);
    } else {
      throw new Error('Failed to create goal');
    }
  }

  /**
   * Get goal by ID
   */
  public async getGoalById(id: number): Promise<Goal> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `SELECT * FROM goals WHERE id = ?`;
    const result = await this.db.query(query, [id]);

    if (result.values && result.values.length > 0) {
      return result.values[0] as Goal;
    } else {
      throw new Error(`Goal with ID ${id} not found`);
    }
  }

  /**
   * Get all goals
   */
  public async getGoals(filters?: {
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<Goal[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    let query = `SELECT * FROM goals WHERE 1=1`;
    const values: (string | number)[] = [];

    if (filters?.category) {
      query += ` AND category = ?`;
      values.push(filters.category);
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
    return (result.values || []) as Goal[];
  }

  /**
   * Update a goal
   */
  public async updateGoal(id: number, updates: Partial<Goal>): Promise<Goal> {
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
    if (updates.target_value !== undefined) {
      updateFields.push('target_value = ?');
      values.push(updates.target_value);
    }
    if (updates.current_value !== undefined) {
      updateFields.push('current_value = ?');
      values.push(updates.current_value);
    }
    if (updates.due_date !== undefined) {
      updateFields.push('due_date = ?');
      values.push(updates.due_date);
    }
    if (updates.category !== undefined) {
      updateFields.push('category = ?');
      values.push(updates.category);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE goals SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.db.run(query, values);

    return await this.getGoalById(id);
  }

  /**
   * Delete a goal
   */
  public async deleteGoal(id: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `DELETE FROM goals WHERE id = ?`;
    const result = await this.db.run(query, [id]);

    return (result.changes?.changes || 0) > 0;
  }
}

export default GoalService; 

