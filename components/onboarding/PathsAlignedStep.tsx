import { BodyStyle } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  onSelect: () => void;
}

function PathCard({ path, index, isVisible, onSelect }: PathCardProps) {
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
  const isThirdCard = index === 2;
  const textColor = isThirdCard ? '#342846' : undefined; // Used for button text and other elements
  const headingColor = isThirdCard ? '#FFFFFF' : undefined; // Third card uses white for heading/subheading

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
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
            {
              opacity: glowAnim,
              backgroundColor: path.accentColor,
            },
          ]}
        />
      )}

      <Animated.View style={styles.card}>
        <LinearGradient
          colors={path.gradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Shimmer overlay */}
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerTranslate }] },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
          <LinearGradient
            colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.06)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.cardTopGlow}
            pointerEvents="none"
          />

          {/* Recommended badge */}
          {path.isRecommended && (
            <View style={[styles.recommendedBadge, { backgroundColor: path.accentColor }]}>
              <MaterialIcons name="auto-awesome" size={12} color="#FFFFFF" />
              <Text style={styles.recommendedText}>{t('clarityMap.bestMatch')}</Text>
            </View>
          )}

          {/* Content wrapper to allow dynamic height */}
          <View style={styles.cardContent}>
            {/* Header */}
            <View
              style={[
                styles.cardHeaderTouchable,
                path.isRecommended && { marginTop: 35 }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name={iconName} size={28} color="#FFFFFF" />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.pathTitle, headingColor && { color: headingColor }]}>{path.title}</Text>
                  <Text style={[styles.pathSubtitle, headingColor && { color: headingColor }]}>{path.subtitle}</Text>
                </View>
              </View>
            </View>

            {/* Why it fits - always visible but subtle */}
            <View style={styles.whyItFitsContainer}>
              <MaterialIcons name="favorite" size={14} color="#FFFFFF" />
              <Text style={styles.whyItFitsText}>{path.whyItFits}</Text>
            </View>
          </View>

          {/* CTA Button - Always visible at bottom */}
          <View style={styles.cardFooter}>
            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.exploreButton, { backgroundColor: 'rgba(255,255,255,0.7)' }]}
              onPress={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.exploreButtonText, { color: '#342846' }]}>{t('clarityMap.explore')}</Text>
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
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={styles.customCardEmpty}>
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
  hideCustomPathOption = false,
  headerTopMargin = 0,
  headerExtraContent,
}: PathsAlignedStepProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [paths, setPaths] = useState<PathData[]>([]);
  const [isLoadingPaths, setIsLoadingPaths] = useState(true);

  // Header animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;

  const cardGradientColors = ['#342846', '#a592b0', '#342846'];

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
      accentColor: '#342846',
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
        const storedPaths = await AsyncStorage.getItem('destinyProfile_paths');
        
        if (storedPaths) {
          const generatedPaths = JSON.parse(storedPaths);

          // Convert stored paths to PathData format
          // Define color palette for cards: #342846, #a592b0, #baccd7
          const cardColors = ['#342846', '#a592b0', '#baccd7'];
          const iconMap = ['lightbulb', 'architecture', 'campaign'];
          const aiPaths: PathData[] = generatedPaths.map((path: any, index: number) => ({
            id: path.id || index + 1,
            title: path.title.toUpperCase(),
            subtitle: path.title,
            description: path.description,
            whyItFits: path.description,
            icon: iconMap[index] || 'star',
            gradientColors: cardGradientColors,
            accentColor: path.glowColor || cardColors[index] || cardColors[0],
            milestones: [t('clarityMap.formulateVision'), t('clarityMap.layFoundation'), t('clarityMap.gainMomentum'), t('clarityMap.launchAndImprove')],
            duration: t('clarityMap.twelveWeeks'),
            isRecommended: index === 0,
          }));

          const finalPaths = aiPaths.length > 0 ? aiPaths : defaultPaths;
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
          // Fallback to defaults if storage is empty (shouldn't happen if LoadingStep completed)
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
  }, []); // Only run once on mount

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
        <ActivityIndicator size="large" color="#342846" />
        <Text style={[styles.loadingText, { marginTop: 20 }]}>{t('clarityMap.generatingPersonalizedPaths')}</Text>
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
          <Text style={styles.headerTitle}>{t('onboarding.whichDirectionCallsYou').replace('{newline}', '\n')}</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 28,
  },
  headerTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
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
    opacity: 0.7,
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
  recommendedGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 24,
    opacity: 0.3,
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
    borderColor: 'rgba(255,255,255,0.24)',
  },
  cardGradient: {
    paddingTop: 24, // Increased padding for better spacing
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 24, // Increased padding for better spacing
    flexDirection: 'column',
    justifyContent: 'space-between', // Distribute content evenly, push footer to bottom
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
  recommendedText: {
    fontFamily: 'AnonymousPro-Bold',
    fontSize: 11,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card Header
  cardHeaderTouchable: {
    marginBottom: 12,
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
  headerText: {
    flex: 1,
  },
  pathTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 2,
    lineHeight: 28, // Increased line spacing
  },
  pathSubtitle: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20, // Increased line spacing
  },

  // Description
  pathDescription: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 24, // Increased line spacing (was 20)
    marginBottom: 8,
    flexShrink: 1, // Allow text to wrap properly
  },

  // Why It Fits
  whyItFitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)', // Increased opacity to match third card
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  whyItFitsText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 13,
    color: '#342846', // Changed to purple to match app theme
    flex: 1,
    flexShrink: 1, // Allow text to wrap properly
    lineHeight: 20, // Increased line spacing
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
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exploreButtonText: {
    ...BodyStyle,
    fontSize: 14,
    color: '#FFFFFF',
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
    backgroundColor: 'transparent',
    padding: 20,
    position: 'relative',
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
  loadingText: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 16,
  },
});