import { DEFAULT_PARTY } from '@/story/companions';

import { walkersFor, worldHero } from '../hero';

describe('worldHero', () => {
  it('starts everyone as Brannoc until they pick someone', () => {
    expect(worldHero(null, DEFAULT_PARTY, 'intellectual')).toBe('brannoc');
  });

  it("walks with your class's companion when Brannoc can't walk for the Warriors", () => {
    const party = { ...DEFAULT_PARTY, physical: 'tobin' as const };
    // Tobin has no overworld art, so Brannoc still walks for the Warriors: he's who you start as.
    expect(worldHero(null, party, 'intellectual')).toBe('brannoc');
  });

  it('walks with the party member you picked', () => {
    expect(worldHero(DEFAULT_PARTY.social, DEFAULT_PARTY, 'physical')).toBe(DEFAULT_PARTY.social);
  });

  it("keeps a Path's core companion walking when that Path's slot has no overworld art", () => {
    // So every Path's jobs stay doable: Pip still walks for the Bards while Marigold has no sprite.
    const party = { ...DEFAULT_PARTY, social: 'marigold' as const };
    expect(worldHero(DEFAULT_PARTY.social, party, 'physical')).toBe(DEFAULT_PARTY.social);
    expect(walkersFor(party)).toContain(DEFAULT_PARTY.social);
  });

  it('falls back when the pick can no longer walk for their Path', () => {
    // Hoot walks for the Mages now, so Quill steps back.
    const party = { ...DEFAULT_PARTY, intellectual: 'hoot' as const };
    expect(worldHero(DEFAULT_PARTY.intellectual, party, 'physical')).toBe(DEFAULT_PARTY.physical);
  });

  it('falls back to a core companion when your class slot has no overworld art', () => {
    const party = { ...DEFAULT_PARTY, physical: 'dessa' as const };
    expect(worldHero(null, party, 'physical')).toBe(DEFAULT_PARTY.physical);
  });
});
