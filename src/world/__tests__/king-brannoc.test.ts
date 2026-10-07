import { DEFAULT_PARTY } from '@/story/companions';

import {
  BRANNOC_KING,
  BRANNOC_REJOINED,
  BRANNOC_STAND,
  KALDOR_THRONE,
  THRONE_STAND,
  brannocAway,
  guardsForKaldor,
  kaldorLedOut,
  kaldorShadows,
  toTheThrone,
} from '../castle';
import { walkersFor } from '../hero';
import { withRoster } from '../hero-rooms';
import { MAPS } from '../maps';
import { winScene } from '../scenes';

const everyone = Object.values(DEFAULT_PARTY).map((id) => `met:${id}`);

describe('King Brannoc, working remotely', () => {
  it('stays to rule when he takes the throne, and is out of your party until he catches you up', () => {
    const crowned = [...everyone, BRANNOC_KING];
    expect(brannocAway(crowned)).toBe(true);
    expect(walkersFor(DEFAULT_PARTY, undefined, crowned, crowned)).not.toContain('brannoc');
    const back = [...crowned, BRANNOC_REJOINED];
    expect(brannocAway(back)).toBe(false);
    expect(walkersFor(DEFAULT_PARTY, undefined, back, back)).toContain('brannoc');
  });

  it('is in neither his room nor the Archive hall while he rules', () => {
    const crowned = [...everyone, BRANNOC_KING];
    const room = withRoster(MAPS['room-brannoc'], 0, crowned);
    expect(room.npcs.some((n) => n.character === 'brannoc')).toBe(false);
  });

  it('walking as Brannoc, you leave at once: nobody has to catch you up', () => {
    const scene = winScene('war-hall', 'kaldor-beaten', true, true, true)!;
    const crown = scene.choices!.find((c) => c.outcome.flags.includes(BRANNOC_KING))!;
    expect(crown.outcome.flags).toContain(BRANNOC_REJOINED);
    const other = winScene('war-hall', 'kaldor-beaten', true, true, false)!;
    expect(other.choices!.find((c) => c.outcome.flags.includes(BRANNOC_KING))!.outcome.flags).not.toContain(
      BRANNOC_REJOINED,
    );
  });
});

describe('the throne (author, Oct 7, 2026)', () => {
  const scene = (opts: { mean?: boolean; name?: string; cellsEmpty?: boolean; felix?: boolean } = {}) =>
    winScene('war-hall', 'kaldor-beaten', true, opts.felix ?? false, false, opts.cellsEmpty ?? false, {
      mean: opts.mean ?? false,
      name: opts.name,
    })!;
  const said = (s: ReturnType<typeof scene>, label: string) =>
    s.choices!.find((c) => c.label === label)!.lines.join(' ');

  it('takes his shadows from him, and sends him to his own cells whatever you choose', () => {
    const s = scene();
    expect(s.shadows).toBe(true);
    expect(s.after!.join(' ')).toContain('an old man');
    expect(s.choices!.map((c) => c.label)).toEqual(['Brannoc takes the throne.', 'Take the throne yourself.']);
    for (const c of s.choices!)
      expect(c.outcome.flags).toEqual(expect.arrayContaining(['kaldor-jailed', 'kaldor-dethroned']));
  });
  it("has Gary see it only if he's still down there", () => {
    expect(scene().after!.join(' ')).toContain('GARY:');
    expect(scene({ cellsEmpty: true }).after!.join(' ')).not.toContain('GARY');
  });
  it('has Brannoc ask what now, and Felix fade, if he was there', () => {
    expect(scene().after).toContain('BRANNOC: What do we do?');
    expect(scene({ felix: true }).after).toContain('FELIX: This is turning out better than I expected.');
    expect(scene().after!.join(' ')).not.toContain('FELIX');
  });
  it('changes how you put it when you have been more mean than kind, and Brannoc asks your name', () => {
    expect(said(scene(), 'Brannoc takes the throne.')).toContain('face his fears');
    const forced = said(scene({ mean: true, name: 'Hez' }), 'Brannoc takes the throne.');
    expect(forced).toContain('listen to my orders');
    expect(forced).toContain('BRANNOC: OK, Hez. As you command.');
    expect(said(scene(), 'Take the throne yourself.')).toContain('champion');
    expect(said(scene({ mean: true }), 'Take the throne yourself.')).toContain('my liege');
    expect(scene({ mean: true }).choices![0].outcome.flags).toContain('throne-mean');
  });
});

describe('the throne, played out in the hall', () => {
  const hall = MAPS['war-hall'];
  const floor = (x: number, y: number) => hall.walkable.includes(hall.tiles[y]?.[x] ?? '#');
  const legs = (path: [number, number][]) => path.slice(1).map((p, i) => [path[i], p] as const);
  /** Every tile along a straight leg. */
  const along = ([a, b]: readonly [[number, number], [number, number]]) => {
    const out: [number, number][] = [];
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    for (let k = 0; k <= n; k++) out.push([a[0] + Math.sign(b[0] - a[0]) * k, a[1] + Math.sign(b[1] - a[1]) * k]);
    return out;
  };
  const felix = hall.objects.find((o) => o.id === 'felix')!;

  it('says each beat where it happens: the guards come for him, Felix fades, and whoever rules walks up', () => {
    const s = winScene('war-hall', 'kaldor-beaten', true, true, false)!;
    expect(s.after![s.throne!.guards]).toMatch(/guards take him by the arms/);
    expect(s.after![s.throne!.guards + 1]).toMatch(/march him out/);
    expect(s.after![s.throne!.fades]).toMatch(/Felix fades/);
    expect(winScene('war-hall', 'kaldor-beaten', true, false, false)!.throne!.fades).toBe(-1);
    for (const mean of [false, true])
      for (const asBrannoc of [false, true]) {
        const t = winScene('war-hall', 'kaldor-beaten', true, true, asBrannoc, false, { mean })!;
        for (const c of t.choices!) {
          const { at, who } = c.toThrone!;
          // the walk comes after the line that says it's coming, and before the one that says they're there
          expect([c.label, at > 0 && at < c.lines.length]).toEqual([c.label, true]);
          expect(who).toBe(c.label.startsWith('Brannoc') ? 'brannoc' : 'you');
        }
      }
  });
  it('sends the shadows over the floor to the pillars, round Felix, you and Brannoc, gone at each', () => {
    for (const a of kaldorShadows(35)) {
      expect(a.path[0]).toEqual(KALDOR_THRONE);
      expect(a.vanish).toBe(true);
      expect(hall.tiles[a.path[a.path.length - 1][1]][a.path[a.path.length - 1][0]]).toBe('I');
      for (const leg of legs(a.path)) {
        expect(leg[0][0] === leg[1][0] || leg[0][1] === leg[1][1]).toBe(true);
        // over floor, but for the pillar they go up at the end
        const tiles = along(leg).slice(0, -1);
        for (const [x, y] of tiles) expect([x, y, floor(x, y)]).toEqual([x, y, true]);
        for (const t of along(leg)) {
          expect(t).not.toEqual([felix.x, felix.y]);
          expect(t).not.toEqual(THRONE_STAND);
          expect(t).not.toEqual(BRANNOC_STAND);
        }
      }
    }
  });
  it('walks the guards and Kaldor up and down beside the carpet, clear of you, and whoever rules up to the throne', () => {
    const walks = [...guardsForKaldor(23), ...kaldorLedOut(34, 23)];
    for (const a of walks)
      for (const leg of legs(a.path))
        for (const t of along(leg)) {
          expect(t).not.toEqual(THRONE_STAND);
          expect(t).not.toEqual(BRANNOC_STAND);
        }
    for (const who of ['you', 'brannoc'] as const) {
      const path = toTheThrone(who);
      expect(path[path.length - 1]).toEqual(KALDOR_THRONE);
      expect(path[0]).toEqual(who === 'you' ? THRONE_STAND : BRANNOC_STAND);
      for (const leg of legs(path)) for (const [x, y] of along(leg)) expect(floor(x, y)).toBe(true);
    }
    // ...and through nobody: Brannoc goes round you
    expect(legs(toTheThrone('brannoc')).flatMap(along)).not.toContainEqual(THRONE_STAND);
    expect(floor(...THRONE_STAND) && floor(...BRANNOC_STAND)).toBe(true);
  });
  it('crowns King Brannoc where Kaldor sat', () => {
    const king = hall.objects.find((o) => o.id === 'king-brannoc')!;
    expect([king.x, king.y]).toEqual(KALDOR_THRONE);
  });
});

describe("Captain Orsk's gate", () => {
  it('fits four rows: "Leave it to...", the polite one and the mean one, and a way past for each Path', () => {
    const { GATE_ANSWERS } = jest.requireActual('../castle') as typeof import('../castle');
    const anyone = GATE_ANSWERS.filter((a) => !a.path);
    expect(1 + anyone.length).toBeLessThanOrEqual(4);
    expect(anyone.filter((a) => a.deed === 'bad')).toHaveLength(1);
    expect(new Set(GATE_ANSWERS.flatMap((a) => (a.path ? [a.path] : []))).size).toBe(8);
  });
});
