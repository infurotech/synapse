import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { WllamaProvider } from './utils/wllama.context';
import AppInitializer from './components/AppInitializer';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <DatabaseProvider>
      <WllamaProvider>
        <AppInitializer>
          <App />
        </AppInitializer>
      </WllamaProvider>
    </DatabaseProvider>
  </React.StrictMode>
);