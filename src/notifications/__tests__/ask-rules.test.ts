import { EMPTY_ASK_HISTORY, KEEPER_ASK_CARDS, nextKeeperAsk, recordAsk, type AskMoment } from '../ask-rules';

const today = '2026-09-28';
const tomorrow = '2026-09-29';

const moment = (overrides: Partial<AskMoment> = {}): AskMoment => ({
  history: EMPTY_ASK_HISTORY,
  access: 'undecided',
  today,
  hasCompleted: true,
  hatches: 0,
  streak: 1,
  ...overrides,
});

const afterFirst = recordAsk(EMPTY_ASK_HISTORY, 'first', today, 0);

describe('nextKeeperAsk', () => {
  it('asks first right after the first quest, and not before', () => {
    expect(nextKeeperAsk(moment({ hasCompleted: false }))).toBeNull();
    expect(nextKeeperAsk(moment())).toBe('first');
  });

  it('never asks once notifications are fully on, or turned down in the dialog', () => {
    expect(nextKeeperAsk(moment({ access: 'full' }))).toBeNull();
    expect(nextKeeperAsk(moment({ access: 'denied' }))).toBeNull();
  });

  it('still asks a player on quiet delivery', () => {
    expect(nextKeeperAsk(moment({ access: 'quiet' }))).toBe('first');
    expect(nextKeeperAsk(moment({ access: 'quiet', history: afterFirst, today: tomorrow, hatches: 1 }))).toBe('hatch');
  });

  it('asks again after a hatch that came after the last ask, on a later day', () => {
    const already = recordAsk(EMPTY_ASK_HISTORY, 'first', today, 2);
    expect(nextKeeperAsk(moment({ history: already, today: tomorrow, hatches: 2 }))).toBeNull();
    expect(nextKeeperAsk(moment({ history: already, today, hatches: 3 }))).toBeNull();
    expect(nextKeeperAsk(moment({ history: already, today: tomorrow, hatches: 3 }))).toBe('hatch');
  });

  it('asks again at a 7-day streak', () => {
    expect(nextKeeperAsk(moment({ history: afterFirst, today: tomorrow, streak: 6 }))).toBeNull();
    expect(nextKeeperAsk(moment({ history: afterFirst, today: tomorrow, streak: 7 }))).toBe('streak');
  });

  it('asks at most three times, ever', () => {
    let history = afterFirst;
    history = recordAsk(history, 'hatch', tomorrow, 1);
    history = recordAsk(history, 'streak', '2026-10-05', 1);
    expect(nextKeeperAsk(moment({ history, today: '2026-12-01', hatches: 9, streak: 30 }))).toBeNull();
    expect(history.asked).toEqual(['first', 'hatch', 'streak']);
  });
});

describe('the Keeper ask cards', () => {
  it('use the approved j1–j3 lines', () => {
    expect(KEEPER_ASK_CARDS.first).toMatchObject({ id: 'j1', title: 'May I come find you?', yes: 'Yes, find me' });
    expect(KEEPER_ASK_CARDS.hatch.id).toBe('j2');
    expect(KEEPER_ASK_CARDS.streak.id).toBe('j3');
  });
});
