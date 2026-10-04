import type { Tier } from '@/game';

// Special moves (author, Oct 4, 2026): one a day, three a day with Premium, shared by the whole
// party (whoever's walking). You can practise your attacks anywhere; a special outside a fight asks
// first, so one of today's isn't spent on thin air.

export const SPECIALS_PER_DAY: Record<Tier, number> = { free: 1, premium: 3 };

/** Special moves left today, for the whole party. */
export function specialsLeft(used: { day: string; used: number } | null, today: string, tier: Tier): number {
  const spent = used?.day === today ? used.used : 0;
  return Math.max(0, SPECIALS_PER_DAY[tier] - spent);
}

/** Asked when a special would go off with nothing to fight. */
export function practiceWarning(left: number, tier: Tier): string[] {
  const rule =
    tier === 'premium'
      ? 'You get three special moves a day with Premium, shared by your whole party.'
      : 'You get one special move a day, shared by your whole party. (Premium: three a day.)';
  return [
    rule,
    left === 1
      ? 'You have one left today. Spend it on practice?'
      : `You have ${left} left today. Spend one on practice?`,
  ];
}

/** Said when a special is tried with none left today. */
export function noneLeft(tier: Tier): string[] {
  return tier === 'premium'
    ? ["That's all three of today's special moves. They'll be back tomorrow."]
    : ["That's today's special move used. It'll be back tomorrow. (Premium: three a day.)"];
}
