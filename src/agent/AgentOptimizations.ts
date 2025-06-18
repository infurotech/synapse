import { AGENT_INFERENCE_PARAMS } from '../config';

/**
 * Performance optimization utilities for the agent system
 */

// Fast response patterns that don't need full model processing
export const FAST_RESPONSE_PATTERNS = [
  { pattern: /^(hi|hello|hey)[\s!.]*$/i, response: "Hello! How can I help you today?" },
  { pattern: /^(thanks?|thank you)[\s!.]*$/i, response: "You're welcome! Anything else I can help with?" },
  { pattern: /^(bye|goodbye)[\s!.]*$/i, response: "Goodbye! Have a great day!" },
  { pattern: /^(yes|yeah|yep)[\s!.]*$/i, response: "Great! What would you like to do next?" },
  { pattern: /^(no|nope)[\s!.]*$/i, response: "No problem! Is there something else I can help you with?" },
];

// Query classification for optimization routing
export const classifyQuery = (input: string): 'fast' | 'tool' | 'complex' => {
  const normalized = input.toLowerCase().trim();
  
  // Fast responses for simple interactions
  if (FAST_RESPONSE_PATTERNS.some(p => p.pattern.test(normalized))) {
    return 'fast';
  }
  
  // Tool-based queries
  if (normalized.includes('create') && normalized.includes('task') ||
      normalized.includes('add') && normalized.includes('task') ||
      normalized.includes('new') && normalized.includes('task')) {
    return 'tool';
  }
  
  // Complex queries need full processing
  return 'complex';
};

// Get fast response if available
export const getFastResponse = (input: string): string | null => {
  const normalized = input.toLowerCase().trim();
  const match = FAST_RESPONSE_PATTERNS.find(p => p.pattern.test(normalized));
  return match ? match.response : null;
};

// Optimized inference parameters based on query type
export const getOptimizedParams = (queryType: 'fast' | 'tool' | 'complex') => {
  switch (queryType) {
    case 'fast':
      return {
        ...AGENT_INFERENCE_PARAMS,
        nPredict: 50, // Very short for fast responses
        temperature: 0.1,
      };
    case 'tool':
      return {
        ...AGENT_INFERENCE_PARAMS,
        nPredict: 100, // Short for tool calls
        temperature: 0.2,
      };
    case 'complex':
      return AGENT_INFERENCE_PARAMS;
    default:
      return AGENT_INFERENCE_PARAMS;
  }
};

// Debounced response formatter for better performance
export class ResponseFormatter {
  private lastFormatTime = 0;
  private readonly DEBOUNCE_MS = 50; // 50ms debounce
  
  shouldFormat(): boolean {
    const now = Date.now();
    if (now - this.lastFormatTime > this.DEBOUNCE_MS) {
      this.lastFormatTime = now;
      return true;
    }
    return false;
  }
}

// Memory optimization utilities
export const optimizeMemoryContext = (context: string, maxLength: number = 500): string => {
  if (context.length <= maxLength) return context;
  
  // Keep the most recent exchanges
  const lines = context.split('\n');
  let result = '';
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const newResult = lines[i] + '\n' + result;
    if (newResult.length > maxLength) break;
    result = newResult;
  }
  
  return result.trim();
};

// Tool execution optimization
export const shouldExecuteToolInParallel = (toolName: string): boolean => {
  // Some tools can be executed in parallel, others need sequential execution
  const parallelSafeTools = ['respondToUser', 'createTask'];
  return parallelSafeTools.includes(toolName);
};

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(operation: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }
  
  private recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const metrics = this.metrics.get(operation)!;
    metrics.push(duration);
    
    // Keep only last 10 measurements
    if (metrics.length > 10) {
      metrics.shift();
    }
  }
  
  getAverageTime(operation: string): number {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) return 0;
    
    return metrics.reduce((sum, time) => sum + time, 0) / metrics.length;
  }
  
  getMetrics(): Record<string, { avg: number, count: number }> {
    const result: Record<string, { avg: number, count: number }> = {};
    
    this.metrics.forEach((times, operation) => {
      result[operation] = {
        avg: this.getAverageTime(operation),
        count: times.length
      };
    });
    
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor(); 
