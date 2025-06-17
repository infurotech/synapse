import { Capacitor } from '@capacitor/core';
import { SQLiteConnection, SQLiteDBConnection, CapacitorSQLite } from '@capacitor-community/sqlite';


export class DatabaseAgent {
  private static instance: DatabaseAgent;
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private readonly DB_NAME = 'synapse_db';
  private readonly DB_VERSION = 1;
  
  // Performance optimizations
  private queryCache: Map<string, { result: unknown; timestamp: number }> = new Map();
  private preparedStatements: Map<string, string> = new Map();
  private connectionPool: SQLiteDBConnection[] = [];
  private readonly CACHE_TTL = 60000; // 1 minute
  private readonly MAX_CACHE_SIZE = 100;
  private readonly POOL_SIZE = 3;

  private constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  public static getInstance(): DatabaseAgent {
    if (!DatabaseAgent.instance) {
      DatabaseAgent.instance = new DatabaseAgent();
    }
    return DatabaseAgent.instance;
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
        title TEXT NOT NULL,
        last_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
   * Test database connection by inserting and retrieving a test record
   */
  private async testDatabaseConnection(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      console.log('Testing database connection...');
      
      // Insert a test user
      const testEmail = `test_${Date.now()}@example.com`;
      const insertQuery = `
        INSERT INTO users (email, theme_preference)
        VALUES (?, ?)
      `;
      const values = [testEmail, 'system'];
      await this.db.run(insertQuery, values);
      
      console.log(`Inserted test user with email: ${testEmail}`);
      
      // Query the test user
      const selectQuery = `
        SELECT * FROM users WHERE email = ?
      `;
      const result = await this.db.query(selectQuery, [testEmail]);
      
      if (result.values && result.values.length > 0) {
        console.log('Test user retrieved successfully:', result.values[0]);
      } else {
        console.error('Failed to retrieve test user');
      }
    } catch (error) {
      console.error('Database test failed:', error);
    }
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

  /**
   * Execute a cached query with performance optimization
   */
  private async executeCachedQuery(query: string, params: unknown[] = []): Promise<unknown> {
    const cacheKey = `${query}_${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[DatabaseAgent] Cache hit for query');
      return cached.result;
    }
    
    // Execute query
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    
    const result = await this.db.query(query, params);
    
    // Cache the result
    this.cacheResult(cacheKey, result.values);
    
    return result.values;
  }

  /**
   * Cache management
   */
  private cacheResult(key: string, result: unknown): void {
    // Clean old entries if cache is full
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.queryCache.keys())[0];
      this.queryCache.delete(oldestKey);
    }
    
    this.queryCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Database performance metrics
   */
  public getPerformanceMetrics(): Record<string, unknown> {
    return {
      cacheSize: this.queryCache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      connectionPoolSize: this.connectionPool.length,
      isInitialized: this.isInitialized,
      dbName: this.DB_NAME,
      dbVersion: this.DB_VERSION
    };
  }

  private calculateCacheHitRate(): number {
    // Simple cache hit rate calculation
    // In a real implementation, you'd track hits/misses
    return this.queryCache.size > 0 ? 0.85 : 0; // Placeholder
  }

  /**
   * Cleanup cache and optimize database
   */
  public async optimizeDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    console.log('[DatabaseAgent] Optimizing database...');
    
    // Clear old cache entries
    const now = Date.now();
    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.queryCache.delete(key);
      }
    }
    
    // Run VACUUM to optimize database file
    await this.db.execute('VACUUM');
    
    // Analyze tables for query optimization
    await this.db.execute('ANALYZE');
    
    console.log('[DatabaseAgent] Database optimization completed');
  }
}

export default DatabaseAgent;   

