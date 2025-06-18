import { createContext, useContext, useMemo, useState } from 'react';
import {
  DebugLogger,
  getDefaultScreen,
  useDidMount,
  WllamaStorage,
} from './llama_utils';
import { Model, ModelManager, Wllama } from '@wllama/wllama';
import { DEFAULT_INFERENCE_PARAMS, WLLAMA_CONFIG_PATHS } from '../config';
import { InferenceParams, RuntimeInfo, ModelState, Screen, Message } from './model_types';
import {
  DisplayedModel,
  getDisplayedModels,
} from './displayed-model';

interface WllamaContextValue {
  // functions for managing models
  models: DisplayedModel[];
  downloadModel(model: DisplayedModel): Promise<void>;
  removeCachedModel(model: DisplayedModel): Promise<void>;
  removeAllCachedModels(): Promise<void>;
  refreshCachedModels(): Promise<void>;
  verifyModelInCache(modelUrl: string): Promise<boolean>;
  resetBusyState(): void;
  isDownloading: boolean;
  isLoadingModel: boolean;
  currParams: InferenceParams;
  setParams(params: InferenceParams): void;

  // function to load/unload model
  loadedModel?: DisplayedModel;
  currRuntimeInfo?: RuntimeInfo;
  loadModel(model: DisplayedModel): Promise<void>;
  unloadModel(): Promise<void>;



  // functions for chat completion
  getWllamaInstance(): Wllama;
  createCompletion(
    input: string,
    callback: (piece: string) => void
  ): Promise<void>;
  stopCompletion(): void;
  isGenerating: boolean;
  currentConvId: number;

  // nagivation
  navigateTo(screen: Screen, conversationId?: number): void;
  currScreen: Screen;
}

const WllamaContext = createContext<WllamaContextValue | null>(null);

const modelManager = new ModelManager();
let wllamaInstance = new Wllama(WLLAMA_CONFIG_PATHS, { logger: DebugLogger });
let stopSignal = false;
const resetWllamaInstance = () => {
  wllamaInstance = new Wllama(WLLAMA_CONFIG_PATHS, { logger: DebugLogger });
};

export const WllamaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGenerating, setGenerating] = useState(false);
  const [currentConvId, setCurrentConvId] = useState(-1);
  const [currScreen, setScreen] = useState<Screen>(getDefaultScreen());
  const [cachedModels, setCachedModels] = useState<Model[]>([]);
  const [isBusy, setBusy] = useState(false);
  const [currRuntimeInfo, setCurrRuntimeInfo] = useState<RuntimeInfo>();
  const [currParams, setCurrParams] = useState<InferenceParams>(
    WllamaStorage.load('params', DEFAULT_INFERENCE_PARAMS)
  );
  
  const [downloadingProgress, setDownloadingProgress] = useState<Record<string, number>>({});

  const [loadedModel, setLoadedModel] = useState<DisplayedModel>();

  const refreshCachedModels = async () => {
    const cached = await modelManager.getModels();
    setCachedModels(cached);
  };

  useDidMount(() => {
    refreshCachedModels();
  });

  // computed variables
  const models = useMemo(() => {
    const list = getDisplayedModels(cachedModels);

    for (const model of list) {
      model.downloadPercent = downloadingProgress[model.url] ?? -1;
      if (model.downloadPercent >= 0) {
        model.state = ModelState.DOWNLOADING;
      }
      if (loadedModel?.url === model.url) {
        model.state = loadedModel.state;
      }
    }

    return list;
  }, [cachedModels, downloadingProgress, loadedModel]);

  const isDownloading = useMemo(
    () => models.some((m) => m.state === ModelState.DOWNLOADING),
    [models]
  );

  const isLoadingModel = useMemo(
    () => isBusy || loadedModel?.state === ModelState.LOADING,
    [loadedModel, isBusy]
  );

  // utils
  const updateModelDownloadState = ( url: string, downloadPercent: number = -1 ) => {
    if (downloadPercent < 0) {
      setDownloadingProgress((p) => {
        const newProgress = { ...p };
        delete newProgress[url];
        return newProgress;
      });
    } else {
      setDownloadingProgress((p) => ({ ...p, [url]: downloadPercent }));
    }
  };

  const downloadModel = async (model: DisplayedModel) => {
    if (isDownloading || loadedModel || isLoadingModel) {
      throw new Error('System is busy with another operation');
    }
    
    updateModelDownloadState(model.url, 0);
    
    try {
      // First verify if model is already cached
      await refreshCachedModels();
      const existingModel = cachedModels.find(m => m.url === model.url);
      if (existingModel) {
        updateModelDownloadState(model.url, -1);
        return;
      }

      // Start download with progress tracking
      await modelManager.downloadModel(model.url, {
        progressCallback(opts) {
          const progress = opts.loaded / opts.total;
          updateModelDownloadState(model.url, progress);
        },
      });
      
      // Add a small delay to ensure filesystem operations complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the download with retries
      const maxRetries = 3;
      let retryCount = 0;
      let downloadedModel = null;
      
      while (retryCount < maxRetries) {
        // Get fresh models directly from modelManager instead of relying on state
        const freshCachedModels = await modelManager.getModels();
        downloadedModel = freshCachedModels.find(m => m.url === model.url);
        
        if (downloadedModel) {
          // Update the state with fresh models
          setCachedModels(freshCachedModels);
          break;
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between retries
        }
      }
      
      if (!downloadedModel) {
        throw new Error('Model download completed but not found in cache after multiple verification attempts');
      }
      
      updateModelDownloadState(model.url, -1);
    } catch (e) {
      console.error(`[WllamaContext] Error downloading model: ${model.url}`, e);
      updateModelDownloadState(model.url, -1);
      const errorMessage = e instanceof Error ? e.message : 'unknown error while downloading model';
      throw new Error(`Failed to download model: ${errorMessage}`);
    }
  };

  const removeCachedModel = async (model: DisplayedModel) => {
    if (isDownloading || loadedModel || isLoadingModel) return;
    if (model.cachedModel) {
      await model.cachedModel.remove();
      await refreshCachedModels();
    }
  };

  const removeAllCachedModels = async () => {
    if (isDownloading || loadedModel || isLoadingModel) return;
    await modelManager.clear();
    await refreshCachedModels();
  };

  const loadModel = async (model: DisplayedModel) => {
    if (isDownloading || loadedModel || isLoadingModel) {
      throw new Error('System is busy with another operation');
    }

    // Verify model is cached using direct access instead of state
    const freshCachedModels = await modelManager.getModels();
    const cachedModel = freshCachedModels.find(m => m.url === model.url);
    
    if (!cachedModel) {
      throw new Error('Model is not in cache');
    }

    setLoadedModel(model.clone({ state: ModelState.LOADING }));
    
    try {
      await wllamaInstance.loadModel(cachedModel, {
        n_threads: currParams.nThreads > 0 ? currParams.nThreads : undefined,
        n_ctx: currParams.nContext,
        n_batch: currParams.nBatch,
        offload_kqv: currParams.offload_kqv,
      });
      
      setLoadedModel(model.clone({ state: ModelState.LOADED }));
      setCurrRuntimeInfo({
        isMultithread: wllamaInstance.isMultithread(),
        hasChatTemplate: !!wllamaInstance.getChatTemplate(),
      });
    } catch (e) {
      resetWllamaInstance();
      setLoadedModel(undefined);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      throw new Error(`Failed to load model: ${errorMessage}`);
    }
  };

  const unloadModel = async () => {
    if (!loadedModel) return;
    await wllamaInstance.exit();
    resetWllamaInstance();
    setLoadedModel(undefined);
    setCurrRuntimeInfo(undefined);
  };

  const createCompletion = async (
    input: string,
    callback: (currentText: string) => void
  ) => {
    if (isDownloading || !loadedModel || isLoadingModel) return;
    setGenerating(true);
    stopSignal = false;
    
    try {
      // Format the input as a proper chat message
      const messages: Message[] = [
        {
          id: Date.now(),
          role: 'user' as const,
          content: input
        }
      ];
      
      // Use formatChat to properly format the input with chat template
      const { formatChat } = await import('./llama_utils');
      const formattedInput = await formatChat(wllamaInstance, messages);
      

      
      const result = await wllamaInstance.createCompletion(formattedInput, {
        nPredict: currParams.nPredict,
        useCache: true,
        sampling: {
          temp: currParams.temperature,
        },
        onNewToken(token: number, piece: Uint8Array, currentText: string, optionals: { abortSignal: () => void }) {
          callback(currentText);
          if (stopSignal) optionals.abortSignal();
        },
      });
      callback(result);
    } finally {
      stopSignal = false;
      setGenerating(false);
    }
  };

  const stopCompletion = () => {
    stopSignal = true;
    setGenerating(false);
  };

  const navigateTo = (screen: Screen, conversationId?: number) => {
    setScreen(screen);
    setCurrentConvId(conversationId ?? -1);
    if (screen === Screen.MODEL) {
      WllamaStorage.save('welcome', false);
    }
  };

  // proxy function for saving to localStorage
  const setParams = (val: InferenceParams) => {
    WllamaStorage.save('params', val);
    setCurrParams(val);
  };



  const verifyModelInCache = async (modelUrl: string): Promise<boolean> => {
    const freshCachedModels = await modelManager.getModels();
    const foundModel = freshCachedModels.find(m => m.url === modelUrl);
    const isFound = !!foundModel;
    return isFound;
  };

  const resetBusyState = () => {
    setBusy(false);
  };



  return (
    <WllamaContext.Provider
      value={{
        models,
        isDownloading,
        isLoadingModel,
        downloadModel,
        removeCachedModel,
        removeAllCachedModels,
        refreshCachedModels,
        verifyModelInCache,
        resetBusyState,
        loadedModel,
        loadModel,
        unloadModel,
        currParams,
        setParams,
        createCompletion,
        stopCompletion,
        isGenerating,
        currentConvId,
        navigateTo,
        currScreen,
        getWllamaInstance: () => wllamaInstance,
        currRuntimeInfo,
      }}
    >
      {children}
    </WllamaContext.Provider>
  );
};

export const useWllama = () => {
  const context = useContext(WllamaContext);
  if (context === null) {
    throw new Error('useWllama must be used within a WllamaProvider');
  }
  return context;
};
