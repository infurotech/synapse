import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useDatabase } from './DatabaseContext';
import { DatabaseService } from '../services/db';

// UI Message interface - used in the React components
export interface Message {
  id: string;
  content: string;
  files?: Array<{
    name: string;
    content?: string;
    url?: string;
  }>;
  sender: 'user' | 'ai';
  timestamp: Date;
  mediaUrl?: string; // Optional media URL
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  time: string;
  messages: Message[];
  lastUpdated: Date;
  // Add any other fields from DB schema if needed for UI state
}

// Database Conversation interface - matches the database schema
interface DBConversation {
  id: number;
  title: string;
  last_message?: string;
  created_at: string;
  updated_at: string;
}

interface ConversationContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  addConversation: (title: string) => Promise<Conversation>;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  addMessageToConversation: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
  generateTitle: (messages: Message[]) => string;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isReady: isDbReady } = useDatabase();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // Load conversations from database on initial load or when db is ready
  useEffect(() => {
    const loadConversations = async () => {
      if (isDbReady) {
        try {
          const db = DatabaseService.getInstance();
          const dbConversations = await db.getConversations();
          
          // Transform DB conversations to UI conversations
          const uiConversations = dbConversations.map(dbConv => {
            // Transform messages from DB format to UI format
            const messages = dbConv.messages.map(dbMsg => ({
              id: dbMsg.id.toString(),
              content: dbMsg.content,
              sender: dbMsg.is_user_message === 1 ? 'user' : 'ai',
              timestamp: new Date(dbMsg.created_at),
              mediaUrl: dbMsg.media_url || undefined
            }));
            
            const lastUpdated = new Date(dbConv.updated_at);
            
            return {
              id: dbConv.id.toString(),
              title: dbConv.title,
              preview: dbConv.last_message || '',
              time: getTimeString(lastUpdated),
              messages: messages,
              lastUpdated: lastUpdated
            };
          });
          
          setConversations(uiConversations as Conversation[]);
          console.log('Conversations loaded from DB:', uiConversations.length);
        } catch (error) {
          console.error('Failed to load conversations from database:', error);
        }
      }
    };
    loadConversations();
  }, [isDbReady]);



  const generateTitle = (messages: Message[]): string => {
    if (messages.length === 0) return "New Conversation";
    
    // Use the first user message as the title, truncated to a reasonable length
    const firstUserMessage = messages.find(m => m.sender === 'user');
    if (!firstUserMessage) return "New Conversation";
    
    const title = firstUserMessage.content.trim();
    return title.length > 30 ? `${title.substring(0, 30)}...` : title;
  };

  const getTimeString = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const addConversation = useCallback(async (title: string) => {
    const now = new Date();
    const nowISOString = now.toISOString();
    
    try {
      // Add to database
      const db = DatabaseService.getInstance();
      
      // Get the default user ID from database
      const userId = await db.getDefaultUserId();
      
      const dbConversation = {
        user_id: userId,
        title,
        last_message: '',
        created_at: nowISOString,
        updated_at: nowISOString
      };
      
      const newConvId = await db.addConversation(dbConversation);
      
      // Create UI conversation object
      const newConversation: Conversation = {
        id: newConvId.toString(),
        title,
        preview: '',
        time: getTimeString(now),
        messages: [],
        lastUpdated: now
      };
      
      // Update state
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      return newConversation;
    } catch (error) {
      console.error('Failed to add conversation to database:', error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }, []);

  const updateConversation = useCallback(async (id: string, updates: Partial<Conversation>) => {
    try {
      const now = new Date();
      const nowISOString = now.toISOString();
      
      // Map UI updates to database updates
      const dbUpdates: Partial<DBConversation> = {
        updated_at: nowISOString
      };
      
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.preview) dbUpdates.last_message = updates.preview;
      
      // Update in database
      const db = DatabaseService.getInstance();
      await db.updateConversation(parseInt(id, 10), dbUpdates);
      
      // Update state with UI model updates
      const uiUpdates = {
        ...updates,
        lastUpdated: now,
        time: getTimeString(now)
      };
      
      setConversations(prev => prev.map(conv => {
        if (conv.id === id) {
          return { ...conv, ...uiUpdates };
        }
        return conv;
      }));

      // Update current conversation if it's the one being updated
      if (currentConversation?.id === id) {
        setCurrentConversation(prev => prev ? { ...prev, ...uiUpdates } : null);
      }
    } catch (error) {
      console.error('Failed to update conversation in database:', error);
    }
  }, [currentConversation]);

  const selectConversation = useCallback(async (id: string) => {
    try {
      // Find the conversation in state
      const conversation = conversations.find(c => c.id === id);
      if (!conversation) {
        console.error(`Conversation with id ${id} not found`);
        return;
      }
      
      // Get messages from database
      const db = DatabaseService.getInstance();
      const dbMessages = await db.getMessagesForConversation(parseInt(id));
      
      // Map database messages to UI messages with files
      const uiMessages = await Promise.all(dbMessages.map(async (dbMsg) => {
        // Get files for this message
        const messageFiles = await db.getMessageFiles(dbMsg.id);
        
        // Transform files to UI format
        const files = messageFiles.map(dbFile => ({
          name: dbFile.file_name,
          content: dbFile.file_content,
          url: dbFile.file_url
        }));
        
        return {
          id: dbMsg.id.toString(),
          content: dbMsg.content,
          sender: dbMsg.is_user_message === 1 ? 'user' : 'ai',
          timestamp: new Date(dbMsg.created_at),
          mediaUrl: dbMsg.media_url,
          files: files.length > 0 ? files : undefined
        };
      }));
      
      // Update the conversation with loaded messages
      const updatedConversation = {
        ...conversation,
        messages: uiMessages
      };
      
      // Set as current conversation
      setCurrentConversation(updatedConversation as Conversation);
      console.log(`Selected conversation ${id} with ${uiMessages.length} messages`);
    } catch (error) {
      console.error('Failed to load messages for conversation:', error);
    }
  }, [conversations]);

  const addMessageToConversation = useCallback(async (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const timestamp = new Date();
    const timestampISOString = timestamp.toISOString();
    
    try {
      // Add to database
      const db = DatabaseService.getInstance();
      
      // Create database message object
      const dbMessage = {
        conversation_id: parseInt(conversationId),
        content: message.content,
        media_url: message.mediaUrl,
        is_user_message: message.sender === 'user' ? 1 : 0,
        created_at: timestampISOString
      };
      
      // Add message to database
      const messageId = await db.addMessage(dbMessage);
      
      // Add files to database if they exist
      if (message.files && message.files.length > 0) {
        for (const file of message.files) {
          const dbFile = {
            message_id: messageId,
            file_name: file.name,
            file_content: file.content,
            file_url: file.url,
            created_at: timestampISOString
          };
          await db.addMessageFile(dbFile);
        }
      }
      
      // Create UI message object with files
      const newMessage: Message = {
        id: messageId.toString(),
        content: message.content,
        sender: message.sender,
        timestamp,
        mediaUrl: message.mediaUrl,
        files: message.files
      };
      
      // Find the conversation to update
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        console.error(`Conversation with id ${conversationId} not found`);
        return;
      }
      
      // Generate title if this is the first message and it's from the user
      let title = conversation.title;
      let dbTitle = title;
      
      if (conversation.messages.length === 0 && message.sender === 'user') {
        title = generateTitle([newMessage]);
        dbTitle = title;
      }
      
      // Update conversation in database with last message and possibly new title
      await db.updateConversation(parseInt(conversationId), {
        last_message: message.content,
        title: dbTitle,
        updated_at: timestampISOString
      });
      
      // Update conversations state
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          const updatedConv = {
            ...conv,
            title,
            messages: [...conv.messages, newMessage],
            preview: message.content,
            time: getTimeString(timestamp),
            lastUpdated: timestamp
          };
          return updatedConv;
        }
        return conv;
      }));

      // Update current conversation if it's the one being updated
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            title,
            messages: [...prev.messages, newMessage],
            preview: message.content,
            time: getTimeString(timestamp),
            lastUpdated: timestamp
          };
        });
      }
    } catch (error) {
      console.error('Failed to add message to database:', error);
    }
  }, [currentConversation, conversations]);

  const value = {
    conversations,
    currentConversation,
    addConversation,
    updateConversation,
    selectConversation,
    addMessageToConversation,
    generateTitle
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export default ConversationContext;