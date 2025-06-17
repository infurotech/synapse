import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Message } from './DatabaseSchema';
import { DatabaseAgent } from './DatabaseService';

export class MessageService {
  private static instance: MessageService;
  private dbAgent: DatabaseAgent;

  private constructor() {
    this.dbAgent = DatabaseAgent.getInstance();
  }

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  private get db(): SQLiteDBConnection | null {
    return this.dbAgent.getConnection();
  }

  /**
   * Create a new message
   */
  public async createMessage(messageData: {
    conversation_id: number;
    content: string;
    media_url?: string;
    is_user_message: boolean;
  }): Promise<Message> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `
      INSERT INTO messages (conversation_id, content, media_url, is_user_message)
      VALUES (?, ?, ?, ?)
    `;
    
    const values = [
      messageData.conversation_id,
      messageData.content,
      messageData.media_url || null,
      messageData.is_user_message ? 1 : 0
    ];

    const result = await this.db.run(query, values);
    
    if (result.changes && result.changes.lastId) {
      return await this.getMessageById(result.changes.lastId);
    } else {
      throw new Error('Failed to create message');
    }
  }

  /**
   * Get message by ID
   */
  public async getMessageById(id: number): Promise<Message> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    const query = `SELECT * FROM messages WHERE id = ?`;
    const result = await this.db.query(query, [id]);

    if (result.values && result.values.length > 0) {
      return result.values[0] as Message;
    } else {
      throw new Error(`Message with ID ${id} not found`);
    }
  }

  /**
   * Get messages by conversation ID
   */
  public async getMessagesByConversationId(conversationId: number, limit?: number): Promise<Message[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    let query = `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`;
    const values: (string | number)[] = [conversationId];

    if (limit) {
      query += ` LIMIT ?`;
      values.push(limit);
    }

    const result = await this.db.query(query, values);
    return (result.values || []) as Message[];
  }
}

export default MessageService; 