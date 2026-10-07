import { DEFAULT_PARTY, ROSTER, type CharacterId } from '@/story/companions';

import { initialData, pickData, useGameStore } from '../index';
import { migrateSave } from '../migrations';
import { applyTradeMoves, earnedCopies, type TradeMove } from '../trades';

// A non-core hero on the physical Path, to trade.
const hero = ROSTER.find((c) => c.kind !== 'core' && c.dimension === 'physical')!.id;
const other = ROSTER.find((c) => c.kind !== 'core' && c.dimension === 'social')!.id;

const base = {
  owned: { [hero]: 2 } as Partial<Record<CharacterId, number>>,
  party: DEFAULT_PARTY,
  drops: [] as CharacterId[],
  redrawn: [] as CharacterId[],
  traded: {},
  tradeMoves: [] as number[],
};

const move = (id: number, characterId: CharacterId, delta: 1 | -1): TradeMove => ({ id, characterId, delta });

describe('applyTradeMoves', () => {
  it('returns null when every move has been applied', () => {
    expect(applyTradeMoves({ ...base, tradeMoves: [1] }, [move(1, hero, -1)])).toBeNull();
    expect(applyTradeMoves(base, [])).toBeNull();
  });

  it('takes a copy away and remembers the move', () => {
    const out = applyTradeMoves(base, [move(1, hero, -1)])!;
    expect(out.owned).toEqual({ [hero]: 1 });
    expect(out.traded).toEqual({ [hero]: -1 });
    expect(out.tradeMoves).toEqual([1]);
  });

  it('brings a copy in to hatch, not redoable', () => {
    const out = applyTradeMoves(base, [move(1, other, 1)])!;
    expect(out.owned).toEqual({ [hero]: 2, [other]: 1 });
    expect(out.drops).toEqual([other]);
    expect(out.redrawn).toEqual([other]);
    expect(out.traded).toEqual({ [other]: 1 });
  });

  it('puts the core companion back when the last copy of a party hero leaves', () => {
    const state = { ...base, owned: { [hero]: 1 }, party: { ...DEFAULT_PARTY, physical: hero } };
    const out = applyTradeMoves(state, [move(1, hero, -1)])!;
    expect(out.owned).toEqual({});
    expect(out.party!.physical).toBe(DEFAULT_PARTY.physical);
  });

  it('never leaves more waiting hatches than copies', () => {
    const state = { ...base, owned: { [hero]: 1 }, drops: [hero], redrawn: [hero] };
    const out = applyTradeMoves(state, [move(1, hero, -1)])!;
    expect(out.drops).toEqual([]);
    expect(out.redrawn).toEqual([]);
  });

  it("can't take a copy the save doesn't have, and records only what changed", () => {
    const out = applyTradeMoves({ ...base, owned: {} }, [move(1, hero, -1)])!;
    expect(out.owned).toEqual({});
    expect(out.traded).toEqual({});
    expect(out.tradeMoves).toEqual([1]);
  });

  it('ignores moves for heroes this build does not know', () => {
    expect(applyTradeMoves(base, [move(1, 'not-a-hero' as CharacterId, 1)])).toBeNull();
  });
});

describe('earnedCopies', () => {
  it('counts hatched copies the player woke, not waiting or traded ones', () => {
    expect(earnedCopies({ owned: { [hero]: 3, [other]: 1 }, drops: [hero], traded: { [other]: 1 } })).toEqual({
      [hero]: 2,
    });
  });

  it('is unchanged by trading a copy away', () => {
    const out = applyTradeMoves(base, [move(1, hero, -1)])!;
    expect(earnedCopies({ owned: out.owned!, drops: out.drops!, traded: out.traded! })).toEqual({ [hero]: 2 });
  });
});

describe('trades and backups', () => {
  beforeEach(() => useGameStore.setState(initialData));

  it('replays a trade when a backup from before it is restored', () => {
    useGameStore.setState({ player: { ...playerStub }, owned: { [hero]: 1 } });
    const backup = useGameStore.getState().exportSave();

    const moves = [move(7, hero, -1)];
    useGameStore.getState().applyTradeMoves(moves);
    expect(useGameStore.getState().owned).toEqual({});

    expect(useGameStore.getState().importSave(backup)).toEqual({ ok: true });
    expect(useGameStore.getState().owned).toEqual({ [hero]: 1 });
    // The next sync with the server takes the copy away again.
    useGameStore.getState().applyTradeMoves(moves);
    expect(useGameStore.getState().owned).toEqual({});
    expect(useGameStore.getState().tradeMoves).toEqual([7]);
  });

  it('keeps trades in the save and starts old saves with none', () => {
    const data = { ...pickData(initialData), traded: { [hero]: -1 }, tradeMoves: [3] };
    expect(migrateSave(data, 11)).toMatchObject({ traded: { [hero]: -1 }, tradeMoves: [3] });
    expect(migrateSave({ ...data, traded: undefined, tradeMoves: undefined }, 10)).toMatchObject({
      traded: {},
      tradeMoves: [],
    });
    expect(migrateSave({ ...data, traded: { [hero]: 0, nobody: 2 }, tradeMoves: [1.5, 'x', 4] }, 11)).toMatchObject({
      traded: {},
      tradeMoves: [4],
    });
  });
});

const playerStub = {
  name: 'Ada',
  classDimension: 'physical' as const,
  restTokens: 1,
  onboardedAt: '2026-09-30',
  tutorialComplete: true,
  notificationTime: '20:00',
  hapticsEnabled: true,
  objectivesLandscape: false,
  smartReminders: true,
  dayReminders: 'bookends' as const,
};
