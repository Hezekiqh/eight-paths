import { MENU_ROWS } from './menu';

// "Leave it to..." (author, Oct 4, 2026): instead of a fixed answer per Path, a decision menu has one
// row that opens a list of the core eight, and whoever you pick steps out and handles it their own way.
// The list is a menu too, so four rows at most: three heroes at a time, then "More..." (or, on the
// last page, "Never mind." back to the first menu).

/** The row in a decision menu that opens the hero list. */
export const LEAVE_IT_TO = 'Leave it to...';
export const MORE = 'More...';
export const NEVER_MIND = 'Never mind.';
/** Heroes on one page of the list, leaving a row for More... or Never mind. */
export const PER_PAGE = MENU_ROWS - 1;

/** Ones who can do it first (in the order given), then the greyed-out ones. */
export function heroOrder<T extends { locked?: string }>(heroes: T[]): T[] {
  return [...heroes.filter((h) => !h.locked), ...heroes.filter((h) => h.locked)];
}

/** One page of the hero list, and whether it's the last (its last row is Never mind., not More...). */
export function heroPage<T>(heroes: T[], page: number): { shown: T[]; last: boolean } {
  const pages = Math.max(1, Math.ceil(heroes.length / PER_PAGE));
  const p = Math.min(Math.max(0, page), pages - 1);
  return { shown: heroes.slice(p * PER_PAGE, (p + 1) * PER_PAGE), last: p === pages - 1 };
}
