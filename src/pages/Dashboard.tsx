import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonPage,
  IonIcon,
  IonButton,
  IonTextarea,
  IonPopover,
} from '@ionic/react';
import {
  micOutline,
  sendOutline,
  attachOutline,
  personOutline,
  timeOutline,
  chevronForwardOutline,
  sparklesOutline,
  calendarOutline,
  clipboardOutline,
  bulbOutline,
  checkboxOutline,
  flagOutline,
  stopOutline,
} from 'ionicons/icons';
import { motion } from 'framer-motion';
import { useWllama } from '../utils/wllama.context';
import { nl2br } from '../utils/nl2br';
import { useAgent, AgentStep } from '../agent/AgentService';
import './Dashboard.css';

interface ChatMessage {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  agentStep?: AgentStep;
  toolName?: string;
  isToolResult?: boolean;
}

interface Conversation {
  id: number;
  title: string;
  preview: string;
  time: string;
}

const Dashboard: React.FC = () => {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chatMessage, setChatMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isFullPageChat, setIsFullPageChat] = useState(false);
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  
  const { loadedModel, models, loadModel } = useWllama();
  const { processQuery, stopProcessing, isProcessing, isSystemBusy, modelState } = useAgent();
  
  const [currentAgentResponse, setCurrentAgentResponse] = useState('');
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to build context from recent messages
  const buildConversationContext = (messages: ChatMessage[]): string | undefined => {
    if (messages.length <= 1) return undefined;
    
    // Get last 4 messages for context (excluding current user message)
    const recentMessages = messages.slice(-4);
    return recentMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
  };

  // Helper function to create tool result message
  const createToolResultMessage = (step: AgentStep): ChatMessage => {
    return {
      id: Date.now() + Math.random(),
      content: step.content,
      role: 'assistant',
      timestamp: new Date(),
      agentStep: step,
      toolName: step.toolName,
      isToolResult: true,
    };
  };

  const [conversations] = useState<Conversation[]>([
    { id: 1, title: 'Meeting preparation tips', preview: 'Can you help me prepare for tomorrow\'s...', time: '2h ago' },
    { id: 2, title: 'Travel itinerary planning', preview: 'I need help planning my trip to...', time: '1d ago' },
    { id: 3, title: 'Project deadline management', preview: 'How can I better manage my project...', time: '3d ago' },
    { id: 4, title: 'Email writing assistance', preview: 'Help me draft a professional email...', time: '1w ago' },
  ]);

  const [suggestions] = useState([
    { id: 1, text: 'Create a high priority task for my project', icon: clipboardOutline },
    { id: 2, text: 'Add a task to call the client tomorrow', icon: calendarOutline },
    { id: 3, text: 'Help me organize my day', icon: bulbOutline },
    { id: 4, text: 'What can you help me with?', icon: sparklesOutline },
  ]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadChatModel = async () => {
      if (!loadedModel && models.length > 0) {
        const chatModel = models.find(m => 
          m.url.toLowerCase().includes('qwen2-1.5b-instruct') && 
          !m.url.toLowerCase().includes('gte') &&
          m.cachedModel
        );
        
        if (chatModel) {
          try {
            await loadModel(chatModel);
            console.log('Chat model loaded successfully');
          } catch (error) {
            console.error('Failed to load chat model:', error);
          }
        }
      }
    };

    loadChatModel();
  }, [models, loadedModel, loadModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const upcomingEvents = [
    { id: 1, title: 'Team Meeting', time: '10:00 AM', urgent: true },
    { id: 2, title: 'Lunch with Sarah', time: '1:00 PM', urgent: false },
    { id: 3, title: 'Doctor Appointment', time: '3:30 PM', urgent: true },
  ];

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    if (!modelState.loaded) {
      console.log('No model loaded - please wait for model to load');
      return;
    }

    if (isSystemBusy) {
      console.log('System is busy - please wait');
      return;
    }

    console.log('🚀 [Dashboard] Starting agent-powered chat with message:', chatMessage);

    setIsFullPageChat(true);
    
    const userMessage: ChatMessage = {
      id: Date.now(),
      content: chatMessage,
      role: 'user',
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    const currentUserMessage = chatMessage;
    setChatMessage('');

    // Reset agent state for new conversation
    setCurrentAgentResponse('');
    setAgentSteps([]);

    try {
      const assistantMessageId = Date.now() + 1;
      const initialAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, initialAssistantMessage]);
      setStreamingMessageId(assistantMessageId);
      
      console.log('🤖 [Dashboard] Calling agent processQuery...');
      
      // Build context from previous messages
      const context = buildConversationContext([...chatMessages, userMessage]);
      
      await processQuery(
        currentUserMessage,
        (text: string) => {
          console.log('📝 [Dashboard] Agent response update, length:', text.length);
          setCurrentAgentResponse(text);
          setChatMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: text }
                : msg
            )
          );
        },
        (error: Error) => {
          console.error('❌ [Dashboard] Agent processing error:', error);
          setChatMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: `Error: ${error.message}` }
                : msg
            )
          );
          setStreamingMessageId(null);
          setCurrentAgentResponse('');
        },
        () => {
          console.log('✅ [Dashboard] Agent processing completed');
          setStreamingMessageId(null);
        },
        (step: AgentStep) => {
          console.log('🔧 [Dashboard] Agent step:', step.type, step.content?.substring(0, 50) + '...');
          setAgentSteps(prev => [...prev, step]);
          
          // Handle tool results by creating separate messages
          if (step.type === 'tool_result') {
            console.log('🛠️ [Dashboard] Tool result:', step.toolName, step.content);
            const toolResultMessage = createToolResultMessage(step);
            setChatMessages(prev => [...prev, toolResultMessage]);
          }
          
          // Handle thoughts and tool calls for debugging (optional)
          if (step.type === 'thought') {
            console.log('💭 [Dashboard] Agent thinking:', step.content);
          } else if (step.type === 'tool_call') {
            console.log('🔧 [Dashboard] Tool call:', step.toolName, step.toolArgs);
          }
        },
        context
      );
      
    } catch (error) {
      console.error('💥 [Dashboard] Chat completion error:', error);
      setStreamingMessageId(null);
      setCurrentAgentResponse('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setChatMessage(suggestion);
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    // Here you would implement voice recording functionality
  };

  const handleFileUpload = () => {
    // Here you would implement file upload functionality
    console.log('File upload clicked');
  };

  const handleHistoryClick = () => {
    setShowHistoryPopover(true);
  };

  const handleConversationSelect = (conversation: Conversation) => {
    console.log('Loading conversation:', conversation.title);
    setShowHistoryPopover(false);
    setIsFullPageChat(true);
  };

  const handleBackToChat = () => {
    setIsFullPageChat(false);
  };

  const handleStopGeneration = () => {
    console.log('🛑 [Dashboard] Stop generation requested');
    stopProcessing();
    setStreamingMessageId(null);
  };

  if (isFullPageChat) {
    return (
      <IonPage>
        <IonContent fullscreen className="fullpage-chat-content">
          <div className="fullpage-chat-container">
            <div className="fullpage-header">
              <IonButton 
                fill="clear" 
                className="back-button"
                onClick={handleBackToChat}
              >
                ← Back
              </IonButton>
              <div className="fullpage-title">
                <img src="logo-white.png" alt="Synapse Logo" style={{width: '20px', height: '20px'}} />
                <span>Synapse AI</span>
                {isProcessing && <span className="agent-status"> • Processing...</span>}
                {modelState.loaded && !isProcessing && (
                  <span className="model-status" style={{ 
                    fontSize: '0.7rem', 
                    opacity: 0.7, 
                    marginLeft: '8px',
                    color: 'var(--ion-color-success)' 
                  }}>
                    • Ready
                  </span>
                )}
              </div>
            </div>
            
            <div className="fullpage-messages">
              <div className="message-container">
                {chatMessages.length === 0 ? (
                  <>
                    <div className="ai-message">
                      <p>Hello! I'm your AI assistant powered by advanced reasoning and tool capabilities. How can I help you manage your tasks today?</p>
                    </div>
                  </>
                ) : (
                  <>
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`${message.role}-message ${message.id === streamingMessageId ? 'streaming' : ''} ${message.isToolResult ? 'tool-result' : ''}`}>
                        {message.isToolResult && (
                          <div className="tool-indicator">
                            <span>🔧 {message.toolName}</span>
                          </div>
                        )}
                        {message.role === 'assistant' && message.id === streamingMessageId && !message.content && isProcessing ? (
                          <div className="thinking-indicator">
                            <span>🤔 Thinking and using tools...</span>
                            <div className="typing-dots">
                              <div></div>
                              <div></div>
                              <div></div>
                            </div>
                          </div>
                        ) : (
                          <p>{message.role === 'assistant' ? nl2br(message.content) : message.content}</p>
                        )}
                      </div>
                    ))}
                    
                    {isProcessing && streamingMessageId === null && (
                      <div className="typing-indicator">
                        <span>AI is thinking with tools</span>
                        <div className="typing-dots">
                          <div></div>
                          <div></div>
                          <div></div>
                        </div>
                      </div>
                    )}

                    {/* Debug Panel - Development Only */}
                    {process.env.NODE_ENV === 'development' && agentSteps.length > 0 && (
                      <div className="agent-debug-panel" style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '12px',
                        margin: '8px 0',
                        fontSize: '0.8rem',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                          🔧 Agent Steps ({agentSteps.length}):
                        </div>
                        {agentSteps.slice(-3).map((step, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>
                            <span style={{ color: 'var(--ion-color-primary)' }}>
                              {step.type.toUpperCase()}:
                            </span> {step.content?.substring(0, 100)}
                            {step.content && step.content.length > 100 ? '...' : ''}
                          </div>
                        ))}
                        {currentAgentResponse && (
                          <div style={{ marginTop: '8px', fontSize: '0.7rem' }}>
                            <strong>Response Length:</strong> {currentAgentResponse.length} chars
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </div>
                    
            <div className="fullpage-input-section">
              <div className="fullpage-chat-input">
                <IonTextarea
                  value={chatMessage}
                  onIonInput={(e) => setChatMessage(e.detail.value!)}
                  placeholder="Ask me to create tasks, answer questions, or help with productivity..."
                  rows={1}
                  autoGrow={true}
                  className="fullpage-textarea"
                  disabled={isProcessing}
                />
                <div className="fullpage-actions">
                  <IonButton
                    fill="clear"
                    className={`fullpage-action-btn voice-btn ${isRecording ? 'recording' : ''}`}
                    onClick={handleVoiceRecord}
                  >
                    <IonIcon icon={micOutline} slot="icon-only" />
                  </IonButton>
                  
                  <IonButton
                    fill="clear"
                    className="fullpage-action-btn upload-btn"
                    onClick={handleFileUpload}
                  >
                    <IonIcon icon={attachOutline} slot="icon-only" />
                  </IonButton>
                  
                  {isProcessing ? (
                    <IonButton
                      fill="clear"
                      className={`fullpage-action-btn send-btn active ${streamingMessageId ? 'stop-streaming' : ''}`}
                      onClick={handleStopGeneration}
                    >
                      <IonIcon icon={stopOutline} slot="icon-only" />
                    </IonButton>
                  ) : (
                    <IonButton
                      fill="clear"
                      className={`fullpage-action-btn send-btn ${chatMessage.trim() ? 'active' : 'inactive'}`}
                      onClick={handleSendMessage}
                      disabled={!chatMessage.trim()}
                    >
                      <IonIcon icon={sendOutline} slot="icon-only" />
                    </IonButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="dashboard-content">
        <div className="dashboard-container">
          <motion.div
            className="greeting-section-top"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="greeting-card-top">
              <div className="greeting-content-top">
                <div className="greeting-info-top">
                  <motion.div
                    className="ai-pulse-indicator-top"
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <img src="logo-white.png" alt="Synapse Logo" style={{width: '26px', height: '26px'}} />
                  </motion.div>
                  <div className="greeting-text-content-top">
                    <h2 className="greeting-text-top">{greeting}!</h2>
                    <p className="date-text-top">
                      {currentTime.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="quick-icons-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="quick-icons-row">
              <IonButton fill="clear" routerLink="/tasks" className="quick-icon-item">
                <div className="quick-icon-content">
                  <IonIcon icon={checkboxOutline} />
                  <span>Tasks</span>
                </div>
              </IonButton>
              <IonButton fill="clear" routerLink="/calendar" className="quick-icon-item">
                <div className="quick-icon-content">
                  <IonIcon icon={calendarOutline} />
                  <span>Calendar</span>
                </div>
              </IonButton>
              <IonButton fill="clear" routerLink="/goals" className="quick-icon-item">
                <div className="quick-icon-content">
                  <IonIcon icon={flagOutline} />
                  <span>Goals</span>
                </div>
              </IonButton>
              <IonButton fill="clear" routerLink="/profile" className="quick-icon-item">
                <div className="quick-icon-content">
                  <IonIcon icon={personOutline} />
                  <span>Profile</span>
                </div>
              </IonButton>
            </div>
          </motion.div>

          {upcomingEvents.length > 0 && (
            <motion.div
              className="quick-events-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="events-simple-list">
                {upcomingEvents.slice(0, 2).map((event, index) => (
                  <motion.div
                    key={event.id}
                    className={`event-simple-item ${event.urgent ? 'urgent' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="event-time-simple">
                      <IonIcon icon={timeOutline} />
                      <span>{event.time}</span>
                    </div>
                    <span className="event-title-simple">{event.title}</span>
                    {event.urgent && <div className="urgent-dot" />}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="chat-footer-sticky">
          <div className="chat-center-container">
            <div className="ai-suggestions">
              {suggestions.map((suggestion) => (
                <motion.div
                  key={suggestion.id}
                  className="suggestion-chip"
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <IonIcon icon={suggestion.icon} />
                  <span>{suggestion.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="chat-input-section">
              <IonTextarea
                value={chatMessage}
                onIonInput={(e) => setChatMessage(e.detail.value!)}
                placeholder="Create tasks, ask questions, get insights..."
                rows={3}
                className="chat-input-center"
                autoGrow={true}
              />
              
              <div className="chat-actions-row">
                <div className="left-actions">
                  <IonButton
                    fill="clear"
                    className="action-button history-btn"
                    onClick={handleHistoryClick}
                    id="history-trigger"
                  >
                    <IonIcon icon={timeOutline} slot="icon-only" />
                  </IonButton>
                </div>

                <div className="middle-actions">
                  <IonButton
                    fill="clear"
                    className={`action-button voice-btn ${isRecording ? 'recording' : ''}`}
                    onClick={handleVoiceRecord}
                  >
                    <IonIcon icon={micOutline} slot="icon-only" />
                  </IonButton>
                </div>

                <div className="right-actions">
                  <IonButton
                    fill="clear"
                    className="action-button upload-btn"
                    onClick={handleFileUpload}
                  >
                    <IonIcon icon={attachOutline} slot="icon-only" />
                  </IonButton>
                  
                  {isProcessing ? (
                    <IonButton
                      fill="clear"
                      className="action-button send-btn active"
                      onClick={handleStopGeneration}
                    >
                      <IonIcon icon={stopOutline} slot="icon-only" />
                    </IonButton>
                  ) : (
                    <IonButton
                      fill="clear"
                      className={`action-button send-btn ${chatMessage.trim() ? 'active' : 'inactive'}`}
                      onClick={handleSendMessage}
                      disabled={!chatMessage.trim()}
                    >
                      <IonIcon icon={sendOutline} slot="icon-only" />
                    </IonButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <IonPopover
          isOpen={showHistoryPopover}
          onDidDismiss={() => setShowHistoryPopover(false)}
          trigger="history-trigger"
          className="history-popover"
        >
          <IonContent className="history-popover-content">
            <div className="history-popover-header">
              <h3>Recent Conversations</h3>
            </div>
            <div className="history-conversation-list">
              {conversations.map((conversation) => (
                <div 
                  key={conversation.id} 
                  className="history-conversation-item"
                  onClick={() => handleConversationSelect(conversation)}
                >
                  <div className="history-conversation-content">
                    <h4 className="history-conversation-title">{conversation.title}</h4>
                    <p className="history-conversation-preview">{conversation.preview}</p>
                  </div>
                  <div className="history-conversation-meta">
                    <span className="history-conversation-time">{conversation.time}</span>
                    <IonIcon icon={chevronForwardOutline} />
                  </div>
                </div>
              ))}
            </div>
          </IonContent>
        </IonPopover>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard; 