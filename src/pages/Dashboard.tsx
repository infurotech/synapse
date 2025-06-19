import React, { useState, useEffect, useCallback } from 'react';
import DocumentUploader from '../components/DocumentUploader';
import { parseEventPrompt } from '../utils/parseEventPrompt';
import { CalendarHandler } from '../services/db/CalendarHandler';
import {
  IonContent,
  IonPage,
  IonIcon,
  IonButton,
  IonTextarea,
} from '@ionic/react';
import {
  micOutline,
  sendOutline,
  personOutline,
  timeOutline,
  sparklesOutline,
  calendarOutline,
  clipboardOutline,
  bulbOutline,
  checkboxOutline,
  flagOutline,
} from 'ionicons/icons';
import { motion } from 'framer-motion';
import './Dashboard.css';
import { useConversation } from '../contexts/ConversationContext';
import RecentConversations from '../components/RecentConversations';
import { CalendarEvent } from '../services/db';

interface Suggestion {
  id: number;
  text: string;
  icon: string;
}

const Dashboard: React.FC = () => {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [chatMessage, setChatMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isFullPageChat, setIsFullPageChat] = useState(false);
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  
  const { 
    currentConversation, 
    selectConversation, 
    addConversation, 
    addMessageToConversation 
  } = useConversation();
  const [resetUploader, setResetUploader] = useState(0);
//   const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileContents, setFileContents] = useState<string[]>([]);

  const [suggestions] = useState<Suggestion[]>([
    { id: 1, text: 'Plan my day', icon: calendarOutline },
    { id: 2, text: 'Review upcoming tasks', icon: clipboardOutline },
    { id: 3, text: 'Give me insights', icon: bulbOutline },
    { id: 4, text: 'What should I focus on?', icon: sparklesOutline },
  ]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);

  const fetchEvents = useCallback(async () => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    console.log('Fetching events for date:', formattedDate);
    const handler = new CalendarHandler();
    const eventList = await handler.getEventsByDate(formattedDate);
    setUpcomingEvents(eventList); // Save to state
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  const handleSendMessage = async () => {
    if (chatMessage.trim() || attachedFiles.length > 0) {
      // Try to save event from prompt
      const saved = await handleSaveEventFromPrompt(chatMessage);
      if (saved) {
        alert('Event saved to calendar!');
      }

      // Convert files and fileContents to the new format
      const convertedFiles = attachedFiles.map((file, index) => ({
        name: file.name,
        content: fileContents[index] || undefined,
        url: undefined // For now, we're not storing file URLs
      }));

      // Check if we're in the full-page chat view (existing conversation)
      if (isFullPageChat && currentConversation) {
        // Add message to existing conversation
        addMessageToConversation(currentConversation.id, {
          content: chatMessage,
          sender: 'user',
          files: convertedFiles,
        });
        
        // Simulate AI response
        setTimeout(() => {
          addMessageToConversation(currentConversation.id, {
            content: `I'm processing your request about "${chatMessage}". Can you provide more details?`,
            sender: 'ai'
          });
        }, 1000);
      } else {
        // Create a new conversation when sending from the Dashboard's main input
        setIsFullPageChat(true);
        
        // Create a new conversation
        addConversation(`${chatMessage}`).then((newConversation) => {
          // Add the user's message to the new conversation
          addMessageToConversation(newConversation.id, {
            content: chatMessage,
            sender: 'user',
            files: convertedFiles,
          });
          
          // Simulate AI response (in a real app, this would be from your AI service)
          setTimeout(() => {
            addMessageToConversation(newConversation.id, {
              content: `I'm here to help with "${chatMessage}". What would you like to know?`,
              sender: 'ai'
            });
          }, 1000);
        });
        
        //   const userMessage: Message = {
        //     id: Date.now(),
        //     text: chatMessage.trim(),
        //     files: [...attachedFiles],
        //     fileContents: [],
        //     isUser: true,
        //     timestamp: new Date()
        //   };

        //   setMessages(prev => [...prev, userMessage]);

        //   if (fileContents.length > 0) {
        //     const systemMessage: Message = {
        //       id: Date.now() + 1,
        //       text: `System: User uploaded ${attachedFiles.length} file(s). Use this content when responding to user queries that is ${userMessage.text}:\n\n${fileContents.join('\n\n')}`,
        //       files: [],
        //       fileContents: [...fileContents],
        //       isUser: false,
        //       timestamp: new Date(),
        //       isSystemMessage: true
        //     };
        //     setMessages(prev => [...prev, systemMessage]);
        //   }

        //   setIsFullPageChat(true);
        setChatMessage('');
        setAttachedFiles([]);
        setFileContents([]);
        setResetUploader(prev => prev + 1);
        setIsRecording(false); // Reset recording state on new conversation
        }
    }
  };

  const handleSaveEventFromPrompt = async (prompt: string) => {
    try {
      // Parse the prompt
      const parsed = parseEventPrompt(prompt);

      if (!parsed || !parsed.title || !parsed.date || !parsed.startTime || !parsed.endTime) {
        // Not an event prompt, or missing required information
        return false;
      }

      // Format to ISO strings
      const start_time = `${parsed.date}T${parsed.startTime}`;
      const end_time = `${parsed.date}T${parsed.endTime}`;

      // Construct the event object
      const event: CalendarEvent = {
        title: parsed.title,
        description: parsed.description || '',
        start_time,
        end_time,
        location: parsed.location || '',
        created_at: new Date().toISOString(), // Assign an empty string
        updated_at: new Date().toISOString(), // Assign an empty string
      };
      // Use CalendarHandler to create the event
      const handler = new CalendarHandler();
      await handler.createEvent(event);
      await fetchEvents();
      return true;
    } catch (e) {
      console.error('Event save error:', e);
      return false;
    }
  };


  const handleSuggestionClick = (suggestion: string) => {
    setChatMessage(suggestion);
    setIsRecording(false); // Reset recording state when a suggestion is clicked
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    // Here you would implement voice recording functionality
  };

  const handleFileUpload = (file: File, formattedContent?: string) => {
    setAttachedFiles(prev => [...prev, file]);
    if (formattedContent) {
      setFileContents(prev => [...prev, formattedContent]);
    }
  };

  const handleFileRemove = (file: File) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== file.name || f.size !== file.size));
    setFileContents(prev => prev.filter((_, index) =>
      attachedFiles.findIndex(f => f.name === file.name && f.size === file.size) !== index
    ));
  };

  const handleHistoryClick = () => {
    setShowHistoryPopover(true);
  };

  const handleConversationSelect = (conversationId: string) => {
    // Select the conversation
    selectConversation(conversationId);
    setShowHistoryPopover(false);
    setIsFullPageChat(true);
    setIsRecording(false);
  };

  const handleBackToChat = () => {
    setIsFullPageChat(false);
    setIsRecording(false);
  };

  if (isFullPageChat && currentConversation) {
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
                <span>{currentConversation.title}</span>
              </div>
            </div>

            <div className="fullpage-messages">
              {currentConversation?.messages.map((message) => (
                <div key={message.id} className="message-container">
                  {message.files && message.files.length > 0 && (
                    <div className={`${message.sender === 'user' ? 'user-files' : 'ai-files'}`}>
                      {message.files?.map((file, index) => {
                        const fileName = file.name;
                        const maxLength = 20;
                        const displayName = fileName.length > maxLength 
                          ? fileName.substring(0, maxLength) + '...' 
                          : fileName;
                        return (
                          <span key={index} className="file-chip">
                            {displayName}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className={`${message.sender === 'user' ? 'user-message' : 'ai-message'}`}>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="fullpage-input-section">
              <div className="fullpage-chat-input">
                <IonTextarea
                  value={chatMessage}
                  onIonInput={(e) => setChatMessage(e.detail.value!)}
                  placeholder="Message Nexus..."
                  rows={1}
                  autoGrow={true}
                  className="fullpage-textarea"
                />
                <div className="fullpage-actions">
                  <IonButton
                    fill="clear"
                    className={`fullpage-action-btn voice-btn ${isRecording ? 'recording' : ''}`}
                    onClick={handleVoiceRecord}
                  >
                    <IonIcon icon={micOutline} slot="icon-only" />
                  </IonButton>

                  <DocumentUploader
                    onFileUpload={handleFileUpload}
                    onFileRemove={handleFileRemove}
                    resetTrigger={resetUploader}
                  />
                  <IonButton
                    fill="clear"
                    className={`fullpage-action-btn send-btn ${(chatMessage.trim() || attachedFiles.length > 0) ? 'active' : 'inactive'}`}
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() && attachedFiles.length === 0}
                  >
                    <IonIcon icon={sendOutline} slot="icon-only" />
                  </IonButton>
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
      <IonContent scrollY={true} className="dashboard-content">
        <div className="dashboard-container">
          {/* Enhanced Greeting Section - Bigger without time */}
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
                    <img src="logo-white.png" alt="Synapse Logo" style={{ width: '26px', height: '26px' }} />
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
                {upcomingEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    className={`event-simple-item `}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="event-time-simple">
                      <IonIcon icon={timeOutline} />
                      <span>
                        {new Date(event.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                    <span className="event-title-simple">{event.title}</span>
                    {/* {event.urgent && <div className="urgent-dot" />} */}
                  </motion.div>
                ))}

              </div>
            </motion.div>
          )}
        </div>

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

            <div className="chat-input-section" style={{ position: 'relative' }}>
              <IonTextarea
                value={chatMessage}
                onIonInput={(e) => setChatMessage(e.detail.value!)}
                placeholder="How can I assist you today?"
                rows={3}
                className="chat-input-center"
                autoGrow={true}
                style={{ paddingTop: '40px' }}
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
                  <DocumentUploader
                    onFileUpload={handleFileUpload}
                    onFileRemove={handleFileRemove}
                    resetTrigger={resetUploader}
                  />
                  <IonButton
                    fill="clear"
                    className={`action-button send-btn ${(chatMessage.trim() || attachedFiles.length > 0) ? 'active' : 'inactive'}`}
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() && attachedFiles.length === 0}
                  >
                    <IonIcon icon={sendOutline} slot="icon-only" />
                  </IonButton>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* History Popover */}
        <RecentConversations
          isOpen={showHistoryPopover}
          onDidDismiss={() => setShowHistoryPopover(false)}
          onConversationSelect={handleConversationSelect}
        />
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
