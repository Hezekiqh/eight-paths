import { addDays } from '../dates';
import { KEEPER_LINES, fillLine } from '../keeper';
import {
  MAX_PENDING_REMINDERS,
  STORY_DAYS,
  WEEKLY_FROM,
  dayCallSlots,
  groupForMissed,
  lineWeight,
  planReminders,
  type PathFacts,
  type ReminderInput,
} from '../reminders';
import { quest } from './helpers';

const today = '2026-09-26'; // a Saturday
const noon = 12 * 60;

function input(overrides: Partial<ReminderInput> = {}): ReminderInput {
  return {
    today,
    minutesNow: noon,
    notificationTime: '20:30',
    name: 'Hez',
    quests: [quest()],
    doneToday: [],
    lastActive: addDays(today, -1),
    onboardedAt: '2026-09-01',
    restTokens: 1,
    restTokensTomorrow: 0,
    restDays: [],
    streak: 0,
    daysShownUp: 10,
    nextMilestone: 14,
    paths: [],
    heroes: ['Brannoc', 'Kira', 'Moss'],
    sleeping: 90,
    ...overrides,
  };
}

const byMissed = (plans: ReturnType<typeof planReminders>) => new Map(plans.map((p) => [p.missed, p]));

describe('groupForMissed', () => {
  it('walks the ladder: usual, day after, away, cocoon, vigil, story, weekly', () => {
    expect(groupForMissed(0)).toBe('usual');
    expect(groupForMissed(1)).toBe('rested');
    expect([2, 3, 4, 6].map(groupForMissed)).toEqual(['away', 'away', 'away', 'away']);
    expect(groupForMissed(5)).toBe('cocoon');
    expect(groupForMissed(7)).toBe('vigil');
    for (const day of STORY_DAYS) expect(groupForMissed(day)).toBe('story');
    expect(groupForMissed(WEEKLY_FROM)).toBe('weekly');
    expect(groupForMissed(WEEKLY_FROM + 7)).toBe('weekly');
    expect([8, 9, 11, 13, WEEKLY_FROM + 1].map(groupForMissed)).toEqual([null, null, null, null, null]);
  });
});

describe('planReminders', () => {
  it('calls today at the chosen time, from the Keeper, when the player played yesterday', () => {
    const [first] = planReminders(input());
    expect(first).toMatchObject({ date: today, hour: 20, minute: 30, missed: 0, group: 'usual' });
  });

  it('skips today once the player has played, and starts tomorrow as a usual call', () => {
    const [first] = planReminders(input({ lastActive: today }));
    expect(first).toMatchObject({ date: addDays(today, 1), missed: 0 });
    expect(['usual', 'personal']).toContain(first.group);
  });

  it('skips today once the reminder time has passed', () => {
    expect(planReminders(input({ minutesNow: 20 * 60 + 30 }))[0].date).toBe(addDays(today, 1));
    expect(planReminders(input({ minutesNow: 20 * 60 + 29 }))[0].date).toBe(today);
  });

  it('never goes silent: the vigil, every story drop, then weekly until the queue is full', () => {
    const plans = planReminders(input());
    const missed = byMissed(plans);
    expect(missed.get(7)?.group).toBe('vigil');
    expect(STORY_DAYS.map((d) => missed.get(d)?.lineId)).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    expect(missed.get(WEEKLY_FROM)?.group).toBe('weekly');
    expect(plans).toHaveLength(MAX_PENDING_REMINDERS);
    const weekly = plans.filter((p) => p.group === 'weekly');
    expect(weekly.length).toBeGreaterThan(40);
    // Eight weekly lines, and none repeats until all have been used.
    expect(new Set(weekly.slice(0, 8).map((p) => p.lineId)).size).toBe(8);
  });

  it('says a rest token saved the streak when one is left for the missed day', () => {
    const plans = planReminders(input({ restTokens: 1 }));
    expect(byMissed(plans).get(1)?.group).toBe('rested');
  });

  it('says the streak reset, kindly, when no token is left', () => {
    const plans = planReminders(input({ restTokens: 0 }));
    expect(byMissed(plans).get(1)?.group).toBe('reset');
  });

  it('reads a missed day already settled from the rest days', () => {
    const lastActive = addDays(today, -2);
    const covered = planReminders(
      input({ lastActive, restTokens: 0, restDays: [{ date: addDays(today, -1), dimension: 'all' }] }),
    );
    expect(covered[0]).toMatchObject({ date: today, missed: 1, group: 'rested' });
    expect(planReminders(input({ lastActive, restTokens: 3 }))[0]).toMatchObject({ missed: 1, group: 'reset' });
  });

  it("doesn't talk about streaks before the first quest is ever done", () => {
    const plans = planReminders(input({ lastActive: null, onboardedAt: today }));
    expect(plans[0]).toMatchObject({ date: today, missed: 0 });
    expect(['usual', 'personal']).toContain(byMissed(plans).get(1)?.group);
    expect(plans.some((p) => ['rested', 'reset', 'lastCall'].includes(p.group))).toBe(false);
  });

  it('names a different hero on each day away, and saves e4 for the third day', () => {
    const plans = planReminders(input());
    const away = plans.filter((p) => p.group === 'away');
    expect(away.map((p) => p.missed)).toEqual([2, 3, 4, 6]);
    expect(byMissed(plans).get(3)?.lineId).toBe('e4');
    expect(new Set(away.map((p) => p.lineId)).size).toBe(4);
  });

  it('falls back to plain calls when there are no heroes to name', () => {
    const plans = planReminders(input({ heroes: [] }));
    expect(plans.some((p) => p.group === 'away')).toBe(false);
    expect(['usual', 'personal']).toContain(byMissed(plans).get(2)?.group);
    expect(plans.every((p) => !p.body.includes('{'))).toBe(true);
  });

  it('skips first-week days with nothing due, but not the vigil or later calls', () => {
    // Weekdays only. Today is Saturday; the vigil (7 days away) lands on Saturday 3 Oct.
    const plans = planReminders(input({ quests: [quest({ repeatDays: [1, 2, 3, 4, 5] })] }));
    const dates = plans.map((p) => p.date);
    expect(dates).not.toContain('2026-09-26');
    expect(dates).not.toContain('2026-09-27');
    expect(plans[0]).toMatchObject({ date: '2026-09-28', missed: 2, group: 'away' });
    expect(byMissed(plans).get(7)).toMatchObject({ date: '2026-10-03', group: 'vigil' });
  });

  it('keeps weekly and story calls even when no quest is ever due', () => {
    const plans = planReminders(input({ quests: [] }));
    expect(plans.every((p) => p.missed >= 7)).toBe(true);
    expect(plans[0].group).toBe('vigil');
  });

  it('fills every blank it sends', () => {
    for (const plan of planReminders(input())) expect(plan.body).not.toMatch(/[{}]/);
  });
});

const mage: PathFacts = {
  dimension: 'physical',
  name: 'Warrior',
  nextLevel: 12,
  xpToLevel: 10,
  xpPerQuestToday: 10,
  xpPerQuest: 10,
  cocoonAtNextLevel: false,
};

/** Every usual-time line the planner could send for this input, across many days. */
function personalIds(overrides: Partial<ReminderInput>): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < 60; i += 1) {
    const day = addDays(today, i);
    const [first] = planReminders(input({ today: day, lastActive: addDays(day, -1), ...overrides }));
    if (first?.missed === 0) ids.add(first.lineId);
  }
  return ids;
}

describe('personal calls (N2)', () => {
  it('talks about a streak only once it is 3 days or more', () => {
    expect([...personalIds({ streak: 2 })].some((id) => ['b1', 'b2', 'b3'].includes(id))).toBe(false);
    expect(personalIds({ streak: 5 }).has('b1')).toBe(true);
    expect(personalIds({ streak: 5 }).has('b2')).toBe(false);
    expect(personalIds({ streak: 8 }).has('b2')).toBe(true);
  });

  it('says the streak is safe "only until midnight" even with tokens, since they never save the day', () => {
    expect(personalIds({ streak: 5, restTokens: 1 }).has('b3')).toBe(true);
    expect(personalIds({ streak: 5, restTokens: 0 }).has('b3')).toBe(true);
    expect(personalIds({ streak: 5, lastActive: today }).has('b3')).toBe(false);
  });

  it('names a level one quest away, but not when the daily cap stops the XP', () => {
    const ids = personalIds({ paths: [mage] });
    expect(['b4', 'b5', 'b6'].some((id) => ids.has(id))).toBe(true);
    const capped = personalIds({ paths: [{ ...mage, xpPerQuestToday: 0 }] });
    expect(['b4', 'b5', 'b6'].some((id) => capped.has(id))).toBe(false);
    const far = personalIds({ paths: [{ ...mage, xpToLevel: 20 }] });
    expect(['b4', 'b5', 'b6'].some((id) => far.has(id))).toBe(false);
  });

  it('teases a cocoon only when the next level brings one', () => {
    const ids = personalIds({ paths: [{ ...mage, cocoonAtNextLevel: true }] });
    expect(['b7', 'b8', 'b9'].some((id) => ids.has(id))).toBe(true);
    expect(['b7', 'b8', 'b9'].some((id) => personalIds({ paths: [mage] }).has(id))).toBe(false);
  });

  it('lists the quests still left, leaving out ones done today', () => {
    const two = [quest(), quest({ id: 'q2', title: 'Drink water' })];
    const plans = Array.from({ length: 30 }, (_, i) =>
      planReminders(input({ today: addDays(today, i), lastActive: addDays(today, i - 1), quests: two }))[0],
    );
    const b11 = plans.find((p) => p.lineId === 'b11');
    expect(b11?.body).toBe('2 quests left today: Move 30 min and Drink water. Start with the easy one.');
    const one = personalIds({ quests: two, doneToday: ['q1'] });
    expect(one.has('b11')).toBe(false);
    expect(['b10', 'b12'].some((id) => one.has(id))).toBe(true);
  });

  it('counts down to a milestone 2 or 3 days out', () => {
    expect(personalIds({ daysShownUp: 12, nextMilestone: 14 }).has('b14')).toBe(true);
    expect(personalIds({ daysShownUp: 11, nextMilestone: 14 }).has('b13')).toBe(true);
    expect(personalIds({ daysShownUp: 11, nextMilestone: 14 }).has('b14')).toBe(false);
    const near = personalIds({ daysShownUp: 13, nextMilestone: 14 });
    expect(near.has('b13') || near.has('b14')).toBe(false);
  });

  it('still sends plain lines some nights, so it never nags about one thing', () => {
    const ids = personalIds({ streak: 10, paths: [mage] });
    expect([...ids].some((id) => id.startsWith('a'))).toBe(true);
  });
});

describe('the last call (N2)', () => {
  const lastCalls = (plans: ReturnType<typeof planReminders>) => plans.filter((p) => p.group === 'lastCall');

  it('knocks at 10:30 PM, time-sensitive, when the streak has no token to save it', () => {
    const plans = planReminders(input({ streak: 14, restTokens: 0, restTokensTomorrow: 0 }));
    const [call] = lastCalls(plans);
    expect(call).toMatchObject({ date: today, hour: 22, minute: 30, timeSensitive: true, missed: 0 });
    expect(call.body).toContain('14');
    // Only once: after tonight the streak is gone.
    expect(lastCalls(plans)).toHaveLength(1);
    // Every other call waits politely.
    expect(plans.filter((p) => p.timeSensitive)).toHaveLength(1);
  });

  it('knocks tonight even with rest tokens (they save habits, not the day), never saying none are left', () => {
    const plans = planReminders(input({ streak: 14, restTokens: 2, restTokensTomorrow: 1 }));
    // A day away ends the streak, so there's only tonight to knock for.
    expect(lastCalls(plans).map((p) => p.date)).toEqual([today]);
    for (let i = 0; i < 40; i += 1) {
      const day = addDays(today, i);
      const knock = lastCalls(planReminders(input({ today: day, lastActive: addDays(day, -1), streak: 14, restTokens: 2 })));
      expect(knock.map((p) => p.lineId)).not.toContain('c5');
    }
  });

  it('knocks tomorrow when today is played and no token is left', () => {
    const plans = planReminders(input({ lastActive: today, streak: 5, restTokens: 0, restTokensTomorrow: 0 }));
    expect(lastCalls(plans).map((p) => p.date)).toEqual([addDays(today, 1)]);
  });

  it('never knocks for a short streak, a day with nothing due, or after 10:30', () => {
    expect(lastCalls(planReminders(input({ streak: 2, restTokens: 0 })))).toHaveLength(0);
    expect(lastCalls(planReminders(input({ streak: 9, restTokens: 0, quests: [] })))).toHaveLength(0);
    expect(lastCalls(planReminders(input({ streak: 9, restTokens: 0, minutesNow: 22 * 60 + 30 })))).toHaveLength(0);
  });

  it('skips the last call when the usual time is too close to it', () => {
    expect(lastCalls(planReminders(input({ streak: 9, restTokens: 0, notificationTime: '21:30' })))).toHaveLength(1);
    expect(lastCalls(planReminders(input({ streak: 9, restTokens: 0, notificationTime: '21:45' })))).toHaveLength(0);
  });

  it('tells the truth the next morning: reset after a knock, rested while tokens last', () => {
    const reset = planReminders(input({ streak: 9, restTokens: 0 }));
    expect(reset.find((p) => p.missed === 1)?.group).toBe('reset');
    const rested = planReminders(input({ lastActive: today, streak: 9, restTokens: 0, restTokensTomorrow: 1 }));
    expect(rested.find((p) => p.missed === 1)?.group).toBe('rested');
  });
});

describe('learning which lines work (N5)', () => {
  const usualIds = (overrides: Partial<ReminderInput>) =>
    Array.from({ length: 200 }, (_, i) => {
      const day = addDays(today, i);
      return planReminders(input({ today: day, lastActive: addDays(day, -1), ...overrides }))[0].lineId;
    }).filter((id) => /^a\d+$/.test(id));

  it('weights a line by its open rate, starting from an even guess', () => {
    expect(lineWeight(undefined)).toBe(0.5);
    expect(lineWeight({ sends: 10, opens: 8 })).toBe(0.75);
    expect(lineWeight({ sends: 10, opens: 0 })).toBeCloseTo(1 / 12);
  });

  it('picks a line that gets opened far more often than one that never does', () => {
    const ids = usualIds({ lineStats: { a1: { sends: 40, opens: 36 }, a2: { sends: 40, opens: 0 } } });
    const count = (id: string) => ids.filter((x) => x === id).length;
    expect(count('a1')).toBeGreaterThan(count('a2') * 4);
  });

  it('rests lines sent in the last 10 days while others are left', () => {
    const recent = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'];
    expect(new Set(usualIds({ recentLines: recent }))).toEqual(new Set(['a10']));
  });

  it('never repeats a line within one plan until the group runs out', () => {
    const plans = planReminders(input());
    const weekly = plans.filter((p) => p.group === 'weekly').map((p) => p.lineId);
    for (let i = 0; i + 8 <= weekly.length; i += 8) expect(new Set(weekly.slice(i, i + 8)).size).toBe(8);
  });

  it('plans the same line for the same day every time', () => {
    const stats = { lineStats: { a3: { sends: 5, opens: 4 } } };
    expect(planReminders(input(stats))[0].lineId).toBe(planReminders(input(stats))[0].lineId);
  });
});

describe('"Done" buttons (N6)', () => {
  const three = [
    quest(),
    quest({ id: 'q2', title: 'Drink water' }),
    quest({ id: 'q3', title: 'Read 20 min' }),
    quest({ id: 'q4', title: 'Stretch' }),
  ];

  it("offers today's quests still to do, at most three", () => {
    const [first] = planReminders(input({ quests: three, doneToday: ['q1'] }));
    expect(first.questIds).toHaveLength(3);
    expect(first.questIds).not.toContain('q1');
  });

  it('puts the quest the line names first', () => {
    const plans = Array.from({ length: 60 }, (_, i) =>
      planReminders(input({ today: addDays(today, i), lastActive: addDays(today, i - 1), quests: three }))[0],
    );
    const named = plans.find((p) => p.lineId === 'b11');
    expect(named?.questIds.slice(0, 2)).toEqual(['q1', 'q2']);
  });

  it('adds them to the last call, but not to the vigil, story drops or weekly calls', () => {
    const plans = planReminders(input({ streak: 9, restTokens: 0 }));
    expect(plans.find((p) => p.group === 'lastCall')?.questIds).toEqual(['q1']);
    expect(plans.filter((p) => p.missed >= 7).every((p) => p.questIds.length === 0)).toBe(true);
  });
});

describe('quests left, during the day', () => {
  const dayGroups = ['halfTime', 'checkIn', 'nineCall'];
  const dayCalls = (plans: ReturnType<typeof planReminders>) => plans.filter((p) => dayGroups.includes(p.group));
  const at = (plans: ReturnType<typeof planReminders>) => plans.map((p) => `${p.date} ${p.hour}:${p.minute}`);
  const morning = 9 * 60;
  const twoQuests = [quest(), quest({ id: 'q2', title: 'Read 10 pages', dimension: 'intellectual' })];

  it('goes out at noon, every few hours, and 9 PM', () => {
    const hours = (s: Parameters<typeof dayCallSlots>[0]) => dayCallSlots(s).map((x) => x.minutes / 60);
    expect(hours('off')).toEqual([]);
    expect(hours('bookends')).toEqual([12, 21]);
    expect(hours('4')).toEqual([12, 16, 20, 21]);
    expect(hours('2')).toEqual([12, 14, 16, 18, 20, 21]);
    expect(hours('1')).toEqual([12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  });

  it('is off unless chosen', () => {
    expect(dayCalls(planReminders(input({ minutesNow: morning })))).toHaveLength(0);
  });

  it('counts the quests still left today, at half time and the 9 PM last call', () => {
    const plans = dayCalls(
      planReminders(input({ minutesNow: morning, dayReminders: 'bookends', quests: twoQuests, doneToday: ['q1'], lastActive: today })),
    );
    const todays = plans.filter((p) => p.date === today);
    expect(todays.map((p) => [p.group, p.hour])).toEqual([['halfTime', 12], ['nineCall', 21]]);
    for (const p of todays) {
      expect(p.body).toContain('1 quest ');
      expect(p.questIds).toEqual(['q2']);
    }
    // Tomorrow nothing is done yet.
    expect(plans.filter((p) => p.date === addDays(today, 1)).every((p) => p.body.includes('2 quests'))).toBe(true);
  });

  it('stays quiet on a day with every quest done, and only plans today and tomorrow', () => {
    const plans = dayCalls(
      planReminders(input({ minutesNow: morning, dayReminders: '1', doneToday: ['q1'], lastActive: today })),
    );
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((p) => p.date === addDays(today, 1))).toBe(true);
  });

  it('skips the times already past', () => {
    const plans = dayCalls(planReminders(input({ minutesNow: 16 * 60, dayReminders: '2', notificationTime: '08:00' })));
    expect(at(plans.filter((p) => p.date === today))).toEqual([`${today} 18:0`, `${today} 20:0`, `${today} 21:0`]);
  });

  it("doesn't knock twice around the usual call", () => {
    const plans = planReminders(input({ minutesNow: morning, dayReminders: '4', notificationTime: '16:15' }));
    const todays = plans.filter((p) => p.date === today);
    expect(todays.map((p) => p.hour)).toEqual([16, 12, 20, 21]);
  });
});

describe('the Keeper', () => {
  it('has unique line ids', () => {
    const ids = KEEPER_LINES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only fills a line when every blank has a value', () => {
    expect(fillLine('{hero} asked about you.', { hero: 'Kira' })).toBe('Kira asked about you.');
    expect(fillLine('{hero} asked about you.', {})).toBeNull();
    expect(fillLine('{n} quests.', { n: 0 })).toBe('0 quests.');
  });
});
