import { ATTACKS, E_ALIVE, E_HP, E_X, damageFor, hitAround, spawnEnemy, stepEnemies, strikePoint } from '../combat';

const open = { solid: new Array(20 * 20).fill(0), width: 20, height: 20 };

describe('combat', () => {
  it('gives every Path an attack', () => {
    for (const a of Object.values(ATTACKS)) expect(a.damage).toBeGreaterThan(0);
  });

  it('hits harder the more real habits your character has', () => {
    expect(damageFor(ATTACKS.physical, 5)).toBe(2);
    expect(damageFor(ATTACKS.physical, 25)).toBe(4);
  });

  it('wears enemies down and defeats them', () => {
    let enemies = [spawnEnemy('shadow', 100, 100)];
    enemies = hitAround(open, enemies, 100, 100, 10, 2, 0, 0);
    expect(enemies[0][E_HP]).toBe(1);
    enemies = hitAround(open, enemies, 100, 100, 10, 2, 0, 0);
    expect(enemies[0][E_ALIVE]).toBe(0);
  });

  it('misses enemies out of reach', () => {
    const enemies = hitAround(open, [spawnEnemy('shadow', 150, 100)], 100, 100, 20, 2, 0, 0);
    expect(enemies[0][E_HP]).toBe(3);
  });

  it('shadows chase you once they see you, and hurt on touch', () => {
    let r = stepEnemies(open, [spawnEnemy('shadow', 100, 100)], 140, 100, 0.1, true);
    expect(r.enemies[0][E_X]).toBeGreaterThan(100);
    r = stepEnemies(open, r.enemies, r.enemies[0][E_X] + 4, 100, 0.016, true);
    expect(r.hurt).toBe(1);
  });

  it("rusted armour waits until you're close", () => {
    const r = stepEnemies(open, [spawnEnemy('rusted', 100, 100)], 160, 100, 0.1, true);
    expect(r.enemies[0][E_X]).toBe(100);
  });

  it('swings land in front of you', () => {
    expect(strikePoint(100, 100, 3, 20)[0]).toBeGreaterThan(100);
    expect(strikePoint(100, 100, 2, 20)[0]).toBeLessThan(100);
  });
});

describe("Baron Plush's fight", () => {
  it('lets real Resilience slow the drowsiness, up to half', () => {
    const { drowsyRate, DROWSY_FILL } = jest.requireActual('../combat') as typeof import('../combat');
    expect(drowsyRate(5)).toBe(DROWSY_FILL);
    expect(drowsyRate(20)).toBeLessThan(DROWSY_FILL);
    expect(drowsyRate(99)).toBeCloseTo(DROWSY_FILL / 2);
  });

  it('has four bearers standing on open floor, and the way out waits on winning him over', () => {
    const { MAPS } = jest.requireActual('../maps') as typeof import('../maps');
    const { EXITS } = jest.requireActual('../progress') as typeof import('../progress');
    const keep = MAPS['sleeping-keep'];
    expect(keep.boss?.bearers).toHaveLength(4);
    for (const [x, y] of keep.boss!.bearers) expect(keep.walkable).toContain(keep.tiles[y][x]);
    const out = EXITS.find((e) => e.id === 'keep-exit')!;
    expect(JSON.stringify(out.needs)).toContain(keep.boss!.flag);
  });
});
