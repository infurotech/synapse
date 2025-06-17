import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DatabaseAgent } from '../services/db';

interface DatabaseContextType {
  isReady: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        const dbAgent = DatabaseAgent.getInstance();
        await dbAgent.initializeDatabase();
        setIsReady(true);
        console.log('Database initialized successfully via DatabaseContext');
      } catch (err) {
        console.error('Database initialization error:', err);
        setError(err instanceof Error ? err : new Error('Unknown database error'));
      }
    };

    setupDatabase();
  }, []);

  // For debugging purposes, log database status changes
  useEffect(() => {
    console.log(`Database status: ${isReady ? 'Ready' : 'Not Ready'}`);
    if (error) {
      console.error('Database error:', error);
    }
  }, [isReady, error]);

  return (
    <DatabaseContext.Provider value={{ isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export default DatabaseContext; 