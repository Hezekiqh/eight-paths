/**
 * The most rows a menu shows (author, Oct 4, 2026): questions plus Goodbye. Someone with more to ask
 * shows the first ones you haven't asked yet; ask one and the next takes its place. A decision's choices
 * are written four or fewer (never cut in the dialogue box: that could leave only locked ones).
 */
export const MENU_ROWS = 4;

/** The questions a menu shows: unasked ones first, in order, then asked ones, leaving a row for Goodbye. */
export function shownQuestions<Q extends { ask: string }>(questions: Q[], asked: string[]): Q[] {
  const fresh = questions.filter((q) => !asked.includes(q.ask));
  const again = questions.filter((q) => asked.includes(q.ask));
  return [...fresh, ...again].slice(0, MENU_ROWS - 1);
}
