import type { Dimension } from '@/game/types';

export type Palette = {
  background: string;
  card: string;
  cardRaised: string;
  /** Hairline dividers inside windows, and locked silhouettes. */
  border: string;
  /** The window frame. */
  frame: string;
  /** Primary actions, the tab cursor, highlights. */
  accent: string;
  text: string;
  textMuted: string;
  textFaint: string;
  danger: string;
  /** The hard drop shadow under windows and buttons. */
  shadow: string;
};

export type Theme = {
  name: string;
  description: string;
  /** Dark backgrounds: light status bar and dark system pickers. */
  dark: boolean;
  colors: Palette;
  /** Each class's colour, tuned to read on this theme's windows. */
  classColors: Record<Dimension, string>;
};

/** Class colours for dark themes: bright, like neon on a night road. */
const NEON: Record<Dimension, string> = {
  physical: '#FF4D5E',
  financial: '#FFC940',
  intellectual: '#9B74F8',
  spiritual: '#F0E6C8',
  emotional: '#2DD4BF',
  social: '#FF4FD8',
  occupational: '#FF8A3D',
  environmental: '#4ADE80',
};

/** Class colours for light themes: dark ink versions of the same hues. */
const INK: Record<Dimension, string> = {
  physical: '#B3261E',
  financial: '#8A5A00',
  intellectual: '#5B3FB5',
  spiritual: '#2F6F8F',
  emotional: '#0F766E',
  social: '#A21C70',
  occupational: '#B4490A',
  environmental: '#276B2B',
};

/**
 * Every theme a player can pick. Names are our own: styles can be inspired by
 * other games, names and logos can't. Each text colour passes 4.5:1 on cards.
 */
export const THEMES = {
  scroll: {
    name: 'Scroll',
    description: 'Aged parchment and dark ink, sealed in red wax.',
    dark: false,
    colors: {
      background: '#F0D9A7',
      card: '#F8EACB',
      cardRaised: '#E6CB8E',
      border: '#C9A96E',
      frame: '#4A3423',
      accent: '#9A3412',
      text: '#2E1F14',
      textMuted: '#6B4F33',
      textFaint: '#80654A',
      danger: '#B42318',
      shadow: '#C4A064',
    },
    classColors: INK,
  },
  dark: {
    name: 'Night Road',
    description: 'Indigo night, bone-white frames and adventurer’s gold.',
    dark: true,
    colors: {
      background: '#0B0914',
      card: '#13101F',
      cardRaised: '#1F1A31',
      border: '#2E2745',
      frame: '#EDE3CF',
      accent: '#F2C14E',
      text: '#F3ECDD',
      textMuted: '#A79FBC',
      textFaint: '#8A82A3',
      danger: '#FF5C6C',
      shadow: '#000000',
    },
    classColors: NEON,
  },
  white: {
    name: 'Paper White',
    description: 'Clean white pages with crisp black frames.',
    dark: false,
    colors: {
      background: '#F4F3EF',
      card: '#FFFFFF',
      cardRaised: '#ECEAE4',
      border: '#D6D2C8',
      frame: '#23202B',
      accent: '#4338CA',
      text: '#1C1A22',
      textMuted: '#57536A',
      textFaint: '#6E6A80',
      danger: '#C2261D',
      shadow: '#CFCBC0',
    },
    classColors: INK,
  },
  hunter: {
    name: 'Hunter',
    description: 'Glowing blue status windows floating in the dark.',
    dark: true,
    colors: {
      background: '#04070E',
      card: '#08111F',
      cardRaised: '#0F1D35',
      border: '#18325A',
      frame: '#5EC8FF',
      accent: '#38A8FF',
      text: '#E4F2FF',
      textMuted: '#93AECB',
      textFaint: '#7892B2',
      danger: '#FF4D6A',
      shadow: '#0B2A4A',
    },
    classColors: NEON,
  },
  soul: {
    name: 'Soul',
    description: 'Stark white boxes on pure black, like an 8-bit RPG.',
    dark: true,
    colors: {
      background: '#000000',
      card: '#000000',
      cardRaised: '#161616',
      border: '#3A3A3A',
      frame: '#FFFFFF',
      accent: '#FFD800',
      text: '#FFFFFF',
      textMuted: '#B5B5B5',
      textFaint: '#8C8C8C',
      danger: '#FF2A2A',
      shadow: '#000000',
    },
    classColors: NEON,
  },
} satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;

export const DEFAULT_THEME: ThemeId = 'scroll';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(THEMES, value);
}
