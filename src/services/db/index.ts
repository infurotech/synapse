import DatabaseService from './DatabaseService';
import UserRepository, { User } from './UserRepository';
import TaskRepository, { Task, TaskPriority, TaskStatus } from './TaskRepository';
import CalendarEventRepository, { CalendarEvent } from './CalendarEventRepository';
import GoalRepository, { Goal } from './GoalRepository';
import ConversationRepository, { Conversation, Message } from './ConversationRepository';

// Track if database has been initialized
let isDbInitialized = false;

// Initialize the database
export const initializeDatabase = async (): Promise<void> => {
  if (isDbInitialized) {
    console.log('Database already initialized, skipping initialization');
    return;
  }

  try {
    const dbService = DatabaseService.getInstance();
    await dbService.initializeDatabase();
    isDbInitialized = true;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Export all repositories
export {
  DatabaseService,
  UserRepository,
  TaskRepository,
  CalendarEventRepository,
  GoalRepository,
  ConversationRepository
};

// Export all interfaces
export type {
  User,
  Task,
  TaskPriority,
  TaskStatus,
  CalendarEvent,
  Goal,
  Conversation,
  Message
};

// Create a class that provides access to all repositories
export class DatabaseRepositories {
  private static instance: DatabaseRepositories;
  
  public readonly userRepository: UserRepository;
  public readonly taskRepository: TaskRepository;
  public readonly calendarEventRepository: CalendarEventRepository;
  public readonly goalRepository: GoalRepository;
  public readonly conversationRepository: ConversationRepository;

  private constructor() {
    this.userRepository = new UserRepository();
    this.taskRepository = new TaskRepository();
    this.calendarEventRepository = new CalendarEventRepository();
    this.goalRepository = new GoalRepository();
    this.conversationRepository = new ConversationRepository();
  }

  public static getInstance(): DatabaseRepositories {
    if (!DatabaseRepositories.instance) {
      DatabaseRepositories.instance = new DatabaseRepositories();
    }
    return DatabaseRepositories.instance;
  }
}

export default DatabaseRepositories; 