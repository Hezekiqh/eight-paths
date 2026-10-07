import type { Dialogue } from '@/components/world/dialogue-box';

import type { NpcObject } from './maps';

// The Traveler (author, Oct 7, 2026): a running gag. He turns up in every place you go from Warrior City on,
// always cheerful, always a tourist, and he'll give you directions, but only if you're nice to him when he
// says hello. He stays where he is until Kaldor is beaten. Each of him on a map is an NPC whose id starts
// `traveler-`; what he says about the way on depends on where he's standing.

export const TRAVELER_PREFIX = 'traveler-';
/** You said hello nicely once: he skips straight to the directions after that, wherever you meet him. */
export const TRAVELER_FRIEND = 'traveler-friend';

export const isTraveler = (npc: NpcObject) => npc.id.startsWith(TRAVELER_PREFIX);

/** "Where should I go?", for wherever he's standing. */
export const TRAVELER_DIRECTIONS: Record<string, string[]> = {
  'warrior-city': [
    "Ooh, where to start! West, back through Felix's boulders, is the Courier Road: the Waystation, and Millbrook past it.",
    "South, the South Road: the Royal Garden, and the Old Mine. Somebody's waiting down there, I hear.",
    'Past the garden, a forest nobody goes into. I went into it. I came straight back out. Twice.',
    "North, the Cull Road, down to the deserters' camp and the old fort in the hill. The gate won't open till you're overall Lv 10.",
    'Tithe-takers on that road, mind. And the bridge at the bottom is in the river. Bring something heavy. Or be something heavy.',
    "Past the fort, the king's checkpoints, and past those, the Berserker Kingdom. That's where it all happens.",
    "East is the bridge to the Mage Kingdom. They're still building it. Don't hold your breath. I did. Very bad idea.",
  ],
  'deserters-camp': [
    "Into the fort in the hill! It's the old Buried Barracks. Ghosts, but polite ones. Mostly.",
    "Out the far side is the March Road, and the king's checkpoint. Pay them, or tell them a good story.",
    "Then the Berserker Kingdom itself. And back down the Cull Road, Warrior City, if you're homesick.",
  ],
  'kingdom-town': [
    'This is the Berserker Kingdom! North, up the castle road, is Kaldor himself, on the throne.',
    "To get in there you'll want the whole town on your side, the whole party with you, and overall Lv 15. Ask Gert, by the lamps.",
    "East gate: Kaldorhold, the king's bazaar city. South gate: the Tithe Road, to the Broken Watch and the Field of Banners.",
    'And here in town: the Candle Inn, the forge, the chapel and the hedge maze. The gate out goes back to the March Road.',
  ],
};

const NAME = 'The Traveler';

/** His questions, once you've been nice to him. */
function directions(map: string, again: boolean): Dialogue {
  return {
    speaker: NAME,
    sprite: 'traveler',
    lines: [
      again ? 'My friend! Back again. Looking for directions?' : 'Manners! How lovely. Are you looking for directions?',
    ],
    questions: [
      { ask: 'Where am I?', answer: ['Virth.'] },
      { ask: 'Who are you?', answer: ["I'm a traveler. A tourist. An enthusiast for life."] },
      { ask: 'Where should I go?', answer: TRAVELER_DIRECTIONS[map] ?? ["Anywhere you like! That's the fun of it."] },
    ],
    farewell: ["I'll see you around!"],
  };
}

/**
 * Talking to him: a hello first, nice or not. Be nice and he offers directions (and remembers it, `befriend`);
 * be rude and you'll find your own way. `say` opens the next window.
 */
export function travelerTalk(map: string, flags: string[], befriend: () => void, say: (d: Dialogue) => void): Dialogue {
  if (flags.includes(TRAVELER_FRIEND)) return directions(map, true);
  return {
    speaker: NAME,
    sprite: 'traveler',
    lines: ['Oh! Hello, hello! Lovely day for it. Whatever "it" is.'],
    choices: [
      {
        label: 'Hello! Lovely to meet you.',
        deed: 'good',
        then: () => {
          befriend();
          say(directions(map, false));
        },
      },
      {
        label: "Move. You're in my way.",
        deed: 'bad',
        then: () =>
          say({
            speaker: NAME,
            sprite: 'traveler',
            lines: [
              'Well! Somebody woke up on the wrong side of the cocoon.',
              "Off you go, then. You'll find your own way. Probably.",
            ],
          }),
      },
    ],
  };
}
