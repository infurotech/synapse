import { SQLiteConnection } from '@capacitor-community/sqlite';
import DatabaseService from './DatabaseService';
import SQLiteHelper from './SQLiteHelper';

/**
 * Utility class for debugging database operations
 */
export class DatabaseDebugger {
  private static instance: DatabaseDebugger;
  private db = DatabaseService.getInstance().getConnection();

  private constructor() {}

  public static getInstance(): DatabaseDebugger {
    if (!DatabaseDebugger.instance) {
      DatabaseDebugger.instance = new DatabaseDebugger();
    }
    return DatabaseDebugger.instance;
  }

  /**
   * Get all tables in the database
   */
  public async getTables(): Promise<string[]> {
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
   * Get table schema
   */
  public async getTableSchema(tableName: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const result = await SQLiteHelper.query(
      this.db,
      `PRAGMA table_info(${tableName})`,
      []
    );

    return result.values || [];
  }

  /**
   * Get all records from a table
   */
  public async getAllRecords(tableName: string, limit = 100): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const result = await SQLiteHelper.query(
      this.db,
      `SELECT * FROM ${tableName} LIMIT ?`,
      [limit]
    );

    return result.values || [];
  }

  /**
   * Get record count for a table
   */
  public async getRecordCount(tableName: string): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const result = await SQLiteHelper.query<{ count: number }>(
      this.db,
      `SELECT COUNT(*) as count FROM ${tableName}`,
      []
    );

    return result.values && result.values.length > 0 ? result.values[0].count : 0;
  }

  /**
   * Execute a custom SQL query
   */
  public async executeQuery(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const result = await SQLiteHelper.query(
      this.db,
      sql,
      params
    );

    return result.values || [];
  }

  /**
   * Export database to JSON
   */
  public async exportDatabaseToJson(): Promise<Record<string, any[]>> {
    const tables = await this.getTables();
    const result: Record<string, any[]> = {};

    for (const table of tables) {
      result[table] = await this.getAllRecords(table);
    }

    return result;
  }
}

export default DatabaseDebugger; 