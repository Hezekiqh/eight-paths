import { loreId, talkedId, type LoreEntry } from './lore';

// The World menu's Story scroll (author, Oct 7, 2026): how a grieving king nearly let the eight kingdoms fall into
// war, how his younger brother Kaldor took the throne with the Shadow Monarch's help, and the one condition that
// came with it. It's told in hidden blocks, a sentence or two for each person you talk to (lore.ts talkedId) or ask, in
// whatever order you meet them, so the gaps show who's still to be found. The scroll only ever says what people
// believe; what really happened in the king's bedchamber is the crypt's flashback (old-kings-crypt.json, `L`).

/** A piece of the story, shown once you've heard any one of `from` (lore ids: who, asked what). */
export type Block = { from: string[]; text: string };
export type Chapter = { title: string; blocks: Block[] };

/** A block uncovered by talking to this person at all (lore.ts TALKED). */
const told = (speaker: string) => talkedId(speaker);

export const TALE: Chapter[] = [
  {
    title: 'The grieving king',
    blocks: [
      {
        from: [loreId('The Keeper', 'What am I supposed to do now?')],
        text: 'Long ago there were eight kingdoms, and for a while they kept the peace.',
      },
      {
        from: [loreId('Old Gudrun', 'What was the old king like?')],
        text: 'The kingdom past Warrior City was ruled by the Hales. The last of them was King Osric.',
      },
      {
        from: [loreId('Nana Birch', 'Tell me about the old days.')],
        text: 'He used to ask the cook how the soup was. Then the queen went missing, and he stopped asking.',
      },
      {
        from: [loreId('Librarian Pell', "What's in the missing volume?")],
        text: 'He shut himself away. People began to whisper that the king had gone mad.',
      },
      {
        from: [loreId('Lieutenant Arden', "What's the map for?")],
        text: 'His war council begged him to march on the mages. He never quite gave the order.',
      },
      {
        from: [loreId('Sergeant Holt', 'Tell me a camp story.')],
        text: 'Every forge beat out blades for him, and the other seven kingdoms sharpened theirs.',
      },
      {
        from: [loreId('Watchman Orrin', "What's south?")],
        text: 'The eight kingdoms stood one order away from a war none of them would survive. The king hesitated.',
      },
    ],
  },
  {
    title: 'The brother',
    blocks: [
      {
        from: [loreId('Private Dunn', 'How long have you been here?')],
        text: 'On the night of the march, the drums never sounded.',
      },
      {
        from: [loreId('Sexton Rook', 'Who was the old king?')],
        text: 'The king had a younger brother, Kaldor. Second best, folk said.',
      },
      {
        from: [loreId("The Chaplain's Echo", 'Who are you?')],
        text: "The king's chaplain sealed away what he saw. Some say a shadow promised Kaldor power over the dead, and endless youth.",
      },
      {
        from: [told('Old Mags')],
        text: 'The little prince was gone too, though no one could ever say where.',
      },
      {
        from: [loreId('Tallow', 'Why so many braziers?')],
        text: 'Those who saw it only ever whispered its name: the Shadow Monarch.',
      },
    ],
  },
  {
    title: 'The king who never ages',
    blocks: [
      {
        from: [loreId('Old Gardener', 'Who was the queen?')],
        text: 'King Osric named Kaldor his heir. Soon after, he was gone. A broken heart, they said. People talked.',
      },
      {
        from: [told('Gert')],
        text: 'People say Kaldor got all he wanted: the money, the wealth, the fame, the women.',
      },
      {
        from: [told('Queen Helka')],
        text: 'Some say it came with one condition: build the strongest army in the eight kingdoms, and never march it to war.',
      },
      {
        from: [loreId('Mira', 'Heard any gossip?')],
        text: 'He does not age. The horde says he casts no shadow either.',
      },
      {
        from: [loreId('Old Wenna', 'The Kingdom?')],
        text: 'The horde grew, the Kaloseum filled, and the kingdom forgot its old name.',
      },
    ],
  },
  {
    title: 'Why',
    blocks: [
      {
        from: [loreId('Old Fen', 'Tell me an old story.')],
        text: 'Why would a shadow make a king? Some say to rule. Some say to stop the war.',
      },
      {
        from: [loreId('The Quartermaster', 'Whose spoon?')],
        text: 'In the old stores is a scrap of paper, the same words written over and over:',
      },
      { from: [loreId('Bo Tumble', 'Why keep moving?')], text: '“I need to be strong. I need to protect them.”' },
      {
        from: [loreId('Hesper', 'Heard any gossip?')],
        text: 'For four hundred years the Shadow Monarch ruled through his kings. Then he began to doubt, and to wither. A hundred years ago he fell silent.',
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
