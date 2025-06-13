import { SQLiteDBConnection, capSQLiteChanges } from '@capacitor-community/sqlite';

/**
 * Helper class to wrap SQLite operations and handle type issues
 */
export class SQLiteHelper {
  /**
   * Execute a SQL statement
   */
  public static async execute(db: SQLiteDBConnection, statement: string): Promise<void> {
    await db.execute(statement);
  }

  /**
   * Run a SQL statement with parameters
   */
  public static async run(
    db: SQLiteDBConnection, 
    statement: string, 
    values: unknown[] = []
  ): Promise<capSQLiteChanges> {
    return await db.run(statement, values);
  }

  /**
   * Query the database with parameters
   */
  public static async query<T>(
    db: SQLiteDBConnection, 
    statement: string, 
    values: unknown[] = []
  ): Promise<{ values?: T[] | undefined }> {
    return await db.query(statement, values);
  }
}

export default SQLiteHelper; 