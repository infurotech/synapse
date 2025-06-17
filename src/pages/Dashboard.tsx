import React, { useState, useEffect } from 'react';
import DocumentUploader from '../components/DocumentUploader';
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
  personOutline,
  timeOutline,
  chevronForwardOutline,
  sparklesOutline,
  calendarOutline,
  clipboardOutline,
  bulbOutline,
  checkboxOutline,
  flagOutline,
} from 'ionicons/icons';
import { motion } from 'framer-motion';
import { isPlatform } from '@ionic/react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import './Dashboard.css';

interface Message {
  id: number;
  text: string;
  files: File[];
  fileContents: string[];
  isUser: boolean;
  timestamp: Date;
  isSystemMessage?: boolean;
}

interface Conversation {
  id: number;
  title: string;
  preview: string;
  time: string;
}

interface Suggestion {
  id: number;
  text: string;
  icon: string;
}

const Dashboard: React.FC = () => {
  const [greeting, setGreeting] = useState('');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullPageChat, setIsFullPageChat] = useState(false);
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  const [resetUploader, setResetUploader] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileContents, setFileContents] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [conversations] = useState<Conversation[]>([
    { id: 1, title: 'Meeting preparation tips', preview: 'Can you help me prepare for tomorrow\'s...', time: '2h ago' },
    { id: 2, title: 'Travel itinerary planning', preview: 'I need help planning my trip to...', time: '1d ago' },
    { id: 3, title: 'Project deadline management', preview: 'How can I better manage my project...', time: '3d ago' },
    { id: 4, title: 'Email writing assistance', preview: 'Help me draft a professional email...', time: '1w ago' },
  ]);

  const [suggestions] = useState<Suggestion[]>([
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

  const upcomingEvents =  [
    { id: 1, title: 'Team Meeting', time: '10:00 AM', urgent: true },
    { id: 2, title: 'Lunch with Sarah', time: '1:00 PM', urgent: false },
    { id: 3, title: 'Doctor Appointment', time: '3:30 PM', urgent: true },
  ];

  const handleSendMessage = () => {
    if (chatMessage.trim() || attachedFiles.length > 0) {
      const userMessage: Message = {
        id: Date.now(),
        text: chatMessage.trim(),
        files: [...attachedFiles],
        fileContents: [],
        isUser: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      if (fileContents.length > 0) {
        const systemMessage: Message = {
          id: Date.now() + 1,
          text: `System: User uploaded ${attachedFiles.length} file(s). Use this content when responding to user queries that is ${userMessage.text}:\n\n${fileContents.join('\n\n')}`,
          files: [],
          fileContents: [...fileContents],
          isUser: false,
          timestamp: new Date(),
          isSystemMessage: true
        };
        setMessages(prev => [...prev, systemMessage]);
      }
      
      setIsFullPageChat(true);
      setChatMessage('');
      setAttachedFiles([]);
      setFileContents([]);
      setResetUploader(prev => prev + 1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setChatMessage(suggestion);
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

  const handleConversationSelect = (conversation: Conversation) => {
    console.log('Loading conversation:', conversation.title);
    setShowHistoryPopover(false);
    setIsFullPageChat(true);
  };

  const handleBackToChat = () => {
    setIsFullPageChat(false);
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
                <div className="user-message">
                  <p>Hello, how can I help you today?</p>
                </div>
                <div className="ai-message">
                  <p>I'm here to assist you with any questions or tasks you have. What would you like to work on?</p>
                </div>

                {messages.filter(message => !message.isSystemMessage).map((message) => (
                  <div key={message.id} className="message-wrapper">
                    {message.files.length > 0 && (
                      <div className={`${message.isUser ? 'user-files' : 'ai-files'}`}>
                        {message.files.map((file, index) => {
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
                    {message.text && (
                      <div className={`${message.isUser ? 'user-message' : 'ai-message'}`}>
                        <p>{message.text}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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