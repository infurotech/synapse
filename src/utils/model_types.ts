import { LIST_MODELS } from '../config';

export enum Screen {
  GUIDE = 'guide',
  CHAT = 'chat',
  MODEL = 'model',
  LOG = 'log',
  DASHBOARD = 'dashboard',
  WELCOME = 'welcome'
}

export enum ModelState {
  NOT_DOWNLOADED,
  DOWNLOADING,
  READY,
  LOADING,
  LOADED,
}

export type ModelType = 'embedding' | 'chat';

export interface RuntimeInfo {
  isMultithread: boolean;
  hasChatTemplate: boolean;
}

/*
    Context Window Size: This is the model's short-term memory.
    It's the maximum number of "tokens" (words or parts of words) that the model can look at from the conversation history
    and your current prompt to understand the context.
 */
export interface InferenceParams {
  nThreads: number;  // how many of your computer's CPU cores the model can use at the same time.
  nContext: number;  // context window size
  nBatch: number;  // how many tokens are processed together in a single "batch" during evaluation
  temperature: number;  // controls the creativity and randomness of the model's output. (low temp for factual ans. and code generation and high-temp for creative, random and diverse answers )
  nPredict: number;  //  maximum number of tokens (words/sub-words) that the model is allowed to generate in a single response.
  offload_kqv?: boolean; // whether to offload key/query/value matrices to CPU memory
}

export interface Message {
  id: number;
  content: string;
  role: 'system' | 'user' | 'assistant';
}

export interface Conversation {
  id: number;
  messages: Message[];
}

export function getModelType(url: string): ModelType {
  const modelConfig = LIST_MODELS.find(m => m.url === url);
  return modelConfig?.type === 'embedding_model' ? 'embedding' : 'chat';
}

export class WllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WllamaError';
  }
}