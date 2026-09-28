import { pickGifts } from './rewards';

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
