import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DatabaseProvider } from './contexts/DatabaseContext';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <DatabaseProvider>
      <App />
    </DatabaseProvider>
  </React.StrictMode>
);