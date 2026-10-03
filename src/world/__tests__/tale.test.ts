import { COMPANIONS } from '@/story/companions';

import { loreId, talkedId, type LoreEntry } from '../lore';
import { MAPS } from '../maps';
import { TALE, taleProgress, toldBy } from '../tale';
import { characterQuestions } from '../talk';

/** Every answer a player can hear in the World, by lore id. */
function askable(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const map of Object.values(MAPS)) {
    for (const npc of map.npcs) {
      const qs = npc.questions ?? (npc.character ? characterQuestions(COMPANIONS[npc.character]) : []);
      for (const q of qs) out.set(loreId(npc.name, q.ask), q.answer);
      out.set(talkedId(npc.name), npc.lines);
    }
  }
  return out;
}

const heard = (id: string): LoreEntry => ({ id, speaker: '', ask: '', answer: [], at: 1 });

describe('the tale of the Kingdom', () => {
  const blocks = TALE.flatMap((c) => c.blocks);

  it('uncovers every block from a question someone in the World answers', () => {
    const can = askable();
    for (const b of blocks) {
      expect(b.from.length).toBeGreaterThan(0);
      for (const id of b.from) expect([id, can.has(id)]).toEqual([id, true]);
    }
  });

  it('keeps the secrets', () => {
    const text = TALE.flatMap((c) => [c.title, ...c.blocks.map((b) => b.text)]).join(' ');
    expect(text).not.toMatch(/Entity|Chosen One|Erasure|Halecrest|cocoon/i);
  });

  it('uncovers a block by talking to its person, in any order, and counts what is found', () => {
    const last = blocks[blocks.length - 1];
    expect(toldBy(last, [])).toBeUndefined();
    expect(toldBy(last, [heard(last.from[0])])?.id).toBe(last.from[0]);
    expect(taleProgress(TALE, [])).toEqual({ found: 0, total: blocks.length });
    expect(taleProgress(TALE, [heard(last.from[0])]).found).toBe(1);
  });

  it('gives each person their own sentence or two, about a minute of reading in all', () => {
    const people = blocks.flatMap((b) => b.from);
    expect(new Set(people).size).toBe(people.length);
    const words = blocks.map((b) => b.text).join(' ').split(/\s+/).length;
    expect(words).toBeGreaterThan(200);
    expect(words).toBeLessThan(350);
  });

  it('names the Shadow Monarch, and tells of the Mad King and the puppet king', () => {
    const text = blocks.map((b) => b.text).join(' ');
    expect(text).toMatch(/Shadow Monarch/);
    expect(text).toMatch(/Mad King/);
    expect(text).toMatch(/I need to be strong\. I need to protect them\./);
  });
});
