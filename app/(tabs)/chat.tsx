import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatScreenComponent from '@/components/screens/ChatScreen';

export default function ChatScreen() {
  const [userName, setUserName] = useState<string>('');
  const [goalTitle, setGoalTitle] = useState<string>('');
  const [goalStepLabel, setGoalStepLabel] = useState<string>('');
  const [goalStepNumber, setGoalStepNumber] = useState<number | undefined>(undefined);
  const [totalGoalSteps, setTotalGoalSteps] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Load user name and goal title from storage
    const loadUserData = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        const goalsData = await AsyncStorage.getItem('userGoals');
        if (storedName) {
          setUserName(storedName);
        }
        if (goalsData) {
          const goals = JSON.parse(goalsData);
          const activeGoal = goals.find((g: any) => g.isActive === true);
          if (activeGoal) {
            setGoalTitle(activeGoal.name);
            const steps = Array.isArray(activeGoal.steps) ? activeGoal.steps : [];
            const totalSteps = steps.length > 0 ? Math.min(steps.length, 4) : 4;
            const stepIndex =
              typeof activeGoal.currentStepIndex === 'number' ? activeGoal.currentStepIndex : -1;
            const isCompleted = stepIndex >= totalSteps - 1;
            const currentStepNumber = isCompleted
              ? totalSteps
              : Math.min(Math.max(stepIndex + 2, 1), totalSteps);

            setTotalGoalSteps(totalSteps);
            setGoalStepNumber(currentStepNumber);

            const stepName =
              steps[currentStepNumber - 1]?.name || steps[currentStepNumber - 1]?.text || '';
            if (stepName) {
              setGoalStepLabel(stepName);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  return (
    <ChatScreenComponent
      onClose={() => router.back()}
      userName={userName}
      goalTitle={goalTitle}
      goalStepLabel={goalStepLabel}
      goalStepNumber={goalStepNumber}
      totalGoalSteps={totalGoalSteps}
    />
  );
}
