import { DIMENSIONS, type Dimension } from '@/game';

import {
  attackFor,
  E_ALIVE,
  E_KIND,
  E_MODE,
  E_X,
  E_Y,
  ENEMY_KINDS,
  HEARTS,
  levelHearts,
  damageFor,
  hpFor,
  drowsyRate,
  spawnEnemy,
  type EnemyKind,
} from '../combat';
import { SPEED, move, type Grid } from '../engine';
import { SPECIALS, startFight, stepFight, type FightInput } from '../fight';
import { autopilot, newPilot } from '../autopilot';
import { EXITS } from '../progress';
import { MAPS, TILE, withLadder, type MapId } from '../maps';

// Every fight in Season 1, played headless by a sensible bot with the real
// rules (stepFight, the same code the World runs). Ranged Paths keep their
// distance and shoot, close-range Paths step in, strike and back off; the bot
// rolls out of the way when an enemy's tell is about to finish, waits for
// Kaldor's shadow before striking him, and (Lv 10 and up) charges its blows
// against the bosses. It answers: at the level a player's hero will have by
// then, can each Path win?

const DT = 1 / 60;
const LIMIT = 180;
const feet = (x: number, y: number): [number, number] => [x * TILE + TILE / 2, y * TILE + TILE - 2];

/** won, or lost by dying, falling asleep (Plush), or running out of time. */
type Result = { won: boolean; hearts: number; seconds: number; lost?: 'died' | 'slept' | 'time' };

export function fight(id: MapId, path: Dimension, level: number, won: string[] = []): Result {
  // a ladder of fights (the Kaloseum, the Maximus) puts up its next rung each visit: `won` so far
  const map = withLadder(MAPS[id], won);
  const grid: Grid = { solid: map.solid, width: map.width, height: map.height };
  const arrival = EXITS.find((e) => e.to?.map === id)?.to ?? map.spawn;
  let [px, py] = feet(arrival.x, arrival.y);
  // the blow at this level: shorter reach the lower it is (combat.ts)
  const attack = attackFor(path, level);
  const plush = !!map.boss && !map.boss.kind;
  const [bx, by] = map.boss ? feet(map.boss.x, map.boss.y) : [0, 0];
  const rules = {
    grid,
    attack,
    damage: damageFor(attack, level),
    level,
    special: SPECIALS[path].kind,
    boss: !!map.boss,
    bossX: bx,
    bossY: by,
    throws: plush,
    drowsy: plush ? drowsyRate(level) : 0,
    // the party's hearts: five, and one more from Lv 5 (everyone's overall level starts there), more later
    maxHp: HEARTS + levelHearts(level),
    // FIGHT_NO_SPECIAL=1: today's special move already spent (one a day, specials.ts)
    specialReady: !process.env.FIGHT_NO_SPECIAL,
  };
  const hp = (kind: EnemyKind) => hpFor(kind, level, rules.damage);
  let f = startFight(
    [
      // as in the game: each takes a set number of hits at this level (combat.ts hitsToBeat)
      ...map.enemies.map((e) => spawnEnemy(e.kind, ...feet(e.x, e.y), hp(e.kind))),
      ...(map.boss?.bearers.map(([x, y]) => {
        const kind = (map.boss!.kind ?? 'sleeper') as EnemyKind;
        return spawnEnemy(kind, ...feet(x, y), hp(kind));
      }) ?? []),
      ...(map.boss?.with?.map((e) => spawnEnemy(e.kind as EnemyKind, ...feet(e.x, e.y), hp(e.kind as EnemyKind))) ??
        []),
    ],
    rules.maxHp,
  );
  let pilot = newPilot();

  for (let t = 0; t < LIMIT; t += DT) {
    const alive = f.enemies.filter((e) => e[E_ALIVE] === 1);
    if (f.won || (!map.boss && alive.length === 0)) return { won: true, hearts: f.hp, seconds: Math.round(t) };
    const m = autopilot(pilot, f, px, py, attack, level, grid, DT, !process.env.FIGHT_NO_DODGE);
    if (!m) return { won: true, hearts: f.hp, seconds: Math.round(t) };
    pilot = m.pilot;
    const { facing, press, held, release, dodge } = m;
    const mx = m.stickX;
    const my = m.stickY;
    const len = Math.hypot(mx, my) || 1;
    const input: FightInput = {
      x: px,
      y: py,
      facing,
      stickX: mx / len,
      stickY: my / len,
      moved: false,
      press,
      held,
      release,
      dodge,
    };
    let moved = false;
    if (f.dazed === 0 && f.roll === 0) {
      const [nx, ny] = move(grid, px, py, (mx / len) * SPEED * DT, (my / len) * SPEED * DT);
      moved = Math.abs(nx - px) + Math.abs(ny - py) > 0.001;
      [px, py] = [nx, ny];
    }
    input.moved = moved;
    const r = stepFight(f, input, rules, DT);
    f = r.fight;
    if (process.env.FIGHT_DEBUG && r.events.hurt) {
      const near = f.enemies
        .filter((e) => e[E_ALIVE])
        .map((e) => `${ENEMY_KINDS[e[E_KIND]]} m${e[E_MODE]} d${Math.round(Math.hypot(e[E_X] - px, e[E_Y] - py))}`);
      console.log(`HURT ${id} ${path} t${t.toFixed(1)} waves${f.waves.length} ${near.join(',')}`);
    }
    if (process.env.FIGHT_DEBUG && r.events.guttered) console.log(`GUTTER ${id} ${path} t${t.toFixed(1)}`);
    if (r.events.moveX !== 0 || r.events.moveY !== 0) [px, py] = move(grid, px, py, r.events.moveX, r.events.moveY);
    if (f.fallen) return { won: false, hearts: f.hp, seconds: Math.round(t), lost: f.sleepy >= 1 ? 'slept' : 'died' };
  }
  if (process.env.FIGHT_DEBUG)
    console.log(
      id,
      path,
      'at',
      Math.round(px),
      Math.round(py),
      'left',
      f.enemies
        .filter((e) => e[E_ALIVE])
        .map((e) => [ENEMY_KINDS[e[E_KIND]], Math.round(e[E_X]), Math.round(e[E_Y]), e[3], e[4]]),
    );
  return { won: false, hearts: f.hp, seconds: LIMIT, lost: 'time' };
}

const FIGHTS: MapId[] = [
  'cull-road',
  'barracks-hall',
  'barracks-armoury',
  'barracks-yard',
  'lower-barracks',
  'sleeping-keep',
  'the-pit',
  'kaldorium-maximus',
  'war-hall',
  'graveyard',
];

describe('fights', () => {
  // The author's rule (Oct 4, 2026): every Path can win every fight, every rung of a ladder, at any
  // level; being lower only means more hits to bring each one down (combat.ts hitsToBeat).
  const RUNGS = FIGHTS.flatMap((id) => {
    const flags = MAPS[id].ladder?.map((r) => r.flag) ?? [null];
    return flags.map((flag, i) => ({
      id,
      name: flag ?? id,
      won: MAPS[id].ladder ? (flags.slice(0, i) as string[]) : [],
    }));
  });
  it.each(RUNGS.flatMap((r) => [5, 10, 15, 20].map((level) => ({ ...r, level }))))(
    'every Path can win $name at Lv $level',
    ({ id, won, level }) => {
      expect(DIMENSIONS.filter((d) => !fight(id, d, level, won).won)).toEqual([]);
    },
  );

  // The full table: FIGHT_REPORT=1 npx jest fights (add FIGHT_NO_DODGE=1 for a player who never rolls,
  // FIGHT_TIME=1 for how many seconds each fight took). W# = won with # hearts left,
  // D = died, S = fell asleep, T = the bot ran out of time (usually the bot, not the fight).
  const report = process.env.FIGHT_REPORT ? it : it.skip;
  report('prints who wins each fight, by Path and hero level', () => {
    const rows: string[] = [];
    for (const id of FIGHTS) {
      for (const level of [5, 10, 15, 20]) {
        const cells = DIMENSIONS.map((d) => {
          const r = fight(id, d, level);
          const cell = r.won ? `W${r.hearts}` : r.lost === 'died' ? 'D' : r.lost === 'slept' ? 'S' : 'T';
          return process.env.FIGHT_TIME ? `${cell}/${r.seconds}` : cell;
        });
        rows.push(
          `${id.padEnd(17)} Lv${String(level).padEnd(3)} ${cells.map((c) => c.padEnd(process.env.FIGHT_TIME ? 8 : 4)).join('')}`,
        );
      }
    }
    console.log(`${' '.repeat(23)}${DIMENSIONS.map((d) => d.slice(0, 4).padEnd(4)).join('')}\n${rows.join('\n')}`);
  });
});
