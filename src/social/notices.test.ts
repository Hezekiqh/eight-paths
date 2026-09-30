import { ROSTER, type CharacterId } from '@/story/companions';

import { momentsFrom, useTradeNotices, type MoveRow } from './notices';

const [a, b] = ROSTER.filter((c) => c.kind !== 'core').map((c) => c.id);
const now = Date.parse('2026-10-01T12:00:00Z');
const recent = '2026-10-01T10:00:00Z';

const row = (id: number, characterId: CharacterId, delta: 1 | -1, tradeId: string | null, createdAt = recent): MoveRow => ({
  id,
  characterId,
  delta,
  tradeId,
  createdAt,
});

describe('momentsFrom', () => {
  it('groups moves into one moment per trade', () => {
    const moves = [row(1, a, -1, 't1'), row(2, a, -1, 't1'), row(3, b, 1, 't1'), row(4, b, 1, 't2')];
    expect(momentsFrom(moves, [], { t1: 'bravo' }, now)).toEqual([
      { tradeId: 't1', partner: 'bravo', left: [a, a], arrived: [b] },
      { tradeId: 't2', partner: 'a friend', left: [], arrived: [b] },
    ]);
  });

  it('skips trades already shown, old trades, and moves with no trade', () => {
    const moves = [row(1, a, -1, 't1'), row(2, a, 1, 'old', '2026-09-20T00:00:00Z'), row(3, b, 1, null)];
    expect(momentsFrom(moves, ['t1'], {}, now)).toEqual([]);
  });
});

describe('trade notices', () => {
  beforeEach(() => useTradeNotices.setState({ seenTrades: [], seenOffers: [], moments: [] }));

  it('queues each trade once, and plays them in order', () => {
    const m1 = { tradeId: 't1', partner: 'bravo', left: [a], arrived: [b] };
    const m2 = { tradeId: 't2', partner: 'bravo', left: [b], arrived: [a] };
    const { queueMoments, finishMoment } = useTradeNotices.getState();
    queueMoments([m1]);
    queueMoments([m1, m2]);
    expect(useTradeNotices.getState().moments).toEqual([m1, m2]);
    finishMoment();
    expect(useTradeNotices.getState().moments).toEqual([m2]);
    // Still remembered after playing: a replay never shows it again.
    queueMoments([m1]);
    expect(useTradeNotices.getState().moments).toEqual([m2]);
    expect(useTradeNotices.getState().seenTrades).toEqual(['t1', 't2']);
  });

  it('remembers offers seen', () => {
    useTradeNotices.getState().markOffersSeen(['o1', 'o2']);
    useTradeNotices.getState().markOffersSeen(['o2', 'o3']);
    expect(useTradeNotices.getState().seenOffers).toEqual(['o1', 'o2', 'o3']);
  });
});
