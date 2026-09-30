import { platesCovered, pushBoulder } from '../engine';
import { MAPS } from '../maps';

describe('the Drill Yard puzzle', () => {
  const yard = MAPS['barracks-yard'];
  const at = (x: number, y: number) => y * yard.width + x;

  it('has three boulders and three plates', () => {
    expect(yard.boulders).toHaveLength(3);
    expect(yard.plates).toHaveLength(3);
  });

  it('can be solved by pushing each boulder onto a plate', () => {
    let solid = yard.solid;
    let boulders = yard.boulders;
    const push = (from: [number, number], dx: number, dy: number) => {
      const i = boulders.indexOf(at(...from));
      expect(i).not.toBe(-1);
      const next = pushBoulder(solid, yard.width, yard.height, boulders, i, dx, dy);
      expect(next).not.toBeNull();
      solid = next!.solid;
      boulders = next!.boulders;
    };
    // Top-left boulder: right twice, down twice.
    push([5, 4], 1, 0);
    push([6, 4], 1, 0);
    push([7, 4], 0, 1);
    push([7, 5], 0, 1);
    // Right boulder: left three times, down once.
    push([12, 5], -1, 0);
    push([11, 5], -1, 0);
    push([10, 5], -1, 0);
    push([9, 5], 0, 1);
    // Bottom boulder: right four times, up twice.
    for (let x = 4; x < 8; x++) push([x, 8], 1, 0);
    push([8, 8], 0, -1);
    push([8, 7], 0, -1);
    expect(platesCovered(yard.plates, boulders)).toBe(true);
  });

  it("won't push a boulder into a wall", () => {
    const i = yard.boulders.indexOf(at(12, 5));
    // Two pushes right would put it into the east wall.
    const once = pushBoulder(yard.solid, yard.width, yard.height, yard.boulders, i, 1, 0)!;
    expect(pushBoulder(once.solid, yard.width, yard.height, once.boulders, i, 1, 0)).toBeNull();
  });
});
