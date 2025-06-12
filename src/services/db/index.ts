import DatabaseAgent from './DatabaseService';
import Schema from './DatabaseSchema';
import type {
  User,
  Task,
  TaskPriority,
  TaskStatus,
  CalendarEvent,
  Goal,
  Conversation,
  Message,
  DatabaseSchema,
  TableName
} from './DatabaseSchema';

// Track if database has been initialized
let isDbInitialized = false;

// Initialize the database
export const initializeDatabase = async (): Promise<void> => {
  if (isDbInitialized) {
    console.log('Database already initialized, skipping initialization');
    return;
  }

  try {
    const dbAgent = DatabaseAgent.getInstance();
    await dbAgent.initializeDatabase();
    isDbInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Export schema-related services
export {
  DatabaseAgent,
  Schema
};

// Export database interfaces
export type {
  User,
  Task,
  TaskPriority,
  TaskStatus,
  CalendarEvent,
  Goal,
  Conversation,
  Message,
  DatabaseSchema,
  TableName
};

export default DatabaseAgent; 