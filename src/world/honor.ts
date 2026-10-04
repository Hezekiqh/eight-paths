// Honor (author, Oct 4, 2026; like Red Dead Redemption 2): the World keeps count of what you do.
// Kind choices count up, mean ones count down, each once. For now it's only kept, not shown;
// later, how people treat you will follow it (more good: nicer; more bad: meaner).

export type DeedKind = 'good' | 'bad';
export type Deed = { id: string; kind: DeedKind };

/** A deed's id: where, with whom, what you said or did. The same choice made twice counts once. */
export const deedId = (map: string, who: string, what: string) => `${map}:${who}:${what}`;

/** Good deeds minus bad ones. */
export function honor(deeds: Deed[]): number {
  return deeds.reduce((n, d) => n + (d.kind === 'good' ? 1 : -1), 0);
}

/** How the World will see you, once it starts paying attention: a few deeds either way tips it. */
export type Reputation = 'kind' | 'neutral' | 'mean';
export const REPUTATION_AT = 3;
export function reputationOf(deeds: Deed[]): Reputation {
  const h = honor(deeds);
  return h >= REPUTATION_AT ? 'kind' : h <= -REPUTATION_AT ? 'mean' : 'neutral';
}
