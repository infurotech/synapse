import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton
} from '@ionic/react';
import DatabaseInspector from '../components/DatabaseInspector';

const DatabaseDebugPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/profile" />
          </IonButtons>
          <IonTitle>Database Inspector</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Database Inspector</IonTitle>
          </IonToolbar>
        </IonHeader>
        <div style={{ padding: '1rem' }}>
          <DatabaseInspector />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DatabaseDebugPage; 