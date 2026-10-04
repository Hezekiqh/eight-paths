/**
 * The most rows a menu shows (author, Oct 4, 2026): questions plus Goodbye. Someone with more to ask
 * shows the first ones you haven't asked yet; ask one and the next takes its place. A decision's choices
 * are written four or fewer (never cut in the dialogue box: that could leave only locked ones).
 */
export const MENU_ROWS = 4;

/**
 * The questions a menu shows: unasked ones first, in order, then asked ones, leaving a row for Goodbye.
 * The mean one (honor.ts: every menu has one, author Oct 4, 2026) always keeps its row, last.
 */
export function shownQuestions<Q extends { ask: string; deed?: string }>(questions: Q[], asked: string[]): Q[] {
  const mean = questions.find((q) => q.deed === 'bad');
  const rest = questions.filter((q) => q !== mean);
  const fresh = rest.filter((q) => !asked.includes(q.ask));
  const again = rest.filter((q) => asked.includes(q.ask));
  const room = MENU_ROWS - 1 - (mean ? 1 : 0);
  return [...[...fresh, ...again].slice(0, room), ...(mean ? [mean] : [])];
}
