import { MAPS, withBefore, withoutGone } from '../maps';

// Warrior City's bakery (Episode 15): whole, and nobody talking about a man from the sky, until the Warden
// comes down on it at the end of the Kaloseum fight (`pit-champion`).
describe("Warrior City's bakery", () => {
  const city = MAPS['warrior-city'];
  const at = (map: typeof city, x: number, y: number) => map.solid[y * map.width + x];
  const family = (flags: string[]) =>
    withoutGone(withBefore(city, flags), flags)
      .objects.filter((o) => 'id' in o && ['ambrose', 'hettie', 'dot', 'bryony', 'bakery-sign'].includes(o.id as string))
      .map((o) => (o as { id: string }).id);

  it('stands whole, with its door shut, before the Warden falls', () => {
    const before = withBefore(city, []);
    expect(before.image).not.toBe(city.image);
    expect(before.tiles[8].slice(35, 42)).toBe('IIIhIII');
    // the crater's floor was walkable; the house is solid
    expect(at(city, 39, 8)).toBe(0);
    expect(at(before, 39, 8)).toBe(1);
    // the rubble and Hettie's tray out front aren't there yet
    expect(before.tiles[9][34]).toBe('.');
    expect(before.tiles[9][36]).toBe('.');
    expect(family([])).toEqual([]);
  });

  it('is the wreck, with the family out front, once he has', () => {
    expect(withBefore(city, ['pit-champion'])).toBe(city);
    expect(family(['pit-champion']).sort()).toEqual(['ambrose', 'bakery-sign', 'bryony', 'dot', 'hettie']);
  });

  it('changes nothing else in the city', () => {
    const before = withBefore(city, []);
    city.tiles.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (y >= 4 && y <= 9 && x >= 34 && x <= 41) return;
        expect([x, y, before.tiles[y][x]]).toEqual([x, y, c]);
      }),
    );
  });
});
