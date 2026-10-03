import { DEFAULT_PARTY, ROSTER } from '@/story/companions';

import { MAPS, withoutCharacter, withoutGone } from '../maps';
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
    expect(MAPS.archive.npcs.find((n) => n.id === 'keeper')?.questions).toHaveLength(4);
  });

  it('frees the tile of whoever is walking the World', () => {
    const map = withoutCharacter(MAPS.archive, 'pip');
    const pip = MAPS.archive.npcs.find((n) => n.character === 'pip')!;
    expect(map.npcs.some((n) => n.character === 'pip')).toBe(false);
    expect(map.solid[pip.y * map.width + pip.x]).toBe(0);
    expect(MAPS.archive.solid[pip.y * map.width + pip.x]).toBe(1);
  });
});

describe('Nib', () => {
  const nib = () => MAPS['courier-road'].npcs.find((n) => n.id === 'nib')!;

  it('runs off for good if you tell him to beat it', () => {
    const insult = nib().questions!.find((q) => q.sets)!;
    expect(insult.sets).toBe(nib().goneAfter);
    expect(insult.then?.length).toBeGreaterThan(0);
    const after = withoutGone(MAPS['courier-road'], [insult.sets!]);
    expect(after.npcs.some((n) => n.id === 'nib')).toBe(false);
    expect(after.solid[nib().y * after.width + nib().x]).toBe(0);
  });

  it('stays put otherwise', () => {
    // (Felix is there too, once his cocoon's broken: see cocoons.test.ts.)
    expect(withoutGone(MAPS['courier-road'], ['pit-champion', 'felix-hatched'])).toBe(MAPS['courier-road']);
  });
});
