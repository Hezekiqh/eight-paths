import type { Completion } from './types';

/** Past days, with two or more timed quests, looked back over to learn the order the player does them in. */
export const HABIT_ORDER_DAYS = 14;

/**
 * Where each quest usually falls in the player's day: 0 when it's always done
 * first, 1 when it's always done last. Learned from the last 14 past days with
 * at least two timed completions (a lone quest says nothing about order), and
 * averaged over the days each quest was done. Today is left out, so the list
 * holds still while the player works through it and settles into the new
 * order tomorrow. Quests with nothing to learn from are missing from the map.
 */
export function habitOrder(completions: Completion[], today: string): Map<string, number> {
  const byDay = new Map<string, Completion[]>();
  for (const c of completions) {
    if (c.at === undefined || c.date >= today) continue;
    const day = byDay.get(c.date);
    if (day) day.push(c);
    else byDay.set(c.date, [c]);
  }

  const totals = new Map<string, { sum: number; days: number }>();
  const recent = [...byDay.entries()]
    .filter(([, day]) => day.length >= 2)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, HABIT_ORDER_DAYS);
  for (const [, day] of recent) {
    // Stable sort: quests done in the same minute keep the order they were tapped.
    const ordered = [...day].sort((a, b) => a.at! - b.at!);
    ordered.forEach((c, i) => {
      const total = totals.get(c.questId) ?? { sum: 0, days: 0 };
      total.sum += i / (ordered.length - 1);
      total.days += 1;
      totals.set(c.questId, total);
    });
  }
  return new Map([...totals].map(([id, { sum, days }]) => [id, sum / days]));
}

/**
 * Sorts by learned position, earliest first. Items with nothing learned yet
 * go after the rest, keeping their original order.
 */
export function sortByHabitOrder<T>(items: T[], positionOf: (item: T) => number | undefined): T[] {
  const rank = (item: T) => positionOf(item) ?? Infinity;
  return [...items].sort((a, b) => rank(a) - rank(b) || 0);
}
