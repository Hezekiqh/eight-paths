import { DEFAULT_PARTY, ROSTER } from '@/story/companions';

import { MAPS, withoutCharacter } from '../maps';
import { ABOUT_ASK, GOSSIP_ASK, PATH_TALK, characterQuestions } from '../talk';

describe('characterQuestions', () => {
  it('gives every character the same three questions, each with an answer', () => {
    for (const c of ROSTER) {
      const qs = characterQuestions(c);
      expect(qs.map((q) => q.ask)).toEqual([ABOUT_ASK, GOSSIP_ASK, PATH_TALK[c.dimension].ask]);
      for (const q of qs) {
        expect(q.answer.length).toBeGreaterThan(0);
        for (const line of q.answer) expect(line.trim()).not.toBe('');
      }
    }
  });

  it('has written answers for the core eight', () => {
    for (const id of Object.values(DEFAULT_PARTY)) {
      const c = ROSTER.find((r) => r.id === id)!;
      expect(characterQuestions(c)[0].answer).not.toEqual([c.quote]);
    }
  });
});

describe('the Archive', () => {
  it('has the core eight standing in it, and the Keeper with his own questions', () => {
    const here = MAPS.archive.npcs.map((n) => n.character).filter(Boolean);
    expect(new Set(here)).toEqual(new Set(Object.values(DEFAULT_PARTY)));
    expect(MAPS.archive.npcs.find((n) => n.id === 'keeper')?.questions).toHaveLength(3);
  });

  it('frees the tile of whoever is walking the World', () => {
    const map = withoutCharacter(MAPS.archive, 'pip');
    const pip = MAPS.archive.npcs.find((n) => n.character === 'pip')!;
    expect(map.npcs.some((n) => n.character === 'pip')).toBe(false);
    expect(map.solid[pip.y * map.width + pip.x]).toBe(0);
    expect(MAPS.archive.solid[pip.y * map.width + pip.x]).toBe(1);
  });
});
