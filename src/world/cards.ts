// Cards with the Keeper, in the Archive: one card each, high card takes the
// hand, and it goes on as long as you're happy to stand there.

export type Hand = { keeper: number; you: number };
export type Winner = 'keeper' | 'you' | 'draw';

/** Card values run 1 to 9. */
export const CARD_HIGH = 9;
/** Hands on the table before they're swept up and dealt again. */
export const HANDS_ON_TABLE = 3;

/** Seconds into each hand: dealt face down, turned over, then the winner known; the next deal follows. */
export const CARD_TIMING = { flip: 0.9, result: 1.5, next: 2.6 } as const;

export function deal(random: () => number = Math.random): Hand {
  const card = () => 1 + Math.floor(random() * CARD_HIGH);
  return { keeper: card(), you: card() };
}

export function winnerOf(hand: Hand): Winner {
  if (hand.keeper === hand.you) return 'draw';
  return hand.keeper > hand.you ? 'keeper' : 'you';
}

export type Score = { keeper: number; you: number };

export function scored(score: Score, hand: Hand): Score {
  const w = winnerOf(hand);
  return w === 'draw' ? score : { ...score, [w]: score[w] + 1 };
}
