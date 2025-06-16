import React, { useState, useCallback, useEffect } from 'react';
import {
  IonContent,
  IonPage,
  IonButton,
  IonIcon,
  IonText,
  IonCard,
  IonCardContent,
  IonProgressBar,
} from '@ionic/react';
import { downloadOutline, chevronForward, checkmarkCircle, alertCircleOutline, refreshOutline } from 'ionicons/icons';
import { motion, AnimatePresence } from 'framer-motion';
import './ModelPermission.css';
import { ModelState } from '../utils/model_types';
import { useWllama } from '../utils/wllama.context';
import { toHumanReadableSize } from '../utils/llama_utils';
import { DisplayedModel } from '../utils/displayed-model';

interface ModelPermissionProps {
  onComplete: () => void;
}

/**
 * Component to display the status of a model during download/initialization
 */
const ModelStatus: React.FC<{ model: DisplayedModel; modelTypeName: string; isInitializing?: boolean }> = ({ 
  model, 
  modelTypeName,
  isInitializing 
}) => {
  const modelSize = toHumanReadableSize(model.size);
  const percent = Math.round(model.downloadPercent * 100);
  const isDownloading = model.state === ModelState.DOWNLOADING;
  const isCompleted = model.state === ModelState.READY || model.state === ModelState.LOADED;

  let statusText = '';
  let statusClass = '';
  
  if (isInitializing) {
    statusText = 'Initializing...';
    statusClass = 'initializing';
  } else if (isDownloading) {
    statusText = 'Downloading...';
    statusClass = 'downloading';
  } else if (isCompleted) {
    statusText = isInitializing ? 'Initialized' : 'Download Complete';
    statusClass = 'completed';
  } else if (model.state === ModelState.READY) {
    statusText = 'Ready to initialize';
    statusClass = 'ready';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`model-status ${statusClass}`}
    >
      <div className="model-header">
        <h3>{modelTypeName}</h3>
        <span className="model-size">{modelSize}</span>
      </div>
      
      {(isDownloading || isInitializing) && (
        <div className="loading-status">
          <IonProgressBar value={isInitializing ? 0.5 : model.downloadPercent} />
          <div className="status-text">
            <span>{statusText}</span>
            {!isInitializing && <span>{percent}%</span>}
          </div>
        </div>
      )}
      
      {isCompleted && !isInitializing && (
        <div className="completed-status">
          <IonIcon icon={checkmarkCircle} className="completed-icon" />
          <span>{statusText}</span>
        </div>
      )}
    </motion.div>
  );
};

/**
 * Main component for handling model download and initialization permissions
 * Manages the flow of downloading required AI models and initializing the chat model
 */
const ModelPermission: React.FC<ModelPermissionProps> = ({ onComplete }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeModel, setActiveModel] = useState<'embedding' | 'completion' | 'none'>('none');
  const [error, setError] = useState<string | null>(null);
  const [downloadAttempts, setDownloadAttempts] = useState(0);
  const { models, downloadModel, loadModel, verifyModelInCache, resetBusyState } = useWllama();

  // Find required models from the available models list
  const embeddingModel = models.find(m => m.url.toLowerCase().includes('gte-qwen2-1.5b-instruct'));
  const completionModel = models.find(m => m.url.toLowerCase().includes('qwen2-1.5b-instruct') && !m.url.toLowerCase().includes('gte'));

  const verifyModelCache = useCallback(async (model: DisplayedModel): Promise<boolean> => {
    return await verifyModelInCache(model.url);
  }, [verifyModelInCache]);

  const [needsDownload, setNeedsDownload] = useState(true);
  const [hasCheckedCache, setHasCheckedCache] = useState(false);
  
  /**
   * Check if models are already cached on device startup
   */
  useEffect(() => {
    const checkModels = async () => {
      if (!embeddingModel || !completionModel || hasCheckedCache) return;
      
      const hasEmbedding = await verifyModelCache(embeddingModel);
      const hasCompletion = await verifyModelCache(completionModel);
      const bothCached = hasEmbedding && hasCompletion;
      
      setNeedsDownload(!bothCached);
      setHasCheckedCache(true);
    };
    
    checkModels();
  }, [embeddingModel?.url, completionModel?.url, hasCheckedCache, verifyModelCache]);

  /**
   * Handle the main permission grant action - either download or initialize
   */
  const handlePermissionGrant = async () => {
    // Reset error state and prepare for retry if needed
    if (error) {
      setError(null);
      if (downloadAttempts >= 3) {
        setDownloadAttempts(0);
      }
      setHasCheckedCache(false);
      resetBusyState();
    }
    
    if (needsDownload) {
      await handleDownload();
    } else {
      await handleInitialization();
    }
  };

  /**
   * Handle the download process for both embedding and completion models
   */
  const handleDownload = async () => {
    // Prevent infinite download loops
    if (downloadAttempts >= 3) {
      setError('Maximum download attempts reached. Please refresh the page and try again.');
      setIsDownloading(false);
      return;
    }

    setIsDownloading(true);
    setError(null);
    setDownloadAttempts(prev => prev + 1);

    if (!embeddingModel || !completionModel) {
      setError('Required models not found in configuration.');
      setIsDownloading(false);
      return;
    }

    const maxRetries = 2;
    
    /**
     * Download a model with retry logic and verification
     */
    const downloadWithRetry = async (model: DisplayedModel) => {
      let retryCount = 0;
      while (retryCount <= maxRetries) {
        try {
          await downloadModel(model);
          
          // Verify the model was actually cached after download
          const isVerified = await verifyModelInCache(model.url);
          if (isVerified) {
            return true;
          }
          
          retryCount++;
          
          if (retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          retryCount++;
          
          if (retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw error;
          }
        }
      }
      return false;
    };

    try {
      // Download embedding model first
      setActiveModel('embedding');
      const embeddingSuccess = await downloadWithRetry(embeddingModel);
      if (!embeddingSuccess) {
        throw new Error('Failed to download and verify embedding model after multiple attempts');
      }
      
      // Download completion model second
      setActiveModel('completion');
      const completionSuccess = await downloadWithRetry(completionModel);
      if (!completionSuccess) {
        throw new Error('Failed to download and verify completion model after multiple attempts');
      }

      // Both models downloaded successfully, proceed to initialization
      setIsDownloading(false);
      setHasCheckedCache(false);
      await handleInitialization();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error during model download');
      setIsDownloading(false);
    }
  };

  /**
   * Handle initialization of the chat completion model
   * Only the completion model needs to be loaded into memory for chat functionality
   */
  const handleInitialization = async () => {
    setIsInitializing(true);
    setError(null);
    setActiveModel('completion');

    if (!completionModel) {
      setError('Chat completion model not found.');
      setIsInitializing(false);
      return;
    }

    try {
      // Load only the chat completion model into memory
      await loadModel(completionModel);
      onComplete();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error during initialization');
      setIsInitializing(false);
      setActiveModel('none');
      setHasCheckedCache(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="permission-content">
        <div className="main-content">
          <div className="geometric-background">
            <div className="geometric-circle"></div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <IonCard className="permission-card">
                <IonCardContent>
                  <motion.div
                    className="download-icon-container"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <IonIcon 
                      icon={error ? alertCircleOutline : (needsDownload ? downloadOutline : refreshOutline)} 
                      className={`download-icon ${error ? 'error' : ''}`} 
                    />
                  </motion.div>
                  
                  <IonText className="permission-title">
                    <h2>{needsDownload ? 'Download AI Models' : 'Initialize Chat Model'}</h2>
                  </IonText>
                  
                  <IonText className="permission-description">
                    <p>
                      {needsDownload 
                        ? 'Synapse needs to download two AI models to your device.' 
                        : 'Synapse needs to initialize the chat model for use.'}
                    </p>
                  </IonText>

                  {error && (
                    <div className="error-message">
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="models-container">
                    <AnimatePresence mode="wait">
                      {activeModel === 'embedding' && embeddingModel && (
                        <ModelStatus 
                          key="embedding" 
                          model={embeddingModel} 
                          modelTypeName="Embedding Model"
                          isInitializing={!needsDownload && isInitializing} 
                        />
                      )}
                      {activeModel === 'completion' && completionModel && (
                        <ModelStatus 
                          key="completion" 
                          model={completionModel} 
                          modelTypeName="Chat Completion Model"
                          isInitializing={!needsDownload && isInitializing} 
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  {(!isDownloading && !isInitializing) && (
                    <div className="permission-buttons">
                      <IonButton
                        expand="block"
                        className="grant-button"
                        onClick={handlePermissionGrant}
                        disabled={false}
                      >
                        {error ? 'Retry' : (needsDownload ? 'Start Download' : 'Initialize Chat Model')}
                        <IonIcon slot="end" icon={chevronForward} />
                      </IonButton>
                    </div>
                  )}
                </IonCardContent>
              </IonCard>
            </motion.div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ModelPermission;