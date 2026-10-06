import { emptyDimensionRecord } from '@/game';

import { addLore, cleanLore, loreId, type LoreEntry } from '../lore';
import { FINAL_GOAL, standing } from '../progress';
import { ROADMAP } from '../roadmap';

const entry = (speaker: string, ask: string, at = 1): LoreEntry => ({
  id: loreId(speaker, ask),
  speaker,
  ask,
  answer: [`${speaker} answers.`],
  at,
});

const zero = emptyDimensionRecord(0);

describe('the lore journal', () => {
  it('writes each answer down once, keeping when it was first heard', () => {
    let journal = addLore([], entry('Brannoc', 'Heard any gossip?', 1));
    journal = addLore(journal, entry('Brannoc', 'Heard any gossip?', 2));
    journal = addLore(journal, entry('Quill', 'Heard any gossip?', 3));
    expect(journal.map((e) => [e.speaker, e.at])).toEqual([
      ['Brannoc', 1],
      ['Quill', 3],
    ]);
  });

  it('keeps only well-formed entries from a save', () => {
    const good = entry('Wren', 'Tell me about yourself.');
    const cleaned = cleanLore([good, { ...good }, { id: 'x' }, null, 'junk', { ...good, id: 'y', answer: [3] }]);
    expect(cleaned).toEqual([good]);
    expect(cleanLore('nope')).toEqual([]);
  });
});

describe('the last seal', () => {
  it('is open from the start, like the rest of the World (author, Oct 6, 2026)', () => {
    expect(standing(FINAL_GOAL, { total: 0, byPath: { ...zero } })).toMatchObject({ met: true, habitsLeft: 0 });
  });
});

describe('coming soon', () => {
  it('keeps the list short and spoiler-light', () => {
    expect(ROADMAP.length).toBeGreaterThan(0);
    for (const item of ROADMAP) {
      expect(item.title.length).toBeLessThan(40);
      expect(`${item.title} ${item.body}`).not.toMatch(/Entity|Chosen One|Erasure/);
    }
  });
});
