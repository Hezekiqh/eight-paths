import { DEFAULT_PARTY } from '@/story/companions';

import { GATE_ANSWERS } from '../castle';
import { PER_PAGE, heroOrder, heroPage } from '../hero-pick';
import { MENU_ROWS } from '../menu';

const eight = Object.values(DEFAULT_PARTY).map((id, i) => ({ id, locked: i % 2 ? 'Lv 8' : undefined }));

describe('the hero list', () => {
  it('puts the ones who can do it first, keeping their order', () => {
    const order = heroOrder(eight);
    expect(order.slice(0, 4).every((h) => !h.locked)).toBe(true);
    expect(order.slice(4).every((h) => h.locked)).toBe(true);
    expect(order[0].id).toBe(eight[0].id);
  });

  it('pages three heroes at a time, with a row left for More... or Never mind.', () => {
    expect(PER_PAGE + 1).toBe(MENU_ROWS);
    const pages = [0, 1, 2].map((p) => heroPage(eight, p));
    expect(pages.map((p) => p.shown.length)).toEqual([3, 3, 2]);
    expect(pages.map((p) => p.last)).toEqual([false, false, true]);
    expect(pages.flatMap((p) => p.shown)).toEqual(eight);
  });

  it('is one page when it fits', () => {
    expect(heroPage(eight.slice(0, 2), 0)).toEqual({ shown: eight.slice(0, 2), last: true });
  });
});

describe('the castle gate', () => {
  it('has a way past for every one of the core eight', () => {
    for (const id of Object.values(DEFAULT_PARTY)) {
      const answer = GATE_ANSWERS.find((a) => a.path && a.by?.[id]);
      expect([id, answer?.lines.length]).toEqual([id, expect.any(Number)]);
    }
  });

  it('keeps two answers anyone can say: the polite one and the mean one', () => {
    const anyone = GATE_ANSWERS.filter((a) => !a.path);
    expect(anyone).toHaveLength(2);
    expect(anyone.map((a) => a.deed).sort()).toEqual(['bad', 'good']);
  });
});
