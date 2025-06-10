import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardContent,
  IonIcon,
  IonButton,
  IonText,
  IonInput,
  IonItem,
  IonList,
  IonAvatar,
  IonTextarea,
  IonPopover,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/react';
import {
  micOutline,
  sendOutline,
  attachOutline,
  personOutline,
  flash,
  timeOutline,
  chevronForwardOutline,
  chatbubbleOutline,
  sparklesOutline,
  calendarOutline,
  clipboardOutline,
  bulbOutline,
  timeSharp,
  checkboxOutline,
  flagOutline,
} from 'ionicons/icons';
import { motion } from 'framer-motion';
import { isPlatform } from '@ionic/react';
import { Keyboard } from '@capacitor/keyboard';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import './Dashboard.css';

interface Message {
  type: 'user' | 'ai';
  content: string;
}

interface Conversation {
  id: number;
  title: string;
  preview: string;
  time: string;
}

interface AttachedFile {
  name: string;
  path: string;
  type: string;
  size?: number;
  preview?: string;
}

const Dashboard: React.FC = () => {
  const [greeting, setGreeting] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullPageChat, setIsFullPageChat] = useState(false);
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  const [isCompanyApplicationFlow, setIsCompanyApplicationFlow] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
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
    { id: 4, text: 'What should I focus on?', icon: sparklesOutline },
    { id: 5, text: 'Apply to a company', icon: flagOutline },
  ]);

  const inputRef = useRef<HTMLIonTextareaElement>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isPlatform('android') || isPlatform('ios')) {
      const showSub = Keyboard.addListener('keyboardWillShow', () => {
        setKeyboardOpen(true);
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardOpen(false);
      });
  
      return () => {
        showSub.then(sub => sub.remove());
        hideSub.then(sub => sub.remove());
      };
    }
  }, []);

  const upcomingEvents = [
    { id: 1, title: 'Team Meeting', time: '10:00 AM', urgent: true },
    { id: 2, title: 'Lunch with Sarah', time: '1:00 PM', urgent: false },
    { id: 3, title: 'Doctor Appointment', time: '3:30 PM', urgent: true },
  ];

  const handleSendMessage = () => {
    if (chatMessage.trim() || attachedFile) {
      const userMessage = chatMessage.trim();
      setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
      
      if (attachedFile) {
        setMessages(prev => [
          ...prev,
          { type: 'user', content: `Sent a file: ${attachedFile.name}` }
        ]);
        setAttachedFile(null);
      }
      
      if (isCompanyApplicationFlow) {
        const task = {
          id: Date.now().toString(),
          title: `Apply to ${userMessage}`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          priority: 'High',
          status: 'pending',
          type: 'company_application'
        };
        
        const savedTasks = localStorage.getItem('tasks');
        const tasks = savedTasks ? JSON.parse(savedTasks) : [];
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        setMessages(prev => [...prev, { 
          type: 'ai', 
          content: `I've created a task for applying to ${userMessage}. Good luck with your application!` 
        }]);
        
        setIsCompanyApplicationFlow(false);
      } else if (userMessage === 'Apply to a company') {
        setIsCompanyApplicationFlow(true);
        setMessages(prev => [...prev, { 
          type: 'ai', 
          content: 'Okay, so what company are you focusing upon?' 
        }]);
      }
      
      setChatMessage('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setChatMessage('');
    setIsFullPageChat(true);
    if (suggestion === 'Apply to a company') {
      setIsCompanyApplicationFlow(true);
      setMessages([{ 
        type: 'ai', 
        content: 'Okay, so what company are you focusing upon?' 
      }]);
    }
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
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (image.webPath) {
        const fileName = image.webPath.split('/').pop() || 'file';
        const fileType = fileName.split('.').pop()?.toLowerCase() || '';
        
        let preview = '';
        if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
          preview = image.webPath;
        } else {
          preview = getFileTypeIcon(fileType);
        }

        setAttachedFile({ 
          name: fileName,
          path: image.webPath,
          type: fileType,
          preview
        });
      }
    } catch (err) {
      console.error('Error picking file:', err);
    }
  };

  const getFileTypeIcon = (fileType: string): string => {
    switch (fileType) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'txt':
        return '📃';
      case 'zip':
      case 'rar':
        return '📦';
      default:
        return '📎';
    }
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

  const handleInputFocus = () => {
    setKeyboardOpen(true);
    if (!(isPlatform('android') || isPlatform('ios'))) {
      setTimeout(() => {
        inputRef.current?.getInputElement().then((el) => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }, 200);
    }
  };

  if (isFullPageChat) {
    return (
      <IonPage>
        <IonContent className="fullpage-chat-content">
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
            
            <div className="fullpage-messages-scrollable">
              {messages.map((message, index) => (
                <div key={index} className={`message-container ${message.type}`}>
                  <div className={`${message.type}-message`}>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={`fullpage-input-section ${keyboardOpen ? 'keyboard-open' : ''}`}>
              <div className="fullpage-chat-input">
                <IonTextarea
                   ref={inputRef}
                   onFocus={() => {
                     setKeyboardOpen(true);
                     setTimeout(() => {
                       inputRef.current?.getInputElement().then((el) => {
                         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                       });
                     }, 300);
                   }}
                   value={chatMessage}
                   onIonInput={(e) => setChatMessage(e.detail.value!)}
                  placeholder="Message Nexus..."
                  rows={1}
                  autoGrow={true}
                  className="fullpage-textarea"
                />
                {attachedFile && (
                  <div className="attached-file-chip">
                    {attachedFile.preview && (
                      <div className="file-preview">
                        {attachedFile.preview.startsWith('data:') || attachedFile.preview.startsWith('http') ? (
                          <img src={attachedFile.preview} alt={attachedFile.name} />
                        ) : (
                          <span className="file-icon">{attachedFile.preview}</span>
                        )}
                      </div>
                    )}
                    <div className="file-info">
                      <span className="file-name">{attachedFile.name}</span>
                      <span className="file-type">{attachedFile.type.toUpperCase()}</span>
                    </div>
                    <IonButton fill="clear" size="small" onClick={() => setAttachedFile(null)}>
                      Remove
                    </IonButton>
                  </div>
                )}
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
      <IonContent className="dashboard-content">
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