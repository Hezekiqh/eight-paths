import { habitOrder, sortByHabitOrder } from '../habit-order';
import { done } from './helpers';

const at = (date: string, questId: string, time: string) => {
  const [h, m] = time.split(':').map(Number);
  return { ...done(date, 'physical', questId), at: h * 60 + m };
};

const TODAY = '2026-09-29';

describe('habitOrder', () => {
  it('puts the quest done first at 0 and the one done last at 1', () => {
    const order = habitOrder(
      [at('2026-09-28', 'read', '21:00'), at('2026-09-28', 'run', '07:00'), at('2026-09-28', 'water', '12:00')],
      TODAY,
    );
    expect(order.get('run')).toBe(0);
    expect(order.get('water')).toBe(0.5);
    expect(order.get('read')).toBe(1);
  });

  it('averages over the days, so one odd day only nudges a habit', () => {
    const order = habitOrder(
      [
        at('2026-09-26', 'run', '07:00'),
        at('2026-09-26', 'read', '21:00'),
        at('2026-09-27', 'run', '07:00'),
        at('2026-09-27', 'read', '21:00'),
        at('2026-09-28', 'read', '06:00'),
        at('2026-09-28', 'run', '18:00'),
      ],
      TODAY,
    );
    expect(order.get('run')).toBeCloseTo(1 / 3);
    expect(order.get('read')).toBeCloseTo(2 / 3);
  });

  it('leaves today out, so the list holds still while the player works through it', () => {
    const order = habitOrder([at(TODAY, 'read', '06:00'), at(TODAY, 'run', '07:00')], TODAY);
    expect(order.size).toBe(0);
  });

  it('ignores days with a single quest and completions without a time', () => {
    const order = habitOrder([at('2026-09-27', 'run', '07:00'), done('2026-09-28', 'physical', 'read'), done('2026-09-28')], TODAY);
    expect(order.size).toBe(0);
  });

  it('keeps the tap order for quests done in the same minute', () => {
    const order = habitOrder([at('2026-09-28', 'read', '07:00'), at('2026-09-28', 'run', '07:00')], TODAY);
    expect(order.get('read')).toBe(0);
    expect(order.get('run')).toBe(1);
  });

  it('only looks at the last 14 days that have an order', () => {
    const old = Array.from({ length: 5 }, (_, i) => [
      at(`2026-08-0${i + 1}`, 'read', '06:00'),
      at(`2026-08-0${i + 1}`, 'run', '07:00'),
    ]).flat();
    const recent = Array.from({ length: 14 }, (_, i) => [
      at(`2026-09-${10 + i}`, 'run', '06:00'),
      at(`2026-09-${10 + i}`, 'read', '07:00'),
    ]).flat();
    const order = habitOrder([...old, ...recent], TODAY);
    expect(order.get('run')).toBe(0);
    expect(order.get('read')).toBe(1);
  });
});

describe('sortByHabitOrder', () => {
  it('sorts learned items first and keeps unlearned ones in their original order', () => {
    const order = new Map([
      ['c', 0.2],
      ['a', 0.9],
    ]);
    expect(sortByHabitOrder(['new1', 'a', 'new2', 'c'], (id) => order.get(id))).toEqual(['c', 'a', 'new1', 'new2']);
  });
});
