/** Angle of axis `i` of `n`, starting straight up and going clockwise. */
export function axisAngle(i: number, n: number): number {
  'worklet';
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

export function pointOnAxis(i: number, n: number, value: number, radius: number, center: number) {
  'worklet';
  const angle = axisAngle(i, n);
  return {
    x: center + Math.cos(angle) * radius * value,
    y: center + Math.sin(angle) * radius * value,
  };
}

/** SVG `points` for a polygon with one vertex per value (0–1). */
export function polygonPoints(values: number[], radius: number, center: number): string {
  'worklet';
  let out = '';
  for (let i = 0; i < values.length; i += 1) {
    const p = pointOnAxis(i, values.length, values[i], radius, center);
    out += `${i === 0 ? '' : ' '}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }
  return out;
}
