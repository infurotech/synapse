import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import DatabaseService from './DatabaseService';
import { CalendarEvent } from './DatabaseSchema';
import SQLiteHelper from './SQLiteHelper';


// export interface CalendarEvent {
//   id?: number;
//   user_id: number;
//   title: string;
//   description?: string;
//   start_time: string;
//   end_time: string;
//   location?: string;
//   created_at?: string;
//   updated_at?: string;
// }

export class CalendarHandler {
 private db: SQLiteDBConnection | null = null;
 
  constructor() {
    this.db = DatabaseService.getInstance().getConnection();
  }
  public async createEvent(event: CalendarEvent): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }
 
    try {
      const result = await SQLiteHelper.run(
        this.db,
        `
          INSERT INTO calendar_events (
             title, description, start_time, end_time,
            location, created_at, updated_at
          )
          VALUES ( ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          event.title,
          event.description || null,
          event.start_time,
          event.end_time,
          event.location || null,
          event.created_at || null,
          event.updated_at || null
        ]
      );
 
      return result.changes?.lastId || 0;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  public async getEventsByDate(date: string): Promise<CalendarEvent[]> {

    if (!this.db) {
      throw new Error('Database connection not established');
    }
 
    try {
      const result = await SQLiteHelper.query<CalendarEvent>(
        this.db,
        `
          SELECT * FROM calendar_events
          WHERE  (
            date(start_time) = date(?) OR
            date(end_time) = date(?) OR
            (date(start_time) < date(?) AND date(end_time) > date(?))
          )
          ORDER BY start_time ASC
        `,
        [date, date, date, date]
      );
      
      return (result.values || []) as CalendarEvent[];
    } catch (error) {
      console.error('Error getting calendar events by date:', error);
      throw error;
    }
  }

 public async getEventsForMonth(year: number, month: number): Promise<CalendarEvent[]> {
  if (!this.db) {
    throw new Error('Database connection not established');
  }

  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-31`;

  const result = await this.db.query(
    `SELECT * FROM calendar_events WHERE date(start_time) BETWEEN date(?) AND date(?)`,
    [start, end]
  );

  return result.values as CalendarEvent[];
}

}
export default CalendarHandler;
