/**
 * Database schema types for AI agents to use
 */



// Task schema
export interface User {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

// Calendar event schema
export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

// Goal schema
export interface Goal {
  id: number;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  due_date?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

// Conversation schema
export interface Conversation {
  id: number;
  title: string;
  last_message?: string;
  created_at: string;
  updated_at: string;
}

// Message schema
export interface Message {
  id: number;
  conversation_id: number;
  content: string;
  media_url?: string;
  is_user_message: number;
  created_at: string;
}

// Database table names
export enum TableName {
  USERS = 'users',
  TASKS = 'tasks',
  CALENDAR_EVENTS = 'calendar_events',
  GOALS = 'goals',
  CONVERSATIONS = 'conversations',
  MESSAGES = 'messages'
}

// Database schema map
export interface DatabaseSchema {
  [TableName.USERS]: User;
  [TableName.TASKS]: Task;
  [TableName.CALENDAR_EVENTS]: CalendarEvent;
  [TableName.GOALS]: Goal;
  [TableName.CONVERSATIONS]: Conversation;
  [TableName.MESSAGES]: Message;
}

// Create a namespace for all schema types
export const Schema = {
  TableName,
  // Add other non-type exports here if needed
};

export default Schema; 