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
import { DatabaseService } from '../services/db';
import { Goal as DBGoal, Subgoal as DBSubgoal } from '../services/db/DatabaseSchema';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, text: "Hello, how can I help you today?", sender: 'ai' },
    { id: 2, text: "I'm here to assist you with any questions or tasks you have. What would you like to work on?", sender: 'ai' },
  ]);
  const [isRecording, setIsRecording] = useState(false);

  const [isFullPageChat, setIsFullPageChat] = useState(false);
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

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

  const generateMockSubgoals = (goalTitle: string): string[] => {
    const subgoals: string[] = [];
    const numSubgoals = Math.floor(Math.random() * 4) + 5; // 5 to 8 subgoals

    if (goalTitle.toLowerCase().includes('javascript')) {
      subgoals.push(
        'Learn JavaScript basics (variables, data types, operators)',
        'Understand control flow (if/else, loops, switch)',
        'Explore functions and scope',
        'Master arrays and objects',
        'Dive into DOM manipulation',
        'Practice asynchronous JavaScript (callbacks, promises, async/await)',
        'Understand ES6+ features (arrow functions, destructuring, classes)',
        'Build a small interactive project using JavaScript'
      );
    } else if (goalTitle.toLowerCase().includes('python')) {
      subgoals.push(
        'Install Python and set up development environment',
        'Learn Python syntax and basic data structures',
        'Understand control flow and functions',
        'Work with Python libraries (e.g., NumPy, Pandas)',
        'Practice object-oriented programming in Python',
        'Build a simple script or application',
        'Explore web development with Flask/Django (optional)'
      );
    } else if (goalTitle.toLowerCase().includes('react')) {
      subgoals.push(
        'Understand React components and JSX',
        'Learn about props and state',
        'Explore React Hooks (useState, useEffect)',
        'Practice component lifecycle methods',
        'Understand React Router for navigation',
        'Manage state with Context API or Redux',
        'Build a small React application'
      );
    } else {
      // Generic subgoals for other titles
      for (let i = 1; i <= numSubgoals; i++) {
        subgoals.push(`Subtask ${i} for ${goalTitle}`);
      }
    }
    return subgoals.slice(0, numSubgoals);
  };

  const upcomingEvents = [
    { id: 1, title: 'Team Meeting', time: '10:00 AM', urgent: true },
    { id: 2, title: 'Lunch with Sarah', time: '1:00 PM', urgent: false },
    { id: 3, title: 'Doctor Appointment', time: '3:30 PM', urgent: true },
  ];

  const handleSendMessage = async () => {
    if (chatMessage.trim()) {
      const userMessage: ChatMessage = { id: messages.length + 1, text: chatMessage, sender: 'user' };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setChatMessage('');

      // Check for goal creation intent
      const dbService = DatabaseService.getInstance();

      const simpleGoalRegex = /create a goal (for )?(.+)/i;
      const showGoalsRegex = /show my goals/i;
      const showGoalByIdRegex = /show goal (\d+)/i;
      const updateGoalRegex = /update goal (\d+) title (.+)/i;
      const updateSubgoalRegex = /update subgoal (\d+) completed (0|1)/i;
      const deleteGoalRegex = /delete goal (\d+)/i;
      const deleteSubgoalRegex = /delete subgoal (\d+)/i;

      let aiResponse = '';

      if (simpleGoalRegex.test(chatMessage)) {
        const goalTitle = chatMessage.match(simpleGoalRegex)![2].trim();
        try {
          const newGoal: Omit<DBGoal, 'id' | 'created_at' | 'updated_at'> = {
            title: goalTitle,
            description: `Goal related to ${goalTitle}`,
            target_value: 100,
            current_value: 0,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'Learning',
          };
          const goalId = await dbService.addGoal(newGoal);

          const mockSubgoals = generateMockSubgoals(goalTitle);
          for (const subTitle of mockSubgoals) {
            const newSubgoal: Omit<DBSubgoal, 'id' | 'created_at' | 'updated_at'> = {
              goal_id: goalId,
              title: subTitle,
              completed: 0,
            };
            await dbService.addSubgoal(newSubgoal);
          }
          aiResponse = `Goal "${goalTitle}" and its subgoals have been successfully added!`;
        } catch (error) {
          console.error('Error adding goal or subgoals:', error);
          aiResponse = "Sorry, I couldn't add the goal or subgoals. Please try again.";
        }
      } else if (showGoalsRegex.test(chatMessage)) {
        try {
          const goals = await dbService.getAllGoals();
          if (goals.length > 0) {
            aiResponse = 'Your goals:\n' + goals.map(g => `- ID: ${g.id}, Title: ${g.title}, Progress: ${g.current_value}%`).join('\n');
          } else {
            aiResponse = 'You have no goals yet.';
          }
        } catch (error) {
          console.error('Error fetching goals:', error);
          aiResponse = "Sorry, I couldn't retrieve your goals.";
        }
      } else if (showGoalByIdRegex.test(chatMessage)) {
        const goalId = parseInt(chatMessage.match(showGoalByIdRegex)![1]);
        try {
          const goal = await dbService.getGoalById(goalId);
          if (goal) {
            const subgoals = await dbService.getSubgoalsByGoalId(goalId);
            aiResponse = `Goal ID: ${goal.id}, Title: ${goal.title}, Progress: ${goal.current_value}%\nSubgoals:\n` +
                         subgoals.map(s => `- ID: ${s.id}, Title: ${s.title}, Completed: ${s.completed ? 'Yes' : 'No'}`).join('\n');
          } else {
            aiResponse = `Goal with ID ${goalId} not found.`;
          }
        } catch (error) {
          console.error('Error fetching goal or subgoals:', error);
          aiResponse = "Sorry, I couldn't retrieve the goal or its subgoals.";
        }
      } else if (updateGoalRegex.test(chatMessage)) {
        const match = chatMessage.match(updateGoalRegex)!;
        const goalId = parseInt(match[1]);
        const newTitle = match[2].trim();
        try {
          const goal = await dbService.getGoalById(goalId);
          if (goal) {
            const updatedGoal = { ...goal, title: newTitle };
            await dbService.updateGoal(updatedGoal);
            aiResponse = `Goal ID ${goalId} updated to title: "${newTitle}".`;
          } else {
            aiResponse = `Goal with ID ${goalId} not found.`;
          }
        } catch (error) {
          console.error('Error updating goal:', error);
          aiResponse = "Sorry, I couldn't update the goal.";
        }
      } else if (updateSubgoalRegex.test(chatMessage)) {
        const match = chatMessage.match(updateSubgoalRegex)!;
        const subgoalId = parseInt(match[1]);
        const completed = parseInt(match[2]);
        try {
          const subgoal = await dbService.getSubgoalById(subgoalId);
          if (subgoal) {
            const updatedSubgoal = { ...subgoal, completed: completed };
            await dbService.updateSubgoal(updatedSubgoal);
            aiResponse = `Subgoal ID ${subgoalId} updated to completed: ${completed ? 'Yes' : 'No'}.`;
          } else {
            aiResponse = `Subgoal with ID ${subgoalId} not found.`;
          }
        } catch (error) {
          console.error('Error updating subgoal:', error);
          aiResponse = "Sorry, I couldn't update the subgoal.";
        }
      } else if (deleteGoalRegex.test(chatMessage)) {
        const goalId = parseInt(chatMessage.match(deleteGoalRegex)![1]);
        try {
          await dbService.deleteGoal(goalId);
          aiResponse = `Goal ID ${goalId} and its subgoals have been deleted.`;
        } catch (error) {
          console.error('Error deleting goal:', error);
          aiResponse = "Sorry, I couldn't delete the goal.";
        }
      } else if (deleteSubgoalRegex.test(chatMessage)) {
        const subgoalId = parseInt(chatMessage.match(deleteSubgoalRegex)![1]);
        try {
          await dbService.deleteSubgoal(subgoalId);
          aiResponse = `Subgoal ID ${subgoalId} has been deleted.`;
        } catch (error) {
          console.error('Error deleting subgoal:', error);
          aiResponse = "Sorry, I couldn't delete the subgoal.";
        }
      } else {
        aiResponse = "I received your message: \"" + userMessage.text + "\". How else can I help?";
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        { id: prevMessages.length + 1, text: aiResponse, sender: 'ai' },
      ]);

      // Expand to full page chat like ChatGPT
      setIsFullPageChat(true);
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
              {messages.map((message) => (
                <div key={message.id} className={`message-container ${message.sender}-message`}>
                  <p>{message.text}</p>
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
                    {event.urgent && <div className="urgent-dot" />}n                  </motion.div>
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
