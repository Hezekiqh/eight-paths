import { pickFiveStars, pickGifts } from './rewards';

jest.mock('./api', () => ({ collectInviteRewards: jest.fn() }));

describe('pickGifts', () => {
  it('picks distinct locked characters', () => {
    const picked = pickGifts(['a', 'b', 'c', 'd'], 3);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    picked.forEach((id) => expect(['a', 'b', 'c', 'd']).toContain(id));
  });

  it('gives what it can when fewer are locked than earned', () => {
    expect(pickGifts(['a'], 3)).toEqual(['a']);
    expect(pickGifts([], 2)).toEqual([]);
  });

  it('is random but repeatable with a fixed source', () => {
    const first = () => 0;
    expect(pickGifts(['a', 'b', 'c'], 2, first)).toEqual(['a', 'b']);
  });
});

describe('pickFiveStars', () => {
  const e = (id: string, rarity: number, unlocked = false, core = false) => ({ id, rarity, unlocked, core });

  it('only ever gives 5★ heroes, never the core eight', () => {
    const { wake, copies } = pickFiveStars([e('a', 5), e('b', 4), e('c', 1), e('d', 5, false, true)], 3);
    expect([...wake, ...copies].every((id) => id === 'a')).toBe(true);
    expect(wake.length + copies.length).toBe(3);
  });

  it('wakes ones the player is missing first, then gives extra copies', () => {
    expect(pickFiveStars([e('a', 5, true), e('b', 5)], 1, () => 0)).toEqual({ wake: ['b'], copies: [] });
    expect(pickFiveStars([e('a', 5, true)], 2, () => 0)).toEqual({ wake: [], copies: ['a', 'a'] });
  });
});
