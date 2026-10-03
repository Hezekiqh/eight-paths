import { ATTACKS, E_HP, E_MODE, E_X, EXPOSED, HEARTS, RECOVER, WINDUP, spawnEnemy, type Enemy } from '../combat';
import { CHARGE_TIME, aim, startFight, stepFight, type FightInput, type FightRules } from '../fight';

const W = 30;
const H = 20;
const open = { solid: new Array(W * H).fill(0), width: W, height: H };
const DT = 1 / 60;

const rules = (over: Partial<FightRules> = {}): FightRules => ({
  grid: open,
  attack: ATTACKS.physical,
  damage: 2,
  level: 5,
  special: 'spin',
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
const withMode = (e: Enemy, mode: number) => {
  const n = e.slice();
  n[E_MODE] = mode;
  return n;
};

describe('fights', () => {
  it('takes exactly one hp off the warden a strike, however hard you hit', () => {
    const f = startFight([withMode(spawnEnemy('warden', 112, 100), RECOVER)]);
    const r = stepFight(f, input({ press: true }), rules({ damage: 9 }), DT);
    expect(r.fight.enemies[0][E_HP]).toBe(29);
  });

  it('ends a hold-out fight once the boss has taken enough, still standing (the prison-route warden)', () => {
    const hurt = spawnEnemy('warden', 300, 300);
    hurt[E_HP] = 11; // 19 strikes taken
    const before = stepFight(startFight([hurt]), input(), rules({ boss: true, holdOut: 20 }), DT);
    expect(before.fight.won).toBe(false);
    hurt[E_HP] = 10;
    const after = stepFight(startFight([hurt]), input(), rules({ boss: true, holdOut: 20 }), DT);
    expect(after.fight.won).toBe(true);
    expect(after.fight.enemies[0][7]).toBe(1);
  });

  it("shrugs off Kaldor's hits until a torch gutters", () => {
    const guarded = startFight([spawnEnemy('kaldor', 112, 100)]);
    const a = stepFight(guarded, input({ press: true }), rules(), DT);
    expect(a.events.clangs).toBe(1);
    expect(a.fight.enemies[0][E_HP]).toBe(20);
    const open = startFight([withMode(spawnEnemy('kaldor', 112, 100), EXPOSED)]);
    const b = stepFight(open, input({ press: true }), rules(), DT);
    expect(b.events.hits).toBe(1);
    expect(b.fight.enemies[0][E_HP]).toBe(18);
  });

  it('lets a torch gutter when Kaldor charges into a wall', () => {
    const walled = { ...open, solid: open.solid.map((_, i) => (i % W === 12 ? 1 : 0)) };
    let f = startFight([spawnEnemy('kaldor', 150, 100)]);
    let guttered = false;
    for (let t = 0; t < 6 && !guttered; t += DT) {
      const r = stepFight(f, input({ x: 180, y: 100 }), rules({ grid: walled }), DT);
      f = r.fight;
      guttered ||= r.events.guttered;
    }
    // He can't reach you through the wall, so each charge ends in it (or two misses gutter a torch anyway).
    expect(guttered).toBe(true);
    expect(f.enemies[0][E_MODE]).toBe(EXPOSED);
  });

  it("can't hurt you mid-roll", () => {
    let f = startFight([spawnEnemy('shadow', 100, 100)]);
    const r = stepFight(f, input({ dodge: true }), rules(), DT);
    expect(r.events.rolled).toBe(true);
    f = r.fight;
    const s = stepFight(f, input(), rules(), DT);
    expect(s.events.hurt).toBe(false);
    expect(s.fight.hp).toBe(HEARTS);
  });

  it('charges a heavier blow from Lv 10, by holding then letting go', () => {
    const hold = (level: number) => {
      // an echo stands still, so nothing interrupts the charge (being hurt does)
      let f = startFight([spawnEnemy('echo', 112, 100)]);
      for (let t = 0; t < CHARGE_TIME + 0.05; t += DT)
        f = stepFight(f, input({ held: true }), rules({ level }), DT).fight;
      return stepFight(f, input({ release: true }), rules({ level }), DT);
    };
    const charged = hold(10);
    expect(charged.events.charged).toBe(true);
    expect(charged.fight.enemies[0][E_HP]).toBe(1); // 2 damage, charged to 3, against 4
    expect(hold(9).events.swing).toBe(false);
  });

  it('makes a charged blow wait for the last one to recover', () => {
    const r = rules({ level: 10 });
    let f = startFight([spawnEnemy('echo', 112, 100)]);
    f = stepFight(f, input({ press: true, held: true }), r, DT).fight; // a tap lands at once
    for (let t = 0; t < CHARGE_TIME; t += DT) f = stepFight(f, input({ held: true }), r, DT).fight;
    f = { ...f, cooldown: 0.2 }; // still recovering as you let go
    const let_go = stepFight(f, input({ release: true }), r, DT);
    expect(let_go.events.charged).toBe(false);
    f = let_go.fight;
    let fired = false;
    for (let t = 0; t < 0.3 && !fired; t += DT) {
      const s = stepFight(f, input(), r, DT);
      f = s.fight;
      fired = s.events.charged;
    }
    expect(fired).toBe(true);
  });

  it("closes Kaldor's window once he's taken a third of his health", () => {
    let f = startFight([withMode(spawnEnemy('kaldor', 112, 100), EXPOSED)]);
    const r = rules({ damage: 7 });
    f = stepFight(f, input({ press: true }), r, DT).fight;
    expect(f.enemies[0][E_HP]).toBe(13);
    expect(f.enemies[0][E_MODE]).not.toBe(EXPOSED);
  });

  it("turns half of every close blow on Aurek's hide, except while he rises", () => {
    const hit = (mode: number) =>
      stepFight(
        startFight([withMode(spawnEnemy('aurek', 112, 100), mode)]),
        input({ press: true }),
        rules({ damage: 4 }),
        DT,
      ).fight.enemies[0][E_HP];
    expect(hit(0)).toBe(10); // 12 health, the blow halved
    expect(hit(RECOVER)).toBe(8); // in full while he rises
  });

  it("mends a heart once a fight with the Cleric's special", () => {
    let f = { ...startFight([spawnEnemy('shadow', 200, 200)]), hp: 3 };
    const mend = (fight: typeof f) => {
      let g = fight;
      for (let t = 0; t < CHARGE_TIME + 0.05; t += DT)
        g = stepFight(
          g,
          input({ held: true }),
          rules({ level: 20, special: 'mend', attack: ATTACKS.spiritual }),
          DT,
        ).fight;
      return stepFight(
        g,
        input({ release: true }),
        rules({ level: 20, special: 'mend', attack: ATTACKS.spiritual }),
        DT,
      );
    };
    const once = mend(f);
    expect(once.events.mended).toBe(true);
    f = once.fight;
    expect(f.hp).toBe(4);
    expect(mend(f).fight.hp).toBe(4);
  });

  it('throws bolts at the nearest enemy in range, else where you face', () => {
    const [dx, dy] = aim([spawnEnemy('shadow', 100, 160)], 100, 100, 3, 0, 0, 120);
    expect(dx).toBeCloseTo(0);
    expect(dy).toBeGreaterThan(0.9);
    expect(aim([spawnEnemy('shadow', 100, 400)], 100, 100, 3, 0, 0, 120)).toEqual([1, 0]);
  });

  it("stops the Rushing Palm short of whoever's in the way", () => {
    let f = startFight([spawnEnemy('aurek', 130, 100)]);
    const r = rules({ level: 20, special: 'rush', attack: ATTACKS.emotional });
    for (let t = 0; t < CHARGE_TIME + 0.05; t += DT) f = stepFight(f, input({ held: true }), r, DT).fight;
    const ev = stepFight(f, input({ release: true }), r, DT).events;
    expect(ev.moveX).toBeLessThan(30 - 12);
  });

  it("hurts where Aurek's slam ring passes you, not inside it", () => {
    let f = startFight([withMode(spawnEnemy('aurek', 100, 100), WINDUP)]);
    let hurtAt = -1;
    for (let t = 0; t < 1.2 && hurtAt < 0; t += DT) {
      const r = stepFight(f, input({ x: 130, y: 100 }), rules(), DT);
      f = r.fight;
      if (r.events.hurt) hurtAt = t;
    }
    expect(hurtAt).toBeGreaterThan(0.8); // after the tell, as the ring reaches you
    expect(f.enemies[0][E_X]).toBe(100);
  });
});
