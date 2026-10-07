import type { CharacterId } from '@/story/companions';

// Walking banter (author, Oct 7, 2026): party banter (banter.ts) only plays after you talk to someone.
// This is the rest of it: the party talking among themselves as you arrive somewhere, or as you pass a
// spot, so their personalities come through between conversations. Each plays once (`banter:<id>`), and
// only when everyone in it is with you (partyWithYou) and nothing else is going on: no scene, no
// dialogue, no fight. An entry `with` a second member is the two of them; without, a solo.
// Lines are "NAME: text" so the dialogue box shows their face and voice. Drafts for the author.
// Spoiler rule (STORY.md): Brannoc can brush against his past, never name it; nothing about Felix.

export type WalkBanter = {
  /** Heard once: the flag is `banter:<id>`. */
  id: string;
  map: string;
  /** A spot to pass, as tiles [x1, y1, x2, y2] inclusive. Left out: anywhere here, as you arrive. */
  area?: [number, number, number, number];
  who: CharacterId;
  with?: CharacterId;
  /** Only once this story flag is set (a place you first see mid-scene, say, waits for the next visit). */
  after?: string;
  lines: string[];
};

/** Past Felix's maze and through the cells: what you come back to is just a road again. */
const FREED = 'jailed-with-brannoc';

export const WALK_BANTER: WalkBanter[] = [
  // ---- the Archive hall
  {
    id: 'archive-count',
    map: 'archive',
    who: 'quill',
    with: 'moss',
    lines: [
      "QUILL: Forty thousand scrolls in here. I've counted twice. The two counts disagree.",
      'MOSS: Forty thousand and one.',
      'QUILL: ...Which one did I miss?',
      "MOSS: Tuft's sitting on it.",
    ],
  },
  {
    id: 'archive-lantern',
    map: 'archive',
    who: 'pip',
    with: 'wren',
    lines: [
      "PIP: Wren, your lantern's lit every time I walk past. Even at three in the morning.",
      "WREN: It's only bright when I'm sure of something.",
      'PIP: What are you sure of at three in the morning?',
      "WREN: That you're up too.",
    ],
  },
  {
    id: 'archive-shelf',
    map: 'archive',
    who: 'tamsin',
    lines: ['TAMSIN: Third shelf from the door wobbled. I fixed it.', 'TAMSIN: Wobbles differently now. Progress.'],
  },

  // ---- the Courier Road and Felix's maze, walked again
  {
    id: 'courier-signpost',
    map: 'courier-road',
    area: [30, 6, 34, 8],
    who: 'ysolde',
    after: FREED,
    lines: [
      "YSOLDE: One arm says ONWARD. The other arm's gone.",
      'YSOLDE: Cheaper than mending it, I suppose. Somebody did the sums. Somebody always does.',
    ],
  },
  {
    id: 'courier-verse',
    map: 'courier-road',
    who: 'pip',
    with: 'brannoc',
    after: FREED,
    lines: [
      "PIP: The Courier Road! Where it all started. It's going in the first verse.",
      'BRANNOC: Am I in the first verse?',
      'PIP: You come in around verse nine.',
      'BRANNOC: ...Make it a strong entrance.',
    ],
  },
  {
    id: 'maze-boulders',
    map: 'felix-maze',
    who: 'tamsin',
    with: 'brannoc',
    after: FREED,
    lines: [
      'TAMSIN: Somebody dragged every one of these boulders here by hand. Good work. Terrible reason.',
      'BRANNOC: I could move them. Easily.',
      'BRANNOC: ...I simply choose not to. Out of respect for the work.',
    ],
  },
  {
    id: 'maze-footnote',
    map: 'felix-maze',
    who: 'quill',
    after: FREED,
    lines: [
      'QUILL: A maze made of boulders and a sign with the paint still wet.',
      "QUILL: Footnote: we fell for it. Footnote to the footnote: let's not tell anyone.",
    ],
  },

  // ---- Warrior City
  {
    id: 'wc-statue',
    map: 'warrior-city',
    area: [28, 23, 33, 26],
    who: 'brannoc',
    lines: [
      'BRANNOC: One boot on a broken crown. Subtle, as statues go.',
      'BRANNOC: ...I do not like how it looks at me. As though it knows something I do not.',
    ],
  },
  {
    id: 'wc-sparring',
    map: 'warrior-city',
    area: [43, 23, 54, 32],
    who: 'brannoc',
    with: 'oren',
    lines: [
      'BRANNOC: A training ground! Shall we spar, Oren? Gently. Very gently.',
      'OREN: No.',
      'BRANNOC: Oh, thank goodness. I mean: a pity.',
    ],
  },
  {
    id: 'wc-library',
    map: 'warrior-city',
    area: [15, 9, 19, 10],
    who: 'quill',
    lines: [
      'QUILL: QUIET, says the sign. And then PLEASE, in a different hand.',
      "QUILL: A library with two librarians, and one of them's losing.",
    ],
  },
  {
    id: 'wc-hospital',
    map: 'warrior-city',
    area: [56, 9, 60, 11],
    who: 'wren',
    lines: ['WREN: A hospital that smells of soap. That is a good sign.', 'WREN: The bad ones smell of hurry.'],
  },
  {
    id: 'wc-bread',
    map: 'warrior-city',
    who: 'ysolde',
    with: 'pip',
    lines: [
      'YSOLDE: Bread is three coppers here. Three. For bread.',
      "PIP: Maybe it's very strong bread.",
      'YSOLDE: It had better lift things.',
    ],
  },

  // ---- the Kaloseum, once you've stood on its sand and lived
  {
    id: 'kaloseum-singing',
    map: 'the-pit',
    who: 'pip',
    with: 'brannoc',
    after: 'pit-champion',
    lines: [
      'PIP: Listen to that crowd! I could get them singing. Thousands of them. In rounds.',
      "BRANNOC: Please do not. The last time this crowd sang, it was for somebody's head.",
    ],
  },
  {
    id: 'kaloseum-nuts',
    map: 'the-pit',
    who: 'ysolde',
    after: 'pit-champion',
    lines: [
      'YSOLDE: Roast nuts, a copper a bag. Thousands of seats. A fight every day.',
      'YSOLDE: I am in the wrong business.',
    ],
  },

  // ---- Kaldorhold and its Training Yard
  {
    id: 'kaldorhold-gate',
    map: 'kaldorhold',
    area: [0, 9, 4, 11],
    who: 'quill',
    with: 'ysolde',
    lines: [
      'QUILL: Every tenth block in this wall has a K carved in it. I counted the first hundred.',
      'YSOLDE: Ten Ks. Paid for by the block, I expect. Masons charge extra for vanity.',
      "QUILL: Footnote: she's right. She usually is. Don't tell her.",
      'YSOLDE: I can hear you.',
    ],
  },
  {
    id: 'kaldorhold-statues',
    map: 'kaldorhold',
    area: [14, 11, 25, 15],
    who: 'pip',
    lines: [
      "PIP: The second statue's gazing up at the first one. That's either very sad or very romantic.",
      "PIP: I'll write it both ways.",
    ],
  },
  {
    id: 'kaldorhold-walls',
    map: 'kaldorhold',
    who: 'moss',
    lines: ['MOSS: No moss on these walls.', 'MOSS: ...Give it time.'],
  },
  {
    id: 'yard-dummies',
    map: 'kaldorium-maximus',
    who: 'brannoc',
    with: 'tamsin',
    lines: [
      "BRANNOC: Every dummy wears the king's face. Every single one.",
      "TAMSIN: And every one's been mended. Somebody here loves hitting him, and somebody loves fixing him.",
      'BRANNOC: ...I should like to meet the first one.',
    ],
  },

  // ---- the Deserters' Camp
  {
    id: 'camp-stayed',
    map: 'deserters-camp',
    who: 'wren',
    with: 'oren',
    lines: [
      "WREN: Nobody here deserted. They're the children who couldn't lift a sword, and the families who wouldn't give them up.",
      "OREN: Then they didn't desert anyone.",
      'WREN: No. They stayed.',
    ],
  },
  {
    id: 'camp-roses',
    map: 'deserters-camp',
    area: [17, 9, 23, 11],
    who: 'brannoc',
    lines: [
      'BRANNOC: Somebody keeps these roses very well.',
      'BRANNOC: ...I find I want to thank them. I know not for what.',
    ],
  },
  {
    id: 'camp-fire',
    map: 'deserters-camp',
    area: [20, 7, 24, 8],
    who: 'pip',
    with: 'ysolde',
    lines: [
      'PIP: What are they roasting?',
      "YSOLDE: A turnip, once. Now it's mostly an investment in charcoal.",
      "PIP: I'd still try it.",
      'YSOLDE: Of course you would.',
    ],
  },

  // ---- the Old King's Crypt
  {
    id: 'crypt-cold',
    map: 'old-kings-crypt',
    who: 'brannoc',
    with: 'wren',
    lines: [
      'BRANNOC: It is very cold in here. I am not shivering. It is the cold that shivers.',
      'WREN: Would you like to wait outside?',
      'BRANNOC: ...No. Oddly, no. I feel I ought to stay. I feel I ought to kneel.',
    ],
  },
  {
    id: 'crypt-hand',
    map: 'old-kings-crypt',
    who: 'quill',
    lines: [
      "QUILL: An open hand, holding a sword by the blade. That's a peace offering, or a very bad grip.",
      "QUILL: Historians disagree. Footnote: I'm the historians, and I can't decide.",
    ],
  },

  // ---- the March Road and the Barracks Ward
  {
    id: 'march-song',
    map: 'march-road',
    who: 'pip',
    with: 'moss',
    lines: [
      'PIP: Moss! Sing with me. Marching song. Left, right, left—',
      'MOSS: No.',
      "PIP: Tuft's tapping his foot.",
      "MOSS: Tuft's scratching.",
    ],
  },
  {
    id: 'march-cairn',
    map: 'march-road',
    area: [12, 5, 16, 7],
    who: 'wren',
    lines: [
      "WREN: Soldiers stacked these for the ones who didn't come back.",
      'WREN: Somebody ought to stack one for the ones who did.',
    ],
  },
  {
    id: 'ward-than-what',
    map: 'barracks-ward',
    who: 'oren',
    lines: [
      'OREN: STRONGER TODAY. And under it, smaller: "than what?"',
      'OREN: ...I like whoever wrote the second part.',
    ],
  },

  // ---- the Berserker Kingdom and the roads south
  {
    id: 'kingdom-hinges',
    map: 'kingdom-town',
    who: 'quill',
    with: 'tamsin',
    lines: [
      "QUILL: Iron shutters on every window. Statistically, they're not keeping the cold out.",
      'TAMSIN: Good hinges, though. Somebody here knows hinges.',
      'QUILL: Was that... a compliment? From you?',
      "TAMSIN: It's about the hinges.",
    ],
  },
  {
    id: 'tithe-sums',
    map: 'tithe-road',
    who: 'ysolde',
    with: 'wren',
    lines: [
      "YSOLDE: One fighter or one iron, per house, per year. I've done the sums.",
      "YSOLDE: There isn't that much iron.",
      "WREN: Then they've been sending children.",
      "YSOLDE: ...Yes. That's what the sums say.",
    ],
  },
  {
    id: 'tithe-quiet',
    map: 'tithe-road',
    who: 'pip',
    lines: [
      "PIP: Nobody's singing on this road. Not even humming.",
      "PIP: ...I'll hold off. Some roads you just walk.",
    ],
  },
  {
    id: 'banners-never',
    map: 'field-of-banners',
    who: 'quill',
    with: 'brannoc',
    lines: [
      'QUILL: The last battle of the old world was meant to be fought here. It never was.',
      'BRANNOC: Good. ...Good. I find I am very glad of that.',
    ],
  },

  // ---- Millbrook
  {
    id: 'millbrook-twine',
    map: 'millbrook',
    who: 'pip',
    with: 'tamsin',
    lines: [
      'PIP: A whole village that only grows turnips! I love them already.',
      'TAMSIN: Fences are held up with twine.',
      'PIP: And hope! It said hope.',
      "TAMSIN: Hope's not load-bearing.",
    ],
  },

  // ---- Kaldor's castle
  {
    id: 'castle-stair',
    map: 'castle-grounds',
    who: 'brannoc',
    with: 'oren',
    lines: [
      'BRANNOC: I know this castle. I know where the kitchens are. I know which stair creaks.',
      'BRANNOC: ...How do I know which stair creaks?',
      "OREN: Doesn't matter now. Walk.",
    ],
  },
  {
    id: 'castle-ground',
    map: 'castle-grounds',
    who: 'moss',
    lines: ['MOSS: Nothing grows here.', "MOSS: Tuft won't put his feet down."],
  },
];

/** Heard: it won't play again. */
export const walkBanterFlag = (b: WalkBanter) => `banter:${b.id}`;

/** True if anything here could play, so the World needn't keep checking where you stand. */
export const hasWalkBanter = (mapId: string) => WALK_BANTER.some((b) => b.map === mapId);

const inside = (b: WalkBanter, x: number, y: number) =>
  !!b.area && x >= b.area[0] && x <= b.area[2] && y >= b.area[1] && y <= b.area[3];

/**
 * What the party says here, if anything: the first entry not yet heard whose speakers are all with you
 * (`party`, see partyWithYou) and whose `after` flag is set. A spot you're standing on (`x`, `y`, in
 * tiles) comes first; otherwise the place's arrival banter, unless `spotsOnly` (one arrival a visit).
 */
export function walkBanterFor(
  mapId: string,
  party: readonly CharacterId[],
  flags: readonly string[],
  x?: number,
  y?: number,
  spotsOnly = false,
): WalkBanter | null {
  const ready = WALK_BANTER.filter(
    (b) =>
      b.map === mapId &&
      !flags.includes(walkBanterFlag(b)) &&
      (!b.after || flags.includes(b.after)) &&
      party.includes(b.who) &&
      (!b.with || party.includes(b.with)),
  );
  const here = x === undefined || y === undefined ? undefined : ready.find((b) => inside(b, x, y));
  return here ?? (spotsOnly ? null : (ready.find((b) => !b.area) ?? null));
}
