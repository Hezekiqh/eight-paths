import { platesOpen } from '../jobs';
import { MAPS, type WorldMap } from '../maps';

// What the pressure plates open, for the camera to look at as they go down (and the gate to swing open, live).
describe('the plates', () => {
  const plated = Object.values(MAPS).filter((m): m is WorldMap => !!(m as WorldMap).platesFlag);

  it('open something you can see in every room that has them', () => {
    expect(plated.length).toBeGreaterThan(0);
    for (const m of plated) expect([m.id, platesOpen(m, m.platesFlag!).length > 0]).toEqual([m.id, true]);
  });
  it("bring the Cull Road's ferry-bridge up out of the river, and swing the graveyard's gate", () => {
    const cull = platesOpen(MAPS['cull-road'], 'cull-ferry');
    expect(cull.every(({ x, y }) => MAPS['cull-road'].tiles[y][x] === '=')).toBe(true);
    const yard = platesOpen(MAPS.graveyard, 'graveyard-gate');
    expect(yard.map(({ x, y }) => MAPS.graveyard.tiles[y][x])).toEqual(['G']);
  });
});
