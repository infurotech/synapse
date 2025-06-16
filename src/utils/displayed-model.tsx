import { Model } from '@wllama/wllama';
import { ModelState, getModelType } from './model_types';
import { WllamaStorage } from './llama_utils';
import { LIST_MODELS } from '../config';

export class DisplayedModel {
  url: string;
  size: number;
  isUserAdded: boolean;
  cachedModel?: Model;

  state: ModelState = ModelState.NOT_DOWNLOADED;
  downloadPercent: number = -1; // from 0.0 to 1.0; -1 means not downloading

  constructor(
    url: string,
    size: number,
    isUserAdded: boolean,
    cachedModel?: Model
  ) {
    this.url = url;
    this.size = size;
    this.isUserAdded = isUserAdded;
    this.state = !cachedModel ? ModelState.READY : ModelState.NOT_DOWNLOADED;
    this.cachedModel = cachedModel;
  }

  // NEW: Add getter for model type
  get modelType() {
    return getModelType(this.url);
  }

  // NEW: Add getter to check if it's an embedding model
  get isEmbeddingModel() {
    return this.modelType === 'embedding';
  }

  // NEW: Add getter to check if it's a chat model
  get isChatModel() {
    return this.modelType === 'chat';
  }

  // we define a getter function here basically, in js/ts getter makes function behave like property. we can access this without using parenthesis.
  /*
      Example URL:
      https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Q4_0/Llama-3.2-1B-Instruct-Q4_0.gguf

      1. .replace(/https:\/\/(huggingface.co|hf.co)\/+/, ''): this will remove, https:// , huggingface.co or hf.co/, 
  
          ==> Modified string: bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q8_0.gguf

      2.  .split('/') : This method takes the remaining string and splits it into an array of smaller strings, using the / character as the separator.

          => [
                "bartowski",                             // parts[0]
                "Llama-3.2-1B-Instruct-GGUF",            // parts[1]
                "resolve",                               // parts[2]
                "main",                                  // parts[3]
                "Llama-3.2-1B-Instruct-Q8_0.gguf"        // parts[4]
             ]

      3.  return `${parts[0]}/${parts[1]}`; :  It takes the first two elements from the parts array and joins them together with a / in the middle.

          => The final returned value is:  bartowski/Llama-3.2-1B-Instruct-GGUF
      */  

  get hfModel() {
    const parts = this.url
      .replace(/https:\/\/(huggingface.co|hf.co)\/+/, '')
      .split('/');
    return `${parts[0]}/${parts[1]}`;
  }

  // just like the above function only difference is in return : The .slice(4) method looks at the parts array
  // and creates a new, smaller array containing everything from index 4 to the end. and then joins whatever in the new array with '/' separator.
  get hfPath() {
    const parts = this.url
      .replace(/https:\/\/(huggingface.co|hf.co)\/+/, '')
      .split('/');
    return parts.slice(4).join('/');
  }

  // creates duplicate of current DisplayedModel object, it allows us selectively overwrite the some properties of new copy at the same time
  /*
    Partial<DisplayedModel> is a special TypeScript type that means the overwrite object can contain 
    any of the properties from a DisplayedModel (like state or downloadPercent), but all of them are
    optional. You can provide one, two, or none.
  */

  clone(overwrite: Partial<DisplayedModel>): DisplayedModel {

    // It constructs this new object using all the values from the current object (this.url, this.size, etc.).
    const obj = new DisplayedModel(
      this.url,
      this.size,
      this.isUserAdded,
      this.cachedModel
    );

    // Check the overwrite object first. If overwrite.state exists, use that new value.
    // If it doesn't exist (it's null or undefined), then just fall back to using the original state from this.state. Similarly, for obj.downloadPercent
    obj.state = overwrite.state ?? this.state;
    obj.downloadPercent = overwrite.downloadPercent ?? this.downloadPercent;
    return obj;
  }
}

interface UserAddedModel {
  url: string;
  size: number;
}

export function getUserAddedModels(cachedModels: Model[]): DisplayedModel[] {
  const userAddedModels: UserAddedModel[] = WllamaStorage.load(
    'custom_models',
    []
  );
  return userAddedModels.map((m: UserAddedModel) => {
    const cachedModel = cachedModels.find((cm) => cm.url === m.url);
    return new DisplayedModel(m.url, m.size, true, cachedModel);
  });
}

export function updateUserAddedModels(models: DisplayedModel[]) {
  const userAddedModels: UserAddedModel[] = models
    .filter((m) => m.isUserAdded)
    .map((m) => ({ url: m.url, size: m.size }));
  WllamaStorage.save('custom_models', userAddedModels);
}


// models that come up with app
export function getPresetModels(cachedModels: Model[]): DisplayedModel[] {
  return LIST_MODELS.map((m) => {
    const cachedModel = cachedModels.find((cm) => cm.url === m.url);
    return new DisplayedModel(m.url, m.size, false, cachedModel);
  });
}

export function getDisplayedModels(cachedModels: Model[]): DisplayedModel[] {
  // Preset models
  const presetModels = LIST_MODELS.map((m) => {
    const cachedModel = cachedModels.find((cm) => cm.url === m.url);
    return new DisplayedModel(m.url, m.size, false, cachedModel);
  });
  // User-added models (if any)
  return [
    ...getUserAddedModels(cachedModels),
    ...presetModels,
  ];
}
