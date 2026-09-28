/** What a username may be, in words, for the sign-up screen. */
export const USERNAME_RULES = '3 to 16 letters, numbers or underscores.';

const PATTERN = /^[A-Za-z0-9_]{3,16}$/;
// The server has the full blocked-words list; these are the names nobody may take.
const RESERVED = ['admin', 'moderator', 'support', 'eightpaths', '8paths', 'official', 'keeper', 'entity', 'chosenone'];

/** Why `name` can't be a username, or null if it's fine to ask the server. */
export function usernameProblem(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 3) return 'At least 3 characters.';
  if (trimmed.length > 16) return 'At most 16 characters.';
  if (!PATTERN.test(trimmed)) return 'Letters, numbers and underscores only.';
  const lower = trimmed.toLowerCase();
  if (RESERVED.some((word) => lower.includes(word))) return 'That name is reserved.';
  return null;
}

/** Formats a founder number for display: 7 → "#007". */
export const founderLabel = (n: number) => `#${String(n).padStart(3, '0')}`;
