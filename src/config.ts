// See: https://vitejs.dev/guide/assets#explicit-url-imports

import wllamaSingle from '@wllama/wllama/src/single-thread/wllama.wasm?url';
import wllamaMulti from '@wllama/wllama/src/multi-thread/wllama.wasm?url';
import wllamaPackageJson from '@wllama/wllama/package.json';
import { InferenceParams } from './utils/model_types';

export const WLLAMA_VERSION = wllamaPackageJson.version;

export const WLLAMA_CONFIG_PATHS = {
  'single-thread/wllama.wasm': wllamaSingle,
  'multi-thread/wllama.wasm': wllamaMulti,
};

export const MAX_GGUF_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export const LIST_MODELS = [
  {
    url: 'https://huggingface.co/bytejack007/gte-Qwen2-1.5B-instruct-Q4_K_M-GGUF/resolve/main/gte-qwen2-1.5b-instruct-q4_k_m.gguf',
    size: 1116695968, 
    type: 'embedding_model',
  },
  {
    url: 'https://huggingface.co/twohappyrussians/Qwen2-1.5B-Instruct-Q4_K_M-GGUF/resolve/main/qwen2-1.5b-instruct-q4_k_m.gguf',
    size: 986045888,
    type: 'chatCompletionModel',
  },
];

export const DEFAULT_INFERENCE_PARAMS: InferenceParams = {
  nThreads: 5, // auto
  nContext: 4096,
  nPredict: 500,
  nBatch: 128,
  temperature: 0.4,
};

export const DEFAULT_CHAT_TEMPLATE =
  "{% for message in messages %}{{'<|im_start|>' + message['role'] + '\n' + message['content'] + '<|im_end|>' + '\n'}}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\n' }}{% endif %}";