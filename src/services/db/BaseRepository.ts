import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import DatabaseService from './DatabaseService';

/**
 * Base repository class that handles database initialization
 * All repositories should extend this class to ensure database connection
 */
export abstract class BaseRepository {
  protected db: SQLiteDBConnection | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Get the initial connection, which might be null if the database isn't initialized yet
    this.db = DatabaseService.getInstance().getConnection();
  }

  /**
   * Ensure the database is initialized before performing operations
   */
  protected async ensureDbInitialized(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    // Try to get the connection again in case it was initialized after constructor
    this.db = DatabaseService.getInstance().getConnection();
    
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    
    this.isInitialized = true;
  }
}

export default BaseRepository; 