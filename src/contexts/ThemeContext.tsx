import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  gradientPrimary: string;
  gradientSecondary: string;
  gradientDark: string;
  glassBackground: string;
  glassBorder: string;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

// Predefined themes
export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    primary: '#6C5CE7',
    secondary: '#00CEC9',
    success: '#00B894',
    warning: '#FDCB6E',
    danger: '#E17055',
    background: '#0D1421',
    surface: 'rgba(255, 255, 255, 0.05)',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
    gradientPrimary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradientSecondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    gradientDark: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 100%)',
    glassBackground: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  }
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#6C5CE7',
    secondary: '#00CEC9',
    success: '#00B894',
    warning: '#F39C12',
    danger: '#E74C3C',
    background: '#F8F9FA',
    surface: 'rgba(255, 255, 255, 0.95)',
    text: '#1A1A1A',
    textSecondary: 'rgba(26, 26, 26, 0.8)',
    border: 'rgba(0, 0, 0, 0.15)',
    gradientPrimary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradientSecondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    gradientDark: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    glassBackground: 'rgba(255, 255, 255, 0.9)',
    glassBorder: 'rgba(0, 0, 0, 0.15)',
  }
};

// Theme context interface
interface ThemeContextType {
  currentTheme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  applyTheme: (theme: Theme) => void;
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [currentTheme, setCurrentTheme] = useState<Theme>(darkTheme);

  // Apply CSS custom properties
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    // Apply Ionic color variables
    root.style.setProperty('--ion-color-primary', theme.colors.primary);
    root.style.setProperty('--ion-color-secondary', theme.colors.secondary);
    root.style.setProperty('--ion-color-success', theme.colors.success);
    root.style.setProperty('--ion-color-warning', theme.colors.warning);
    root.style.setProperty('--ion-color-danger', theme.colors.danger);
    
    // Apply background colors
    root.style.setProperty('--ion-background-color', theme.colors.background);
    root.style.setProperty('--ion-text-color', theme.colors.text);
    
    // Apply custom theme variables
    root.style.setProperty('--background', theme.colors.background);
    root.style.setProperty('--surface-color', theme.colors.surface);
    root.style.setProperty('--text-color', theme.colors.text);
    root.style.setProperty('--text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--border-color', theme.colors.border);
    
    // Apply gradients
    root.style.setProperty('--cred-gradient-primary', theme.colors.gradientPrimary);
    root.style.setProperty('--cred-gradient-secondary', theme.colors.gradientSecondary);
    root.style.setProperty('--cred-gradient-dark', theme.colors.gradientDark);
    
    // Apply glass morphism
    root.style.setProperty('--glass-bg', theme.colors.glassBackground);
    root.style.setProperty('--glass-border', theme.colors.glassBorder);
    
    // Update body class for additional styling
    document.body.className = theme.mode === 'dark' ? 'dark-theme' : 'light-theme';
  };

  // Get system theme preference
  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Set theme mode and apply corresponding theme
  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('theme-mode', mode);
    
    let targetTheme: Theme;
    if (mode === 'system') {
      targetTheme = getSystemTheme() === 'dark' ? darkTheme : lightTheme;
    } else {
      targetTheme = mode === 'dark' ? darkTheme : lightTheme;
    }
    
    setCurrentTheme(targetTheme);
    applyTheme(targetTheme);
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    const newMode = currentTheme.mode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  // Load saved theme on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode || 'dark';
    setThemeMode(savedMode);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'system') {
        const systemTheme = getSystemTheme();
        const targetTheme = systemTheme === 'dark' ? darkTheme : lightTheme;
        setCurrentTheme(targetTheme);
        applyTheme(targetTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const contextValue: ThemeContextType = {
    currentTheme,
    themeMode,
    setThemeMode,
    toggleTheme,
    applyTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 