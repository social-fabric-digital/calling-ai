import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Image, Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './styles';
import { HeadingStyle, BodyStyle } from '@/constants/theme';
import { persistOnboardingAnswer } from './persistOnboardingAnswer';

interface WelcomeAtlasStepProps {
  name?: string;
  onContinue: () => void;
}

export default function WelcomeAtlasStep({ name, onContinue }: WelcomeAtlasStepProps) {
  const { t, i18n } = useTranslation();
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

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await persistOnboardingAnswer('welcomeAtlasSeen', true);
    onContinue();
  };

  return (
    <Animated.View style={[localStyles.container, { opacity: fadeAnim }]}>
      <View style={localStyles.centerContent}>
        <Text style={localStyles.heading}>
          {displayName ? `${headingPrefix}\n${displayName}!` : t('onboarding.yazioFlow.welcomeAtlasTitle')}
        </Text>
        <View style={localStyles.atlasWrap}>
          <View style={localStyles.thoughtBubbleWrap}>
            <View style={localStyles.introField}>
              <Text style={localStyles.subheading}>{introText}</Text>
            </View>
            <View style={localStyles.tailBubbleStack}>
              <View style={[localStyles.tailBubble, localStyles.tailBubbleLarge]} />
              <View style={[localStyles.tailBubble, localStyles.tailBubbleMedium]} />
              <View style={[localStyles.tailBubble, localStyles.tailBubbleSmall]} />
            </View>
          </View>
          <Image
            source={require('../../assets/images/full.deer.png')}
            style={localStyles.atlasImage}
            resizeMode="contain"
          />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  atlasWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: -16,
  },
  thoughtBubbleWrap: {
    width: '100%',
    alignItems: 'center',
    zIndex: 2,
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
    marginBottom: 0,
    transform: [{ translateY: -100 }],
  },
  subheading: {
    ...BodyStyle,
    color: '#342846',
    textAlign: 'center',
    lineHeight: 24,
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
