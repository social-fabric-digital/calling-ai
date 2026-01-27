import { MoodCalendar } from '@/components/MoodCalendar';
import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { UserAnswer } from '@/utils/claudeApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [completedGoals, setCompletedGoals] = useState<CompletedGoal[]>([]);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [newlyAddedBadgeId, setNewlyAddedBadgeId] = useState<string | null>(null);
  
  // User profile data for portfolio area
  const [userName, setUserName] = useState<string>('');
  const [zodiacSign, setZodiacSign] = useState<string>('');
  const [completedGoalsCount, setCompletedGoalsCount] = useState<number>(0);
  
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
      // Load answers
      const answersData = await AsyncStorage.getItem('userAnswers');
      if (answersData) {
        setAnswers(JSON.parse(answersData));
      }

      // Load badges
      const badgesData = await AsyncStorage.getItem('userBadges');
      if (badgesData) {
        const loadedBadges = JSON.parse(badgesData);
        setBadges(loadedBadges);
        
        // Check for newly added badge
        const newlyAddedId = await AsyncStorage.getItem('newlyAddedBadgeId');
        if (newlyAddedId) {
          // Find the newly added badge
          const newBadge = loadedBadges.find((b: Badge) => b.id === newlyAddedId);
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
        setSavedInsights(JSON.parse(savedInsightsData));
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
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
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
          <ImageBackground 
            source={require('../../assets/images/goal.background.png')}
            style={styles.portfolioCard}
            imageStyle={styles.portfolioCardImage}
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
          </ImageBackground>
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
              <TouchableOpacity style={styles.viewAllButtonContainer}>
                <Text style={styles.viewAllButton}>
                  {t('me.viewAll').replace(' ', '\n')}
                </Text>
              </TouchableOpacity>
            </View>
            {badges.length === 0 ? (
              <Text style={styles.emptyText}>No badges yet. Keep using the app to earn badges!</Text>
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
                      <Text style={styles.badgeName}>{badge.name}</Text>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Mood Tracker Calendar Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCentered]}>Mood Tracker</Text>
            <View style={styles.moodCalendarContainer}>
              <MoodCalendar />
            </View>
          </View>

          {/* Saved Insights Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCentered]}>{t('me.savedInsights')}</Text>
            {savedInsights.length === 0 ? (
              <Text style={styles.emptyText}>{t('me.noSavedInsights')}</Text>
            ) : (
              <View style={styles.insightsList}>
                {savedInsights.map((insight, index) => {
                  // Generate title from insight content - use first heading or first line
                  const getInsightTitle = (insightText: string): string => {
                    const lines = insightText.split('\n').filter(line => line.trim().length > 0);
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
                    <TouchableOpacity key={insight.id} style={styles.insightCard}>
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
            <Text style={[styles.sectionTitle, styles.sectionTitleCentered]}>{t('me.recentAnswers')}</Text>
            {answers.length === 0 ? (
              <Text style={styles.emptyText}>No answers yet. Start answering daily questions to see them here!</Text>
            ) : (
              <View style={styles.answersList}>
                {answers.slice(0, 2).map((answer, index) => (
                  <View key={index} style={styles.answerCard}>
                    <View style={styles.answerCardHeader}>
                      <View style={styles.answerDateContainer}>
                        <View style={styles.answerDateIcon}>
                          <Text style={styles.answerDateIconText}>?</Text>
                        </View>
                        <Text style={styles.answerDate}>{formatDateShort(answer.date)}</Text>
                      </View>
                    </View>
                    <Text style={styles.answerQuestion}>
                      Q: {answer.question || "How do you handle unexpected setbacks?"}
                    </Text>
                    <View style={styles.answerField}>
                      <Text style={styles.answerText}>{answer.answer || ''}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Completed Goals Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCentered]}>{t('me.completedGoals')}</Text>
            {completedGoals.length === 0 ? (
              <Text style={styles.emptyText}>{t('me.noCompletedGoals')}</Text>
            ) : (
              <View style={styles.goalsList}>
                {completedGoals.map((goal) => (
                  <View key={goal.id} style={styles.goalCard}>
                    <View style={styles.goalIconContainer}>
                      <Text style={styles.goalCheckmark}>✓</Text>
                    </View>
                    <View style={styles.goalContent}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      <Text style={styles.goalDate}>{t('me.completedOn')} {formatDate(goal.dateCompleted)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
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
    marginLeft: 40,
    marginRight: 40,
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
  portfolioCardImage: {
    borderRadius: 16,
    resizeMode: 'cover',
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
    paddingBottom: 40,
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
    textAlign: 'center',
    width: '100%',
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
    gap: 20,
  },
  badgeCard: {
    alignItems: 'center',
    width: 64,
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
    fontWeight: 'bold',
    textAlign: 'center',
  },
  answersList: {
    gap: 16,
    marginTop: 16,
  },
  answerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17, // Increased by 8% (16 * 1.08 = 17.28, rounded)
    borderWidth: 1,
    borderColor: 'rgba(186, 204, 215, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  answerCardHeader: {
    marginBottom: 8,
  },
  answerDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerDateIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(186, 204, 215, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  answerDateIconText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    fontWeight: 'bold',
  },
  answerDate: {
    ...BodyStyle,
    color: '#7a8a9a',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  answerQuestion: {
    ...HeadingStyle,
    color: '#342846',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 15, // 15px vertical spacing between question and line beneath
  },
  answerField: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(52, 40, 70, 0.2)',
    paddingLeft: 20, // Minimum 20px padding (was 10)
    paddingTop: 0, // Answer aligned with top of the line
    paddingBottom: 0,
    minHeight: 0, // Remove fixed minHeight, let it expand based on content
    justifyContent: 'flex-start', // Align content to top
  },
  answerText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
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
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169, 151, 180, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalCheckmark: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 24,
    fontWeight: 'bold',
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
});

