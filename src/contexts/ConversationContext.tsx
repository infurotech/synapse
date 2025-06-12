import React, { createContext, useState, useContext, useEffect } from 'react';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  time: string;
  messages: Message[];
  lastUpdated: Date;
}

interface ConversationContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  addConversation: (conversation: Omit<Conversation, 'id' | 'time' | 'lastUpdated'>) => string;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  selectConversation: (id: string) => void;
  addMessageToConversation: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  // Load conversations from localStorage on initial load
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        // Convert string dates back to Date objects
        const conversationsWithDates = parsed.map((conv: any) => ({
          ...conv,
          lastUpdated: new Date(conv.lastUpdated),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setConversations(conversationsWithDates);
      } catch (error) {
        console.error('Failed to parse saved conversations:', error);
      }
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

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

  const addConversation = (conversation: Omit<Conversation, 'id' | 'time' | 'lastUpdated'>): string => {
    const now = new Date();
    const id = `conv-${Date.now()}`;
    const newConversation: Conversation = {
      ...conversation,
      id,
      time: getTimeString(now),
      lastUpdated: now
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
    return id;
  };

  const updateConversation = (id: string, updates: Partial<Conversation>) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id 
          ? { 
              ...conv, 
              ...updates, 
              lastUpdated: new Date(),
              time: getTimeString(new Date())
            } 
          : conv
      )
    );
    
    if (currentConversation?.id === id) {
      setCurrentConversation(prev => 
        prev ? { ...prev, ...updates, lastUpdated: new Date() } : null
      );
    }
  };

  const selectConversation = (id: string) => {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
      setCurrentConversation(conversation);
    }
  };

  const addMessageToConversation = (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const now = new Date();
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: now
    };

    setConversations(prev => {
      const updatedConversations = prev.map(conv => {
        if (conv.id === conversationId) {
          const updatedMessages = [...conv.messages, newMessage];
          const preview = message.content.length > 40 
            ? `${message.content.substring(0, 40)}...` 
            : message.content;
          
          // If this is the first user message, generate a title
          let title = conv.title;
          if (conv.messages.length === 0 && message.sender === 'user') {
            title = generateTitle([newMessage]);
          }
          
          return {
            ...conv,
            messages: updatedMessages,
            preview,
            title,
            lastUpdated: now,
            time: getTimeString(now)
          };
        }
        return conv;
      });
      
      // Move the updated conversation to the top of the list
      const updatedConv = updatedConversations.find(c => c.id === conversationId);
      const otherConvs = updatedConversations.filter(c => c.id !== conversationId);
      
      return updatedConv ? [updatedConv, ...otherConvs] : updatedConversations;
    });
    
    // Update current conversation if it's the one we're adding to
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => {
        if (!prev) return null;
        
        const updatedMessages = [...prev.messages, newMessage];
        const preview = message.content.length > 40 
          ? `${message.content.substring(0, 40)}...` 
          : message.content;
        
        // If this is the first user message, generate a title
        let title = prev.title;
        if (prev.messages.length === 0 && message.sender === 'user') {
          title = generateTitle([newMessage]);
        }
        
        return {
          ...prev,
          messages: updatedMessages,
          preview,
          title,
          lastUpdated: now,
          time: getTimeString(now)
        };
      });
    }
  };

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