import { ROSTER } from '@/story/companions';

import { ATTACKS, E_ALIVE, E_DEBT, E_HP, E_STUN, E_X, HEARTS, spawnEnemy, type Enemy } from '../combat';
import {
  CHARGE_TIME,
  DEBT_TICK,
  movesFor,
  startFight,
  stepFight,
  type Fight,
  type FightEvents,
  type FightInput,
  type FightRules,
} from '../fight';
import { SIGNATURES, SIGNATURE_LEVEL, type SignatureKind } from '../signatures';

const W = 30;
const H = 20;
const open = { solid: new Array(W * H).fill(0), width: W, height: H };
const DT = 1 / 60;

const rules = (special: SignatureKind, over: Partial<FightRules> = {}): FightRules => ({
  grid: open,
  attack: ATTACKS.physical,
  damage: 2,
  level: SIGNATURE_LEVEL,
  special,
  specialLevel: SIGNATURE_LEVEL,
  boss: false,
  bossX: 0,
  bossY: 0,
  throws: false,
  drowsy: 0,
  maxHp: HEARTS,
  ...over,
});
const input = (over: Partial<FightInput> = {}): FightInput => ({
  x: 100,
  y: 100,
  facing: 3,
  stickX: 0,
  stickY: 0,
  moved: false,
  press: false,
  held: false,
  release: false,
  dodge: false,
  ...over,
});

/** An echo stands still (nothing interrupts the charge), with as much health as a test needs. */
const dummy = (x: number, y = 100, hp = 4) => {
  const e = spawnEnemy('echo', x, y);
  e[E_HP] = hp;
  return e;
};

/** Holds the attack, lets go, and returns the fight and what happened as it went off. */
function unleash(enemies: Enemy[], r: FightRules, start?: Partial<Fight>) {
  let f = { ...startFight(enemies), ...start };
  for (let t = 0; t < CHARGE_TIME + 0.05; t += DT) f = stepFight(f, input({ held: true }), r, DT).fight;
  return stepFight(f, input({ release: true }), r, DT);
}
/** Plays on for `seconds`, standing still, collecting every event. */
function playOn(f: Fight, r: FightRules, seconds: number) {
  const events: FightEvents[] = [];
  for (let t = 0; t < seconds; t += DT) {
    const s = stepFight(f, input(), r, DT);
    f = s.fight;
    events.push(s.events);
  }
  return { fight: f, events };
}

describe('signature moves', () => {
  it('gives each core companion their own, and lists only it on their sheet', () => {
    for (const c of ROSTER.filter((x) => x.kind === 'core')) expect(SIGNATURES[c.id]).toBeDefined();
    const moves = movesFor('physical', 10, SIGNATURES.brannoc!);
    expect(moves).toEqual([expect.objectContaining({ name: 'Sweetheart Swing', level: 10, unlocked: true })]);
    expect(movesFor('physical', 9, SIGNATURES.brannoc!)[0].unlocked).toBe(false);
  });

  it('goes off at Lv 10 and shouts; below it, nothing charges', () => {
    const at = unleash([spawnEnemy('echo', 112, 100)], rules('sweetheart'));
    expect(at.events.signature).toBe(true);
    const below = unleash([spawnEnemy('echo', 112, 100)], rules('sweetheart', { level: 9 }));
    expect(below.events.swing).toBe(false);
  });

  it('Sweetheart Swing hits all round Brannoc, then hops him back', () => {
    const r = unleash([spawnEnemy('echo', 112, 100), spawnEnemy('echo', 88, 100)], rules('sweetheart'));
    expect(r.events.hits).toBe(2);
    expect(r.events.moveX).toBeLessThan(-20); // facing right, he backs off left
  });

  it('Collect the Tab drains debt a heart at a time until the enemy falls', () => {
    const r = rules('tab', { attack: ATTACKS.financial });
    const went = unleash([spawnEnemy('rusted', 150, 100)], r);
    expect(went.fight.enemies[0][E_DEBT]).toBeGreaterThan(0);
    expect(went.fight.enemies[0][E_STUN]).toBeGreaterThan(1.5);
    const later = playOn(went.fight, r, DEBT_TICK * 6 + 0.1);
    expect(later.fight.enemies[0][E_ALIVE]).toBe(0);
    expect(later.events.some((e) => e.ticked.length > 0)).toBe(true);
    expect(later.events.reduce((n, e) => n + e.kills, 0)).toBe(1);
  });

  it('Footnote Barrage throws five bolts', () => {
    const r = unleash([spawnEnemy('echo', 200, 100)], rules('footnotes', { attack: ATTACKS.intellectual }));
    expect(r.fight.bolts).toHaveLength(5);
  });

  it('Lantern Vigil mends once and freezes only those close', () => {
    const r = unleash([dummy(130), dummy(220)], rules('vigil', { attack: ATTACKS.spiritual }), { hp: 3 });
    expect(r.fight.hp).toBe(4);
    expect(r.fight.enemies[0][E_STUN]).toBeGreaterThan(2);
    expect(r.fight.enemies[1][E_STUN]).toBe(0);
  });

  it('One Breath holds still and untouchable, then the palm sends them flying', () => {
    const r = rules('breath', { attack: ATTACKS.emotional });
    const went = unleash([dummy(150, 100, 20)], r);
    expect(went.fight.enemies[0][E_HP]).toBe(20); // nothing yet: he's breathing
    expect(went.fight.mercy).toBeGreaterThan(0.5);
    const later = playOn(went.fight, r, 0.6);
    expect(later.fight.enemies[0][E_HP]).toBeLessThan(20);
    expect(later.fight.enemies[0][E_X]).toBeGreaterThan(190);
  });

  it('Encore plays the shockwave twice', () => {
    const r = rules('encore', { attack: ATTACKS.social });
    const went = unleash([dummy(120, 100, 20)], r);
    const first = went.fight.enemies[0][E_HP];
    expect(first).toBeLessThan(20);
    const later = playOn(went.fight, r, 0.5);
    expect(later.fight.enemies[0][E_HP]).toBeLessThan(first);
  });

  it('Hold This throws one huge wrench that hits a whole line, out and back twice', () => {
    const r = rules('holdthis', { attack: ATTACKS.occupational });
    const line = [dummy(130, 100, 20), dummy(150, 104, 20), dummy(170, 96, 20)];
    const went = unleash(line, r);
    expect(went.fight.bolts).toHaveLength(1);
    expect(went.fight.bolts[0][8]).toBe(3);
    const later = playOn(went.fight, r, 3);
    // every one in the line takes the wrench more than once (heavy hits are 3 each)
    for (const e of later.fight.enemies) expect(e[E_HP]).toBeLessThanOrEqual(20 - 6);
  });

  it('Arrow Barrage needs a real habit today, then rains on everyone in range, twice', () => {
    const r = rules('barrage', { attack: ATTACKS.environmental });
    const not = unleash([dummy(160, 100, 20)], { ...r, barrageReady: false });
    expect(not.events.barrage).toBe(false);
    expect(not.events.signature).toBe(false);
    expect(not.fight.rain).toHaveLength(0);

    const pack = [dummy(130, 60, 20), dummy(170, 140, 20), dummy(60, 100, 20), dummy(400, 100, 20)];
    const went = unleash(pack, { ...r, barrageReady: true });
    expect(went.events.barrage).toBe(true);
    expect(went.fight.rain).toHaveLength(6); // two volleys on each of the three in range
    const later = playOn({ ...went.fight, bolts: [] }, r, 1);
    const hp = later.fight.enemies.map((e) => e[E_HP]);
    expect(hp.slice(0, 3)).toEqual([16, 16, 16]); // 2 a volley, twice
    expect(hp[3]).toBe(20); // out of range

    // once a fight (and, in the World, once a day): a second charge is just a charged arrow
    const again = unleash(later.fight.enemies, { ...r, barrageReady: true }, { rained: true });
    expect(again.events.barrage).toBe(false);
  });
});
