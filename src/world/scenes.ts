import type { CharacterId } from '@/story/companions';

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
  choices?: { label: string; lines: string[]; outcome: Outcome }[];
};

/** The scene for winning the fight on `map`. `brannoc`: he's with you (in your party and met, see partyWithYou). */
export function winScene(map: MapId, flag: string, brannoc: boolean): Scene | null {
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
      // The Kaldorium (author, Oct 3, 2026): five guards, then the warden drops in. He takes 30 strikes at any level.
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
          'For a heartbeat the Colosseum is silent. Then the crowd roars, the real roar, the one nobody told them to make.',
          ...(brannoc ? ["BRANNOC: I… I didn't run. Did you see? I didn't run!"] : []),
          'GUARD: Strength is valued more than anything here. You\'re free to explore the prison.',
          'GUARD: We don\'t get paid enough for this.',
          'THE WARDEN: (grunts) We don\'t get paid at all.',
          "Barnaby chalks a new name on the champions' wall. The first one in three hundred years that isn't crossed out.",
        ],
        outcome: { flags: [flag] },
      };
    case 'war-doors':
      return {
        lines: [
          'The stitched giant sways, and kneels. The sword slips out of its grey hands.',
          ...(brannoc
            ? [
                'Brannoc kneels beside him and closes the empty eyes.',
                "BRANNOC: Rest now. You almost did it. We'll do the rest.",
              ]
            : ['You close the empty eyes. Whatever held him lets go.']),
          'The doors of the war hall stand open.',
        ],
        outcome: { flags: [flag] },
      };
    case 'war-hall':
      return {
        lines: [
          "A torch gutters. For one moment, Kaldor casts a shadow, huge and ordinary, like any man's.",
          'He goes down on one knee on his own dais, breathing hard.',
          "KALDOR: So. The Mad King's son. Five hundred years I held this. Strong enough to conquer the world, and you beat me.",
          'KALDOR: Well? The law is the law. The court is watching. Do I rule, and finish what your father started, properly this time? Or do you take my throne?',
        ],
        choices: [
          {
            label: 'Let him rule.',
            lines: [
              'You lower your weapon. The court murmurs.',
              "KALDOR: …Mercy. From a stranger. I didn't think I'd see that again.",
              'KALDOR: The cages stay open. The horde guards the border, not the streets. For now. For you.',
              "You receive the Warrior's Blessing. Kaldor keeps his throne, and his army. The march is only waiting.",
              'KALDOR: The south road is yours. Tell Grub I said so. He likes to hear it from me.',
            ],
            outcome: { flags: ['kaldor-beaten', 'kaldor-allowed', 'warrior-blessing'] },
          },
          {
            label: 'Take his throne.',
            lines: [
              brannoc
                ? 'By the old law, the warrior who beat the king takes the crown. Everyone turns to Brannoc.'
                : 'By the old law, the warrior who beat the king takes the crown. Your Warrior steps up.',
              ...(brannoc
                ? [
                    'BRANNOC: Me? I ran. I ran from all of it.',
                    'BRANNOC: …And I came back. That has to count for something.',
                    "Brannoc takes his father's throne. The horde scatters. In the burned barracks, a cocoon is found: Captain Ingrid, who covered for a prince five hundred years ago.",
                  ]
                : ['The horde scatters. In the burned barracks, a cocoon is found: Captain Ingrid.']),
              brannoc
                ? "Brannoc lays Aurek the Tall to rest, and puts his name back on the champions' wall. Later, somehow, he wakes, properly, as himself."
                : "You lay Aurek the Tall to rest, and put his name back on the champions' wall. Later, somehow, he wakes, properly, as himself.",
              'Widow Aldane brings the old portrait out from under her floor and hangs it in the war hall.',
              'Captain Ingrid, Aurek and Widow Aldane join your collection.',
              'Word runs down the south road ahead of you. For the first time in three years, Grub steps aside.',
            ],
            outcome: {
              flags: ['kaldor-beaten', 'kaldor-dethroned'],
              joins: ['ingrid', 'aurek', 'aldane'],
            },
          },
        ],
      };
    case 'kaldorium-maximus':
      return ladderScene(flag);
    default:
      return null;
  }
}

/** Out of the Maximus after a bout, to the Ring Ward: the next rung waits for your next visit. */
const RING_GATE = { map: 'ring-ward' as MapId, x: 15, y: 5, facing: 'down' as const };

/** Winning a rung of the Maximus's ladder. Drafts, for the author. */
function ladderScene(flag: string): Scene | null {
  const lines: Record<string, string[]> = {
    'maximus-1': [
      'Ugg goes down. Ogg, on the sideline, shouts "GET UP! No, stay down! No, get up!"',
      'LADY HOLLER: RUNG ONE, CLIMBED! Come back when you want rung two. Matron Sorrel is warming up her rattle.',
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
      'Grand Champion Hroth sits down in the sand, and laughs, and laughs.',
      'HROTH: Forty years. Forty YEARS. Thank you. Thank you. I can retire.',
      "Lady Holler chalks your name at the top of the ladder. The crowd roars, the real roar, the one nobody told them to make.",
      "HROTH: Find me at Tova's. I'll be the one smiling.",
    ],
  };
  return lines[flag] ? { lines: lines[flag], outcome: { flags: [flag], next: RING_GATE } } : null;
}

/** Said at the sealed portal once Season 1 is finished. */
/**
 * The last seal of Season 1: the portal, your real record, the king you left
 * (or crowned), and the first memory back. `memory` null: the record is skipped.
 */
export function seasonFinale(memory: HabitMemory | null, flags: string[]): string[] {
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
  const king = flags.includes('kaldor-allowed') ? FINALE.allowed : flags.includes('kaldor-dethroned') ? FINALE.dethroned : [];
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
 * The party splits at the end of Season 1 (author, Oct 2, 2026): at the last
 * seal, the four of the Original 8 who aren't starters say goodbye and go home,
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
