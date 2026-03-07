import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const IKIGAI_CONTAINER_SIZE = Math.min(width - 48, 392);
const IKIGAI_CENTER_SIZE = 72;
const IKIGAI_ITEM_WIDTH = 168;
const IKIGAI_CENTER_LEFT = (IKIGAI_CONTAINER_SIZE - IKIGAI_CENTER_SIZE) / 2;
const IKIGAI_TOP_BOTTOM_LEFT = (IKIGAI_CONTAINER_SIZE - IKIGAI_ITEM_WIDTH) / 2;
const IKIGAI_SIDE_OFFSET = -28;

// ============================================
// Utility Functions
// ============================================
/**
 * Keep Ikigai labels short and scannable (max 2 words).
 */
function prepareIkigaiText(text: string): string {
  if (!text) return text;

  const cleaned = text
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, ''))
    .filter(Boolean);

  return cleaned.slice(0, 2).join(' ');
}

// ============================================
// Types
// ============================================
interface CallingAwaitsAnimatedProps {
  userName: string;
  onContinue?: () => void;
  // User's data from onboarding
  whatYouLove?: string;
  whatYouGoodAt?: string;
  whatWorldNeeds?: string;
  whatCanBePaidFor?: string;
  birthMonth?: string;
  birthDate?: string;
  birthYear?: string;
  birthCity?: string;
  birthHour?: string;
  birthMinute?: string;
  birthPeriod?: string;
  fear?: string;
  whatExcites?: string;
  isActive?: boolean;
}

interface GiftCardData {
  id: string;
  icon: string;
  title: string;
  description: string;
  gradientColors: string[];
}

const withOpacity = (hexColor: string, alpha = 0.8): string => {
  const normalized = hexColor.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ============================================
// Animated Gift Card Component
// ============================================
interface AnimatedGiftCardProps {
  data: GiftCardData;
  index: number;
  isRevealed: boolean;
  onReveal: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function AnimatedGiftCard({
  data,
  index,
  isRevealed,
  onReveal,
  isExpanded,
  onToggleExpand,
}: AnimatedGiftCardProps) {
  const revealAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRevealed) {
      // Staggered reveal animation
      const delay = index * 150;
      
      setTimeout(() => {
        // Main reveal sequence
        Animated.parallel([
          // Scale up with spring
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          // Fade in
          Animated.timing(revealAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          // Subtle rotation correction
          Animated.spring(rotateAnim, {
            toValue: 1,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }),
        ]).start();

        // Glow pulse on reveal
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();

        // Shimmer effect
        Animated.loop(
          Animated.sequence([
            Animated.timing(shimmerAnim, {
              toValue: 1,
              duration: 2000,
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
  }, [isRevealed]);

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      tension: 100,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-3deg', '0deg'],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  // Use minHeight for collapsed state, let it grow naturally when expanded
  const cardMinHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 80], // Minimum height stays the same, content determines actual height
  });

  const descriptionOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const iconName = data.icon as keyof typeof MaterialIcons.glyphMap;

  if (!isRevealed) {
    // Unrevealed placeholder card
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onReveal}
        style={styles.cardContainer}
      >
        <View style={styles.unrevealedCard}>
          <View style={styles.unrevealedShimmer} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onToggleExpand}
      style={styles.cardContainer}
    >
      <Animated.View
        style={[
          styles.revealedCardWrapper,
          {
            opacity: revealAnim,
            transform: [
              { scale: scaleAnim },
              { rotate: rotation },
            ],
          },
        ]}
      >
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.cardGlow,
            {
              opacity: glowAnim,
              backgroundColor: data.gradientColors[0],
            },
          ]}
        />

        <Animated.View style={[styles.revealedCard, { minHeight: cardMinHeight }]}>
          <LinearGradient
            colors={data.gradientColors.map((color) => withOpacity(color, 0.8)) as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <FrostedCardLayer intensity={30} tint="dark" fallbackColor="rgba(52, 40, 70, 0.2)" />
            {/* Shimmer overlay */}
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  transform: [{ translateX: shimmerTranslate }],
                },
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>

            {/* Card content */}
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <MaterialIcons name={iconName} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle}>{data.title}</Text>
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: expandAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '180deg'],
                      }),
                    },
                  ],
                }}
              >
                <MaterialIcons name="expand-more" size={24} color="rgba(255,255,255,0.7)" />
              </Animated.View>
            </View>

            {/* Expandable description */}
            {isExpanded && (
              <Animated.View
                style={[
                  styles.descriptionContainer,
                  { opacity: descriptionOpacity },
                ]}
              >
                <Text style={styles.cardDescription}>{data.description}</Text>
              </Animated.View>
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ============================================
// Animated Ikigai Section
// ============================================
interface IkigaiSectionProps {
  isVisible: boolean;
  summary: string;
  labels: {
    divider: string;
    love: string;
    goodAt: string;
    worldNeeds: string;
    paidFor: string;
    title: string;
    fallbackLove: string;
    fallbackGoodAt: string;
    fallbackWorldNeeds: string;
    fallbackPaidFor: string;
  };
  ikigaiCircles?: {
    whatYouLove: string;
    whatYouGoodAt: string;
    whatWorldNeeds: string;
    whatCanBePaidFor: string;
  };
}

function AnimatedIkigaiSection({ isVisible, summary, labels, ikigaiCircles }: IkigaiSectionProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Dynamic pulse animation for the ikigai circle
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.ikigaiSection,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <View style={styles.ikigaiDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{labels.divider}</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Ikigai Circles Visualization */}
      <View style={styles.ikigaiCirclesContainer}>
        {/* Top Circle - What You Love */}
        <View style={[styles.ikigaiCircleItem, styles.ikigaiCircleTop]}>
          <View style={[styles.ikigaiCircleIcon, { backgroundColor: '#cdbad8' }]}>
            <MaterialIcons name="favorite" size={20} color="#FFFFFF" />
          </View>
          <Text
            style={styles.ikigaiCircleLabel}
            android_hyphenationFrequency="none"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {labels.love}
          </Text>
          <Text 
            style={styles.ikigaiCircleValue}
            numberOfLines={3}
            ellipsizeMode="tail"
            android_hyphenationFrequency="none"
          >
            {ikigaiCircles?.whatYouLove || labels.fallbackLove}
          </Text>
        </View>

        {/* Right Circle - What You're Good At */}
        <View style={[styles.ikigaiCircleItem, styles.ikigaiCircleRight]}>
          <View style={[styles.ikigaiCircleIcon, { backgroundColor: '#bfacca' }]}>
            <MaterialIcons name="star" size={20} color="#FFFFFF" />
          </View>
          <Text
            style={styles.ikigaiCircleLabel}
            android_hyphenationFrequency="none"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {labels.goodAt}
          </Text>
          <Text 
            style={styles.ikigaiCircleValue}
            numberOfLines={3}
            ellipsizeMode="tail"
            android_hyphenationFrequency="none"
          >
            {ikigaiCircles?.whatYouGoodAt || labels.fallbackGoodAt}
          </Text>
        </View>

        {/* Bottom Circle - What the World Needs */}
        <View style={[styles.ikigaiCircleItem, styles.ikigaiCircleBottom]}>
          <View style={[styles.ikigaiCircleIcon, { backgroundColor: '#baccd7' }]}>
            <MaterialIcons name="public" size={20} color="#FFFFFF" />
          </View>
          <Text
            style={styles.ikigaiCircleLabel}
            android_hyphenationFrequency="none"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {labels.worldNeeds}
          </Text>
          <Text 
            style={styles.ikigaiCircleValue}
            numberOfLines={3}
            ellipsizeMode="tail"
            android_hyphenationFrequency="none"
          >
            {ikigaiCircles?.whatWorldNeeds || labels.fallbackWorldNeeds}
          </Text>
        </View>

        {/* Left Circle - What You Can Be Paid For */}
        <View style={[styles.ikigaiCircleItem, styles.ikigaiCircleLeft]}>
          <View style={[styles.ikigaiCircleIcon, { backgroundColor: '#d4c4a8' }]}>
            <MaterialIcons name="attach-money" size={20} color="#FFFFFF" />
          </View>
          <Text
            style={styles.ikigaiCircleLabel}
            android_hyphenationFrequency="none"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {labels.paidFor}
          </Text>
          <Text 
            style={styles.ikigaiCircleValue}
            numberOfLines={3}
            ellipsizeMode="tail"
            android_hyphenationFrequency="none"
          >
            {ikigaiCircles?.whatCanBePaidFor || labels.fallbackPaidFor}
          </Text>
        </View>

        {/* Center Circle */}
        <Animated.View
          style={[
            styles.ikigaiCenterCircle,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <LinearGradient
            colors={['#bfacca', '#baccd7', '#cdbad8', '#d4c4a8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ikigaiGradient}
          >
            <MaterialIcons name="auto-awesome" size={32} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      </View>

      <Text style={styles.ikigaiTitle}>{labels.title}</Text>
      <Text style={styles.ikigaiSummary}>{summary}</Text>
    </Animated.View>
  );
}

// ============================================
// Main Component
// ============================================
export default function CallingAwaitsStep({
  userName,
  onContinue,
  whatYouLove,
  whatYouGoodAt,
  whatWorldNeeds,
  whatCanBePaidFor,
  birthMonth,
  birthDate,
  birthYear,
  birthCity,
  birthHour,
  birthMinute,
  birthPeriod,
  fear,
  whatExcites,
  isActive = false,
}: CallingAwaitsAnimatedProps) {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const labels = {
    divider: isRussian ? 'карта икигай' : 'ikigai map',
    love: isRussian ? 'ТВОИ СТРАСТИ' : 'YOUR PASSIONS',
    goodAt: isRussian ? 'ТВОИ ТАЛАНТЫ' : 'YOUR TALENTS',
    worldNeeds: isRussian ? 'ЧТО НУЖНО МИРУ' : 'WHAT THE WORLD NEEDS',
    paidFor: isRussian ? 'МОНЕТИЗИРУЕМЫЕ\nНАВЫКИ' : 'MONETIZABLE\nSKILLS',
    title: isRussian ? 'ТВОЙ УНИКАЛЬНЫЙ ПУТЬ К СМЫСЛУ И РЕАЛИЗАЦИИ.' : 'YOUR UNIQUE PATH TO PURPOSE AND FULFILLMENT.',
    fallbackLove: isRussian ? 'ТВОИ СТРАСТИ' : 'YOUR PASSIONS',
    fallbackGoodAt: isRussian ? 'ТВОИ ТАЛАНТЫ' : 'YOUR TALENTS',
    fallbackWorldNeeds: isRussian ? 'ЧТО НУЖНО МИРУ' : 'WHAT THE WORLD NEEDS',
    fallbackPaidFor: isRussian ? 'НАВЫКИ, КОТОРЫЕ МОЖНО МОНЕТИЗИРОВАТЬ' : 'SKILLS YOU CAN BE PAID FOR',
    loading: isRussian ? 'Определяем твои природные сильные стороны...' : 'Discovering your natural strengths...',
    journeyCall: isRussian ? 'ТВОЙ ПУТЬ ЗОВЕТ' : 'YOUR PATH IS CALLING',
    giftsDivider: isRussian ? 'твои природные дары' : 'your natural gifts',
    continue: isRussian ? 'Продолжить' : 'Continue',
  };
  const hasCyrillic = (text: string) => /[А-Яа-яЁё]/.test(text);
  const hasLatin = (text: string) => /[A-Za-z]/.test(text);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [showIkigai, setShowIkigai] = useState(false);
  const [autoRevealStarted, setAutoRevealStarted] = useState(false);
  const [gifts, setGifts] = useState<GiftCardData[]>([]);
  const [isLoadingGifts, setIsLoadingGifts] = useState(true);
  const [ikigaiCircles, setIkigaiCircles] = useState({
    whatYouLove: whatYouLove || '',
    whatYouGoodAt: whatYouGoodAt || '',
    whatWorldNeeds: whatWorldNeeds || '',
    whatCanBePaidFor: whatCanBePaidFor || '',
  });
  const [centerSummary, setCenterSummary] = useState('');
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptsRef = useRef(0);
  const hasResolvedInitialLoadRef = useRef(false);

  // Header animations
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-20)).current;
  const avatarScaleAnim = useRef(new Animated.Value(0)).current;

  // Continue button animation
  const continueAnim = useRef(new Animated.Value(0)).current;

  // Default/fallback gifts
  const defaultGifts: GiftCardData[] = [
    {
      id: 'creative',
      icon: 'palette',
      title: isRussian ? 'ТВОРЧЕСКОЕ САМОВЫРАЖЕНИЕ' : 'CREATIVE EXPRESSION',
      description: isRussian
        ? 'Твоя способность выражать себя через искусство, текст и другие форматы, которые созвучны тебе.'
        : 'Your ability to express yourself through art, writing, and other formats that resonate with you.',
      gradientColors: ['#342846', '#4a3a5c'],
    },
    {
      id: 'leadership',
      icon: 'emoji-events',
      title: isRussian ? 'СМЕЛОЕ ЛИДЕРСТВО' : 'BOLD LEADERSHIP',
      description: isRussian
        ? 'Твоя природная способность вдохновлять и вести других к важным изменениям и росту.'
        : 'Your natural ability to inspire and guide others toward meaningful growth.',
      gradientColors: ['#3d2d52', '#4f3d66'],
    },
    {
      id: 'communication',
      icon: 'record-voice-over',
      title: isRussian ? 'ТВОРЧЕСКАЯ КОММУНИКАЦИЯ' : 'CREATIVE COMMUNICATION',
      description: isRussian
        ? 'Твой дар ясно передавать сложные идеи и эмоции в визуальной, письменной или устной форме.'
        : 'Your gift for clearly expressing complex ideas and emotions in visual, written, or spoken form.',
      gradientColors: ['#342846', '#453858'],
    },
    {
      id: 'projects',
      icon: 'rocket-launch',
      title: isRussian ? 'ЗАПУСК ПРОЕКТОВ' : 'PROJECT LAUNCH',
      description: isRussian
        ? 'Твой талант начинать новое и доводить идеи до результата с энергией и настойчивостью.'
        : 'Your talent for starting new initiatives and carrying ideas through with energy and persistence.',
      gradientColors: ['#3a2f4d', '#4c3e62'],
    },
  ];

  const loadContent = async () => {
      try {
        // Only show full-screen loader on first unresolved load.
        if (!hasResolvedInitialLoadRef.current) {
          setIsLoadingGifts(true);
        }
        const [
          storedContent,
          apiStatus,
          requestId,
          responseId,
        ] = (await AsyncStorage.multiGet([
          'destinyProfile_callingAwaits',
          'destinyProfile_apiCallStatus',
          'destinyProfile_requestId',
          'destinyProfile_responseId',
        ])).map(([, value]) => value);

        const isRequestPending = requestId && responseId !== requestId;
        
        if (apiStatus === 'completed' && storedContent && !isRequestPending) {
          const content = JSON.parse(storedContent);
          const rawNaturalGifts = Array.isArray(content?.naturalGifts) ? content.naturalGifts : [];
          const circles = (content?.ikigaiCircles && typeof content.ikigaiCircles === 'object')
            ? content.ikigaiCircles
            : {};

          // Convert stored natural gifts to GiftCardData format
          const aiGifts: GiftCardData[] = rawNaturalGifts.map((gift: any, index: number) => ({
            id: `gift-${index}`,
            icon: ['palette', 'emoji-events', 'record-voice-over', 'rocket-launch'][index] || 'star',
            title: String(gift?.name || '').toUpperCase() || defaultGifts[index % defaultGifts.length].title,
            description: String(gift?.description || '').trim() || defaultGifts[index % defaultGifts.length].description,
            gradientColors: ['#342846', '#4a3a5c'],
          }));

          setGifts(aiGifts.length > 0 ? aiGifts : defaultGifts);
          // Use stored ikigai circles
          setIkigaiCircles({
            whatYouLove: prepareIkigaiText(circles.whatYouLove || whatYouLove || labels.fallbackLove),
            whatYouGoodAt: prepareIkigaiText(circles.whatYouGoodAt || whatYouGoodAt || labels.fallbackGoodAt),
            whatWorldNeeds: prepareIkigaiText(circles.whatWorldNeeds || whatWorldNeeds || labels.fallbackWorldNeeds),
            whatCanBePaidFor: prepareIkigaiText(circles.whatCanBePaidFor || whatCanBePaidFor || labels.fallbackPaidFor),
          });
          const rawCenterSummary = String(content.centerSummary || '').trim();
          const summaryLooksRussian = hasCyrillic(rawCenterSummary) && !hasLatin(rawCenterSummary);
          const summaryLooksEnglish = hasLatin(rawCenterSummary) && !hasCyrillic(rawCenterSummary);
          const languageMismatch = (isRussian && summaryLooksEnglish) || (!isRussian && summaryLooksRussian);
          setCenterSummary(languageMismatch ? '' : rawCenterSummary);
          retryAttemptsRef.current = 0;
          hasResolvedInitialLoadRef.current = true;
        } else {
          // Resolve first paint with defaults once; retries then run silently.
          if (!hasResolvedInitialLoadRef.current) {
            setGifts(defaultGifts);
            setIkigaiCircles({
              whatYouLove: prepareIkigaiText(whatYouLove || labels.fallbackLove),
              whatYouGoodAt: prepareIkigaiText(whatYouGoodAt || labels.fallbackGoodAt),
              whatWorldNeeds: prepareIkigaiText(whatWorldNeeds || labels.fallbackWorldNeeds),
              whatCanBePaidFor: prepareIkigaiText(whatCanBePaidFor || labels.fallbackPaidFor),
            });
            hasResolvedInitialLoadRef.current = true;
          }
          if (isActive && retryAttemptsRef.current < 6) {
            retryAttemptsRef.current += 1;
            retryTimeoutRef.current = setTimeout(() => {
              loadContent();
            }, 700);
          }
        }
        if (!hasResolvedInitialLoadRef.current) {
          setIsLoadingGifts(false);
        } else {
          // Keep screen stable after first paint.
          setIsLoadingGifts(false);
        }
      } catch (error) {
        // Fallback to defaults on first failure only.
        if (!hasResolvedInitialLoadRef.current) {
          setGifts(defaultGifts);
          setIkigaiCircles({
            whatYouLove: prepareIkigaiText(whatYouLove || labels.fallbackLove),
            whatYouGoodAt: prepareIkigaiText(whatYouGoodAt || labels.fallbackGoodAt),
            whatWorldNeeds: prepareIkigaiText(whatWorldNeeds || labels.fallbackWorldNeeds),
            whatCanBePaidFor: prepareIkigaiText(whatCanBePaidFor || labels.fallbackPaidFor),
          });
          hasResolvedInitialLoadRef.current = true;
        }
        if (isActive && retryAttemptsRef.current < 6) {
          retryAttemptsRef.current += 1;
          retryTimeoutRef.current = setTimeout(() => {
            loadContent();
          }, 700);
        }
        setIsLoadingGifts(false);
      }
    };

  // Load content from AsyncStorage (generated by LoadingStep)
  useEffect(() => {
    if (!isActive) return;
    // Reset reveal timeline whenever this step is (re)initialized.
    setAutoRevealStarted(false);
    setRevealedCards(new Set());
    setShowIkigai(false);
    continueAnim.setValue(0);
    hasResolvedInitialLoadRef.current = false;
    retryAttemptsRef.current = 0;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    loadContent();
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isActive, isRussian]);

  // Generate ikigai summary from user answers or AI-generated content
  const ikigaiSummary = centerSummary || (whatYouLove && whatYouGoodAt
    ? (isRussian
      ? `Твоя любовь к ${whatYouLove?.toLowerCase().slice(0, 30)}... соединяется с талантом к ${whatYouGoodAt?.toLowerCase().slice(0, 30)}...`
      : `Your love for ${whatYouLove?.toLowerCase().slice(0, 30)}... meets your talent for ${whatYouGoodAt?.toLowerCase().slice(0, 30)}...`)
    : (whatYouLove || whatYouGoodAt || whatWorldNeeds || whatCanBePaidFor
      ? (isRussian ? 'Твой уникальный путь к смыслу и реализации.' : 'Your unique path to purpose and fulfillment.')
      : (isRussian
        ? 'Пересечение того, что ты любишь, в чем ты хорош, что нужно миру и за что тебе могут платить.'
        : 'The intersection of what you love, what you are good at, what the world needs, and what you can be paid for.')));

  useEffect(() => {
    // Wait for gifts to load before starting animations
    if (isLoadingGifts || gifts.length === 0) return;

    // Initial header animation
    Animated.sequence([
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
      ]),
      Animated.parallel([
        Animated.spring(avatarScaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Reveal content in one deterministic step to avoid timing glitches.
      startAutoReveal();
    });
  }, [isLoadingGifts, gifts]);

  const startAutoReveal = () => {
    if (autoRevealStarted) return;
    setAutoRevealStarted(true);
    setRevealedCards(new Set(gifts.map((_, index) => index)));
    setShowIkigai(true);
    continueAnim.setValue(1);
  };

  const handleRevealCard = (index: number) => {
    setRevealedCards(prev => new Set(prev).add(index));
  };

  const handleToggleExpand = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  const displayName = userName || 'A';
  const initial = displayName.charAt(0).toUpperCase();

  if (isLoadingGifts) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#342846" />
        <Text style={{ marginTop: 20, color: '#342846', fontSize: 16 }}>{labels.loading}</Text>
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
          {/* Avatar with animation */}
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [
                  { scale: avatarScaleAnim },
                ],
              },
            ]}
          >
            <View style={styles.avatarImageWrapper}>
              <View style={styles.avatarImageInner}>
                <Image
                  source={require('../../assets/images/anxious.png')}
                  style={styles.avatarImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </Animated.View>

          <Text style={styles.callingText}>
            {displayName && displayName !== 'A'
              ? `${displayName}, ${isRussian ? 'твой путь зовет' : 'your path is calling'}`.toUpperCase()
              : labels.journeyCall}
          </Text>
        </Animated.View>

        {/* Divider */}
        <Animated.View
          style={[
            styles.sectionDivider,
            { opacity: headerFadeAnim },
          ]}
        >
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{labels.giftsDivider}</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* Gift Cards */}
        <View style={styles.cardsSection}>
          {gifts.map((gift, index) => (
            <AnimatedGiftCard
              key={gift.id}
              data={gift}
              index={index}
              isRevealed={revealedCards.has(index)}
              onReveal={() => {
                void hapticLight();
                handleRevealCard(index);
              }}
              isExpanded={expandedCard === index}
              onToggleExpand={() => {
                void hapticLight();
                handleToggleExpand(index);
              }}
            />
          ))}
        </View>

        {/* Ikigai Section */}
        <AnimatedIkigaiSection
          isVisible={showIkigai}
          summary={ikigaiSummary}
          labels={labels}
          ikigaiCircles={ikigaiCircles}
        />

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueButtonContainer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => {
            void hapticMedium();
            onContinue?.();
          }}
          activeOpacity={0.9}
        >
          <Text style={styles.continueButtonText}>{labels.continue}</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarImageWrapper: {
    width: 130,
    height: 130,
    borderRadius: 0,
    overflow: 'visible',
  },
  avatarImageInner: {
    transform: [{ translateY: -10 }],
  },
  avatarImage: {
    width: 125,
    height: 125,
    borderRadius: 0,
  },
  nameText: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 32,
    color: '#342846',
    marginBottom: 4,
  },
  callingText: {
    ...HeadingStyle,
    fontSize: 32,
    color: '#342846',
    textAlign: 'center',
  },

  // Dividers
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(52, 40, 70, 0.2)',
  },
  dividerText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: '#342846',
    marginHorizontal: 16,
    opacity: 1,
  },

  // Cards Section
  cardsSection: {
    gap: 12,
  },
  cardContainer: {
    width: '100%',
  },

  // Unrevealed Card
  unrevealedCard: {
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 40, 70, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(52, 40, 70, 0.15)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  unrevealedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unrevealedText: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: 'rgba(52, 40, 70, 0.4)',
  },
  unrevealedShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Revealed Card
  revealedCardWrapper: {
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    opacity: 0.5,
  },
  revealedCard: {
    borderRadius: 16,
    overflow: 'hidden', // Keep hidden for rounded corners
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    width: '100%', // Ensure full width
  },
  cardGradient: {
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: '100%',
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  descriptionContainer: {
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
  },
  cardDescription: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    flexShrink: 0, // Allow text to expand naturally
  },

  // Ikigai Section
  ikigaiSection: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 8,
  },
  ikigaiDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  ikigaiCirclesContainer: {
    width: IKIGAI_CONTAINER_SIZE,
    height: IKIGAI_CONTAINER_SIZE,
    position: 'relative',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ikigaiCircleItem: {
    position: 'absolute',
    alignItems: 'center',
    width: IKIGAI_ITEM_WIDTH,
    // Ensure consistent spacing - descriptions will always maintain same distance from center
    paddingBottom: 20, // Add padding at bottom to ensure descriptions never touch center icon
  },
  ikigaiCircleTop: {
    top: 0, // Moved up to ensure more space between description and center icon
    left: IKIGAI_TOP_BOTTOM_LEFT,
  },
  ikigaiCircleRight: {
    right: IKIGAI_SIDE_OFFSET, // Move farther out due to wider category titles
    top: 139, // Same y-axis as monetizable skills (left circle) and center circle
    alignItems: 'center', // Keep centered for consistency
  },
  ikigaiCircleBottom: {
    // Center circle bottom: 139 + 72 = 211px
    // 20px top margin + extra 20px = 40px total margin from center circle bottom
    // "World needs" icon top: 211 + 40 = 251px
    // Since icon is at top of item, item top = 251px
    top: 251, // Icon positioned 40px below center circle bottom (20px + extra 20px)
    left: IKIGAI_TOP_BOTTOM_LEFT,
  },
  ikigaiCircleLeft: {
    // Center circle: left: 134 (center of 340px container: (340-72)/2 = 134)
    // Moved further left to ensure descriptions don't touch center icon
    left: IKIGAI_SIDE_OFFSET, // Symmetric to right circle, wider text area
    top: 139, // Same y-axis as center circle (center circle top: 139)
    alignItems: 'center', // Keep centered for consistency
  },
  ikigaiCircleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  ikigaiCircleLabel: {
    ...HeadingStyle,
    fontSize: 11,
    color: '#342846',
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 4,
    width: '100%',
    maxWidth: 164, // Wider label area to avoid splitting long words
  },
  ikigaiCircleValue: {
    ...BodyStyle,
    fontSize: 12,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 16,
    width: '100%',
    maxWidth: 160, // Wider to keep full words on a single line
    textTransform: 'none', // Override uppercase from BodyStyle if needed
    paddingHorizontal: 0,
    // Ensure text wraps and doesn't extend toward center
    flexWrap: 'wrap',
    // Prevent word breaking - words will stay intact
  },
  ikigaiCenterCircle: {
    position: 'absolute',
    top: 139, // Moved up 15px (was 154, now 139)
    left: IKIGAI_CENTER_LEFT,
    shadowColor: '#bfacca',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  ikigaiGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ikigaiTitle: {
    fontFamily: 'BricolageGrotesque-Bold',
    fontSize: 20,
    color: '#342846',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 12,
    paddingHorizontal: 0,
    lineHeight: 28,
  },
  ikigaiSummary: {
    fontFamily: 'AnonymousPro-Regular',
    fontSize: 14,
    color: '#342846',
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 0,
    lineHeight: 22,
    marginBottom: 0,
  },

  // Continue Button
  continueButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  continueButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    ...BodyStyle,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
