/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';
import i18n from '@/utils/i18n';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
    /** Bricolage Grotesque for English, Montserrat for other languages */
    heading: 'BricolageGrotesque-Bold',
    headingNonEnglish: 'Montserrat-Bold',
    /** Anonymous Pro for body and subtitle text */
    body: 'AnonymousPro-Regular',
    subtitle: 'AnonymousPro-Regular',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    heading: 'BricolageGrotesque-Bold',
    headingNonEnglish: 'Montserrat-Bold',
    body: 'AnonymousPro-Regular',
    subtitle: 'AnonymousPro-Regular',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    heading: "'Bricolage Grotesque', sans-serif",
    headingNonEnglish: "'Montserrat', sans-serif",
    body: "'Anonymous Pro', monospace",
    subtitle: "'Anonymous Pro', monospace",
  },
});

/**
 * Get the heading font family based on the current language
 * Uses BricolageGrotesque for English, Montserrat for all other languages
 */
export const getHeadingFontFamily = (language?: string): string => {
  const currentLanguage = language || i18n.language || 'en';
  const isEnglish = currentLanguage === 'en' || currentLanguage.startsWith('en-');
  
  if (isEnglish) {
    return Fonts.heading;
  }
  
  return Fonts.headingNonEnglish;
};

/**
 * Get heading style with language-appropriate font
 * Uses BricolageGrotesque for English, Montserrat for all other languages
 */
export const getHeadingStyle = (language?: string) => ({
  fontFamily: getHeadingFontFamily(language),
  fontSize: 26,
  textTransform: 'uppercase' as const,
  fontWeight: 'bold' as const,
});

/** 
 * Shared heading style for all screens
 * Uses language-appropriate font (BricolageGrotesque for English, Montserrat for others)
 * The fontFamily is dynamically determined based on the current i18n language
 * Usage: {...HeadingStyle} - works as before, but fontFamily is now language-aware
 */
const headingStyleBase = {
  fontSize: 26,
  textTransform: 'uppercase' as const,
  fontWeight: 'bold' as const,
};

export const HeadingStyle = Object.defineProperty(headingStyleBase, 'fontFamily', {
  get: () => getHeadingFontFamily(),
  enumerable: true,
  configurable: true,
}) as typeof headingStyleBase & { fontFamily: string };

/** Shared subtitle style for all screens */
export const SubtitleStyle = {
  fontFamily: Fonts.subtitle,
  fontSize: 16,
  lineHeight: 24,
};

/** Shared body text style for all screens */
export const BodyStyle = {
  fontFamily: Fonts.body,
  fontSize: 16,
  lineHeight: 24,
};

/**
 * Button text style - for all button text across the app
 * Uses Anonymous Pro Regular (non-bold), normal case
 */
export const ButtonHeadingStyle = {
  fontFamily: 'AnonymousPro-Regular',
  fontSize: 18,
  textTransform: 'none' as const,
  fontWeight: 'normal' as const,
};
