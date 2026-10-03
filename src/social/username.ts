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

/**
 * What to search usernames for, from what was typed ("@Moss " → "moss"), or
 * null when it's too short or can't be part of a username.
 */
export function searchTerm(text: string): string | null {
  const term = text.trim().replace(/^@/, '').toLowerCase();
  return term.length >= 2 && /^[a-z0-9_]{2,16}$/.test(term) ? term : null;
}

/** Formats a founder number for display: 7 → "#007". */
export const founderLabel = (n: number) => `#${String(n).padStart(3, '0')}`;

/**
 * Finds a friend code in whatever was typed or pasted (a bare code, a link,
 * or a whole share message) and formats it as "8P-XXXX-XXXX". Returns null
 * when there isn't a complete code.
 */
export function extractFriendCode(text: string): string | null {
  const match = text.toUpperCase().match(/8P[\s-]?([A-Z0-9]{4})[\s-]?([A-Z0-9]{4})(?![A-Z0-9])/);
  return match ? `8P-${match[1]}-${match[2]}` : null;
}
