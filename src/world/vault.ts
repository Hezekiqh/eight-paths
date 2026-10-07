// The Bank of Warrior City's vault (author, Oct 7, 2026): three brass dials, and the numbers are in the ledgers,
// if you read them as a banker would: red ink first, in the order the ledgers are numbered. Ledger I, II, III
// each have one line in red (wc-bank.json, tiles 'i', 'j', 'l'). A Noble just sees it (jobs.ts: the vault door);
// anyone else turns the dials themselves, from a menu at the door.

/** The bank, the vault door's tile letter, and the flag set once it's open. */
export const VAULT = { map: 'wc-bank', tile: 'G', flag: 'bank-vault-open' } as const;

/** The combination, dial by dial: the red ink in Ledgers I, II and III. */
export const COMBINATION = [6, 2, 1] as const;

/** What each dial offers (four at most, MENU_ROWS): the right number is always one of them. */
export const DIALS: readonly (readonly number[])[] = [
  [3, 6, 8, 9],
  [0, 2, 5, 7],
  [1, 4, 5, 9],
];

export const DIAL_LINES = {
  start: [
    'The vault door. Three brass dials, nought to nine.',
    'Engraved round the rim: THE BOOKS BALANCE. READ THEM IN ORDER.',
  ],
  /** Before each dial: "The first dial." */
  dial: ['The first dial.', 'The second dial.', 'The third dial.'],
  wrong: [
    'Clunk. The dials spin back to nought.',
    'Behind the counter, a clerk writes something down without looking up.',
  ],
  right: [
    'Click. Click. Click.',
    'Somewhere inside the door, something very heavy decides to agree with you. The vault swings open.',
  ],
};

/** True if these numbers, dial by dial, open the vault. */
export function opens(turned: readonly number[]): boolean {
  return turned.length === COMBINATION.length && turned.every((n, i) => n === COMBINATION[i]);
}
