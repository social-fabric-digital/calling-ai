import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, ButtonHeadingStyle, HeadingStyle } from '@/constants/theme';
import { FEATURES_INTRO_TOTAL_CARDS, FULL_ONBOARDING_JOURNEY_UNITS } from '@/constants/progress';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    FlatList,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Matches common onboarding / settings horizontal gutters (~24). */
const SCREEN_GUTTER = 24;
const supportsBlurView = Boolean(UIManager.getViewManagerConfig?.('ExpoBlurView'));

// Create Animated FlatList for native scroll events
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// ============================================
// ANIMATION 1: Ikigai Circles (Discover)
// ============================================
const AnimatedCircle = ({ 
  style, 
  delay = 0 
}: { 
  style: object; 
  delay?: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.08,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.65,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [delay, scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
};

const IkigaiCirclesVisual = () => {
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');

  return (
    <View style={styles.ikigaiCircles}>
      <AnimatedCircle style={[styles.circle, styles.circleTop]} delay={0} />
      <AnimatedCircle style={[styles.circle, styles.circleRight]} delay={1000} />
      <AnimatedCircle style={[styles.circle, styles.circleBottom]} delay={2000} />
      <AnimatedCircle style={[styles.circle, styles.circleLeft]} delay={3000} />
      <View style={styles.ikigaiCenter}>
        <Text style={styles.ikigaiCenterText}>{isRussian ? 'ИКИГАЙ' : 'IKIGAI'}</Text>
      </View>
    </View>
  );
};

// ============================================
// ANIMATION 2: Target Rings (Goals)
// ============================================
const TargetVisual = () => {
  const ring1Scale = useRef(new Animated.Value(0.3)).current;
  const ring2Scale = useRef(new Animated.Value(0.3)).current;
  const ring3Scale = useRef(new Animated.Value(0.3)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        // Ring 1 expands
        Animated.parallel([
          Animated.timing(ring1Scale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ring1Opacity, {
              toValue: 0.6,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(ring1Opacity, {
              toValue: 0.3,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Ring 2 expands
        Animated.parallel([
          Animated.timing(ring2Scale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ring2Opacity, {
              toValue: 0.6,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(ring2Opacity, {
              toValue: 0.3,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Ring 3 expands
        Animated.parallel([
          Animated.timing(ring3Scale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ring3Opacity, {
              toValue: 0.6,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(ring3Opacity, {
              toValue: 0.3,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Reset
        Animated.parallel([
          Animated.timing(ring1Scale, { toValue: 0.3, duration: 0, useNativeDriver: true }),
          Animated.timing(ring2Scale, { toValue: 0.3, duration: 0, useNativeDriver: true }),
          Animated.timing(ring3Scale, { toValue: 0.3, duration: 0, useNativeDriver: true }),
          Animated.timing(ring1Opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(ring3Opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(500),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={styles.targetContainer}>
      <Animated.View 
        style={[
          styles.targetRing, 
          styles.targetRingOuter,
          { transform: [{ scale: ring3Scale }], opacity: ring3Opacity }
        ]} 
      />
      <Animated.View 
        style={[
          styles.targetRing, 
          styles.targetRingMiddle,
          { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }
        ]} 
      />
      <Animated.View 
        style={[
          styles.targetRing, 
          styles.targetRingInner,
          { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }
        ]} 
      />
      <View style={styles.targetCenter}>
        <MaterialIcons name="flag" size={32} color="#342846" />
      </View>
    </View>
  );
};

// ============================================
// ANIMATION 3: Bar Chart (Progress)
// ============================================
const BarChartVisual = () => {
  const bar1Height = useRef(new Animated.Value(0)).current;
  const bar2Height = useRef(new Animated.Value(0)).current;
  const bar3Height = useRef(new Animated.Value(0)).current;
  const bar4Height = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.stagger(150, [
          Animated.timing(bar1Height, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bar2Height, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bar3Height, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bar4Height, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1000),
        Animated.parallel([
          Animated.timing(bar1Height, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(bar2Height, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(bar3Height, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(bar4Height, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(500),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const bars = [
    { anim: bar1Height, height: 60, color: '#cdbad8' },
    { anim: bar2Height, height: 90, color: '#bfacca' },
    { anim: bar3Height, height: 75, color: '#baccd7' },
    { anim: bar4Height, height: 110, color: '#342846' },
  ];

  return (
    <View style={styles.barChartContainer}>
      {bars.map((bar, index) => (
        <View key={index} style={styles.barWrapper}>
          <Animated.View
            style={[
              styles.bar,
              {
                height: bar.height,
                backgroundColor: bar.color,
                transform: [{ scaleY: bar.anim }],
              },
            ]}
          />
        </View>
      ))}
      <View style={styles.barChartBaseline} />
    </View>
  );
};

// ============================================
// ANIMATION 4: Glowing Star (Guidance)
// ============================================
const StarVisual = () => {
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );

    // Sparkle animations
    const sparkleAnimation = Animated.loop(
      Animated.sequence([
        Animated.stagger(300, [
          Animated.sequence([
            Animated.timing(sparkle1, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(sparkle1, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(sparkle2, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(sparkle2, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(sparkle3, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(sparkle3, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ]),
        Animated.delay(500),
      ])
    );

    glowAnimation.start();
    rotateAnimation.start();
    sparkleAnimation.start();

    return () => {
      glowAnimation.stop();
      rotateAnimation.stop();
      sparkleAnimation.stop();
    };
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.starContainer}>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.starGlow,
          {
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      />
      
      {/* Orbiting sparkles */}
      <Animated.View style={[styles.sparkleOrbit, { transform: [{ rotate: rotation }] }]}>
        <Animated.View style={[styles.sparkle, styles.sparkle1, { opacity: sparkle1 }]} />
        <Animated.View style={[styles.sparkle, styles.sparkle2, { opacity: sparkle2 }]} />
        <Animated.View style={[styles.sparkle, styles.sparkle3, { opacity: sparkle3 }]} />
      </Animated.View>
      
      {/* Center star */}
      <View style={styles.starCenter}>
        <MaterialIcons name="auto-awesome" size={32} color="#342846" />
      </View>
    </View>
  );
};

// ============================================
// Feature Card Component
// ============================================
type FeatureItem = {
  icon: string;
  title: string;
  description: string;
  why: string;
};

const getFeatures = (isRussian: boolean): FeatureItem[] => [
  {
    icon: 'favorite',
    title: isRussian ? 'Открой свой икигай' : 'Discover your ikigai',
    description: isRussian
      ? 'Найди пересечение того, что ты любишь, в чем силен и что нужно миру.'
      : 'Find the intersection of what you love, what you are good at, and what the world needs.',
    why: isRussian
      ? 'Открой личный смысл через мягкую и честную рефлексию.'
      : 'Discover personal meaning through gentle and honest reflection.',
  },
  {
    icon: 'flag',
    title: isRussian ? 'Ставь значимые цели' : 'Set meaningful goals',
    description: isRussian
      ? 'Преврати свое видение в конкретные шаги, соответствующие твоим ценностям.'
      : 'Turn your vision into concrete steps aligned with your values.',
    why: isRussian
      ? 'Разбей большую цель на достижимые этапы и двигайся уверенно.'
      : 'Break big goals into achievable steps and move forward with confidence.',
  },
  {
    icon: 'bar-chart',
    title: isRussian ? 'Отслеживай прогресс' : 'Track your progress',
    description: isRussian
      ? 'Наблюдай свой рост через понятную аналитику и ежедневные проверки.'
      : 'See your growth through clear insights and daily check-ins.',
    why: isRussian
      ? 'Замечай паттерны, отмечай победы и поддерживай мотивацию.'
      : 'Spot patterns, celebrate wins, and keep your motivation strong.',
  },
  {
    icon: 'auto-awesome',
    title: isRussian ? 'Персональные подсказки' : 'Personalized guidance',
    description: isRussian
      ? 'Система учитывает твои ответы и дает персональные инсайты.'
      : 'The system adapts to your answers and gives personalized insights.',
    why: isRussian
      ? 'Оставайся в контакте со своим путем каждый день.'
      : 'Stay connected to your path every day.',
  },
];

const FeatureCard = ({ 
  item, 
  index, 
  scrollX,
  containerWidth,
}: { 
  item: FeatureItem;
  index: number;
  scrollX: Animated.Value;
  containerWidth: number;
}) => {
  const inputRange = [
    (index - 1) * containerWidth,
    index * containerWidth,
    (index + 1) * containerWidth,
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.92, 1, 0.92],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.6, 1, 0.6],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.cardContainer, { width: containerWidth }]}>
      <Animated.View 
        style={[
          styles.card, 
          { 
            transform: [{ scale }],
            opacity,
          }
        ]}
      >
        {supportsBlurView ? (
          <BlurView
            intensity={90}
            tint="light"
            style={styles.cardBlur}
            experimentalBlurMethod="dimezisBlurView"
          />
        ) : (
          <View style={styles.cardBlurFallback} />
        )}
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <MaterialIcons 
              name={item.icon as any} 
              size={24} 
              color="#FFFFFF" 
            />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
          </View>
        </View>
        {item.why && (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>{item.why}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

// ============================================
// Visual Switcher Component
// ============================================
const VisualSwitcher = ({ 
  scrollX,
  containerWidth,
}: { 
  scrollX: Animated.Value;
  containerWidth: number;
}) => {
  const visuals = [
    <IkigaiCirclesVisual key="ikigai" />,
    <TargetVisual key="target" />,
    <BarChartVisual key="chart" />,
    <StarVisual key="star" />,
  ];

  return (
    <View style={styles.visualSwitcher}>
      {visuals.map((visual, index) => {
        const inputRange = [
          (index - 1) * containerWidth,
          index * containerWidth,
          (index + 1) * containerWidth,
        ];

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        });

        const scale = scrollX.interpolate({
          inputRange,
          outputRange: [0.8, 1, 0.8],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.visualItem,
              {
                opacity,
                transform: [{ scale }],
              },
            ]}
          >
            {visual}
          </Animated.View>
        );
      })}
    </View>
  );
};

// ============================================
// Main Component
// ============================================
export default function FeaturesIntroScreen() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<any>>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const handleContainerLayout = useCallback((e: any) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  }, []);

  useEffect(() => {
    if (windowWidth > 0) setContainerWidth(windowWidth);
  }, [windowWidth]);
  const [showHeaderTooltip, setShowHeaderTooltip] = useState(false);
  const [headerTooltipText, setHeaderTooltipText] = useState('');
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const features = getFeatures(Boolean(isRussian));
  const headerTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = {
    skip: isRussian ? 'Пропустить' : 'Skip',
    heading: isRussian ? 'Управляй своим путем' : 'Own your journey',
    subheading: isRussian
      ? 'Присоединяйся к тем, кто с помощью мудрости икигай строит осмысленную и сбалансированную жизнь.'
      : 'Join people building a meaningful and balanced life through ikigai wisdom.',
    continue: isRussian ? 'Продолжить' : 'Continue',
    back: isRussian ? 'Назад' : 'Back',
    next: isRussian ? 'Далее' : 'Next',
  };

  // Entrance animations
  const headlineFade = useRef(new Animated.Value(0)).current;
  const headlineSlide = useRef(new Animated.Value(20)).current;
  const subheadlineFade = useRef(new Animated.Value(0)).current;
  const subheadlineSlide = useRef(new Animated.Value(20)).current;
  const visualFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(headlineFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(headlineSlide, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subheadlineFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(subheadlineSlide, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(visualFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlide, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleSkip = () => {
    router.push('/onboarding?step=1');
  };

  const handleNext = () => {
    if (currentCardIndex < features.length - 1) {
      const nextIndex = currentCardIndex + 1;
      flatListRef.current?.scrollToIndex({ 
        index: nextIndex, 
        animated: true 
      });
      setCurrentCardIndex(nextIndex);
    } else {
      router.push('/onboarding?step=2');
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      const prevIndex = currentCardIndex - 1;
      flatListRef.current?.scrollToIndex({ 
        index: prevIndex, 
        animated: true 
      });
      setCurrentCardIndex(prevIndex);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / containerWidth);
    setCurrentCardIndex(index);
  };

  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 12 : 20);
  const footerPaddingBottom = Math.max(insets.bottom + 18, 28);

  const handleHeaderBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/landing');
  };

  const handleHeaderInfo = () => {
    const tooltipText = isRussian
      ? 'Пролистай карточки, чтобы понять, как работает твой путь. Это поможет осознанно начать.'
      : 'Swipe these cards to understand how your journey works and why each step matters.';
    setHeaderTooltipText(tooltipText);
    setShowHeaderTooltip(true);
    if (headerTooltipTimerRef.current) {
      clearTimeout(headerTooltipTimerRef.current);
    }
    headerTooltipTimerRef.current = setTimeout(() => {
      setShowHeaderTooltip(false);
      headerTooltipTimerRef.current = null;
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (headerTooltipTimerRef.current) {
        clearTimeout(headerTooltipTimerRef.current);
      }
    };
  }, []);

  return (
    <PaperTextureBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { minHeight: windowHeight }]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <Image
          source={require('../assets/images/own.png')}
          pointerEvents="none"
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={[styles.headerRow, { paddingTop: topInset + 10, paddingHorizontal: SCREEN_GUTTER }]}>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleHeaderBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#342846" />
          </TouchableOpacity>
          <View style={styles.headerProgressContainer}>
            <View style={styles.headerProgressBar}>
              <View
                style={[
                  styles.headerProgressFill,
                  {
                    width: `${Math.min(
                      ((Math.min(currentCardIndex + 1, FEATURES_INTRO_TOTAL_CARDS)) /
                        FULL_ONBOARDING_JOURNEY_UNITS) *
                        100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleHeaderInfo} activeOpacity={0.7}>
            <MaterialIcons name="help-outline" size={24} color="#342846" />
          </TouchableOpacity>
        </View>
        {showHeaderTooltip && (
          <View
            pointerEvents="none"
            style={[styles.headerTooltipContainer, { top: topInset + 62 }]}
          >
            <View style={styles.headerTooltipBubble}>
              <Text style={styles.headerTooltipText}>{headerTooltipText}</Text>
            </View>
          </View>
        )}

        {/* Header Section */}
        <View style={[styles.headerSection, { paddingHorizontal: SCREEN_GUTTER }]}>
          <Animated.Text 
            style={[
              styles.mainHeading,
              {
                opacity: headlineFade,
                transform: [{ translateY: headlineSlide }],
              }
            ]}
          >
            {copy.heading}
          </Animated.Text>
          {/* Force reload - updated version */}
          <Animated.Text 
            style={[
              styles.subheading,
              {
                opacity: subheadlineFade,
                transform: [{ translateY: subheadlineSlide }],
              }
            ]}
          >
            {copy.subheading}
          </Animated.Text>
        </View>

        {/* Dynamic Visual */}
        <Animated.View style={[styles.visualContainer, { opacity: visualFade }]}>
          <VisualSwitcher scrollX={scrollX} containerWidth={containerWidth} />
        </Animated.View>

        {/* Feature Cards Carousel */}
        <Animated.View 
          style={[
            styles.cardSection,
            {
              opacity: cardFade,
              transform: [{ translateY: cardSlide }],
            }
          ]}
        >
          <View style={styles.cardsWrapper} onLayout={handleContainerLayout}>
            <AnimatedFlatList
              ref={flatListRef as any}
              data={features}
              renderItem={({ item, index }) => (
                <FeatureCard item={item} index={index} scrollX={scrollX} containerWidth={containerWidth} />
              )}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={containerWidth}
              snapToAlignment="center"
              getItemLayout={(data, index) => ({
                length: containerWidth,
                offset: containerWidth * index,
                index,
              })}
            />

            {/* Pagination Dots */}
            <View style={styles.pagination}>
              {features.map((_, index) => {
                const inputRange = [
                  (index - 1) * containerWidth,
                  index * containerWidth,
                  (index + 1) * containerWidth,
                ];

                const dotScale = scrollX.interpolate({
                  inputRange,
                  outputRange: [1, 3, 1], // Scale from 1x (8px) to 3x (24px)
                  extrapolate: 'clamp',
                });

                const dotOpacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        transform: [{ scaleX: dotScale }],
                        opacity: dotOpacity,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Navigation buttons */}
        <View
          style={[
            styles.swipeHintContainer,
            {
              paddingHorizontal: SCREEN_GUTTER,
              paddingBottom: footerPaddingBottom,
              paddingTop: 12,
            },
          ]}
        >
          {currentCardIndex === 3 ? (
            <TouchableOpacity 
              style={styles.continueButton} 
              onPress={() => router.push('/onboarding?step=1')}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>{copy.continue}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.bottomNav}>
              {currentCardIndex > 0 && (
                <TouchableOpacity 
                  style={styles.backButtonNav} 
                  onPress={handlePrevious}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back" size={18} color="#342846" />
                  <Text style={styles.backButtonText}>{copy.back}</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.nextButton} 
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>{copy.next}</Text>
                <MaterialIcons 
                  name="arrow-forward" 
                  size={20} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 0,
    zIndex: 12,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    opacity: 1,
    elevation: 11,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  headerProgressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  headerProgressFill: {
    height: '100%',
    backgroundColor: '#342846',
    borderRadius: 2,
  },
  headerTooltipContainer: {
    position: 'absolute',
    right: SCREEN_GUTTER,
    zIndex: 1400,
    elevation: 1400,
    maxWidth: 230,
  },
  headerTooltipBubble: {
    backgroundColor: 'rgba(52, 40, 70, 0.95)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTooltipText: {
    ...BodyStyle,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
  },
  headerSection: {
    paddingTop: 8,
    alignItems: 'center',
  },
  mainHeading: {
    ...HeadingStyle,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subheading: {
    ...BodyStyle,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 19,
    maxWidth: Platform.isPad ? 350 : 300,
    alignSelf: 'center',
  },

  // Visual Container
  visualContainer: {
    height: 164,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualSwitcher: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  visualItem: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ikigai Circles
  ikigaiCircles: {
    width: 180,
    height: 180,
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  circleTop: {
    backgroundColor: '#cdbad8',
    top: 0,
    left: 40,
  },
  circleRight: {
    backgroundColor: '#bfacca',
    top: 40,
    right: 0,
  },
  circleBottom: {
    backgroundColor: '#baccd7',
    bottom: 0,
    left: 40,
  },
  circleLeft: {
    backgroundColor: '#cdbad8',
    top: 40,
    left: 0,
  },
  ikigaiCenter: {
    position: 'absolute',
    top: 65,
    left: 65,
    width: 50,
    height: 50,
    backgroundColor: '#F9F7F4',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ikigaiCenterText: {
    ...HeadingStyle,
    fontSize: 8,
    color: '#342846',
    letterSpacing: 1,
  },

  // Target Visual
  targetContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 3,
  },
  targetRingOuter: {
    width: 160,
    height: 160,
    borderColor: '#baccd7',
  },
  targetRingMiddle: {
    width: 110,
    height: 110,
    borderColor: '#bfacca',
  },
  targetRingInner: {
    width: 60,
    height: 60,
    borderColor: '#cdbad8',
  },
  targetCenter: {
    width: 50,
    height: 50,
    backgroundColor: '#F9F7F4',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Bar Chart Visual
  barChartContainer: {
    width: 180,
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 20,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 140,
  },
  bar: {
    width: 30,
    borderRadius: 8,
    transformOrigin: 'bottom',
  },
  barChartBaseline: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: 'rgba(52, 40, 70, 0.1)',
    borderRadius: 1,
  },

  // Star Visual
  starContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#bfacca',
  },
  sparkleOrbit: {
    position: 'absolute',
    width: 160,
    height: 160,
  },
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#342846',
  },
  sparkle1: {
    top: 10,
    left: 76,
  },
  sparkle2: {
    bottom: 30,
    right: 20,
  },
  sparkle3: {
    bottom: 30,
    left: 20,
  },
  starCenter: {
    width: 60,
    height: 60,
    backgroundColor: '#F9F7F4',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Cards
  cardSection: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: 0,
    paddingTop: 8,
    paddingBottom: 12,
  },
  cardsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cardContainer: {
    paddingHorizontal: SCREEN_GUTTER,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBlurFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#342846',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...HeadingStyle,
    fontSize: 16,
    color: '#342846',
    marginBottom: 6,
    letterSpacing: 0,
  },
  cardDescription: {
    ...BodyStyle,
    fontSize: 14,
    lineHeight: 19,
    color: '#666',
  },
  tooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  tooltipText: {
    ...BodyStyle,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#342846',
  },
  swipeHintContainer: {
    width: '100%',
    marginTop: 8,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  swipeIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 28,
  },
  swipeArrowPlaceholder: {
    width: 24,
    height: 24,
  },
  swipeArrowLeft: {
    opacity: 0.7,
  },
  swipeArrowRight: {
    opacity: 0.7,
  },
  navHint: {
    ...BodyStyle,
    fontSize: 13,
    color: '#666',
    opacity: 0.7,
  },
  continueButton: {
    backgroundColor: '#342846',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  continueButtonText: {
    ...ButtonHeadingStyle,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    gap: 12,
    width: '100%',
  },
  backButtonNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    gap: 8,
    minHeight: 50,
  },
  backButtonText: {
    ...BodyStyle,
    fontSize: 16,
    color: '#342846',
    fontWeight: '600',
    lineHeight: 20,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    gap: 8,
    flex: 1,
    minHeight: 50,
    backgroundColor: '#342846',
  },
  nextButtonText: {
    ...ButtonHeadingStyle,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 20,
  },
});