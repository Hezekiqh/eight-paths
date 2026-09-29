import { usualReminderTime } from '../usual-time';
import { done } from './helpers';

const at = (date: string, time: string) => {
  const [h, m] = time.split(':').map(Number);
  return { ...done(date), at: h * 60 + m };
};

const days = (times: string[]) => times.map((t, i) => at(`2026-09-${String(10 + i).padStart(2, '0')}`, t));

describe('usualReminderTime', () => {
  it('waits for 5 timed days before replacing the set time', () => {
    expect(usualReminderTime(days(['19:00', '19:00', '19:00', '19:00']))).toBeNull();
    expect(usualReminderTime(days(['19:00', '19:00', '19:00', '19:00', '19:00']))).toBe('18:30');
  });

  it('ignores completions from before times were saved', () => {
    const old = [done('2026-09-01'), done('2026-09-02'), done('2026-09-03'), done('2026-09-04')];
    expect(usualReminderTime([...old, at('2026-09-05', '19:00')])).toBeNull();
  });

  it("uses each day's first quest, so a late second quest doesn't drag it later", () => {
    const first = days(['07:10', '07:20', '07:00', '07:15', '07:05']);
    const later = first.map((c) => ({ ...c, id: `${c.id}-late`, at: 23 * 60 }));
    expect(usualReminderTime([...later, ...first])).toBe('08:00');
  });

  it('takes the median, so one odd night barely moves it, rounded to 5 minutes', () => {
    expect(usualReminderTime(days(['20:00', '20:10', '20:20', '20:30', '03:00']))).toBe('19:40');
    expect(usualReminderTime(days(['20:02', '20:03', '20:04', '20:06', '20:09', '20:11']))).toBe('19:35');
  });

  it('only looks at the last 14 timed days', () => {
    const old = days(['06:00', '06:00', '06:00', '06:00', '06:00']).map((c) => ({ ...c, date: c.date.replace('09', '08') }));
    const recent = Array.from({ length: 14 }, (_, i) => at(`2026-09-${String(10 + i)}`, '18:00'));
    expect(usualReminderTime([...old, ...recent])).toBe('17:30');
  });

  it('stays between 8 AM and 9:30 PM, leaving room for the last call', () => {
    expect(usualReminderTime(days(['06:00', '06:00', '06:00', '06:00', '06:00']))).toBe('08:00');
    expect(usualReminderTime(days(['23:30', '23:30', '23:30', '23:30', '23:30']))).toBe('21:30');
  });
});
