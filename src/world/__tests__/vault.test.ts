import { JOBS } from '../jobs';
import { MAPS } from '../maps';
import { EXITS } from '../progress';
import { COMBINATION, DIALS, VAULT, opens } from '../vault';

// The bank's vault (author, Oct 7, 2026): the combination is the red ink in Ledgers I, II and III, in order.
describe('the vault', () => {
  const bank = MAPS['wc-bank'];
  const red = (letter: string) => {
    const line = bank.examine[letter].find((l) => /red ink/.test(l))!;
    return Number(line.match(/(\d+)\D*$/)![1]);
  };

  it('opens with the red ink from the ledgers, read in order', () => {
    expect(['i', 'j', 'l'].map(red)).toEqual([...COMBINATION]);
    expect(opens(COMBINATION)).toBe(true);
    expect(opens([1, 2, 6])).toBe(false);
  });

  it('offers the right number on every dial, four at most', () => {
    DIALS.forEach((options, i) => {
      expect(options).toContain(COMBINATION[i]);
      expect(options.length).toBeLessThanOrEqual(4);
    });
  });

  it('is a door in the bank that a Noble can just open', () => {
    expect(EXITS.find((e) => e.from === VAULT.map && e.tile === VAULT.tile)?.to?.map).toBe('wc-vault');
    expect(JOBS.find((j) => j.map === VAULT.map && j.tile === VAULT.tile)).toMatchObject({
      path: 'financial',
      flag: VAULT.flag,
    });
  });
});
