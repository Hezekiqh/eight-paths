import type { ViewStyle } from 'react-native';

/**
 * Retro RPG palette: a night-road indigo background, black-ink windows with
 * bone-white frames, and adventurer's gold for anything that matters.
 */
export const colors = {
  background: '#0B0914',
  card: '#13101F',
  cardRaised: '#1F1A31',
  /** Hairline dividers inside windows. */
  border: '#2E2745',
  /** The bone-white window frame. */
  frame: '#EDE3CF',
  /** Adventurer's gold: primary actions, radar grid, highlights. */
  grid: '#F2C14E',
  gold: '#F2C14E',
  text: '#F3ECDD',
  textMuted: '#A79FBC',
  /** Still passes contrast (5.2:1 on cards) so faint text stays readable. */
  textFaint: '#8A82A3',
  danger: '#FF5C6C',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Pixel corners: nearly square everywhere. */
export const radius = {
  sm: 0,
  md: 2,
  lg: 3,
  pill: 2,
} as const;

/**
 * Pixel faces for flavour, the system font for reading. Headings, titles and
 * numbers are Jersey 10, whose digits stay readable at every size (it runs
 * small, so its sizes are about 1.3× a system font's). Body text is SF Pro:
 * pixel fonts blur below their native size. DotGothic16 is kept for dialogue
 * boxes, only ever at 16 (its pixel grid) and never italic.
 */
export const fonts = {
  regular: 'System',
  medium: 'System',
  semibold: 'Jersey10_400Regular',
  bold: 'Jersey10_400Regular',
  dialogue: 'DotGothic16_400Regular',
} as const;

/** Frame thickness for windows and buttons. */
export const FRAME = 3;

/**
 * A retro dialogue window: dark fill, thick bone-white frame and a hard,
 * unblurred drop shadow.
 */
export const windowStyle = {
  backgroundColor: colors.card,
  borderWidth: FRAME,
  borderColor: colors.frame,
  borderRadius: radius.lg,
  shadowColor: '#000000',
  shadowOpacity: 1,
  shadowRadius: 0,
  shadowOffset: { width: 4, height: 4 },
} satisfies ViewStyle;
