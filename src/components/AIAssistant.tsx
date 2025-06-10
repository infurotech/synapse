import React, { useState, useRef, useEffect } from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  IonList
} from '@ionic/react';
import { 
  chatbubbleOutline, 
  checkmarkCircleOutline, 
  timeOutline 
} from 'ionicons/icons';
import { AICommandProcessor } from '../services/ai';
import { initializeDatabase } from '../services/db';
import './AIAssistant.css';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIAssistantProps {
  userId: number;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ userId }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hi there! I'm your AI assistant. I can help you manage tasks, calendar events, and goals. Try asking me to add a task!",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const commandProcessor = useRef(new AICommandProcessor());

  // Initialize database when component mounts
  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeDatabase();
        console.log('Database initialized in AIAssistant');
      } catch (error) {
        console.error('Error initializing database in AIAssistant:', error);
        
        // Add error message to chat
        setMessages(prev => [
          ...prev, 
          {
            text: "I'm having trouble connecting to the database. Some features might not work correctly.",
            isUser: false,
            timestamp: new Date()
          }
        ]);
      }
    };
    
    initDb();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Process the message with the AI command processor
      const response = await commandProcessor.current.processMessage(userId, userMessage.text);

      const aiResponse: Message = {
        text: response.response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: Message = {
        text: "Sorry, I encountered an error while processing your request. Please try again.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleSendMessage();
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <IonCard className={`ai-assistant ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <IonCardHeader className="assistant-header" onClick={toggleExpanded}>
        <IonCardTitle>AI Assistant</IonCardTitle>
        <IonIcon icon={isExpanded ? timeOutline : checkmarkCircleOutline} />
      </IonCardHeader>

      {isExpanded && (
        <>
          <IonCardContent className="messages-container">
            <IonList className="message-list">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}
                >
                  <div className="message-content">
                    <div className="message-text">{message.text}</div>
                    <div className="message-time">{formatTime(message.timestamp)}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </IonList>
          </IonCardContent>

          <div className="input-container">
            <IonItem lines="none">
              <IonInput
                value={inputMessage}
                placeholder="Ask me to add a task..."
                onIonInput={e => setInputMessage(e.detail.value!)}
                onKeyPress={handleKeyPress}
                disabled={isProcessing}
                className="message-input"
              />
              <IonButton
                fill="clear"
                onClick={handleSendMessage}
                disabled={isProcessing || !inputMessage.trim()}
              >
                {isProcessing ? <IonSpinner name="dots" /> : <IonIcon icon={chatbubbleOutline} />}
              </IonButton>
            </IonItem>
          </div>
        </>
      )}
    </IonCard>
  );
};

export default AIAssistant; 