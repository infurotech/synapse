import React, { useState } from 'react';
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
  IonBadge,
  IonFab,
  IonFabButton,
} from '@ionic/react';
import {
  checkmarkCircleOutline,
  timeOutline,
  flagOutline,
  chatbubbleOutline,
} from 'ionicons/icons';
import './Tasks.css';

const Tasks: React.FC = () => {
  
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>Tasks</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="tasks-content">
        <div className="tasks-container">
          <h2 className="section-title">Your Tasks</h2>
          <IonCard className="tasks-section">
            <IonCardContent>
              <div className="task-item">
                <div className="task-header">
                  <IonIcon icon={checkmarkCircleOutline} color="success" />
                  <div className="task-content">
                    <h2>Complete Project Proposal</h2>
                    <p>Due today at 5:00 PM</p>
                  </div>
                  <IonBadge color="primary">High</IonBadge>
                </div>
              </div>

              <div className="task-item">
                <div className="task-header">
                  <IonIcon icon={timeOutline} color="warning" />
                  <div className="task-content">
                    <h2>Team Meeting Preparation</h2>
                    <p>Tomorrow at 10:00 AM</p>
                  </div>
                  <IonBadge color="medium">Medium</IonBadge>
                </div>
              </div>

              <div className="task-item">
                <div className="task-header">
                  <IonIcon icon={flagOutline} color="tertiary" />
                  <div className="task-content">
                    <h2>Review Q4 Goals</h2>
                    <p>Next week</p>
                  </div>
                  <IonBadge color="light">Low</IonBadge>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* AI Assistant */}
        </div>
        
      </IonContent>
    </IonPage>
  );
};

export default Tasks; 
