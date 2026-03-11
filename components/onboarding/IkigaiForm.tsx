import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, FlatList, Keyboard, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FrostedCardLayer } from '@/components/FrostedCardLayer';
import { hapticMedium } from '@/utils/haptics';
import { width } from './constants';
import { styles } from './styles';
import { IkigaiFormProps } from './types';

const LoveVisual = () => {
  const heart1 = useRef(new Animated.Value(0)).current;
  const heart2 = useRef(new Animated.Value(0)).current;
  const heart3 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const floatAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation(heart1, 0).start();
    floatAnimation(heart2, 600).start();
    floatAnimation(heart3, 1200).start();
    pulseAnimation.start();

    return () => {
      heart1.stopAnimation();
      heart2.stopAnimation();
      heart3.stopAnimation();
      pulse.stopAnimation();
    };
  }, []);

  const floatStyle = (anim: Animated.Value, startX: number, startY: number) => ({
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [startY, startY - 20] }) },
      { translateX: startX },
    ],
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.7, 0.3] }),
  });

  return (
    <View style={styles.ikigaiVisualContainer}>
      <Animated.View style={[styles.ikigaiFloatingHeart, floatStyle(heart1, -40, 20)]}>
        <MaterialIcons name="favorite" size={24} color="#cdbad8" />
      </Animated.View>
      <Animated.View style={[styles.ikigaiFloatingHeart, floatStyle(heart2, 45, 30)]}>
        <MaterialIcons name="favorite" size={18} color="#cdbad8" />
      </Animated.View>
      <Animated.View style={[styles.ikigaiFloatingHeart, floatStyle(heart3, -20, -10)]}>
        <MaterialIcons name="favorite" size={20} color="#cdbad8" />
      </Animated.View>
      
      <Animated.View style={[styles.ikigaiMainIconCircle, { backgroundColor: '#cdbad8', transform: [{ scale: pulse }] }]}>
        <MaterialIcons name="favorite" size={40} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
};
const GoodAtVisual = () => {
  const shine = useRef(new Animated.Value(0)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shineAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shine, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    const twinkle = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.delay(1000),
        ])
      );
    };

    shineAnimation.start();
    twinkle(star1, 0).start();
    twinkle(star2, 500).start();
    twinkle(star3, 1000).start();

    return () => {
      shine.stopAnimation();
      star1.stopAnimation();
      star2.stopAnimation();
      star3.stopAnimation();
    };
  }, []);

  return (
    <View style={styles.ikigaiVisualContainer}>
      <Animated.View style={[styles.ikigaiTwinkleStar, { top: 10, left: 30, opacity: star1 }]}>
        <MaterialIcons name="star" size={16} color="#bfacca" />
      </Animated.View>
      <Animated.View style={[styles.ikigaiTwinkleStar, { top: 25, right: 25, opacity: star2 }]}>
        <MaterialIcons name="star" size={12} color="#bfacca" />
      </Animated.View>
      <Animated.View style={[styles.ikigaiTwinkleStar, { bottom: 30, left: 20, opacity: star3 }]}>
        <MaterialIcons name="star" size={14} color="#bfacca" />
      </Animated.View>
      
      <Animated.View style={[
        styles.ikigaiShineOverlay,
        {
          opacity: shine.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }),
          transform: [{ scale: shine.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
        }
      ]} />
      
      <View style={[styles.ikigaiMainIconCircle, { backgroundColor: '#bfacca' }]}>
        <MaterialIcons name="emoji-events" size={40} color="#FFFFFF" />
      </View>
    </View>
  );
};
const PaidForVisual = () => {
  const coin1 = useRef(new Animated.Value(0)).current;
  const coin2 = useRef(new Animated.Value(0)).current;
  const coin3 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const coinFloat = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    };

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    );

    coinFloat(coin1, 0).start();
    coinFloat(coin2, 500).start();
    coinFloat(coin3, 1000).start();
    glowAnimation.start();

    return () => {
      coin1.stopAnimation();
      coin2.stopAnimation();
      coin3.stopAnimation();
      glow.stopAnimation();
    };
  }, []);

  const coinStyle = (anim: Animated.Value, startX: number) => ({
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [50, -20] }) },
      { translateX: startX },
      { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
    ],
    opacity: anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
  });

  return (
    <View style={styles.ikigaiVisualContainer}>
      <Animated.View style={[styles.ikigaiFloatingCoin, coinStyle(coin1, -30)]}>
        <MaterialIcons name="paid" size={20} color="#d4c4a8" />
      </Animated.View>
      <Animated.View style={[styles.ikigaiFloatingCoin, coinStyle(coin2, 0)]}>
        <MaterialIcons name="paid" size={16} color="#d4c4a8" />
      </Animated.View>
      <Animated.View style={[styles.ikigaiFloatingCoin, coinStyle(coin3, 35)]}>
        <MaterialIcons name="paid" size={18} color="#d4c4a8" />
      </Animated.View>

      <Animated.View style={[styles.ikigaiGlowCircle, { backgroundColor: '#d4c4a8', opacity: glow }]} />
      
      <View style={[styles.ikigaiMainIconCircle, { backgroundColor: '#d4c4a8' }]}>
        <MaterialIcons name="trending-up" size={40} color="#FFFFFF" />
      </View>
    </View>
  );
};
const WorldNeedsVisual = () => {
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rippleAnim = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    };

    const rotateAnimation = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );

    rippleAnim(ripple1, 0).start();
    rippleAnim(ripple2, 700).start();
    rippleAnim(ripple3, 1400).start();
    rotateAnimation.start();

    return () => {
      ripple1.stopAnimation();
      ripple2.stopAnimation();
      ripple3.stopAnimation();
      rotate.stopAnimation();
    };
  }, []);

  const rippleStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
  });

  return (
    <View style={styles.ikigaiVisualContainer}>
      <Animated.View style={[styles.ikigaiRipple, { borderColor: '#baccd7' }, rippleStyle(ripple1)]} />
      <Animated.View style={[styles.ikigaiRipple, { borderColor: '#baccd7' }, rippleStyle(ripple2)]} />
      <Animated.View style={[styles.ikigaiRipple, { borderColor: '#baccd7' }, rippleStyle(ripple3)]} />
      
      <Animated.View style={[
        styles.ikigaiMainIconCircle, 
        { 
          backgroundColor: '#baccd7',
          transform: [{ rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }
      ]}>
        <MaterialIcons name="public" size={40} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
};
const IkigaiVisualSwitcher = ({ scrollX }: { scrollX: Animated.Value }) => {
  const visuals = [
    <LoveVisual key="love" />,
    <GoodAtVisual key="good" />,
    <PaidForVisual key="paid" />,
    <WorldNeedsVisual key="world" />,
  ];

  return (
    <View style={styles.ikigaiVisualSwitcher}>
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
            style={[
              styles.ikigaiVisualItem,
              { opacity, transform: [{ scale }] },
            ]}
          >
            {visual}
          </Animated.View>
        );
      })}
    </View>
  );
};
const IkigaiQuestionCard = ({ 
  item, 
  index, 
  scrollX,
  answer,
  onChangeAnswer,
  t,
  inputContainerRef,
  onInputFocus,
  onInputLayout,
}: { 
  item: { id: string; question: string; description: string; placeholder: string; color: string; icon: any; storageKey: string }; 
  index: number;
  scrollX: Animated.Value;
  answer: string;
  onChangeAnswer: (text: string) => void;
  t: (key: string) => string;
  inputContainerRef: React.RefObject<View>;
  onInputFocus: () => void;
  onInputLayout: (event: any) => void;
}) => {
  const inputRange = [
    (index - 1) * width,
    index * width,
    (index + 1) * width,
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.9, 1, 0.9],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.4, 1, 0.4],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.ikigaiCardWrapper}>
      <Animated.View 
        style={[
          styles.ikigaiQuestionCard, 
          { transform: [{ scale }], opacity }
        ]}
      >
        <FrostedCardLayer />
        {/* Question */}
        <Text style={styles.ikigaiQuestionText}>{item.question}</Text>
        
        {/* Description */}
        <Text style={styles.ikigaiDescriptionText}>{item.description}</Text>

        {/* Input Area */}
        <View 
          ref={inputContainerRef}
          style={[styles.ikigaiInputContainer, { borderColor: item.color }]}
          onLayout={onInputLayout}
        >
          <TextInput
            style={styles.ikigaiTextInput}
            placeholder={item.placeholder}
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={answer}
            onChangeText={onChangeAnswer}
            textAlignVertical="top"
            onFocus={onInputFocus}
          />
        </View>
      </Animated.View>
    </View>
  );
};
function IkigaiForm({
  whatYouLove,
  setWhatYouLove,
  whatYouGoodAt,
  setWhatYouGoodAt,
  whatWorldNeeds,
  setWhatWorldNeeds,
  whatCanBePaidFor,
  setWhatCanBePaidFor,
  onPageChange,
  onContinue,
}: IkigaiFormProps) {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const inputRefs = useRef<{ [key: string]: React.RefObject<View> }>({});
  const inputPositions = useRef<Record<string, number>>({});

  // Questions array with translations
  const questions = [
    {
      id: 'love',
      question: t('onboarding.whatDoYouLove'),
      description: t('onboarding.whatDoYouLoveSubtext'),
      placeholder: t('onboarding.ikigaiSuggestions.whatYouLove.0') || (isRussian ? 'Напиши, что приносит тебе радость...' : 'Write what brings you joy...'),
      color: '#cdbad8',
      icon: require('../../assets/images/love.png'),
      storageKey: 'ikigaiWhatYouLove',
    },
    {
      id: 'good',
      question: t('onboarding.whatAreYouGoodAt'),
      description: t('onboarding.whatAreYouGoodAtSubtext'),
      placeholder: t('onboarding.ikigaiSuggestions.whatYouGoodAt.0') || (isRussian ? 'Напиши свои сильные стороны...' : 'Write your strengths...'),
      color: '#bfacca',
      icon: require('../../assets/images/good.png'),
      storageKey: 'ikigaiWhatYouGoodAt',
    },
    {
      id: 'paid',
      question: t('onboarding.whatCanBePaidForQuestion'),
      description: t('onboarding.whatCanBePaidForSubtext'),
      placeholder: t('onboarding.ikigaiSuggestions.whatCanBePaidFor.0') || (isRussian ? 'Напиши навыки, за которые готовы платить...' : 'Write skills people are willing to pay for...'),
      color: '#d4c4a8',
      icon: require('../../assets/images/paid.png'),
      storageKey: 'ikigaiWhatCanBePaidFor',
    },
    {
      id: 'world',
      question: t('onboarding.whatDoesWorldNeed'),
      description: t('onboarding.whatDoesWorldNeedSubtext'),
      placeholder: t('onboarding.ikigaiSuggestions.whatWorldNeeds.0') || (isRussian ? 'Напиши, что для тебя действительно важно...' : 'Write what truly matters to you...'),
      color: '#baccd7',
      icon: require('../../assets/images/world.png'),
      storageKey: 'ikigaiWhatWorldNeeds',
    },
  ];

  // Initialize refs for each input container
  questions.forEach(q => {
    if (!inputRefs.current[q.id]) {
      inputRefs.current[q.id] = React.createRef<View>();
    }
  });

  // Handle input field layout to measure position
  const handleInputLayout = (questionId: string) => (event: any) => {
    // Measure position relative to window using the ref
    const inputRef = inputRefs.current[questionId];
    if (inputRef?.current && inputPositions.current) {
      try {
        inputRef.current.measureInWindow((x, y) => {
          if (inputPositions.current && typeof y === 'number') {
            inputPositions.current[questionId] = y;
          }
        });
      } catch (error) {
        // Error measuring input position - silently continue
      }
    }
  };

  // Handle input focus - scroll to show the input field
  const handleInputFocus = (questionId: string) => () => {
    setTimeout(() => {
      const position = inputPositions.current[questionId];
      if (position !== undefined && scrollViewRef.current) {
        // Scroll to the input field position with some offset to ensure it's visible above keyboard
        scrollViewRef.current.scrollTo({
          y: Math.max(0, position - 150), // Offset by 150px to ensure field is visible
          animated: true,
        });
      } else {
        // Fallback: scroll to end if position not yet measured
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 300);
  };

  // Map answers to question IDs
  const answers: { [key: string]: string } = {
    love: whatYouLove,
    good: whatYouGoodAt,
    paid: whatCanBePaidFor,
    world: whatWorldNeeds,
  };

  // Load saved answers on mount
  useEffect(() => {
    const loadAnswers = async () => {
      try {
        for (const q of questions) {
          const saved = await AsyncStorage.getItem(q.storageKey);
          if (saved) {
            switch (q.id) {
              case 'love':
                setWhatYouLove(saved);
                break;
              case 'good':
                setWhatYouGoodAt(saved);
                break;
              case 'paid':
                setWhatCanBePaidFor(saved);
                break;
              case 'world':
                setWhatWorldNeeds(saved);
                break;
            }
          }
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
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoaded]);

  // Dynamic progress bar width
  const progressWidth = scrollX.interpolate({
    inputRange: [0, width * (questions.length - 1)],
    outputRange: ['25%', '100%'],
    extrapolate: 'clamp',
  });

  const handleBack = () => {
    void hapticMedium();
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ 
        index: currentIndex - 1, 
        animated: true 
      });
    } else {
      router.back();
    }
  };

  const handleNext = async () => {
    void hapticMedium();
    // Save current answer
    const currentQuestion = questions[currentIndex];
    const currentAnswer = answers[currentQuestion.id]?.trim();
    
    if (currentAnswer) {
      try {
        await AsyncStorage.setItem(currentQuestion.storageKey, currentAnswer);
      } catch (error) {
        // Error saving answer - continue anyway
      }
    }

    if (currentIndex < questions.length - 1) {
      flatListRef.current?.scrollToIndex({ 
        index: currentIndex + 1, 
        animated: true 
      });
    } else {
      // All questions done - call onContinue callback
      if (onContinue) {
        await onContinue();
      }
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false } // Need false for width interpolation
  );

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
    if (onPageChange) {
      onPageChange(index);
    }
  };

  const updateAnswer = (questionId: string, text: string) => {
    switch (questionId) {
      case 'love':
        setWhatYouLove(text);
        break;
      case 'good':
        setWhatYouGoodAt(text);
        break;
      case 'paid':
        setWhatCanBePaidFor(text);
        break;
      case 'world':
        setWhatWorldNeeds(text);
        break;
    }
  };

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const hasCurrentAnswer = answers[currentQuestion?.id]?.trim().length > 0;

  if (!isLoaded) {
    return (
      <View style={styles.ikigaiLoadingContainer}>
        <Text style={styles.ikigaiLoadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.ikigaiFormContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.isPad ? 24 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.ikigaiFormContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.ikigaiScrollView}
            contentContainerStyle={styles.ikigaiScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
        {/* Title */}
        <Animated.View 
          style={[
            styles.ikigaiTitleSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Text style={styles.ikigaiMainTitle}>{t('onboarding.step4TitleLine1')}{'\n'}{t('onboarding.step4TitleLine2')}</Text>
        </Animated.View>

        {/* Dynamic Visual */}
        <Animated.View style={[styles.ikigaiVisualArea, { opacity: fadeAnim }]}>
          <IkigaiVisualSwitcher scrollX={scrollX} />
        </Animated.View>

        {/* Step Indicator */}
        <View style={styles.ikigaiStepIndicator}>
          {questions.map((q, idx) => {
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
                  styles.ikigaiStepDot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: q.color,
                  }
                ]}
              />
            );
          })}
        </View>

        {/* Question Cards Carousel */}
        <Animated.View 
          style={[
            styles.ikigaiCarouselContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <FlatList
            ref={flatListRef}
            data={questions}
            renderItem={({ item, index }) => (
              <IkigaiQuestionCard 
                item={item} 
                index={index} 
                scrollX={scrollX}
                answer={answers[item.id]}
                onChangeAnswer={(text) => updateAnswer(item.id, text)}
                t={t}
                inputContainerRef={inputRefs.current[item.id]}
                onInputFocus={handleInputFocus(item.id)}
                onInputLayout={handleInputLayout(item.id)}
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
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />
        </Animated.View>

          </ScrollView>
          
          {/* Bottom Navigation - Outside ScrollView for absolute positioning */}
          <View style={styles.ikigaiBottomNav}>
        {currentIndex > 0 && (
          <TouchableOpacity 
            style={styles.ikigaiBackButtonNav} 
            onPressIn={() => {
              void hapticMedium();
            }}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={18} color="#342846" />
            <Text style={styles.ikigaiBackButtonText}>{t('onboarding.back')}</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[
            styles.ikigaiNextButton,
            { 
              backgroundColor: hasCurrentAnswer ? '#342846' : 'rgba(52, 40, 70, 0.4)',
              flex: 1,
            }
          ]} 
          onPressIn={() => {
            if (hasCurrentAnswer) {
              void hapticMedium();
            }
          }}
          onPress={handleNext}
          activeOpacity={0.8}
          disabled={!hasCurrentAnswer}
        >
          <View style={styles.ikigaiNextButtonContent}>
            <Text style={styles.ikigaiNextButtonText} numberOfLines={1} ellipsizeMode="tail">
              {isLastQuestion ? t('common.continue') : t('onboarding.nextQuestion')}
            </Text>
            {!isLastQuestion && (
              <MaterialIcons 
                name="arrow-forward" 
                size={20} 
                color="#FFFFFF" 
                style={styles.ikigaiNextButtonIcon}
              />
            )}
          </View>
        </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

export default IkigaiForm;
