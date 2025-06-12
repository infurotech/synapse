import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ConversationProvider } from './contexts/ConversationContext';
import { DatabaseProvider } from './contexts/DatabaseContext';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <DatabaseProvider>
      <ConversationProvider>
        <App />
      </ConversationProvider>
    </DatabaseProvider>
  </React.StrictMode>
);