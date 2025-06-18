import { Wllama } from '@wllama/wllama';
import { useCallback, useEffect, useRef } from 'react';
import { Template } from '@huggingface/jinja';
import { Message, Screen } from './model_types';
import { DEFAULT_CHAT_TEMPLATE } from '../../src/config';

export const delay = function (ms: number) {
    // Returns a promise that resolves after a specified number of milliseconds
    // This is useful for creating pauses in asynchronous code execution
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const useDidMount = (callback: () => unknown) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  useEffect(() => {
    callbackRef.current();
  }, []);
};
  

// We define custom type StorageKey to represent the keys used in local storage, It can only be one of these four exact string values
type StorageKey = 'conversations' | 'params' | 'welcome';


// WllamaStorage – LocalStorage Wrapper is a utility for saving and loading data to and from local storage
// Keeps user settings, previous chats, or models even after refresh or closing the app.
export const WllamaStorage = {

  // save method takes a key and data, converts the data to a JSON string, and saves it in local storage
  save<T>(key: StorageKey, data: T) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // load method retrieves data from local storage by key, parses it from JSON, and returns it
  load<T>(key: StorageKey, defaultValue: T): T {
    if (localStorage[key]) {
      return JSON.parse(localStorage[key]);
    } else {
      return defaultValue;
    }
  },
};

// <T> is a generic type parameter that allows the function to work with any type of data and still retain type safety
// ex. WllamaStorage.save<string>('welcome', 'hello');
// ex. WllamaStorage.save<{ user: string }>('params', { user: 'Vishi' });

export const getDefaultScreen = (): Screen => {
  const welcome: boolean = WllamaStorage.load('welcome', true);
  return welcome ? Screen.GUIDE : Screen.MODEL;
};


export const formatChat = async (
  modelWllama: Wllama,
  messages: Message[]
): Promise<string> => {
  try {
    const templateStr = modelWllama.getChatTemplate() ?? DEFAULT_CHAT_TEMPLATE;
    
    // Check if we're using Qwen2 model
    const isQwen2 = templateStr.includes('<|im_start|>') && templateStr.includes('<|im_end|>');
    
    if (isQwen2) {
      let result = '';
      for (const message of messages) {
        if (!message.role || !message.content) {
          console.warn('[formatChat] Skipping invalid message:', message);
          continue;
        }
        
        // Simple, clean formatting for Qwen2
        result += `<|im_start|>${message.role}\n${message.content}<|im_end|>\n`;
      }
      
      // Add the assistant prompt
      result += '<|im_start|>assistant\n';
      return result;
    }

    // Fallback to using the template engine for other models
    const template = new Template(templateStr);
    const bos_token: string = await modelWllama.detokenize(
      [modelWllama.getBOS()],
      true
    );
    const eos_token: string = await modelWllama.detokenize(
      [modelWllama.getEOS()],
      true
    );
    return template.render({
      messages,
      bos_token,
      eos_token,
      add_generation_prompt: true,
    });
  } catch (err) {
    console.error('[formatChat] Fatal error formatting chat:', err);
    throw new Error('Failed to format chat messages: ' + (err instanceof Error ? err.message : String(err)));
  }
};

export const toHumanReadableSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

type LoggerArg = string | number | boolean | object | null | undefined;

export const DebugLogger = {
  content: [] as string[],
  debug(...args: LoggerArg[]) {
    console.debug('🔧', ...args);
    DebugLogger.content.push(`🔧 ${DebugLogger.argsToStr(args)}`);
  },
  log(...args: LoggerArg[]) {
    console.log('ℹ️', ...args);
    DebugLogger.content.push(`ℹ️ ${DebugLogger.argsToStr(args)}`);
  },
  warn(...args: LoggerArg[]) {
    console.warn('⚠️', ...args);
    DebugLogger.content.push(`⚠️ ${DebugLogger.argsToStr(args)}`);
  },
  error(...args: LoggerArg[]) {
    console.error('☠️', ...args);
    DebugLogger.content.push(`☠️ ${DebugLogger.argsToStr(args)}`);
  },
  argsToStr(args: LoggerArg[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') {
          return arg;
        } else {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return '';
          }
        }
      })
      .join(' ');
  },
};

export function useDebounce<T extends unknown[]>(
  effect: (...args: T) => void,
  dependencies: unknown[],
  delay: number
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const callback = useCallback(effect, dependencies);
  useEffect(() => {
    const timeout = setTimeout(callback, delay);
    return () => clearTimeout(timeout);
  }, [callback, delay]);
}

export const debugFormatting = (formattedChat: string): void => {
  const messages = formattedChat.split('<|im_start|>').filter(Boolean);
  console.group('Chat Format Debug');
  messages.forEach((msg, i) => {
    const hasSep = msg.includes('<|im_sep|>');
    const hasEnd = msg.includes('<|im_end|>');
    console.log(`Message ${i}:`);
    console.log('Has separator:', hasSep);
    console.log('Has end token:', hasEnd);
    if (hasSep) {
      const [beforeSep, afterSep] = msg.split('<|im_sep|>');
      console.log('Before separator:', beforeSep.trim());
      console.log('After separator:', afterSep.trim());
    } else {
      console.log('Content:', msg.trim());
    }
  });
  console.groupEnd();
};