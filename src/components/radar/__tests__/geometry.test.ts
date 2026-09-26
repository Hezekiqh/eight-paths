import { pointOnAxis, polygonPoints } from '../geometry';

describe('radar geometry', () => {
  it('puts axis 0 straight up and goes clockwise', () => {
    expect(pointOnAxis(0, 8, 1, 100, 150)).toEqual({ x: 150, y: 50 });
    const right = pointOnAxis(2, 8, 1, 100, 150);
    expect(right.x).toBeCloseTo(250);
    expect(right.y).toBeCloseTo(150);
  });

  it('scales by value', () => {
    expect(pointOnAxis(4, 8, 0.5, 100, 150).y).toBeCloseTo(200);
  });

  it('builds an SVG points string', () => {
    expect(polygonPoints([1, 1, 1, 1], 10, 10)).toBe('10.00,0.00 20.00,10.00 10.00,20.00 0.00,10.00');
  });
});
