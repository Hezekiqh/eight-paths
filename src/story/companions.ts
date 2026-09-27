import { DIMENSIONS, levelFromXp, type Dimension } from '@/game';

/**
 * Where a character comes from. The core eight walk the story with the
 * player; recruits are woken along the way; stewards serve the Crown until
 * the player earns their company. Only core companions have story arcs.
 */
export type CharacterKind = 'core' | 'recruit' | 'steward';

type CharacterData = {
  /** What everyone calls them. */
  name: string;
  /** Their full name, when it differs from `name`. */
  fullName?: string;
  /** The Path they walk: their class, color and the habits that grow them. */
  dimension: Dimension;
  kind: CharacterKind;
  /** Path level that unlocks them. Core companions are there from the start. */
  unlockLevel: number;
  bio: string;
  /** A line in their own voice. */
  quote: string;
};

/** Path levels that unlock each Path's recruits and steward. */
export const UNLOCK_LEVELS = { recruit: 10, steward: 15, veteran: 20 } as const;

/**
 * Everyone a player can collect. Player-facing text only: no dreams, secrets
 * or reveals (see STORY.md §4 and §6). Stewards never show their Sin.
 */
const CHARACTERS = {
  // Physical
  brannoc: {
    name: 'Brannoc',
    fullName: 'Brannoc Hale',
    dimension: 'physical',
    kind: 'core',
    unlockLevel: 0,
    bio: 'A giant with a braided red beard, armor that no longer fits and a greatsword he calls Sweetheart. Loud, loyal and brave to a fault, he turns everything into a competition and would charge a castle before asking whose it was.',
    quote: 'Right! Who needs hitting?',
  },
  dessa: {
    name: 'Dessa',
    fullName: 'Dessa Quickstep',
    dimension: 'physical',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.recruit,
    bio: 'A courier who ran messages between towns until the roads went quiet. Wiry and sunburnt, she laces her boots twice and treats every hill as a personal challenge.',
    quote: 'Last one to the top carries the soup.',
  },
  plush: {
    name: 'Baron Plush',
    fullName: 'Baron Aldric Plush',
    dimension: 'physical',
    kind: 'steward',
    unlockLevel: UNLOCK_LEVELS.steward,
    bio: 'Enormous, in pajamas covered in medals and a nightcap worn like a crown, carried everywhere on a sofa by four sleepwalkers. Jolly and affectionate, he calls everyone "dear" and never raises his voice.',
    quote: "Oh, don't get up. Nobody's getting up. That's the lovely part.",
  },
  harrow: {
    name: 'Old Harrow',
    dimension: 'physical',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.veteran,
    bio: 'A retired blacksmith with forearms like hams and a bad knee he refuses to discuss. He stretches every morning, loudly, and expects the whole camp to join in.',
    quote: "Slow is fine. Stopping isn't.",
  },

  // Financial
  ysolde: {
    name: 'Ysolde',
    fullName: 'Ysolde Marrow',
    dimension: 'financial',
    kind: 'core',
    unlockLevel: 0,
    bio: 'A faded silk gown patched with sacking, a cracked monocle and a ledger chained to her belt. Sharp, dry and disciplined, she trusts numbers over people and keeps score in every friendship. Somehow the tab always comes out in your favor.',
    quote: 'Charming. Now, what does it cost?',
  },
  penny: {
    name: 'Penny',
    fullName: 'Penny Vell',
    dimension: 'financial',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.recruit,
    bio: 'A sharp-eyed market kid who can price a turnip from across the square. She keeps her savings in her left boot and has never once been cheated.',
    quote: "A copper saved is a copper you don't have to find.",
  },
  tithe: {
    name: 'Countess Tithe',
    fullName: 'Countess Constance Tithe',
    dimension: 'financial',
    kind: 'steward',
    unlockLevel: UNLOCK_LEVELS.steward,
    bio: 'Dripping in jewels, she carries a set of golden scales and owns the Counting House. Elegant and charming, she never raises her voice, and she has a price for everything.',
    quote: 'Nothing is free, darling. Least of all hope.',
  },
  aubrey: {
    name: 'Lord Aubrey',
    fullName: 'Lord Aubrey Finch',
    dimension: 'financial',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.veteran,
    bio: 'A nervous minor lord who inherited a crumbling estate and a very long list of debts. He is learning to budget from a book he could not really afford.',
    quote: "I've made a ledger. It's terrifying.",
  },

  // Intellectual
  quill: {
    name: 'Quill',
    fullName: 'Quilliana Fenwhistle',
    dimension: 'intellectual',
    kind: 'core',
    unlockLevel: 0,
    bio: 'Small, ink-stained to the elbows and peering through oversized spectacles, with a hat stuffed with bookmarks and a floating book that bites. Brilliant, fast-talking and endlessly curious, she footnotes her own sentences out loud.',
    quote: "Technically, and I say this with love, you're wrong.",
  },
  ottilie: {
    name: 'Ottilie',
    fullName: 'Ottilie Page',
    dimension: 'intellectual',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.recruit,
    bio: "A librarian's assistant who has read every book in one very small library, twice. Shy until you mention a book she hasn't read, and then she can't stop smiling.",
    quote: "I haven't read that one yet. Isn't that wonderful?",
  },
  thane: {
    name: 'Magister Thane',
    fullName: 'Magister Oriel Thane',
    dimension: 'intellectual',
    kind: 'steward',
    unlockLevel: UNLOCK_LEVELS.steward,
    bio: 'Tall, in robes made of paper, with a crown of quills. Polite, patient, genuinely brilliant and more than a little condescending, he speaks almost entirely in citations.',
    quote: "Please don't ask. I've already answered.",
  },
  bramble: {
    name: 'Professor Bramble',
    fullName: 'Professor Mungo Bramble',
    dimension: 'intellectual',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.veteran,
    bio: 'A rumpled botanist who argues with his own margin notes and usually loses. His pockets are full of seeds, pencils and half-finished theories.',
    quote: 'Fascinating. Wrong, but fascinating.',
  },

  // Spiritual
  wren: {
    name: 'Sister Wren',
    dimension: 'spiritual',
    kind: 'core',
    unlockLevel: 0,
    bio: "A plain grey habit, a small bell and a lantern that burns brighter when she's sure of something. Gentle, stubborn and quietly funny, she tends the wounded first and listens far more than she speaks.",
    quote: "I don't know. But I'll walk with you while we find out.",
  },
  hollis: {
    name: 'Hollis',
    dimension: 'spiritual',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.recruit,
    bio: 'A quiet boy who rang the town bell every dawn, even after nobody woke to hear it. He still keeps time by it, and hums the hours under his breath.',
    quote: 'Someone should ring it. Might as well be me.',
  },
  honeywell: {
    name: 'Lucian Honeywell',
    dimension: 'spiritual',
    kind: 'steward',
    unlockLevel: UNLOCK_LEVELS.steward,
    bio: 'The Ringmaster: a striped coat, a top hat and a candy-colored carnival that smells of spun sugar. Dazzling, flattering and restless, he is never quite satisfied.',
    quote: 'Why wait for meaning when you can have delight right now?',
  },
  sage: {
    name: 'Mother Sage',
    dimension: 'spiritual',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.veteran,
    bio: 'An old hermit who tends a garden of candles on a windy hill. She talks to the stars as if they owe her a letter, and they usually answer.',
    quote: 'Sit. The answer walks slower than you.',
  },

  // Emotional
  oren: {
    name: 'Oren',
    fullName: 'Oren Stillwater',
    dimension: 'emotional',
    kind: 'core',
    unlockLevel: 0,
    bio: 'Tall, barefoot and shaven-headed, with calm eyes and a string of prayer beads that is missing one. He speaks rarely, and when he does, it is usually deadpan.',
    quote: 'Breathe first. Then we decide who to punch.',
  },
  juniper: {
    name: 'Juniper',
    fullName: 'Juniper Wick',
    dimension: 'emotional',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.recruit,
    bio: 'A potter who throws clay when she is angry and keeps whatever survives the kiln. Her shelves are full of lopsided cups, and she loves every one.',
    quote: 'Cracked is still a cup.',
  },
  corwin: {
    name: 'Captain Corwin',
    dimension: 'emotional',
    kind: 'steward',
    unlockLevel: UNLOCK_LEVELS.steward,
    bio: 'Scarred, in a red cloak and battered armor. Righteous, bitter and disciplined, he is loyal to a grudge above all else. Something about his face seems familiar.',
    quote: "I'm not angry. I'm correct.",
  },
  lark: {
    name: 'Lark',
    dimension: 'emotional',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.veteran,
    bio: 'A stable hand who calms frightened horses by breathing slowly beside them. It works on people too, though they rarely notice it happening.',
    quote: 'In for four. Out for four. There. Better.',
  },

  // Social
  pip: {
    name: 'Pip',
    fullName: 'Pip Larkspur',
    dimension: 'social',
    kind: 'core',
    unlockLevel: 0,
    bio: "Freckles, a patchwork coat and a lute with too many strings. Charming, chatty and relentlessly optimistic, Pip remembers everyone's name and has never once been still.",
    quote: "Good news: I've made a friend! Bad news: it's a goose.",
  },
  marigold: {
    name: 'Marigold',
    fullName: 'Marigold Tumble',
    dimension: 'social',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.recruit,
    bio: 'A street juggler who drops things on purpose to make people laugh. She has never met a stranger, only friends who have not caught anything yet.',
    quote: 'Catch! No? Good. Now we are talking.',
  },
  marisol: {
    name: 'Marisol Vane',
    dimension: 'social',
    kind: 'steward',
    unlockLevel: UNLOCK_LEVELS.steward,
    bio: 'The Understudy: stage makeup, a sweeping curtain cloak and a mask that shifts to look like whoever she is talking to. Sweet on the surface, cutting underneath.',
    quote: 'Oh, your life is lovely. I will take it from here.',
  },
  barnaby: {
    name: 'Barnaby',
    fullName: 'Barnaby Crumb',
    dimension: 'social',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.veteran,
    bio: "A round, floury baker who knows everyone's usual order and everyone's birthday. His bakery door has never once been locked.",
    quote: 'Extra bun. You look like you need one.',
  },

  // Occupational. Its steward is not collectible (STORY.md §6).
  tamsin: {
    name: 'Tamsin',
    fullName: 'Tamsin Brasse',
    dimension: 'occupational',
    kind: 'core',
    unlockLevel: 0,
    bio: "Soot-streaked and goggled, with a clanking tool belt and a mechanical arm she built herself. Gruff, practical and happiest mid-repair, she fixes things when she's upset, which is often.",
    quote: 'Broken. Good. Something to do.',
  },
  rivet: {
    name: 'Wick',
    fullName: 'Wick Rivet',
    dimension: 'occupational',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.recruit,
    bio: 'A lamplighter who carries a ladder everywhere and fixes the lamps nobody else notices. He has lit the same street every night for nine years.',
    quote: "Small jobs. Every night. That's the trick.",
  },
  greta: {
    name: 'Greta',
    fullName: 'Greta Hammerfall',
    dimension: 'occupational',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.veteran,
    bio: 'A stonemason who has spent eleven years building one wall, and is very proud of it. It is an excellent wall.',
    quote: 'One stone. Then the next one.',
  },

  // Environmental
  moss: {
    name: 'Moss',
    dimension: 'environmental',
    kind: 'core',
    unlockLevel: 0,
    bio: 'Lanky, with leaves in his hair and a bark-colored cloak, Moss travels with a one-eared fox called Tuft. Quiet around people, chatty with animals, and never quite where you left him.',
    quote: "Tuft says you're alright. Tuft is usually wrong. We'll see.",
  },
  fern: {
    name: 'Fern',
    fullName: 'Fern Ashby',
    dimension: 'environmental',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.recruit,
    bio: 'A beekeeper with a hat full of holes and a very patient hive. She walks slowly, speaks softly and has not been stung in years.',
    quote: "They're not angry. They're busy. Big difference.",
  },
  brimsby: {
    name: 'Mother Brimsby',
    dimension: 'environmental',
    kind: 'steward',
    unlockLevel: UNLOCK_LEVELS.steward,
    bio: 'A vast, kindly innkeeper in a flour-dusted apron, whose feast table stretches for miles. Warm, grandmotherly and relentlessly hospitable, she will not take no for an answer.',
    quote: 'Eat, eat. There is always more. There will always be more.',
  },
  tully: {
    name: 'Old Tully',
    dimension: 'environmental',
    kind: 'recruit',
    unlockLevel: UNLOCK_LEVELS.veteran,
    bio: 'A ferryman who knows every bird on the river by its song, and fishes litter out of the water with a long-handled net.',
    quote: 'The river gives if you let it. Mostly it gives boots.',
  },
} satisfies Record<string, CharacterData>;

export type CharacterId = keyof typeof CHARACTERS;

export type Companion = CharacterData & {
  id: CharacterId;
  /** Collection number, from 1: grouped by Path, then by unlock level. */
  number: number;
};

/** Everyone, in collection order. */
export const ROSTER: Companion[] = (Object.entries(CHARACTERS) as [CharacterId, CharacterData][])
  .map(([id, data]) => ({ ...data, id }))
  .sort(
    (a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension) || a.unlockLevel - b.unlockLevel,
  )
  .map((c, i) => ({ ...c, number: i + 1 }));

export const COMPANIONS = Object.fromEntries(ROSTER.map((c) => [c.id, c])) as Record<CharacterId, Companion>;

/** The party a new player starts with: each Path's core companion. */
export const DEFAULT_PARTY = Object.fromEntries(
  ROSTER.filter((c) => c.kind === 'core').map((c) => [c.dimension, c.id]),
) as Record<Dimension, CharacterId>;

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CHARACTERS, value);
}

/** "#007" */
export const formatNumber = (n: number) => `#${String(n).padStart(3, '0')}`;

/** Shards (from objective drops) that unlock a character early. */
export const SHARDS_TO_UNLOCK = 3;

/**
 * Unlocked once their Path reaches `unlockLevel` (`pathXp` is all XP earned
 * on that Path), or early with enough shards.
 */
export function isUnlocked(companion: Companion, pathXp: number, shards = 0): boolean {
  return levelFromXp(pathXp).level >= companion.unlockLevel || shards >= SHARDS_TO_UNLOCK;
}
