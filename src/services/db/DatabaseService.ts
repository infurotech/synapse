import { Capacitor } from '@capacitor/core';
import { SQLiteConnection, SQLiteDBConnection, CapacitorSQLite } from '@capacitor-community/sqlite';
import { Conversation as DBConversation, Message as DBMessage, Goal as DBGoal, Subgoal as DBSubgoal } from './DatabaseSchema';

export class DatabaseService {
  private static instance: DatabaseService;
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private readonly DB_NAME = 'synapse_db';
  private readonly DB_VERSION = 1;

  private constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database
   */
  public async initializeDatabase(): Promise<void> {
    if (this.isInitialized) {
      console.log('Database already initialized, skipping initialization');
      return;
    }

    try {
      // Check platform
      const platform = Capacitor.getPlatform();
      console.log(`Initializing database on platform: ${platform}`);

      // For Android & iOS, check if SQLite is available
      if (platform === 'android' || platform === 'ios') {
        const echo = await this.sqlite.echo("Hello World");
        console.log(`SQLite echo test on ${platform}: ${echo.value}`);
      }

      // For web platform, we need to use the jeep-sqlite polyfill
      if (platform === 'web') {
        console.log('Initializing WebStore for SQLite');
        await this.sqlite.initWebStore();
      }

      // Delete existing connections to ensure a clean start
      const ret = await this.sqlite.isConnection(this.DB_NAME, false);
      if (ret.result) {
        console.log(`Closing existing connection to ${this.DB_NAME}`);
        await this.sqlite.closeConnection(this.DB_NAME, false);
      }

      // Create or open the database
      console.log(`Creating connection to ${this.DB_NAME}`);
      this.db = await this.sqlite.createConnection(
        this.DB_NAME,
        false,
        'no-encryption',
        this.DB_VERSION,
        false
      );

      if (this.db) {
        console.log('Opening database connection');
        await this.db.open();
        
        // Create tables
        console.log('Creating database tables');
        await this.createTables();
        
        this.isInitialized = true;
        console.log('Database initialized successfully');
        
        // Run a test to verify the database is working
        await this.testDatabaseConnection();
      } else {
        throw new Error('Failed to create database connection');
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    // Users table
    console.log('Creating users table');
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        theme_preference TEXT DEFAULT 'system',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Subgoals table
    console.log('Creating subgoals table');
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS subgoals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
      );
    `);

    // Tasks table
    console.log('Creating tasks table');
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        priority TEXT CHECK(priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
        status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Calendar events table
    console.log('Creating calendar_events table');
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Goals table
    console.log('Creating goals table');
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        target_value REAL NOT NULL,
        current_value REAL DEFAULT 0.0,
        due_date TIMESTAMP,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Conversations table
    console.log('Creating conversations table');
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        last_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Messages table
    console.log('Creating messages table');
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        media_url TEXT,
        is_user_message INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);
  }

  /**
   * Goal CRUD Operations
   */

  public async getSubgoalById(id: number): Promise<DBSubgoal | null> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    const resp = await this.db.query('SELECT * FROM subgoals WHERE id = ?', [id]);
    return resp.values && resp.values.length > 0 ? resp.values[0] : null;
  }

  public async addGoal(goal: Omit<DBGoal, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    const query = `
      INSERT INTO goals (title, description, target_value, current_value, due_date, category)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const values = [
      goal.title,
      goal.description || null,
      goal.target_value,
      goal.current_value || 0,
      goal.due_date || null,
      goal.category || null,
    ];
    const res = await this.db.run(query, values);
    if (res.changes && res.changes.lastId) {
      return res.changes.lastId;
    } else {
      throw new Error('Failed to insert goal');
    }
  }

  public async getGoalById(id: number): Promise<DBGoal | null> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    const query = `SELECT * FROM goals WHERE id = ?;`;
    const res = await this.db.query(query, [id]);
    if (res.values && res.values.length > 0) {
      return res.values[0] as DBGoal;
    } else {
      return null;
    }
  }

  public async getAllGoals(): Promise<DBGoal[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    const query = `SELECT * FROM goals ORDER BY due_date ASC;`;
    const res = await this.db.query(query);
    return (res.values || []) as DBGoal[];
  }

  public async updateGoal(goal: Partial<DBGoal> & { id: number }): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    const fields: string[] = [];
    const values: any[] = [];

    if (goal.title !== undefined) { fields.push('title = ?'); values.push(goal.title); }
    if (goal.description !== undefined) { fields.push('description = ?'); values.push(goal.description); }
    if (goal.target_value !== undefined) { fields.push('target_value = ?'); values.push(goal.target_value); }
    if (goal.current_value !== undefined) { fields.push('current_value = ?'); values.push(goal.current_value); }
    if (goal.due_date !== undefined) { fields.push('due_date = ?'); values.push(goal.due_date); }
    if (goal.category !== undefined) { fields.push('category = ?'); values.push(goal.category); }

    if (fields.length === 0) {
      console.log('No fields to update for goal.');
      return;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(goal.id);

    const query = `UPDATE goals SET ${fields.join(', ')} WHERE id = ?;`;
    await this.db.run(query, values);
  }

  public async deleteGoal(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    const query = `DELETE FROM goals WHERE id = ?;`;
    await this.db.run(query, [id]);
  }

  /**
   * Subgoal CRUD Operations
   */

  public async addSubgoal(subgoal: Omit<{
    id: number;
    goal_id: number;
    title: string;
    completed: number;
    created_at: string;
    updated_at: string;
  }, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    const query = `
      INSERT INTO subgoals (goal_id, title, completed)
      VALUES (?, ?, ?);
    `;
    const values = [
      subgoal.goal_id,
      subgoal.title,
      subgoal.completed || 0,
    ];
    const res = await this.db.run(query, values);
    if (res.changes && res.changes.lastId) {
      return res.changes.lastId;
    } else {
      throw new Error('Failed to insert subgoal');
    }
  }

  public async getSubgoalsByGoalId(goalId: number): Promise<{
    id: number;
    goal_id: number;
    title: string;
    completed: number;
    created_at: string;
    updated_at: string;
  }[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    const query = `SELECT * FROM subgoals WHERE goal_id = ? ORDER BY created_at ASC;`;
    const res = await this.db.query(query, [goalId]);
    return (res.values || []) as {
      id: number;
      goal_id: number;
      title: string;
      completed: number;
      created_at: string;
      updated_at: string;
    }[];
  }

  public async updateSubgoal(subgoal: Partial<{
    id: number;
    goal_id: number;
    title: string;
    completed: number;
    created_at: string;
    updated_at: string;
  }> & { id: number }): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    const fields: string[] = [];
    const values: any[] = [];

    if (subgoal.goal_id !== undefined) { fields.push('goal_id = ?'); values.push(subgoal.goal_id); }
    if (subgoal.title !== undefined) { fields.push('title = ?'); values.push(subgoal.title); }
    if (subgoal.completed !== undefined) { fields.push('completed = ?'); values.push(subgoal.completed); }

    if (fields.length === 0) {
      console.log('No fields to update for subgoal.');
      return;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(subgoal.id);

    const query = `UPDATE subgoals SET ${fields.join(', ')} WHERE id = ?;`;
    await this.db.run(query, values);
  }

  public async deleteSubgoal(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    const query = `DELETE FROM subgoals WHERE id = ?;`;
    await this.db.run(query, [id]);
  }

  /**
   * Test database connection by inserting and retrieving a test record
   */
  private async testDatabaseConnection(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      console.log('Testing database connection...');
      
      // Insert a test user if no users exist
      const userCountResult = await this.db.query('SELECT COUNT(*) as count FROM users;');
      if (userCountResult.values && userCountResult.values[0].count === 0) {
        const testEmail = `test_${Date.now()}@example.com`;
        const insertQuery = `
          INSERT INTO users (email, theme_preference)
          VALUES (?, ?) 
        `;
        const values = [testEmail, 'system'];
        await this.db.run(insertQuery, values);
      
      
      // Retrieve the inserted user
      const selectQuery = `SELECT * FROM users WHERE email = ?`;
      const res = await this.db.query(selectQuery, [testEmail]);
      if (res.values && res.values.length > 0) {
        console.log('Test user retrieved:', res.values[0]);
      } else {
        console.warn('Test user not found after insertion.');
      }

      // Clean up: delete the test user
      const deleteQuery = `DELETE FROM users WHERE email = ?`;
      await this.db.run(deleteQuery, [testEmail]);
      console.log('Test user deleted.');

      console.log('Database connection test successful.');
    } }catch (error) {
      console.error('Database connection test failed:', error);
      throw error;
    }
  }
  

  public async addConversation(conversation: Omit<DBConversation, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const { user_id, title, last_message, created_at, updated_at } = conversation;
    const query = `INSERT INTO conversations (user_id, title, last_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`;
    const res = await this.db.run(query, [user_id, title, last_message, created_at, updated_at]);
    if (res.changes?.lastId === undefined) throw new Error('Failed to get last inserted ID');
    return res.changes.lastId;
  }

  public async updateConversation(id: number, updates: Partial<Omit<DBConversation, 'id'>>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const query = `UPDATE conversations SET ${setClauses} WHERE id = ?`;
    await this.db.run(query, [...values, id]);
  }

  public async addMessage(message: Omit<DBMessage, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const { conversation_id, content, media_url, is_user_message, created_at } = message;
    const query = `INSERT INTO messages (conversation_id, content, media_url, is_user_message, created_at) VALUES (?, ?, ?, ?, ?)`;
    const res = await this.db.run(query, [conversation_id, content, media_url, is_user_message, created_at]);
    if (res.changes?.lastId === undefined) throw new Error('Failed to get last inserted ID');
    return res.changes.lastId;
  }

  public async getConversations(): Promise<Array<DBConversation & { messages: DBMessage[] }>> {
    if (!this.db) throw new Error('Database not initialized');
    const conversationsQuery = `SELECT * FROM conversations ORDER BY updated_at DESC`;
    const conversationsRes = await this.db.query(conversationsQuery);
    
    if (!conversationsRes.values) return [];

    const conversationsWithMessages: Array<DBConversation & { messages: DBMessage[] }> = [];

    for (const conv of conversationsRes.values as DBConversation[]) {
      const messagesQuery = `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`;
      const messagesRes = await this.db.query(messagesQuery, [conv.id]);
      const messages = messagesRes.values ? (messagesRes.values as DBMessage[]) : [];
      conversationsWithMessages.push({ ...conv, messages });
    }

    return conversationsWithMessages;
  }

  public async getMessagesForConversation(conversationId: number): Promise<DBMessage[]> {
    if (!this.db) throw new Error('Database not initialized');
    const query = `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`;
    const res = await this.db.query(query, [conversationId]);
    return res.values ? (res.values as DBMessage[]) : [];
  }

  public async deleteConversation(conversationId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const query = `DELETE FROM conversations WHERE id =?`;
    await this.db.run(query, [conversationId]);
  }

  /**
   * Close the database connection
   */
  public async closeConnection(): Promise<void> {
    if (this.db) {
      await this.sqlite.closeConnection(this.DB_NAME, false);
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get the database connection
   */
  public getConnection(): SQLiteDBConnection | null {
    return this.db;
  }
}

export default DatabaseService;