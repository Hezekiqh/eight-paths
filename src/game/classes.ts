import type { SFSymbol } from 'expo-symbols';

import type { Dimension } from './types';

export type ClassInfo = {
  dimension: Dimension;
  dimensionLabel: string;
  className: string;
  symbol: SFSymbol;
  color: string;
  starterHabits: [string, string, string, string];
};

export const CLASSES: Record<Dimension, ClassInfo> = {
  physical: {
    dimension: 'physical',
    dimensionLabel: 'Physical',
    className: 'Warrior',
    symbol: 'figure.strengthtraining.traditional',
    color: '#FF4D5E',
    starterHabits: ['Move 30 min', '7+ hrs sleep', 'Drink water', 'Take the stairs'],
  },
  financial: {
    dimension: 'financial',
    dimensionLabel: 'Financial',
    className: 'Noble',
    symbol: 'crown.fill',
    color: '#FFC940',
    starterHabits: ["Log today's spending", 'No impulse buys', 'Check accounts', 'Pack lunch'],
  },
  intellectual: {
    dimension: 'intellectual',
    dimensionLabel: 'Intellectual',
    className: 'Mage',
    symbol: 'book.fill',
    color: '#8B5CF6',
    starterHabits: ['Read 20 min', 'Language practice', 'Learn something new', 'Listen to a lecture'],
  },
  spiritual: {
    dimension: 'spiritual',
    dimensionLabel: 'Spiritual',
    className: 'Cleric',
    symbol: 'sparkles',
    color: '#F0E6C8',
    starterHabits: ['Prayer or worship', 'Read scripture', 'Reflect on values', 'Quiet time'],
  },
  emotional: {
    dimension: 'emotional',
    dimensionLabel: 'Emotional',
    className: 'Monk',
    symbol: 'leaf.fill',
    color: '#2DD4BF',
    starterHabits: [
      'Journal feelings',
      'Gratitude list',
      'Be kind to yourself',
      'Talk to someone you trust',
    ],
  },
  social: {
    dimension: 'social',
    dimensionLabel: 'Social',
    className: 'Bard',
    symbol: 'music.note',
    color: '#FF4FD8',
    starterHabits: ['Message a friend', 'Call family', 'Join a group activity', 'Volunteer'],
  },
  occupational: {
    dimension: 'occupational',
    dimensionLabel: 'Occupational',
    className: 'Artificer',
    symbol: 'hammer.fill',
    color: '#FF8A3D',
    starterHabits: [
      'Deep work block',
      'Learn a work skill',
      'Reach out to a contact',
      'Ship something',
    ],
  },
  environmental: {
    dimension: 'environmental',
    dimensionLabel: 'Environmental',
    className: 'Ranger',
    symbol: 'tree.fill',
    color: '#4ADE80',
    starterHabits: [
      'Time outdoors',
      'Walk or bike instead of drive',
      'Tidy your space',
      'Recycle',
    ],
  },
};
