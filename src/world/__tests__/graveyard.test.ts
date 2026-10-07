import { platesCovered, pushBoulder } from '../engine';
import { MAPS } from '../maps';
import { EXITS, GRAVEYARD_GATE } from '../progress';

// The Graveyard of Kings (author, Oct 7, 2026): behind the chapel, over the crypt. Three royal stones, the soldiers'
// graves dug open from below, the risen dead among them, and a gate into the crypt that opens once the three
// grave-markers are rolled back into their sockets.

const yard = MAPS.graveyard;
const at = (x: number, y: number) => y * yard.width + x;

/** Every tile you can walk to from `from`, with the boulders where they are. */
function reach(solid: number[], from: number): Set<number> {
  const seen = new Set<number>();
  const queue = [from];
  while (queue.length > 0) {
    const t = queue.pop()!;
    if (seen.has(t) || solid[t]) continue;
    seen.add(t);
    const x = t % yard.width;
    if (x > 0) queue.push(t - 1);
    if (x < yard.width - 1) queue.push(t + 1);
    if (t >= yard.width) queue.push(t - yard.width);
    if (t < yard.width * (yard.height - 1)) queue.push(t + yard.width);
  }
  return seen;
}

describe('the Graveyard of Kings', () => {
  const sign = (id: string) => yard.objects.find((o) => o.id === id);

  it('is through the chapel’s back door, and back', () => {
    const into = EXITS.find((e) => e.id === 'chapel-graveyard')!;
    expect(into.to?.map).toBe('graveyard');
    expect(EXITS.find((e) => e.id === 'graveyard-chapel')?.to?.map).toBe('chapel');
  });

  it('has the three stones, word for word', () => {
    const first = (id: string) => (sign(id)?.type === 'sign' ? (sign(id) as { lines: string[] }).lines[0] : null);
    expect(first('mad-king')).toBe('THE MAD KING, OR SO THEY SAY. REST IN PEACE.');
    expect(first('beautiful-queen')).toBe('THE BEAUTIFUL QUEEN, OR SO THEY SAY. REST IN PEACE.');
    expect(first('lost-prince')).toBe('THE LOST PRINCE, OR SO THEY SAY. REST IN PEACE.');
  });

  it('has a real fight among the empty graves', () => {
    expect(yard.enemies.length).toBeGreaterThanOrEqual(4);
    expect(yard.enemies.length).toBeLessThanOrEqual(6);
    expect(yard.enemies.every((e) => e.kind === 'shadow')).toBe(true);
  });

  it('opens a second way into the crypt, and the Cleric’s way is still there', () => {
    const gate = EXITS.find((e) => e.id === 'graveyard-crypt')!;
    expect(gate.to?.map).toBe('old-kings-crypt');
    expect(gate.needs).toMatchObject({ kind: 'flag', flag: GRAVEYARD_GATE });
    expect(yard.platesFlag).toBe(GRAVEYARD_GATE);
    expect(EXITS.find((e) => e.id === 'chapel-crypt')?.needs).toMatchObject({ flag: 'crypt-found' });
  });

  it('has three markers and three sockets', () => {
    expect(yard.boulders).toHaveLength(3);
    expect(yard.plates).toHaveLength(3);
  });

  it('can be solved from the chapel door: every marker back in a socket, and the gate still reachable', () => {
    const arrival = EXITS.find((e) => e.id === 'chapel-graveyard')!.to!;
    let solid = yard.solid;
    let boulders = yard.boulders;
    let you = at(arrival.x, arrival.y);
    // you walk round to the far side of a marker and lean in, the way the World does it (engine.ts pushBoulder)
    const push = (from: [number, number], dx: number, dy: number) => {
      const i = boulders.indexOf(at(...from));
      expect([from, i === -1]).toEqual([from, false]);
      expect([from, dx, dy, reach(solid, you).has(at(from[0] - dx, from[1] - dy))]).toEqual([from, dx, dy, true]);
      const next = pushBoulder(solid, yard.width, yard.height, boulders, i, dx, dy);
      expect(next).not.toBeNull();
      ({ solid, boulders } = next!);
      you = at(...from);
    };
    // The left marker: up three, then left into the left socket.
    push([22, 8], 0, -1);
    push([22, 7], 0, -1);
    push([22, 6], 0, -1);
    push([22, 5], -1, 0);
    // The right marker: up three, then right into the right socket. It goes before the low one: it's in the way.
    push([24, 8], 0, -1);
    push([24, 7], 0, -1);
    push([24, 6], 0, -1);
    push([24, 5], 1, 0);
    // The low marker: a grave's in its way, so right one, up four, then left into the middle socket.
    push([23, 10], 1, 0);
    push([24, 10], 0, -1);
    push([24, 9], 0, -1);
    push([24, 8], 0, -1);
    push([24, 7], 0, -1);
    push([24, 6], -1, 0);
    expect(platesCovered(yard.plates, boulders)).toBe(true);
    // with the markers home, you can still walk up to the gate
    const gate = yard.tiles.flatMap((row, y) => [...row].flatMap((c, x) => (c === 'G' ? [at(x, y)] : [])))[0];
    expect(reach(solid, you).has(gate + yard.width)).toBe(true);
  });
});
