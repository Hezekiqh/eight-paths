import type { Dimension } from '@/game';
import type { CharacterId, Companion } from '@/story/companions';

import type { Question } from './maps';

// What the player can ask a character after their first lines, in-app text.
// Spoiler rule (LORE.md): answers stay at the level of the public bios and the
// Year 500 world; nothing here reveals who anyone was before the sleep.

/** Asked of everyone. */
export const ABOUT_ASK = 'Tell me about yourself.';
export const GOSSIP_ASK = 'Heard any gossip?';

/** The question for each class, and an answer any of its members could give. */
export const PATH_TALK: Record<Dimension, { ask: string; answer: string[] }> = {
  physical: {
    ask: 'How do I get stronger?',
    answer: ['Show up. Every day you train, you keep. Every day you skip, you lend to tomorrow.'],
  },
  financial: {
    ask: "What's the secret to wealth?",
    answer: ['Know where every coin goes. Wealth is mostly paying attention.'],
  },
  intellectual: {
    ask: 'What are you studying?',
    answer: ['Everything I can get my hands on. A page a day is a library a decade.'],
  },
  spiritual: {
    ask: 'What do you believe in?',
    answer: ["That quiet is worth making time for, even when it doesn't answer."],
  },
  emotional: {
    ask: 'How do you stay so calm?',
    answer: ["I don't. I feel it, I let it pass, then I choose. That's all calm is."],
  },
  social: {
    ask: 'How do you make friends?',
    answer: ['Say hello first. Remember their name. Most people are waiting for someone else to start.'],
  },
  occupational: {
    ask: 'What are you working on?',
    answer: ['Something that works a little better than it did yesterday. That is the whole craft.'],
  },
  environmental: {
    ask: "What's it like out in the wild?",
    answer: ['Slow. Things grow at their own pace out there, and they never skip a season.'],
  },
};

/**
 * Gossip about each kingdom as it is now, in Year 500. A character repeats one
 * of their kingdom's rumours, chosen by their number.
 */
export const KINGDOM_GOSSIP: Record<Dimension, string[][]> = {
  physical: [
    ['Nobody in the garrison has swung a real sword in three hundred years. The arena is a vegetable market now.'],
    ['They say the royal hedge maze has never been fully mapped. People go in for a picnic and come out for supper.'],
    ['The old smithy still has a fire going. Nobody remembers who keeps lighting it.'],
  ],
  financial: [
    ['Everyone in the Merchant City has enough, and nobody seems to want more. Strange place for a market.'],
    ['The bridge toll is still one copper. It has been one copper for as long as anyone has counted.'],
    [
      'There is a vault under the old counting houses that floods every spring. Nobody has ever gone down to see what is in it.',
    ],
  ],
  intellectual: [
    ['The Academy towers have been "closed for repairs" for five hundred years. That is a long repair.'],
    ['Students there are taught to ask good questions. Nobody says which ones are bad.'],
    ["The children's section of the library is bigger than the rest of it. Odd, for a school with so few children."],
  ],
  spiritual: [
    ['The Temple has three sanctuaries and only one of them is ever swept.'],
    ["Pilgrims still come to the Temple, though nobody's quite sure who they're praying to."],
    ['The bell-ringer rings the dawn bell every morning, even when there is no one there to hear it.'],
  ],
  emotional: [
    ['The Still Valley monastery takes in anyone who knocks. They say nobody has ever been turned away.'],
    ['There is a table in the Valley set for three that nobody is allowed to sit at.'],
    ['The lake in the Valley is so still you can hear someone thinking on the other side.'],
  ],
  social: [
    ['The Festival City has had a party every night for as long as anyone remembers.'],
    ["There's a bakery in the Festival City that has never once been locked."],
    ['The old summit hall is kept exactly as it was. Chairs out, ink wells full, like everyone just stepped out.'],
  ],
  occupational: [
    ['The Guild City fixes anything you bring it. Nobody has invented anything new there in centuries, mind you.'],
    ['The lamplighters in the Guild City still light every lamp by hand, every night, without fail.'],
    ['There is a wall in the Guild City so well built that nobody has ever found the door in it.'],
  ],
  environmental: [
    ['Some of the trees in the Wildwood are five hundred years old, planted in neat rows. Somebody planted them.'],
    ['There is a white stag in the Wildwood. People who have seen it stop talking about it.'],
    ['The river folk say the water tastes different near the heart of the forest. Cleaner, somehow.'],
  ],
};

type Talk = { about?: string[]; gossip?: string[]; path?: string[] };

/**
 * Answers written for particular characters (drafts until the author approves
 * them). Anyone missing here answers "about yourself" with their own quote,
 * and the Path question with their class's answer.
 */
export const CHARACTER_TALK: Partial<Record<CharacterId, Talk>> = {
  brannoc: {
    about: [
      "Brannoc Hale! Strongest man you'll ever meet. Ask anyone. Ask them from a distance, they get nervous.",
      "This? Sweetheart. Finest greatsword ever forged. Hardly a scratch on her. I'm… very careful with her.",
    ],
    path: [
      'Strength? Easy. Lift the heavy thing. Then lift it again tomorrow.',
      "The trick is doing it when nobody's watching. That's the hard part. …So I've heard.",
    ],
  },
  ysolde: {
    about: [
      "Ysolde Marrow. I keep the accounts. Everyone's, eventually.",
      'The monocle is cracked, yes. It still sees perfectly well. Better than most people with two good eyes.',
    ],
    path: [
      'Write down what you spend. Every coin, every day.',
      "Most people are never poor from one bad choice. It's a thousand small ones nobody bothered to count.",
    ],
  },
  quill: {
    about: [
      'Quill! Scholar, footnote enthusiast, and, technically, the only person here who has read every book on that shelf. Twice.',
      'The book bites, by the way. Not personally. It just has opinions.',
    ],
    path: [
      'Right now? Everything in this Archive, in order, which is going slowly because the order is terrible.',
      "A page a day. That's the secret. And I say this with love: you should try it.",
    ],
  },
  wren: {
    about: [
      "Wren. Sister Wren, if you'd like to be formal, but please don't be.",
      "I tend to people, mostly. The lantern keeps me company. It's brighter when I'm sure of something, so… it's fairly dim.",
    ],
    path: [
      'I believe in sitting quietly for a little while every day, even when nothing answers.',
      'Especially then, maybe.',
    ],
  },
  oren: {
    about: ['Oren.', "…That's most of it."],
    path: ['Breathe in. Count four. Breathe out. Count four.', 'Then decide. Most people skip the first part.'],
  },
  pip: {
    about: [
      "Pip Larkspur, at your service! Bard, songwriter, and friend of everyone I've ever met, including a goose.",
      "I've got a song for every town on the map. I just need to find the towns again.",
    ],
    path: [
      'Easy! Say hello first. Remember their name. Ask about their goose.',
      "Not everyone has a goose. But you'd be surprised.",
    ],
  },
  tamsin: {
    about: [
      'Tamsin Brasse. I fix things.',
      "The arm? Built it myself. Works better than the old one. Don't ask what happened to the old one.",
    ],
    path: [
      'Whatever breaks next. Something always does.',
      "Do a little every day. Big jobs are just small jobs you didn't get to yet.",
    ],
  },
  moss: {
    about: [
      'Moss. And this is Tuft. Say hello, Tuft.',
      '…Tuft is shy. So am I, mostly. Animals are easier. They say what they mean.',
    ],
    path: [
      "Out there, nothing hurries, and nothing stops. Trees don't take days off.",
      'Get outside a bit every day. Tuft insists.',
    ],
  },
};

/** The three questions any character can be asked (the Keeper has his own). */
export function characterQuestions(companion: Companion): Question[] {
  const own = CHARACTER_TALK[companion.id] ?? {};
  const rumours = KINGDOM_GOSSIP[companion.dimension];
  const path = PATH_TALK[companion.dimension];
  return [
    { ask: ABOUT_ASK, answer: own.about ?? [companion.quote] },
    { ask: GOSSIP_ASK, answer: own.gossip ?? rumours[companion.number % rumours.length] },
    { ask: path.ask, answer: own.path ?? path.answer },
  ];
}
