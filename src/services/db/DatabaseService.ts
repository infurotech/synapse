import { Capacitor } from '@capacitor/core';
import { SQLiteConnection, SQLiteDBConnection, CapacitorSQLite } from '@capacitor-community/sqlite';

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
      return;
    }

    try {
      // Check if platform is web
      const platform = Capacitor.getPlatform();
      if (platform === 'web') {
        // For web platform, we need to use the jeep-sqlite polyfill
        await this.sqlite.initWebStore();
      }

      // Create or open the database
      this.db = await this.sqlite.createConnection(
        this.DB_NAME,
        false,
        'no-encryption',
        this.DB_VERSION,
        false
      );

      if (this.db) {
        await this.db.open();
        
        // Create tables
        await this.createTables();
        
        this.isInitialized = true;
        console.log('Database initialized successfully');
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
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        theme_preference TEXT DEFAULT 'system',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tasks table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        priority TEXT CHECK(priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
        status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      );
    `);

    // Calendar events table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      );
    `);

    // Goals table
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Conversations table
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