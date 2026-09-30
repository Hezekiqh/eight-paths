import { COMPANIONS } from '@/story/companions';

import { loreId, type LoreEntry } from '../lore';
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

  it('uncovers a block from any of its sources, in any order, and counts what is found', () => {
    const shared = blocks.find((b) => b.from.length > 1)!;
    expect(toldBy(shared, [])).toBeUndefined();
    expect(toldBy(shared, [heard(shared.from[1])])?.id).toBe(shared.from[1]);
    expect(taleProgress(TALE, [])).toEqual({ found: 0, total: blocks.length });
    const last = blocks[blocks.length - 1];
    expect(taleProgress(TALE, [heard(last.from[0])]).found).toBe(1);
    expect(taleProgress(TALE, [heard(shared.from[0])]).found).toBeGreaterThanOrEqual(1);
  });
});
