import { noneLeft, practiceWarning, specialsLeft } from '../specials';

describe('special moves a day', () => {
  it('gives one a day free and three with Premium, shared by the party, fresh each day', () => {
    expect(specialsLeft(null, '2026-10-04', 'free')).toBe(1);
    expect(specialsLeft({ day: '2026-10-04', used: 1 }, '2026-10-04', 'free')).toBe(0);
    expect(specialsLeft({ day: '2026-10-04', used: 1 }, '2026-10-04', 'premium')).toBe(2);
    expect(specialsLeft({ day: '2026-10-03', used: 3 }, '2026-10-04', 'premium')).toBe(3);
  });

  it('warns before a practice special, and says when none are left', () => {
    expect(practiceWarning(1, 'free')[0]).toMatch(/one special move a day/);
    expect(practiceWarning(2, 'premium')[1]).toMatch(/2 left today/);
    expect(noneLeft('free')[0]).toMatch(/back tomorrow/);
  });
});
