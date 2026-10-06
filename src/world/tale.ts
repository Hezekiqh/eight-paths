import { talkedId, type LoreEntry } from './lore';

// The World menu's Story scroll: how the Mad King nearly plunged the eight
// kingdoms into war, until the Shadow Monarch took him and set up a puppet king.
// It's told in hidden blocks, a sentence or two for each person you talk to
// (lore.ts talkedId), in whatever order you meet them, so the gaps show who's
// still to be found. All of it is about a minute's read.

/** A piece of the story, shown once you've heard any one of `from` (lore ids: who, asked what). */
export type Block = { from: string[]; text: string };
export type Chapter = { title: string; blocks: Block[] };

/** A block uncovered by talking to this person at all (lore.ts TALKED). */
const told = (speaker: string) => talkedId(speaker);

export const TALE: Chapter[] = [
  {
    title: 'The Mad King',
    blocks: [
      { from: [told('The Keeper')], text: 'Long ago there were eight kingdoms, and for a while they kept the peace.' },
      {
        from: [told('Old Wenna')],
        text: 'The kingdom east of the old fort was ruled by the Hales. The last of them, Osric, was not well.',
      },
      {
        from: [told('Nana Birch')],
        text: 'He used to ask the cook how the soup was. Then he stopped asking, and began counting swords.',
      },
      {
        from: [told('Madame Oriel')],
        text: 'He saw enemies in every window, and the Mage Kingdom most of all.',
      },
      {
        from: [told('Lieutenant Arden')],
        text: 'At every supper he talked of marching on the mages, smiling. His officers stopped smiling back.',
      },
      {
        from: [told('Sergeant Holt')],
        text: 'Every forge beat out blades for him, and the other seven kingdoms sharpened theirs.',
      },
      {
        from: [told('Old Fen')],
        text: 'The eight kingdoms stood one order away from a war none of them would survive.',
      },
    ],
  },
  {
    title: 'The figure in the dark',
    blocks: [
      { from: [told('Private Dunn')], text: 'On the night of the march, the drums never sounded.' },
      {
        from: [told('Sexton Rook')],
        text: 'A figure walked into the war hall out of the darkness, and the torches threw no shadow of it.',
      },
      {
        from: [told("The Chaplain's Echo")],
        text: 'By morning the Mad King was gone. No body, no trial, no bells: only an empty throne.',
      },
      {
        from: [told('Hugo Thornbeard')],
        text: 'The little prince was gone too, though no one could ever say where.',
      },
      {
        from: [told('Tallow')],
        text: 'Those who saw it only ever whispered its name: the Shadow Monarch.',
      },
    ],
  },
  {
    title: 'The puppet king',
    blocks: [
      {
        from: [told('Barnaby Loudmouth')],
        text: 'On the empty throne, the Shadow Monarch set a new king: Kaldor, the champion of the pit.',
      },
      {
        from: [told('Gert')],
        text: 'Kaldor was strength itself, made king to grow stronger still.',
      },
      {
        from: [told('Captain Varga')],
        text: 'He built the army stone by stone, and named every street after himself.',
      },
      {
        from: [told('Old Harrow')],
        text: 'He does not age. He does not fall. People say that he, too, casts no shadow.',
      },
      {
        from: [told('Gary')],
        text: 'The horde grew, the pit filled, and the kingdom forgot its old name.',
      },
    ],
  },
  {
    title: 'Why',
    blocks: [
      {
        from: [told('Mira')],
        text: 'Why would a shadow make a king? Some say to rule. Some say to stop the war.',
      },
      {
        from: [told('The Quartermaster')],
        text: 'In the old stores is a scrap of paper, the same words written over and over:',
      },
      { from: [told('Bo Tumble')], text: '“I need to be strong. I need to protect them.”' },
      {
        from: [told('Hesper')],
        text: 'A hundred years ago the Shadow Monarch fell silent. The puppet king has ruled alone ever since.',
      },
      {
        from: [told('Felix')],
        text: 'A king with all that strength, and no one left to answer to. What could be more fun?',
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
