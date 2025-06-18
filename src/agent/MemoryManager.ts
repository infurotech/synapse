import { AgentStep } from './AgentService';

interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  importance?: number;
  tools_used?: string[];
  summary?: string;
}

interface MemorySnapshot {
  shortTerm: ContextMessage[];
  workingMemory: Record<string, unknown>;
  entityMemory: Map<string, EntityMemory>;
}


interface EntityMemory {
  name: string;
  type: 'person' | 'task' | 'goal' | 'concept' | 'tool';
  attributes: Record<string, unknown>;
  relationships: string[];
  lastMentioned: Date;
  frequency: number;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private shortTermMemory: ContextMessage[] = [];
  private workingMemory: Map<string, unknown> = new Map();
  private entityMemory: Map<string, EntityMemory> = new Map();
  
  // Configuration
  private readonly MAX_SHORT_TERM = 20; // Last 20 messages
  private readonly MAX_CONTEXT_WINDOW = 1024; // Reduced for short-term focus
  private readonly MEMORY_CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly IMPORTANCE_THRESHOLD = 0.7;
  
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.startMemoryCleanup();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Add a new message to short-term memory with automatic context management
   */
  public addMessage(message: ContextMessage): void {
    // Add to short-term memory
    this.shortTermMemory.push(message);
    
    // Extract entities and update entity memory
    this.extractAndUpdateEntities(message);
    
    // Calculate importance score
    message.importance = this.calculateImportance(message);
    
    // Manage memory size
    this.manageMemorySize();
    
    console.log(`[MemoryManager] Added message with importance: ${message.importance}`);
  }

  /**
   * Build context for the current conversation with intelligent selection
   */
  public buildContext(maxTokens: number = this.MAX_CONTEXT_WINDOW): string {
    const contextMessages = this.selectContextMessages(maxTokens);
    const entityContext = this.buildEntityContext();
    const workingContext = this.buildWorkingContext();
    
    let context = '';
    
    // Add entity context if available
    if (entityContext) {
      context += `\n## Relevant Context:\n${entityContext}\n`;
    }
    
    // Add working memory context
    if (workingContext) {
      context += `\n## Working Memory:\n${workingContext}\n`;
    }
    
    // Add conversation history
    if (contextMessages.length > 0) {
      context += '\n## Recent Conversation:\n';
      contextMessages.forEach(msg => {
        context += `${msg.role}: ${msg.content}\n`;
      });
    }
    
    return context.trim();
  }

  /**
   * Update working memory with key-value pairs
   */
  public updateWorkingMemory(key: string, value: unknown): void {
    const existing = this.workingMemory.get(key) as { accessCount: number } | undefined;
    this.workingMemory.set(key, {
      value,
      timestamp: new Date(),
      accessCount: (existing?.accessCount || 0) + 1
    });
    
    console.log(`[MemoryManager] Updated working memory: ${key}`);
  }

  /**
   * Get value from working memory
   */
  public getWorkingMemory(key: string): unknown {
    const entry = this.workingMemory.get(key) as { value: unknown; timestamp: Date; accessCount: number; lastAccessed?: Date };
    if (entry) {
      entry.lastAccessed = new Date();
      entry.accessCount++;
      return entry.value;
    }
    return undefined;
  }

  /**
   * Process agent steps to extract important information
   */
  public processAgentSteps(steps: AgentStep[]): void {
    for (const step of steps) {
      if (step.type === 'tool_call' && step.toolName) {
        // Store tool usage patterns
        this.updateWorkingMemory(`last_tool_${step.toolName}`, {
          args: step.toolArgs,
          timestamp: step.timestamp
        });
      }
      
      if (step.type === 'tool_result' && step.toolResult?.success) {
        // Store successful tool results
        this.updateWorkingMemory(`tool_result_${step.toolName}`, {
          result: step.toolResult,
          timestamp: step.timestamp
        });
      }
    }
  }

  /**
   * Create a memory snapshot for current session persistence
   */
  public createSnapshot(): MemorySnapshot {
    return {
      shortTerm: [...this.shortTermMemory],
      workingMemory: Object.fromEntries(this.workingMemory),
      entityMemory: this.entityMemory
    };
  }

  /**
   * Restore from memory snapshot for current session
   */
  public restoreFromSnapshot(snapshot: MemorySnapshot): void {
    this.shortTermMemory = snapshot.shortTerm || [];
    this.workingMemory = new Map(Object.entries(snapshot.workingMemory || {}));
    this.entityMemory = snapshot.entityMemory || new Map();
    
    console.log('[MemoryManager] Restored from snapshot');
  }

  /**
   * Clear all memory (useful for starting fresh conversations)
   */
  public clearMemory(): void {
    this.shortTermMemory = [];
    this.workingMemory.clear();
    this.entityMemory.clear();
    console.log('[MemoryManager] All memory cleared');
  }

  /**
   * Get memory statistics for monitoring
   */
  public getMemoryStats(): Record<string, unknown> {
    return {
      shortTermMessages: this.shortTermMemory.length,
      workingMemoryEntries: this.workingMemory.size,
      entityMemoryEntries: this.entityMemory.size,
      memoryUsageKB: this.estimateMemoryUsage(),
      lastCleanup: this.cleanupTimer ? 'Active' : 'Inactive'
    };
  }

  // Private helper methods

  private selectContextMessages(maxTokens: number): ContextMessage[] {
    const selected: ContextMessage[] = [];
    let tokenCount = 0;
    
    // Start with most recent and work backwards
    for (let i = this.shortTermMemory.length - 1; i >= 0; i--) {
      const message = this.shortTermMemory[i];
      const messageTokens = this.estimateTokens(message.content);
      
      if (tokenCount + messageTokens > maxTokens) break;
      
      selected.unshift(message);
      tokenCount += messageTokens;
    }
    
    return selected;
  }

  private buildEntityContext(): string {
    const recentEntities = Array.from(this.entityMemory.values())
      .filter(entity => entity.frequency > 2 || 
               Date.now() - entity.lastMentioned.getTime() < 3600000) // 1 hour
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
    
    if (recentEntities.length === 0) return '';
    
    return recentEntities.map(entity => 
      `${entity.name} (${entity.type}): ${JSON.stringify(entity.attributes)}`
    ).join('\n');
  }

  private buildWorkingContext(): string {
    interface WorkingMemoryEntry {
      value: unknown;
      timestamp: Date;
      accessCount: number;
    }
    
    const recentEntries = Array.from(this.workingMemory.entries())
      .filter(([, value]) => {
        const entry = value as WorkingMemoryEntry;
        return Date.now() - new Date(entry.timestamp).getTime() < 1800000; // 30 minutes
      })
      .sort(([, a], [, b]) => (b as WorkingMemoryEntry).accessCount - (a as WorkingMemoryEntry).accessCount)
      .slice(0, 5);
    
    if (recentEntries.length === 0) return '';
    
    return recentEntries.map(([key, value]) => 
      `${key}: ${JSON.stringify((value as WorkingMemoryEntry).value)}`
    ).join('\n');
  }

  private extractAndUpdateEntities(message: ContextMessage): void {
    // Simple entity extraction - can be enhanced with NLP
    const content = message.content.toLowerCase();
    
    // Extract task-related entities
    const taskMatches = content.match(/(?:task|todo|reminder|deadline|project)\s+([a-zA-Z0-9\s]+)/g);
    if (taskMatches) {
      taskMatches.forEach(match => {
        this.updateEntityMemory(match, 'task', { mentioned_in: message.content });
      });
    }
    
    // Extract priority keywords
    if (content.includes('urgent') || content.includes('important') || content.includes('high priority')) {
      this.updateEntityMemory('high_priority_tasks', 'concept', { frequency: 1 });
    }
  }

  private updateEntityMemory(name: string, type: EntityMemory['type'], attributes: Record<string, unknown>): void {
    const existing = this.entityMemory.get(name);
    
    if (existing) {
      existing.frequency++;
      existing.lastMentioned = new Date();
      existing.attributes = { ...existing.attributes, ...attributes };
    } else {
      this.entityMemory.set(name, {
        name,
        type,
        attributes,
        relationships: [],
        lastMentioned: new Date(),
        frequency: 1
      });
    }
  }

  private calculateImportance(message: ContextMessage): number {
    let importance = 0.5; // Base importance
    
    // Boost importance for tool usage
    if (message.tools_used && message.tools_used.length > 0) {
      importance += 0.3;
    }
    
    // Boost for certain keywords
    const content = message.content.toLowerCase();
    if (content.includes('important') || content.includes('urgent') || content.includes('critical')) {
      importance += 0.2;
    }
    
    // Boost for questions
    if (content.includes('?')) {
      importance += 0.1;
    }
    
    // Boost for errors or problems
    if (content.includes('error') || content.includes('problem') || content.includes('issue')) {
      importance += 0.2;
    }
    
    return Math.min(importance, 1.0);
  }

  private manageMemorySize(): void {
    // Trim short-term memory if too large
    if (this.shortTermMemory.length > this.MAX_SHORT_TERM) {
      // Simply remove oldest messages (no long-term archiving)
      const removedCount = this.shortTermMemory.length - this.MAX_SHORT_TERM;
      this.shortTermMemory.splice(0, removedCount);
      console.log(`[MemoryManager] Removed ${removedCount} old messages from short-term memory`);
    }
    
    // Clean up old working memory entries
    const oneHourAgo = Date.now() - 3600000;
    for (const [key, value] of this.workingMemory.entries()) {
      const entry = value as { timestamp: Date; accessCount: number };
      if (new Date(entry.timestamp).getTime() < oneHourAgo && entry.accessCount < 2) {
        this.workingMemory.delete(key);
      }
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  }

  private estimateMemoryUsage(): number {
    const shortTermSize = JSON.stringify(this.shortTermMemory).length;
    const workingMemorySize = JSON.stringify(Object.fromEntries(this.workingMemory)).length;
    const entityMemorySize = JSON.stringify(Object.fromEntries(this.entityMemory)).length;
    
    return Math.ceil((shortTermSize + workingMemorySize + entityMemorySize) / 1024);
  }

  private startMemoryCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.manageMemorySize();
      console.log('[MemoryManager] Periodic memory cleanup completed');
    }, this.MEMORY_CLEANUP_INTERVAL);
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.shortTermMemory = [];
    this.workingMemory.clear();
    this.entityMemory.clear();
    
    console.log('[MemoryManager] Disposed all resources');
  }
}