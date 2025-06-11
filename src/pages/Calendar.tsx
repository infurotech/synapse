import React, { useMemo, useState, useEffect } from 'react';

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
  IonGrid,
  IonRow,
  IonCol,
  IonButton
} from '@ionic/react';
import {
  chevronBackOutline,
  chevronForwardOutline,
  timeOutline,
  locationOutline
} from 'ionicons/icons';

import './Calendar.css';

type Event = {
  title: string;
  time: string;
  location: string;
  date: string;
};

const Calendar: React.FC = () => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [highlightedDate, setHighlightedDate] = useState<{ date: number; month: number; year: number }>({
    date: today.getDate(),
    month: today.getMonth(),
    year: today.getFullYear()
  });
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  const events: Event[] = [
    { title: 'Team Standup', time: '9:00 AM - 9:30 AM', location: 'Conference Room A', date: '5/6/2025' },
    { title: 'Project Review', time: '2:00 PM - 3:00 PM', location: 'Virtual Meeting', date: '6/6/2025' },
    { title: 'Project Review', time: '2:00 PM - 3:00 PM', location: 'Virtual Meeting', date: '10/6/2025' },
  ];

  useEffect(() => {
    const currentDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const filtered = events.filter((event) => event.date === currentDate);
    setFilteredEvents(filtered);
  }, []);

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handlePreviousYear = () => {
    setCurrentYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    setCurrentYear((prev) => prev + 1);
  };

  const handleDateTask = (date: number | null) => {
    if (date !== null) {
      setHighlightedDate({ date, month: currentMonth, year: currentYear });
      const selectedDate = `${date}/${currentMonth + 1}/${currentYear}`;
      const filtered = events.filter((event) => event.date === selectedDate);
      setFilteredEvents(filtered);
    }
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const days = [];
    const startingDay = firstDay.getDay();

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [currentMonth, currentYear]);

  const weeks = useMemo(() => {
    const weekArray = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weekArray.push(calendarDays.slice(i, i + 7));
    }
    return weekArray;
  }, [calendarDays]);

  const isHighlighted = (date: number | null) => {
    return (
      highlightedDate !== null &&
      date !== null &&
      date === highlightedDate.date &&
      currentMonth === highlightedDate.month &&
      currentYear === highlightedDate.year
    );
  };

  const hasEvent = (date: number | null) => {
    if (date === null) return false;
    const formattedDate = `${date}/${currentMonth + 1}/${currentYear}`;
    return events.some(event => event.date === formattedDate);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
              <div className="calendar-controls">
                <IonButton fill="clear" onClick={handlePreviousYear}>
                  <span className="nav-icon" style={{ fontSize: '24px' }}>{'«'}</span>
                </IonButton>

                <IonButton fill="clear" onClick={handlePreviousMonth}>
                  <span className="nav-icon" style={{ fontSize: '24px' }}>{'‹'}</span>
                </IonButton>

                <div className="month-year">
                  <span>{monthNames[currentMonth]}</span>
                  <span style={{ marginLeft: '6px' }}>{currentYear}</span>
                </div>

                <IonButton fill="clear" onClick={handleNextMonth}>
                  <span className="nav-icon" style={{ fontSize: '24px' }}> {'›'}</span>
                </IonButton>

                <IonButton fill="clear" onClick={handleNextYear}>
                  <span className="nav-icon" style={{ fontSize: '24px' }}>{'»'}</span>
                </IonButton>
              </div>

              <div className="month-grid">
                <IonGrid>
                  <IonRow className="weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <IonCol key={day}>{day}</IonCol>
                    ))}
                  </IonRow>

                  {weeks.map((week, weekIndex) => (
                    <IonRow key={weekIndex}>
                      {week.map((date, dateIndex) => {
                        const isToday = isHighlighted(date);
                        const isEventDate = hasEvent(date);

                        return (
                          <IonCol
                            key={`${weekIndex}-${dateIndex}`}
                            className={isToday ? 'highlighted' : ''}
                            onClick={() => handleDateTask(date)}
                          >
                            <div style={{ position: 'relative', textAlign: 'center' }}>
                              <div>{date}</div>
                              {isEventDate && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    // bottom: 4,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: 'red',
                                    zIndex: 1,
                                  }}
                                />
                              )}
                            </div>
                          </IonCol>
                        );
                      })}
                    </IonRow>
                  ))}
                </IonGrid>
              </div>
            </IonCardContent>
          </IonCard>

          <h2 className="section-title">Events for Selected Date</h2>
          <IonCard className="events-section">
            <IonCardContent>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event, index) => (
                  <div key={index} className="event-item">
                    <div className="event-content">
                      <h2>{event.title}</h2>
                      <p><IonIcon icon={timeOutline} /> {event.time}</p>
                      <p><IonIcon icon={locationOutline} /> {event.location}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p>No events for this date.</p>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Calendar;
