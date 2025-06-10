import { TaskRepository, Task, TaskPriority, TaskStatus, initializeDatabase } from '../db';

/**
 * Service to handle AI-based task operations
 */
export class TaskAIService {
  private taskRepository: TaskRepository;
  private isDbInitialized: boolean = false;

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  /**
   * Process a user message and extract task information
   * @param userId The user ID
   * @param message The user message
   * @returns Response message and success status
   */
  public async processMessage(userId: number, message: string): Promise<{ success: boolean; response: string }> {
    try {
      // Ensure database is initialized
      await this.ensureDbInitialized();

      // Check if the message is about adding a task
      if (this.isAddTaskMessage(message)) {
        const taskData = this.extractTaskData(message, userId);
        if (taskData) {
          const taskId = await this.taskRepository.createTask(taskData);
          return {
            success: true,
            response: `✅ Task "${taskData.title}" has been added successfully.`
          };
        }
      }

      // Check if the message is about listing tasks
      if (this.isListTasksMessage(message)) {
        const tasks = await this.taskRepository.getTasksByUserId(userId);
        if (tasks.length === 0) {
          return {
            success: true,
            response: "You don't have any tasks yet."
          };
        }

        const tasksList = tasks.map(task => 
          `• ${task.title}${task.due_date ? ` (due: ${new Date(task.due_date).toLocaleDateString()})` : ''} - ${task.status}`
        ).join('\n');

        return {
          success: true,
          response: `Here are your tasks:\n${tasksList}`
        };
      }

      // Default response if no specific intent is detected
      return {
        success: false,
        response: "I'm not sure what you want to do with tasks. Try saying something like 'add a task called Complete project report due tomorrow' or 'show me my tasks'."
      };
    } catch (error) {
      console.error('Error processing task message:', error);
      return {
        success: false,
        response: "Sorry, I couldn't process your request. Please try again."
      };
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDbInitialized(): Promise<void> {
    if (!this.isDbInitialized) {
      try {
        await initializeDatabase();
        this.isDbInitialized = true;
        console.log('Database initialized for TaskAIService');
      } catch (error) {
        console.error('Error initializing database for TaskAIService:', error);
        throw new Error('Failed to initialize database');
      }
    }
  }

  /**
   * Check if the message is about adding a task
   */
  private isAddTaskMessage(message: string): boolean {
    const addTaskPatterns = [
      /add (a )?task/i,
      /create (a )?task/i,
      /new task/i,
      /add (a )?to-?do/i,
      /create (a )?to-?do/i,
    ];

    return addTaskPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Check if the message is about listing tasks
   */
  private isListTasksMessage(message: string): boolean {
    const listTaskPatterns = [
      /show (my )?tasks/i,
      /list (my )?tasks/i,
      /what (are my|'s my) tasks/i,
      /show (my )?to-?dos/i,
      /list (my )?to-?dos/i,
    ];

    return listTaskPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Extract task data from a user message
   */
  private extractTaskData(message: string, userId: number): Task | null {
    // Extract title
    let title = '';
    
    // Different patterns to extract title
    const titlePatterns = [
      /task (?:called|named|titled) ["']?([^"']+)["']?/i,
      /add (?:a )?task ["']?([^"']+)["']?/i,
      /create (?:a )?task ["']?([^"']+)["']?/i,
      /add (?:a )?task:? (.+?)(?:with|due|by|having|description|$)/i,
      /create (?:a )?task:? (.+?)(?:with|due|by|having|description|$)/i,
    ];

    for (const pattern of titlePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        title = match[1].trim();
        break;
      }
    }

    // If no title found, try to use everything after "add task" or "create task"
    if (!title) {
      const simpleMatch = message.match(/(?:add|create)(?: a)? task:? (.+)/i);
      if (simpleMatch && simpleMatch[1]) {
        title = simpleMatch[1].trim();
      }
    }

    if (!title) {
      return null;
    }

    // Extract description
    let description = '';
    const descriptionMatch = message.match(/description:? ["']?([^"']+)["']?/i) || 
                            message.match(/with description:? ["']?([^"']+)["']?/i);
    if (descriptionMatch && descriptionMatch[1]) {
      description = descriptionMatch[1].trim();
    }

    // Extract due date
    let dueDate: string | undefined;
    const dueDatePatterns = [
      /due (?:on|by|date):? (.+?)(?:with|and|$)/i,
      /by (.+?)(?:with|and|$)/i,
      /due (.+?)(?:with|and|$)/i,
    ];

    for (const pattern of dueDatePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const dateText = match[1].trim();
        dueDate = this.parseDateFromText(dateText);
        if (dueDate) break;
      }
    }

    // Extract priority
    let priority: TaskPriority | undefined;
    if (/high priority|priority:? high/i.test(message)) {
      priority = 'high';
    } else if (/medium priority|priority:? medium/i.test(message)) {
      priority = 'medium';
    } else if (/low priority|priority:? low/i.test(message)) {
      priority = 'low';
    }

    // Create task object
    const task: Task = {
      user_id: userId,
      title,
      description: description || undefined,
      due_date: dueDate,
      priority: priority || 'medium',
      status: 'pending'
    };

    return task;
  }

  /**
   * Parse date from natural language text
   */
  private parseDateFromText(dateText: string): string | undefined {
    try {
      // Handle relative dates
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Common date formats
      if (/today/i.test(dateText)) {
        return today.toISOString();
      } else if (/tomorrow/i.test(dateText)) {
        return tomorrow.toISOString();
      } else if (/next week/i.test(dateText)) {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.toISOString();
      }
      
      // Try to parse as a date string
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      
      // If we couldn't parse the date, return undefined
      return undefined;
    } catch (error) {
      console.error('Error parsing date:', error);
      return undefined;
    }
  }
}

export default TaskAIService; 