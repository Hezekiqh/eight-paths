import { loreId, talkedId, type LoreEntry } from './lore';

// The World menu's Lore scroll (author, Oct 7, 2026): the true story of the Warrior Kingdom up to today. The
// beautiful queen and the war she wanted; Brannoc, his master's question, the forest; the queen vanishing; Kaldor (the
// king's younger brother) murdering Osric in his bedchamber; two years of the puppet king and his laws; the staged
// assassination and the lies; and the rumoured march on the Mage Kingdom. Never told here: what the queen really was
// (no hints at all), the Shadow Monarch (no one has ever seen it: only "something in the dark"), who killed the
// painter, and any land beyond the eight kingdoms.
//
// Told like an oracle, in the voice of a war goddess (author: "like Athena in God of War"): grand, measured, mythic;
// our own words, never borrowed lines. One fluid story, each chapter a single paragraph, cut
// into pieces: a phrase or a sentence for each person you talk to (lore.ts talkedId) or ask, in whatever order you
// meet them, so the gaps in the paragraph show who's still to be found. The pieces needn't match what each person
// says: nobody alive remembers this story.

/** A piece of the story, shown once you've heard any one of `from` (lore ids: who, asked what). */
export type Block = { from: string[]; text: string };
export type Chapter = { title: string; blocks: Block[] };

/** A block uncovered by talking to this person at all (lore.ts TALKED). */
const told = (speaker: string) => talkedId(speaker);

export const TALE: Chapter[] = [
  {
    title: 'The beautiful queen',
    blocks: [
      {
        from: [loreId('The Keeper', 'What am I supposed to do now?')],
        text: 'In an age long past, eight kingdoms stood bound in an uneasy alliance, and a single war between them would have doomed them all.',
      },
      {
        from: [loreId('Old Gudrun', 'What was the old king like?')],
        text: 'The Warrior Kingdom was ruled by King Osric, a king of peace.',
      },
      {
        from: [loreId('Nana Birch', 'Tell me about the old days.')],
        text: 'Then a woman came to his court, more beautiful than any the world had ever seen, and his heart was lost to her.',
      },
      {
        from: [loreId('Librarian Pell', "What's in the missing volume?")],
        text: 'His court warned their king that something about her was wrong. She was too perfect. She had an answer for everything. And beneath her beauty lay a darkness that every eye could see but his.',
      },
      {
        from: [loreId('Lieutenant Arden', "What's the map for?")],
        text: 'He would not hear them. He made her his queen, and her desire became his law, and what she desired was war with the Mage Kingdom. So the forges roared, an army rose, and their son, Prince Brannoc, was shaped to be its general.',
      },
    ],
  },
  {
    title: 'The prince who painted',
    blocks: [
      {
        from: [loreId('Sergeant Holt', 'Tell me a camp story.')],
        text: 'But the prince was born with a painter’s heart, and he spent his days at the side of an old master of the brush. Once, Brannoc declared that a hunger for war is what makes a true warrior. The master only smiled.',
      },
      {
        from: [loreId('Watchman Orrin', "What's south?")],
        text: '“Is that what you believe, or what you were told?” he asked, and turned back to his work.',
      },
      {
        from: [loreId('Private Dunn', 'How long have you been here?')],
        text: 'As the march drew near and command of the army waited for him, Brannoc sat with those words long into the night. The next morning, he found his master dead. He ran into the woods, and he never returned.',
      },
    ],
  },
  {
    title: 'The Mad King',
    blocks: [
      {
        from: [loreId('Sexton Rook', 'Who was the old king?')],
        text: 'Then, without warning, the queen vanished, leaving no trace behind, and with her went the last soul who still believed the king was sane.',
      },
      {
        from: [loreId("The Chaplain's Echo", 'Who are you?')],
        text: 'Alone, he was lost. Should he march to the war she had wanted? Why had she left him? Did she still live?',
      },
    ],
  },
  {
    title: 'The brother',
    blocks: [
      {
        from: [told('Old Mags')],
        text: 'The king had a younger brother, Kaldor, and Kaldor was no longer the man he had been. Something in the dark had granted him powers no mortal should hold.',
      },
      {
        from: [loreId('Tallow', 'Why so many braziers?')],
        text: 'On a night when the king lay sleepless in his bed, shadows devoured his chamber, and from them stepped his brother. “What has become of you?” the king demanded. “What is this presence?”',
      },
      {
        from: [loreId('Old Gardener', 'Who was the queen?')],
        text: '“Do not worry, my dear brother,” Kaldor answered. “About the war. About the queen. You can rest easy now.” And in the dark, he murdered him.',
      },
    ],
  },
  {
    title: 'The puppet king',
    blocks: [
      {
        from: [told('Gert')],
        text: 'With that same dark power, Kaldor raised his brother from death and worked him like a puppet, and the first command the dead king gave was to name Kaldor his heir.',
      },
      {
        from: [told('Queen Helka')],
        text: 'Then came heavier taxes, then every boy forced to train for war from his twelfth year, then law upon law that raised the soldier above all who did not serve, until the people burned with rage.',
      },
      {
        from: [loreId('Mira', 'Heard any gossip?')],
        text: 'For two years the puppet reigned, until Kaldor wearied of his toy and reached for the crown himself.',
      },
    ],
  },
  {
    title: 'The hero',
    blocks: [
      {
        from: [loreId('Old Wenna', 'The Kingdom?')],
        text: 'He staged an assassination and stood over the fallen king, hailed as the hero of the realm.',
      },
      {
        from: [loreId('Old Fen', 'Tell me an old story.')],
        text: 'He sowed lies about the king’s vices and his strange change, about the queen’s designs, about the vanished prince.',
      },
      {
        from: [loreId('Hesper', 'Heard any gossip?')],
        text: 'Then he struck down every law but the training, and the people, believing their fortunes restored and never knowing that every thread had passed through Kaldor’s hands, bowed to their new king.',
      },
    ],
  },
  {
    title: 'The Berserker Kingdom',
    blocks: [
      {
        from: [loreId('The Quartermaster', 'Whose spoon?')],
        text: 'Five hundred years have passed, and still he has not aged a day. The Warrior Kingdom is the Berserker Kingdom now, home to the most vicious, ruthless and bloodthirsty warriors in all eight kingdoms, a land where strength is everything.',
      },
      {
        from: [loreId('Bo Tumble', 'Why keep moving?')],
        text: 'And now the kingdom trembles with rumour that Kaldor prepares for war against the Mage Kingdom. Why, after all this time?',
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
