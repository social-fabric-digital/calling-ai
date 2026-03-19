import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticMedium } from '@/utils/haptics';
import { generateUnifiedDestinyProfile } from '@/utils/claudeApi';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { PathsAlignedStepProps } from './types';

const { width } = Dimensions.get('window');

// ============================================
// Types
// ============================================
interface PathData {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  whyItFits: string;
  icon: string;
  gradientColors: string[];
  accentColor: string;
  milestones: string[];
  duration: string;
  isRecommended?: boolean;
}

// Props interface is imported from types.ts

// ============================================
// Milestone Preview Component
// ============================================
interface MilestonePreviewProps {
  milestones: string[];
  accentColor: string;
  isExpanded: boolean;
  textColor?: string;
}

function MilestonePreview({ milestones, accentColor, isExpanded, textColor }: MilestonePreviewProps) {
  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      tension: 100,
      friction: 12,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const containerHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 120],
  });

  const iconColor = textColor || 'rgba(255, 255, 255, 0.7)';

  return (
    <Animated.View style={[styles.milestoneContainer, { height: containerHeight }]}>
      {/* Collapsed: Just dots */}
      <View style={styles.milestoneDotsRow}>
        {milestones.slice(0, 4).map((_, index) => (
          <React.Fragment key={index}>
            <View style={styles.milestoneDot} />
            {index < Math.min(milestones.length - 1, 3) && (
              <View style={styles.milestoneLine} />
            )}
          </React.Fragment>
        ))}
        {milestones.length > 4 && (
          <>
            <View style={styles.milestoneLine} />
            <MaterialIcons name="more-horiz" size={16} color={iconColor} />
          </>
        )}
      </View>

      {/* Expanded: Show milestone names */}
      <Animated.View
        style={[
          styles.milestoneLabels,
          {
            opacity: expandAnim,
            transform: [{
              translateY: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            }],
          },
        ]}
      >
        {milestones.slice(0, 4).map((milestone, index) => (
          <View key={index} style={styles.milestoneLabelItem}>
            <View style={styles.milestoneLabelDot} />
            <Text style={[styles.milestoneLabelText, textColor && { color: textColor }]} numberOfLines={1}>
              {milestone}
            </Text>
          </View>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

// ============================================
// Path Card Component
// ============================================
interface PathCardProps {
  path: PathData;
  index: number;
  isVisible: boolean;
  isTabletLayout: boolean;
  isRussian: boolean;
  onSelect: () => void;
}

function PathCard({ path, index, isVisible, isTabletLayout, isRussian, onSelect }: PathCardProps) {
  const { t } = useTranslation();
  // Animations
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      const delay = index * 200;

      setTimeout(() => {
        // Main reveal
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(cardAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(rotateAnim, {
            toValue: 1,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }),
        ]).start();

        // Glow for recommended
        if (path.isRecommended) {
          Animated.loop(
            Animated.sequence([
              Animated.timing(glowAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
              }),
              Animated.timing(glowAnim, {
                toValue: 0.3,
                duration: 1500,
                useNativeDriver: true,
              }),
            ])
          ).start();
        }

        // Shimmer
        Animated.loop(
          Animated.sequence([
            Animated.timing(shimmerAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(shimmerAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, delay);
    }
  }, [isVisible]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-4deg', '0deg'],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  // Dynamic height - cards will size purely based on content
  const iconName = path.icon as keyof typeof MaterialIcons.glyphMap;
  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        isTabletLayout && styles.cardWrapperTablet,
        {
          opacity: cardAnim,
          transform: [
            { scale: scaleAnim },
            { rotate: rotation },
          ],
        },
      ]}
    >
      {/* Recommended glow */}
      {path.isRecommended && (
        <Animated.View
          style={[
            styles.recommendedGlow,
            isTabletLayout && styles.recommendedGlowTablet,
            {
              opacity: glowAnim,
              backgroundColor: path.accentColor,
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.card,
          isTabletLayout && styles.cardTablet,
          isRussian && path.isRecommended && styles.cardRecommendedRussian,
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.6)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cardGradient, isTabletLayout && styles.cardGradientTablet]}
        >
          <FrostedCardLayer />
          {/* Shimmer overlay */}
          <Animated.View
            style={[
              styles.shimmer,
              isTabletLayout && styles.shimmerTablet,
              { transform: [{ translateX: shimmerTranslate }] },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(52,40,70,0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
          <LinearGradient
            colors={['rgba(52,40,70,0.14)', 'rgba(52,40,70,0.05)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.cardTopGlow, isTabletLayout && styles.cardTopGlowTablet]}
            pointerEvents="none"
          />

          {/* Recommended badge */}
          {path.isRecommended && (
            <View style={[styles.recommendedBadge, isTabletLayout && styles.recommendedBadgeTablet, { backgroundColor: path.accentColor }]}>
              <MaterialIcons name="auto-awesome" size={12} color="#FFFFFF" />
              <Text style={[styles.recommendedText, isTabletLayout && styles.recommendedTextTablet]}>{t('clarityMap.bestMatch')}</Text>
            </View>
          )}

          {/* Content wrapper to allow dynamic height */}
          <View style={styles.cardContent}>
            {/* Header */}
            <View
              style={[
                styles.cardHeaderTouchable,
                isTabletLayout && styles.cardHeaderTouchableTablet,
                path.isRecommended && { marginTop: 35 }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, isTabletLayout && styles.iconCircleTablet]}>
                  <MaterialIcons name={iconName} size={28} color="#342846" />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.pathTitle, isTabletLayout && styles.pathTitleTablet]}>{path.title}</Text>
                  <Text style={[styles.pathSubtitle, isTabletLayout && styles.pathSubtitleTablet]}>{path.subtitle}</Text>
                </View>
              </View>
            </View>

            {/* Why it fits - always visible but subtle */}
            <View style={[styles.whyItFitsContainer, isTabletLayout && styles.whyItFitsContainerTablet]}>
              <MaterialIcons name="favorite" size={14} color="#342846" />
              <Text style={[styles.whyItFitsText, isTabletLayout && styles.whyItFitsTextTablet]}>{path.whyItFits}</Text>
            </View>
          </View>

          {/* CTA Button - Always visible at bottom */}
          <View style={[styles.cardFooter, isTabletLayout && styles.cardFooterTablet]}>
            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.exploreButton, isTabletLayout && styles.exploreButtonTablet, { backgroundColor: 'rgba(255,255,255,0.7)' }]}
              onPress={(e) => {
                e.stopPropagation();
                void hapticMedium();
                onSelect();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.exploreButtonText, isTabletLayout && styles.exploreButtonTextTablet, { color: '#342846' }]}>{t('clarityMap.explore')}</Text>
              <View style={{ marginLeft: 6 }}>
                <MaterialIcons name="arrow-forward" size={16} color="#342846" />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
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
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(cardAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();

        // Rotating sparkle icon
        Animated.loop(
          Animated.timing(iconRotate, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          })
        ).start();
      }, 800); // After other cards
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
        onPress={() => {
          void hapticMedium();
          onPress();
        }}
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
// Main Component
// ============================================
export default function PathsAlignedStep({
  whatYouLove,
  whatYouGoodAt,
  birthMonth,
  birthDate,
  birthYear,
  birthCity,
  birthHour,
  birthMinute,
  birthPeriod,
  whatWorldNeeds,
  whatCanBePaidFor,
  fear,
  whatExcites,
  onPathsGenerated,
  onExplorePath,
  onWorkOnDreamGoal,
  forceTabletLayout,
  cardHorizontalInset,
  hideCustomPathOption = false,
  headerTopMargin = 0,
  headerTitleColor,
  headerExtraContent,
}: PathsAlignedStepProps) {
  const { t, i18n } = useTranslation();
  const PATHS_SIGNATURE_KEY = 'destinyProfile_pathsSignature';
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const [isVisible, setIsVisible] = useState(false);
  const [paths, setPaths] = useState<PathData[]>([]);
  const [isLoadingPaths, setIsLoadingPaths] = useState(true);
  // Keep risky card-style overrides off for now; use explicit iPad flag only for safe spacing.
  const isTabletLayout = false;
  const isTabletMarginsOnly = Boolean(forceTabletLayout);

  // Header animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;

  const cardGradientColors = ['#342846', '#a592b0', '#342846'];
  const hasCyrillic = (value: string) => /[А-Яа-яЁё]/.test(value);
  const currentPathsSignature = JSON.stringify({
    language: i18n.language || 'en',
    birthMonth: birthMonth || '',
    birthDate: birthDate || '',
    birthYear: birthYear || '',
    birthCity: birthCity || '',
    birthHour: birthHour || '',
    birthMinute: birthMinute || '',
    birthPeriod: birthPeriod || '',
    whatYouLove: whatYouLove || '',
    whatYouGoodAt: whatYouGoodAt || '',
    whatWorldNeeds: whatWorldNeeds || '',
    whatCanBePaidFor: whatCanBePaidFor || '',
    fear: fear || '',
    whatExcites: whatExcites || '',
  });

  // Default paths if none provided
  const defaultPaths: PathData[] = [
    {
      id: 1,
      title: t('clarityMap.visionary'),
      subtitle: t('clarityMap.dreamBoldly'),
      description: t('clarityMap.pathBasedOnTalents'),
      whyItFits: t('clarityMap.perfectIfYouLike', { activity: whatYouLove?.slice(0, 25) || t('clarityMap.createSomethingNew') }),
      icon: 'lightbulb',
      gradientColors: cardGradientColors,
      accentColor: isRussian ? '#a592b0' : '#342846',
      milestones: [t('clarityMap.formulateVision'), t('clarityMap.layFoundation'), t('clarityMap.gainMomentum'), t('clarityMap.launchAndImprove')],
      duration: t('clarityMap.twelveWeeks'),
      isRecommended: true,
    },
    {
      id: 2,
      title: t('clarityMap.architect'),
      subtitle: t('clarityMap.designYourFuture'),
      description: t('clarityMap.routeToOvercomeFears'),
      whyItFits: t('clarityMap.strongOptionIfYourStrength', { strength: whatYouGoodAt?.slice(0, 25) || t('clarityMap.solvingProblems') }),
      icon: 'architecture',
      gradientColors: cardGradientColors,
      accentColor: '#a592b0',
      milestones: [t('clarityMap.planAndDraft'), t('clarityMap.foundationWork'), t('clarityMap.buildStructure'), t('clarityMap.finalPolishing')],
      duration: t('clarityMap.tenWeeks'),
    },
    {
      id: 3,
      title: t('clarityMap.influence'),
      subtitle: t('clarityMap.inspireAndChange'),
      description: t('clarityMap.pathForMakingImpact'),
      whyItFits: t('clarityMap.alignsWithHelpingOthers'),
      icon: 'campaign',
      gradientColors: cardGradientColors,
      accentColor: '#baccd7',
      milestones: [t('clarityMap.findYourVoice'), t('clarityMap.buildAudience'), t('clarityMap.createInfluence'), t('clarityMap.scaleResults')],
      duration: t('clarityMap.eightWeeks'),
    },
  ];

  // Load paths from AsyncStorage (generated by LoadingStep)
  useEffect(() => {
    const loadPaths = async () => {
      try {
        setIsLoadingPaths(true);
        const [[, storedPaths], [, storedPathsSignature]] = await AsyncStorage.multiGet([
          'destinyProfile_paths',
          PATHS_SIGNATURE_KEY,
        ]);
        const cardColors = isRussian ? ['#a592b0', '#baccd7', '#d4c4a8'] : ['#342846', '#a592b0', '#baccd7'];
        const iconMap = ['lightbulb', 'architecture', 'campaign'];
        const mapGeneratedPathsToCards = (rawPaths: any[]): PathData[] =>
          rawPaths.map((path: any, index: number) => ({
            id: path.id || index + 1,
            title: path.title || `Path ${index + 1}`,
            subtitle: path.title || `Path ${index + 1}`,
            description: path.description || '',
            whyItFits: path.description || '',
            icon: iconMap[index] || 'star',
            gradientColors: cardGradientColors,
            accentColor: path.glowColor || cardColors[index] || cardColors[0],
            milestones: [
              t('clarityMap.formulateVision'),
              t('clarityMap.layFoundation'),
              t('clarityMap.gainMomentum'),
              t('clarityMap.launchAndImprove'),
            ],
            duration: t('clarityMap.twelveWeeks'),
            isRecommended: index === 0,
          }));
        
        if (storedPaths && storedPathsSignature === currentPathsSignature) {
          const generatedPaths = JSON.parse(storedPaths);
          const hasGenericFallbackTitles = Array.isArray(generatedPaths) && generatedPaths.some((path: any) => {
            const title = String(path?.title || '').trim().toLowerCase();
            return (
              title === 'creative direction' ||
              title === 'personal growth' ||
              title === 'purposeful impact' ||
              title === 'творческий вектор' ||
              title === 'личный рост' ||
              title === 'ценный вклад'
            );
          });

          // Convert stored paths to PathData format
          // Define color palette for cards: #342846, #a592b0, #baccd7
          const aiPaths: PathData[] = mapGeneratedPathsToCards(generatedPaths);
          const shouldUseLocalizedFallback =
            isRussian &&
            aiPaths.length > 0 &&
            generatedPaths.every((path: any) => {
              const combinedText = `${path?.title || ''} ${path?.description || ''}`;
              return !hasCyrillic(combinedText);
            });

          if (shouldUseLocalizedFallback || hasGenericFallbackTitles) {
            try {
              const regeneratedProfile = await generateUnifiedDestinyProfile(
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

              if (Array.isArray(regeneratedProfile.paths) && regeneratedProfile.paths.length > 0) {
                await AsyncStorage.multiSet([
                  ['destinyProfile_paths', JSON.stringify(regeneratedProfile.paths)],
                  [PATHS_SIGNATURE_KEY, currentPathsSignature],
                ]);
                const regeneratedPaths: PathData[] = mapGeneratedPathsToCards(regeneratedProfile.paths);
                setPaths(regeneratedPaths);
                setIsLoadingPaths(false);
                if (onPathsGenerated) {
                  const formattedPaths = regeneratedPaths.map((path) => ({
                    id: path.id,
                    title: path.title,
                    description: path.description,
                    glowColor: path.accentColor,
                  }));
                  onPathsGenerated(formattedPaths);
                }
                return;
              }
            } catch {
              // Fall through to fallback cards if regeneration fails.
            }
          }

          const finalPaths = shouldUseLocalizedFallback || aiPaths.length === 0 ? defaultPaths : aiPaths;
          setPaths(finalPaths);
          setIsLoadingPaths(false);

          // Call onPathsGenerated callback
          if (onPathsGenerated) {
            const formattedPaths = finalPaths.map(path => ({
              id: path.id,
              title: path.title,
              description: path.description,
              glowColor: path.accentColor,
            }));
            onPathsGenerated(formattedPaths);
          }
        } else {
          // If storage is empty, try generating profile once before falling back.
          try {
            const regeneratedProfile = await generateUnifiedDestinyProfile(
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
            if (Array.isArray(regeneratedProfile.paths) && regeneratedProfile.paths.length > 0) {
              await AsyncStorage.multiSet([
                ['destinyProfile_paths', JSON.stringify(regeneratedProfile.paths)],
                [PATHS_SIGNATURE_KEY, currentPathsSignature],
              ]);
              const regeneratedPaths: PathData[] = mapGeneratedPathsToCards(regeneratedProfile.paths);
              setPaths(regeneratedPaths);
              setIsLoadingPaths(false);
              if (onPathsGenerated) {
                const formattedPaths = regeneratedPaths.map(path => ({
                  id: path.id,
                  title: path.title,
                  description: path.description,
                  glowColor: path.accentColor,
                }));
                onPathsGenerated(formattedPaths);
              }
              return;
            }
          } catch {
            // Fall through to localized defaults if regeneration fails.
          }

          setPaths(defaultPaths);
          setIsLoadingPaths(false);
          if (onPathsGenerated) {
            const formattedPaths = defaultPaths.map(path => ({
              id: path.id,
              title: path.title,
              description: path.description,
              glowColor: path.accentColor,
            }));
            onPathsGenerated(formattedPaths);
          }
        }
      } catch (error) {
        // Fallback to defaults on error
        setPaths(defaultPaths);
        setIsLoadingPaths(false);
        if (onPathsGenerated) {
          const formattedPaths = defaultPaths.map(path => ({
            id: path.id,
            title: path.title,
            description: path.description,
            glowColor: path.accentColor,
          }));
          onPathsGenerated(formattedPaths);
        }
      }
    };

    loadPaths();
  }, [currentPathsSignature]); // Reload when onboarding answers/language change

  // Sort paths so recommended/best match is always first
  const sortedPaths = (paths.length > 0 ? paths : defaultPaths).sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    return 0;
  });
  const displayPaths = sortedPaths;

  useEffect(() => {
    // Header animation - only run when paths are loaded
    if (!isLoadingPaths && paths.length > 0) {
      Animated.parallel([
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(headerSlide, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(true);
      });
    }
  }, [isLoadingPaths, paths]);

  // Conditional return AFTER all hooks
  if (isLoadingPaths) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={[styles.loadingText, { marginTop: 20 }]}>{t('clarityMap.generatingPersonalizedPaths')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView, isTabletLayout && styles.scrollViewTablet]}
        contentContainerStyle={[
          styles.scrollContent,
          styles.scrollContentWithRoom,
          isTabletMarginsOnly && styles.scrollContentTabletMarginsOnly,
          typeof cardHorizontalInset === 'number' ? { paddingHorizontal: cardHorizontalInset } : null,
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        alwaysBounceVertical
        directionalLockEnabled
        scrollEnabled
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { marginTop: headerTopMargin },
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <Text style={[
            styles.headerTitle,
            headerTitleColor ? {
              color: headerTitleColor,
              textShadowColor: 'rgba(30, 20, 50, 0.55)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            } : undefined,
          ]}>
            {t('onboarding.whichDirectionCallsYou').replace('{newline}', ' ')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('clarityMap.chooseDirectionThatResonates')}
          </Text>
          {headerExtraContent}
        </Animated.View>

        {/* Path Cards */}
        <View style={styles.cardsContainer}>
          {displayPaths.map((path, index) => (
            <PathCard
              key={path.id}
              path={path}
              index={index}
              isVisible={isVisible}
              isTabletLayout={isTabletLayout}
              isRussian={Boolean(isRussian)}
              onSelect={() => onExplorePath?.(path.id)}
            />
          ))}
        </View>

        {/* Custom Path Option */}
        {!hideCustomPathOption && (
          <CustomPathCard isVisible={isVisible} onPress={() => onWorkOnDreamGoal?.()} />
        )}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  scrollViewTablet: {
    width: '100%',
    alignSelf: 'stretch',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  scrollContentWithRoom: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  scrollContentTabletMarginsOnly: {
    paddingHorizontal: 24,
  },

  // Header
  header: {
    marginBottom: 28,
  },
  headerTitle: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 30,
  },
  headerSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 15,
    color: '#342846',
    textAlign: 'center',
    opacity: 1,
    lineHeight: 17.6,
    paddingHorizontal: 10,
  },

  // Cards Container
  cardsContainer: {
    gap: 16,
  },

  // Path Card
  cardWrapper: {
    position: 'relative',
  },
  cardWrapperTablet: {
    marginBottom: 0,
  },
  recommendedGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 24,
    opacity: 0.3,
  },
  recommendedGlowTablet: {
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
  },
  cardTouchable: {
    borderRadius: 20,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  cardRecommendedRussian: {
    borderColor: '#a592b0',
  },
  cardTablet: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderColor: 'rgba(52, 40, 70, 0.08)',
  },
  cardGradient: {
    paddingTop: 24, // Increased padding for better spacing
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 24, // Increased padding for better spacing
    flexDirection: 'column',
    justifyContent: 'space-between', // Distribute content evenly, push footer to bottom
  },
  cardGradientTablet: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  cardContent: {
    flexShrink: 1, // Allow content to wrap naturally
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    width: 150,
    height: '100%',
  },
  cardTopGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
  },
  cardTopGlowTablet: {
    height: '36%',
  },

  // Recommended Badge
  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginBottom: 15,
  },
  recommendedBadgeTablet: {
    left: 20,
    right: undefined,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 0,
    marginBottom: 0,
  },
  recommendedText: {
    fontFamily: 'AnonymousPro-Bold',
    fontSize: 11,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recommendedTextTablet: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 12,
    textTransform: 'none',
    letterSpacing: 0,
  },

  // Card Header
  cardHeaderTouchable: {
    marginBottom: 12,
  },
  cardHeaderTouchableTablet: {
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Increased opacity to match third card
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconCircleTablet: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerText: {
    flex: 1,
  },
  pathTitle: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#342846',
    marginBottom: 2,
    lineHeight: 28, // Increased line spacing
  },
  pathTitleTablet: {
    fontSize: 18,
    lineHeight: 24,
  },
  pathSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: '#342846',
    opacity: 0.9,
    lineHeight: 20, // Increased line spacing
  },
  pathSubtitleTablet: {
    fontSize: 14,
    opacity: 0.5,
  },

  // Why It Fits
  whyItFitsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  whyItFitsContainerTablet: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    marginBottom: 16,
  },
  whyItFitsText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: '#342846', // Changed to purple to match app theme
    flex: 1,
    minWidth: 0,
    flexShrink: 1, // Allow text to wrap properly
    lineHeight: 20, // Increased line spacing
  },
  whyItFitsTextTablet: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 22,
  },

  // Milestones
  milestoneContainer: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  milestoneDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  milestoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Increased opacity to match third card
  },
  milestoneLine: {
    width: 30,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Increased opacity to match third card
  },
  milestoneLabels: {
    marginTop: 8,
    gap: 8,
  },
  milestoneLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  milestoneLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Increased opacity to match third card
  },
  milestoneLabelText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20, // Increased line spacing
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Align button to the right since duration is removed
    marginTop: 16, // Add spacing above footer to ensure it's always visible
  },
  cardFooterTablet: {
    marginTop: 12,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.22)',
  },
  exploreButtonTablet: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  exploreButtonText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#FFFFFF',
  },
  exploreButtonTextTablet: {
    fontFamily: 'AnonymousPro-Regular',
  },

  // Custom Path Card
  customCardWrapper: {
    marginTop: 20,
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
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
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
    marginLeft: 72, // Align with icon (56px icon + 16px spacing)
  },
  customCardTitle: {
    ...HeadingStyle,
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
  loadingText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 16,
  },
});
