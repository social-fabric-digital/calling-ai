import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { getActiveDaysThisWeek, getCurrentWeekDateRange, getDaysActiveThisWeek, getLoginCountThisWeek, getReflectionCountsThisWeek } from '@/utils/appTracking';
import i18n from '@/utils/i18n';
import { getMostFrequentMoodThisWeek } from '@/utils/moodStorage';
import { getCompletedGoals, getLevelCompletionEvents, getStepCompletionEvents } from '@/utils/goalTracking';
import { hapticSuccess } from '@/utils/haptics';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ATLAS_CHAT_STORAGE_KEY = '@atlas_chat_messages';
const WEEKLY_BADGE_CLAIMS_KEY = 'weeklyBadgeClaims';

type StoredAtlasMessage = {
  type: 'atlas' | 'user';
  text: string;
  timestamp?: string;
};

const WIN_KEYWORDS = [
  'win', 'wins', 'won', 'happy', 'happier', 'glad', 'proud', 'achievement', 'achieved', 'success', 'successful',
  'побед', 'радост', 'счастл', 'получил', 'получила', 'получилось', 'успех', 'горж', 'достиг', 'достигла',
  'сделал', 'сделала', 'классно', 'ура', 'круто',
];

const getCurrentWeekBounds = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

const isWithinWeek = (date: Date, weekStart: Date, weekEnd: Date): boolean => {
  const ts = date.getTime();
  return ts >= weekStart.getTime() && ts <= weekEnd.getTime();
};

const textLooksLikeWin = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return WIN_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const truncateText = (text: string, maxLength = 90): string => {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength - 1)}...` : singleLine;
};

// ============================================================================
// THIS WEEK SCREEN (Weekly Progress)
// A clean, encouraging view of the user's weekly journey
// Organized into digestible sections that celebrate progress without overwhelm
// ============================================================================

export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isRussian = i18n.language === 'ru' || i18n.language?.startsWith('ru');
  const tr = (en: string, ru: string) => (isRussian ? ru : en);
  
  // Animation for pulsating heart icon
  const heartScale = React.useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    
    return () => pulseAnimation.stop();
  }, [heartScale]);
  
  // State for week data
  const [weekData, setWeekData] = useState({
    dateRange: '',
    loginCount: 0,
    daysActive: 0,
    totalDays: 7,
    streakEmoji: '🔥',
    activeDays: [false, false, false, false, false, false, false],
    
    // Path Progress
    pathName: '',
    currentGoal: '',
    currentLevel: 1,
    totalLevels: 4,
    levelProgress: 0,
    stepsCompletedThisWeek: 0,
    levelsCompletedThisWeek: 0,
    goalsCompletedThisWeek: 0,
    
    // Reflections
    reflections: {
      clarityMaps: 0,
      dailyQuestions: 0,
      cosmicInsights: 0,
      focusSessions: 0
    },
    
    // Pattern (AI-generated insight)
    pattern: {
      theme: '',
      insight: ''
    },
    
    // Mood tracking
    mostFrequentMood: {
      emoji: '😊',
      label: '',
      count: 0
    },
    
    // Small wins (AI-generated, always positive)
    smallWins: [] as string[],
    
    // Next step suggestion
    nextStep: {
      action: '',
      ikigaiConnection: ''
    }
  });

  // Badge modal state
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeData, setBadgeData] = useState<{
    name: string;
    message: string;
    image: any;
    badgeNumber?: number;
    category?: 'career' | 'social' | 'personal' | 'progress';
  } | null>(null);
  const [weeklyClaimedBadge, setWeeklyClaimedBadge] = useState<{
    category: 'career' | 'social' | 'personal' | 'progress';
    badgeNumber: number;
    badgeName: string;
    badgeMessage: string;
    claimedAt: string;
  } | null>(null);

  // Current goal ID state
  const [currentGoalId, setCurrentGoalId] = useState<string | null>(null);
  
  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Load current goal ID and week data on mount and when screen comes into focus
  const loadData = useCallback(async () => {
    try {
      let userGoals: any[] = [];

      // Load current goal ID
      const userGoalsData = await AsyncStorage.getItem('userGoals');
      if (userGoalsData) {
        userGoals = JSON.parse(userGoalsData);
        const activeGoal = userGoals.find((g: any) => g.isActive === true);
        if (activeGoal && activeGoal.id) {
          setCurrentGoalId(activeGoal.id);
          
          // Set goal-related data
          setWeekData(prev => ({
            ...prev,
            pathName: activeGoal.name || '',
            currentGoal: activeGoal.name || '',
            currentLevel: (activeGoal.currentStepIndex !== undefined ? activeGoal.currentStepIndex + 1 : 1) || 1,
            totalLevels: activeGoal.numberOfSteps || 4,
            levelProgress: activeGoal.progressPercentage || 0,
          }));
        }
      }
      
      // Load days active data
      const daysActive = await getDaysActiveThisWeek();
      const loginCount = await getLoginCountThisWeek();
      const dateRange = getCurrentWeekDateRange(isRussian ? 'ru-RU' : 'en-US');
      const activeDays = await getActiveDaysThisWeek();
      const mostFrequentMood = await getMostFrequentMoodThisWeek(isRussian ? 'ru-RU' : 'en-US');
      const reflectionCounts = await getReflectionCountsThisWeek();
      const { weekStart, weekEnd } = getCurrentWeekBounds();

      const completedGoals = await getCompletedGoals();
      const goalsCompletedThisWeek = completedGoals.filter((goal) => {
        if (!goal.dateCompleted) return false;
        const completedDate = new Date(`${goal.dateCompleted}T12:00:00`);
        return isWithinWeek(completedDate, weekStart, weekEnd);
      });

      const levelCompletionEvents = await getLevelCompletionEvents();
      const levelsCompletedThisWeek = levelCompletionEvents.filter((event) =>
        isWithinWeek(new Date(event.completedAt), weekStart, weekEnd)
      );
      const stepCompletionEvents = await getStepCompletionEvents();
      const stepsCompletedThisWeekEvents = stepCompletionEvents.filter((event) =>
        isWithinWeek(new Date(event.completedAt), weekStart, weekEnd)
      );

      const atlasMessagesRaw = await AsyncStorage.getItem(ATLAS_CHAT_STORAGE_KEY);
      const atlasMessages: StoredAtlasMessage[] = atlasMessagesRaw ? JSON.parse(atlasMessagesRaw) : [];
      const atlasWinsThisWeek = atlasMessages
        .filter((message) => {
          if (message.type !== 'user' || !message.text || !message.timestamp) return false;
          const messageDate = new Date(message.timestamp);
          if (!isWithinWeek(messageDate, weekStart, weekEnd)) return false;
          return textLooksLikeWin(message.text);
        })
        .slice(-3)
        .map((message) =>
          isRussian
            ? `Ты отметил в чате с Атласом: "${truncateText(message.text)}"`
            : `You shared with Atlas: "${truncateText(message.text)}"`
        );

      const generatedSmallWins: string[] = [];
      if (stepsCompletedThisWeekEvents.length > 0) {
        generatedSmallWins.push(
          isRussian
            ? `Ты отметил(а) как выполненные ${stepsCompletedThisWeekEvents.length} шагов за эту неделю.`
            : `You checked off ${stepsCompletedThisWeekEvents.length} steps this week.`
        );
      }

      if (levelsCompletedThisWeek.length > 0) {
        generatedSmallWins.push(
          isRussian
            ? `Ты завершил(а) ${levelsCompletedThisWeek.length} уровней за эту неделю.`
            : `You completed ${levelsCompletedThisWeek.length} levels this week.`
        );
      }

      if (goalsCompletedThisWeek.length > 0) {
        generatedSmallWins.push(
          isRussian
            ? `Ты завершил(а) ${goalsCompletedThisWeek.length} целей за эту неделю.`
            : `You completed ${goalsCompletedThisWeek.length} goals this week.`
        );
      }

      generatedSmallWins.push(...atlasWinsThisWeek);
      const smallWins = Array.from(new Set(generatedSmallWins)).slice(0, 5);

      const weeklyClaimsRaw = await AsyncStorage.getItem(WEEKLY_BADGE_CLAIMS_KEY);
      const weeklyClaims = weeklyClaimsRaw ? JSON.parse(weeklyClaimsRaw) : {};
      const currentWeekKey = getCurrentWeekKey();
      const claimedThisWeek = weeklyClaims[currentWeekKey] || null;
      setWeeklyClaimedBadge(claimedThisWeek);
      
      setWeekData(prev => ({
        ...prev,
        loginCount,
        daysActive,
        dateRange: `${dateRange.start} - ${dateRange.end}`,
        activeDays,
        mostFrequentMood: mostFrequentMood || prev.mostFrequentMood,
        reflections: reflectionCounts,
        stepsCompletedThisWeek: stepsCompletedThisWeekEvents.length,
        levelsCompletedThisWeek: levelsCompletedThisWeek.length,
        goalsCompletedThisWeek: goalsCompletedThisWeek.length,
        smallWins,
      }));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [isRussian]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleClaimBadge = async () => {
    if (weeklyClaimedBadge) {
      setBadgeData({
        name: weeklyClaimedBadge.badgeName,
        message: weeklyClaimedBadge.badgeMessage,
        image: getBadgeImage(weeklyClaimedBadge.badgeNumber),
        badgeNumber: weeklyClaimedBadge.badgeNumber,
        category: weeklyClaimedBadge.category,
      });
      void hapticSuccess();
      setShowBadgeModal(true);
      return;
    }

    const badgeInfo = await analyzeUserGoals({
      daysActive: weekData.daysActive,
      loginCount: weekData.loginCount,
      stepsCompletedThisWeek: weekData.stepsCompletedThisWeek,
      levelsCompletedThisWeek: weekData.levelsCompletedThisWeek,
      goalsCompletedThisWeek: weekData.goalsCompletedThisWeek,
      reflections: weekData.reflections,
      goalsText: `${weekData.currentGoal} ${weekData.pathName}`,
    });

    setBadgeData({
      name: badgeInfo.badgeName,
      message: badgeInfo.badgeMessage,
      image: getBadgeImage(badgeInfo.badgeNumber),
      badgeNumber: badgeInfo.badgeNumber,
      category: badgeInfo.category,
    });
    void hapticSuccess();
    setShowBadgeModal(true);
  };

  const handleAddToProfile = async () => {
    try {
      if (badgeData) {
        const badgesData = await AsyncStorage.getItem('userBadges');
        const badges = badgesData ? JSON.parse(badgesData) : [];
        const badgeId = `badge_${badgeData.badgeNumber}`;
        const badgeExists = badges.some((b: any) => b.badgeNumber === badgeData.badgeNumber);
        
        if (!badgeExists) {
          let badgeIcon = '🏆';
          const category = badgeData.category || 'progress';
          if (category === 'career') badgeIcon = '💼';
          else if (category === 'social') badgeIcon = '🤝';
          else if (category === 'personal') badgeIcon = '💪';
          else if (category === 'progress') badgeIcon = '⭐';
          
          badges.push({
            id: badgeId,
            name: badgeData.name,
            description: badgeData.message,
            icon: badgeIcon,
            badgeNumber: badgeData.badgeNumber,
            dateEarned: new Date().toISOString(),
          });
          
          await AsyncStorage.setItem('userBadges', JSON.stringify(badges));
          await AsyncStorage.setItem('newlyAddedBadgeId', badgeId);
        }

        const currentWeekKey = getCurrentWeekKey();
        const weeklyClaimsRaw = await AsyncStorage.getItem(WEEKLY_BADGE_CLAIMS_KEY);
        const weeklyClaims = weeklyClaimsRaw ? JSON.parse(weeklyClaimsRaw) : {};
        weeklyClaims[currentWeekKey] = {
          category: badgeData.category || 'progress',
          badgeNumber: badgeData.badgeNumber,
          badgeName: badgeData.name,
          badgeMessage: badgeData.message,
          claimedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(WEEKLY_BADGE_CLAIMS_KEY, JSON.stringify(weeklyClaims));
        setWeeklyClaimedBadge(weeklyClaims[currentWeekKey]);
        
        setShowBadgeModal(false);
        router.push('/(tabs)/me');
      }
    } catch (error) {
      console.error('Error adding badge to profile:', error);
    }
  };

  const placeholderSmallWins = [
    tr(
      'Complete a goal or level, or share a small win with Atlas - and it will appear here.',
      'Заверши цель или уровень, либо поделись маленькой победой с Атласом - и она появится здесь.'
    ),
  ];
  const isPlaceholderSmallWins = weekData.smallWins.length === 0;
  const smallWinsToDisplay = isPlaceholderSmallWins ? placeholderSmallWins : weekData.smallWins;

  return (
    <ImageBackground
      source={require('../assets/images/progress.png')}
      style={styles.screen}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(60, insets.top + 20) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#342846" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{tr('YOUR WEEK', 'ТВОЯ НЕДЕЛЯ')}</Text>
            <Text style={styles.dateRange}>{weekData.dateRange}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.helpButton}
            activeOpacity={0.7}
            onPress={() => setShowHelpModal(true)}
          >
            <MaterialIcons name="help-outline" size={24} color="#342846" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* ============ ENGAGEMENT CARD ============ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('WEEKLY ENGAGEMENT', 'НЕДЕЛЬНАЯ АКТИВНОСТЬ')}</Text>
            <View style={styles.engagementCard}>
              <FrostedCardLayer />
              <View style={styles.engagementHeader}>
                <View style={styles.fireImageWrapper}>
                  <Image 
                    source={require('../assets/images/fire.png')} 
                    style={styles.streakEmoji}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.engagementStats}>
                  <Text style={styles.daysActiveNumber}>{weekData.loginCount}</Text>
                  <Text style={styles.daysActiveLabel}>
                    {isRussian ? `${weekData.loginCount} входов на этой неделе` : `${weekData.loginCount} logins this week`}
                  </Text>
                </View>
              </View>
              
              {/* Progress bar */}
              <View style={styles.engagementProgressTrack}>
                {[...Array(7)].map((_, i) => (
                  <View 
                    key={i}
                    style={[
                      styles.engagementDot,
                      { backgroundColor: i < Math.min(weekData.loginCount, 7) ? '#342846' : '#E8E8E8' }
                    ]}
                  />
                ))}
              </View>

              {/* Badge section */}
              <View style={styles.badgeSection}>
                <TouchableOpacity 
                  style={styles.claimBadgeButton}
                  onPress={handleClaimBadge}
                  activeOpacity={0.8}
                >
                  <Text style={styles.claimBadgeButtonText}>
                    {weeklyClaimedBadge
                      ? tr('Badge already claimed this week', 'Награда за эту неделю уже получена')
                      : t('progress.claimYourBadge', { defaultValue: tr('Claim your badge', 'Забрать награду') })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ============ PATH PROGRESS ============ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('THIS WEEK ON YOUR PATH', 'ТВОЙ ПУТЬ НА ЭТОЙ НЕДЕЛЕ')}</Text>
            
            <View style={styles.pathCard}>
              <FrostedCardLayer />
              <View style={styles.pathHeader}>
                <View style={styles.pathIcon}>
                  <Image 
                    source={require('../assets/images/target (1).png')} 
                    style={styles.pathIconImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.pathInfo}>
                  <Text style={styles.pathName}>{weekData.pathName}</Text>
                  <Text style={styles.currentGoalLabel}>
                    {tr('Main focus this week', 'Основной фокус недели')}
                  </Text>
                </View>
              </View>
              
              <View style={styles.levelProgress}>
                <View style={styles.levelInfo}>
                  <Text style={styles.levelText}>{tr('Level', 'Уровень')} {weekData.currentLevel} {tr('of', 'из')} {weekData.totalLevels}</Text>
                  <Text style={styles.levelPercent}>{weekData.levelProgress}%</Text>
                </View>
                <View style={styles.levelTrack}>
                  <View style={[styles.levelFill, { width: `${weekData.levelProgress}%` }]} />
                </View>
              </View>

              <View style={styles.stepsCompleted}>
                <Text style={styles.stepsIcon}>✓</Text>
                <Text style={styles.stepsText}>
                  {tr('Steps completed this week:', 'За неделю завершено шагов:')} {weekData.stepsCompletedThisWeek}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.viewGoalMapButton}
                activeOpacity={0.7}
                onPress={() => {
                  router.push(
                    currentGoalId
                      ? {
                          pathname: '/goal-map',
                          params: { goalId: currentGoalId },
                        }
                      : '/(tabs)/goals'
                  );
                }}
              >
                <Text style={styles.viewGoalMapButtonText}>{tr('Open goal map', 'Открыть карту цели')}</Text>
                <MaterialIcons name="chevron-right" size={16} color="#342846" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ============ REFLECTIONS SUMMARY ============ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('THIS WEEK REFLECTION', 'РЕФЛЕКСИЯ ЭТОЙ НЕДЕЛИ')}</Text>
            
            <View style={styles.reflectionsGrid}>
              <ReflectionItem 
                imageSource={require('../assets/images/love.png')}
                label={tr('Clarity maps', 'Карты ясности')} 
                count={weekData.reflections.clarityMaps} 
              />
              <ReflectionItem 
                emoji="💭" 
                label={tr('Daily questions', 'Ежедневные вопросы')} 
                count={weekData.reflections.dailyQuestions} 
              />
              <ReflectionItem 
                imageSource={require('../assets/images/focus.png')}
                label={tr('Cosmic insights', 'Космические инсайты')} 
                count={weekData.reflections.cosmicInsights} 
              />
              <ReflectionItem 
                imageSource={require('../assets/images/focussanctuary.png')}
                label={tr('Focus sessions', 'Фокус-сессии')} 
                count={weekData.reflections.focusSessions} 
              />
            </View>
          </View>

          {/* ============ MOOD SUMMARY ============ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('YOUR MOST FREQUENT MOOD', 'ТВОЕ САМОЕ ЧАСТОЕ НАСТРОЕНИЕ')}</Text>
            
            <View style={styles.moodCard}>
              <FrostedCardLayer />
              <Text style={styles.moodEmoji}>{weekData.mostFrequentMood.emoji}</Text>
              <View style={styles.moodInfo}>
                <Text style={styles.moodLabel}>{weekData.mostFrequentMood.label}</Text>
                <Text style={styles.moodCount}>
                  {isRussian
                    ? `${weekData.mostFrequentMood.count} раз за эту неделю`
                    : `${weekData.mostFrequentMood.count} times this week`}
                </Text>
              </View>
            </View>
          </View>

          {/* ============ SMALL WINS ============ */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>{tr('SMALL WINS THIS WEEK', 'МАЛЕНЬКИЕ ПОБЕДЫ ЗА НЕДЕЛЮ')}</Text>
            </View>
            
            <View style={styles.winsCard}>
              <FrostedCardLayer />
              {smallWinsToDisplay.map((win, index) => (
                <View
                  key={index}
                  style={[styles.winItem, isPlaceholderSmallWins && styles.winItemCentered]}
                >
                  {!isPlaceholderSmallWins && (
                    <View style={styles.winCheckmark}>
                      <MaterialIcons name="check" size={14} color="#342846" />
                    </View>
                  )}
                  <Text style={[styles.winText, isPlaceholderSmallWins && styles.winTextCentered]}>{win}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bottom spacing for nav */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

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
            {badgeData && (
              <View style={styles.badgeIconSection}>
                <View style={styles.starTopRight}>
                  <Ionicons name="star" size={24} color="#B89F70" />
                </View>
                <View style={styles.badgeImageWrapper}>
                  <Image
                    source={badgeData.image}
                    style={styles.badgeImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.starBottomLeft}>
                  <Ionicons name="star" size={24} color="#8DB596" />
                </View>
              </View>
            )}
            <View style={styles.newUnlockTag}>
              <Text style={styles.newUnlockText}>{t('progress.newUnlock', { defaultValue: tr('NEW BADGE', 'НОВАЯ НАГРАДА') })}</Text>
            </View>
            {badgeData && (
              <>
                <Text style={styles.badgeTitle}>{badgeData.name}</Text>
                <Text style={styles.badgeDescription}>{badgeData.message}</Text>
              </>
            )}
            <TouchableOpacity
              style={styles.addToProfileButton}
              onPress={handleAddToProfile}
            >
              <Text style={styles.addToProfileText}>
                {t('progress.showItOnMeScreen', { defaultValue: tr('Show on "Me" page', 'Показать в разделе "Я"') })}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.arrowIcon} />
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.helpModalOverlay}>
          <TouchableOpacity
            style={styles.helpModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowHelpModal(false)}
          />
          <View style={styles.helpModalContent}>
            <View style={styles.helpModalHeader}>
              <TouchableOpacity
                onPress={() => setShowHelpModal(false)}
                style={styles.helpModalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#342846" />
              </TouchableOpacity>
              <View style={styles.helpModalTitleContainer}>
                <Text style={styles.helpModalTitle}>{tr('Your weekly progress', 'Твой недельный прогресс')}</Text>
                <Text style={styles.helpModalSubtitle}>
                  {tr('A quick snapshot of your week: goals, reflection, and growth.', 'Короткий срез твоей недели: цели, рефлексия и рост.')}
                </Text>
              </View>
            </View>
            
            <ScrollView 
              style={styles.helpModalScroll} 
              contentContainerStyle={styles.helpModalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.helpQuickGrid}>
                <View style={styles.helpQuickCard}>
                  <Text style={styles.helpQuickIcon}>🔥</Text>
                  <Text style={styles.helpQuickTitle}>{tr('Consistency', 'Последовательность')}</Text>
                  <Text style={styles.helpQuickText}>
                    {tr('Track active days and weekly momentum.', 'Отслеживай активные дни и недельный импульс.')}
                  </Text>
                </View>
                <View style={styles.helpQuickCard}>
                  <Text style={styles.helpQuickIcon}>🎯</Text>
                  <Text style={styles.helpQuickTitle}>{tr('Path progress', 'Прогресс пути')}</Text>
                  <Text style={styles.helpQuickText}>
                    {tr('See your level and goal completion status.', 'Смотри текущий уровень и прогресс по цели.')}
                  </Text>
                </View>
                <View style={styles.helpQuickCard}>
                  <Text style={styles.helpQuickIcon}>📝</Text>
                  <Text style={styles.helpQuickTitle}>{tr('Reflection', 'Рефлексия')}</Text>
                  <Text style={styles.helpQuickText}>
                    {tr('Review clarity maps, insights, and focus sessions.', 'Смотри карты ясности, инсайты и фокус-сессии.')}
                  </Text>
                </View>
                <View style={styles.helpQuickCard}>
                  <Text style={styles.helpQuickIcon}>🏆</Text>
                  <Text style={styles.helpQuickTitle}>{tr('Small wins', 'Маленькие победы')}</Text>
                  <Text style={styles.helpQuickText}>
                    {tr('Celebrate completed steps and goals this week.', 'Отмечай завершенные шаги и цели за неделю.')}
                  </Text>
                </View>
              </View>

              <View style={styles.helpFocusCard}>
                <Text style={styles.helpFocusTitle}>{tr('Why this screen matters', 'Почему этот экран важен')}</Text>
                <Text style={styles.helpFocusText}>
                  {tr(
                    'It helps you notice your momentum, recognize real progress, and stay motivated with visible weekly proof.',
                    'Он помогает увидеть импульс, заметить реальный прогресс и поддерживать мотивацию через видимые результаты недели.'
                  )}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

// Badge image mapping
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

const getBadgeImage = (badgeNumber: number) => {
  return badgeImageMap[badgeNumber] || require('../assets/images/trophy.png');
};

const BADGE_CATEGORIES = {
  career: {
    badges: [2, 5, 7, 9, 17, 21, 22, 30],
    names: {
      2: 'Апгрейд навыков',
      5: 'Катализатор роста',
      7: 'Преодоление порога',
      9: 'Обновленное резюме',
      17: 'Мастер времени',
      21: 'Первая заявка',
      22: 'Сильный голос',
      30: 'Новые возможности',
    },
  },
  social: {
    badges: [3, 10, 11, 15, 16, 18, 23, 24, 29],
    names: {
      3: 'Создатель связей',
      10: 'Строитель мостов',
      11: 'Смелость на встрече',
      15: 'Тихая сила в шторме',
      16: 'Мастер контакта',
      18: 'Смелая уязвимость',
      23: 'Социальная уверенность',
      24: 'Участник группы',
      29: 'Первый шаг навстречу',
    },
  },
  personal: {
    badges: [1, 4, 6, 12, 13, 14, 19, 20, 25, 28],
    names: {
      1: 'Победа над страхом',
      4: 'Личный пик',
      6: 'Поиск пути',
      12: 'Первый подход',
      13: 'Личные границы',
      14: 'Поиск сокровищ',
      19: 'Выход из зоны комфорта',
      20: 'Физическая смелость',
      25: 'Соло-приключение',
      28: 'Личная трансформация',
    },
  },
  progress: {
    badges: [8, 26, 27],
    names: {
      8: 'Пик взят',
      26: 'Достижение открыто',
      27: 'Воин недели',
    },
  },
};

const BADGE_CATEGORY_NAMES_EN = {
  career: {
    2: 'Skill Upgrade',
    5: 'Growth Catalyst',
    7: 'Threshold Breaker',
    9: 'Resume Refresh',
    17: 'Time Master',
    21: 'First Application',
    22: 'Visible Voice',
    30: 'New Opportunities',
  },
  social: {
    3: 'Connection Builder',
    10: 'Bridge Builder',
    11: 'Coffee Courage',
    15: 'Calm in the Storm',
    16: 'Connection Master',
    18: 'Vulnerability Champion',
    23: 'Social Confidence',
    24: 'Group Contributor',
    29: 'First Step',
  },
  personal: {
    1: 'Fear Winner',
    4: 'Personal Peak',
    6: 'Path Finder',
    12: 'First Repeat',
    13: 'Boundary Setter',
    14: 'Treasure Seeker',
    19: 'Comfort Zone Exit',
    20: 'Physical Courage',
    25: 'Solo Adventure',
    28: 'Personal Transformation',
  },
  progress: {
    8: 'Summit Reached',
    26: 'Achievement Unlocked',
    27: 'Weekly Warrior',
  },
} as const;

const getAvailableBadgesInCategory = async (category: 'career' | 'social' | 'personal' | 'progress'): Promise<number[]> => {
  try {
    const badgesData = await AsyncStorage.getItem('userBadges');
    const existingBadges = badgesData ? JSON.parse(badgesData) : [];
    const earnedBadgeNumbers = new Set(existingBadges.map((b: any) => b.badgeNumber).filter((n: any) => n !== undefined));
    const categoryBadges = BADGE_CATEGORIES[category].badges;
    return categoryBadges.filter(badgeNum => !earnedBadgeNumbers.has(badgeNum));
  } catch (error) {
    return BADGE_CATEGORIES[category].badges;
  }
};

const getTranslatedBadgeName = (category: string, badgeNumber: number): string => {
  const isRussian = i18n.language === 'ru' || i18n.language?.startsWith('ru');
  if (isRussian) {
    const translationKey = `progress.badgeNames.${category}.${badgeNumber}`;
    const translated = i18n.t(translationKey);
    if (translated && translated !== translationKey) {
      return translated;
    }
  }
  if (!isRussian) {
    const englishCategory = BADGE_CATEGORY_NAMES_EN[category as keyof typeof BADGE_CATEGORY_NAMES_EN] as Record<number, string> | undefined;
    if (englishCategory && englishCategory[badgeNumber]) {
      return englishCategory[badgeNumber];
    }
    return 'Achievement';
  }
  const categoryData = BADGE_CATEGORIES[category as keyof typeof BADGE_CATEGORIES];
  if (categoryData && categoryData.names) {
    const names = categoryData.names as Record<number, string>;
    return names[badgeNumber] || 'Достижение';
  }
  return 'Достижение';
};

type BadgeCategory = 'career' | 'social' | 'personal' | 'progress';

type WeeklyBadgeStats = {
  daysActive: number;
  loginCount: number;
  stepsCompletedThisWeek: number;
  levelsCompletedThisWeek: number;
  goalsCompletedThisWeek: number;
  reflections: {
    clarityMaps: number;
    dailyQuestions: number;
    cosmicInsights: number;
    focusSessions: number;
  };
  goalsText: string;
};

type WeeklyBadgeDecision = {
  category: 'career' | 'social' | 'personal' | 'progress';
  badgeNumber: number;
  badgeName: string;
  badgeMessage: string;
};

const getCurrentWeekKey = (): string => {
  const { weekStart } = getCurrentWeekBounds();
  return weekStart.toISOString().split('T')[0];
};

const pickBadgeFromCategory = async (
  category: BadgeCategory,
  preferredByPriority: number[]
): Promise<number | null> => {
  const available = await getAvailableBadgesInCategory(category);
  if (available.length === 0) return null;
  for (const candidate of preferredByPriority) {
    if (available.includes(candidate)) return candidate;
  }
  return available[0];
};

const analyzeUserGoals = async (stats: WeeklyBadgeStats): Promise<WeeklyBadgeDecision> => {
  try {
    const goalsData = await AsyncStorage.getItem('userGoals');
    const goals = goalsData ? JSON.parse(goalsData) : [];
    const allGoals = goals;
    
    const careerKeywords = ['job', 'career', 'interview', 'resume', 'linkedin', 'network', 'professional', 'work', 'business', 'application', 'skill', 'promotion', 'salary'];
    const socialKeywords = ['meet', 'friend', 'social', 'group', 'coffee', 'party', 'relationship', 'connection', 'community', 'team', 'together', 'share', 'communicate'];
    const personalKeywords = ['fear', 'anxiety', 'boundary', 'self-care', 'gym', 'exercise', 'health', 'mental', 'house', 'leave', 'adventure', 'solo', 'courage', 'overcome'];
    
    let careerCount = 0;
    let socialCount = 0;
    let personalCount = 0;
    
    allGoals.forEach((goal: any) => {
      const goalText = (goal.name || '').toLowerCase() + ' ' + (goal.fear || '').toLowerCase();
      if (careerKeywords.some(keyword => goalText.includes(keyword))) careerCount++;
      if (socialKeywords.some(keyword => goalText.includes(keyword))) socialCount++;
      if (personalKeywords.some(keyword => goalText.includes(keyword))) personalCount++;
    });
    
    const reflectionScore =
      stats.reflections.clarityMaps +
      stats.reflections.dailyQuestions +
      stats.reflections.cosmicInsights +
      stats.reflections.focusSessions;

    const progressScore =
      stats.goalsCompletedThisWeek * 8 +
      stats.levelsCompletedThisWeek * 5 +
      stats.stepsCompletedThisWeek * 2 +
      stats.daysActive;
    const careerScore = careerCount * 3 + Math.round(stats.stepsCompletedThisWeek * 0.5);
    const socialScore = socialCount * 3 + Math.round(stats.reflections.dailyQuestions * 0.5);
    const personalScore = personalCount * 3 + reflectionScore;

    const goalsTextLower = stats.goalsText.toLowerCase();
    const hasSocialSignals =
      goalsTextLower.includes('community') ||
      goalsTextLower.includes('relationship') ||
      goalsTextLower.includes('connect') ||
      goalsTextLower.includes('communicat') ||
      goalsTextLower.includes('сообще') ||
      goalsTextLower.includes('общени');

    let category: BadgeCategory = 'progress';
    if (progressScore >= Math.max(careerScore, socialScore, personalScore)) {
      category = 'progress';
    } else if (careerScore >= socialScore && careerScore >= personalScore) {
      category = 'career';
    } else if (socialScore >= personalScore || hasSocialSignals) {
      category = 'social';
    } else {
      category = 'personal';
    }

    const intensity =
      stats.goalsCompletedThisWeek > 0
        ? 'high'
        : stats.levelsCompletedThisWeek > 0 || stats.stepsCompletedThisWeek >= 3
        ? 'medium'
        : 'base';

    const preferredByCategory: Record<BadgeCategory, number[]> = {
      progress:
        intensity === 'high' ? [8, 26, 27] : intensity === 'medium' ? [27, 26, 8] : [26, 27, 8],
      career: intensity === 'high' ? [21, 22, 30, 17] : [2, 5, 9, 17],
      social: intensity === 'high' ? [16, 18, 23, 24] : [3, 10, 11, 29],
      personal: intensity === 'high' ? [28, 19, 20, 25] : [1, 4, 6, 14, 13],
    };

    const badgeNum =
      (await pickBadgeFromCategory(category, preferredByCategory[category])) ||
      (await pickBadgeFromCategory('progress', [26, 27, 8])) ||
      26;

    const isRu = i18n.language === 'ru' || i18n.language?.startsWith('ru');
    const dynamicMessage = (() => {
      if (category === 'progress') {
        if (stats.goalsCompletedThisWeek > 0) {
          return isRu
            ? `На этой неделе ты завершил(а) ${stats.goalsCompletedThisWeek} целей. Отличная глубина и фокус.`
            : `You completed ${stats.goalsCompletedThisWeek} goals this week. Strong focus and follow-through.`;
        }
        if (stats.levelsCompletedThisWeek > 0 || stats.stepsCompletedThisWeek > 0) {
          return isRu
            ? `На этой неделе ты закрыл(а) ${stats.levelsCompletedThisWeek} уровней и ${stats.stepsCompletedThisWeek} шагов.`
            : `This week you closed ${stats.levelsCompletedThisWeek} levels and ${stats.stepsCompletedThisWeek} steps.`;
        }
        return isRu
          ? `Ты держишь темп: ${stats.daysActive}/7 активных дней за неделю.`
          : `You kept momentum with ${stats.daysActive}/7 active days this week.`;
      }
      if (category === 'career') {
        return isRu
          ? 'Эта неделя показала сильный карьерный фокус и движение к профессиональной цели.'
          : 'This week showed strong career focus and movement toward your professional path.';
      }
      if (category === 'social') {
        return isRu
          ? 'Ты развиваешь связь с людьми и увереннее проявляешься в коммуникации.'
          : 'You are strengthening connection with others and showing up with more social confidence.';
      }
      return isRu
        ? 'Ты сделал(а) важные шаги личного роста и укрепил(а) внутреннюю устойчивость.'
        : 'You made meaningful personal growth moves and built stronger inner resilience this week.';
    })();

    return {
      category,
      badgeNumber: badgeNum,
      badgeName: getTranslatedBadgeName(category, badgeNum),
      badgeMessage: dynamicMessage,
    };
  } catch (error) {
    return {
      category: 'progress',
      badgeNumber: 27,
      badgeName: getTranslatedBadgeName('progress', 27),
      badgeMessage: i18n.language === 'ru' || i18n.language?.startsWith('ru')
        ? i18n.t('progress.badgeMessages.progressConsistency')
        : `You've consistently shown up this week. This badge recognizes your dedication.`,
    };
  }
};


// ============================================================================
// REFLECTION ITEM COMPONENT
// ============================================================================

const ReflectionItem = ({ emoji, imageSource, label, count }: { emoji?: string; imageSource?: any; label: string; count: number }) => (
  <View style={styles.reflectionItem}>
    <FrostedCardLayer />
    {imageSource ? (
      <Image 
        source={imageSource} 
        style={styles.reflectionImage}
        resizeMode="contain"
      />
    ) : (
      <Text style={styles.reflectionEmoji}>{emoji}</Text>
    )}
    <Text style={styles.reflectionLabel}>{label}</Text>
    <Text style={styles.reflectionCount}>{count}</Text>
  </View>
);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1f1a2a',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...HeadingStyle,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 2.5,
  },
  dateRange: {
    ...BodyStyle,
    fontSize: 13,
    color: '#FFFFFF',
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll content
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 25,
  },

  // Engagement Card
  engagementCard: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 14,
    overflow: 'hidden',
  },
  engagementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fireImageWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  streakEmoji: {
    width: 32,
    height: 32,
  },
  engagementStats: {
    flex: 1,
    marginLeft: 14,
  },
  daysActiveNumber: {
    ...HeadingStyle,
    fontSize: 30,
    fontWeight: '700',
    color: '#342846',
    lineHeight: 32,
    includeFontPadding: false,
  },
  daysActiveLabel: {
    ...BodyStyle,
    fontSize: 13,
    color: '#342846',
  },
  engagementProgressTrack: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  engagementDot: {
    flex: 1,
    height: 7,
    borderRadius: 999,
  },
  badgeSection: {
    alignItems: 'center',
  },
  claimBadgeButton: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  claimBadgeButtonText: {
    ...HeadingStyle,
    fontSize: 14,
    fontWeight: '600',
    color: '#342846',
    textAlign: 'center',
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    ...HeadingStyle,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0,
    marginBottom: 15,
  },
  sectionTitleIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  celebrateEmoji: {
    fontSize: 16,
  },

  // Path Card
  pathCard: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 14,
    overflow: 'hidden',
  },
  pathHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pathIcon: {
    width: 44,
    height: 44,
    backgroundColor: 'transparent',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pathIconImage: {
    width: 34.5,
    height: 34.5,
  },
  pathInfo: {
    flex: 1,
  },
  pathName: {
    ...HeadingStyle,
    fontSize: 15,
    fontWeight: '700',
    color: '#342846',
    marginBottom: 4,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  currentGoalLabel: {
    ...BodyStyle,
    fontSize: 13,
    color: '#342846',
  },
  currentGoalName: {
    color: '#342846',
  },
  levelProgress: {
    marginBottom: 12,
  },
  levelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelText: {
    ...BodyStyle,
    fontSize: 12,
    color: '#342846',
  },
  levelPercent: {
    ...HeadingStyle,
    fontSize: 12,
    fontWeight: '600',
    color: '#342846',
    textTransform: 'none',
  },
  levelTrack: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    backgroundColor: '#342846',
    borderRadius: 3,
  },
  stepsCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginBottom: 14,
  },
  stepsIcon: {
    color: '#e1e1bb',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
  },
  stepsText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#342846',
  },
  viewGoalMapButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#342846',
    borderRadius: 50,
  },
  viewGoalMapButtonText: {
    ...BodyStyle,
    fontSize: 14,
    fontWeight: '600',
    color: '#342846',
    marginRight: 8,
  },

  // Reflections Grid
  reflectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  reflectionItem: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 14,
    overflow: 'hidden',
  },
  reflectionEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  reflectionImage: {
    width: 27.6,
    height: 27.6,
    marginBottom: 6,
  },
  reflectionLabel: {
    ...BodyStyle,
    fontSize: 12,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 6,
  },
  reflectionCount: {
    ...HeadingStyle,
    fontSize: 24,
    fontWeight: '700',
    color: '#342846',
    textTransform: 'none',
  },

  // Pattern Card
  patternCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#a592b0',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  patternText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // Mood Card
  moodCard: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 14,
    overflow: 'hidden',
  },
  moodEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  moodInfo: {
    flex: 1,
  },
  moodLabel: {
    ...HeadingStyle,
    fontSize: 18,
    fontWeight: '700',
    color: '#342846',
    textTransform: 'none',
  },
  moodCount: {
    ...BodyStyle,
    fontSize: 13,
    color: '#342846',
  },

  // Wins Card
  winsCard: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 14,
    overflow: 'hidden',
  },
  winItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  winItemCentered: {
    justifyContent: 'center',
  },
  winCheckmark: {
    width: 22,
    height: 22,
    backgroundColor: '#e1e1bb',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    marginRight: 12,
  },
  winText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    lineHeight: 21,
    flex: 1,
  },
  winTextCentered: {
    textAlign: 'center',
  },

  // Looking Ahead Card
  lookingAheadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 20,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 0,
    marginBottom: 16,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  nextStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nextStepIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  nextStepLabel: {
    ...HeadingStyle,
    fontSize: 11,
    fontWeight: '700',
    color: '#7A8A9A',
    letterSpacing: 1,
    textTransform: 'none',
  },
  nextStepAction: {
    ...BodyStyle,
    fontSize: 15,
    color: '#342846',
    marginBottom: 16,
    lineHeight: 24,
  },
  ikigaiConnection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    backgroundColor: '#F8F4FA',
    borderRadius: 12,
    marginBottom: 20,
  },
  ikigaiIcon: {
    marginRight: 10,
  },
  ikigaiText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#7A8A9A',
    lineHeight: 20,
    fontStyle: 'italic',
    flex: 1,
  },
  newGoalButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 50,
    alignItems: 'center',
  },
  newGoalText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#7A8A9A',
    marginBottom: 4,
  },
  newGoalCta: {
    ...HeadingStyle,
    fontSize: 15,
    fontWeight: '600',
    color: '#342846',
    textTransform: 'none',
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 25,
  },

  // Badge Modal Styles
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
    borderRadius: 70,
    overflow: 'hidden',
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
    paddingHorizontal: 20,
  },
  addToProfileButton: {
    width: '100%',
    backgroundColor: '#342846',
    borderRadius: 50,
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
  
  // Help Modal Styles
  helpModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helpModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  helpModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 0,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    minHeight: 700,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  helpModalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    position: 'relative',
  },
  helpModalTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 28,
  },
  helpModalTitle: {
    ...HeadingStyle,
    fontSize: 20,
    fontWeight: '700',
    color: '#342846',
    marginBottom: 8,
    textAlign: 'center',
  },
  helpModalSubtitle: {
    ...BodyStyle,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    alignSelf: 'center',
    paddingHorizontal: 6,
  },
  helpModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 20,
    top: 20,
  },
  helpModalScroll: {
    flex: 1,
    minHeight: 0,
  },
  helpModalScrollContent: {
    padding: 24,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 14,
  },
  helpQuickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  helpQuickCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    minHeight: 132,
  },
  helpQuickIcon: {
    fontSize: 18,
    marginBottom: 8,
  },
  helpQuickTitle: {
    ...HeadingStyle,
    fontSize: 14,
    color: '#342846',
    marginBottom: 6,
  },
  helpQuickText: {
    ...BodyStyle,
    fontSize: 12,
    color: '#5B536B',
    lineHeight: 18,
  },
  helpFocusCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE8D6',
    padding: 14,
  },
  helpFocusTitle: {
    ...HeadingStyle,
    fontSize: 14,
    color: '#342846',
    marginBottom: 6,
  },
  helpFocusText: {
    ...BodyStyle,
    fontSize: 13,
    color: '#5B536B',
    lineHeight: 20,
  },
  helpSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  helpSectionTitle: {
    ...HeadingStyle,
    fontSize: 16,
    fontWeight: '700',
    color: '#342846',
    marginBottom: 12,
    textTransform: 'uppercase',
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  helpSectionText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    lineHeight: 22,
    marginBottom: 8,
  },
  helpBulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  helpBullet: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    marginRight: 8,
    lineHeight: 22,
  },
  helpBulletText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    lineHeight: 22,
    flex: 1,
  },
  helpBold: {
    fontWeight: '600',
  },
});
