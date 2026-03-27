import { Fonts } from './theme';

export const APP_NARROW_WIDTH = 430;

export const TypographyScale = {
  heading: { fontSize: 24, lineHeight: 28 },
  subheading: { fontSize: 16, lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 24 },
  button: { fontSize: 18, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 16 },
  headingNarrow: { fontSize: 17, lineHeight: 22 },
  subtitleNarrow: { fontSize: 12, lineHeight: 16 },
  bodyNarrow: { fontSize: 11, lineHeight: 17 },
} as const;

export const TypographyRoles = {
  heading: {
    fontFamily: Fonts.heading,
    fontWeight: '700' as const,
    fontSize: TypographyScale.heading.fontSize,
    lineHeight: TypographyScale.heading.lineHeight,
  },
  body: {
    fontFamily: Fonts.body,
    fontWeight: '400' as const,
    fontSize: TypographyScale.body.fontSize,
    lineHeight: TypographyScale.body.lineHeight,
  },
  button: {
    fontFamily: Fonts.buttonHeading,
    fontWeight: '400' as const,
    fontSize: TypographyScale.button.fontSize,
    lineHeight: TypographyScale.button.lineHeight,
  },
} as const;

export const ONBOARDING_QUESTION_HEADER = {
  fontSize: TypographyScale.heading.fontSize,
  lineHeight: TypographyScale.heading.lineHeight,
  narrowFontSize: TypographyScale.headingNarrow.fontSize,
  narrowLineHeight: TypographyScale.headingNarrow.lineHeight,
} as const;

export const ONBOARDING_QUESTION_OPTION = {
  minHeight: 50,
  paddingVertical: 12,
  narrowMinHeight: 42,
  narrowPaddingVertical: 8,
} as const;

export const ONBOARDING_QUESTION_OPTION_TEXT = {
  narrowFontSize: TypographyScale.bodyNarrow.fontSize,
  narrowLineHeight: TypographyScale.bodyNarrow.lineHeight,
} as const;

export const ONBOARDING_QUESTION_SUBTITLE = {
  narrowFontSize: TypographyScale.subtitleNarrow.fontSize,
  narrowLineHeight: TypographyScale.subtitleNarrow.lineHeight,
} as const;

export const ONBOARDING_QUESTION_OPTIONS_GAP = {
  narrow: 10,
} as const;

export function isNarrowWidth(width: number): boolean {
  return width <= APP_NARROW_WIDTH;
}
