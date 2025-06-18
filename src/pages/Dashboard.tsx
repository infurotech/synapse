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
import { formatText } from '../utils/nl2br';
import { useAgent, AgentStep } from '../agent/AgentService';
import AgentThinking from '../components/AgentThinking';
import { isPlatform } from '@ionic/react';
import './Dashboard.css';
import './Dashboard-thinking.css';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface Conversation {
  id: number;
  title: string;
  preview: string;
  time: string;
}

interface ChatMessage {
    id: number;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
    agentStep?: AgentStep;
    toolName?: string;
    isToolResult?: boolean;
  }

const Dashboard: React.FC = () => {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isFullPageChat, setIsFullPageChat] = useState(false);
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);

  const { loadedModel, models, loadModel } = useWllama();
  const { processQuery, stopProcessing, isProcessing, isSystemBusy, modelState } = useAgent();

  const [, setCurrentAgentResponse] = useState('');
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    { id: 1, text: 'Plan my day', icon: calendarOutline },
    { id: 2, text: 'Review upcoming tasks', icon: clipboardOutline },
    { id: 3, text: 'Give me insights', icon: bulbOutline },
    { id: 4, text: 'What should I focus on?', icon: sparklesOutline }
  ]);


  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const upcomingEvents = [
    { id: 1, title: 'Team Meeting', time: '10:00 AM', urgent: true },
    { id: 2, title: 'Lunch with Sarah', time: '1:00 PM', urgent: false },
    { id: 3, title: 'Doctor Appointment', time: '3:30 PM', urgent: true },
  ];

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
          } catch {
            // Model loading will be handled by the UI state
          }
        }
      }
    };

    loadChatModel();
  }, [models, loadedModel, loadModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    if (!modelState.loaded) {
      return;
    }

    if (isSystemBusy) {
      return;
    }

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
      
      await processQuery(
        currentUserMessage,
        (text: string) => {
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
        async () => {
          setStreamingMessageId(null);
        },
        (step: AgentStep) => {
          // Filter out tool_result steps from main thinking display as they create separate messages
          if (step.type !== 'tool_result') {
            setAgentSteps(prev => {
              // Deduplicate steps by ID to avoid showing duplicates during streaming
              const existingIds = new Set(prev.map(s => s.id));
              if (!existingIds.has(step.id)) {
                return [...prev, step];
              }
              return prev;
            });
          }
          
          if (step.type === 'tool_result') {
            const toolResultMessage = createToolResultMessage(step);
            setChatMessages(prev => [...prev, toolResultMessage]);
          }
        }
      );
      
    } catch {
      setStreamingMessageId(null);
      setCurrentAgentResponse('');
    }
  };


  const handleSuggestionClick = (suggestion: string) => {
    setChatMessage(suggestion);
    setIsRecording(false); // Reset recording state when a suggestion is clicked
  };

  const handleVoiceRecord = async () => {
    if (!isPlatform('android') && !isPlatform('ios')) {
      alert('Speech recognition is only available on mobile devices.');
      return;
    }

    if (!isRecording) {
      setIsRecording(true);

      const perm = await SpeechRecognition.requestPermissions();
      if (perm.speechRecognition !== 'granted') {
        alert('Microphone permission is required for speech recognition.');
        setIsRecording(false);
        return;
      }

      try {
        const result = await SpeechRecognition.start({
          language: 'en-US',
          maxResults: 1,
          prompt: 'Speak now',
          partialResults: false,
          popup: true,
        });

        if (result.matches && result.matches.length > 0) {
          setChatMessage(result.matches[0]);
        } else {
          alert('No speech detected. Please try again.');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert('Speech recognition error: ' + errorMessage);
      }
      setIsRecording(false);
    } else {
      setIsRecording(false);
      await SpeechRecognition.stop();
    }
  };

  const handleFileUpload = async () => {
    console.log('File upload clicked');
  };

  

  const handleHistoryClick = () => {
    setShowHistoryPopover(true);
  };

  const handleConversationSelect = (conversation: Conversation) => {
    console.log('Loading conversation:', conversation.title);
    setShowHistoryPopover(false);
    setIsFullPageChat(true);
    setIsRecording(false);
  };

  const handleStopGeneration = () => {
    stopProcessing();
    setStreamingMessageId(null);
  };

  const handleBackToChat = () => {
    setIsFullPageChat(false);
    setIsRecording(false);
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
              </div>
            </div>
            
            <div className="fullpage-messages">
              <div className="message-container">
                {chatMessages.length === 0 ? (
                    <>
                        <div className="ai-message">
                          <p>Hello, how can I help you today?</p>
                        </div>
                    </>
                ) : (
                    <>
                      {chatMessages.map((message) => (
                        <div key={message.id}>
                          {/* Show thinking panel for assistant messages when processing */}
                          {message.role === 'assistant' && message.id === streamingMessageId && agentSteps.length > 0 && (
                            <AgentThinking 
                              steps={agentSteps} 
                              isProcessing={isProcessing}
                              isCollapsible={true}
                            />
                          )}
                          
                          <div className={`${message.role}-message ${message.id === streamingMessageId ? 'streaming' : ''} ${message.isToolResult ? 'tool-result' : ''}`}>
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
                              <p>{formatText(message.content)}</p>
                            )}
                          </div>
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
                  placeholder="Ask me to create tasks, answer questions, or help with productivity.."
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

          {/* Four Icons Row */}
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

          {/* Quick Events List - Clean and Minimal */}
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

        {/* Sticky Chat at Footer */}
        <div className="chat-footer-sticky">
          <div className="chat-center-container">
            {/* AI Suggestions */}
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
                placeholder="How can I assist you today?"
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
                  <style>
                    "background-color :rgb(51, 113, 163);"
                  </style>
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

        {/* History Popover */}
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