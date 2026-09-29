/**
 * When the Keeper asks to send notifications (NOTIFICATIONS.md, N4). Pure, so
 * it can be tested without the notification module.
 */

/** The three moments the Keeper asks: after the first quest, then at most twice more. */
export type KeeperAsk = 'first' | 'hatch' | 'streak';

/**
 * What iOS allows: full banners, quiet delivery to Notification Center
 * (provisional), not asked yet, or turned down (only Settings can change it).
 */
export type ReminderAccess = 'full' | 'quiet' | 'undecided' | 'denied';

export type AskHistory = {
  asked: KeeperAsk[];
  /** The day of the last ask, so two asks never land on the same day. */
  lastAskedOn: string | null;
  /** Heroes hatched when the Keeper last asked; a new hatch after that can ask again. */
  hatchesAtLastAsk: number;
};

export const EMPTY_ASK_HISTORY: AskHistory = { asked: [], lastAskedOn: null, hatchesAtLastAsk: 0 };

/** The showing-up streak that earns the second re-ask. */
export const ASK_STREAK = 7;

export type AskMoment = {
  history: AskHistory;
  access: ReminderAccess;
  today: string;
  hasCompleted: boolean;
  /** Heroes hatched so far (beyond the core eight). */
  hatches: number;
  streak: number;
};

/** The ask that's due now, if any. Each is asked at most once, ever. */
export function nextKeeperAsk({ history, access, today, hasCompleted, hatches, streak }: AskMoment): KeeperAsk | null {
  if (access === 'full' || access === 'denied') return null;
  if (!history.asked.includes('first')) return hasCompleted ? 'first' : null;
  if (history.lastAskedOn === today) return null;
  if (!history.asked.includes('hatch') && hatches > history.hatchesAtLastAsk) return 'hatch';
  if (!history.asked.includes('streak') && streak >= ASK_STREAK) return 'streak';
  return null;
}

/** The history once `ask` has been shown. */
export function recordAsk(history: AskHistory, ask: KeeperAsk, today: string, hatches: number): AskHistory {
  return { asked: [...new Set([...history.asked, ask])], lastAskedOn: today, hatchesAtLastAsk: hatches };
}

/** The card for each ask, exactly as approved in KEEPER-LINES.md (j1–j3). */
export const KEEPER_ASK_CARDS: Record<KeeperAsk, { id: string; title: string; body: string; yes: string; no: string }> = {
  first: {
    id: 'j1',
    title: 'May I come find you?',
    body: "Tomorrow, around this time, I'll knock. Once. Unless your streak is on the line.",
    yes: 'Yes, find me',
    no: 'Not now',
  },
  hatch: {
    id: 'j2',
    title: 'Someone new has woken.',
    body: 'Want me to tell you when the next one stirs?',
    yes: 'Yes',
    no: 'Not now',
  },
  streak: {
    id: 'j3',
    title: 'Seven days.',
    body: 'Let me help you keep it. May I knock in the evenings?',
    yes: 'Yes',
    no: 'Not now',
  },
};
