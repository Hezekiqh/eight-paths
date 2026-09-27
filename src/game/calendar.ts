import { addDays, dayOfWeek } from './dates';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** 'YYYY-MM' for a date key. */
export const monthOf = (date: string) => date.slice(0, 7);

/** The month `delta` months from `month`. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** "September 2026" */
export function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/**
 * The month as calendar rows, Sunday first. Days from the neighbouring
 * months are null, so the first and last rows can be part-empty.
 */
export function monthWeeks(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const days: (string | null)[] = Array(dayOfWeek(first)).fill(null);
  for (let d = first; monthOf(d) === month; d = addDays(d, 1)) days.push(d);
  while (days.length % 7) days.push(null);
  return Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
}
