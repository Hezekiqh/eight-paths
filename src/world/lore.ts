// The World menu's lore journal: what people have told you when you asked.

/** Something a character told the player when asked. */
export type LoreEntry = {
  /** Who said it and what was asked: the same answer is only written down once. */
  id: string;
  speaker: string;
  ask: string;
  answer: string[];
  /** When it was first heard (ms). */
  at: number;
};

export const loreId = (speaker: string, ask: string) => `${speaker}::${ask}`;

/** The journal with `entry` written in, unless it was already heard. */
export function addLore(journal: LoreEntry[], entry: LoreEntry): LoreEntry[] {
  return journal.some((e) => e.id === entry.id) ? journal : [...journal, entry];
}

/** Keeps only well-formed entries from a loaded save. */
export function cleanLore(raw: unknown): LoreEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.filter((e): e is LoreEntry => {
    const ok =
      typeof e === 'object' &&
      e !== null &&
      typeof e.id === 'string' &&
      typeof e.speaker === 'string' &&
      typeof e.ask === 'string' &&
      Array.isArray(e.answer) &&
      e.answer.every((l: unknown) => typeof l === 'string') &&
      Number.isFinite(e.at) &&
      !seen.has(e.id);
    if (ok) seen.add(e.id);
    return ok;
  });
}
