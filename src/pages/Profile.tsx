import React from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonToggle,
} from '@ionic/react';
import {
  personOutline,
  notificationsOutline,
  moonOutline,
  sunnyOutline,
  phonePortraitOutline,
  lockClosedOutline,
  helpCircleOutline,
  logOutOutline,
} from 'ionicons/icons';
import { useTheme } from '../contexts/ThemeContext';
import './Profile.css';

const Profile: React.FC = () => {
  const { toggleTheme, currentTheme } = useTheme();

  const getThemeIcon = (mode: string) => {
    switch (mode) {
      case 'light': return sunnyOutline;
      case 'dark': return moonOutline;
      case 'system': return phonePortraitOutline;
      default: return moonOutline;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="profile-content">
        <div className="profile-container">
          <IonCard className="profile-header">
            <IonCardContent>
              <div className="profile-info">
                <div className="profile-avatar">
                  JD
                </div>
                <h2>John Doe</h2>
                <p>john.doe@example.com</p>
              </div>
            </IonCardContent>
          </IonCard>

          <h2 className="section-title">Settings</h2>
          <IonCard className="profile-settings">
            <IonCardContent>
              <div className="setting-item">
                <div className="setting-header">
                  <IonIcon icon={personOutline} />
                  <div className="setting-content">
                    <span>Edit Profile</span>
                  </div>
                </div>
              </div>
              
              <div className="setting-item">
                <div className="setting-header">
                  <IonIcon icon={notificationsOutline} />
                  <div className="setting-content">
                    <span>Notifications</span>
                  </div>
                  <IonToggle checked={true}></IonToggle>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-header">
                  <IonIcon icon={getThemeIcon(currentTheme.mode)} />
                  <div className="setting-content">
                    <span>Dark Mode</span>
                  </div>
                  <IonToggle 
                    checked={currentTheme.mode === 'dark'}
                    onIonChange={() => toggleTheme()}
                  ></IonToggle>
                </div>
              </div>
              
              <div className="setting-item">
                <div className="setting-header">
                  <IonIcon icon={lockClosedOutline} />
                  <div className="setting-content">
                    <span>Privacy Settings</span>
                  </div>
                </div>
              </div>
              
              <div className="setting-item">
                <div className="setting-header">
                  <IonIcon icon={helpCircleOutline} />
                  <div className="setting-content">
                    <span>Help & Support</span>
                  </div>
                </div>
              </div>

              <div className="setting-item logout-item">
                <div className="setting-header">
                  <IonIcon icon={logOutOutline} />
                  <div className="setting-content">
                    <span>Logout</span>
                  </div>
                </div>

              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Profile; 