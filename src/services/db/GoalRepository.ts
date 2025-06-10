import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import DatabaseService from './DatabaseService';
import SQLiteHelper from './SQLiteHelper';

export interface Goal {
  id?: number;
  user_id: number;
  title: string;
  description?: string;
  target_value: number;
  current_value?: number;
  due_date?: string;
  category?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
}

export class GoalRepository {
  private db: SQLiteDBConnection | null = null;

  constructor() {
    this.db = DatabaseService.getInstance().getConnection();
  }

  /**
   * Calculate progress percentage for a goal
   */
  public calculateProgress(currentValue: number, targetValue: number): number {
    if (targetValue === 0) return 0;
    const progress = (currentValue / targetValue) * 100;
    return Math.min(Math.max(progress, 0), 100); // Clamp between 0 and 100
  }

  /**
   * Create a new goal
   */
  public async createGoal(goal: Goal): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Insert the goal
      const result = await SQLiteHelper.run(
        this.db,
        `
          INSERT INTO goals (
            user_id, title, description, target_value, 
            current_value, due_date, category, tags
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          goal.user_id,
          goal.title,
          goal.description || null,
          goal.target_value,
          goal.current_value || 0.0,
          goal.due_date || null,
          goal.category || null,
          goal.tags || null
        ]
      );

      return result.changes?.lastId || 0;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }

  /**
   * Get a goal by ID
   */
  public async getGoalById(id: number): Promise<Goal | null> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Get the goal
      const goalResult = await SQLiteHelper.query<Goal>(
        this.db,
        'SELECT * FROM goals WHERE id = ?',
        [id]
      );

      if (!goalResult.values || goalResult.values.length === 0) {
        return null;
      }

      return goalResult.values[0] as Goal;
    } catch (error) {
      console.error('Error getting goal by ID:', error);
      throw error;
    }
  }

  /**
   * Get all goals for a user
   */
  public async getGoalsByUserId(userId: number): Promise<Goal[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Get all goals
      const goalsResult = await SQLiteHelper.query<Goal>(
        this.db,
        'SELECT * FROM goals WHERE user_id = ? ORDER BY due_date ASC',
        [userId]
      );

      return (goalsResult.values || []) as Goal[];
    } catch (error) {
      console.error('Error getting goals by user ID:', error);
      throw error;
    }
  }

  /**
   * Get completed goals for a user (current_value >= target_value)
   */
  public async getCompletedGoals(userId: number): Promise<Goal[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Get completed goals
      const goalsResult = await SQLiteHelper.query<Goal>(
        this.db,
        'SELECT * FROM goals WHERE user_id = ? AND current_value >= target_value ORDER BY due_date ASC',
        [userId]
      );

      return (goalsResult.values || []) as Goal[];
    } catch (error) {
      console.error('Error getting completed goals:', error);
      throw error;
    }
  }

  /**
   * Get in-progress goals for a user (current_value < target_value)
   */
  public async getInProgressGoals(userId: number): Promise<Goal[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Get in-progress goals
      const goalsResult = await SQLiteHelper.query<Goal>(
        this.db,
        'SELECT * FROM goals WHERE user_id = ? AND current_value < target_value ORDER BY due_date ASC',
        [userId]
      );

      return (goalsResult.values || []) as Goal[];
    } catch (error) {
      console.error('Error getting in-progress goals:', error);
      throw error;
    }
  }

  /**
   * Get goals by category for a user
   */
  public async getGoalsByCategory(userId: number, category: string): Promise<Goal[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Get goals by category
      const goalsResult = await SQLiteHelper.query<Goal>(
        this.db,
        'SELECT * FROM goals WHERE user_id = ? AND category = ? ORDER BY due_date ASC',
        [userId, category]
      );

      return (goalsResult.values || []) as Goal[];
    } catch (error) {
      console.error('Error getting goals by category:', error);
      throw error;
    }
  }

  /**
   * Get goals by tag for a user
   */
  public async getGoalsByTag(userId: number, tag: string): Promise<Goal[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Get goals by tag (using LIKE for substring matching in the tags field)
      const goalsResult = await SQLiteHelper.query<Goal>(
        this.db,
        "SELECT * FROM goals WHERE user_id = ? AND tags LIKE ? ORDER BY due_date ASC",
        [userId, `%${tag}%`]
      );

      return (goalsResult.values || []) as Goal[];
    } catch (error) {
      console.error('Error getting goals by tag:', error);
      throw error;
    }
  }

  /**
   * Update a goal
   */
  public async updateGoal(goal: Goal): Promise<boolean> {
    if (!this.db || !goal.id) {
      throw new Error('Database connection not established or invalid goal ID');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        `
          UPDATE goals 
          SET title = ?, 
              description = ?, 
              target_value = ?,
              current_value = ?,
              due_date = ?,
              category = ?,
              tags = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `,
        [
          goal.title,
          goal.description || null,
          goal.target_value,
          goal.current_value || 0.0,
          goal.due_date || null,
          goal.category || null,
          goal.tags || null,
          goal.id,
          goal.user_id
        ]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  /**
   * Update goal current value
   */
  public async updateGoalCurrentValue(id: number, userId: number, currentValue: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        `
          UPDATE goals 
          SET current_value = ?, 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `,
        [currentValue, id, userId]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error updating goal current value:', error);
      throw error;
    }
  }

  /**
   * Delete a goal
   */
  public async deleteGoal(id: number, userId: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        'DELETE FROM goals WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }
}

export default GoalRepository;