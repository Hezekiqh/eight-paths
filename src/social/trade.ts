import { COMPANIONS, isCharacterId, type CharacterId } from '@/story/companions';

/** An offer between two friends: `fromId` gives `give` and gets `get` (one entry per copy). */
export type TradeOffer = {
  id: string;
  fromId: string;
  toId: string;
  give: string[];
  get: string[];
  createdAt: string;
};

/** Copies per hero, from a server row list. */
export type Copies = Partial<Record<string, number>>;

/** Most copies on each side of a trade. */
export const MAX_SIDE = 5;
/** Offers close after this long unanswered. */
export const OFFER_DAYS = 3;

/** How many of each hero a list of copies holds: ['dessa', 'dessa'] → { dessa: 2 }. */
export function countCopies(list: string[]): Copies {
  const out: Copies = {};
  for (const id of list) out[id] = (out[id] ?? 0) + 1;
  return out;
}

/** A list of copies from counts, in roster order. */
export function listCopies(counts: Copies): CharacterId[] {
  return (Object.keys(COMPANIONS) as CharacterId[]).flatMap((id) => Array(counts[id] ?? 0).fill(id));
}

/** Whether `have` holds every copy in `list`. */
export function covers(have: Copies, list: string[]): boolean {
  return Object.entries(countCopies(list)).every(([id, n]) => (have[id] ?? 0) >= (n ?? 0));
}

/**
 * What this player can put into a trade: what the server says they could
 * trade, but only copies that have hatched, and never the last copy of the
 * hero walking the Other World.
 */
export function giveable(
  server: Copies,
  local: { owned: Partial<Record<CharacterId, number>> | null; drops: CharacterId[] },
  walking: CharacterId | null,
): Copies {
  const out: Copies = {};
  for (const [id, n] of Object.entries(server)) {
    if (!isCharacterId(id) || !n) continue;
    const hatched = (local.owned?.[id] ?? 0) - local.drops.filter((d) => d === id).length;
    const room = Math.min(n, hatched - (id === walking ? 1 : 0));
    if (room > 0) out[id] = room;
  }
  return out;
}

/** "Dessa ×2, Lark": one side of an offer in words. */
export function describeSide(list: string[]): string {
  return Object.entries(countCopies(list))
    .map(([id, n]) => {
      const name = isCharacterId(id) ? COMPANIONS[id].name : id;
      return n! > 1 ? `${name} ×${n}` : name;
    })
    .join(', ');
}

export function isExpired(offer: Pick<TradeOffer, 'createdAt'>, now = Date.now()): boolean {
  return now - Date.parse(offer.createdAt) > OFFER_DAYS * 24 * 60 * 60 * 1000;
}

/** Words for each reason the server can turn a trade down. */
const PROBLEMS: Record<string, string> = {
  not_friends: 'You can only trade with friends.',
  you_too_new: 'Your account needs to be a week old before you can trade.',
  them_too_new: 'Their account needs to be a week old before they can trade.',
  friends_too_new: 'You can trade once you’ve been friends for a day.',
  you_lack: 'You no longer have those heroes to trade. Heroes you got in a trade can be traded again after 7 days.',
  they_lack: 'They no longer have those heroes to trade.',
  too_many_open: 'You have 5 offers waiting. Wait for an answer, or take one back.',
  you_daily_limit: 'You’ve made 5 trades today. Try again tomorrow.',
  them_daily_limit: 'They’ve made 5 trades today. Try again tomorrow.',
  offer_gone: 'That offer is no longer open.',
  bad_offer: `Each side needs 1 to ${MAX_SIDE} heroes.`,
};

/** A friendly message for a server error, or null if it isn't a trade rule. */
export function tradeProblem(message: string): string | null {
  const code = Object.keys(PROBLEMS).find((c) => message.includes(c));
  return code ? PROBLEMS[code] : null;
}
