import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import DatabaseService from './DatabaseService';
import SQLiteHelper from './SQLiteHelper';

export interface User {
  id?: number;
  username: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  theme_preference?: string;
  notifications_enabled?: number;
  created_at?: string;
  updated_at?: string;
}

export class UserRepository {
  private db: SQLiteDBConnection | null = null;

  constructor() {
    this.db = DatabaseService.getInstance().getConnection();
  }

  /**
   * Create a new user
   */
  public async createUser(user: User): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        `
          INSERT INTO users (username, email, password_hash, first_name, last_name, avatar, theme_preference, notifications_enabled)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user.username,
          user.email,
          user.password_hash,
          user.first_name || null,
          user.last_name || null,
          user.avatar || null,
          user.theme_preference || 'system',
          user.notifications_enabled !== undefined ? user.notifications_enabled : 1
        ]
      );

      return result.changes?.lastId || 0;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get a user by ID
   */
  public async getUserById(id: number): Promise<User | null> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<User>(
        this.db,
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      if (result.values && result.values.length > 0) {
        return result.values[0] as User;
      }

      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Get a user by username
   */
  public async getUserByUsername(username: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<User>(
        this.db,
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (result.values && result.values.length > 0) {
        return result.values[0] as User;
      }

      return null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  /**
   * Get a user by email
   */
  public async getUserByEmail(email: string): Promise<User | null> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<User>(
        this.db,
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (result.values && result.values.length > 0) {
        return result.values[0] as User;
      }

      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Update a user
   */
  public async updateUser(user: User): Promise<boolean> {
    if (!this.db || !user.id) {
      throw new Error('Database connection not established or invalid user ID');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        `
          UPDATE users 
          SET username = ?, 
              email = ?, 
              first_name = ?, 
              last_name = ?, 
              avatar = ?, 
              theme_preference = ?, 
              notifications_enabled = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          user.username,
          user.email,
          user.first_name || null,
          user.last_name || null,
          user.avatar || null,
          user.theme_preference || 'system',
          user.notifications_enabled !== undefined ? user.notifications_enabled : 1,
          user.id
        ]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   */
  public async deleteUser(id: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        'DELETE FROM users WHERE id = ?',
        [id]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

export default UserRepository; 