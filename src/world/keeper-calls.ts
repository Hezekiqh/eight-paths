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
};

export const KEEPER_CALLS: KeeperCall[] = data.calls;

/** Answered: he won't ring about it again. */
export const callFlag = (call: KeeperCall) => `call:${call.id}`;

/** The first call that's due and not yet answered, if any. */
export const callDue = (flags: string[]): KeeperCall | null =>
  KEEPER_CALLS.find((c) => flags.includes(c.after) && !flags.includes(callFlag(c))) ?? null;
