import { tools, Tool } from './tools';

/**
 * The ToolExecutor is responsible for finding and executing the correct tool
 * based on the agent's request.
 */

interface SchemaProperty {
  type?: string;
  enum?: unknown[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  description?: string;
}

interface Schema {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

export class ToolExecutor {
  private tools: Map<string, Tool>;
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor() {
    console.log('[ToolExecutor] Initializing ToolExecutor...');
    this.tools = new Map();
    
    // Register all available tools
    tools.forEach(tool => {
      console.log('[ToolExecutor] Registering tool:', tool.name);
      this.tools.set(tool.name, tool);
    });
    
    console.log('[ToolExecutor] ToolExecutor initialized with', this.tools.size, 'tools');
  }

  /**
   * Executes a specified tool with the given arguments.
   * @param toolName The name of the tool to execute.
   * @param args The arguments object for the tool.
   * @returns A promise that resolves with the result of the tool's execution.
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.log('[ToolExecutor] executeTool called:', {
      toolName,
      argsKeys: Object.keys(args),
      argsValues: this.sanitizeArgsForLogging(args)
    });

    const tool = this.tools.get(toolName);

    if (!tool) {
      console.error('[ToolExecutor] Tool not found:', toolName);
      console.log('[ToolExecutor] Available tools:', Array.from(this.tools.keys()));
      throw new Error(`Tool "${toolName}" not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`);
    }

    console.log('[ToolExecutor] Found tool:', tool.name, '- Description:', tool.description);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[ToolExecutor] Retry attempt ${attempt} for tool:`, toolName);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        }

        console.log('[ToolExecutor] Validating tool arguments against schema...');
        this.validateArgs(args, tool.schema);
        console.log('[ToolExecutor] Arguments validation passed');

        console.log('[ToolExecutor] Executing tool:', toolName);
        const startTime = Date.now();
        
        const result = await Promise.race([
          tool.execute(args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tool execution timeout')), 30000) // 30 second timeout
          )
        ]) as Record<string, unknown>;
        
        const executionTime = Date.now() - startTime;
        console.log('[ToolExecutor] Tool execution completed in', executionTime, 'ms');
        console.log('[ToolExecutor] Tool execution result keys:', Object.keys(result));

        return {
          success: true,
          executionTime,
          ...(result as Record<string, unknown>)
        } as Record<string, unknown>;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[ToolExecutor] Tool execution error (attempt ${attempt + 1}/${this.MAX_RETRIES + 1}):`, {
          tool: toolName,
          error: lastError.message,
          stack: lastError.stack
        });

        // Don't retry on validation errors or if it's the last attempt
        if (error instanceof ValidationError || attempt === this.MAX_RETRIES) {
          throw lastError;
        }
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript doesn't know that
    throw lastError || new Error('Unknown error occurred');
  }

  private sanitizeArgsForLogging(args: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      // Sanitize potentially sensitive fields
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = `${value.substring(0, 100)}... [TRUNCATED]`;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private validateArgs(args: Record<string, unknown>, schema: Record<string, unknown>): void {
    console.log('[ToolExecutor] validateArgs called with schema type:', schema.type);
    console.log('[ToolExecutor] Arguments to validate:', this.sanitizeArgsForLogging(args));
    console.log('[ToolExecutor] Schema properties:', Object.keys(schema.properties || {}));
    console.log('[ToolExecutor] Required fields:', schema.required);

    try {
      const typedSchema = schema as Schema;
      
      // Basic validation - check required fields
      if (typedSchema.required && Array.isArray(typedSchema.required)) {
        console.log('[ToolExecutor] Checking required fields...');
        
        for (const requiredField of typedSchema.required) {
          if (!(requiredField in args) || args[requiredField] === undefined || args[requiredField] === null) {
            console.error('[ToolExecutor] Missing required field:', requiredField);
            throw new ValidationError(`Missing required field: ${requiredField}`);
          }
          console.log('[ToolExecutor] Required field present:', requiredField);
        }
        
        console.log('[ToolExecutor] All required fields present');
      } else {
        console.log('[ToolExecutor] No required fields to validate');
      }

      // Type validation for properties
      if (typedSchema.properties && typeof typedSchema.properties === 'object') {
        console.log('[ToolExecutor] Validating property types...');
        
        for (const [fieldName, fieldValue] of Object.entries(args)) {
          const fieldSchema = typedSchema.properties[fieldName];
          
          if (!fieldSchema) {
            console.log('[ToolExecutor] Field not in schema (allowing):', fieldName);
            continue;
          }

          console.log('[ToolExecutor] Validating field:', fieldName, 'with type:', fieldSchema.type);

          if (fieldSchema.type) {
            this.validateFieldType(fieldName, fieldValue, fieldSchema);
          }

          // Enum validation
          if (fieldSchema.enum && Array.isArray(fieldSchema.enum)) {
            this.validateEnum(fieldName, fieldValue, fieldSchema.enum);
          }

          // Format validation
          if (fieldSchema.format) {
            this.validateFormat(fieldName, fieldValue, fieldSchema.format);
          }

          // String length validation
          if (fieldSchema.type === 'string' && typeof fieldValue === 'string') {
            this.validateStringLength(fieldName, fieldValue, fieldSchema);
          }

          // Number range validation
          if (fieldSchema.type === 'number' && typeof fieldValue === 'number') {
            this.validateNumberRange(fieldName, fieldValue, fieldSchema);
          }

          // Pattern validation
          if (fieldSchema.pattern && typeof fieldValue === 'string') {
            this.validatePattern(fieldName, fieldValue, fieldSchema.pattern);
          }
        }
        
        console.log('[ToolExecutor] All property type validations passed');
      } else {
        console.log('[ToolExecutor] No properties to validate');
      }

      console.log('[ToolExecutor] Arguments validation completed successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateFieldType(fieldName: string, fieldValue: unknown, fieldSchema: SchemaProperty): void {
    console.log('[ToolExecutor] Type check:', fieldName, '- expected:', fieldSchema.type, 'actual:', typeof fieldValue);

    const expectedType = fieldSchema.type;
    const actualType = typeof fieldValue;

    if (expectedType === 'string' && actualType !== 'string') {
      throw new ValidationError(`Field "${fieldName}" must be a string`);
    }
    
    if (expectedType === 'number' && actualType !== 'number') {
      throw new ValidationError(`Field "${fieldName}" must be a number`);
    }
    
    if (expectedType === 'boolean' && actualType !== 'boolean') {
      throw new ValidationError(`Field "${fieldName}" must be a boolean`);
    }

    if (expectedType === 'array' && !Array.isArray(fieldValue)) {
      throw new ValidationError(`Field "${fieldName}" must be an array`);
    }

    if (expectedType === 'object' && (actualType !== 'object' || fieldValue === null)) {
      throw new ValidationError(`Field "${fieldName}" must be an object`);
    }

    console.log('[ToolExecutor] Type validation passed for field:', fieldName);
  }

  private validateEnum(fieldName: string, fieldValue: unknown, enumValues: unknown[]): void {
    console.log('[ToolExecutor] Validating enum for field:', fieldName, 'allowed values:', enumValues);
    
    if (!enumValues.includes(fieldValue)) {
      throw new ValidationError(`Field "${fieldName}" must be one of: ${enumValues.join(', ')}`);
    }
    
    console.log('[ToolExecutor] Enum validation passed for field:', fieldName);
  }

  private validateFormat(fieldName: string, fieldValue: unknown, format: string): void {
    if (typeof fieldValue !== 'string') {
      throw new ValidationError(`Field "${fieldName}" must be a string for format validation`);
    }

    switch (format) {
      case 'date': {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fieldValue)) {
          throw new ValidationError(`Field "${fieldName}" must be in YYYY-MM-DD format`);
        }
        // Validate it's actually a valid date
        const date = new Date(fieldValue);
        if (isNaN(date.getTime())) {
          throw new ValidationError(`Field "${fieldName}" must be a valid date`);
        }
        break;
      }
      case 'datetime':
      case 'date-time': {
        // Support ISO datetime format for database compatibility
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        if (!isoDateRegex.test(fieldValue)) {
          throw new ValidationError(`Field "${fieldName}" must be in ISO datetime format (YYYY-MM-DDTHH:mm:ss.sssZ)`);
        }
        const datetime = new Date(fieldValue);
        if (isNaN(datetime.getTime())) {
          throw new ValidationError(`Field "${fieldName}" must be a valid datetime`);
        }
        break;
      }
      case 'time':
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(fieldValue)) {
          throw new ValidationError(`Field "${fieldName}" must be in HH:MM format (24-hour)`);
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue)) {
          throw new ValidationError(`Field "${fieldName}" must be a valid email address`);
        }
        break;
      default:
        console.log('[ToolExecutor] Unknown format:', format, 'for field:', fieldName);
    }
  }

  private validateStringLength(fieldName: string, fieldValue: string, fieldSchema: SchemaProperty): void {
    if (fieldSchema.minLength !== undefined && fieldValue.length < fieldSchema.minLength) {
      throw new ValidationError(`Field "${fieldName}" must be at least ${fieldSchema.minLength} characters long`);
    }
    
    if (fieldSchema.maxLength !== undefined && fieldValue.length > fieldSchema.maxLength) {
      throw new ValidationError(`Field "${fieldName}" must be no more than ${fieldSchema.maxLength} characters long`);
    }
  }

  private validateNumberRange(fieldName: string, fieldValue: number, fieldSchema: SchemaProperty): void {
    if (fieldSchema.minimum !== undefined && fieldValue < fieldSchema.minimum) {
      throw new ValidationError(`Field "${fieldName}" must be at least ${fieldSchema.minimum}`);
    }
    
    if (fieldSchema.maximum !== undefined && fieldValue > fieldSchema.maximum) {
      throw new ValidationError(`Field "${fieldName}" must be no more than ${fieldSchema.maximum}`);
    }
  }

  private validatePattern(fieldName: string, fieldValue: string, pattern: string): void {
    const regex = new RegExp(pattern);
    if (!regex.test(fieldValue)) {
      throw new ValidationError(`Field "${fieldName}" does not match the required pattern: ${pattern}`);
    }
  }

  getAvailableTools(): string[] {
    const toolNames = Array.from(this.tools.keys());
    console.log('[ToolExecutor] getAvailableTools called, returning:', toolNames);
    return toolNames;
  }

  getToolDescription(toolName: string): string | null {
    console.log('[ToolExecutor] getToolDescription called for:', toolName);
    
    const tool = this.tools.get(toolName);
    if (!tool) {
      console.log('[ToolExecutor] Tool not found for description:', toolName);
      return null;
    }
    
    console.log('[ToolExecutor] Returning description for', toolName, ':', tool.description);
    return tool.description;
  }

  getToolSchema(toolName: string): Record<string, unknown> | null {
    console.log('[ToolExecutor] getToolSchema called for:', toolName);
    
    const tool = this.tools.get(toolName);
    if (!tool) {
      console.log('[ToolExecutor] Tool not found for schema:', toolName);
      return null;
    }
    
    console.log('[ToolExecutor] Returning schema for', toolName, ':', tool.schema);
    return tool.schema;
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

