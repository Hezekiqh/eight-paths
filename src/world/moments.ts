import type { CharacterId } from '@/story/companions';

import type { MapId } from './maps';

// Special character moments (author, Oct 4, 2026): at a few checkpoints a party member doesn't
// just chime in from the text box, they step out beside you, the way a helper does for a field
// move (step-aside.ts), and stand there for the scene. Kept for the big beats only, a hero's own
// arc meeting the story; everywhere else the party talks from the text box (banter.ts).

export type Moment = {
  /** Who steps out (unless they're the one you're walking as: then it's just you). */
  who: CharacterId;
  /** Said with them standing beside you. */
  lines: string[];
  /** Said instead when you're walking as them yourself. */
  asThem?: string[];
};

/** What starts the fight, after the intro (and after the moment, if there is one): by map. */
export const BOSS_CUE: Partial<Record<MapId, string[]>> = {
  'war-hall': [
    'KALDOR: Enough. You want single combat, by the old law? Then you shall have it.',
    '* He snaps his fingers. The shadows in the corners of the room peel off the walls, and stand up.',
    'KALDOR: These are me. Every one. The law never said how many of me there would be.',
    '* Behind them, something tall and stitched unfolds. A tag hangs from its neck: AUREK THE TALL. Almost.',
    '* Up by the throne, Felix settles in to watch.',
  ],
};

/** Before a boss fight, after its intro: by map. */
export const BOSS_MOMENTS: Partial<Record<MapId, Moment>> = {
  // Kaldor knows that beard. Brannoc never knew his father was mad (LORE.md), so he takes it badly.
  'war-hall': {
    who: 'brannoc',
    lines: [
      'Kaldor stops. He is looking past you.',
      'KALDOR: ...That beard.',
      "KALDOR: Well, well. The Mad King's son. They told me you died in your bed.",
      'BRANNOC: I did not die. I slept. For rather a long while.',
      'BRANNOC: And my father was not mad! ...He was loud. There is a difference.',
      'BRANNOC: (Stay close to me. Or I shall stay close to you. One of us should be close.)',
      "BRANNOC: Kaldor! You sit upon my father's throne. I have come to have a very firm word with you about it.",
      'KALDOR: A firm word. Your knees are knocking, boy.',
      'BRANNOC: That is a war drum. Of my people.',
      ...(BOSS_CUE['war-hall'] ?? []),
      'BRANNOC: That is NOT single combat!',
      'KALDOR: Take it up with the court.',
    ],
    asThem: [
      '* Kaldor stops. He leans forward on his throne.',
      'KALDOR: ...That beard.',
      "KALDOR: Well, well. The Mad King's son. They told me you died in your bed.",
      "* (Mad? Father was loud. That's not the same thing.)",
    ],
  },
};

/** The moment before `map`'s boss fight, and whether its hero steps out (no: you're walking as them). */
export function bossMoment(map: string, walking: CharacterId): { moment: Moment; stepsOut: boolean } | null {
  const moment = BOSS_MOMENTS[map as MapId];
  if (!moment) return null;
  return { moment, stepsOut: moment.who !== walking };
}
