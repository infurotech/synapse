import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonButton,
  IonTextarea,
  IonLabel,
  IonToggle,
  IonList,
  IonListHeader,
  IonText
} from '@ionic/react';
import { AICommandProcessor, TestAIService } from '../services/ai';
import { initializeDatabase } from '../services/db';

const AIDebugPage: React.FC = () => {
  const [userId] = useState(1); // Mock user ID
  const [command, setCommand] = useState('');
  const [response, setResponse] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  
  const commandProcessor = React.useMemo(() => new AICommandProcessor(), []);
  const testService = React.useMemo(() => new TestAIService(), []);

  // Initialize database when component mounts
  useEffect(() => {
    const initDb = async () => {
      try {
        setLogs(prev => [...prev, "Initializing database..."]);
        await initializeDatabase();
        setDbInitialized(true);
        setLogs(prev => [...prev, "Database initialized successfully"]);
      } catch (error) {
        console.error('Error initializing database:', error);
        setLogs(prev => [...prev, `ERROR: Failed to initialize database: ${error}`]);
      }
    };
    
    initDb();
  }, []);

  // Override console.log to capture logs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev, args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')]);
    };
    
    console.error = (...args) => {
      originalError(...args);
      setLogs(prev => [...prev, `ERROR: ${args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')}`]);
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const handleSendCommand = async () => {
    if (!command.trim()) return;
    
    setLogs(prev => [...prev, `> User: ${command}`]);
    try {
      const result = await commandProcessor.processMessage(userId, command);
      setResponse(result.response);
      setLogs(prev => [...prev, `> AI: ${result.response}`, `> Success: ${result.success}`]);
    } catch (error) {
      console.error('Error processing command:', error);
      setResponse('Error processing command');
    }
  };

  const handleRunTests = async () => {
    setRunningTests(true);
    setLogs([]);
    try {
      await testService.runTestCommands(userId);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setRunningTests(false);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    setResponse('');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/profile" />
          </IonButtons>
          <IonTitle>AI Command Tester</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">AI Command Tester</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div style={{ padding: '1rem' }}>
          {!dbInitialized && (
            <IonCard color="warning">
              <IonCardContent>
                <IonText color="dark">
                  <p><strong>Initializing database...</strong> Some features may not work until initialization is complete.</p>
                </IonText>
              </IonCardContent>
            </IonCard>
          )}

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Test AI Commands</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Enter a command to test the AI integration. Try phrases like:</p>
              <ul>
                <li>"Add a task called 'Complete project' due tomorrow"</li>
                <li>"Show me my tasks"</li>
                <li>"Create a task with high priority"</li>
              </ul>

              <IonItem>
                <IonInput 
                  value={command} 
                  placeholder="Enter a command..." 
                  onIonInput={e => setCommand(e.detail.value!)} 
                />
                <IonButton onClick={handleSendCommand} disabled={!command.trim() || !dbInitialized}>
                  Send
                </IonButton>
              </IonItem>

              {response && (
                <IonItem lines="none">
                  <div style={{ width: '100%', marginTop: '1rem' }}>
                    <IonLabel>Response:</IonLabel>
                    <div style={{ 
                      padding: '0.75rem', 
                      backgroundColor: 'var(--ion-color-light)', 
                      borderRadius: '8px',
                      marginTop: '0.5rem'
                    }}>
                      {response}
                    </div>
                  </div>
                </IonItem>
              )}
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Run Test Suite</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Run a series of predefined test commands to verify the AI integration.</p>
              <IonButton 
                expand="block" 
                onClick={handleRunTests} 
                disabled={runningTests || !dbInitialized}
              >
                {runningTests ? 'Running Tests...' : 'Run Test Commands'}
              </IonButton>

              <IonItem lines="none">
                <IonToggle 
                  checked={showRawOutput} 
                  onIonChange={e => setShowRawOutput(e.detail.checked)}
                >
                  Show Raw Output
                </IonToggle>
              </IonItem>

              <IonButton 
                expand="block" 
                fill="outline" 
                onClick={handleClearLogs} 
                style={{ marginTop: '1rem' }}
              >
                Clear Logs
              </IonButton>
            </IonCardContent>
          </IonCard>

          {logs.length > 0 && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Test Logs</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div style={{ 
                  backgroundColor: 'var(--ion-color-dark)', 
                  color: 'var(--ion-color-light)',
                  padding: '1rem',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '300px',
                  overflow: 'auto'
                }}>
                  {logs.map((log, index) => (
                    <div key={index} style={{ 
                      marginBottom: '0.5rem',
                      display: showRawOutput ? 'block' : (log.startsWith('> ') || log.startsWith('ERROR') ? 'block' : 'none')
                    }}>
                      {log}
                    </div>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AIDebugPage; 