import { MAPS } from '../maps';
import { finaleStage } from '../scenes';

// The last seal: the party hangs back a step behind you, King Brannoc beside you if he's with you.
describe('the finale, staged', () => {
  const field = MAPS['field-of-banners'];
  const open = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < field.width && y < field.height && !field.solid[y * field.width + x];
  const you: [number, number] = [13, 2];
  const seal = field.tiles[1].indexOf('Q');

  it('stands at the seal itself', () => {
    expect([seal, seal + 1]).toContain(you[0]);
  });
  it('puts King Brannoc beside you, and the others a step behind, all facing the seal, on floor, apart', () => {
    const stage = finaleStage(you, true, ['quill', 'pip', 'moss', 'wren', 'oren'], open);
    expect(stage[0].id).toBe('brannoc');
    expect(stage[0].path[stage[0].path.length - 1]).toEqual([you[0] + 1, you[1]]);
    // four at most behind you
    expect(stage.slice(1).map((a) => a.id)).toEqual(['quill', 'pip', 'moss', 'wren']);
    const ends = stage.map((a) => a.path[a.path.length - 1]);
    for (const [x, y] of ends) expect(open(x, y)).toBe(true);
    expect(new Set(ends.map((e) => e.join())).size).toBe(ends.length);
    expect(ends).not.toContainEqual(you);
    for (const a of stage.slice(1)) {
      expect(a.path[a.path.length - 1][1]).toBe(you[1] + 2);
      // walking up from behind
      if (a.path.length > 1) expect(a.path[0][1]).toBeGreaterThan(a.path[1][1]);
    }
    expect(stage.every((a) => a.face === 1)).toBe(true);
  });
  it('leaves Brannoc out when he is not with you, and nobody when nobody is', () => {
    expect(finaleStage(you, false, ['pip'], open).map((a) => a.id)).toEqual(['pip']);
    expect(finaleStage(you, false, [], open)).toEqual([]);
  });
});
