import React, { useMemo } from 'react';
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
  IonList,
  IonItem,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import {
  calendarOutline,
  timeOutline,
  locationOutline,
} from 'ionicons/icons';
import './Calendar.css';

const Calendar: React.FC = () => {
  const calendarDays = useMemo(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const days = [];
    const startingDay = firstDay.getDay(); // 0-6 (Sunday-Saturday)
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }
    
    // Add empty cells to complete the last week if needed
    while (days.length % 7 !== 0) {
      days.push(null);
    }
    
    return days;
  }, []);

  const weeks = useMemo(() => {
    const weekArray = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weekArray.push(calendarDays.slice(i, i + 7));
    }
    return weekArray;
  }, [calendarDays]);

  const today = new Date().getDate();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>Calendar</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="calendar-content">
        <div className="calendar-container">
          <IonCard className="calendar-section">
            <IonCardContent>
              <div className="month-grid">
                <IonGrid>
                  <IonRow className="weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <IonCol key={day}>{day}</IonCol>
                    ))}
                  </IonRow>
                  {weeks.map((week, weekIndex) => (
                    <IonRow key={weekIndex}>
                      {week.map((date, dateIndex) => (
                        <IonCol key={`${weekIndex}-${dateIndex}`} className={date === today ? 'today' : ''}>
                          {date}
                        </IonCol>
                      ))}
                    </IonRow>
                  ))}
                </IonGrid>
              </div>
            </IonCardContent>
          </IonCard>

          <h2 className="section-title">Today's Events</h2>
          <IonCard className="events-section">
            <IonCardContent>
              <div className="event-item">
                <div className="event-content">
                  <h2>Team Standup</h2>
                  <p><IonIcon icon={timeOutline} /> 9:00 AM - 9:30 AM</p>
                  <p><IonIcon icon={locationOutline} /> Conference Room A</p>
                </div>
              </div>
              
              <div className="event-item">
                <div className="event-content">
                  <h2>Project Review</h2>
                  <p><IonIcon icon={timeOutline} /> 2:00 PM - 3:00 PM</p>
                  <p><IonIcon icon={locationOutline} /> Virtual Meeting</p>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Calendar; 