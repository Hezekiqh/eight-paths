import type { SFSymbol } from 'expo-symbols';

import type { Dimension } from './types';

export type ClassInfo = {
  dimension: Dimension;
  dimensionLabel: string;
  className: string;
  symbol: SFSymbol;
  color: string;
  /** A short fantasy title, e.g. "Sword of the Realm". */
  epithet: string;
  /** Two or three sentences of flavour text for the class sheet. */
  lore: string;
  /** How this class grows, in plain words: which kinds of habits feed it. */
  growth: string;
  starterHabits: [string, string, string, string];
};

export const CLASSES: Record<Dimension, ClassInfo> = {
  physical: {
    dimension: 'physical',
    dimensionLabel: 'Physical',
    className: 'Warrior',
    symbol: 'figure.strengthtraining.traditional',
    color: '#FF4D5E',
    epithet: 'Sword of the Realm',
    lore: 'Forged in the dust of training yards, the Warrior trusts steel, stamina and a body kept ready for the road. Where others falter on the march, the Warrior is still standing, still swinging, still smiling.',
    growth: 'Your Warrior grows through Physical habits: moving your body, sleeping well, drinking water and choosing the harder stair.',
    starterHabits: ['Move 30 min', '7+ hrs sleep', 'Drink water', 'Take the stairs'],
  },
  financial: {
    dimension: 'financial',
    dimensionLabel: 'Financial',
    className: 'Noble',
    symbol: 'crown.fill',
    color: '#FFC940',
    epithet: 'Keeper of the Coffers',
    lore: 'Heir to no throne but their own, the Noble knows that kingdoms rise one ledger line at a time. A purse guarded today buys freedom tomorrow, and a Noble never pays a merchant’s first price.',
    growth: 'Your Noble grows through Financial habits: tracking your spending, resisting impulse buys, checking your accounts and planning ahead.',
    starterHabits: ["Log today's spending", 'No impulse buys', 'Check accounts', 'Pack lunch'],
  },
  intellectual: {
    dimension: 'intellectual',
    dimensionLabel: 'Intellectual',
    className: 'Mage',
    symbol: 'book.fill',
    color: '#8B5CF6',
    epithet: 'Scholar of the Arcane',
    lore: 'The Mage bends the world by understanding it. Dusty tomes, foreign tongues and long lectures are their spell components, and curiosity is the mana that never runs dry.',
    growth: 'Your Mage grows through Intellectual habits: reading, practising a language, learning something new and studying the lore of others.',
    starterHabits: ['Read 20 min', 'Language practice', 'Learn something new', 'Listen to a lecture'],
  },
  spiritual: {
    dimension: 'spiritual',
    dimensionLabel: 'Spiritual',
    className: 'Cleric',
    symbol: 'sparkles',
    color: '#F0E6C8',
    epithet: 'Bearer of the Flame',
    lore: 'The Cleric walks with something greater than themselves. Through prayer, scripture and quiet vigil they tend the flame of meaning that lights the whole party’s way through the dark.',
    growth: 'Your Cleric grows through Spiritual habits: prayer or worship, sacred reading, reflecting on your values and keeping quiet time.',
    starterHabits: ['Prayer or worship', 'Read scripture', 'Reflect on values', 'Quiet time'],
  },
  emotional: {
    dimension: 'emotional',
    dimensionLabel: 'Emotional',
    className: 'Monk',
    symbol: 'leaf.fill',
    color: '#2DD4BF',
    epithet: 'Master of the Still Mind',
    lore: 'The Monk fights their fiercest battles within. They meet storms of feeling with steady breath, and turn gratitude, honesty and kindness toward themselves into a calm no blade can break.',
    growth: 'Your Monk grows through Emotional habits: journaling your feelings, keeping a gratitude list, being kind to yourself and talking to someone you trust.',
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
    epithet: 'Voice of the Tavern',
    lore: 'No hall stays silent when the Bard walks in. Their magic is the bond between people: a message sent, a call returned, a hand offered to the village when it’s needed most.',
    growth: 'Your Bard grows through Social habits: reaching out to friends, calling family, joining a group and giving your time to others.',
    starterHabits: ['Message a friend', 'Call family', 'Join a group activity', 'Volunteer'],
  },
  occupational: {
    dimension: 'occupational',
    dimensionLabel: 'Occupational',
    className: 'Artificer',
    symbol: 'hammer.fill',
    color: '#FF8A3D',
    epithet: 'Forgemaster of Works',
    lore: 'Tinkerer, builder, finisher of things. The Artificer turns focus into craft, hones their trade by lamplight and ships creations the realm can actually use.',
    growth: 'Your Artificer grows through Occupational habits: deep work, learning skills for your trade, building your network and shipping what you make.',
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
    epithet: 'Warden of the Wilds',
    lore: 'Most at home beneath an open sky, the Ranger keeps faith with the land. They walk where others ride, keep a tidy camp, and leave every trail cleaner than they found it.',
    growth: 'Your Ranger grows through Environmental habits: time outdoors, walking or biking instead of driving, tidying your space and recycling.',
    starterHabits: [
      'Time outdoors',
      'Walk or bike instead of drive',
      'Tidy your space',
      'Recycle',
    ],
  },
};
