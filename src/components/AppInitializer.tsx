import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IonLoading } from '@ionic/react';
import { useWllama } from '../utils/wllama.context';
import ModelPermission from '../pages/ModelPermission';

interface AppInitializerProps {
  children: React.ReactNode;
}

/**
 * AppInitializer component handles the initial setup and loading of AI models
 * It checks if models are already cached and loads them, or shows the setup flow
 */
const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const { models, loadModel, refreshCachedModels } = useWllama();
  const initializationRan = useRef(false);

  /**
   * Handle initialization failure by clearing cache flags and showing setup
   */
  const handleInitializationFailure = useCallback(() => {
    localStorage.removeItem('models_are_downloaded');
    setNeedsSetup(true);
  }, []);

  /**
   * Main initialization effect - runs once when component mounts
   * Checks for cached models and attempts to load them automatically
   */
  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRan.current) {
      return;
    }

    // Wait for models to be loaded from context
    if (models.length === 0) {
      return;
    }

    // Don't run initialization if we're already showing setup
    if (needsSetup) {
      return;
    }

    initializationRan.current = true;

    const initializeApp = async () => {
      try {
        // Refresh the cached models list to get latest state
        await refreshCachedModels();
        
        // Small delay to ensure models state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Find required models that are already cached using new model type checking
        const chatModel = models.find(m => 
          m.url.toLowerCase().includes('qwen2-1.5b-instruct') && 
          !m.url.toLowerCase().includes('gte') &&
          m.cachedModel &&
          !m.isEmbeddingModel // Use new property if available
        );
        
        const embeddingModel = models.find(m => 
          m.url.toLowerCase().includes('gte-qwen2-1.5b-instruct') &&
          m.cachedModel &&
          m.isEmbeddingModel // Use new property if available
        );

        // If both models are cached, load the chat model and mark as ready
        if (chatModel && embeddingModel) {
          setNeedsSetup(false);
          try {
            await loadModel(chatModel);
            localStorage.setItem('models_are_downloaded', 'true');
          } catch (error) {
            console.error('Failed to load chat model:', error);
            // If loading fails, show setup to re-download/initialize
            handleInitializationFailure();
          }
        } else {
          // Models not cached, show setup flow
          console.log('Models not found in cache, showing setup');
          handleInitializationFailure();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        // Any error during initialization shows setup flow
        handleInitializationFailure();
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [models, loadModel, refreshCachedModels, handleInitializationFailure, needsSetup]);

  // Show loading spinner while initializing
  if (!isInitialized) {
    return <IonLoading isOpen={true} message={'Initializing...'} />;
  }

  // Show setup flow if models need to be downloaded/initialized
  if (needsSetup) {
    return <ModelPermission onComplete={() => {
      localStorage.setItem('models_are_downloaded', 'true');
      setNeedsSetup(false);
    }} />;
  }
  
  // Models are ready, render the main app
  return <>{children}</>;
};

export default AppInitializer;