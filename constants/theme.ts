/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

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
    heading: 'DMSans_700Bold',
    headingNonEnglish: 'DMSans_700Bold',
    /** Anonymous Pro for body and subtitle text */
    body: 'AnonymousPro-Regular',
    subtitle: 'AnonymousPro-Regular',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    heading: 'DMSans_700Bold',
    headingNonEnglish: 'DMSans_700Bold',
    body: 'AnonymousPro-Regular',
    subtitle: 'AnonymousPro-Regular',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    heading: "'DM Sans', sans-serif",
    headingNonEnglish: "'DM Sans', sans-serif",
    body: "'Anonymous Pro', monospace",
    subtitle: "'Anonymous Pro', monospace",
  },
});

/**
 * Get the heading font family used across all screens.
 */
export const getHeadingFontFamily = (language?: string): string => {
  void language;
  return Fonts.heading;
};

/**
 * Get heading style with the global heading font.
 */
export const getHeadingStyle = (language?: string) => ({
  fontFamily: getHeadingFontFamily(language),
  fontSize: 24,
  lineHeight: 28,
  letterSpacing: 0,
  textTransform: 'none' as const,
  fontWeight: '700' as const,
});

/** 
 * Shared heading style for all screens
 * Uses the same font as Home screen headings
 * Usage: {...HeadingStyle} - works as before, with unified fontFamily
 */
const headingStyleBase = {
  fontSize: 24,
  lineHeight: 28,
  letterSpacing: 0,
  textTransform: 'none' as const,
  fontWeight: '700' as const,
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
