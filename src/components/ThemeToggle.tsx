import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'small' | 'default' | 'large';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', size = 'default' }) => {
  const { currentTheme, toggleTheme } = useTheme();

  const getButtonSize = () => {
    switch (size) {
      case 'small': return { width: '32px', height: '32px' };
      case 'large': return { width: '48px', height: '48px' };
      default: return { width: '40px', height: '40px' };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return '16px';
      case 'large': return '24px';
      default: return '20px';
    }
  };

  return (
    <IonButton
      fill="clear"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      style={getButtonSize()}
      title={`Switch to ${currentTheme.mode === 'dark' ? 'light' : 'dark'} mode`}
    >
      <IonIcon 
        icon={currentTheme.mode === 'dark' ? sunnyOutline : moonOutline}
        style={{ fontSize: getIconSize() }}
      />
    </IonButton>
  );
};

export default ThemeToggle; 