import { ABOUT_ASK, GOSSIP_ASK } from './talk';
import { loreId, type LoreEntry } from './lore';

// The World menu's lore: the story of the Kingdom, told in hidden blocks. Each
// block appears once a character has told you it (see lore.ts), in whatever
// order you hear them, so gaps show where someone is still to be found.
// Spoiler rule (LORE.md): blocks only say what some character says.

/** A piece of the story, shown once you've heard any one of `from` (lore ids: who, asked what). */
export type Block = { from: string[]; text: string };
export type Chapter = { title: string; blocks: Block[] };

const said = (speaker: string, ask: string) => loreId(speaker, ask);

export const TALE: Chapter[] = [
  {
    title: 'Where you woke',
    blocks: [
      {
        from: [said('The Keeper', 'Where am I?')],
        text: 'You woke in the Archive, a pocket dimension, where the Keeper has kept you company for five hundred years. It’s a long story, he says.',
      },
      {
        from: [said('The Keeper', 'Who are you?'), said('The Keeper', 'How do you know me?')],
        text: 'Its Keeper says he’s an old friend. He knows more than he’s saying, and he says who you were is yours to find.',
      },
    ],
  },
  {
    title: 'The old Kingdom',
    blocks: [
      {
        from: [said('Old Wenna', 'The Kingdom?')],
        text: 'The Kingdom east of the old fort once had another name, a pretty one. Nobody says it any more.',
      },
      {
        from: [said('Nana Birch', 'Tell me about the old days.')],
        text: 'It was ruled by the Hales. The last Hale king asked the cook how the soup was, and went mad as a bag of cats by the end.',
      },
      {
        from: [said('Old Harrow', 'Tell me about Sweetheart.')],
        text: 'The royal smith, Old Harrow, made his finest sword, Sweetheart, for a big lad with the biggest hands he ever saw and the smallest courage. It is the only sword he made that stayed clean.',
      },
      {
        from: [said('Hugo Thornbeard', GOSSIP_ASK), said('Private Dunn', GOSSIP_ASK)],
        text: 'The little prince hid in the hedge maze instead of drilling.',
      },
      {
        from: [said('The Quartermaster', "Who's snoring?")],
        text: 'Baron Plush, lord of the court, told everyone to rest before the war. They rested. Then there was no war, and then there was nothing.',
      },
      {
        from: [said('Old Fen', GOSSIP_ASK)],
        text: 'Behind a boulder in the rock by the old fort, someone once found a child’s toy sword, and put it back.',
      },
    ],
  },
  {
    title: 'The king who came',
    blocks: [
      {
        from: [said('Captain Varga', 'Who are you?')],
        text: 'Then a new king took the crown with his own two hands.',
      },
      {
        from: [said('Old Harrow', GOSSIP_ASK), said('Gert', GOSSIP_ASK)],
        text: 'Once he had won, he closed the Trial of Arms, so nobody could challenge him.',
      },
      {
        from: [said('Barnaby Loudmouth', GOSSIP_ASK)],
        text: 'The last to try was Aurek the Tall, who almost won and scarred the king’s face. The king… kept him.',
      },
      {
        from: [said('Hugo Thornbeard', "Where's the old law?")],
        text: 'The old law is carved at the heart of the hedge maze. The king ordered the maze left wild, so nobody would read it.',
      },
      {
        from: [said('Hesper', GOSSIP_ASK)],
        text: 'He names everything after himself. There is a Kaldor Street that crosses Kaldor Street.',
      },
    ],
  },
  {
    title: "The king who doesn't age",
    blocks: [
      {
        from: [said('Nana Birch', GOSSIP_ASK), said('Madame Oriel', GOSSIP_ASK)],
        text: 'The king hasn’t aged a day in five hundred years, and nobody finds that odd.',
      },
      {
        from: [said('Mira', GOSSIP_ASK)],
        text: 'The horde says he casts no shadow. Everybody casts a shadow. Somebody’s lying.',
      },
      {
        from: [said('Tessa', GOSSIP_ASK)],
        text: 'He eats alone: fourteen loaves, never shared.',
      },
      {
        from: [said('Grask', 'Does the king ever sleep?')],
        text: 'He never sleeps.',
      },
      {
        from: [said('Hugo Thornbeard', 'Who put the head by the rose?')],
        text: 'By a white rose in the maze sits a stone king’s head. The gardener found it in the pit’s drain, and couldn’t leave a king looking at a drain.',
      },
      {
        from: [said('Pim', 'Buy the most expensive one.')],
        text: 'The dearest rumour in the market: the prince will come back up out of the ground, with a giant’s beard. The seller swears he made it up.',
      },
    ],
  },
  {
    title: 'Year 500',
    blocks: [
      {
        from: [said('Sergeant Holt', 'What is this camp?')],
        text: 'Soldiers who wouldn’t fight for the barbarian king, or against him, wait in a camp for the right moment.',
      },
      {
        from: [said('Mira', 'Going back where?')],
        text: 'In the town, families cheer at the pit because the horde tells them to.',
      },
      {
        from: [said('The Cage Guard', "Who's in the cages?")],
        text: 'Whoever won’t cheer goes in a cage.',
      },
      {
        from: [said('Jory', GOSSIP_ASK)],
        text: 'Even Millbrook, with nothing the king wants, lost every bit of iron to his soldiers: pots, nails, a grandad’s teeth.',
      },
      {
        from: [said('Captain Varga', 'Will the march really come?')],
        text: 'And the horde waits for the march. The king says they are finally strong enough.',
      },
    ],
  },
  {
    title: 'The last message',
    blocks: [
      {
        from: [said('Hesper', 'What is this place?')],
        text: 'Couriers once ran post between every kingdom, the fastest people alive.',
      },
      {
        from: [said('Pell', "Who's the best courier?")],
        text: 'The fastest of them all ran the last message of the old world, and never delivered it. They say she is still out there, the letter still sealed.',
      },
    ],
  },
  {
    title: 'The big man',
    blocks: [
      {
        from: [said('Brannoc', ABOUT_ASK)],
        text: 'The big man in your party calls himself Brannoc Hale, and carries a greatsword named Sweetheart. Hardly a scratch on her.',
      },
    ],
  },
];

/** Who told you a block, if anyone has: the first of its sources you've heard. */
export function toldBy(block: Block, heard: LoreEntry[]): LoreEntry | undefined {
  for (const id of block.from) {
    const entry = heard.find((e) => e.id === id);
    if (entry) return entry;
  }
  return undefined;
}

/** How many of the story's blocks you've uncovered, in one chapter or the whole tale. */
export function taleProgress(chapters: Chapter[], heard: LoreEntry[]): { found: number; total: number } {
  const blocks = chapters.flatMap((c) => c.blocks);
  return { found: blocks.filter((b) => toldBy(b, heard)).length, total: blocks.length };
}
