import type { Dimension } from '@/game';

/**
 * Every character a player can have in their party. Today that's the core
 * eight; characters collected later are added here with their own Path.
 */
export type CharacterId = 'brannoc' | 'ysolde' | 'quill' | 'wren' | 'oren' | 'pip' | 'tamsin' | 'moss';

/** What players can read about a character. No spoilers: see STORY.md §4. */
export type Companion = {
  id: CharacterId;
  /** What everyone calls them. */
  name: string;
  /** Their full name, when it differs from `name`. */
  fullName?: string;
  /** The Path they walk: their class, color and the habits that grow them. */
  dimension: Dimension;
  bio: string;
  /** A line in their own voice. */
  quote: string;
};

export const COMPANIONS: Record<CharacterId, Companion> = {
  brannoc: {
    id: 'brannoc',
    name: 'Brannoc',
    fullName: 'Brannoc Hale',
    dimension: 'physical',
    bio: 'A giant with a braided red beard, armor that no longer fits and a greatsword he calls Sweetheart. Loud, loyal and brave to a fault, he turns everything into a competition and would charge a castle before asking whose it was.',
    quote: 'Right! Who needs hitting?',
  },
  ysolde: {
    id: 'ysolde',
    name: 'Ysolde',
    fullName: 'Ysolde Marrow',
    dimension: 'financial',
    bio: 'A faded silk gown patched with sacking, a cracked monocle and a ledger chained to her belt. Sharp, dry and disciplined, she trusts numbers over people and keeps score in every friendship. Somehow the tab always comes out in your favor.',
    quote: 'Charming. Now, what does it cost?',
  },
  quill: {
    id: 'quill',
    name: 'Quill',
    fullName: 'Quilliana Fenwhistle',
    dimension: 'intellectual',
    bio: 'Small, ink-stained to the elbows and peering through oversized spectacles, with a hat stuffed with bookmarks and a floating book that bites. Brilliant, fast-talking and endlessly curious, she footnotes her own sentences out loud.',
    quote: "Technically, and I say this with love, you're wrong.",
  },
  wren: {
    id: 'wren',
    name: 'Sister Wren',
    dimension: 'spiritual',
    bio: "A plain grey habit, a small bell and a lantern that burns brighter when she's sure of something. Gentle, stubborn and quietly funny, she tends the wounded first and listens far more than she speaks.",
    quote: "I don't know. But I'll walk with you while we find out.",
  },
  oren: {
    id: 'oren',
    name: 'Oren',
    fullName: 'Oren Stillwater',
    dimension: 'emotional',
    bio: 'Tall, barefoot and shaven-headed, with calm eyes and a string of prayer beads that is missing one. He speaks rarely, and when he does, it is usually deadpan.',
    quote: 'Breathe first. Then we decide who to punch.',
  },
  pip: {
    id: 'pip',
    name: 'Pip',
    fullName: 'Pip Larkspur',
    dimension: 'social',
    bio: "Freckles, a patchwork coat and a lute with too many strings. Charming, chatty and relentlessly optimistic, Pip remembers everyone's name and has never once been still.",
    quote: "Good news: I've made a friend! Bad news: it's a goose.",
  },
  tamsin: {
    id: 'tamsin',
    name: 'Tamsin',
    fullName: 'Tamsin Brasse',
    dimension: 'occupational',
    bio: "Soot-streaked and goggled, with a clanking tool belt and a mechanical arm she built herself. Gruff, practical and happiest mid-repair, she fixes things when she's upset, which is often.",
    quote: 'Broken. Good. Something to do.',
  },
  moss: {
    id: 'moss',
    name: 'Moss',
    dimension: 'environmental',
    bio: 'Lanky, with leaves in his hair and a bark-colored cloak, Moss travels with a one-eared fox called Tuft. Quiet around people, chatty with animals, and never quite where you left him.',
    quote: "Tuft says you're alright. Tuft is usually wrong. We'll see.",
  },
};

/**
 * Who stands on each Path until players can choose their own party. When
 * party selection arrives, the chosen party replaces this.
 */
export const DEFAULT_PARTY: Record<Dimension, CharacterId> = {
  physical: 'brannoc',
  financial: 'ysolde',
  intellectual: 'quill',
  spiritual: 'wren',
  emotional: 'oren',
  social: 'pip',
  occupational: 'tamsin',
  environmental: 'moss',
};

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && value in COMPANIONS;
}
