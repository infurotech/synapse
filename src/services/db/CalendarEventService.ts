import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { CalendarEvent } from './DatabaseSchema';
import { DatabaseAgent } from './DatabaseService';

export class CalendarEventService {
  private static instance: CalendarEventService;
  private dbAgent: DatabaseAgent;

  private constructor() {
    this.dbAgent = DatabaseAgent.getInstance();
  }

  public static getInstance(): CalendarEventService {
    if (!CalendarEventService.instance) {
      CalendarEventService.instance = new CalendarEventService();
    }
    return CalendarEventService.instance;
  }

  private get db(): SQLiteDBConnection | null {
    return this.dbAgent.getConnection();
  }

  /**
   * Create a new calendar event
   */
  public async createCalendarEvent(eventData: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
  }): Promise<CalendarEvent> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `
      INSERT INTO calendar_events (title, description, start_time, end_time, location)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const values = [
      eventData.title,
      eventData.description || null,
      eventData.start_time,
      eventData.end_time,
      eventData.location || null
    ];

    const result = await this.db.run(query, values);
    
    if (result.changes && result.changes.lastId) {
      return await this.getCalendarEventById(result.changes.lastId);
    } else {
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Get calendar event by ID
   */
  public async getCalendarEventById(id: number): Promise<CalendarEvent> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `SELECT * FROM calendar_events WHERE id = ?`;
    const result = await this.db.query(query, [id]);

    if (result.values && result.values.length > 0) {
      return result.values[0] as CalendarEvent;
    } else {
      throw new Error(`Calendar event with ID ${id} not found`);
    }
  }

  /**
   * Get all calendar events
   */
  public async getCalendarEvents(filters?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<CalendarEvent[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    let query = `SELECT * FROM calendar_events WHERE 1=1`;
    const values: (string | number)[] = [];

    if (filters?.start_date) {
      query += ` AND start_time >= ?`;
      values.push(filters.start_date);
    }

    if (filters?.end_date) {
      query += ` AND end_time <= ?`;
      values.push(filters.end_date);
    }

    query += ` ORDER BY start_time ASC`;

    if (filters?.limit) {
      query += ` LIMIT ?`;
      values.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET ?`;
      values.push(filters.offset);
    }

    const result = await this.db.query(query, values);
    return (result.values || []) as CalendarEvent[];
  }

  /**
   * Update a calendar event
   */
  public async updateCalendarEvent(id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const updateFields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.title !== undefined) {
      updateFields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.start_time !== undefined) {
      updateFields.push('start_time = ?');
      values.push(updates.start_time);
    }
    if (updates.end_time !== undefined) {
      updateFields.push('end_time = ?');
      values.push(updates.end_time);
    }
    if (updates.location !== undefined) {
      updateFields.push('location = ?');
      values.push(updates.location);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE calendar_events SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.db.run(query, values);

    return await this.getCalendarEventById(id);
  }

  /**
   * Delete a calendar event
   */
  public async deleteCalendarEvent(id: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `DELETE FROM calendar_events WHERE id = ?`;
    const result = await this.db.run(query, [id]);

    return (result.changes?.changes || 0) > 0;
  }
}

export default CalendarEventService; 