import { Tool } from './tools';
import { ToolExecutor } from './ToolExecutor';
import { MemoryManager } from './MemoryManager';

interface ToolPlan {
  id: string;
  goal: string;
  steps: PlannedStep[];
  dependencies: string[];
  estimatedComplexity: number;
  fallbackPlan?: ToolPlan;
}

interface PlannedStep {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  condition?: string;
  optional: boolean;
  retryCount: number;
  maxRetries: number;
  dependsOn?: string[];
}

interface ToolExecutionContext {
  planId: string;
  stepId: string;
  previousResults: Map<string, unknown>;
  environmentState: Record<string, unknown>;
  errorHistory: ExecutionError[];
  startTime: number;
}

interface ExecutionError {
  stepId: string;
  toolName: string;
  error: string;
  timestamp: Date;
  retryAttempt: number;
  resolved: boolean;
}

interface ToolMetrics {
  toolName: string;
  successRate: number;
  avgExecutionTime: number;
  totalExecutions: number;
  lastError?: string;
  lastSuccess?: Date;
  reliability: number;
}

export class AdvancedToolSystem {
  private toolExecutor: ToolExecutor;
  private memoryManager: MemoryManager;
  private activePlans: Map<string, ToolPlan> = new Map();
  private toolMetrics: Map<string, ToolMetrics> = new Map();
  private executionHistory: ExecutionError[] = [];
  
  // Configuration
  private readonly MAX_PLAN_DEPTH = 10;
  private readonly MAX_CONCURRENT_PLANS = 5;
  private readonly RELIABILITY_THRESHOLD = 0.8;
  private readonly EXECUTION_TIMEOUT = 30000; // 30 seconds
  
  constructor() {
    this.toolExecutor = new ToolExecutor();
    this.memoryManager = MemoryManager.getInstance();
    this.initializeToolMetrics();
  }

  /**
   * Create an execution plan for achieving a goal
   */
  public async createPlan(goal: string, availableTools: string[]): Promise<ToolPlan> {
    console.log(`[AdvancedToolSystem] Creating plan for goal: ${goal}`);
    
    const planId = this.generatePlanId();
    const steps = await this.generateSteps(goal, availableTools);
    const dependencies = this.analyzeDependencies(steps);
    const complexity = this.estimateComplexity(steps);
    
    const plan: ToolPlan = {
      id: planId,
      goal,
      steps,
      dependencies,
      estimatedComplexity: complexity,
      fallbackPlan: complexity > 7 ? await this.createFallbackPlan(goal, availableTools) : undefined
    };
    
    this.activePlans.set(planId, plan);
    
    console.log(`[AdvancedToolSystem] Created plan ${planId} with ${steps.length} steps`);
    return plan;
  }

  /**
   * Execute a plan with intelligent error handling and adaptation
   */
  public async executePlan(plan: ToolPlan): Promise<{ success: boolean; results: Map<string, unknown>; errors: ExecutionError[] }> {
    console.log(`[AdvancedToolSystem] Executing plan: ${plan.id}`);
    
    const context: ToolExecutionContext = {
      planId: plan.id,
      stepId: '',
      previousResults: new Map(),
      environmentState: {},
      errorHistory: [],
      startTime: Date.now()
    };
    
    // Check if we can execute this plan
    if (this.activePlans.size >= this.MAX_CONCURRENT_PLANS) {
      throw new Error('Maximum concurrent plans exceeded. Please wait for existing plans to complete.');
    }
    
    try {
      // Execute steps in dependency order
      const executionOrder = this.determineExecutionOrder(plan.steps);
      
      for (const step of executionOrder) {
        context.stepId = step.id;
        
        // Check dependencies
        if (!this.checkDependencies(step, context.previousResults)) {
          if (step.optional) {
            console.log(`[AdvancedToolSystem] Skipping optional step ${step.id} due to unmet dependencies`);
            continue;
          } else {
            throw new Error(`Dependencies not met for step ${step.id}`);
          }
        }
        
        // Execute step with retries
        const result = await this.executeStepWithRetries(step, context);
        context.previousResults.set(step.id, result);
        
        // Update memory with successful execution
        this.memoryManager.updateWorkingMemory(`plan_${plan.id}_step_${step.id}`, result);
      }
      
      const executionTime = Date.now() - context.startTime;
      console.log(`[AdvancedToolSystem] Plan ${plan.id} completed successfully in ${executionTime}ms`);
      
      return {
        success: true,
        results: context.previousResults,
        errors: context.errorHistory
      };
      
    } catch (error) {
      console.error(`[AdvancedToolSystem] Plan ${plan.id} failed:`, error);
      
      // Try fallback plan if available
      if (plan.fallbackPlan) {
        console.log(`[AdvancedToolSystem] Attempting fallback plan for ${plan.id}`);
        return await this.executePlan(plan.fallbackPlan);
      }
      
      return {
        success: false,
        results: context.previousResults,
        errors: context.errorHistory
      };
    } finally {
      this.activePlans.delete(plan.id);
    }
  }

  /**
   * Analyze tool usage patterns and suggest optimizations
   */
  public getToolOptimizationSuggestions(): Record<string, string[]> {
    const suggestions: Record<string, string[]> = {};
    
    for (const [toolName, metrics] of this.toolMetrics.entries()) {
      const toolSuggestions: string[] = [];
      
      if (metrics.reliability < this.RELIABILITY_THRESHOLD) {
        toolSuggestions.push(`Low reliability (${(metrics.reliability * 100).toFixed(1)}%) - consider error handling improvements`);
      }
      
      if (metrics.avgExecutionTime > 5000) {
        toolSuggestions.push(`High execution time (${metrics.avgExecutionTime}ms) - consider performance optimization`);
      }
      
      if (metrics.successRate < 0.9) {
        toolSuggestions.push(`Low success rate (${(metrics.successRate * 100).toFixed(1)}%) - review input validation`);
      }
      
      if (toolSuggestions.length > 0) {
        suggestions[toolName] = toolSuggestions;
      }
    }
    
    return suggestions;
  }

  /**
   * Get comprehensive tool metrics
   */
  public getToolMetrics(): Map<string, ToolMetrics> {
    return new Map(this.toolMetrics);
  }

  /**
   * Get system performance statistics
   */
  public getSystemStats(): Record<string, unknown> {
    const totalExecutions = Array.from(this.toolMetrics.values())
      .reduce((sum, metrics) => sum + metrics.totalExecutions, 0);
    
    const avgReliability = Array.from(this.toolMetrics.values())
      .reduce((sum, metrics) => sum + metrics.reliability, 0) / this.toolMetrics.size;
    
    return {
      totalTools: this.toolMetrics.size,
      totalExecutions,
      avgReliability: avgReliability || 0,
      activePlans: this.activePlans.size,
      recentErrors: this.executionHistory.slice(-10),
      memoryStats: this.memoryManager.getMemoryStats()
    };
  }

  // Private helper methods

  private async generateSteps(goal: string, availableTools: string[]): Promise<PlannedStep[]> {
    const steps: PlannedStep[] = [];
    
    // Simple goal-to-steps mapping (can be enhanced with LLM planning)
    const goalLower = goal.toLowerCase();
    
    if (goalLower.includes('create') && goalLower.includes('task')) {
      steps.push({
        id: this.generateStepId(),
        toolName: 'createTask',
        args: this.extractTaskArgs(goal),
        optional: false,
        retryCount: 0,
        maxRetries: 3
      });
    } else if (goalLower.includes('respond') || goalLower.includes('answer')) {
      steps.push({
        id: this.generateStepId(),
        toolName: 'respondToUser',
        args: { query: goal },
        optional: false,
        retryCount: 0,
        maxRetries: 2
      });
    } else {
      // Default: use respond tool for general queries
      steps.push({
        id: this.generateStepId(),
        toolName: 'respondToUser',
        args: { query: goal, context: 'No specific tool pattern matched' },
        optional: false,
        retryCount: 0,
        maxRetries: 2
      });
    }
    
    return steps;
  }

  private extractTaskArgs(goal: string): Record<string, unknown> {
    const args: Record<string, unknown> = {};
    
    // Extract title
    const titleMatch = goal.match(/(?:create|add|make)\s+(?:a\s+)?(?:task|todo)\s+(?:called\s+)?["']?([^"']+)["']?/i);
    if (titleMatch) {
      args.title = titleMatch[1].trim();
    } else {
      args.title = goal.replace(/create|add|make|task|todo/gi, '').trim();
    }
    
    // Extract priority
    if (goal.includes('high priority') || goal.includes('urgent') || goal.includes('important')) {
      args.priority = 'high';
    } else if (goal.includes('low priority') || goal.includes('later')) {
      args.priority = 'low';
    } else {
      args.priority = 'medium';
    }
    
    // Extract due date patterns
    const dateMatch = goal.match(/(?:by|due|before)\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|tomorrow|today|next week)/i);
    if (dateMatch) {
      args.due_date = this.parseDate(dateMatch[1]);
    }
    
    return args;
  }

  private parseDate(dateStr: string): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateStr.toLowerCase()) {
      case 'today':
        return today.toISOString().split('T')[0];
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      case 'next week':
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.toISOString().split('T')[0];
      default:
        // Try to parse as ISO date or convert MM/DD/YYYY
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateStr;
        } else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          const parts = dateStr.split('/');
          return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
        return today.toISOString().split('T')[0]; // Default to today
    }
  }

  private analyzeDependencies(steps: PlannedStep[]): string[] {
    const dependencies: string[] = [];
    
    // Simple dependency analysis
    for (const step of steps) {
      if (step.toolName === 'createTask') {
        dependencies.push('database');
      }
    }
    
    return dependencies;
  }

  private estimateComplexity(steps: PlannedStep[]): number {
    let complexity = 0;
    
    for (const step of steps) {
      // Base complexity per step
      complexity += 2;
      
      // Add complexity for tool type
      if (step.toolName === 'createTask') {
        complexity += 3; // Database operations are more complex
      }
      
      // Add complexity for retries
      complexity += step.maxRetries * 0.5;
      
      // Add complexity for dependencies
      if (step.dependsOn && step.dependsOn.length > 0) {
        complexity += step.dependsOn.length;
      }
    }
    
    return Math.min(complexity, 10); // Cap at 10
  }

  private async createFallbackPlan(goal: string, availableTools: string[]): Promise<ToolPlan> {
    // Create a simpler fallback plan
    const fallbackSteps: PlannedStep[] = [{
      id: this.generateStepId(),
      toolName: 'respondToUser',
      args: { 
        query: goal,
        context: 'This is a fallback response due to complex plan failure'
      },
      optional: false,
      retryCount: 0,
      maxRetries: 1
    }];
    
    return {
      id: this.generatePlanId(),
      goal: `Fallback for: ${goal}`,
      steps: fallbackSteps,
      dependencies: [],
      estimatedComplexity: 1
    };
  }

  private determineExecutionOrder(steps: PlannedStep[]): PlannedStep[] {
    // Simple execution order (can be enhanced with proper dependency resolution)
    return [...steps].sort((a, b) => {
      // Execute non-optional steps first
      if (a.optional && !b.optional) return 1;
      if (!a.optional && b.optional) return -1;
      
      // Execute steps with fewer dependencies first
      const aDeps = a.dependsOn?.length || 0;
      const bDeps = b.dependsOn?.length || 0;
      return aDeps - bDeps;
    });
  }

  private checkDependencies(step: PlannedStep, previousResults: Map<string, unknown>): boolean {
    if (!step.dependsOn || step.dependsOn.length === 0) {
      return true;
    }
    
    return step.dependsOn.every(depId => previousResults.has(depId));
  }

  private async executeStepWithRetries(step: PlannedStep, context: ToolExecutionContext): Promise<unknown> {
    while (step.retryCount <= step.maxRetries) {
      try {
        const startTime = Date.now();
        
        // Execute with timeout
        const result = await Promise.race([
          this.toolExecutor.executeTool(step.toolName, step.args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tool execution timeout')), this.EXECUTION_TIMEOUT)
          )
        ]);
        
        const executionTime = Date.now() - startTime;
        this.updateToolMetrics(step.toolName, true, executionTime);
        
        console.log(`[AdvancedToolSystem] Step ${step.id} completed successfully`);
        return result;
        
      } catch (error) {
        step.retryCount++;
        const executionError: ExecutionError = {
          stepId: step.id,
          toolName: step.toolName,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          retryAttempt: step.retryCount,
          resolved: false
        };
        
        context.errorHistory.push(executionError);
        this.executionHistory.push(executionError);
        this.updateToolMetrics(step.toolName, false, 0);
        
        if (step.retryCount <= step.maxRetries) {
          console.log(`[AdvancedToolSystem] Step ${step.id} failed, retrying (${step.retryCount}/${step.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * step.retryCount)); // Exponential backoff
        } else {
          console.error(`[AdvancedToolSystem] Step ${step.id} failed after ${step.maxRetries} retries`);
          throw error;
        }
      }
    }
    
    throw new Error(`Step ${step.id} exceeded maximum retries`);
  }

  private updateToolMetrics(toolName: string, success: boolean, executionTime: number): void {
    const metrics = this.toolMetrics.get(toolName);
    if (!metrics) return;
    
    metrics.totalExecutions++;
    
    if (success) {
      metrics.successRate = ((metrics.successRate * (metrics.totalExecutions - 1)) + 1) / metrics.totalExecutions;
      metrics.avgExecutionTime = ((metrics.avgExecutionTime * (metrics.totalExecutions - 1)) + executionTime) / metrics.totalExecutions;
      metrics.lastSuccess = new Date();
    } else {
      metrics.successRate = (metrics.successRate * (metrics.totalExecutions - 1)) / metrics.totalExecutions;
    }
    
    // Update reliability score (combines success rate and consistency)
    metrics.reliability = metrics.successRate * (1 - Math.min(metrics.avgExecutionTime / 10000, 0.5));
  }

  private initializeToolMetrics(): void {
    const availableTools = this.toolExecutor.getAvailableTools();
    
    for (const toolName of availableTools) {
      this.toolMetrics.set(toolName, {
        toolName,
        successRate: 1.0,
        avgExecutionTime: 0,
        totalExecutions: 0,
        reliability: 1.0
      });
    }
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}