import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, ImageBackground, Modal, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '@/utils/i18n';

const { width } = Dimensions.get('window');

// Engagement level messages
const LOW_ENGAGEMENT_MESSAGES = [
  "Every journey starts with a single step—today could be that day.",
  "Your path is still here, waiting patiently for you.",
  "Small moments of effort create lasting change.",
  "It's never too late to begin again.",
  "Progress isn't about perfection—it's about showing up.",
  "Your future self will thank you for starting today.",
  "Even the tallest trees started as tiny seeds.",
  "You don't have to do everything—just do something.",
  "The forest grows one tree at a time, and so do you.",
  "Missing days doesn't mean missing out—you can always return.",
  "Your goals are still yours, ready when you are.",
  "Sometimes rest is part of the journey too.",
  "Life got busy, and that's okay—we're here when you're ready.",
  "One small action today can shift your entire week.",
  "You're not starting over, you're starting stronger.",
  "The door to your purpose is always open.",
  "You've taken the first step before—you can do it again.",
  "Even a quiet week can plant seeds for tomorrow.",
  "Your ikigai doesn't disappear when you're away—it waits.",
  "Just five minutes today can reignite your momentum.",
  "You're allowed to start fresh, right now.",
  "The path doesn't judge how long you've been gone.",
  "Every master was once a beginner who kept beginning.",
  "Your story isn't over—this is just a pause.",
  "You don't need motivation to start, just courage to try.",
  "The best time to return is now.",
  "You matter, and your dreams matter.",
  "Small steps still move mountains over time.",
  "Your purpose hasn't forgotten you.",
  "Even a single moment of effort honors your journey.",
  "The forest is still growing—join it today.",
  "You're closer than you think to your breakthrough.",
  "Today is a gift—unwrap it with one small action.",
  "Your potential is infinite, even on slow days.",
  "Come back, not because you have to, but because you're worth it.",
];

const MODERATE_ENGAGEMENT_MESSAGES = [
  "Look at you showing up—that's real commitment.",
  "You're building something beautiful, day by day.",
  "Consistency is your superpower, and you're proving it.",
  "Three steps forward is still progress worth celebrating.",
  "You're creating momentum—keep this energy alive.",
  "Your effort this week is already making a difference.",
  "You're not just showing up, you're showing yourself what's possible.",
  "Every day you return, your roots grow deeper.",
  "You're in the rhythm now—trust the process.",
  "Your dedication is inspiring, even to yourself.",
  "Small actions compound into extraordinary results.",
  "You're proving that transformation happens in the ordinary.",
  "This is what building a new life looks like.",
  "You're halfway there—don't stop now.",
  "Your forest is growing, and so are you.",
  "The person you're becoming is worth this effort.",
  "You're not perfect, but you're persistent—and that's everything.",
  "Each day you choose yourself is a victory.",
  "You're writing a new story with your actions.",
  "Your commitment speaks louder than any excuse.",
  "This momentum you're building? It's contagious.",
  "You're doing better than you think you are.",
  "Keep watering what you want to grow.",
  "Your consistency is carving your new path.",
  "The work you're putting in now will bloom tomorrow.",
  "You're not just dreaming—you're doing.",
  "Every session is a seed, and you're planting a garden.",
  "You've already proven you can do hard things.",
  "Your future self is cheering you on right now.",
  "You're showing up for yourself, and that's love.",
  "The gap between who you are and who you want to be is shrinking.",
  "You're not waiting for motivation—you're creating it.",
  "This is the sweet spot—keep dancing in it.",
  "Your progress this week is your proof.",
  "You're the kind of person who follows through.",
];

const HIGH_ENGAGEMENT_MESSAGES = [
  "You're unstoppable this week—look at you go!",
  "This is what dedication looks like, and you're mastering it.",
  "Every single day? That's champion-level commitment.",
  "You're not just chasing your dreams—you're catching them.",
  "Your consistency is your signature move.",
  "Seven days of showing up? You're rewriting your story.",
  "You've proven to yourself what you're capable of.",
  "This isn't luck—this is you, fully alive.",
  "Your forest is thriving because you're thriving.",
  "You're the embodiment of intentional living right now.",
  "This level of commitment creates miracles.",
  "You're building the life you've always imagined.",
  "Every day this week, you chose yourself—that's power.",
  "You're not just setting goals, you're becoming them.",
  "This is what transformation in real-time looks like.",
  "Your dedication is changing you from the inside out.",
  "You've turned consistency into an art form.",
  "The person you're becoming is extraordinary.",
  "You're proving that daily action creates calling.",
  "This momentum? Protect it like treasure.",
  "You're in full bloom this week.",
  "Your commitment is contagious—others are watching and learning.",
  "This is your era, and you're living it fully.",
  "You're not waiting for change—you are the change.",
  "Seven days of courage, seven days of growth.",
  "You've shown up for every version of yourself this week.",
  "This is what it feels like to be aligned with your purpose.",
  "You're writing your success story in real time.",
  "Your ikigai isn't just a concept—it's your reality now.",
  "You're proof that showing up every day works—keep shining.",
];

// Helper function to get days active in current week
const getDaysActiveThisWeek = (answers: any[]): number => {
  if (!answers || answers.length === 0) return 0;
  
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  
  const uniqueDates = new Set<string>();
  
  answers.forEach((answer: any) => {
    if (answer.date) {
      // Date is stored as YYYY-MM-DD string
      const dateStr = answer.date;
      const answerDate = new Date(dateStr + 'T00:00:00'); // Parse as local date
      
      if (answerDate >= startOfWeek && answerDate < endOfWeek) {
        uniqueDates.add(dateStr);
      }
    }
  });
  
  return uniqueDates.size;
};

// Helper function to get which days of the week user was active
const getWeekActivityData = (answers: any[]): { day: string; active: boolean; dayIndex: number }[] => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const activeDates = new Set<string>();
  
  if (answers && answers.length > 0) {
    answers.forEach((answer: any) => {
      if (answer.date) {
        const dateStr = answer.date;
        const answerDate = new Date(dateStr + 'T00:00:00');
        
        // Check if this date is in the current week
        const weekEnd = new Date(startOfWeek);
        weekEnd.setDate(startOfWeek.getDate() + 7);
        
        if (answerDate >= startOfWeek && answerDate < weekEnd) {
          activeDates.add(dateStr);
        }
      }
    });
  }
  
  // Create week data array
  return days.map((day, index) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + index);
    const dayDateStr = dayDate.toISOString().split('T')[0];
    
    return {
      day,
      active: activeDates.has(dayDateStr),
      dayIndex: index,
    };
  });
};

// Helper function to get random message based on engagement level
const getEngagementMessage = (daysActive: number): string => {
  let messages: string[];
  
  if (daysActive >= 6) {
    messages = HIGH_ENGAGEMENT_MESSAGES;
  } else if (daysActive >= 3) {
    messages = MODERATE_ENGAGEMENT_MESSAGES;
  } else {
    messages = LOW_ENGAGEMENT_MESSAGES;
  }
  
  // Return random message from the appropriate array
  return messages[Math.floor(Math.random() * messages.length)];
};

export default function ProgressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [daysActive, setDaysActive] = useState<number>(0);
  const [bodyText, setBodyText] = useState<string>('');
  const [streakDays, setStreakDays] = useState<number>(0);
  const [actionsCompleted, setActionsCompleted] = useState<number>(0);
  const [focusHours, setFocusHours] = useState<number>(0);
  const [weekData, setWeekData] = useState<{ day: string; active: boolean; dayIndex: number }[]>(() => {
    // Initialize with default week data (all inactive)
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => ({
      day,
      active: false,
      dayIndex: index,
    }));
  });
  
  // Flip animation states for each card
  const daysActiveFlip = useRef(new Animated.Value(0)).current;
  const streakFlip = useRef(new Animated.Value(0)).current;
  const actionsFlip = useRef(new Animated.Value(0)).current;
  const focusHoursFlip = useRef(new Animated.Value(0)).current;
  
  // Card flip states
  const [daysActiveFlipped, setDaysActiveFlipped] = useState(false);
  const [streakFlipped, setStreakFlipped] = useState(false);
  const [actionsFlipped, setActionsFlipped] = useState(false);
  const [focusHoursFlipped, setFocusHoursFlipped] = useState(false);
  
  // Badge modal state
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeData, setBadgeData] = useState<{
    name: string;
    message: string;
    image: any;
    badgeNumber?: number;
    category?: 'career' | 'social' | 'personal' | 'progress';
  } | null>(null);
  
  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);
  
  const loadUserData = async () => {
    try {
      // Load user name
      const name = await AsyncStorage.getItem('userName');
      if (name) {
        setUserName(name);
      }
      
      // Load user answers to calculate days active in current week
      const answersData = await AsyncStorage.getItem('userAnswers');
      if (answersData) {
        const answers = JSON.parse(answersData);
        // Get days active in current week
        const daysActiveThisWeek = getDaysActiveThisWeek(answers);
        setDaysActive(daysActiveThisWeek);
        // Set dynamic body text based on engagement level
        setBodyText(getEngagementMessage(daysActiveThisWeek));
        
        // Calculate total streak days (all unique dates)
        const uniqueDates = new Set(answers.map((a: any) => a.date));
        setStreakDays(uniqueDates.size);
        
        // Count total actions completed
        setActionsCompleted(answers.length);
        
        // Get week activity data for circles
        const weekActivity = getWeekActivityData(answers);
        setWeekData(weekActivity);
      } else {
        // No answers yet, set default message
        setBodyText(getEngagementMessage(0));
        // Set default week data (all inactive)
        const defaultWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => ({
          day,
          active: false,
          dayIndex: index,
        }));
        setWeekData(defaultWeek);
      }
      
      // Load focus hours
      const focusHoursData = await AsyncStorage.getItem('focusHours');
      if (focusHoursData) {
        const hours = parseFloat(focusHoursData);
        setFocusHours(Math.round(hours * 10) / 10); // Round to 1 decimal place
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setBodyText(getEngagementMessage(0));
    }
  };
  
  // Badge image mapping - maps badge numbers to image paths (using 1.png-30.png from Downloads)
  const badgeImageMap: { [key: number]: any } = {
    1: require('../assets/images/badges/1.png'),
    2: require('../assets/images/badges/2.png'),
    3: require('../assets/images/badges/3.png'),
    4: require('../assets/images/badges/4.png'),
    5: require('../assets/images/badges/5.png'),
    6: require('../assets/images/badges/6.png'),
    7: require('../assets/images/badges/7.png'),
    8: require('../assets/images/badges/8.png'),
    9: require('../assets/images/badges/9.png'),
    10: require('../assets/images/badges/10.png'),
    11: require('../assets/images/badges/11.png'),
    12: require('../assets/images/badges/12.png'),
    13: require('../assets/images/badges/13.png'),
    14: require('../assets/images/badges/14.png'),
    15: require('../assets/images/badges/15.png'),
    16: require('../assets/images/badges/16.png'),
    17: require('../assets/images/badges/17.png'),
    18: require('../assets/images/badges/18.png'),
    19: require('../assets/images/badges/19.png'),
    20: require('../assets/images/badges/20.png'),
    21: require('../assets/images/badges/21.png'),
    22: require('../assets/images/badges/22.png'),
    23: require('../assets/images/badges/23.png'),
    24: require('../assets/images/badges/24.png'),
    25: require('../assets/images/badges/25.png'),
    26: require('../assets/images/badges/26.png'),
    27: require('../assets/images/badges/27.png'),
    28: require('../assets/images/badges/28.png'),
    29: require('../assets/images/badges/29.png'),
    30: require('../assets/images/badges/30.png'),
  };

  // Helper function to get badge image by number
  const getBadgeImage = (badgeNumber: number) => {
    // Return badge image if available, otherwise fallback to trophy
    return badgeImageMap[badgeNumber] || require('../assets/images/trophy.png');
  };

  // Badge category definitions
  const BADGE_CATEGORIES = {
    career: {
      badges: [2, 5, 7, 9, 17, 21, 22, 30],
      names: {
        2: 'Skills Upgrade',
        5: 'Growth Catalyst',
        7: 'Threshold Crosser',
        9: 'Resume Refresh',
        17: 'Time Master',
        21: 'First Application',
        22: 'Visible Voice',
        30: 'New Opportunities',
      },
    },
    social: {
      badges: [3, 10, 11, 15, 16, 18, 23, 24, 29],
      names: {
        3: 'Network Builder',
        10: 'Bridge Builder',
        11: 'Coffee Courage',
        15: 'Storm Calmer',
        16: 'Connection Master',
        18: 'Vulnerability Champion',
        23: 'Social Confidence',
        24: 'Group Participant',
        29: 'First Reach Out',
      },
    },
    personal: {
      badges: [1, 4, 6, 12, 13, 14, 19, 20, 25, 28],
      names: {
        1: 'Fear Stomper',
        4: 'Solo Summit',
        6: 'Finding Way',
        12: 'First Rep',
        13: 'Boundary Setter',
        14: 'Treasure Finder',
        19: 'Comfort Zone Exit',
        20: 'Physical Courage',
        25: 'Solo Adventure',
        28: 'Personal Transformation',
      },
    },
    progress: {
      badges: [8, 26, 27],
      names: {
        8: 'Summit Reached',
        26: 'Achievement Unlocked',
        27: 'Weekly Warrior',
      },
    },
  };

  // Helper function to get available badges in a category (excluding already earned ones)
  const getAvailableBadgesInCategory = async (category: 'career' | 'social' | 'personal' | 'progress'): Promise<number[]> => {
    try {
      // Load existing badges
      const badgesData = await AsyncStorage.getItem('userBadges');
      const existingBadges = badgesData ? JSON.parse(badgesData) : [];
      const earnedBadgeNumbers = new Set(existingBadges.map((b: any) => b.badgeNumber).filter((n: any) => n !== undefined));
      
      // Get category badges and filter out already earned ones
      const categoryBadges = BADGE_CATEGORIES[category].badges;
      return categoryBadges.filter(badgeNum => !earnedBadgeNumbers.has(badgeNum));
    } catch (error) {
      console.error('Error getting available badges:', error);
      return BADGE_CATEGORIES[category].badges;
    }
  };

  // Helper function to get translated badge name (only for Russian, English uses original names)
  const getTranslatedBadgeName = (category: string, badgeNumber: number): string => {
    // Only use translations when language is Russian
    if (i18n.language === 'ru' || i18n.language?.startsWith('ru')) {
      const translationKey = `progress.badgeNames.${category}.${badgeNumber}`;
      const translated = t(translationKey);
      // If translation exists and is different from key, use it
      if (translated && translated !== translationKey) {
        return translated;
      }
    }
    // For English or if translation not found, use original English name
    return BADGE_CATEGORIES[category as keyof typeof BADGE_CATEGORIES]?.names[badgeNumber as any] || 'Achievement';
  };

  // Helper function to analyze user goals and determine badge category
  const analyzeUserGoals = async (): Promise<{
    category: 'career' | 'social' | 'personal' | 'progress';
    badgeNumber: number;
    badgeName: string;
    badgeMessage: string;
  }> => {
    try {
      // Load user goals
      const goalsData = await AsyncStorage.getItem('userGoals');
      const goals = goalsData ? JSON.parse(goalsData) : [];
      
      // Load completed goals
      const completedGoalsData = await AsyncStorage.getItem('completedGoals');
      const completedGoals = completedGoalsData ? JSON.parse(completedGoalsData) : [];
      
      // Analyze goal names and descriptions for category keywords
      const allGoals = [...goals, ...completedGoals];
      
      // Career keywords
      const careerKeywords = ['job', 'career', 'interview', 'resume', 'linkedin', 'network', 'professional', 'work', 'business', 'application', 'skill', 'promotion', 'salary'];
      // Social keywords
      const socialKeywords = ['meet', 'friend', 'social', 'group', 'coffee', 'party', 'relationship', 'connection', 'community', 'team', 'together', 'share', 'communicate'];
      // Personal courage keywords
      const personalKeywords = ['fear', 'anxiety', 'boundary', 'self-care', 'gym', 'exercise', 'health', 'mental', 'house', 'leave', 'adventure', 'solo', 'courage', 'overcome'];
      
      let careerCount = 0;
      let socialCount = 0;
      let personalCount = 0;
      
      allGoals.forEach((goal: any) => {
        const goalText = (goal.name || '').toLowerCase() + ' ' + (goal.fear || '').toLowerCase();
        
        if (careerKeywords.some(keyword => goalText.includes(keyword))) {
          careerCount++;
        }
        if (socialKeywords.some(keyword => goalText.includes(keyword))) {
          socialCount++;
        }
        if (personalKeywords.some(keyword => goalText.includes(keyword))) {
          personalCount++;
        }
      });
      
      // Determine category based on counts and achievements
      // Priority: Progress badges for streaks/consistency, then category-based badges
      
      // Progress & Persistence Badges (highest priority for streaks)
      if (streakDays >= 7 && daysActive >= 6) {
        const availableProgressBadges = await getAvailableBadgesInCategory('progress');
        if (availableProgressBadges.length > 0) {
          // Prefer badge #27 (Weekly Warrior) if available, otherwise use first available
          const badgeNum = availableProgressBadges.includes(27) ? 27 : availableProgressBadges[0];
          return {
            category: 'progress',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('progress', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru') 
              ? t('progress.badgeMessages.progress7Days')
              : `You've consistently hit your goals for 7 days straight. This badge recognizes your unwavering dedication and momentum.`,
          };
        }
      }
      
      if (completedGoals.length > 0) {
        const availableProgressBadges = await getAvailableBadgesInCategory('progress');
        if (availableProgressBadges.length > 0) {
          // Prefer badge #8 (Summit Reached) if available, otherwise use first available
          const badgeNum = availableProgressBadges.includes(8) ? 8 : availableProgressBadges[0];
          return {
            category: 'progress',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('progress', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.badgeMessages.progressCompleted', { 
                  count: completedGoals.length, 
                  goalLabel: completedGoals.length === 1 ? t('progress.goal') : t('progress.goals') 
                })
              : `You've completed ${completedGoals.length} goal${completedGoals.length > 1 ? 's' : ''}. Every summit starts with a single step.`,
          };
        }
      }
      
      // Category-based badges
      if (careerCount > socialCount && careerCount > personalCount) {
        const availableCareerBadges = await getAvailableBadgesInCategory('career');
        if (availableCareerBadges.length > 0) {
          // Select badge based on career count, cycling through available badges
          const badgeIndex = (careerCount - 1) % availableCareerBadges.length;
          const badgeNum = availableCareerBadges[badgeIndex];
          return {
            category: 'career',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('career', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.badgeMessages.careerDedication')
              : `Your dedication to professional growth is inspiring. This badge celebrates your career milestones.`,
          };
        }
      } else if (socialCount > personalCount) {
        const availableSocialBadges = await getAvailableBadgesInCategory('social');
        if (availableSocialBadges.length > 0) {
          // Select badge based on social count, cycling through available badges
          const badgeIndex = (socialCount - 1) % availableSocialBadges.length;
          const badgeNum = availableSocialBadges[badgeIndex];
          return {
            category: 'social',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('social', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.badgeMessages.socialCourage')
              : `Your courage in building connections is remarkable. This badge honors your social growth.`,
          };
        }
      } else if (personalCount > 0) {
        const availablePersonalBadges = await getAvailableBadgesInCategory('personal');
        if (availablePersonalBadges.length > 0) {
          // Select badge based on personal count, cycling through available badges
          const badgeIndex = (personalCount - 1) % availablePersonalBadges.length;
          const badgeNum = availablePersonalBadges[badgeIndex];
          return {
            category: 'personal',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('personal', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.badgeMessages.personalBravery')
              : `Your bravery in facing personal challenges is inspiring. This badge celebrates your inner strength.`,
          };
        }
      }
      
      // Default: Progress badge for consistency
      if (daysActive >= 6) {
        const availableProgressBadges = await getAvailableBadgesInCategory('progress');
        if (availableProgressBadges.length > 0) {
          const badgeNum = availableProgressBadges.includes(27) ? 27 : availableProgressBadges[0];
          return {
            category: 'progress',
            badgeNumber: badgeNum,
            badgeName: getTranslatedBadgeName('progress', badgeNum),
            badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
              ? t('progress.weeklyActivityBadge', { count: daysActive })
              : `You've been active ${daysActive} out of 7 days this week. Your commitment is inspiring.`,
          };
        }
      }
      
      // Default: Achievement badge
      const availableProgressBadges = await getAvailableBadgesInCategory('progress');
      if (availableProgressBadges.length > 0) {
        const badgeNum = availableProgressBadges.includes(26) ? 26 : availableProgressBadges[0];
        return {
          category: 'progress',
          badgeNumber: badgeNum,
          badgeName: getTranslatedBadgeName('progress', badgeNum),
          badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
            ? t('progress.badgeMessages.progressDefault')
            : `You're making progress! Keep showing up and watch your achievements grow.`,
        };
      }
      
      // Fallback: return null if no badges available (shouldn't happen, but handle gracefully)
      return {
        category: 'progress',
        badgeNumber: 26,
        badgeName: getTranslatedBadgeName('progress', 26),
        badgeMessage: t('progress.badgeMessages.progressDefault'),
      };
    } catch (error) {
      console.error('Error analyzing goals:', error);
      // Fallback to progress badge
      return {
        category: 'progress',
        badgeNumber: 27,
        badgeName: getTranslatedBadgeName('progress', 27),
        badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
          ? t('progress.badgeMessages.progressConsistency')
          : `You've consistently shown up this week. This badge recognizes your dedication.`,
      };
    }
  };

  // Determine badge based on user progress
  const getBadgeData = async () => {
    const badgeInfo = await analyzeUserGoals();
    const badgeImage = getBadgeImage(badgeInfo.badgeNumber);
    
    console.log('Badge selected:', {
      badgeNumber: badgeInfo.badgeNumber,
      badgeName: badgeInfo.badgeName,
      category: badgeInfo.category,
      image: badgeImage,
    });
    
    return {
      name: badgeInfo.badgeName,
      message: badgeInfo.badgeMessage,
      image: badgeImage,
      badgeNumber: badgeInfo.badgeNumber,
      category: badgeInfo.category,
    };
  };
  
  // Handle badge claim
  const handleClaimBadge = async () => {
    const badge = await getBadgeData();
    setBadgeData(badge);
    setShowBadgeModal(true);
  };
  
  // Handle add badge to profile
  const handleAddToProfile = async () => {
    try {
      if (badgeData) {
        // Load existing badges
        const badgesData = await AsyncStorage.getItem('userBadges');
        const badges = badgesData ? JSON.parse(badgesData) : [];
        
        // Generate badge ID from badge number to ensure uniqueness
        const badgeId = `badge_${badgeData.badgeNumber}`;
        
        // Check if badge already exists (by badge number)
        const badgeExists = badges.some((b: any) => b.badgeNumber === badgeData.badgeNumber);
        
        if (!badgeExists) {
          // Determine icon based on badge category
          let badgeIcon = '🏆'; // Default trophy icon
          const category = badgeData.category || 'progress';
          if (category === 'career') {
            badgeIcon = '💼';
          } else if (category === 'social') {
            badgeIcon = '🤝';
          } else if (category === 'personal') {
            badgeIcon = '💪';
          } else if (category === 'progress') {
            badgeIcon = '⭐';
          }
          
          // Add badge to profile with all required fields
          badges.push({
            id: badgeId,
            name: badgeData.name,
            description: badgeData.message,
            icon: badgeIcon,
            badgeNumber: badgeData.badgeNumber,
            dateEarned: new Date().toISOString(),
          });
          
          await AsyncStorage.setItem('userBadges', JSON.stringify(badges));
          
          // Mark this badge as newly added for animation
          await AsyncStorage.setItem('newlyAddedBadgeId', badgeId);
        }
        
        // Close modal
        setShowBadgeModal(false);
        
        // Navigate to "me" screen
        router.push('/(tabs)/me');
      }
    } catch (error) {
      console.error('Error adding badge to profile:', error);
    }
  };
  
  // Handle share badge
  const handleShareBadge = async () => {
    try {
      if (badgeData) {
        const shareMessage = `🎉 ${badgeData.name} 🎉\n\n${badgeData.message}\n\nEarned in Calling App`;
        await Share.share({
          message: shareMessage,
        });
      }
    } catch (error) {
      console.error('Error sharing badge:', error);
    }
  };
  
  // Flip card animation
  const flipCard = (flipAnim: Animated.Value, isFlipped: boolean, setIsFlipped: (val: boolean) => void) => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };
  
  // Get front and back rotation and opacity styles
  const getCardRotation = (flipAnim: Animated.Value) => {
    const frontInterpolate = flipAnim.interpolate({
      inputRange: [0, 90, 180],
      outputRange: ['0deg', '90deg', '180deg'],
    });
    const backInterpolate = flipAnim.interpolate({
      inputRange: [0, 90, 180],
      outputRange: ['180deg', '270deg', '360deg'],
    });
    const frontOpacity = flipAnim.interpolate({
      inputRange: [0, 90, 180],
      outputRange: [1, 0, 0],
    });
    const backOpacity = flipAnim.interpolate({
      inputRange: [0, 90, 180],
      outputRange: [0, 0, 1],
    });
    
    return { frontInterpolate, backInterpolate, frontOpacity, backOpacity };
  };
  

  return (
    <PaperTextureBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
      {/* Back Arrow */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* User Name Heading */}
      <Text style={styles.userNameHeading}>{t('progress.weeklyProgress')}</Text>

      {/* Dynamic Body Text */}
      <Text style={styles.bodyText}>{bodyText || getEngagementMessage(daysActive)}</Text>

      {/* Four Cards Grid */}
      <View style={styles.gridContainer}>
        {/* Row 1 */}
        <View style={styles.gridRow}>
          {/* Days Active */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => flipCard(daysActiveFlip, daysActiveFlipped, setDaysActiveFlipped)}
            style={styles.cardTouchable}
          >
            <View style={styles.card}>
              <Animated.View
                style={[
                  styles.cardFront,
                  {
                    transform: [{ rotateY: getCardRotation(daysActiveFlip).frontInterpolate }],
                    opacity: getCardRotation(daysActiveFlip).frontOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={['#342846', '#342846']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cardGradient}
                >
                  <Text style={styles.cardHeading}>{daysActive}/7</Text>
                  <Text style={styles.cardBody}>{t('progress.daysActive')}</Text>
                </LinearGradient>
              </Animated.View>
              <Animated.View
                style={[
                  styles.cardBack,
                  {
                    transform: [{ rotateY: getCardRotation(daysActiveFlip).backInterpolate }],
                    opacity: getCardRotation(daysActiveFlip).backOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={['#342846', '#342846']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cardGradient}
                >
                  <Text style={styles.cardDescription}>
                    {t('progress.daysActiveDetail', { 
                      count: daysActive, 
                      timeLabel: daysActive === 1 ? t('progress.time') : t('progress.times') 
                    })}
                  </Text>
                  <Text style={styles.cardDescriptionSmall}>
                    Every day you show up is a step toward your goals.
                  </Text>
                </LinearGradient>
              </Animated.View>
            </View>
          </TouchableOpacity>

          {/* Days of Streak */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => flipCard(streakFlip, streakFlipped, setStreakFlipped)}
            style={styles.cardTouchable}
          >
            <View style={styles.card}>
              <Animated.View
                style={[
                  styles.cardFront,
                  {
                    transform: [{ rotateY: getCardRotation(streakFlip).frontInterpolate }],
                    opacity: getCardRotation(streakFlip).frontOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={['#342846', '#342846']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cardGradient}
                >
                  <Text style={styles.cardHeading}>{streakDays}</Text>
                  <Text style={styles.cardBody}>Days of Streak</Text>
                </LinearGradient>
              </Animated.View>
              <Animated.View
                style={[
                  styles.cardBack,
                  {
                    transform: [{ rotateY: getCardRotation(streakFlip).backInterpolate }],
                    opacity: getCardRotation(streakFlip).backOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={['#342846', '#342846']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cardGradient}
                >
                  <Text style={styles.cardDescription}>
                    {t('progress.congrats', { days: streakDays, daysLabel: streakDays === 1 ? t('progress.day') : t('progress.days') })}
                  </Text>
                  <Text style={styles.cardDescriptionSmall}>
                    {t('progress.consistencyBuilding')}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.gridRow}>
          {/* Actions Completed */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => flipCard(actionsFlip, actionsFlipped, setActionsFlipped)}
            style={styles.cardTouchable}
          >
            <View style={styles.card}>
              <Animated.View
                style={[
                  styles.cardFront,
                  {
                    transform: [{ rotateY: getCardRotation(actionsFlip).frontInterpolate }],
                    opacity: getCardRotation(actionsFlip).frontOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={['#342846', '#342846']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cardGradient}
                >
                  <Text style={styles.cardHeading}>{actionsCompleted}</Text>
                  <Text style={styles.cardBody}>{t('progress.actionsCompleted')}</Text>
                </LinearGradient>
              </Animated.View>
              <Animated.View
                style={[
                  styles.cardBack,
                  {
                    transform: [{ rotateY: getCardRotation(actionsFlip).backInterpolate }],
                    opacity: getCardRotation(actionsFlip).backOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={['#342846', '#342846']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cardGradient}
                >
                  <Text style={styles.cardDescription}>
                    {t('progress.actionsDetail', { 
                      count: actionsCompleted, 
                      actionLabel: actionsCompleted === 1 ? t('progress.action') : t('progress.actions') 
                    })}
                  </Text>
                  <Text style={styles.cardDescriptionSmall}>
                    {t('progress.actionsBringCloser')}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </View>
          </TouchableOpacity>

          {/* Focus Hours */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => flipCard(focusHoursFlip, focusHoursFlipped, setFocusHoursFlipped)}
            style={styles.cardTouchable}
          >
            <View style={styles.card}>
              <Animated.View
                style={[
                  styles.cardFront,
                  {
                    transform: [{ rotateY: getCardRotation(focusHoursFlip).frontInterpolate }],
                    opacity: getCardRotation(focusHoursFlip).frontOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={['#342846', '#342846']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cardGradient}
                >
                  <Text style={styles.cardHeading}>{focusHours}</Text>
                  <Text style={styles.cardBody}>{t('progress.focusHours')}</Text>
                </LinearGradient>
              </Animated.View>
              <Animated.View
                style={[
                  styles.cardBack,
                  {
                    transform: [{ rotateY: getCardRotation(focusHoursFlip).backInterpolate }],
                    opacity: getCardRotation(focusHoursFlip).backOpacity,
                  },
                ]}
              >
                <LinearGradient
                  colors={['#342846', '#342846']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cardGradient}
                >
                  <Text style={styles.cardDescription}>
                    {t('progress.focusTimeDetail')}
                  </Text>
                  <Text style={styles.cardDescriptionSmall}>
                    {t('progress.focusMomentGrows')}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* This Week's Journey Heading */}
      <Text style={styles.journeyHeading}>{t('progress.thisWeeksJourney')}</Text>

      {/* Seven Circles for Days of Week */}
      <View style={styles.weekCirclesContainer}>
        {weekData.map((dayData, index) => (
          <View key={index} style={styles.dayContainer}>
            {dayData.active ? (
              <View style={styles.dayCircleActiveWrapper}>
                <ImageBackground
                  source={require('../assets/images/goal.background.png')}
                  style={styles.dayCircleActive}
                  imageStyle={styles.dayCircleImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={styles.dayCircle} />
            )}
            <Text style={styles.dayName}>{t(`progress.weekDays.${dayData.day}`)}</Text>
          </View>
        ))}
      </View>

      {/* Claim Your Badge Field */}
      <LinearGradient
        colors={['#fffffe', '#e6e6e6', '#f6fdff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.badgeField}
      >
        <TouchableOpacity
          style={styles.badgeFieldContent}
          onPress={handleClaimBadge}
        >
          <Text style={styles.badgeFieldText}>{t('progress.claimYourBadge')}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* New Goal Field */}
      <LinearGradient
        colors={['#fffffe', '#e6e6e6', '#f6fdff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.goalField}
      >
        <View style={styles.goalFieldContent}>
          <Text style={styles.goalFieldText}>New Goal</Text>
          <TouchableOpacity
            onPress={() => {
              router.push('/new-goal');
            }}
          >
            <Text style={styles.goalPlusText}>+</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ScrollView>
    
    {/* Badge Modal */}
    <Modal
      visible={showBadgeModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowBadgeModal(false)}
    >
      <TouchableOpacity
        style={styles.badgeModalOverlay}
        activeOpacity={1}
        onPress={() => setShowBadgeModal(false)}
      >
        <TouchableOpacity
          style={styles.badgeModalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Badge Icon Section with Stars */}
          {badgeData && (
            <View style={styles.badgeIconSection}>
              {/* Top Right Star */}
              <View style={styles.starTopRight}>
                <Ionicons name="star" size={24} color="#B89F70" />
              </View>
              
              {/* Main Badge Image */}
              <View style={styles.badgeImageWrapper}>
                <Image
                  source={badgeData.image}
                  style={styles.badgeImage}
                  resizeMode="contain"
                />
              </View>
              
              {/* Bottom Left Star */}
              <View style={styles.starBottomLeft}>
                <Ionicons name="star" size={24} color="#8DB596" />
              </View>
            </View>
          )}
          
          {/* New Unlock Tag */}
          <View style={styles.newUnlockTag}>
            <Text style={styles.newUnlockText}>{t('progress.newUnlock')}</Text>
          </View>
          
          {/* Badge Title */}
          {badgeData && (
            <Text style={styles.badgeTitle}>{badgeData.name}</Text>
          )}
          
          {/* Badge Description */}
          {badgeData && (
            <Text style={styles.badgeDescription}>{badgeData.message}</Text>
          )}
          
          {/* Add to Profile Button */}
          <TouchableOpacity
            style={styles.addToProfileButton}
            onPress={handleAddToProfile}
          >
            <Text style={styles.addToProfileText}>
              {i18n.language === 'ru' || i18n.language?.startsWith('ru') ? t('progress.addToProfile') : 'Add to Profile'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.arrowIcon} />
          </TouchableOpacity>
          
          {/* Share Achievement Link */}
          <TouchableOpacity
            style={styles.shareAchievementLink}
            onPress={handleShareBadge}
          >
            <Text style={styles.shareAchievementText}>{t('progress.shareAchievement')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
    width: '100%',
  },
  backButtonText: {
    fontSize: 28,
    color: '#342846',
    fontWeight: 'bold',
  },
  userNameHeading: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 16,
    fontSize: 24,
    textAlign: 'center',
    width: '100%',
  },
  bodyText: {
    ...BodyStyle,
    color: '#342846',
    marginBottom: 32,
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  gridContainer: {
    marginBottom: 32,
    width: '100%',
    alignSelf: 'stretch',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 16, // Spacing between cards
    width: '100%',
  },
  cardTouchable: {
    flex: 1,
    height: 100,
  },
  card: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#342846',
    height: 100, // Fixed height for all cards
    minWidth: 0, // Ensure flex items can shrink
  },
  cardFront: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  cardBack: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    padding: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeading: {
    ...HeadingStyle,
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  cardBody: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 17, // Reduced by 12% (from ~19 to 17)
  },
  cardDescription: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
    marginBottom: 3,
    paddingHorizontal: 20, // Minimum 20px padding (was 4)
  },
  cardDescriptionSmall: {
    ...BodyStyle,
    color: '#ffffff',
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 10,
    paddingHorizontal: 20, // Minimum 20px padding (was 4)
    fontStyle: 'italic',
  },
  journeyHeading: {
    ...HeadingStyle,
    color: '#342846',
    marginBottom: 24,
    fontSize: 22,
    textAlign: 'center',
  },
  weekCirclesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 20, // Minimum 20px padding (was 0) - ensures day names don't touch edges
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#342846',
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  dayCircleActiveWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    overflow: 'hidden',
  },
  dayCircleActive: {
    width: '100%',
    height: '100%',
  },
  dayCircleImage: {
    width: '100%',
    height: '100%',
  },
  dayName: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 12,
    textAlign: 'center',
  },
  badgeField: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  badgeFieldContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  badgeFieldText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  goalField: {
    borderWidth: 1,
    borderColor: '#342846',
    borderRadius: 8,
    overflow: 'hidden',
  },
  goalFieldContent: {
    paddingHorizontal: 20, // Minimum 20px padding (was 16)
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20, // More spacing between "New Goal" and "+"
  },
  goalFieldText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
  goalPlusText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 24,
    fontWeight: 'bold',
  },
  badgeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  badgeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeIconSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    width: 160,
    height: 160,
  },
  badgeImageWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  badgeImage: {
    width: '100%',
    height: '100%',
  },
  starTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newUnlockTag: {
    backgroundColor: '#E8EDF2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  newUnlockText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    fontWeight: '500',
    color: '#6D7581',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#332D41',
    textAlign: 'center',
    marginBottom: 12,
  },
  badgeDescription: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: '#6D7581',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20, // Minimum 20px padding (was 8)
  },
  addToProfileButton: {
    width: '100%',
    backgroundColor: '#342846',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addToProfileText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  arrowIcon: {
    marginLeft: 4,
  },
  shareAchievementLink: {
    paddingVertical: 8,
  },
  shareAchievementText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: '#6D7581',
    textAlign: 'center',
  },
});

