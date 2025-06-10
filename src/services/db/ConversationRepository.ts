import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import DatabaseService from './DatabaseService';
import SQLiteHelper from './SQLiteHelper';

export interface Message {
  id?: number;
  conversation_id: number;
  content: string;
  media_url?: string;
  is_user_message: boolean;
  created_at?: string;
}

export interface Conversation {
  id?: number;
  user_id: number;
  title: string;
  last_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export class ConversationRepository {
  private db: SQLiteDBConnection | null = null;

  constructor() {
    this.db = DatabaseService.getInstance().getConnection();
  }

  /**
   * Create a new conversation
   */
  public async createConversation(conversation: Conversation): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        `
          INSERT INTO conversations (
            user_id, title, last_message
          )
          VALUES (?, ?, ?)
        `,
        [
          conversation.user_id,
          conversation.title,
          conversation.last_message || null
        ]
      );

      return result.changes?.lastId || 0;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Get a conversation by ID
   */
  public async getConversationById(id: number): Promise<Conversation | null> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<Conversation>(
        this.db,
        'SELECT * FROM conversations WHERE id = ?',
        [id]
      );

      if (result.values && result.values.length > 0) {
        return result.values[0] as Conversation;
      }

      return null;
    } catch (error) {
      console.error('Error getting conversation by ID:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  public async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<Conversation>(
        this.db,
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
        [userId]
      );

      return (result.values || []) as Conversation[];
    } catch (error) {
      console.error('Error getting conversations by user ID:', error);
      throw error;
    }
  }

  /**
   * Update a conversation
   */
  public async updateConversation(conversation: Conversation): Promise<boolean> {
    if (!this.db || !conversation.id) {
      throw new Error('Database connection not established or invalid conversation ID');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        `
          UPDATE conversations 
          SET title = ?,
              last_message = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `,
        [
          conversation.title,
          conversation.last_message || null,
          conversation.id,
          conversation.user_id
        ]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  /**
   * Update last message in a conversation
   */
  public async updateLastMessage(conversationId: number, lastMessage: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        `
          UPDATE conversations 
          SET last_message = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [lastMessage, conversationId]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error updating last message:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   */
  public async deleteConversation(id: number, userId: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Begin transaction
      await this.db.execute('BEGIN TRANSACTION');

      // Delete all messages in the conversation
      await SQLiteHelper.run(
        this.db,
        'DELETE FROM messages WHERE conversation_id = ?',
        [id]
      );

      // Delete the conversation
      const result = await SQLiteHelper.run(
        this.db,
        'DELETE FROM conversations WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      // Commit transaction
      await this.db.execute('COMMIT');

      return result.changes?.changes === 1;
    } catch (error) {
      // Rollback transaction on error
      await this.db.execute('ROLLBACK');
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   */
  public async addMessage(message: Message): Promise<number> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      // Begin transaction
      await this.db.execute('BEGIN TRANSACTION');

      // Add the message
      const result = await SQLiteHelper.run(
        this.db,
        `
          INSERT INTO messages (
            conversation_id, content, media_url, is_user_message
          )
          VALUES (?, ?, ?, ?)
        `,
        [
          message.conversation_id,
          message.content,
          message.media_url || null,
          message.is_user_message ? 1 : 0
        ]
      );

      // Update the conversation's last message and updated_at timestamp
      await this.updateLastMessage(message.conversation_id, message.content);

      // Commit transaction
      await this.db.execute('COMMIT');

      return result.changes?.lastId || 0;
    } catch (error) {
      // Rollback transaction on error
      await this.db.execute('ROLLBACK');
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation
   */
  public async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<Message>(
        this.db,
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId]
      );

      return (result.values || []).map(message => ({
        ...message,
        is_user_message: Boolean(message.is_user_message)
      }));
    } catch (error) {
      console.error('Error getting messages by conversation ID:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  public async deleteMessage(id: number): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.run(
        this.db,
        'DELETE FROM messages WHERE id = ?',
        [id]
      );

      return result.changes?.changes === 1;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Get recent conversations with preview of last message
   */
  public async getRecentConversations(userId: number, limit: number = 10): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<any>(
        this.db,
        `
          SELECT 
            c.id, 
            c.title, 
            c.updated_at,
            (
              SELECT content 
              FROM messages 
              WHERE conversation_id = c.id 
              ORDER BY created_at DESC 
              LIMIT 1
            ) as last_message,
            (
              SELECT is_user_message 
              FROM messages 
              WHERE conversation_id = c.id 
              ORDER BY created_at DESC 
              LIMIT 1
            ) as is_user_message
          FROM conversations c
          WHERE c.user_id = ?
          ORDER BY c.updated_at DESC
          LIMIT ?
        `,
        [userId, limit]
      );

      return (result.values || []) as any[];
    } catch (error) {
      console.error('Error getting recent conversations:', error);
      throw error;
    }
  }

  /**
   * Search conversations
   */
  public async searchConversations(userId: number, query: string): Promise<Conversation[]> {
    if (!this.db) {
      throw new Error('Database connection not established');
    }

    try {
      const result = await SQLiteHelper.query<Conversation>(
        this.db,
        `
          SELECT DISTINCT c.* 
          FROM conversations c
          LEFT JOIN messages m ON c.id = m.conversation_id
          WHERE c.user_id = ? 
          AND (
            c.title LIKE ? 
            OR m.content LIKE ?
          )
          ORDER BY c.updated_at DESC
        `,
        [userId, `%${query}%`, `%${query}%`]
      );

      return (result.values || []) as Conversation[];
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }
  }
}

export default ConversationRepository; 