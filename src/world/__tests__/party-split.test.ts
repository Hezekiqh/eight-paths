import { DEFAULT_PARTY, STARTERS } from '@/story/companions';

import { walkersFor } from '../hero';
import { PARTING, leftFlag, partySplit } from '../scenes';

const everyone = Object.fromEntries(Object.values(DEFAULT_PARTY).map((id) => [id, 1]));

describe('the party splitting at the end of Season 1', () => {
  it('says goodbye to the four who are not starters, only those you met', () => {
    expect(PARTING.map((p) => p.id).filter((id) => STARTERS.includes(id))).toEqual([]);
    const { lines, leaving } = partySplit(['met:pip', 'met:moss', 'met:quill']);
    expect(leaving).toEqual(['pip', 'moss']);
    expect(lines.some((l) => l.startsWith('PIP: '))).toBe(true);
    expect(lines.some((l) => l.startsWith('TAMSIN: '))).toBe(false);
  });

  it('has no scene when nobody is leaving, and never says goodbye twice', () => {
    expect(partySplit([]).lines).toEqual([]);
    expect(partySplit(['met:pip', leftFlag('pip')]).leaving).toEqual([]);
  });

  it('stops whoever left from walking the World; the rest stay', () => {
    const flags = PARTING.map((p) => leftFlag(p.id));
    const walkers = walkersFor(DEFAULT_PARTY, everyone, flags);
    expect([...walkers].sort()).toEqual([...STARTERS].sort());
  });
});
