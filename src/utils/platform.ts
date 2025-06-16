import { Capacitor } from '@capacitor/core';

export const isWebOrWebView = (): boolean => {
  return Capacitor.getPlatform() === 'web' || Capacitor.isPluginAvailable('WebView');
}; 