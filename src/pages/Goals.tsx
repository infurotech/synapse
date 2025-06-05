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
  IonProgressBar,
  IonChip,
  IonLabel,
} from '@ionic/react';
import {
  trophyOutline,
  timeOutline,
  checkmarkCircleOutline,
  flagOutline,
} from 'ionicons/icons';
import './Goals.css';

const Goals: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>Goals</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="goals-content">
        <div className="goals-container">
          <h2 className="section-title">Your Goals</h2>
          <IonCard className="goals-section">
            <IonCardContent>
              <div className="goal-item">
                <div className="goal-header">
                  <IonIcon icon={trophyOutline} color="warning" />
                  <h2>Complete Project Milestones</h2>
                </div>
                <div className="goal-progress">
                  <div className="progress-info">
                    <span>Progress: 75%</span>
                    <span>Due in 2 weeks</span>
                  </div>
                  <IonProgressBar value={0.75}></IonProgressBar>
                </div>
                <div className="goal-tags">
                  <IonChip color="primary">Work</IonChip>
                  <IonChip color="success">On Track</IonChip>
                </div>
              </div>

              <div className="goal-item">
                <div className="goal-header">
                  <IonIcon icon={flagOutline} color="tertiary" />
                  <h2>Learn New Technology</h2>
                </div>
                <div className="goal-progress">
                  <div className="progress-info">
                    <span>Progress: 40%</span>
                    <span>Due in 1 month</span>
                  </div>
                  <IonProgressBar value={0.4}></IonProgressBar>
                </div>
                <div className="goal-tags">
                  <IonChip color="tertiary">Personal</IonChip>
                  <IonChip color="warning">In Progress</IonChip>
                </div>
              </div>

              <div className="goal-item">
                <div className="goal-header">
                  <IonIcon icon={checkmarkCircleOutline} color="success" />
                  <h2>Fitness Goal</h2>
                </div>
                <div className="goal-progress">
                  <div className="progress-info">
                    <span>Progress: 90%</span>
                    <span>Due in 1 week</span>
                  </div>
                  <IonProgressBar value={0.9}></IonProgressBar>
                </div>
                <div className="goal-tags">
                  <IonChip color="success">Health</IonChip>
                  <IonChip color="success">Almost Done</IonChip>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Goals; 