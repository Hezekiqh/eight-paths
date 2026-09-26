import { REMINDER_MESSAGES, planReminders } from '../reminders';

const today = '2026-09-26';
const noon = 12 * 60;

describe('planReminders', () => {
  it('schedules today and the next two weeks at the chosen time', () => {
    const plans = planReminders(today, '20:30', false, noon);
    expect(plans).toHaveLength(15);
    expect(plans[0]).toMatchObject({ date: today, hour: 20, minute: 30 });
    expect(plans[14].date).toBe('2026-10-10');
  });

  it('skips today once the player has completed a quest', () => {
    const plans = planReminders(today, '20:00', true, noon);
    expect(plans[0].date).toBe('2026-09-27');
    expect(plans).toHaveLength(14);
  });

  it('skips today once the reminder time has passed', () => {
    expect(planReminders(today, '20:00', false, 20 * 60)[0].date).toBe('2026-09-27');
    expect(planReminders(today, '20:00', false, 20 * 60 - 1)[0].date).toBe(today);
  });

  it('uses supportive copy from the message list', () => {
    for (const plan of planReminders(today, '20:00', false, noon)) {
      expect(REMINDER_MESSAGES).toContain(plan.body);
    }
  });
});
