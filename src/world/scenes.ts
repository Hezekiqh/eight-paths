import type { CharacterId } from '@/story/companions';

import { BRANNOC_REJOINED } from './castle';
import { FINALE } from './keeper-talk-lines';
import type { MapId } from './maps';
import { fill, type HabitMemory } from './memory';

// What happens when a fight is won: the scene that plays, the story flags it
// sets, who joins you, and (at the throne) the choice. Drafts, for the author.

export type Outcome = {
  flags: string[];
  /** Characters who join the collection. */
  joins?: CharacterId[];
  /** Where you go next; null to stay where you are. */
  next?: { map: MapId; x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' } | null;
};

export type Scene = {
  lines: string[];
  /** Done when the scene ends, unless it ends in a choice. */
  outcome?: Outcome;
  /** A decision at the end: each option has its own words and its own outcome. */
  choices?: { label: string; lines: string[]; outcome: Outcome; deed?: 'good' | 'bad' }[];
  /** A special moment (moments.ts): this party member steps out and stands beside you for it. */
  stepOut?: CharacterId;
};

/**
 * The scene for winning the fight on `map`. `brannoc`: he's with you (in your party and met, see
 * partyWithYou). `felix`: Felix was in the room (he's out of his cocoon and left the Courier Road).
 * `asBrannoc`: you're walking as Brannoc himself. `cellsEmpty`: you let the prisoners out, and Gary's gone too.
 */
export function winScene(
  map: MapId,
  flag: string,
  brannoc: boolean,
  felix = false,
  asBrannoc = false,
  cellsEmpty = false,
): Scene | null {
  switch (map) {
    case 'sleeping-keep':
      return {
        lines: [
          'The last bearer slumps to the floor, snoring happily. Baron Plush blinks, and sits down on the rug beside them.',
          "BARON PLUSH: Oh. Oh, you really don't want to rest, do you?",
          ...(brannoc
            ? [
                'Brannoc sits down heavily on the sofa. For a long moment, he says nothing.',
                "BRANNOC: Can I tell you something? I've been afraid my whole life. Every drill. Every fight. I thought if I slept long enough, it'd stop.",
                'BARON PLUSH: And did it?',
                'BRANNOC: No. It was just waiting for me when I woke up.',
              ]
            : []),
          'BARON PLUSH: …Comfort never cured anything, did it, dear. It just stopped anyone having to face it.',
          "BARON PLUSH: Go on, then. The hole behind my sofa goes up. I'll come with you. Someone ought to stop you lot overdoing it.",
          'Baron Plush joins your collection.',
        ],
        outcome: { flags: [flag], joins: ['plush'] },
      };
    case 'the-pit':
      // The Kaloseum (author, Oct 3, 2026): five guards, then the warden drops in. He takes 30 strikes at any level.
      if (flag === 'pit-guards')
        return {
          lines: [
            'The fifth guard hits the sand. The crowd goes quiet.',
            'Then the floor shakes. Then it shakes again. Something very big is walking up the tunnel.',
          ],
          // stay where you are: coming back in starts the warden's fight
          outcome: { flags: [flag] },
        };
      return {
        lines: [
          'The warden sways, and sits down in the sand with a thump that rattles the banners.',
          'For a heartbeat the Kaloseum is silent. Then the crowd roars, the real roar, the one nobody told them to make.',
          ...(brannoc ? ["BRANNOC: I… I didn't run. Did you see? I didn't run!"] : []),
          "GUARD: Strength is valued more than anything here. You're free to explore the prison.",
          "GUARD: We don't get paid enough for this.",
          "THE WARDEN: (grunts) We don't get paid at all.",
          "Barnaby chalks a new name on the champions' wall. The first one in three hundred years that isn't crossed out.",
        ],
        outcome: { flags: [flag] },
      };
    case 'war-hall': {
      // The castle's throne room (author, Oct 4, 2026): Kaldor and Felix watch you beat his shadows,
      // then the throne is yours to settle, three ways. Brannoc is always with you by now (the
      // castle road needs the whole party), and steps out beside you for it (moments.ts).
      const prince = asBrannoc ? 'you' : 'Brannoc';
      return {
        // Brannoc's father's throne: he steps out beside you for it
        stepOut: brannoc && !asBrannoc ? 'brannoc' : undefined,
        lines: [
          'The last shadow comes apart like smoke in a draught.',
          'Aurek the Tall sways, and kneels, and stays kneeling. The sword slips out of his grey hands.',
          ...(brannoc && !asBrannoc
            ? ['Brannoc closes the empty eyes.', 'BRANNOC: Rest now. You almost did it. We shall do the rest.']
            : ['You close the empty eyes. Whatever held him lets go.']),
          'Kaldor has not moved from his throne. He claps. Slowly.',
          brannoc
            ? `KALDOR: So. My brother's boy, and ${asBrannoc ? 'his little band of friends' : 'whoever this is'}. My best, and you went through them like a door.`
            : 'KALDOR: So. My best, and you went through them like a door.',
          "KALDOR: The law is the law, and the court is watching. Beat the king's champions, and the throne is yours to settle. So. Settle it.",
          // Felix, gone the moment the fight turned (author): only a note where he stood
          ...(felix
            ? [
                'Where Felix stood, there is only a chess piece, and a note pinned under it:',
                '"Wish I could have stayed, but I need to prepare the next surprise. F :b"',
              ]
            : []),
        ],
        choices: [
          ...(brannoc
            ? [
                {
                  label: asBrannoc ? "Take back your father's throne." : 'Brannoc takes the throne.',
                  deed: 'good' as const,
                  lines: [
                    asBrannoc
                      ? 'By the old law, the warrior who beat the king takes the crown. Everyone turns to you.'
                      : 'By the old law, the warrior who beat the king may name who takes the crown. You turn to Brannoc.',
                    'BRANNOC: Me? I ran. I ran from all of it.',
                    'BRANNOC: ...And I came back. That has to count for something.',
                    `Kaldor gets up off the throne. He looks at ${prince} for a long moment, and hands over the crown himself.`,
                    'KALDOR: It never did fit me.',
                    `${asBrannoc ? 'You take' : 'Brannoc takes'} his father's throne. The horde scatters.`,
                    "Aurek the Tall is laid to rest, and his name goes back on the champions' wall. Later, somehow, he wakes, properly, as himself.",
                    'Aurek joins your collection.',
                    'Word runs down the Tithe Road ahead of you. At the Broken Watch, for the first time in three years, Grub steps aside.',
                    // he stays to rule (author, Oct 4, 2026), and catches you up later, working remotely (castle.ts)
                    ...(asBrannoc
                      ? [
                          'You appoint a royal advisor on the spot. Two rules, and only two: do not go to war. Do not cause problems.',
                          "Then you pick up your sword and head for the door. You'll be working remotely.",
                        ]
                      : [
                          'BRANNOC: Go on without me, friend. A king must see to his kingdom.',
                          'BRANNOC: ...For a little while.',
                          "Brannoc stays behind, on his father's throne.",
                        ]),
                  ],
                  outcome: {
                    flags: [
                      'kaldor-beaten',
                      'kaldor-dethroned',
                      'brannoc-king',
                      // walking as him, there's nobody to catch you up: you're already gone
                      ...(asBrannoc ? [BRANNOC_REJOINED] : []),
                    ],
                    joins: ['aurek'] as CharacterId[],
                  },
                },
              ]
            : []),
          ...(asBrannoc
            ? []
            : [
                {
                  label: 'Take the throne yourself.',
                  lines: [
                    'By the old law, the warrior who beat the king takes the crown. You walk up the steps.',
                    'You sit. The throne is cold, and far too big, and a hundred tagged weapons dig into your back.',
                    ...(brannoc
                      ? [
                          'BRANNOC: It suits you. Truly.',
                          'BRANNOC: I shall be your captain. A captain may faint, now and then. I have checked.',
                        ]
                      : []),
                    'KALDOR: Hm. Five hundred years. I thought I would mind more.',
                    'The horde scatters. Aurek the Tall is laid to rest, and later, somehow, wakes as himself.',
                    'Aurek joins your collection.',
                    'Word runs down the Tithe Road ahead of you. At the Broken Watch, for the first time in three years, Grub steps aside.',
                  ],
                  outcome: {
                    flags: ['kaldor-beaten', 'kaldor-dethroned', 'you-king'],
                    joins: ['aurek'] as CharacterId[],
                  },
                },
              ]),
          {
            label: 'Let him keep it. On your terms.',
            deed: 'good' as const,
            lines: [
              'You lower your weapon. The court murmurs.',
              'KALDOR: ...Terms.',
              'You lay them out. The army stays home. The cages stay open. Nobody marches on the wizard kingdom, tomorrow or ever. And from now on, he answers to you.',
              'KALDOR: And if I refuse?',
              ...(brannoc && !asBrannoc
                ? ['BRANNOC: Then we do that again. And I did not even faint.']
                : ['You look at what is left of his shadows. He looks too.']),
              'KALDOR: ...Done.',
              "Kaldor keeps his crown. You keep the leash. You receive the Warrior's Blessing.",
              'KALDOR: The Tithe Road is yours. Tell Grub at the Broken Watch I said so. He likes to hear it from me.',
            ],
            outcome: { flags: ['kaldor-beaten', 'kaldor-allowed', 'your-terms', 'warrior-blessing'] },
          },
          {
            // the mean one (honor.ts): every menu has one
            label: 'Throw him in his own cells.',
            deed: 'bad' as const,
            lines: [
              'You point at Kaldor. Then at the floor. Then, for clarity, down.',
              'KALDOR: ...The cells? Under my own Kaloseum?',
              'Two of his own guards march him out. Neither of them is getting paid for it.',
              ...(brannoc && !asBrannoc ? ['BRANNOC: That was... very cold, friend. Effective. But cold.'] : []),
              'You sit. The throne is cold, and far too big, and it suits you a little too well.',
              'The horde scatters. Aurek the Tall is laid to rest, and later, somehow, wakes as himself.',
              'Aurek joins your collection.',
              'Far below, a cell door clangs.',
              // Gary left with the prisoners (dungeon.ts, CELLS_FREED): nobody's down there to see it
              ...(cellsEmpty
                ? ['For once, it is the only cell down there with anybody in it.']
                : ['GARY: ...I did not see that.']),
            ],
            outcome: {
              flags: ['kaldor-beaten', 'kaldor-dethroned', 'you-king', 'kaldor-jailed'],
              joins: ['aurek'] as CharacterId[],
            },
          },
        ],
      };
    }
    case 'kaldorium-maximus':
      return ladderScene(flag);
    default:
      return null;
  }
}

/** Out of the Training Yard after a spar, to the Ring Ward: the next rung waits for your next visit. */
const RING_GATE = { map: 'ring-ward' as MapId, x: 15, y: 5, facing: 'down' as const };

/** Winning a rung of the Training Yard's sparring board (author, Oct 7, 2026: a training yard, no announcer). */
function ladderScene(flag: string): Scene | null {
  const lines: Record<string, string[]> = {
    'maximus-1': [
      'Ugg goes down. Ogg, on the sideline, shouts "GET UP! No, stay down! No, get up!"',
      'YARDMASTER HOLLER: RUNG ONE! Come back when you want rung two. Matron Sorrel is warming up her rattle.',
    ],
    'maximus-2': [
      'Matron Sorrel lowers her rattle, and pats you on the head.',
      "MATRON SORREL: Good. Very good. Now go and have a sit down at Tova's. You've earned a biscuit.",
    ],
    'maximus-3': [
      'Fennick stops running. He looks down at himself. For the first time in nine years, he has been hit.',
      "FENNICK: Oh. Oh, that's what it's like. I'm going to go and sit down at Tova's for a long time.",
    ],
    'maximus-4': [
      'The Masked Brute pulls off the mask. Nobody gasps, because everybody knew.',
      "CAPTAIN VARGA: …Don't tell the king I do this on my day off.",
    ],
    'maximus-5': [
      'Hroth, master-at-arms, sits down in the sand, and laughs, and laughs.',
      'HROTH: Forty years. Forty YEARS. Thank you. Thank you. I can retire.',
      'Yardmaster Holler chalks your name at the top of the sparring board. The whole yard stops, and cheers, the real cheer, the one nobody ordered.',
      "HROTH: Find me at Tova's. I'll be the one smiling.",
    ],
  };
  return lines[flag] ? { lines: lines[flag], outcome: { flags: [flag], next: RING_GATE } } : null;
}

/** Said at the sealed portal once Season 1 is finished. */
/**
 * The last seal of Season 1: the portal, your real record, the king you left
 * (or crowned), and the first memory back. `memory` null: the record is skipped. `asBrannoc`: you're walking
 * as Brannoc, so the king who left his throne is you.
 */
export function seasonFinale(memory: HabitMemory | null, flags: string[], asBrannoc = false): string[] {
  const record = memory
    ? FINALE.record
        .map((line) =>
          fill(line, {
            habits: memory.habits,
            days: memory.days,
            best: memory.best,
            gap: memory.comeback?.gap,
            month: memory.comeback?.month,
          }),
        )
        .filter((l): l is string => l !== null)
    : [];
  const king = flags.includes('kaldor-allowed')
    ? FINALE.allowed
    : flags.includes('you-king')
      ? FINALE.crowned
      : flags.includes('kaldor-dethroned')
        ? asBrannoc
          ? FINALE.dethronedAsBrannoc
          : FINALE.dethroned
        : [];
  return [...FINALE.seal, ...record, ...king, ...FINALE.memory, ...FINALE.end];
}

/** Coming back to the seal once the season's done. */
export const SEASON_END = FINALE.end;

/** The seal can't open yet, but it can take you home: through it to the Keeper, who has the kettle on. */
export const PORTAL_HOME = {
  lines: [
    'The seal hums a second, lower note. In the stone, faint as breath on glass: candlelight, shelves, a kettle.',
    "It won't take you onward. Not yet. But it will take you home.",
  ],
  to: { map: 'archive' as MapId, x: 20, y: 5, facing: 'up' as const },
};

/**
 * The party splits at the start of Season 2 (author, Oct 4, 2026; it was the end of Season 1): the four of the Original 8 who aren't starters say goodbye and go home,
 * each to the kingdom of a later season. Only those you met. Draft lines, cut
 * down from WORLDS.md "the other four leave", for the author to edit.
 */
export const PARTING: { id: CharacterId; lines: string[] }[] = [
  {
    id: 'tamsin',
    lines: [
      'TAMSIN: I left a job unfinished. Back home, in the Guild City. A big one.',
      "TAMSIN: Don't ask what. Poor thing's been running too long without me.",
      'TAMSIN: Something breaks, ask Gert. Good hands. Nobody ever asks him anything.',
    ],
  },
  {
    id: 'oren',
    lines: [
      'OREN: Someone is telling the Still Valley to breathe. That was my line. They are using it wrong.',
      "OREN: There's an argument I've not had for five hundred years. I should go and have it.",
      'OREN: Drink some water.',
    ],
  },
  {
    id: 'pip',
    lines: [
      'PIP: Somebody in the Festival City is singing my song. Every night, they say.',
      'PIP: I wrote it for one night, for one room. I need to know who.',
      "PIP: Good news: I'm off to make some friends. Bad news: one will probably be a goose.",
    ],
  },
  {
    id: 'moss',
    lines: [
      'MOSS: That storm over the far green has no clouds.',
      "MOSS: I've seen one of those before. Once.",
      'When you look round, Moss is already gone.',
    ],
  },
];

/** Who leaves at the split: their story flag, so they stop walking the World and leave the Archive. */
export const leftFlag = (id: CharacterId) => `left:${id}`;

/** The goodbyes, for whoever of the four you met. Empty if none (then there's no scene). */
export function partySplit(flags: string[]): { lines: string[]; leaving: CharacterId[] } {
  const going = PARTING.filter((p) => flags.includes(`met:${p.id}`) && !flags.includes(leftFlag(p.id)));
  if (going.length === 0) return { lines: [], leaving: [] };
  return {
    lines: [
      'Behind you, the party has gone quiet. Not everyone is coming through.',
      ...going.flatMap((p) => p.lines),
      'The rest of you stand before the seal.',
    ],
    leaving: going.map((p) => p.id),
  };
}
