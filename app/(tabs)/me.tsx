import { MoodCalendar } from '@/components/MoodCalendar';
import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { UserAnswer, generateLevelStepInstructions } from '@/utils/claudeApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface Badge {
  id: string;
  name: string;
  description: string;
  dateEarned: string;
  icon: string;
  badgeNumber?: number;
}

interface CompletedGoal {
  id: string;
  name: string;
  dateCompleted: string;
  dateStarted?: string;
}

interface SavedInsight {
  id: string;
  timestamp: string;
  insight: string;
  thoughts: any[];
  title?: string;
}

// Badge image mapping - maps badge numbers to image paths (using 1.png-30.png from Downloads)
const badgeImageMap: { [key: number]: any } = {
  1: require('../../assets/images/badges/1.png'),
  2: require('../../assets/images/badges/2.png'),
  3: require('../../assets/images/badges/3.png'),
  4: require('../../assets/images/badges/4.png'),
  5: require('../../assets/images/badges/5.png'),
  6: require('../../assets/images/badges/6.png'),
  7: require('../../assets/images/badges/7.png'),
  8: require('../../assets/images/badges/8.png'),
  9: require('../../assets/images/badges/9.png'),
  10: require('../../assets/images/badges/10.png'),
  11: require('../../assets/images/badges/11.png'),
  12: require('../../assets/images/badges/12.png'),
  13: require('../../assets/images/badges/13.png'),
  14: require('../../assets/images/badges/14.png'),
  15: require('../../assets/images/badges/15.png'),
  16: require('../../assets/images/badges/16.png'),
  17: require('../../assets/images/badges/17.png'),
  18: require('../../assets/images/badges/18.png'),
  19: require('../../assets/images/badges/19.png'),
  20: require('../../assets/images/badges/20.png'),
  21: require('../../assets/images/badges/21.png'),
  22: require('../../assets/images/badges/22.png'),
  23: require('../../assets/images/badges/23.png'),
  24: require('../../assets/images/badges/24.png'),
  25: require('../../assets/images/badges/25.png'),
  26: require('../../assets/images/badges/26.png'),
  27: require('../../assets/images/badges/27.png'),
  28: require('../../assets/images/badges/28.png'),
  29: require('../../assets/images/badges/29.png'),
  30: require('../../assets/images/badges/30.png'),
};

// Helper function to get badge image by number
const getBadgeImage = (badgeNumber?: number) => {
  if (badgeNumber && badgeImageMap[badgeNumber]) {
    return badgeImageMap[badgeNumber];
  }
  // Fallback to trophy if badge number not available
  return require('../../assets/images/trophy.png');
};

export default function MeScreen() {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  const locale = isRussian ? 'ru-RU' : 'en-US';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [completedGoals, setCompletedGoals] = useState<CompletedGoal[]>([]);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [newlyAddedBadgeId, setNewlyAddedBadgeId] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<SavedInsight | null>(null);
  const [showSavedInsightsModal, setShowSavedInsightsModal] = useState(false);
  const [showAnswersCalendarModal, setShowAnswersCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string>('');
  const [selectedCompletedGoal, setSelectedCompletedGoal] = useState<CompletedGoal | null>(null);
  const [goalDetails, setGoalDetails] = useState<any>(null);
  const [levelStepInstructions, setLevelStepInstructions] = useState<{ [levelNumber: number]: Array<{ text: string }> }>({});
  
  // User profile data for portfolio area
  const [userName, setUserName] = useState<string>('');
  const [zodiacSign, setZodiacSign] = useState<string>('');
  const [completedGoalsCount, setCompletedGoalsCount] = useState<number>(0);

  const localizeBadge = (badge: Badge): Badge => {
    switch (badge.id) {
      case 'streak_7':
        return {
          ...badge,
          name: tr('Weekly Warrior', 'Воин недели'),
          description: tr('7 day streak', 'Серия 7 дней'),
        };
      case 'streak_30':
        return {
          ...badge,
          name: tr('Master of the Month', 'Мастер месяца'),
          description: tr('30 day streak', 'Серия 30 дней'),
        };
      case 'streak_100':
        return {
          ...badge,
          name: tr('Century Champion', 'Чемпион сотни'),
          description: tr('100 day streak', 'Серия 100 дней'),
        };
      case 'answers_10':
        return {
          ...badge,
          name: tr('Path Beginning', 'Начало пути'),
          description: tr('10 answers submitted', 'Отправлено 10 ответов'),
        };
      case 'answers_50':
        return {
          ...badge,
          name: tr('Reflection Master', 'Мастер рефлексии'),
          description: tr('50 answers submitted', 'Отправлено 50 ответов'),
        };
      case 'answers_100':
        return {
          ...badge,
          name: tr('Wisdom Seeker', 'Искатель мудрости'),
          description: tr('100 answers submitted', 'Отправлено 100 ответов'),
        };
      default:
        return badge;
    }
  };
  
  // Calculate zodiac sign from birth date
  const calculateZodiacSign = (month: number, day: number): string => {
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return t('me.zodiacSigns.Aries');
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return t('me.zodiacSigns.Taurus');
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return t('me.zodiacSigns.Gemini');
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return t('me.zodiacSigns.Cancer');
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return t('me.zodiacSigns.Leo');
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return t('me.zodiacSigns.Virgo');
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return t('me.zodiacSigns.Libra');
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return t('me.zodiacSigns.Scorpio');
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return t('me.zodiacSigns.Sagittarius');
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return t('me.zodiacSigns.Capricorn');
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return t('me.zodiacSigns.Aquarius');
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return t('me.zodiacSigns.Pisces');
    return '';
  };
  
  // Animation refs for badge slamming effect
  const badgeAnimations = useRef<{ [key: string]: Animated.Value }>({});

  // Load user data on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      // Load answers from local storage first (offline fallback)
      const answersData = await AsyncStorage.getItem('userAnswers');
      const localAnswers: UserAnswer[] = answersData ? JSON.parse(answersData) : [];
      let resolvedAnswers: UserAnswer[] = localAnswers;

      // If logged in, sync with Supabase (cloud is source of truth)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: cloudAnswers } = await supabase
            .from('daily_answers')
            .select('question_text, answer_text, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100);

          if (cloudAnswers) {
            const localByDate = new Map(localAnswers.map((answer) => [answer.date, answer]));
            let shouldSyncLocal = false;

            for (const cloudAnswer of cloudAnswers) {
              if (!cloudAnswer.created_at) continue;

              const date = new Date(cloudAnswer.created_at).toISOString().split('T')[0];
              const existingLocal = localByDate.get(date);
              const normalizedCloudAnswer: UserAnswer = {
                date,
                question: cloudAnswer.question_text || '',
                answer: cloudAnswer.answer_text || '',
                // Keep local mood if present since mood is stored locally.
                mood: existingLocal?.mood,
              };

              if (!existingLocal) {
                shouldSyncLocal = true;
              } else if (
                existingLocal.question !== normalizedCloudAnswer.question ||
                existingLocal.answer !== normalizedCloudAnswer.answer
              ) {
                shouldSyncLocal = true;
              }

              localByDate.set(date, normalizedCloudAnswer);
            }

            resolvedAnswers = Array.from(localByDate.values())
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 100);

            if (shouldSyncLocal) {
              await AsyncStorage.setItem('userAnswers', JSON.stringify(resolvedAnswers));
            }
          }
        }
      } catch (syncError) {
        console.error('Error syncing daily answers from Supabase:', syncError);
      }
      setAnswers(resolvedAnswers);

      // Load badges
      const badgesData = await AsyncStorage.getItem('userBadges');
      if (badgesData) {
        const loadedBadges = JSON.parse(badgesData);
        const localizedBadges: Badge[] = (Array.isArray(loadedBadges) ? loadedBadges : []).map((badge: Badge) =>
          localizeBadge(badge)
        );
        setBadges(localizedBadges);
        await AsyncStorage.setItem('userBadges', JSON.stringify(localizedBadges));
        
        // Check for newly added badge
        const newlyAddedId = await AsyncStorage.getItem('newlyAddedBadgeId');
        if (newlyAddedId) {
          // Find the newly added badge
          const newBadge = localizedBadges.find((b: Badge) => b.id === newlyAddedId);
          if (newBadge) {
            // Clear the flag first
            await AsyncStorage.removeItem('newlyAddedBadgeId');
            // Set state and trigger animation after a small delay to ensure render
            setNewlyAddedBadgeId(newlyAddedId);
            setTimeout(() => {
              triggerBadgeAnimation(newlyAddedId);
            }, 100);
          }
        }
      }

      // Load completed goals
      const goalsData = await AsyncStorage.getItem('completedGoals');
      if (goalsData) {
        setCompletedGoals(JSON.parse(goalsData));
      }

      // Load user name
      const name = await AsyncStorage.getItem('userName');
      if (name) {
        setUserName(name);
      }

      // Load birth date and calculate zodiac sign
      const birthMonth = await AsyncStorage.getItem('birthMonth');
      const birthDate = await AsyncStorage.getItem('birthDate');
      if (birthMonth && birthDate) {
        const month = parseInt(birthMonth);
        const day = parseInt(birthDate);
        const zodiac = calculateZodiacSign(month, day);
        setZodiacSign(zodiac);
      }

      // Load completed goals count
      const completedGoalsData = await AsyncStorage.getItem('completedGoals');
      if (completedGoalsData) {
        const goals = JSON.parse(completedGoalsData);
        setCompletedGoalsCount(goals.length);
      } else {
        setCompletedGoalsCount(0);
      }

      // Load saved insights
      const savedInsightsData = await AsyncStorage.getItem('savedInsights');
      if (savedInsightsData) {
        const parsedSavedInsights = JSON.parse(savedInsightsData);
        const normalizedSavedInsights = (Array.isArray(parsedSavedInsights) ? parsedSavedInsights : []).map((item: any) => {
          const insightText =
            getInsightBodyText(item?.insight) ||
            getInsightBodyText(item?.ai_insight) ||
            getInsightBodyText(item);

          return {
            id: String(item?.id || Date.now()),
            timestamp: typeof item?.timestamp === 'string' ? item.timestamp : new Date().toISOString(),
            insight: insightText,
            thoughts: Array.isArray(item?.thoughts) ? item.thoughts : [],
            title: typeof item?.title === 'string' ? item.title : undefined,
          } as SavedInsight;
        });
        setSavedInsights(normalizedSavedInsights);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Trigger slamming animation for newly added badge
  const triggerBadgeAnimation = (badgeId: string) => {
    // Initialize animation if it doesn't exist
    if (!badgeAnimations.current[badgeId]) {
      badgeAnimations.current[badgeId] = new Animated.Value(-200);
    }
    
    const anim = badgeAnimations.current[badgeId];
    
    // Reset to start position (above screen)
    anim.setValue(-200);
    
    // Slamming animation: drop down with bounce
    Animated.sequence([
      // Drop down quickly with slam effect
      Animated.spring(anim, {
        toValue: 0,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      // Bounce up slightly
      Animated.spring(anim, {
        toValue: -8,
        tension: 150,
        friction: 4,
        useNativeDriver: true,
      }),
      // Settle into position
      Animated.spring(anim, {
        toValue: 0,
        tension: 120,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Clear animation state after animation completes
      setTimeout(() => {
        setNewlyAddedBadgeId(null);
        if (badgeAnimations.current[badgeId]) {
          delete badgeAnimations.current[badgeId];
        }
      }, 1000);
    });
  };

  // Load step instructions for completed levels
  const loadStepInstructionsForCompletedLevels = async (goalData: any) => {
    try {
      const currentStepIndex = goalData.currentStepIndex !== undefined ? goalData.currentStepIndex : -1;
      if (currentStepIndex < 0) return; // No levels completed
      
      // Load user data needed for generating step instructions
      const [
        birthMonth,
        birthDate,
        birthYear,
        birthCity,
        birthHour,
        birthMinute,
        birthPeriod,
        whatYouLove,
        whatYouGoodAt,
        whatWorldNeeds,
        whatCanBePaidFor,
        fearData,
        whatExcites,
      ] = await Promise.all([
        AsyncStorage.getItem('birthMonth'),
        AsyncStorage.getItem('birthDate'),
        AsyncStorage.getItem('birthYear'),
        AsyncStorage.getItem('birthCity'),
        AsyncStorage.getItem('birthHour'),
        AsyncStorage.getItem('birthMinute'),
        AsyncStorage.getItem('birthPeriod'),
        AsyncStorage.getItem('whatYouLove'),
        AsyncStorage.getItem('whatYouGoodAt'),
        AsyncStorage.getItem('whatWorldNeeds'),
        AsyncStorage.getItem('whatCanBePaidFor'),
        AsyncStorage.getItem('fear'),
        AsyncStorage.getItem('whatExcites'),
      ]);
      
      const goalName = goalData.name || '';
      const totalLevels = goalData.numberOfSteps || 4;
      const instructionsMap: { [levelNumber: number]: Array<{ text: string }> } = {};
      
      // Load step instructions for each completed level
      for (let levelNumber = 1; levelNumber <= currentStepIndex + 1 && levelNumber <= totalLevels; levelNumber++) {
        const levelStep = goalData.steps && goalData.steps[levelNumber - 1];
        const levelName = levelStep?.name || levelStep?.text || levelStep?.description || `Level ${levelNumber}`;
        
        try {
          // Try to load saved step instructions first
          const storageKey = `stepInstructions_${goalData.id}_${levelNumber}`;
          const savedInstructions = await AsyncStorage.getItem(storageKey);
          
          if (savedInstructions) {
            instructionsMap[levelNumber] = JSON.parse(savedInstructions);
          } else {
            // Generate step instructions if not saved
            const instructions = await generateLevelStepInstructions(
              goalName,
              levelNumber,
              levelName,
              totalLevels,
              birthMonth || '1',
              birthDate || '1',
              birthYear || '2000',
              birthCity || undefined,
              birthHour || undefined,
              birthMinute || undefined,
              birthPeriod || undefined,
              whatYouLove || undefined,
              whatYouGoodAt || undefined,
              whatWorldNeeds || undefined,
              whatCanBePaidFor || undefined,
              fearData || undefined,
              whatExcites || undefined
            );
            
            instructionsMap[levelNumber] = instructions;
            // Save for future use
            await AsyncStorage.setItem(storageKey, JSON.stringify(instructions));
          }
        } catch (error) {
          console.error(`Error loading step instructions for level ${levelNumber}:`, error);
        }
      }
      
      setLevelStepInstructions(instructionsMap);
    } catch (error) {
      console.error('Error loading step instructions:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateShort = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
  };

  const parseDateKey = (dateKey: string): Date => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
  };

  const toDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getCurrentWeekRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setDate(now.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const currentWeekAnswers = useMemo(() => {
    const { start, end } = getCurrentWeekRange();
    return answers.filter((answer) => {
      const answerDate = parseDateKey(answer.date);
      return answerDate >= start && answerDate <= end;
    });
  }, [answers]);

  const answersByDate = useMemo(() => {
    const map = new Map<string, UserAnswer>();
    answers.forEach((answer) => {
      if (!map.has(answer.date)) {
        map.set(answer.date, answer);
      }
    });
    return map;
  }, [answers]);

  const calendarDayNames = useMemo(
    () => (isRussian ? ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
    [isRussian]
  );

  const calendarMonthLabel = useMemo(
    () => calendarMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase(),
    [calendarMonth, locale]
  );

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const firstDay = firstOfMonth.getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - offset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const dateKey = toDateKey(date);
      const inCurrentMonth = date.getMonth() === calendarMonth.getMonth();
      const hasAnswer = answersByDate.has(dateKey);
      const isTodayDate = toDateKey(date) === toDateKey(new Date());
      return { date, dateKey, inCurrentMonth, hasAnswer, isTodayDate };
    });
  }, [calendarMonth, answersByDate]);

  const selectedCalendarAnswer = selectedCalendarDateKey
    ? answersByDate.get(selectedCalendarDateKey) || null
    : null;

  const openAnswersCalendar = () => {
    const initialDate = currentWeekAnswers[0]?.date || answers[0]?.date || toDateKey(new Date());
    const parsed = parseDateKey(initialDate);
    setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setSelectedCalendarDateKey(initialDate);
    setShowAnswersCalendarModal(true);
  };

  const insightCategoryHeadings = isRussian
    ? ['ЧТО ГОВОРИТ ТВОЕ СЕРДЦЕ', 'СТОИТ ИССЛЕДОВАТЬ', 'ЧЕМУ МОЖНО ДАТЬ УЙТИ', 'ДРУГОЙ ВЗГЛЯД']
    : ['WHAT YOUR HEART SAYS', 'WORTH EXPLORING', 'WHAT TO RELEASE', 'ANOTHER PERSPECTIVE'];

  const isLikelyInsightHeading = (line: string): boolean => {
    const normalized = line.replace(/[:#]/g, '').trim();
    if (!normalized) return false;

    const normalizedUpper = normalized.toUpperCase();
    const isKnownHeading = insightCategoryHeadings.some(
      (heading) => normalizedUpper === heading.toUpperCase()
    );
    if (isKnownHeading) return true;

    const hasLetters = /[A-Za-zА-Яа-яЁё]/.test(normalized);
    const shortEnough = normalized.length <= 42;
    const allCaps = normalizedUpper === normalized;
    const notSentence = !/[.!?]$/.test(normalized);

    return hasLetters && shortEnough && allCaps && notSentence;
  };

  const getInsightBodyText = (source: any): string => {
    if (typeof source === 'string') return source.trim();
    if (!source || typeof source !== 'object') return '';

    const asRecord = source as Record<string, any>;
    const orderedKeys = ['heartInsight', 'exploreInsight', 'releaseInsight', 'perspectiveShift'];
    const parts: string[] = [];

    orderedKeys.forEach((key) => {
      const value = asRecord[key];
      if (typeof value === 'string' && value.trim()) {
        parts.push(value.trim());
      }
    });

    if (parts.length > 0) {
      return parts.join('\n\n');
    }

    return '';
  };

  const renderInsightSections = (insightText: string) => {
    const normalizedInsightText = getInsightBodyText(insightText);
    if (!normalizedInsightText) {
      return (
        <View style={styles.insightSectionCard}>
          <Text style={styles.insightSectionTitle}>{tr('Insight', 'Инсайт')}</Text>
          <Text style={styles.insightSectionText}>
            {tr('Insight content unavailable', 'Содержание инсайта недоступно')}
          </Text>
        </View>
      );
    }

    const lines = normalizedInsightText.split('\n');
    const sections: Array<{ heading: string | null; paragraphs: string[] }> = [];
    let currentSection: { heading: string | null; paragraphs: string[] } = {
      heading: null,
      paragraphs: [],
    };

    const pushCurrentSection = () => {
      if (currentSection.heading || currentSection.paragraphs.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { heading: null, paragraphs: [] };
    };

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      if (isLikelyInsightHeading(trimmedLine)) {
        pushCurrentSection();
        currentSection.heading = trimmedLine.replace(/[:#]/g, '').toUpperCase();
        return;
      }

      currentSection.paragraphs.push(trimmedLine);
    });

    pushCurrentSection();

    const hasVisibleParagraphs = sections.some((section) => section.paragraphs.length > 0);
    if (!hasVisibleParagraphs) {
      const fallbackParagraphs = normalizedInsightText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (fallbackParagraphs.length > 0) {
        return (
          <View style={styles.insightSectionCard}>
            <Text style={styles.insightSectionTitle}>{tr('Insight', 'Инсайт')}</Text>
            {fallbackParagraphs.map((paragraph, index) => (
              <Text key={`fallback-insight-${index}`} style={styles.insightSectionText} selectable>
                {paragraph}
              </Text>
            ))}
          </View>
        );
      }
    }

    return sections.map((section, sectionIndex) => (
      <View key={`section-${sectionIndex}`} style={styles.insightSectionCard}>
        {section.heading ? (
          <Text style={styles.insightSectionTitle}>{section.heading}</Text>
        ) : null}
        {(section.paragraphs.length > 0
          ? section.paragraphs
          : [tr('No details were saved for this section.', 'Для этого раздела детали не сохранены.')]
        ).map((paragraph, paragraphIndex) => (
          <Text
            key={`paragraph-${sectionIndex}-${paragraphIndex}`}
            style={styles.insightSectionText}
            selectable
          >
            {paragraph}
          </Text>
        ))}
      </View>
    ));
  };

  const getBadgeColors = (badgeName: string, index: number) => {
    const badgeColors = [
      { bg: 'rgba(91, 58, 143, 0.1)', border: 'rgba(91, 58, 143, 0.2)' }, // Early Bird - purple
      { bg: 'rgba(107, 142, 127, 0.1)', border: 'rgba(107, 142, 127, 0.2)' }, // 7 Day Streak - green
      { bg: 'rgba(139, 107, 74, 0.1)', border: 'rgba(139, 107, 74, 0.2)' }, // Peace Maker - brown
      { bg: 'rgba(125, 91, 166, 0.1)', border: 'rgba(125, 91, 166, 0.2)' }, // Resilient - purple
      { bg: 'rgba(186, 204, 215, 0.2)', border: '#baccd7' }, // Zen Master - grey
    ];
    return badgeColors[index % badgeColors.length];
  };

  return (
    <PaperTextureBackground>
      <View style={styles.container}>

        {/* User Portfolio Area */}
        <View style={[styles.portfolioContainer, { paddingTop: insets.top + 20 }]}>
          <LinearGradient
            colors={['#342846', '#a592b0', '#342846']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.portfolioCard}
          >
            {/* User Name */}
            <Text style={styles.portfolioUserName}>{userName || t('me.user')}</Text>
            
            {/* Zodiac Sign and Goals Count Row */}
            <View style={styles.portfolioInfoRow}>
              {zodiacSign && (
                <View style={styles.portfolioInfoItem}>
                  <Text style={styles.portfolioInfoLabel}>{t('me.zodiac')}</Text>
                  <Text style={styles.portfolioInfoValue}>{zodiacSign}</Text>
                </View>
              )}
              <View style={styles.portfolioInfoItem}>
                <Text style={styles.portfolioInfoLabel}>{t('me.goalsCompleted')}</Text>
                <Text style={styles.portfolioInfoValue}>{completedGoalsCount}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Badges Gained Section */}
          <View style={styles.section}>
            <View style={styles.badgesSectionHeader}>
              <Text style={[styles.sectionTitle, styles.sectionTitleCentered]}>{t('me.badgesGained')}</Text>
              {badges.length > 5 && (
                <TouchableOpacity style={styles.viewAllButtonContainer}>
                  <Text style={styles.viewAllButton}>
                    {t('me.viewAll').replace(' ', '\n')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {badges.length === 0 ? (
              <View style={[styles.goalCard, styles.emptyFieldCard]}>
                <Text style={styles.emptyText}>{tr('No badges yet. Keep using the app to earn them!', 'Пока нет наград. Продолжай пользоваться приложением, чтобы их получить!')}</Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.badgesScroll}
                contentContainerStyle={styles.badgesScrollContent}
              >
                {badges.map((badge, index) => {
                  const colors = getBadgeColors(badge.name, index);
                  const isNewlyAdded = newlyAddedBadgeId === badge.id;
                  const badgeImage = getBadgeImage(badge.badgeNumber);
                  
                  // Get or create animation value
                  if (!badgeAnimations.current[badge.id]) {
                    badgeAnimations.current[badge.id] = new Animated.Value(0);
                  }
                  const animValue = badgeAnimations.current[badge.id];
                  
                  return (
                    <Animated.View
                      key={badge.id}
                      style={[
                        styles.badgeCard,
                        isNewlyAdded && {
                          transform: [
                            {
                              translateY: animValue,
                            },
                            {
                              scale: animValue.interpolate({
                                inputRange: [-200, -50, 0],
                                outputRange: [0.2, 1.3, 1.0],
                                extrapolate: 'clamp',
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View style={[styles.badgeIconContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                        <Image
                          source={badgeImage}
                          style={styles.badgeImage}
                          resizeMode="contain"
                        />
                      </View>
                      <Text
                        style={styles.badgeName}
                        numberOfLines={3}
                        ellipsizeMode="tail"
                        android_hyphenationFrequency="none"
                      >
                        {badge.name}
                      </Text>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Mood Tracker Calendar Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCentered]}>{tr('Mood tracker', 'Трекер настроения')}</Text>
            <View style={styles.moodCalendarContainer}>
              <MoodCalendar />
            </View>
          </View>

          {/* Saved Insights Section */}
          <View style={styles.section}>
            <View style={styles.recentAnswersHeader}>
              <Text style={[styles.sectionTitle, styles.sectionTitleCentered, styles.recentAnswersTitle]}>
                {t('me.savedInsights')}
              </Text>
              {savedInsights.length > 1 && (
                <TouchableOpacity
                  style={styles.viewAllAnswersButton}
                  onPress={() => setShowSavedInsightsModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllAnswersButtonText}>
                    {tr('See all', 'Смотреть все')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {savedInsights.length === 0 ? (
              <View style={[styles.goalCard, styles.emptyFieldCard]}>
                <Text style={styles.emptyText}>{t('me.noSavedInsights')}</Text>
              </View>
            ) : (
              <View style={styles.insightsList}>
                {savedInsights.slice(0, 1).map((insight, index) => {
                  // Generate title from insight content - use first heading or first line
                  const getInsightTitle = (insightText: string): string => {
                    const normalizedText = getInsightBodyText(insightText);
                    const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);
                    // Look for a heading-like line
                    for (const line of lines) {
                      const trimmed = line.trim();
                      if (trimmed.length < 40 && 
                          !trimmed.endsWith('.') && 
                          !trimmed.startsWith('-') &&
                          !trimmed.startsWith('•')) {
                        return trimmed;
                      }
                    }
                    // Fallback: use first 30 chars of first line
                    if (lines.length > 0) {
                      return lines[0].substring(0, 30) + (lines[0].length > 30 ? '...' : '');
                    }
                    return t('me.clarityInsight');
                  };
                  
                  const title = insight.title || getInsightTitle(insight.insight);
                  const locale = i18n.language === 'ru' || i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US';
                  const date = new Date(insight.timestamp).toLocaleDateString(locale, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  
                  return (
                    <TouchableOpacity 
                      key={insight.id} 
                      style={styles.insightCard}
                      onPress={() => setSelectedInsight(insight)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.insightIconContainer}>
                        <Text style={styles.insightIcon}>📄</Text>
                      </View>
                      <View style={styles.insightCardContent}>
                        <Text style={styles.insightCardTitle} numberOfLines={1}>{title}</Text>
                        <Text style={styles.insightCardDate}>{date}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Recent Answers Section */}
          <View style={styles.section}>
            <View style={styles.recentAnswersHeader}>
              <Text style={[styles.sectionTitle, styles.sectionTitleCentered, styles.recentAnswersTitle]}>
                {t('me.recentAnswers')}
              </Text>
              {answers.length > 0 && (
                <TouchableOpacity
                  style={styles.viewAllAnswersButton}
                  onPress={openAnswersCalendar}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllAnswersButtonText}>
                    {tr('See all', 'Смотреть все')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {answers.length === 0 ? (
              <View style={[styles.goalCard, styles.emptyFieldCard]}>
                <Text style={styles.emptyText}>{tr('No answers yet. Respond to daily questions to see them here!', 'Пока нет ответов. Отвечай на ежедневные вопросы, чтобы видеть их здесь!')}</Text>
              </View>
            ) : currentWeekAnswers.length === 0 ? (
              <View style={[styles.goalCard, styles.emptyFieldCard]}>
                <Text style={styles.emptyText}>
                  {tr('No entries for this week yet. Tap "See all" to browse your full diary.', 'На этой неделе пока нет записей. Нажми «Смотреть все», чтобы открыть дневник.')}
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                decelerationRate="fast"
                snapToAlignment="start"
                style={styles.answersCarousel}
                contentContainerStyle={styles.answersCarouselContent}
              >
                {currentWeekAnswers.map((answer, index) => (
                  <View key={`${answer.date}-${index}`} style={styles.answerSlide}>
                    <View style={styles.answerCard}>
                      <View style={styles.answerJournalHeader}>
                        <Text style={styles.answerJournalTag}>
                          {tr('Journal entry', 'Запись дневника')}
                        </Text>
                        <Text style={styles.answerJournalPage}>
                          {index + 1}/{currentWeekAnswers.length}
                        </Text>
                      </View>
                      <View style={styles.answerDateContainer}>
                        <View style={styles.answerDateIcon}>
                          <Text style={styles.answerDateIconText}>✎</Text>
                        </View>
                        <Text style={styles.answerDate}>{formatDateShort(answer.date)}</Text>
                      </View>
                      <View style={styles.answerPromptRow}>
                        <Text style={styles.answerPromptLabel}>{tr('Question', 'Вопрос')}</Text>
                      </View>
                      <Text style={styles.answerQuestion}>
                        {answer.question || tr('How do you handle unexpected challenges?', 'Как ты справляешься с неожиданными трудностями?')}
                      </Text>
                      <View style={styles.answerField}>
                        <Text style={styles.answerText}>{answer.answer || ''}</Text>
                      </View>
                      <View style={styles.answerCardBottomSpacer} />
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Completed Goals Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCentered]}>{t('me.completedGoals')}</Text>
            {completedGoals.length === 0 ? (
              <View style={[styles.goalCard, styles.emptyFieldCard]}>
                <Text style={styles.emptyText}>{t('me.noCompletedGoals')}</Text>
              </View>
            ) : (
              <View style={styles.goalsList}>
                {completedGoals.map((goal) => (
                  <TouchableOpacity 
                    key={goal.id} 
                    style={styles.goalCard}
                    onPress={async () => {
                      setSelectedCompletedGoal(goal);
                      // Load goal details from userGoals
                      try {
                        const userGoalsData = await AsyncStorage.getItem('userGoals');
                        if (userGoalsData) {
                          const userGoals = JSON.parse(userGoalsData);
                          const goalData = userGoals.find((g: any) => g.id === goal.id);
                          if (goalData) {
                            setGoalDetails(goalData);
                            // Load step instructions for completed levels
                            await loadStepInstructionsForCompletedLevels(goalData);
                            
                            // Ensure dateStarted is set if missing (for older completed goals)
                            if (!goal.dateStarted && goalData.createdAt) {
                              const updatedGoal = {
                                ...goal,
                                dateStarted: new Date(goalData.createdAt).toISOString().split('T')[0]
                              };
                              setSelectedCompletedGoal(updatedGoal);
                              
                              // Update in storage
                              const completedGoalsData = await AsyncStorage.getItem('completedGoals');
                              if (completedGoalsData) {
                                const completedGoals = JSON.parse(completedGoalsData);
                                const goalIndex = completedGoals.findIndex((g: any) => g.id === goal.id);
                                if (goalIndex !== -1) {
                                  completedGoals[goalIndex].dateStarted = updatedGoal.dateStarted;
                                  await AsyncStorage.setItem('completedGoals', JSON.stringify(completedGoals));
                                }
                              }
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Error loading goal details:', error);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.goalIconContainer}>
                      <Text style={styles.goalCheckmark}>✓</Text>
                    </View>
                    <View style={styles.goalContent}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      <Text style={styles.goalDate}>{t('me.completedOn')} {formatDate(goal.dateCompleted)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* All Answers Calendar Modal */}
      <Modal
        visible={showAnswersCalendarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAnswersCalendarModal(false)}
      >
        <View style={styles.answersArchiveOverlay}>
          <TouchableOpacity
            style={styles.answersArchiveBackdrop}
            activeOpacity={1}
            onPress={() => setShowAnswersCalendarModal(false)}
          />
          <View style={styles.answersCalendarModalContainer}>
            <View style={styles.journalArchiveHeader}>
              <View style={styles.journalArchiveTitleWrap}>
                <Text style={[styles.answersArchiveTitle, styles.journalArchiveTitle]}>
                  {tr('Journal archive', 'Архив дневника')}
                </Text>
                <Text style={[styles.answersArchiveSubtitle, styles.journalArchiveSubtitle]}>
                  {tr(
                    'Browse your entries by date and revisit any day.',
                    'Просматривай записи по датам и возвращайся к любому дню.'
                  )}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAnswersCalendarModal(false)}
                style={styles.journalArchiveCloseButton}
                activeOpacity={0.7}
              >
                <Text style={styles.answersArchiveCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.answersCalendarContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.answersCalendarCard}>
                <View style={styles.answersCalendarMonthHeader}>
                  <TouchableOpacity
                    style={styles.answersCalendarNavButton}
                    onPress={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.answersCalendarNavButtonText}>{'<'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.answersCalendarMonthLabel}>{calendarMonthLabel}</Text>
                  <TouchableOpacity
                    style={styles.answersCalendarNavButton}
                    onPress={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.answersCalendarNavButtonText}>{'>'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.answersCalendarDayNamesRow}>
                  {calendarDayNames.map((dayName) => (
                    <Text key={dayName} style={styles.answersCalendarDayName}>
                      {dayName}
                    </Text>
                  ))}
                </View>

                <View style={styles.answersCalendarGrid}>
                  {calendarCells.map((cell) => {
                    const isSelected = selectedCalendarDateKey === cell.dateKey;
                    return (
                      <TouchableOpacity
                        key={cell.dateKey}
                        style={[
                          styles.answersCalendarDayCell,
                          !cell.inCurrentMonth && styles.answersCalendarDayCellOutsideMonth,
                          isSelected && styles.answersCalendarDayCellSelected,
                        ]}
                        onPress={() => setSelectedCalendarDateKey(cell.dateKey)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.answersCalendarDayNumber,
                            !cell.inCurrentMonth && styles.answersCalendarDayNumberOutsideMonth,
                            cell.isTodayDate && styles.answersCalendarDayNumberToday,
                            isSelected && styles.answersCalendarDayNumberSelected,
                          ]}
                        >
                          {cell.date.getDate()}
                        </Text>
                        {cell.hasAnswer ? <View style={styles.answersCalendarEntryDot} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.answersCalendarEntryPanel}>
                {selectedCalendarAnswer ? (
                  <>
                    <Text style={styles.answersCalendarEntryDate}>
                      {parseDateKey(selectedCalendarAnswer.date).toLocaleDateString(locale, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.answersCalendarEntryPromptLabel}>
                      {tr('Question', 'Вопрос')}
                    </Text>
                    <Text style={styles.answersCalendarEntryQuestion}>
                      {selectedCalendarAnswer.question || tr('How do you handle unexpected challenges?', 'Как ты справляешься с неожиданными трудностями?')}
                    </Text>
                    <Text style={styles.answersCalendarEntryAnswerLabel}>
                      {tr('Entry', 'Запись')}
                    </Text>
                    <View style={styles.answersCalendarEntryAnswerBox}>
                      <Text style={styles.answersCalendarEntryAnswerText}>
                        {selectedCalendarAnswer.answer || tr('No answer saved for this day.', 'Для этого дня ответ не сохранен.')}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.emptyText}>
                    {tr('Select a highlighted day to view that entry.', 'Выбери выделенный день, чтобы открыть запись.')}
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Saved Insights Archive Modal */}
      <Modal
        visible={showSavedInsightsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSavedInsightsModal(false)}
      >
        <View style={styles.answersArchiveOverlay}>
          <TouchableOpacity
            style={styles.answersArchiveBackdrop}
            activeOpacity={1}
            onPress={() => setShowSavedInsightsModal(false)}
          />
          <View style={styles.answersCalendarModalContainer}>
            <View style={styles.answersArchiveHeader}>
              <View style={styles.answersArchiveTitleWrap}>
                <Text style={styles.answersArchiveTitle}>{t('me.savedInsights')}</Text>
                <Text style={styles.answersArchiveSubtitle}>
                  {tr(
                    'Browse all saved insights and open any one.',
                    'Просматривай все сохраненные инсайты и открывай любой.'
                  )}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSavedInsightsModal(false)}
                style={styles.answersArchiveCloseButton}
                activeOpacity={0.7}
              >
                <Text style={styles.answersArchiveCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.answersCalendarContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.insightsList}>
                {savedInsights.map((insight) => {
                  const getInsightTitle = (insightText: string): string => {
                    const normalizedText = getInsightBodyText(insightText);
                    const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);
                    for (const line of lines) {
                      const trimmed = line.trim();
                      if (trimmed.length < 40 &&
                          !trimmed.endsWith('.') &&
                          !trimmed.startsWith('-') &&
                          !trimmed.startsWith('•')) {
                        return trimmed;
                      }
                    }
                    if (lines.length > 0) {
                      return lines[0].substring(0, 30) + (lines[0].length > 30 ? '...' : '');
                    }
                    return t('me.clarityInsight');
                  };

                  const title = insight.title || getInsightTitle(insight.insight);
                  const itemLocale = i18n.language === 'ru' || i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US';
                  const date = new Date(insight.timestamp).toLocaleDateString(itemLocale, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <TouchableOpacity
                      key={insight.id}
                      style={styles.insightCard}
                      onPress={() => {
                        setShowSavedInsightsModal(false);
                        setSelectedInsight(insight);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.insightIconContainer}>
                        <Text style={styles.insightIcon}>📄</Text>
                      </View>
                      <View style={styles.insightCardContent}>
                        <Text style={styles.insightCardTitle} numberOfLines={1}>{title}</Text>
                        <Text style={styles.insightCardDate}>{date}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Insight Detail Modal */}
      <Modal
        visible={selectedInsight !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedInsight(null)}
      >
        <View style={styles.insightModalOverlay}>
          <TouchableOpacity
            style={styles.insightModalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedInsight(null)}
          />
          <View style={styles.insightModalContent}>
            {selectedInsight && (
              <>
                <View style={styles.insightModalHeader}>
                  <View style={styles.insightModalTitleWrap}>
                    <Text style={styles.insightModalTitle}>{t('me.savedInsights')}</Text>
                    <Text style={styles.insightModalSubtitle}>
                      {tr(
                        'A clean view of your reflection, organized by key themes.',
                        'Чистый обзор твоей рефлексии, аккуратно собранный по ключевым темам.'
                      )}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedInsight(null)}
                    style={styles.insightModalCloseButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.insightModalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.insightModalScroll}
                  contentContainerStyle={styles.insightModalScrollContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <View style={styles.insightMetaCard}>
                    <Text style={styles.insightMetaLabel}>{tr('Saved on', 'Сохранено')}</Text>
                    <Text style={styles.insightMetaDate}>
                      {new Date(selectedInsight.timestamp).toLocaleDateString(locale, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>

                  <View style={styles.insightSectionsContainer}>
                    {renderInsightSections(
                      selectedInsight.insight ||
                        tr('Insight content unavailable', 'Содержание инсайта недоступно')
                    )}
                  </View>

                  {selectedInsight.thoughts && selectedInsight.thoughts.length > 0 && (
                    <View style={styles.insightThoughtsCard}>
                      <Text style={styles.insightThoughtsTitle}>{tr('Related thoughts', 'Связанные мысли')}</Text>
                      {selectedInsight.thoughts.map((thought: any, index: number) => (
                        <View key={thought.id || index} style={styles.insightThoughtItem}>
                          <Text style={styles.insightThoughtBullet}>•</Text>
                          <Text style={styles.insightThoughtText}>{thought.text}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Completed Goal Detail Modal */}
      <Modal
        visible={selectedCompletedGoal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSelectedCompletedGoal(null);
          setGoalDetails(null);
          setLevelStepInstructions({});
        }}
      >
        <View style={styles.goalDetailHelperOverlay}>
          <TouchableOpacity
            style={styles.goalDetailHelperBackdrop}
            activeOpacity={1}
            onPress={() => {
              setSelectedCompletedGoal(null);
              setGoalDetails(null);
              setLevelStepInstructions({});
            }}
          />
          <View style={styles.goalDetailHelperContent}>
            {selectedCompletedGoal && (
              <>
                <View style={styles.goalDetailHelperHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCompletedGoal(null);
                      setGoalDetails(null);
                      setLevelStepInstructions({});
                    }}
                    style={styles.goalDetailHelperCloseButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.goalDetailHelperCloseText}>✕</Text>
                  </TouchableOpacity>
                  <View style={styles.goalDetailHelperTitleWrap}>
                    <Text style={styles.goalDetailHelperTitle}>
                      {selectedCompletedGoal.name.charAt(0).toUpperCase() + selectedCompletedGoal.name.slice(1).toLowerCase()}
                    </Text>
                    <Text style={styles.goalDetailHelperSubtitle}>
                      {tr('A structured recap of your completed path.', 'Структурированный обзор твоего завершенного пути.')}
                    </Text>
                  </View>
                </View>

                <ScrollView 
                  style={styles.goalDetailHelperScroll}
                  contentContainerStyle={styles.goalDetailHelperScrollContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <View style={styles.goalDetailMetaCard}>
                    {selectedCompletedGoal.dateStarted && (
                      <Text style={styles.goalDetailMetaDate}>
                        {tr('Started on', 'Начато')} {formatDate(selectedCompletedGoal.dateStarted)}
                      </Text>
                    )}
                    <Text style={styles.goalDetailMetaDate}>
                      {tr('Completed on', 'Завершено')} {formatDate(selectedCompletedGoal.dateCompleted)}
                    </Text>
                  </View>

                  {goalDetails && goalDetails.steps && (
                    <View style={styles.goalDetailLevelsCard}>
                      <Text style={styles.goalDetailLevelsTitle}>{tr('Completed levels', 'Завершенные уровни')}</Text>
                      {[1, 2, 3, 4].map((levelNumber) => {
                        // Get the level step (goalDetails.steps contains the 4 main level steps)
                        const levelStep = goalDetails.steps && goalDetails.steps[levelNumber - 1];
                        
                        // Level is completed if currentStepIndex >= levelNumber - 1
                        // currentStepIndex: -1 = no levels completed, 0 = level 1 completed, 1 = levels 1-2 completed, etc.
                        // For a completed goal, currentStepIndex should be 3 (all 4 levels completed)
                        const isLevelCompleted = goalDetails.currentStepIndex !== undefined && 
                                                 goalDetails.currentStepIndex >= levelNumber - 1;
                        
                        // Get step instructions for this level
                        const stepInstructions = levelStepInstructions[levelNumber] || [];
                        
                        return (
                          <View key={levelNumber} style={styles.goalDetailLevelSection}>
                            <View style={styles.goalDetailLevelHeader}>
                              <Text style={styles.goalDetailLevelNumber}>{tr('Level', 'Уровень')} {levelNumber}</Text>
                              {isLevelCompleted && (
                                <Text style={styles.goalDetailLevelCompletedBadge}>✓ {tr('Completed', 'Завершено')}</Text>
                              )}
                            </View>
                            {isLevelCompleted && (
                              <View style={styles.goalDetailStepsList}>
                                {stepInstructions.length > 0 ? (
                                  // Show actual step instructions
                                  stepInstructions.map((step: any, stepIndex: number) => (
                                    <View key={stepIndex} style={styles.goalDetailStepItem}>
                                      <Text style={styles.goalDetailStepCheckmark}>✓</Text>
                                      <Text style={styles.goalDetailStepText}>
                                        {step.text || step.name || `Step ${stepIndex + 1}`}
                                      </Text>
                                    </View>
                                  ))
                                ) : (
                                  // Fallback: show level name if step instructions not loaded yet
                                  levelStep && (
                                    <View style={styles.goalDetailStepItem}>
                                      <Text style={styles.goalDetailStepCheckmark}>✓</Text>
                                      <Text style={styles.goalDetailStepText}>
                                        {levelStep.name || levelStep.text || levelStep.description || `Level ${levelNumber}`}
                                      </Text>
                                    </View>
                                  )
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {(!goalDetails || !goalDetails.steps) && (
                    <View style={styles.goalDetailEmptyCard}>
                      <Text style={styles.goalDetailEmptyText}>
                        {tr('All 4 levels have been completed!', 'Все 4 уровня завершены!')}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  portfolioContainer: {
    marginBottom: 24,
    marginLeft: 26,
    marginRight: 26,
  },
  portfolioCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  portfolioUserName: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  portfolioInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  portfolioInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  portfolioInfoLabel: {
    ...BodyStyle,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  portfolioInfoValue: {
    ...HeadingStyle,
    color: '#FFFFFF',
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  badgesSectionHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sectionTitleCentered: {
    textAlign: 'left',
    width: '100%',
  },
  recentAnswersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recentAnswersTitle: {
    flex: 1,
  },
  viewAllAnswersButton: {
    backgroundColor: 'rgba(52, 40, 70, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewAllAnswersButtonText: {
    ...BodyStyle,
    fontSize: 12,
    color: '#342846',
    letterSpacing: 0.2,
  },
  viewAllButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewAllButton: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 10,
    lineHeight: 9,
    textAlign: 'center',
  },
  emptyText: {
    ...BodyStyle,
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  moodCalendarContainer: {
    marginTop: 16,
  },
  insightsList: {
    gap: 12,
    marginTop: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.15)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 40, 70, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  insightIcon: {
    fontSize: 22,
  },
  insightCardContent: {
    flex: 1,
  },
  insightCardTitle: {
    ...HeadingStyle,
    fontSize: 16,
    color: '#342846',
    marginBottom: 4,
  },
  insightCardDate: {
    ...BodyStyle,
    fontSize: 12,
    color: '#999',
  },
  badgesScroll: {
    marginHorizontal: -4,
  },
  badgesScrollContent: {
    paddingHorizontal: 20, // Minimum 20px padding (was 4)
    gap: 13,
  },
  badgeCard: {
    alignItems: 'center',
    width: 104,
  },
  badgeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(186, 204, 215, 0.2)',
    borderWidth: 1,
    borderColor: '#baccd7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  badgeIcon: {
    fontSize: 32,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
  badgeName: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 10,
    lineHeight: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    width: '100%',
  },
  answersList: {
    gap: 16,
    marginTop: 16,
  },
  answersCarousel: {
    marginTop: 16,
    marginHorizontal: -4,
  },
  answersCarouselContent: {
    paddingHorizontal: 4,
  },
  answerSlide: {
    width: 320,
    marginRight: 12,
    height: 360,
  },
  answerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.18)',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    height: '100%',
  },
  answerJournalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  answerJournalTag: {
    ...BodyStyle,
    fontSize: 11,
    color: '#7a6f88',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  answerJournalPage: {
    ...BodyStyle,
    fontSize: 11,
    color: '#7a6f88',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  answerDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  answerDateIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 40, 70, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  answerDateIconText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  answerDate: {
    ...BodyStyle,
    color: '#7a6f88',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  answerPromptRow: {
    marginBottom: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 40, 70, 0.12)',
  },
  answerPromptLabel: {
    ...BodyStyle,
    color: '#7a6f88',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  answerQuestion: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    minHeight: 56,
  },
  answerField: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(52, 40, 70, 0.25)',
    overflow: 'hidden',
    minHeight: 96,
    marginBottom: 10,
  },
  answerCardBottomSpacer: {
    height: 10,
  },
  answerText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 15,
    lineHeight: 22,
  },
  goalsList: {
    gap: 12,
    marginTop: 16,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(186, 204, 215, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyFieldCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    marginTop: 15,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalCheckmark: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 24,
    includeFontPadding: false,
    marginTop: -3,
  },
  goalContent: {
    flex: 1,
  },
  goalName: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  goalDate: {
    ...BodyStyle,
    color: '#7a8a9a',
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 600,
    height: '80%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  answersCalendarModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 640,
    height: '86%',
    maxHeight: '86%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  answersArchiveOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  answersArchiveBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  answersArchiveHeader: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 40, 70, 0.1)',
  },
  answersArchiveCloseButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  answersArchiveCloseText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  answersArchiveTitleWrap: {
    width: '100%',
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 44,
  },
  answersArchiveTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 4,
    textAlign: 'center',
  },
  answersArchiveSubtitle: {
    ...BodyStyle,
    color: '#6e6480',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  journalArchiveHeader: {
    position: 'relative',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 40, 70, 0.1)',
  },
  journalArchiveCloseButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalArchiveTitle: {
    textAlign: 'center',
    width: '100%',
    marginTop: 65,
  },
  journalArchiveTitleWrap: {
    width: '100%',
    alignItems: 'center',
  },
  journalArchiveSubtitle: {
    textAlign: 'center',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 40, 70, 0.1)',
    position: 'relative',
  },
  modalTitle: {
    ...HeadingStyle,
    fontSize: 18,
    color: '#342846',
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 40, 70, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 20,
  },
  modalCloseText: {
    ...BodyStyle,
    fontSize: 18,
    color: '#342846',
    fontWeight: 'bold',
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  answersCalendarContent: {
    padding: 20,
    paddingBottom: 28,
    gap: 14,
  },
  answersCalendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.15)',
    padding: 14,
  },
  answersCalendarMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  answersCalendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 40, 70, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answersCalendarNavButtonText: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 16,
  },
  answersCalendarMonthLabel: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 14,
    textAlign: 'center',
  },
  answersCalendarDayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  answersCalendarDayName: {
    ...BodyStyle,
    flex: 1,
    textAlign: 'center',
    color: '#7a6f88',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  answersCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  answersCalendarDayCell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 4,
  },
  answersCalendarDayCellOutsideMonth: {
    opacity: 0.35,
  },
  answersCalendarDayCellSelected: {
    backgroundColor: 'rgba(52, 40, 70, 0.12)',
  },
  answersCalendarDayNumber: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 13,
  },
  answersCalendarDayNumberOutsideMonth: {
    color: '#a6a0b2',
  },
  answersCalendarDayNumberToday: {
    fontWeight: 'bold',
  },
  answersCalendarDayNumberSelected: {
    fontWeight: 'bold',
  },
  answersCalendarEntryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#342846',
    marginTop: 3,
  },
  answersCalendarEntryPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.15)',
    padding: 16,
    gap: 8,
  },
  answersCalendarEntryDate: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 15,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  answersCalendarEntryPromptLabel: {
    ...BodyStyle,
    color: '#7a6f88',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  answersCalendarEntryQuestion: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 14,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  answersCalendarEntryAnswerLabel: {
    ...BodyStyle,
    color: '#7a6f88',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  answersCalendarEntryAnswerBox: {
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(52, 40, 70, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  answersCalendarEntryAnswerText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 15,
    lineHeight: 22,
  },
  modalDatesContainer: {
    marginBottom: 20,
    gap: 8,
  },
  modalDate: {
    ...BodyStyle,
    fontSize: 12,
    color: '#999',
    letterSpacing: 0.5,
  },
  modalInsightContainer: {
    marginBottom: 24,
    gap: 14,
  },
  modalSectionCard: {
    backgroundColor: 'rgba(52, 40, 70, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalSectionTitle: {
    ...HeadingStyle,
    fontSize: 16,
    color: '#342846',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  modalCategoryHeading: {
    ...HeadingStyle,
    fontSize: 18,
    color: '#342846',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 12,
  },
  modalInsightText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    lineHeight: 24,
    marginBottom: 12,
  },
  modalThoughtsContainer: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 40, 70, 0.1)',
  },
  modalThoughtsTitle: {
    ...HeadingStyle,
    fontSize: 18,
    color: '#342846',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  modalThoughtItem: {
    marginBottom: 8,
    paddingLeft: 8,
  },
  modalThoughtText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  insightModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  insightModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  insightModalContent: {
    width: '100%',
    maxWidth: 620,
    minHeight: 360,
    maxHeight: '84%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  insightModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 40, 70, 0.1)',
    position: 'relative',
  },
  insightModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  insightModalCloseText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  insightModalTitleWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  insightModalTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 4,
  },
  insightModalSubtitle: {
    ...BodyStyle,
    color: '#6e6480',
    fontSize: 13,
    lineHeight: 18,
  },
  insightModalScroll: {
    flexGrow: 1,
  },
  insightModalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 12,
  },
  insightMetaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightMetaLabel: {
    ...BodyStyle,
    color: '#7a6f88',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  insightMetaDate: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 14,
  },
  insightSectionsContainer: {
    gap: 10,
  },
  insightSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightSectionTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 14,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  insightSectionText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  insightThoughtsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  insightThoughtsTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  insightThoughtItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 8,
  },
  insightThoughtBullet: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
    lineHeight: 20,
  },
  insightThoughtText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  // Completed Goal Detail Modal (helper style)
  goalDetailHelperOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  goalDetailHelperBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  goalDetailHelperContent: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '84%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  goalDetailHelperHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 40, 70, 0.1)',
  },
  goalDetailHelperCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(52, 40, 70, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  goalDetailHelperCloseText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  goalDetailHelperTitleWrap: {
    flex: 1,
  },
  goalDetailHelperTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 18,
    marginBottom: 4,
  },
  goalDetailHelperSubtitle: {
    ...BodyStyle,
    color: '#6e6480',
    fontSize: 13,
    lineHeight: 18,
  },
  goalDetailHelperScroll: {
    flex: 1,
  },
  goalDetailHelperScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 12,
  },
  goalDetailMetaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  goalDetailMetaDate: {
    ...BodyStyle,
    fontSize: 13,
    color: '#4f4560',
  },
  goalDetailLevelsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  goalDetailLevelsTitle: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 14,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  goalDetailLevelSection: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 40, 70, 0.1)',
  },
  goalDetailLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalDetailLevelNumber: {
    ...HeadingStyle,
    fontSize: 15,
    color: '#342846',
  },
  goalDetailLevelCompletedBadge: {
    ...BodyStyle,
    fontSize: 11,
    color: '#342846',
    fontWeight: '600',
    backgroundColor: 'rgba(169, 151, 180, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'uppercase',
  },
  goalDetailStepsList: {
    gap: 8,
  },
  goalDetailStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 8,
  },
  goalDetailStepCheckmark: {
    ...BodyStyle,
    fontSize: 15,
    color: '#342846',
    fontWeight: 'bold',
    lineHeight: 20,
  },
  goalDetailStepText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    lineHeight: 20,
    flex: 1,
  },
  goalDetailEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 20,
    alignItems: 'center',
  },
  goalDetailEmptyText: {
    ...BodyStyle,
    fontSize: 15,
    color: '#342846',
    textAlign: 'center',
  },
});

