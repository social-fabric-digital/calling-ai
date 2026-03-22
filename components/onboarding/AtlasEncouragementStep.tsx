import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { styles } from './styles';
import { HeadingStyle, BodyStyle } from '@/constants/theme';
import { persistOnboardingAnswer } from './persistOnboardingAnswer';

interface AtlasEncouragementStepProps {
  currentSituation?: string;
  onContinue: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const ATLAS_BLOCK_BOTTOM_OFFSET = 140;

const getDynamicEncouragement = (situation: string, isRussian: boolean): string => {
  if (isRussian) {
    switch (situation) {
      case 'student':
        return 'Ты в сильной стартовой точке. Я помогу превратить твой интерес в ясные и уверенные шаги.';
      case 'early_career':
        return 'Сейчас отличный момент заложить крепкий фундамент. Небольшие решения сегодня дадут большой результат завтра.';
      case 'mid_career':
        return 'У тебя уже есть опыт, на который можно опереться. Я помогу направить его в путь, который действительно откликается.';
      case 'between':
        return 'Период между этапами может быть непростым, но именно здесь рождаются лучшие повороты. Двигаемся дальше шаг за шагом.';
      case 'building':
        return 'Ты уже создаёшь своё будущее. Я помогу сохранить фокус и превратить твою идею в реальный прогресс.';
      case 'retired':
        return 'Этот этап может быть по-настоящему наполненным. Я помогу выстроить его вокруг того, что тебе действительно важно.';
      default:
        return 'Ты уже на правильном пути. Я помогу сделать следующие шаги более понятными и спокойными.';
    }
  }

  switch (situation) {
    case 'student':
      return "You're in a strong starting position. I'll help you turn your curiosity into clear, confident next steps.";
    case 'early_career':
      return "This is a powerful time to build momentum. Small decisions now can create big outcomes later.";
    case 'mid_career':
      return "You already have experience to build on. I'll help you channel it into a direction that truly fits you.";
    case 'between':
      return "Transitions can feel uncertain, but they also create new opportunities. We'll move forward one step at a time.";
    case 'building':
      return "You're already building your future. I'll help you stay focused and turn your vision into real progress.";
    case 'retired':
      return "This chapter can be deeply meaningful. I'll help you shape it around what matters most to you.";
    default:
      return "You're already on the right path. I'll help make your next steps clearer and easier to follow.";
  }
};

export default function AtlasEncouragementStep({ currentSituation, onContinue }: AtlasEncouragementStepProps) {
  const { t, i18n } = useTranslation();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');
  const isCompactScreen = viewportHeight < 760;
  const atlasImageSize = Math.min(358, Math.max(220, viewportWidth * (isCompactScreen ? 0.58 : 0.72)));
  const atlasImageTopMargin = isCompactScreen ? -18 : -12;
  const atlasImageBottomMargin = isCompactScreen ? 4 : 14;
  const thoughtBubbleWidth = Math.min(viewportWidth - 40, 420);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const confettiPieces = useRef(
    Array.from({ length: 14 }, () => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.6),
      rotation: new Animated.Value(0),
      startX: Math.random() * screenWidth,
    }))
  ).current;

  const burstConfetti = () => {
    confettiPieces.forEach((piece, index) => {
      if (Math.random() > 0.72) return;

      const startX = piece.startX || Math.random() * screenWidth;
      const driftX = (Math.random() - 0.5) * 180;
      const fallY = 180 + Math.random() * 150;
      const spin = (Math.random() - 0.5) * 540;
      const delay = index * 22;

      piece.translateX.setValue(startX - screenWidth / 2);
      piece.translateY.setValue(-120 - Math.random() * 40);
      piece.opacity.setValue(0);
      piece.scale.setValue(0.6);
      piece.rotation.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(piece.opacity, {
              toValue: 1,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(piece.opacity, {
              toValue: 0,
              duration: 760,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(piece.translateY, {
            toValue: fallY,
            duration: 940,
            useNativeDriver: true,
          }),
          Animated.timing(piece.translateX, {
            toValue: startX - screenWidth / 2 + driftX,
            duration: 940,
            useNativeDriver: true,
          }),
          Animated.timing(piece.rotation, {
            toValue: spin,
            duration: 940,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(piece.scale, {
              toValue: 1.1,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(piece.scale, {
              toValue: 0.7,
              duration: 720,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const firstBurst = setTimeout(() => burstConfetti(), 80);
    const secondBurst = setTimeout(() => burstConfetti(), 980);

    return () => {
      clearTimeout(firstBurst);
      clearTimeout(secondBurst);
    };
  }, [fadeAnim, scaleAnim]);

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('atlasEncouragementSeen', true);
    onContinue();
  };
  const headingSubtitle = isRussian
    ? 'Ты не один(одна) на этом пути. Я рядом, чтобы поддержать тебя на каждом шаге.'
    : "You're not doing this alone. I'm here to support you through each next step.";

  return (
    <Animated.View style={[localStyles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={localStyles.confettiLayer} pointerEvents="none">
        {confettiPieces.map((piece, index) => (
          <Animated.View
            key={`atlas-confetti-${index}`}
            style={[
              localStyles.confettiPiece,
              {
                opacity: piece.opacity,
                transform: [
                  { translateX: piece.translateX },
                  { translateY: piece.translateY },
                  { scale: piece.scale },
                  {
                    rotate: piece.rotation.interpolate({
                      inputRange: [-540, 540],
                      outputRange: ['-540deg', '540deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={localStyles.confettiText}>🎉</Text>
          </Animated.View>
        ))}
      </View>

      <Text style={localStyles.heading}>{t('onboarding.yazioFlow.atlasEncouragementTitle')}</Text>
      <Text style={localStyles.headingSubtitle}>{headingSubtitle}</Text>

      <View style={localStyles.atlasStage}>
        <View style={localStyles.atlasWrap}>
          <View style={localStyles.thoughtBubbleWrap}>
              <View style={[localStyles.introField, { width: thoughtBubbleWidth, alignSelf: 'center' }]}>
              <Text style={localStyles.subheading}>
                {getDynamicEncouragement(currentSituation || '', Boolean(isRussian))}
              </Text>
            </View>
            <View style={localStyles.tailBubbleStack}>
              <View style={[localStyles.tailBubble, localStyles.tailBubbleLarge]} />
              <View style={[localStyles.tailBubble, localStyles.tailBubbleMedium]} />
              <View style={[localStyles.tailBubble, localStyles.tailBubbleSmall]} />
            </View>
          </View>
          <Image
            source={require('../../assets/images/full.deer.png')}
            style={[
              localStyles.atlasImage,
              {
                width: atlasImageSize,
                height: atlasImageSize,
                marginTop: atlasImageTopMargin,
                marginBottom: atlasImageBottomMargin,
              },
            ]}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={localStyles.bottomButtonWrap} pointerEvents="box-none">
        <TouchableOpacity style={[styles.continueButton, localStyles.ctaButton]} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  confettiPiece: {
    position: 'absolute',
    top: 90,
    left: '50%',
    marginLeft: -10,
  },
  confettiText: {
    fontSize: 18,
  },
  heading: {
    ...HeadingStyle,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'none',
  },
  headingSubtitle: {
    ...BodyStyle,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.92,
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 14,
  },
  atlasStage: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: ATLAS_BLOCK_BOTTOM_OFFSET,
  },
  subheading: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 24,
  },
  thoughtBubbleWrap: {
    width: '100%',
    alignItems: 'center',
    alignSelf: 'center',
    zIndex: 2,
    marginTop: 15,
  },
  introField: {
    backgroundColor: 'rgba(255, 255, 255, 0.93)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.22)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tailBubbleStack: {
    width: 120,
    alignItems: 'center',
    marginTop: 4,
  },
  tailBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.93)',
    borderWidth: 1,
    borderColor: 'rgba(52, 40, 70, 0.16)',
    borderRadius: 999,
  },
  tailBubbleLarge: {
    width: 18,
    height: 18,
  },
  tailBubbleMedium: {
    width: 12,
    height: 12,
    marginTop: 4,
    marginLeft: 20,
  },
  tailBubbleSmall: {
    width: 8,
    height: 8,
    marginTop: 4,
    marginLeft: 34,
  },
  atlasWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
  },
  atlasImage: {
    width: 358,
    height: 358,
    marginTop: -12,
    marginBottom: 14,
  },
  bottomButtonWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingHorizontal: 40,
    paddingBottom: 40,
    zIndex: 1000,
  },
  ctaButton: {
    width: '100%',
  },
});
