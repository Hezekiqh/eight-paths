import data from './keeper-calls.json';

// The Keeper can reach you whenever he likes (author, Oct 3, 2026): while you slept he slipped a
// telephone into your pocket. Each call rings once its moment in the story comes (a story flag),
// and plays out in his dialogue window. The words live in keeper-calls.json, shared with the
// episodes (scripts/episode-video.mjs).

export type KeeperCall = {
  id: string;
  /** Rings once this story flag is set. */
  after: string;
  lines: string[];
  /** Said by nobody once he's hung up. */
  end: string[];
  /** How many lines after the {others} line are about the ones still out there (dropped once they're all found). */
  aboutOthers?: number;
};

export const KEEPER_CALLS: KeeperCall[] = data.calls;

/** Answered: he won't ring about it again. */
export const callFlag = (call: KeeperCall) => `call:${call.id}`;

/** The first call that's due and not yet answered, if any. */
export const callDue = (flags: string[]): KeeperCall | null =>
  KEEPER_CALLS.find((c) => flags.includes(c.after) && !flags.includes(callFlag(c))) ?? null;

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

/**
 * The call's words for where you are: `{others}` counts the core eight still to be found
 * (the first call: "six others like him", or however many are left), and fixes the grammar.
 */
export function callLines(call: KeeperCall, stillOut: number): string[] {
  // everyone's found already (Brannoc can be the last: the others wait in Warrior City): the lines about
  // the ones still out there, lost or trapped, are left unsaid (play-test, Oct 4, 2026)
  const at = call.lines.findIndex((l) => l.includes('{others}'));
  const lines =
    stillOut <= 0 && at >= 0 ? call.lines.filter((_, i) => i <= at || i > at + (call.aboutOthers ?? 0)) : call.lines;
  return lines.map((l) => {
    if (!l.includes('{others}')) return l;
    if (stillOut <= 0) return 'I believe the others like him are all accounted for. Well done.';
    if (stillOut === 1)
      return l
        .replace('{others}', 'one other')
        .replace(' have left', ' has left')
        .replace(' are wandering', ' is wandering');
    return l.replace('{others}', `${WORDS[stillOut] ?? stillOut} others`);
  });
}
