import { DEFAULT_PARTY } from '@/story/companions';

import { REPUTATION_AT, deedId, honor, reputationOf, type Deed } from '../honor';
import { roomQuestions } from '../hero-rooms';
import { MAPS } from '../maps';
import { shownQuestions } from '../menu';
import { winScene } from '../scenes';
import { useWorldStore } from '../store';

const good = (id: string): Deed => ({ id, kind: 'good' });
const bad = (id: string): Deed => ({ id, kind: 'bad' });

describe('honor (like Red Dead Redemption 2)', () => {
  it('counts kind choices up and mean ones down', () => {
    expect(honor([])).toBe(0);
    expect(honor([good('a'), good('b'), bad('c')])).toBe(1);
  });

  it('tips into kind or mean after a few deeds either way', () => {
    expect(reputationOf([])).toBe('neutral');
    expect(reputationOf(Array.from({ length: REPUTATION_AT }, (_, i) => good(`g${i}`)))).toBe('kind');
    expect(reputationOf(Array.from({ length: REPUTATION_AT }, (_, i) => bad(`b${i}`)))).toBe('mean');
  });

  it('keeps each deed once, and a restart of the story clears them', () => {
    useWorldStore.setState({ deeds: [] });
    const id = deedId('courier-road', 'Nib', 'Beat it, kid.');
    useWorldStore.getState().doDeed(bad(id));
    useWorldStore.getState().doDeed(bad(id));
    expect(useWorldStore.getState().deeds).toEqual([bad(id)]);
    useWorldStore.getState().restart();
    expect(useWorldStore.getState().deeds).toEqual([]);
  });
});

describe('every menu has a mean answer (author, Oct 4, 2026)', () => {
  it('everyone you can ask things has exactly one, and it always shows', () => {
    const missing: string[] = [];
    for (const map of Object.values(MAPS))
      for (const npc of map.npcs) {
        if (!npc.questions?.length) continue;
        const mean = npc.questions.filter((q) => q.deed === 'bad');
        if (mean.length !== 1) missing.push(`${map.id}/${npc.id}`);
        else if (!shownQuestions(npc.questions, []).includes(mean[0])) missing.push(`${map.id}/${npc.id} (hidden)`);
        // a mean answer never changes the story
        else if (mean[0].sets && npc.id !== 'nib') missing.push(`${map.id}/${npc.id} (sets a flag)`);
      }
    expect(missing).toEqual([]);
  });

  it("each of the core eight has one in their room, and the throne room's ending has one", () => {
    for (const id of Object.values(DEFAULT_PARTY)) {
      const qs = roomQuestions(id, { places: 1, met: 1, flags: [] }, 'Go somewhere');
      expect(qs.filter((q) => q.deed === 'bad')).toHaveLength(1);
    }
    const ending = winScene('war-hall', 'kaldor-beaten', true, true)!;
    expect(ending.choices!.filter((c) => c.deed === 'bad')).toHaveLength(1);
    expect(ending.choices!.length).toBeLessThanOrEqual(4);
  });
});
