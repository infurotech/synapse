import React, { useState, useEffect } from 'react';
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
} from 'ionicons/icons';
import { motion } from 'framer-motion';
import { isPlatform } from '@ionic/react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import './Dashboard.css';
import { useConversation } from '../contexts/ConversationContext';

interface Conversation {
  id: number;
  title: string;
  preview: string;
  time: string;
}

const Dashboard: React.FC = () => {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullPageChat, setIsFullPageChat] = useState(false);
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);

  
  const { 
    conversations, 
    currentConversation, 
    selectConversation, 
    addConversation, 
    addMessageToConversation 
  } = useConversation();

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

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      // Check if we're in the full-page chat view (existing conversation)
      if (isFullPageChat && currentConversation) {
        // Add message to existing conversation
        addMessageToConversation(currentConversation.id, {
          content: chatMessage,
          sender: 'user'
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
        
        const newConversationId = addConversation({
          title: "New Conversation",
          preview: "",
          messages: []
        });
        
        // Add the user's message to the new conversation
        addMessageToConversation(newConversationId, {
          content: chatMessage,
          sender: 'user'
        });
        
        // Simulate AI response (in a real app, this would be from your AI service)
        setTimeout(() => {
          addMessageToConversation(newConversationId, {
            content: `I'm here to help with "${chatMessage}". What would you like to know?`,
            sender: 'ai'
          });
        }, 1000);
      }
      

      setChatMessage('');
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

  const handleFileUpload = async () => {
    console.log('File upload clicked');
  };

  

  const handleHistoryClick = () => {
    setShowHistoryPopover(true);
  };

  const handleConversationSelect = (conversationId: string) => {
    // Select the conversation
    selectConversation(conversationId);

    setShowHistoryPopover(false);
    setIsFullPageChat(true);
  };

  const handleBackToChat = () => {
    setIsFullPageChat(false);
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
              {currentConversation.messages.map((message) => (
                <div key={message.id} className="message-container">
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
                  
                  <IonButton
                    fill="clear"
                    className="fullpage-action-btn upload-btn"
                    onClick={handleFileUpload}
                  >
                    <IonIcon icon={attachOutline} slot="icon-only" />
                  </IonButton>
                  
                  <IonButton
                    fill="clear"
                    className={`fullpage-action-btn send-btn ${chatMessage.trim() ? 'active' : 'inactive'}`}
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
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
      <IonContent fullscreen className="dashboard-content">
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
                  
                  <IonButton
                    fill="clear"
                    className={`action-button send-btn ${chatMessage.trim() ? 'active' : 'inactive'}`}
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
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
                  onClick={() => handleConversationSelect(conversation.id)}
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
