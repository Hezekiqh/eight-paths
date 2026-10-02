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

/** The scene for winning the fight on `map`. `brannoc`: he's in your party. */
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
      return {
        lines: [
          'The third fighter hits the sand. For a heartbeat the Kaldorium is silent.',
          'Then the crowd roars, the real roar, the one nobody told them to make.',
          ...(brannoc ? ["BRANNOC: I… I didn't run. Did you see? I didn't run!"] : []),
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
              "Brannoc lays Aurek the Tall to rest, and puts his name back on the champions' wall. Later, somehow, he wakes, properly, as himself.",
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
    default:
      return null;
  }
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
  to: { map: 'archive' as MapId, x: 15, y: 5, facing: 'up' as const },
};
