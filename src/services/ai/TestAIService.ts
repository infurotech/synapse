import { AICommandProcessor } from './';
import { initializeDatabase } from '../db';

/**
 * Test service to demonstrate AI command usage
 */
export class TestAIService {
  private commandProcessor: AICommandProcessor;
  private isDbInitialized: boolean = false;
  
  constructor() {
    this.commandProcessor = new AICommandProcessor();
  }

  /**
   * Run test commands to demonstrate the AI functionality
   * @param userId The user ID to use for the tests
   */
  public async runTestCommands(userId: number): Promise<void> {
    console.log("=== AI Command Processor Test ===");
    
    // Ensure database is initialized
    await this.ensureDbInitialized();
    
    // Test adding a task
    await this.testCommand(userId, "Add a task called 'Complete project proposal' due tomorrow with high priority");
    
    // Test adding a task with description
    await this.testCommand(userId, "Create a task 'Prepare presentation slides' with description 'Include quarterly results and future projections' due next week");
    
    // Test adding a task with minimal information
    await this.testCommand(userId, "Add task Buy groceries");
    
    // Test listing tasks
    await this.testCommand(userId, "Show me my tasks");
    
    // Test a command that should be recognized as a calendar event (not implemented yet)
    await this.testCommand(userId, "Schedule a meeting with the team tomorrow at 2pm");
    
    // Test a command that should be recognized as a goal (not implemented yet)
    await this.testCommand(userId, "Set a goal to complete the project by end of month");
    
    // Test an unknown command
    await this.testCommand(userId, "What's the weather like today?");
  }
  
  /**
   * Test a single command and log the result
   */
  private async testCommand(userId: number, command: string): Promise<void> {
    console.log(`\n> User: ${command}`);
    try {
      const response = await this.commandProcessor.processMessage(userId, command);
      console.log(`> AI: ${response.response}`);
      console.log(`> Success: ${response.success}`);
    } catch (error) {
      console.error("Error processing command:", error);
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDbInitialized(): Promise<void> {
    if (!this.isDbInitialized) {
      try {
        console.log("Initializing database for tests...");
        await initializeDatabase();
        this.isDbInitialized = true;
        console.log("Database initialized successfully");
      } catch (error) {
        console.error("Error initializing database:", error);
        throw new Error("Failed to initialize database for tests");
      }
    }
  }
}

export default TestAIService; 