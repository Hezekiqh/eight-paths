import { BUBBLE_EVERY, BUBBLE_MAX, Z_EVERY, Z_LIFE, sleepZs, snotBubble } from '../sleep';
import cells from '../maps/kingdom-dungeon.json';

describe('sleepers', () => {
  it('floats Zs up off the head, always some in the air', () => {
    for (let t = Z_LIFE; t < Z_LIFE * 3; t += 0.1) {
      const zs = sleepZs(t, 100, 100);
      expect(zs.length).toBeGreaterThan(0);
      // all above the head (a walker is 24 tall, feet at y)
      for (const [, y] of zs) expect(y).toBeLessThan(100 - 22);
    }
  });

  it('each Z rises as it ages', () => {
    const top = (t: number) => Math.min(...sleepZs(t, 0, 0).map(([, y]) => y));
    expect(top(Z_EVERY * 0.9)).toBeLessThan(top(0.05));
  });

  it('Gary is asleep at his post', () => {
    const gary = cells.objects.find((o) => o.id === 'jailer') as { sprite: string; asleep?: boolean };
    expect(gary.sprite).toBe('gary');
    expect(gary.asleep).toBe(true);
  });

  it('swells a snot bubble big enough to see, then shrinks it back', () => {
    const size = (t: number) => {
      const b = snotBubble(t, 100, 100);
      return b.cells.length + b.rim.length;
    };
    const widest = snotBubble(BUBBLE_EVERY / 2, 100, 100);
    const xs = [...widest.cells, ...widest.rim].map(([x]) => x);
    expect(Math.max(...xs) - Math.min(...xs) + 1).toBeGreaterThanOrEqual(BUBBLE_MAX * 2 - 1);
    expect(widest.rim.length).toBeGreaterThan(0);
    expect(widest.shine).not.toBeNull();
    expect(size(0.02)).toBeLessThan(size(BUBBLE_EVERY / 2));
    expect(size(BUBBLE_EVERY - 0.02)).toBeLessThan(size(BUBBLE_EVERY / 2));
  });

  it('blows the bubble out the side the nose points', () => {
    const right = snotBubble(BUBBLE_EVERY / 2, 100, 100, 1).cells.map(([x]) => x);
    const left = snotBubble(BUBBLE_EVERY / 2, 100, 100, -1).cells.map(([x]) => x);
    expect(Math.min(...right)).toBeGreaterThan(100);
    expect(Math.max(...left)).toBeLessThan(100);
  });
});
