import { Model } from '@wllama/wllama';
import { ModelState } from './model_types';

export declare class DisplayedModel {
  url: string;
  size: number;
  isUserAdded: boolean;
  cachedModel?: Model;
  state: ModelState;
  downloadPercent: number;

  constructor(url: string, size: number, isUserAdded: boolean, cachedModel?: Model);
  
  get hfModel(): string;
  get hfPath(): string;
  clone(overwrite: Partial<DisplayedModel>): DisplayedModel;
}


export declare function getPresetModels(cachedModels: Model[]): DisplayedModel[];
export declare function getDisplayedModels(cachedModels: Model[]): DisplayedModel[]; 