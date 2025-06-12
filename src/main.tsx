import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ConversationProvider } from './contexts/ConversationContext';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <ConversationProvider>
      <App />
    </ConversationProvider>
  </React.StrictMode>
);