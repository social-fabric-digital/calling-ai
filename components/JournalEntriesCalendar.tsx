import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { getDayNames, getWeekLabel, getWeekStart, isToday } from '@/utils/moodStorage';
import { UserAnswer } from '@/utils/claudeApi';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface JournalEntriesCalendarProps {
  entries: UserAnswer[];
  onSelectEntryDate?: (dateKey: string) => void;
}

const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function JournalEntriesCalendar({ entries, onSelectEntryDate }: JournalEntriesCalendarProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'ru' || i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US';
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart());

  const entriesByDate = useMemo(() => {
    const dates = new Set<string>();
    entries.forEach((entry) => {
      if (entry.date) dates.add(entry.date);
    });
    return dates;
  }, [entries]);

  const dayNames = getDayNames(locale);
  const weekLabel = getWeekLabel(weekStart, locale);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [weekStart]);

  const goToPreviousWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() - 7);
    setWeekStart(next);
  };

  const goToNextWeek = () => {
    const thisWeekStart = getWeekStart();
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    if (next.getTime() <= thisWeekStart.getTime()) {
      setWeekStart(next);
    }
  };

  const canGoNext = weekStart.getTime() < getWeekStart().getTime();

  return (
    <View style={styles.container}>
      <FrostedCardLayer intensity={100} tint="light" fallbackColor="rgba(255, 255, 255, 0.34)" />
      <View pointerEvents="none" style={styles.glassTint} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={goToPreviousWeek} activeOpacity={0.7}>
          <Text style={styles.navButtonText}>{'←'}</Text>
        </TouchableOpacity>

        <Text style={styles.weekLabel}>{weekLabel}</Text>

        <TouchableOpacity
          style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
          onPress={goToNextWeek}
          activeOpacity={canGoNext ? 0.7 : 1}
          disabled={!canGoNext}
        >
          <Text style={[styles.navButtonText, !canGoNext && styles.navButtonTextDisabled]}>{'→'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.daysContainer}>
        {dayNames.map((day, index) => {
          const date = weekDates[index];
          const dateKey = toDateKey(date);
          const hasEntry = entriesByDate.has(dateKey);
          const isTodayDate = isToday(date);

          return (
            <View key={`${day}-${dateKey}`} style={styles.dayColumn}>
              <Text style={[styles.dayName, isTodayDate && styles.dayNameToday]}>{day}</Text>
              <Text style={[styles.dayNumber, isTodayDate && styles.dayNumberToday]}>{date.getDate()}</Text>
              <TouchableOpacity
                style={[styles.entryContainer, isTodayDate && styles.entryContainerToday, hasEntry && styles.entryContainerFilled]}
                activeOpacity={hasEntry ? 0.75 : 1}
                disabled={!hasEntry}
                onPress={() => {
                  if (!hasEntry || !onSelectEntryDate) return;
                  onSelectEntryDate(dateKey);
                }}
              >
                {hasEntry ? (
                  <MaterialIcons name="description" size={18} color="#342846" />
                ) : (
                  <Text style={styles.entryPlaceholder}>-</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.98)',
    overflow: 'hidden',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 9,
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
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
    backgroundColor: 'rgba(52, 40, 70, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(52, 40, 70, 0.05)',
  },
  navButtonText: {
    ...BodyStyle,
    fontSize: 11,
    lineHeight: 11,
    color: '#342846',
    textTransform: 'none',
  },
  navButtonTextDisabled: {
    color: 'rgba(52, 40, 70, 0.3)',
  },
  weekLabel: {
    ...HeadingStyle,
    fontSize: 16,
    color: '#342846',
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
    ...HeadingStyle,
    fontSize: 11,
    color: 'rgba(52, 40, 70, 0.72)',
    marginBottom: 4,
    textTransform: 'none',
  },
  dayNameToday: {
    color: '#342846',
    fontWeight: '600',
  },
  dayNumber: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    marginBottom: 8,
  },
  dayNumberToday: {
    fontWeight: 'bold',
    color: '#342846',
  },
  entryContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 40, 70, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryContainerToday: {
    borderWidth: 2,
    borderColor: '#342846',
  },
  entryContainerFilled: {
    backgroundColor: 'rgba(52, 40, 70, 0.16)',
    shadowColor: '#7D5BA6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  entryPlaceholder: {
    ...BodyStyle,
    fontSize: 18,
    color: '#9a9a9a',
  },
});
