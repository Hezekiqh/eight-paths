import { DEFAULT_PARTY } from '@/story/companions';

import { worldHero } from '../hero';

describe('worldHero', () => {
  it("walks with your class's companion until you pick someone", () => {
    expect(worldHero(null, DEFAULT_PARTY, 'intellectual')).toBe(DEFAULT_PARTY.intellectual);
  });

  it('walks with the party member you picked', () => {
    expect(worldHero(DEFAULT_PARTY.social, DEFAULT_PARTY, 'physical')).toBe(DEFAULT_PARTY.social);
  });

  it('falls back when the pick has left the party', () => {
    const party = { ...DEFAULT_PARTY, social: 'marigold' as const };
    expect(worldHero(DEFAULT_PARTY.social, party, 'physical')).toBe(DEFAULT_PARTY.physical);
  });

  it('falls back to a core companion when your class slot has no overworld art', () => {
    const party = { ...DEFAULT_PARTY, physical: 'dessa' as const };
    expect(worldHero(null, party, 'physical')).toBe(DEFAULT_PARTY.physical);
  });
});
