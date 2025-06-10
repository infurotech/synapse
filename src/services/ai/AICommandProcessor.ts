import { TaskAIService } from './';
import { initializeDatabase } from '../db';

/**
 * Types of commands the AI can process
 */
export enum CommandType {
  TASK = 'task',
  CALENDAR = 'calendar',
  GOAL = 'goal',
  UNKNOWN = 'unknown'
}

/**
 * Central processor for AI commands
 */
export class AICommandProcessor {
  private taskService: TaskAIService;
  private isDbInitialized: boolean = false;

  constructor() {
    this.taskService = new TaskAIService();
  }

  /**
   * Process a user message and route to the appropriate service
   * @param userId The user ID
   * @param message The user message
   * @returns Response message and success status
   */
  public async processMessage(userId: number, message: string): Promise<{ success: boolean; response: string }> {
    try {
      // Initialize database if not already initialized
      if (!this.isDbInitialized) {
        await this.initializeDb();
      }

      const commandType = this.determineCommandType(message);

      switch (commandType) {
        case CommandType.TASK:
          return await this.taskService.processMessage(userId, message);
        
        case CommandType.CALENDAR:
          // In the future, this will call a calendar service
          return {
            success: false,
            response: "Calendar commands are not yet implemented."
          };
        
        case CommandType.GOAL:
          // In the future, this will call a goal service
          return {
            success: false,
            response: "Goal commands are not yet implemented."
          };
        
        default:
          return {
            success: false,
            response: "I'm not sure what you want to do. Try asking me to add a task, create a calendar event, or set a goal."
          };
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        success: false,
        response: "Sorry, I couldn't process your request. Please try again."
      };
    }
  }

  /**
   * Initialize the database
   */
  private async initializeDb(): Promise<void> {
    try {
      await initializeDatabase();
      this.isDbInitialized = true;
      console.log('Database initialized for AI commands');
    } catch (error) {
      console.error('Error initializing database for AI commands:', error);
      throw new Error('Failed to initialize database');
    }
  }

  /**
   * Determine the type of command from the message
   */
  private determineCommandType(message: string): CommandType {
    const lowerMessage = message.toLowerCase();

    // Task-related keywords
    if (/\b(task|todo|to-do|to do)\b/i.test(lowerMessage)) {
      return CommandType.TASK;
    }

    // Calendar-related keywords
    if (/\b(calendar|event|meeting|appointment|schedule)\b/i.test(lowerMessage)) {
      return CommandType.CALENDAR;
    }

    // Goal-related keywords
    if (/\b(goal|target|objective|aim)\b/i.test(lowerMessage)) {
      return CommandType.GOAL;
    }

    return CommandType.UNKNOWN;
  }
}

export default AICommandProcessor; 