import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import DatabaseService from './DatabaseService';
import SQLiteHelper from './SQLiteHelper';

export interface CalendarEvent {
  id?: number;
  user_id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  is_all_day?: number;
  recurrence?: string;
  created_at?: string;
  updated_at?: string;
}

export class CalendarEventRepository {
  private db: SQLiteDBConnection | null = null;

  constructor() {
    this.db = DatabaseService.getInstance().getConnection();
  }

  /**
   * Create a new calendar event
   */
  public async createEvent(event: CalendarEvent): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        `
          INSERT INTO calendar_events (
            user_id, title, description, start_time, end_time, 
            location, is_all_day, recurrence
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          event.user_id,
          event.title,
          event.description || null,
          event.start_time,
          event.end_time,
          event.location || null,
          event.is_all_day || 0,
          event.recurrence || null
        ]
      );

      return result.changes?.lastId || 0;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Get a calendar event by ID
   */
  public async getEventById(id: number): Promise<CalendarEvent | null> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<CalendarEvent>(
        this.db,
        'SELECT * FROM calendar_events WHERE id = ?',
        [id]
      );

      if (result.values && result.values.length > 0) {
        return result.values[0] as CalendarEvent;
      }

      return null;
    } catch (error) {
      console.error('Error getting calendar event by ID:', error);
      throw error;
    }
  }

  /**
   * Get all calendar events for a user
   */
  public async getEventsByUserId(userId: number): Promise<CalendarEvent[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<CalendarEvent>(
        this.db,
        'SELECT * FROM calendar_events WHERE user_id = ? ORDER BY start_time ASC',
        [userId]
      );

      return (result.values || []) as CalendarEvent[];
    } catch (error) {
      console.error('Error getting calendar events by user ID:', error);
      throw error;
    }
  }

  /**
   * Get calendar events for a specific date range
   */
  public async getEventsByDateRange(userId: number, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<CalendarEvent>(
        this.db,
        `
          SELECT * FROM calendar_events 
          WHERE user_id = ? AND (
            (date(start_time) BETWEEN date(?) AND date(?)) OR
            (date(end_time) BETWEEN date(?) AND date(?)) OR
            (date(start_time) <= date(?) AND date(end_time) >= date(?))
          )
          ORDER BY start_time ASC
        `,
        [userId, startDate, endDate, startDate, endDate, startDate, endDate] 
      );

      return (result.values || []) as CalendarEvent[];
    } catch (error) {
      console.error('Error getting calendar events by date range:', error);
      throw error;
    }
  }

  /**
   * Get calendar events for a specific date
   */
  public async getEventsByDate(userId: number, date: string): Promise<CalendarEvent[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<CalendarEvent>(
        this.db,
        `
          SELECT * FROM calendar_events 
          WHERE user_id = ? AND (
            date(start_time) = date(?) OR
            date(end_time) = date(?) OR
            (date(start_time) < date(?) AND date(end_time) > date(?))
          )
          ORDER BY start_time ASC
        `,
        [userId, date, date, date, date]
      );

      return (result.values || []) as CalendarEvent[];
    } catch (error) {
      console.error('Error getting calendar events by date:', error);
      throw error;
    }
  }

  /**
   * Get upcoming calendar events
   */
  public async getUpcomingEvents(userId: number, limit: number = 5): Promise<CalendarEvent[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const now = new Date().toISOString();
      const result = await SQLiteHelper.query<CalendarEvent>(
        this.db,
        `
          SELECT * FROM calendar_events 
          WHERE user_id = ? AND datetime(start_time) > datetime(?)
          ORDER BY start_time ASC
          LIMIT ?
        `,
        [userId, now, limit]
      );

      return (result.values || []) as CalendarEvent[];
    } catch (error) {
      console.error('Error getting upcoming calendar events:', error);
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  public async updateEvent(event: CalendarEvent): Promise<boolean> {
    if (!this.db || !event.id) {
      throw new Error('Database connection not established or invalid event ID');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        `
          UPDATE calendar_events 
          SET title = ?, 
              description = ?, 
              start_time = ?, 
              end_time = ?, 
              location = ?,
              is_all_day = ?,
              recurrence = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `,
        [
          event.title,
          event.description || null,
          event.start_time,
          event.end_time,
          event.location || null,
          event.is_all_day || 0,
          event.recurrence || null,
          event.id,
          event.user_id
        ]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  public async deleteEvent(id: number, userId: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        'DELETE FROM calendar_events WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }
}

export default CalendarEventRepository; 