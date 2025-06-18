import React, { useState, useEffect, useCallback } from 'react';
import {
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
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
  IonCheckbox,
} from '@ionic/react';
import {
  trophyOutline,
  checkmarkCircleOutline,
  flagOutline,
  chevronDownOutline,
  chevronUpOutline,
  trashOutline,
} from 'ionicons/icons';
import './Goals.css';
import { useDatabase } from '../contexts/DatabaseContext';
import { DatabaseService } from '../services/db';
import { Goal as DBGoal, Subgoal as DBSubgoal } from '../services/db/DatabaseSchema';

const Goals: React.FC = () => {
  const { isReady } = useDatabase();
  const [goals, setGoals] = useState<(DBGoal & { subgoals: DBSubgoal[] })[]>([]);
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());

  const fetchGoals = useCallback(async () => {
    if (isReady) {
      try {
        const dbService = DatabaseService.getInstance();
        const fetchedGoals = await dbService.getAllGoals();
        const goalsWithSubgoals = await Promise.all(fetchedGoals.map(async (goal) => {
          const subgoals = await dbService.getSubgoalsByGoalId(goal.id);
          return { ...goal, subgoals };
        }));
        setGoals(goalsWithSubgoals);
      } catch (error) {
        console.error('Error fetching goals and subgoals:', error);
      }
    }
  }, [isReady]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const toggleGoalExpansion = (goalId: number) => {
    setExpandedGoals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const handleSubgoalCompletionChange = async (goalId: number, subgoal: DBSubgoal, completed: boolean) => {
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.updateSubgoal({ id: subgoal.id, completed: completed ? 1 : 0 });

      // Update main goal's current_value based on subgoal completion
      const updatedGoals = goals.map(g => {
        if (g.id === goalId) {
          const updatedSubgoals = g.subgoals.map(s => s.id === subgoal.id ? { ...s, completed: completed ? 1 : 0 } : s);
          const completedSubgoalsCount = updatedSubgoals.filter(s => s.completed === 1).length;
          const newCurrentValue = (completedSubgoalsCount / updatedSubgoals.length) * g.target_value;
          dbService.updateGoal({ id: goalId, current_value: newCurrentValue });
          return { ...g, current_value: newCurrentValue, subgoals: updatedSubgoals };
        }
        return g;
      });
      setGoals(updatedGoals);
    } catch (error) {
      console.error('Error updating subgoal or goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.deleteGoal(goalId);
      setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleDeleteSubgoal = async (goalId: number, subgoalId: number) => {
    try {
      const dbService = DatabaseService.getInstance();
      await dbService.deleteSubgoal(subgoalId);
      setGoals(prevGoals =>
        prevGoals.map(goal => {
          if (goal.id === goalId) {
            const updatedSubgoals = goal.subgoals.filter(sub => sub.id !== subgoalId);
            return { ...goal, subgoals: updatedSubgoals };
          }
          return goal;
        })
      );
    } catch (error) {
      console.error('Error deleting subgoal:', error);
    }
  };

  const getProgressColor = (current: number, target: number) => {
    const progress = current / target;
    if (progress >= 1) return 'success';
    if (progress >= 0.75) return 'warning';
    return 'danger';
  };

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
              {goals.length === 0 ? (
                <p>No goals found. Start by adding a new goal from the dashboard chat!</p>
              ) : (
                goals.map((goal) => (
                  <IonItemSliding key={goal.id}>
                    <IonItemOptions side="end">
                      <IonItemOption color="danger" onClick={() => handleDeleteGoal(goal.id)}>
                        <IonIcon slot="icon-only" icon={trashOutline} />
                      </IonItemOption>
                    </IonItemOptions>
                  <div className="goal-item" key={goal.id}>
                    <div className="goal-header">
                      <IonIcon icon={goal.category === 'Work' ? trophyOutline : goal.category === 'Personal' ? flagOutline : checkmarkCircleOutline} color="warning" />
                      <h2>{goal.title}</h2>
                    </div>
                    <div className="goal-progress">
                      <div className="progress-info">
                        <span>Progress: {((goal.current_value / goal.target_value) * 100).toFixed(0)}%</span>
                        {goal.due_date && <span>Due: {new Date(goal.due_date).toLocaleDateString()}</span>}
                      </div>
                      <IonProgressBar
                        value={goal.current_value / goal.target_value}
                        color={getProgressColor(goal.current_value, goal.target_value)}
                      ></IonProgressBar>
                    </div>
                    <div className="goal-tags">
                      {parseFloat(((goal.current_value / goal.target_value) * 100).toFixed(0)) >= 100 && <IonChip color="success">Completed</IonChip>}
                      {parseFloat(((goal.current_value / goal.target_value) * 100).toFixed(0)) >= 75 && parseFloat(((goal.current_value / goal.target_value) * 100).toFixed(0)) < 100 && <IonChip color="warning">Almost Done</IonChip>}
                      {parseFloat(((goal.current_value / goal.target_value) * 100).toFixed(0)) < 75 && parseFloat(((goal.current_value / goal.target_value) * 100).toFixed(0)) > 0 && <IonChip color="medium">In Progress</IonChip>}
                      {parseFloat(((goal.current_value / goal.target_value) * 100).toFixed(0)) === 0 && <IonChip color="danger">Not Started</IonChip>}
                      <IonChip color="tertiary">{goal.category}</IonChip>
                    </div>
                    {goal.subgoals.length > 0 && (
                      <div className="subgoals-toggle" onClick={() => toggleGoalExpansion(goal.id)}>
                        <IonIcon icon={expandedGoals.has(goal.id) ? chevronUpOutline : chevronDownOutline} />
                        <IonLabel>{expandedGoals.has(goal.id) ? 'Hide Subgoals' : 'Show Subgoals'}</IonLabel>
                      </div>
                    )}
                    {expandedGoals.has(goal.id) && goal.subgoals.length > 0 && (
                      <div className="subgoals-list">
                        {goal.subgoals.map((subgoal) => (
                          <IonItemSliding key={subgoal.id}>
                            <IonItemOptions side="end">
                              <IonItemOption color="danger" onClick={() => handleDeleteSubgoal(goal.id, subgoal.id)}>
                                <IonIcon slot="icon-only" icon={trashOutline} />
                              </IonItemOption>
                            </IonItemOptions>
                            <div className="subgoal-item">
                              <IonCheckbox
                                checked={subgoal.completed === 1}
                                onIonChange={(e) => handleSubgoalCompletionChange(goal.id, subgoal, e.detail.checked)}
                              />
                              <IonLabel>{subgoal.title}</IonLabel>
                            </div>
                          </IonItemSliding>
                        ))}
                      </div>
                    )}
                  </div>
                  </IonItemSliding>
                ))
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Goals;