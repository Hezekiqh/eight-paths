import { Z_EVERY, Z_LIFE, sleepZs } from '../sleep';
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
});
