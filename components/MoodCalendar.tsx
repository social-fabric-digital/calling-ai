import { BodyStyle, HeadingStyle } from '@/constants/theme';
import {
  getDayNames,
  getMoodsForWeek,
  getWeekLabel,
  getWeekStart,
  isToday,
  MoodEntry,
} from '@/utils/moodStorage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Brand colors
const brandColors = {
  primary: '#342846',
  secondary: '#bfacca',
  text: '#342846',
  light: 'rgba(52, 40, 70, 0.1)',
  border: 'rgba(52, 40, 70, 0.15)',
};

interface MoodCalendarProps {
  onRefresh?: () => void;
}

export function MoodCalendar({ onRefresh }: MoodCalendarProps) {
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart());
  const [weekMoods, setWeekMoods] = useState<(MoodEntry | null)[]>(Array(7).fill(null));
  const [weekLabel, setWeekLabel] = useState<string>('This Week');
  
  const loadWeekMoods = useCallback(async () => {
    const moods = await getMoodsForWeek(weekStart);
    setWeekMoods(moods);
    setWeekLabel(getWeekLabel(weekStart));
  }, [weekStart]);
  
  // Initial load on mount
  useEffect(() => {
    loadWeekMoods();
  }, []);
  
  // Reload moods when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWeekMoods();
    }, [loadWeekMoods])
  );
  
  // Also reload when weekStart changes
  useEffect(() => {
    loadWeekMoods();
  }, [weekStart]);
  
  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setWeekStart(newWeekStart);
  };
  
  // Navigate to next week
  const goToNextWeek = () => {
    const thisWeekStart = getWeekStart();
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    
    // Don't allow going beyond current week
    if (newWeekStart.getTime() <= thisWeekStart.getTime()) {
      setWeekStart(newWeekStart);
    }
  };
  
  // Check if we can go to next week
  const canGoNext = () => {
    const thisWeekStart = getWeekStart();
    return weekStart.getTime() < thisWeekStart.getTime();
  };
  
  const dayNames = getDayNames();
  
  // Get dates for the week
  const getWeekDates = (): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };
  
  const weekDates = getWeekDates();
  
  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={goToPreviousWeek}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>{'<'}</Text>
        </TouchableOpacity>
        
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        
        <TouchableOpacity 
          style={[styles.navButton, !canGoNext() && styles.navButtonDisabled]} 
          onPress={goToNextWeek}
          activeOpacity={canGoNext() ? 0.7 : 1}
          disabled={!canGoNext()}
        >
          <Text style={[styles.navButtonText, !canGoNext() && styles.navButtonTextDisabled]}>{'>'}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Days Grid */}
      <View style={styles.daysContainer}>
        {dayNames.map((day, index) => {
          const date = weekDates[index];
          const mood = weekMoods[index];
          const isTodayDate = isToday(date);
          
          return (
            <View key={day} style={styles.dayColumn}>
              {/* Day name */}
              <Text style={[styles.dayName, isTodayDate && styles.dayNameToday]}>
                {day}
              </Text>
              
              {/* Day number */}
              <Text style={[styles.dayNumber, isTodayDate && styles.dayNumberToday]}>
                {date.getDate()}
              </Text>
              
              {/* Mood emoji or placeholder */}
              <View style={[
                styles.moodContainer,
                isTodayDate && styles.moodContainerToday,
                mood && styles.moodContainerWithMood,
              ]}>
                {mood ? (
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                ) : (
                  <View style={styles.moodPlaceholder}>
                    <Text style={styles.moodPlaceholderText}>-</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: brandColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brandColors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(52, 40, 70, 0.05)',
  },
  navButtonText: {
    ...HeadingStyle,
    fontSize: 18,
    color: brandColors.primary,
    fontWeight: 'bold',
  },
  navButtonTextDisabled: {
    color: 'rgba(52, 40, 70, 0.3)',
  },
  weekLabel: {
    ...HeadingStyle,
    fontSize: 16,
    color: brandColors.primary,
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayName: {
    ...BodyStyle,
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayNameToday: {
    color: brandColors.primary,
    fontWeight: '600',
  },
  dayNumber: {
    ...BodyStyle,
    fontSize: 14,
    color: brandColors.text,
    marginBottom: 8,
  },
  dayNumberToday: {
    fontWeight: 'bold',
    color: brandColors.primary,
  },
  moodContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 40, 70, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodContainerToday: {
    borderWidth: 2,
    borderColor: brandColors.primary,
  },
  moodContainerWithMood: {
    backgroundColor: 'rgba(52, 40, 70, 0.1)',
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodPlaceholderText: {
    ...BodyStyle,
    fontSize: 18,
    color: '#ccc',
  },
});
