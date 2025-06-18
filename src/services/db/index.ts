// Database initialization and core functionality
export { DatabaseAgent } from './DatabaseService';

// Individual service classes
export { TaskService } from './TaskService';
export { GoalService } from './GoalService';
export { CalendarEventService } from './CalendarEventService';
export { MessageService } from './MessageService';

// Database schema types
export type {
  User,
  Task,
  TaskPriority,
  TaskStatus,
  Goal,
  CalendarEvent,
  Message,
  Conversation,
  DatabaseSchema,
  TableName
} from './DatabaseSchema';

// Re-export the default schema
export { default as Schema } from './DatabaseSchema';

// Track if database has been initialized
let isDbInitialized = false;

// Initialize the database
export const initializeDatabase = async (): Promise<void> => {
  if (isDbInitialized) {
    console.log('Database already initialized, skipping initialization');
    return;
  }

  try {
    const { DatabaseAgent } = await import('./DatabaseService');
    const dbAgent = DatabaseAgent.getInstance();
    await dbAgent.initializeDatabase();
    isDbInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Utility function to get all services
export const getServices = async () => {
  const { DatabaseAgent } = await import('./DatabaseService');
  const { TaskService } = await import('./TaskService');
  const { GoalService } = await import('./GoalService');
  const { CalendarEventService } = await import('./CalendarEventService');
  const { MessageService } = await import('./MessageService');

  return {
    database: DatabaseAgent.getInstance(),
    tasks: TaskService.getInstance(),
    goals: GoalService.getInstance(),
    calendarEvents: CalendarEventService.getInstance(),
    messages: MessageService.getInstance()
  };
};

// Individual service getters for convenience
export const getTaskService = async () => {
  const { TaskService } = await import('./TaskService');
  return TaskService.getInstance();
};

export const getGoalService = async () => {
  const { GoalService } = await import('./GoalService');
  return GoalService.getInstance();
};

export const getCalendarEventService = async () => {
  const { CalendarEventService } = await import('./CalendarEventService');
  return CalendarEventService.getInstance();
};

export const getMessageService = async () => {
  const { MessageService } = await import('./MessageService');
  return MessageService.getInstance();
};

export const getDatabaseAgent = async () => {
  const { DatabaseAgent } = await import('./DatabaseService');
  return DatabaseAgent.getInstance();
};

// Default export
export { DatabaseAgent as default } from './DatabaseService'; 
