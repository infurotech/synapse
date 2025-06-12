import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import DatabaseService from './DatabaseService';
import SQLiteHelper from './SQLiteHelper';
import { initializeDatabase } from './index';

/**
 * Interface for AI agents to interact with the database
 */
export class DatabaseAgent {
  private static instance: DatabaseAgent;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): DatabaseAgent {
    if (!DatabaseAgent.instance) {
      DatabaseAgent.instance = new DatabaseAgent();
    }
    return DatabaseAgent.instance;
  }

  /**
   * Initialize the database connection
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }
    
    try {
      // First ensure the database is initialized
      await initializeDatabase();
      
      // Then get the connection
      const dbService = DatabaseService.getInstance();
      this.db = dbService.getConnection();
      
      if (!this.db) {
        throw new Error('Failed to get database connection');
      }
      
      this.isInitialized = true;
      console.log('DatabaseAgent initialized successfully');
    } catch (error) {
      console.error('Error initializing DatabaseAgent:', error);
      throw error;
    }
  }

  /**
   * Ensure the database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      await this.initialize();
    }
  }

  /**
   * Get database schema information
   */
  public async getSchema(): Promise<Record<string, Record<string, unknown>[]>> {
    await this.ensureInitialized();
    
    const tables = await this.getTables();
    const result: Record<string, Record<string, unknown>[]> = {};

    for (const table of tables) {
      result[table] = await this.getTableSchema(table);
    }

    return result;
  }

  /**
   * Execute a raw SQL query with parameters
   * This should be used carefully and only for read operations
   */
  public async executeQuery<T>(query: string, params: unknown[] = []): Promise<T[]> {
    await this.ensureInitialized();
    
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const result = await SQLiteHelper.query<T>(this.db, query, params);
    return result.values || [];
  }

  /**
   * Get all tables in the database
   */
  public async getTables(): Promise<string[]> {
    await this.ensureInitialized();
    
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const result = await SQLiteHelper.query<{ name: string }>(
      this.db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      []
    );

    return result.values ? result.values.map(table => table.name) : [];
  }

  /**
   * Get schema for a specific table
   */
  public async getTableSchema(tableName: string): Promise<Record<string, unknown>[]> {
    await this.ensureInitialized();
    
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const result = await SQLiteHelper.query<Record<string, unknown>>(
      this.db,
      `PRAGMA table_info(${tableName})`,
      []
    );

    return result.values || [];
  }
}

export default DatabaseAgent; 