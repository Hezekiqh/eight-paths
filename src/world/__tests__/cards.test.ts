import { CARD_HIGH, deal, scored, winnerOf } from '../cards';

describe('cards with the Keeper', () => {
  it('deals each of you a card from 1 to 9', () => {
    let i = 0;
    const rolls = [0, 0.999];
    expect(deal(() => rolls[i++])).toEqual({ keeper: 1, you: CARD_HIGH });
  });

  it('gives the hand to the high card, and nobody a point for a draw', () => {
    expect(winnerOf({ keeper: 7, you: 5 })).toBe('keeper');
    expect(winnerOf({ keeper: 4, you: 8 })).toBe('you');
    expect(winnerOf({ keeper: 6, you: 6 })).toBe('draw');
    const start = { keeper: 0, you: 0 };
    expect(scored(start, { keeper: 4, you: 8 })).toEqual({ keeper: 0, you: 1 });
    expect(scored(start, { keeper: 6, you: 6 })).toEqual(start);
  });
});
