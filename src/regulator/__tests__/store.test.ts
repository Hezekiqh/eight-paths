import { DAILY_DRAIN_CAP, MAX_HP, POTION_TO, hpEvents, simulateHp, surveyDue } from '@/game/regulator';

import { allStimuli, selectedStimuli, useRegulator } from '../store';

const today = '2026-10-07';
const yesterday = '2026-10-06';

/** The bar right now, as the hooks work it out. */
function hpNow(now = Date.now()) {
  const s = useRegulator.getState();
  const events = hpEvents({
    startAt: s.startAt!,
    reports: s.reports,
    reportedAt: s.reportedAt,
    stimuli: allStimuli(s.custom),
    mode: s.mode,
    habits: [],
  });
  return simulateHp(s.startAt!, Math.max(now, events.at(-1)?.at ?? 0), events);
}

beforeEach(() => useRegulator.getState().reset());

describe('the Dopamine Regulator, start to finish', () => {
  it('is off, and asks nothing, until the introduction is finished', () => {
    const s = useRegulator.getState();
    expect(s.enabled).toBe(false);
    expect(s.onboarded).toBe(false);
    expect(surveyDue(s.start, today, s.reports)).toBeNull();
  });

  it('switches on after the introduction, and asks about yesterday', () => {
    useRegulator.getState().setSelected(['adult', 'sugar']);
    useRegulator.getState().finishOnboarding(yesterday);
    const s = useRegulator.getState();
    expect(s.enabled && s.onboarded).toBe(true);
    expect(s.startAt).not.toBeNull();
    expect(surveyDue(s.start, today, s.reports)).toBe(yesterday);
    expect(hpNow().hp).toBe(MAX_HP);
  });

  it('takes the check-in at once, and stops asking', () => {
    useRegulator.getState().setSelected(['adult', 'sugar']);
    useRegulator.getState().finishOnboarding(yesterday);
    useRegulator.getState().report(yesterday, { adult: 1, sugar: 0 });
    const s = useRegulator.getState();
    expect(surveyDue(s.start, today, s.reports)).toBeNull();
    expect(hpNow().hp).toBe(MAX_HP - 20);
  });

  it('keeps the first answer time when an answer is changed', () => {
    useRegulator.getState().finishOnboarding(yesterday);
    useRegulator.getState().report(yesterday, { sugar: 1 });
    const first = useRegulator.getState().reportedAt[yesterday];
    useRegulator.getState().report(yesterday, { sugar: 0 });
    expect(useRegulator.getState().reportedAt[yesterday]).toBe(first);
    expect(useRegulator.getState().reports[yesterday]).toEqual({ sugar: 0 });
  });

  it('caps a heavy Hard-mode day, and the potion catches it', () => {
    useRegulator.getState().setMode('hard');
    useRegulator.getState().setSelected(['adult']);
    useRegulator.getState().finishOnboarding(yesterday);
    useRegulator.getState().report(yesterday, { adult: 50 });
    expect(useRegulator.getState().reports[yesterday].adult).toBe(20);
    expect(MAX_HP - DAILY_DRAIN_CAP).toBeLessThan(20);
    expect(hpNow()).toEqual({ hp: POTION_TO, potions: 1 });
  });

  it('names custom stimuli, picks them, and removes them', () => {
    const own = useRegulator.getState().addCustom('  Online shopping  ', 14);
    expect(own).toMatchObject({ name: 'Online shopping', severity: 10, custom: true });
    const { selected, custom } = useRegulator.getState();
    expect(selectedStimuli(selected, custom).map((s) => s.id)).toContain(own.id);
    useRegulator.getState().removeCustom(own.id);
    expect(useRegulator.getState().selected).not.toContain(own.id);
  });

  it('erases everything back to off', () => {
    useRegulator.getState().finishOnboarding(yesterday);
    useRegulator.getState().report(yesterday, { sugar: 1 });
    useRegulator.getState().setPotionsSeen(2);
    useRegulator.getState().reset();
    const s = useRegulator.getState();
    expect([s.enabled, s.onboarded, s.start, s.startAt, s.potionsSeen]).toEqual([false, false, null, null, 0]);
    expect(s.reports).toEqual({});
  });
});
