import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, FlatList, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import { hapticLight, hapticMedium } from '@/utils/haptics';
import { getLifeContextQuestions, width } from './constants';
import { styles } from './styles';
import { CurrentLifeContextStepProps } from './types';

type LifeContextQuestion = ReturnType<typeof getLifeContextQuestions>[number];

const SituationVisual = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  const path1 = useRef(new Animated.Value(0)).current;
  const path2 = useRef(new Animated.Value(0)).current;
  const path3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );

    const pathAnim = (anim: Animated.Value, delay: number) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );

    pulseAnim.start();
    pathAnim(path1, 0).start();
    pathAnim(path2, 500).start();
    pathAnim(path3, 1000).start();

    return () => {
      pulse.stopAnimation();
      path1.stopAnimation();
      path2.stopAnimation();
      path3.stopAnimation();
    };
  }, []);

  return (
    <View style={styles.lifeContextVisualContainer}>
      {/* Radiating paths */}
      <Animated.View style={[styles.lifeContextPathLine, { 
        transform: [{ rotate: '-30deg' }, { scaleX: path1 }],
        opacity: path1,
        backgroundColor: '#cdbad8',
      }]} />
      <Animated.View style={[styles.lifeContextPathLine, { 
        transform: [{ rotate: '0deg' }, { scaleX: path2 }],
        opacity: path2,
        backgroundColor: '#cdbad8',
      }]} />
      <Animated.View style={[styles.lifeContextPathLine, { 
        transform: [{ rotate: '30deg' }, { scaleX: path3 }],
        opacity: path3,
        backgroundColor: '#cdbad8',
      }]} />
      
      <Animated.View style={[styles.lifeContextMainIconCircle, { 
        backgroundColor: '#cdbad8',
        transform: [{ scale: pulse }],
      }]}>
        <MaterialIcons name="person-pin" size={27} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
};
const ConstraintVisual = () => {
  const shake = useRef(new Animated.Value(0)).current;
  const crack1 = useRef(new Animated.Value(0)).current;
  const crack2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shakeAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 100, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.delay(2000),
      ])
    );

    const crackAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(crack1, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(crack2, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.delay(1500),
        Animated.parallel([
          Animated.timing(crack1, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(crack2, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.delay(500),
      ])
    );

    shakeAnim.start();
    crackAnim.start();

    return () => {
      shake.stopAnimation();
      crack1.stopAnimation();
      crack2.stopAnimation();
    };
  }, []);

  const shakeInterpolate = shake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  return (
    <View style={styles.lifeContextVisualContainer}>
      {/* Crack lines */}
      <Animated.View style={[styles.lifeContextCrackLine, {
        top: 26.25,
        left: 41.25,
        transform: [{ rotate: '45deg' }, { scaleY: crack1 }],
        opacity: crack1,
      }]} />
      <Animated.View style={[styles.lifeContextCrackLine, {
        top: 26.25,
        right: 41.25,
        transform: [{ rotate: '-45deg' }, { scaleY: crack2 }],
        opacity: crack2,
      }]} />
      
      <Animated.View style={[styles.lifeContextMainIconCircle, { 
        backgroundColor: '#bfacca',
        transform: [{ rotate: shakeInterpolate }],
      }]}>
        <MaterialIcons name="lock-open" size={27} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
};
const MattersVisual = () => {
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;
  const star4 = useRef(new Animated.Value(0)).current;
  const star5 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const twinkle = (anim: Animated.Value, delay: number) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.delay(1000),
      ])
    );

    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    );

    twinkle(star1, 0).start();
    twinkle(star2, 300).start();
    twinkle(star3, 600).start();
    twinkle(star4, 900).start();
    twinkle(star5, 1200).start();
    glowAnim.start();

    return () => {
      [star1, star2, star3, star4, star5, glow].forEach(a => a.stopAnimation());
    };
  }, []);

  const stars = [
    { anim: star1, top: 11.25, left: 18.75, size: 20 },
    { anim: star2, top: 7.5, right: 22.5, size: 18 },
    { anim: star3, bottom: 18.75, left: 15, size: 16 },
    { anim: star4, bottom: 11.25, right: 18.75, size: 20 },
    { anim: star5, top: 37.5, left: 7.5, size: 14 },
  ];

  return (
    <View style={styles.lifeContextVisualContainer}>
      {stars.map((star, idx) => (
        <Animated.View 
          key={idx}
          style={[
            styles.lifeContextConstellationStar,
            { top: star.top, bottom: star.bottom, left: star.left, right: star.right, opacity: star.anim }
          ]}
        >
          <MaterialIcons name="star" size={star.size} color="#baccd7" />
        </Animated.View>
      ))}
      
      <Animated.View style={[styles.lifeContextGlowCircle, { backgroundColor: '#baccd7', opacity: glow }]} />
      
      <View style={[styles.lifeContextMainIconCircle, { backgroundColor: '#baccd7' }]}>
        <MaterialIcons name="auto-awesome" size={40} color="#FFFFFF" />
      </View>
    </View>
  );
};
const LifeContextVisualSwitcher = ({ scrollX }: { scrollX: Animated.Value }) => {
  const visuals = [
    <SituationVisual key="situation" />,
    <ConstraintVisual key="constraint" />,
    <MattersVisual key="matters" />,
  ];

  return (
    <View style={styles.lifeContextVisualSwitcher}>
      {visuals.map((visual, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
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
            style={[styles.lifeContextVisualItem, { opacity, transform: [{ scale }] }]}
          >
            {visual}
          </Animated.View>
        );
      })}
    </View>
  );
};
const LifeContextOptionButton = ({
  label,
  optionId,
  isSelected,
  onPress,
  color,
  isGrid = false,
}: {
  label: string;
  optionId: string;
  isSelected: boolean;
  onPress: () => void;
  color: string;
  isGrid?: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    void hapticLight();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.lifeContextOptionButton,
          isGrid && styles.lifeContextOptionButtonGrid,
          isSelected && { backgroundColor: '#342846', borderColor: '#342846' },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={[
          styles.lifeContextOptionText, 
          isSelected && styles.lifeContextOptionTextSelected,
          (optionId === 'financial' || optionId === 'creative' || optionId === 'flexibility') && styles.lifeContextOptionTextTight
        ]}>
          {label}
        </Text>
        {isSelected && (
          <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};
const LifeContextQuestionCard = ({
  item,
  index,
  scrollX,
  selections,
  onSelect,
}: {
  item: LifeContextQuestion;
  index: number;
  scrollX: Animated.Value;
  selections: string[];
  onSelect: (optionId: string) => void;
}) => {
  const inputRange = [
    (index - 1) * width,
    index * width,
    (index + 1) * width,
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.92, 1, 0.92],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.5, 1, 0.5],
    extrapolate: 'clamp',
  });

  // Determine if this is first or second question (shorter cards)
  const isShortCard = index < 2;
  const isFirstCard = index === 0;
  // Third card (multi-select) needs same positioning as first two
  const isThirdCard = index === 2;

  // Scroll position tracking for third card
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollPosition(offsetY);
  };

  // Calculate which circle should be highlighted based on scroll position
  // Assuming max scroll height of ~280px, divide into 3 sections
  const maxScrollHeight = 280;
  const sectionHeight = maxScrollHeight / 3;
  
  const getCircleOpacity = (circleIndex: number) => {
    const startY = circleIndex * sectionHeight;
    const endY = (circleIndex + 1) * sectionHeight;
    
    if (scrollPosition >= startY && scrollPosition < endY) {
      return 1;
    }
    // Also highlight if we're at the very top (first section)
    if (circleIndex === 0 && scrollPosition < sectionHeight / 2) {
      return 1;
    }
    // Highlight last circle if scrolled near bottom
    if (circleIndex === 2 && scrollPosition > maxScrollHeight - sectionHeight) {
      return 1;
    }
    return 0.3;
  };

  return (
    <View style={[
      styles.lifeContextCardWrapper,
      (isShortCard || isThirdCard) && { marginTop: 30 },
      isFirstCard && { marginTop: 17 }
    ]}>
      <Animated.View style={[
        styles.lifeContextQuestionCard, 
        isShortCard && styles.lifeContextQuestionCardShort,
        isThirdCard && styles.lifeContextQuestionCardMulti,
        { transform: [{ scale }], opacity }
      ]}>
        <FrostedCardLayer />
        {/* Question */}
        <Text style={styles.lifeContextQuestionText}>{item.question}</Text>
        
        {item.subtitle && (
          <Text style={styles.lifeContextSubtitleText}>{item.subtitle}</Text>
        )}

        {/* Options */}
        {item.type === 'multi' ? (
          <View style={styles.lifeContextOptionsWrapper}>
            <ScrollView 
              ref={scrollViewRef}
              style={styles.lifeContextOptionsScroll}
              contentContainerStyle={[styles.lifeContextOptionsContainer, styles.lifeContextOptionsContainerMulti]}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {item.options.map((option) => (
                <View key={option.id} style={styles.lifeContextOptionWrapperMulti}>
                  <View style={styles.lifeContextOptionButtonMulti}>
                    <LifeContextOptionButton
                      label={option.label}
                      optionId={option.id}
                      isSelected={selections.includes(option.id)}
                      onPress={() => onSelect(option.id)}
                      color={item.color}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
            {/* Scroll Indicator Circles */}
            <View style={styles.lifeContextScrollIndicator}>
              <View style={[styles.lifeContextScrollDot, { opacity: getCircleOpacity(0) }]} />
              <View style={[styles.lifeContextScrollDot, { opacity: getCircleOpacity(1) }]} />
              <View style={[styles.lifeContextScrollDot, { opacity: getCircleOpacity(2) }]} />
            </View>
          </View>
        ) : (
          <View style={styles.lifeContextOptionsContainer}>
            {item.options.map((option) => (
              <LifeContextOptionButton
                key={option.id}
                label={option.label}
                optionId={option.id}
                isSelected={selections.includes(option.id)}
                onPress={() => onSelect(option.id)}
                color={item.color}
              />
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
};
function CurrentLifeContextStep({
  currentSituation,
  setCurrentSituation,
  biggestConstraint,
  setBiggestConstraint,
  whatMattersMost,
  setWhatMattersMost,
  onContinue,
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
  whatExcites,
}: CurrentLifeContextStepProps) {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const lifeContextQuestions = getLifeContextQuestions(t);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string[] }>({
    situation: [],
    constraint: [],
    matters: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync with parent state
  useEffect(() => {
    if (currentSituation) {
      setAnswers(prev => ({ ...prev, situation: [currentSituation] }));
    }
    if (biggestConstraint) {
      setAnswers(prev => ({ ...prev, constraint: [biggestConstraint] }));
    }
    if (whatMattersMost.length > 0) {
      setAnswers(prev => ({ ...prev, matters: whatMattersMost }));
    }
  }, []);

  // Load saved answers
  useEffect(() => {
    const loadAnswers = async () => {
      try {
        const savedAnswers: { [key: string]: string[] } = {};
        for (const q of lifeContextQuestions) {
          const saved = await AsyncStorage.getItem(q.storageKey);
          if (saved) {
            savedAnswers[q.id] = JSON.parse(saved);
          }
        }
        setAnswers(prev => ({ ...prev, ...savedAnswers }));
        
        // Sync with parent state
        if (savedAnswers.situation?.[0]) {
          setCurrentSituation(savedAnswers.situation[0]);
        }
        if (savedAnswers.constraint?.[0]) {
          setBiggestConstraint(savedAnswers.constraint[0]);
        }
        if (savedAnswers.matters) {
          setWhatMattersMost(savedAnswers.matters);
        }
      } catch (error) {
        // Error loading answers - continue without saved data
      } finally {
        setIsLoaded(true);
      }
    };
    loadAnswers();
  }, []);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (isLoaded) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [isLoaded]);

  // Dynamic progress bar
  const progressWidth = scrollX.interpolate({
    inputRange: [0, width * (lifeContextQuestions.length - 1)],
    outputRange: ['33%', '100%'],
    extrapolate: 'clamp',
  });

  const handleBack = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  };

  const handleNext = async () => {
    void hapticMedium();
    const currentQuestion = lifeContextQuestions[currentIndex];
    const currentAnswer = answers[currentQuestion.id];
    
    // Save current answer
    if (currentAnswer.length > 0) {
      try {
        await AsyncStorage.setItem(currentQuestion.storageKey, JSON.stringify(currentAnswer));
        
        // Sync with parent state
        if (currentQuestion.id === 'situation' && currentAnswer[0]) {
          setCurrentSituation(currentAnswer[0]);
        } else if (currentQuestion.id === 'constraint' && currentAnswer[0]) {
          setBiggestConstraint(currentAnswer[0]);
        } else if (currentQuestion.id === 'matters') {
          setWhatMattersMost(currentAnswer);
        }
      } catch (error) {
        // Error saving answer - continue anyway
      }
    }

    if (currentIndex < lifeContextQuestions.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      // All questions done - trigger API call before proceeding
      const triggerApiCall = async () => {
        try {
          const requestId = Date.now().toString();
          const requestSignature = JSON.stringify({
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
            whatExcites,
            currentSituation,
            biggestConstraint,
            whatMattersMost,
          });
          await AsyncStorage.multiRemove([
            'destinyProfile_callingAwaits',
            'destinyProfile_paths',
            'destinyProfile_apiError',
          ]);
          await AsyncStorage.setItem('destinyProfile_requestId', requestId);
          await AsyncStorage.setItem('destinyProfile_requestSignature', requestSignature);
          // Mark API call as queued - LoadingStep will generate it
          await AsyncStorage.setItem('destinyProfile_apiCallStatus', 'queued');
          console.log('[CurrentLifeContextStep] API call queued for LoadingStep');
        } catch (error: any) {
          console.error('[CurrentLifeContextStep] API call failed:', error.message || error);
          await AsyncStorage.setItem('destinyProfile_apiCallStatus', 'failed');
          await AsyncStorage.setItem('destinyProfile_apiError', error.message || 'Failed to generate your destiny profile. Please try again.');
        }
      };
      
      // Start API call (don't await - let it run in background)
      triggerApiCall();
      
      // Call onContinue to proceed to LoadingStep
      onContinue();
    }
  };

  const handleSelect = (questionId: string, optionId: string) => {
    const question = lifeContextQuestions.find(q => q.id === questionId);
    if (!question) return;

    setAnswers(prev => {
      const current = prev[questionId] || [];
      
      if (question.type === 'single') {
        // Single select: replace selection and auto-advance
        const newAnswer = [optionId];
        setTimeout(() => {
          if (currentIndex < lifeContextQuestions.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
          }
        }, 300);
        
        // Sync with parent state
        if (question.id === 'situation') {
          setCurrentSituation(optionId);
        } else if (question.id === 'constraint') {
          setBiggestConstraint(optionId);
        }
        
        return { ...prev, [questionId]: newAnswer };
      } else {
        // Multi select: toggle
        let newAnswer: string[];
        if (current.includes(optionId)) {
          newAnswer = current.filter(id => id !== optionId);
        } else if (current.length < (question.maxSelections || 3)) {
          newAnswer = [...current, optionId];
        } else {
          return prev;
        }
        
        // Sync with parent state
        if (question.id === 'matters') {
          setWhatMattersMost(newAnswer);
        }
        
        return { ...prev, [questionId]: newAnswer };
      }
    });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const currentQuestion = lifeContextQuestions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id] || [];
  const isMultiSelect = currentQuestion?.type === 'multi';
  const hasAnswer = currentAnswer.length > 0;
  const isLastQuestion = currentIndex === lifeContextQuestions.length - 1;
  const continueButtonBottom = Math.max(insets.bottom + 10, 34);
  const continueButtonHeight = 56;
  const reservedBottomSpace = continueButtonBottom + continueButtonHeight + 36;

  if (!isLoaded) {
    return (
      <View style={styles.lifeContextLoadingContainer}>
        <Text style={styles.lifeContextLoadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.lifeContextContainer}>
      {/* Title Section */}
      <Animated.View 
        style={[
          styles.lifeContextTitleSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <Text style={styles.lifeContextMainTitle}>{t('onboarding.currentLifeContext').toUpperCase()}</Text>
        <Text style={styles.lifeContextMainSubtitle}>
          {t('onboarding.currentLifeContextSubtitle')}
        </Text>
      </Animated.View>

      {/* Dynamic Visual */}
      <Animated.View style={[styles.lifeContextVisualArea, { opacity: fadeAnim }]}>
        <LifeContextVisualSwitcher scrollX={scrollX} />
      </Animated.View>

      {/* Step Indicator */}
      <View style={styles.lifeContextStepIndicator}>
          {lifeContextQuestions.map((q, idx) => {
            const inputRange = [
              (idx - 1) * width,
              idx * width,
              (idx + 1) * width,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={q.id}
                style={[
                  styles.lifeContextStepDot,
                  { width: dotWidth, opacity: dotOpacity, backgroundColor: q.color }
                ]}
              />
            );
          })}
      </View>

      {/* Question Cards Carousel */}
      <Animated.View 
        style={[
          styles.lifeContextCarouselContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            marginBottom: reservedBottomSpace,
          }
        ]}
      >
          <FlatList
            ref={flatListRef}
            data={lifeContextQuestions}
            renderItem={({ item, index }) => (
              <LifeContextQuestionCard
                item={item}
                index={index}
                scrollX={scrollX}
                selections={answers[item.id] || []}
                onSelect={(optionId) => handleSelect(item.id, optionId)}
              />
            )}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={width}
            snapToAlignment="center"
            contentContainerStyle={{ paddingBottom: reservedBottomSpace }}
          />
      </Animated.View>

      {/* Continue Button - Fixed at bottom */}
      <TouchableOpacity 
        style={[
          styles.lifeContextContinueButton,
          { bottom: continueButtonBottom },
          !hasAnswer && styles.lifeContextContinueButtonDisabled
        ]}
        onPressIn={() => {
          if (hasAnswer) {
            void hapticMedium();
          }
        }}
        onPress={() => {
          if (isLastQuestion) {
            onContinue();
            return;
          }
          void handleNext();
        }}
        activeOpacity={0.8}
        disabled={!hasAnswer}
      >
        <Text style={[
          styles.lifeContextContinueButtonText,
          !hasAnswer && styles.lifeContextContinueButtonTextDisabled
        ]}>
          {isLastQuestion ? t('common.continue') : t('common.next', { defaultValue: isRussian ? 'Далее' : 'Next' })}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default CurrentLifeContextStep;
