import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import { generatePathContent } from '@/utils/claudeApi';
import { hapticMedium } from '@/utils/haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { PathExplorationStepProps } from './types';

const { width, height } = Dimensions.get('window');

// ============================================
// Color Palette
// ============================================
const COLORS = {
  primary: '#342846',
  accent1: '#cdbad8', // pink/mauve
  accent2: '#baccd7', // light blue
  white: '#FFFFFF',
  background: '#F5F3F0',
};

const toOpaqueColor = (color: string) => {
  if (color.startsWith('rgba')) {
    return color.replace(
      /rgba\(\s*(\d+\s*,\s*\d+\s*,\s*\d+)\s*,\s*[\d.]+\s*\)/,
      'rgb($1)'
    );
  }

  if (color.startsWith('#') && color.length === 9) {
    return color.slice(0, 7);
  }

  return color;
};

// ============================================
// Types
// ============================================

interface GoalData {
  id: string;
  title: string;
  tag: string;
  tagColor: string;
  duration: string;
  steps: number;
  description: string;
  fear?: string;
  icon: string;
  isRecommended?: boolean;
}

// ============================================
// Animated Aura Component (behind path icon)
// ============================================
function AnimatedAura() {
  const pulseAnim1 = useRef(new Animated.Value(0.6)).current;
  const pulseAnim2 = useRef(new Animated.Value(0.4)).current;
  const pulseAnim3 = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim1, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim1, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim2, { toValue: 0.8, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim2, { toValue: 0.4, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim3, { toValue: 0.6, duration: 3000, useNativeDriver: true }),
        Animated.timing(pulseAnim3, { toValue: 0.3, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    // Slow rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.auraContainer}>
      <Animated.View
        style={[
          styles.auraRing,
          styles.auraRing3,
          { opacity: pulseAnim3, transform: [{ rotate: rotation }, { scale: pulseAnim3.interpolate({ inputRange: [0.3, 0.6], outputRange: [1, 1.1] }) }] },
        ]}
      />
      <Animated.View
        style={[
          styles.auraRing,
          styles.auraRing2,
          { opacity: pulseAnim2, transform: [{ scale: pulseAnim2.interpolate({ inputRange: [0.4, 0.8], outputRange: [1, 1.08] }) }] },
        ]}
      />
      <Animated.View
        style={[
          styles.auraRing,
          styles.auraRing1,
          { opacity: pulseAnim1, transform: [{ scale: pulseAnim1.interpolate({ inputRange: [0.6, 1], outputRange: [1, 1.05] }) }] },
        ]}
      />
    </View>
  );
}

// ============================================
// Path Icon Component
// ============================================
interface PathIconProps {
  pathName: string;
}

function PathIcon({ pathName }: PathIconProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  // Choose icon based on path name keywords
  const getIcon = () => {
    const name = pathName.toLowerCase();
    if (name.includes('vision') || name.includes('leader')) return 'visibility';
    if (name.includes('creative') || name.includes('artist')) return 'palette';
    if (name.includes('entrepreneur') || name.includes('business')) return 'rocket-launch';
    if (name.includes('coach') || name.includes('mentor')) return 'psychology';
    if (name.includes('tech') || name.includes('developer')) return 'code';
    if (name.includes('writer') || name.includes('author')) return 'edit-note';
    return 'auto-awesome';
  };

  return (
    <View style={styles.pathIconWrapper}>
      <AnimatedAura />
      <Animated.View
        style={[
          styles.pathIconContainer,
          {
            transform: [{ scale: scaleAnim }, { rotate: rotation }],
          },
        ]}
      >
        <LinearGradient
          colors={[COLORS.primary, '#4a3a5c']}
          style={styles.pathIconGradient}
        >
          <MaterialIcons name={getIcon() as any} size={40} color={COLORS.white} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ============================================
// Why It Fits You Card
// ============================================
interface WhyItFitsProps {
  userName: string;
  whatYouLove?: string;
  whatYouGoodAt?: string;
  pathName: string;
  whyItFits?: string[];
}

function WhyItFitsCard({ userName, whatYouLove, whatYouGoodAt, pathName, whyItFits }: WhyItFitsProps) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const itemAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Stagger items
      itemAnims.forEach((anim, index) => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          delay: index * 150,
          useNativeDriver: true,
        }).start();
      });
    });
  }, []);

  // Use AI-generated insights if available, otherwise fallback to defaults
  const defaultInsights = [
    {
      icon: 'favorite',
      color: COLORS.accent1,
      text: whatYouLove
        ? t('clarityMap.yourPassionFor', { passion: whatYouLove.toLowerCase().slice(0, 40) + (whatYouLove.length > 40 ? '...' : '') })
        : t('clarityMap.thisPathAligns'),
    },
    {
      icon: 'star',
      color: COLORS.accent2,
      text: whatYouGoodAt
        ? t('clarityMap.yourTalentIn', { talent: whatYouGoodAt.toLowerCase().slice(0, 40) + (whatYouGoodAt.length > 40 ? '...' : '') })
        : t('clarityMap.yourNaturalStrengths'),
    },
    {
      icon: 'trending-up',
      color: COLORS.accent1,
      text: t('clarityMap.growthOpportunities'),
    },
  ];

  const iconMap = ['favorite', 'star', 'trending-up'];
  const colorMap = [COLORS.accent1, COLORS.accent2, COLORS.accent1];
  
  const insights = whyItFits && whyItFits.length > 0
    ? whyItFits.map((text, index) => ({
        icon: iconMap[index] || 'star',
        color: colorMap[index] || COLORS.accent1,
        text: text,
      }))
    : defaultInsights;

  return (
    <Animated.View
      style={[
        styles.whyItFitsCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(52, 40, 70, 0.8)', 'rgba(61, 48, 80, 0.8)']}
        style={styles.whyItFitsGradient}
      >
        <FrostedCardLayer />
        <View style={styles.whyItFitsHeader}>
          <MaterialIcons name="lightbulb" size={20} color={COLORS.white} />
          <Text style={styles.whyItFitsLabel}>{t('clarityMap.whyThisFitsYou')}</Text>
        </View>

        <Text style={styles.whyItFitsName}>{userName}</Text>
        <View style={styles.whyItFitsDivider} />

        <View style={styles.insightsList}>
          {insights.map((insight, index) => (
            <Animated.View
              key={index}
              style={[
                styles.insightItem,
                {
                  opacity: itemAnims[index],
                  transform: [
                    {
                      translateX: itemAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.insightIcon, { backgroundColor: insight.color + '30' }]}>
                <MaterialIcons name={insight.icon as any} size={18} color={COLORS.white} />
              </View>
              <Text style={styles.insightText}>{insight.text}</Text>
            </Animated.View>
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================
// Goal Card Component
// ============================================
interface GoalCardProps {
  goal: GoalData;
  index: number;
  onSelect: () => void;
}

function GoalCard({ goal, index, onSelect }: GoalCardProps) {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const goalIconColor = toOpaqueColor(goal.tagColor);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 800 + index * 150,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 800 + index * 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow animation for recommended
    if (goal.isRecommended) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  return (
    <Animated.View
      style={[
        styles.goalCardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Recommended glow */}
      {goal.isRecommended && (
        <Animated.View
          style={[
            styles.recommendedGlow,
            { opacity: glowAnim },
          ]}
        />
      )}

      <Animated.View style={[styles.goalCard, { minHeight: goal.isRecommended ? 280 : 250 }]}>
          <FrostedCardLayer />
          {/* Recommended badge */}
          {goal.isRecommended && (
            <View style={styles.recommendedBadge}>
              <MaterialIcons name="star" size={14} color={COLORS.white} />
              <Text style={styles.recommendedText}>{t('clarityMap.recommendedForYou')}</Text>
            </View>
          )}

          {/* Header row */}
          <View style={[styles.goalHeader, goal.isRecommended && { marginTop: 34 }]}>
            <View
              style={[
                styles.goalIconContainer,
                {
                  backgroundColor: goal.tagColor + '40',
                  borderWidth: 1,
                  borderColor: 'rgba(52, 40, 70, 0.2)',
                },
              ]}
            >
              <MaterialIcons name={goal.icon as any} size={24} color={COLORS.primary} />
            </View>
            <View
              style={[
                styles.goalTag,
                {
                  backgroundColor: goal.tagColor + '40',
                  borderWidth: 1,
                  borderColor: 'rgba(52, 40, 70, 0.2)',
                },
              ]}
            >
              <Text style={[styles.goalTagText, { color: COLORS.primary }]}>{goal.tag}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.goalTitle}>{goal.title}</Text>

          <Text style={styles.goalDescription}>{goal.description}</Text>

          {/* Action button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              void hapticMedium();
              onSelect();
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.startButtonText}>{isRussian ? 'Начать цель' : 'Start goal'}</Text>
            <MaterialIcons name="arrow-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>

      </Animated.View>
    </Animated.View>
  );
}

// ============================================
// Main Component
// ============================================
export default function PathExplorationStep({
  pathName,
  pathDescription,
  userName = '',
  onStartJourney,
  whatYouLove,
  whatYouGoodAt,
  whatWorldNeeds,
  whatCanBePaidFor,
  fear,
  whatExcites,
  birthMonth,
  birthDate,
  birthYear,
  birthCity,
  birthHour,
  birthMinute,
  birthPeriod,
  onWorkOnDreamGoal,
  hideCustomPathOption = false,
  regenerateGoalsTrigger = 0,
  customBottomActionLabel,
  customBottomActionHint,
  customBottomActionDisabled = false,
  onCustomBottomActionPress,
}: PathExplorationStepProps) {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [whyItFits, setWhyItFits] = useState<string[]>([]);
  const [isInitialContentLoading, setIsInitialContentLoading] = useState(true);
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-30)).current;

  // Default/fallback goals
  const defaultGoals: GoalData[] = [
    {
      id: '1',
      title: t('clarityMap.becomeProfessional'),
      tag: t('clarityMap.leader'),
      tagColor: COLORS.primary,
      duration: t('onboarding.threeMonths'),
      steps: 4,
      description: t('clarityMap.buildClearPlan'),
      icon: 'business-center',
      isRecommended: true,
    },
    {
      id: '2',
      title: t('clarityMap.launchYourProject'),
      tag: t('clarityMap.creator'),
      tagColor: COLORS.accent1,
      duration: t('onboarding.sixMonths'),
      steps: 8,
      description: t('clarityMap.buildSustainableModel'),
      icon: 'rocket-launch',
    },
    {
      id: '3',
      title: t('clarityMap.developSkillsParallel'),
      tag: t('clarityMap.explorer'),
      tagColor: COLORS.accent2,
      duration: t('onboarding.sixMonths'),
      steps: 6,
      description: t('clarityMap.developComfortablePace'),
      icon: 'explore',
    },
  ];

  // Generate AI content on mount and explicit goal regeneration.
  useEffect(() => {
    const generateContent = async () => {
      // Check if we have at least pathName and some user data (Ikigai or birth data)
      const hasIkigaiData = whatYouLove || whatYouGoodAt || whatWorldNeeds || whatCanBePaidFor;
      const hasBirthData = birthMonth && birthDate && birthYear;
      const isGoalOnlyRegeneration = regenerateGoalsTrigger > 0;
      if (!isGoalOnlyRegeneration) {
        setIsInitialContentLoading(true);
      }
      
      if (!pathName || (!hasIkigaiData && !hasBirthData)) {
        // Use defaults only if we have no path or no user data at all
        setGoals(defaultGoals.slice(0, 3));
        if (!isGoalOnlyRegeneration) {
          setWhyItFits([
            t('clarityMap.yourStrengthsAlign'),
            t('clarityMap.directionMatchesValues'),
            t('clarityMap.yourProfileSupports'),
          ]);
        }
        if (!isGoalOnlyRegeneration) {
          setIsInitialContentLoading(false);
        }
        return;
      }

      try {
        const content = await generatePathContent(
          pathName,
          pathDescription || pathName,
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
          fear,
          whatExcites
        );

        // Keep "why this fits you" fixed during goal-only regenerations.
        if (!isGoalOnlyRegeneration) {
          setWhyItFits(content.whyFitsYou || []);
        }

        // Convert AI-generated goals to GoalData format
        const iconMap = ['business-center', 'rocket-launch', 'explore'];
        const tagMap = [t('clarityMap.leader'), t('clarityMap.creator'), t('clarityMap.explorer')];
        const tagColorMap = [COLORS.primary, COLORS.accent1, COLORS.accent2];
        
        const aiGoals: GoalData[] = content.goals.slice(0, 3).map((goal, index) => ({
          id: goal.id.toString(),
          title: goal.title.toUpperCase(),
          tag: tagMap[index] || t('clarityMap.goal'),
          tagColor: tagColorMap[index] || COLORS.primary,
          duration: goal.timeFrame || t('onboarding.threeMonths'),
          steps: goal.timeFrame?.includes('four') ? 4 : goal.timeFrame?.includes('eight') ? 8 : 6,
          description: goal.description || goal.title,
          fear: goal.fear || '',
          icon: iconMap[index] || 'star',
          isRecommended: index === 0,
        }));

        setGoals(aiGoals.length > 0 ? aiGoals : defaultGoals.slice(0, 3));
      } catch (error) {
        // Error generating path content - continue with fallback
        // Fallback to defaults on error
        setGoals(defaultGoals.slice(0, 3));
        if (!isGoalOnlyRegeneration) {
          setWhyItFits([
            t('clarityMap.yourStrengthsAlign'),
            t('clarityMap.directionMatchesValues'),
            t('clarityMap.yourProfileSupports'),
          ]);
        }
      } finally {
        if (!isGoalOnlyRegeneration) {
          setIsInitialContentLoading(false);
        }
      }
    };

    generateContent();
  }, [pathName, pathDescription, birthMonth, birthDate, birthYear, birthCity, birthHour, birthMinute, birthPeriod, whatYouLove, whatYouGoodAt, whatWorldNeeds, whatCanBePaidFor, fear, whatExcites, regenerateGoalsTrigger]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (isInitialContentLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingStateText}>
            {t('clarityMap.generatingSpecificGoals', { defaultValue: 'Generating specific goals...' })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: headerFadeAnim,
              transform: [{ translateY: headerSlideAnim }],
            },
          ]}
        >
          <PathIcon pathName={pathName} />
          
          <Text style={styles.pathName}>{pathName.toUpperCase()}</Text>
          
          {pathDescription && (
            <Text style={styles.pathDescription}>{pathDescription}</Text>
          )}
        </Animated.View>

        {/* Why It Fits You */}
        <WhyItFitsCard
          userName={userName || t('onboarding.you')}
          whatYouLove={whatYouLove}
          whatYouGoodAt={whatYouGoodAt}
          pathName={pathName}
          whyItFits={whyItFits}
        />

        {/* Goals Section */}
        <View style={styles.goalsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>{t('clarityMap.specificGoalsYouCanAchieve')}</Text>
            <View style={styles.sectionDivider} />
          </View>

          {goals.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              index={index}
              onSelect={() => onStartJourney?.(parseInt(goal.id), goal.title, goal.fear)}
            />
          ))}

          {onCustomBottomActionPress && customBottomActionLabel && (
            <View style={styles.customBottomActionContainer}>
              <TouchableOpacity
                style={[styles.customBottomActionButton, customBottomActionDisabled && styles.customBottomActionDisabled]}
                onPress={() => {
                  void hapticMedium();
                  onCustomBottomActionPress();
                }}
                activeOpacity={0.8}
                disabled={customBottomActionDisabled}
              >
                <MaterialIcons name="refresh" size={16} color="#342846" />
                <Text style={styles.customBottomActionText}>{customBottomActionLabel}</Text>
              </TouchableOpacity>
              {!!customBottomActionHint && (
                <Text style={styles.customBottomActionHint}>{customBottomActionHint}</Text>
              )}
            </View>
          )}
        </View>

        {/* Custom Path Option */}
        {!hideCustomPathOption && (
          <View style={{ marginTop: 24 }}>
            <CustomPathCard
              isVisible={true}
              onPress={() => {
                void hapticMedium();
                onWorkOnDreamGoal?.();
              }}
            />
          </View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// Custom Path Card Component
// ============================================
interface CustomPathCardProps {
  isVisible: boolean;
  onPress: () => void;
}

function CustomPathCard({ isVisible, onPress }: CustomPathCardProps) {
  const { t } = useTranslation();
  const cardAnim = useRef(new Animated.Value(1)).current; // Start visible
  const scaleAnim = useRef(new Animated.Value(1)).current; // Start at full scale
  const iconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Rotating sparkle icon
      Animated.loop(
        Animated.timing(iconRotate, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isVisible]);

  const rotation = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.customCardWrapper,
        {
          opacity: cardAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.customCard}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.customCardEmpty}>
          <FrostedCardLayer />
          <Animated.View style={[styles.customIconContainer, { transform: [{ rotate: rotation }] }]}>
            <View style={styles.customIconCircle}>
              <MaterialIcons name="auto-fix-high" size={28} color="#342846" />
            </View>
          </Animated.View>
          <View style={styles.customCardContent}>
            <Text style={styles.customCardTitle}>{t('onboarding.createYourGoal')}</Text>
            <Text style={styles.customCardSubtitle}>
              {t('onboarding.formulateSpecifically')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pathIconWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  auraContainer: {
    position: 'absolute',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auraRing: {
    position: 'absolute',
    borderRadius: 100,
  },
  auraRing1: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.accent1,
  },
  auraRing2: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.accent2,
  },
  auraRing3: {
    width: 140,
    height: 140,
    backgroundColor: COLORS.accent1,
  },
  pathIconContainer: {
    zIndex: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  pathIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pathName: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  pathSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: COLORS.primary,
    opacity: 0.5,
    marginBottom: 12,
  },
  pathDescription: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 1,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  // Why It Fits Card
  whyItFitsCard: {
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  whyItFitsGradient: {
    padding: 24,
  },
  whyItFitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  whyItFitsLabel: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    color: COLORS.accent2,
  },
  whyItFitsName: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 26,
    color: COLORS.white,
    marginBottom: 12,
  },
  whyItFitsDivider: {
    height: 2,
    backgroundColor: COLORS.accent1,
    marginBottom: 20,
  },
  insightsList: {
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    flex: 1,
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: COLORS.white,
    opacity: 0.9,
    lineHeight: 22,
  },

  // Goals Section
  goalsSection: {
    marginBottom: 20,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  loadingStateText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: COLORS.primary,
    opacity: 0.7,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  sectionTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },

  // Goal Card
  goalCardWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  recommendedGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    backgroundColor: COLORS.accent1,
    opacity: 0.3,
  },
  goalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.08)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recommendedText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    color: COLORS.white,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  goalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    opacity: 1,
  },
  goalTagText: {
    ...HeadingStyle,
    fontSize: 12,
    letterSpacing: 1,
    opacity: 1,
  },
  goalTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 18,
    color: COLORS.primary,
    marginBottom: 8,
    lineHeight: 24,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  goalMetaText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: COLORS.primary,
    opacity: 0.5,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  goalDescription: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: COLORS.primary,
    opacity: 0.7,
    lineHeight: 22,
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.22)',
  },
  startButtonText: {
    ...BodyStyle,
    fontSize: 14,
    color: COLORS.primary,
  },
  customBottomActionContainer: {
    marginTop: 14,
    alignItems: 'center',
  },
  customBottomActionButton: {
    borderWidth: 1,
    borderColor: '#342846',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customBottomActionDisabled: {
    opacity: 0.5,
  },
  customBottomActionText: {
    fontFamily: 'AnonymousPro-Bold',
    fontSize: 12,
    color: '#342846',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  customBottomActionHint: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 10,
    lineHeight: 12,
    color: '#FFFFFF',
    maxWidth: 230,
  },
  expandIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // Custom Path Card
  customCardWrapper: {
    marginTop: 24,
    marginBottom: 16,
  },
  customCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  customCardEmpty: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#342846',
    borderStyle: 'solid',
    minHeight: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  customIconContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  customIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(52, 40, 70, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customCardContent: {
    alignItems: 'flex-start',
    marginTop: 8,
    marginLeft: 72,
  },
  customCardTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 16,
    color: '#342846',
    marginBottom: 4,
    textAlign: 'left',
  },
  customCardSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: '#342846',
    lineHeight: 15,
    textAlign: 'left',
    opacity: 0.7,
  },
});
