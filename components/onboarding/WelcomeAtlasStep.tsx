import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, Keyboard, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './styles';
import { HeadingStyle, BodyStyle } from '@/constants/theme';
import {
  isOnboardingNarrowWidth,
  ONBOARDING_QUESTION_HEADER,
  ONBOARDING_QUESTION_OPTION_TEXT,
  ONBOARDING_QUESTION_SUBTITLE,
} from './responsiveTokens';
import { persistOnboardingAnswer } from './persistOnboardingAnswer';

interface WelcomeAtlasStepProps {
  name?: string;
  onContinue: () => void;
}
const ATLAS_BLOCK_BOTTOM_OFFSET = 140;

export default function WelcomeAtlasStep({ name, onContinue }: WelcomeAtlasStepProps) {
  const { t, i18n } = useTranslation();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isNarrowScreen = isOnboardingNarrowWidth(viewportWidth);
  const isCompactScreen = viewportHeight < 800;
  const atlasImageSize = Math.min(320, Math.max(180, viewportWidth * (isNarrowScreen ? 0.52 : 0.65)));
  const atlasImageTopMargin = isNarrowScreen ? -8 : -12;
  const atlasImageBottomMargin = isNarrowScreen ? 6 : 14;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [resolvedName, setResolvedName] = React.useState(name?.trim() || '');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // If user navigates here from a text input screen, ensure keyboard is closed.
    Keyboard.dismiss();
    const keyboardDismissTimer = setTimeout(() => {
      Keyboard.dismiss();
    }, 120);

    return () => clearTimeout(keyboardDismissTimer);
  }, [fadeAnim]);

  useEffect(() => {
    const propName = name?.trim() || '';
    if (propName) {
      setResolvedName(propName);
      return;
    }

    const loadStoredName = async () => {
      const storedName = (await AsyncStorage.getItem('userName'))?.trim() || '';
      if (storedName) setResolvedName(storedName);
    };

    void loadStoredName();
  }, [name]);

  const displayName = resolvedName;
  const headingPrefix = i18n.language?.toLowerCase().startsWith('ru')
    ? 'Рад знакомству,'
    : 'Nice to meet you,';
  const introText = i18n.language?.toLowerCase().startsWith('ru')
    ? 'Я Атлас, и я буду твоим проводником.'
    : "I'm Atlas, and I'll be your guide.";
  const headingSubtitle = i18n.language?.toLowerCase().startsWith('ru')
    ? 'Давай сделаем твой следующий шаг ясным и выполнимым.'
    : "Let's make your next step clear and doable.";

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('welcomeAtlasSeen', true);
    onContinue();
  };

  return (
    <Animated.View style={[localStyles.container, { opacity: fadeAnim, paddingTop: isNarrowScreen ? 16 : 30 }]}>
      <View style={localStyles.centerContent}>
        <Text style={[localStyles.heading, isNarrowScreen && localStyles.headingNarrow]}>
          {displayName ? `${headingPrefix}\n${displayName}!` : t('onboarding.yazioFlow.welcomeAtlasTitle')}
        </Text>
        <Text style={[localStyles.headingSubtitle, isNarrowScreen && localStyles.headingSubtitleNarrow]}>{headingSubtitle}</Text>
        <View style={[localStyles.atlasStage, isCompactScreen && { marginBottom: 110 }]}>
          <View style={localStyles.atlasWrap}>
            <View style={localStyles.thoughtBubbleWrap}>
              <View style={localStyles.introField}>
                <Text style={[localStyles.subheading, isNarrowScreen && localStyles.subheadingNarrow]}>{introText}</Text>
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
      </View>

      <View style={localStyles.bottomButtonWrap} pointerEvents="box-none">
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>{t('onboarding.yazioFlow.letsBegin')}</Text>
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
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  atlasStage: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: ATLAS_BLOCK_BOTTOM_OFFSET,
  },
  atlasWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
  },
  thoughtBubbleWrap: {
    width: '100%',
    alignItems: 'center',
    zIndex: 2,
    marginTop: 15,
  },
  atlasImage: {
    width: 358,
    height: 358,
    marginTop: -12,
    marginBottom: 14,
  },
  heading: {
    ...HeadingStyle,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'none',
    letterSpacing: 0,
    marginBottom: 6,
  },
  headingNarrow: {
    fontSize: ONBOARDING_QUESTION_HEADER.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_HEADER.narrowLineHeight,
    marginBottom: 4,
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
  headingSubtitleNarrow: {
    fontSize: ONBOARDING_QUESTION_SUBTITLE.narrowFontSize,
    lineHeight: ONBOARDING_QUESTION_SUBTITLE.narrowLineHeight,
    marginBottom: 4,
  },
  subheading: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 24,
  },
  subheadingNarrow: {
    fontSize: ONBOARDING_QUESTION_OPTION_TEXT.narrowFontSize + 2,
    lineHeight: ONBOARDING_QUESTION_OPTION_TEXT.narrowLineHeight + 1,
  },
  introField: {
    width: '92%',
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
});
