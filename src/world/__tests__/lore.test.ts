import { emptyDimensionRecord } from '@/game';

import { addLore, cleanLore, loreId, type LoreEntry } from '../lore';
import { FINAL_GOAL, howToProgress, standing } from '../progress';
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

describe('the last seal (overall Lv 15, like the castle)', () => {
  const totals = (total: number) => ({ total, byPath: { ...zero, physical: total } });

  it('counts every habit, whatever the Path', () => {
    const start = standing(FINAL_GOAL, totals(0));
    expect(start).toMatchObject({ met: false, have: 5, need: 15, className: null });
    expect(start.habitsLeft).toBe(20);
    expect(howToProgress(start)).toContain('Any habit counts');
  });

  it('is met at Overall Lv 15', () => {
    expect(standing(FINAL_GOAL, totals(190))).toMatchObject({ met: false });
    expect(standing(FINAL_GOAL, totals(200))).toMatchObject({ met: true, habitsLeft: 0, fraction: 1 });
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
