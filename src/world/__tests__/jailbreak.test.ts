import { FREED_FLAG, PRISONERS, PRISON_INTROS, garyWanders, prisonersBolt } from '../dungeon';
import { MAPS } from '../maps';

const cells = MAPS['kingdom-dungeon'];
const floor = ([x, y]: [number, number]) => cells.walkable.includes(cells.tiles[y][x]) || cells.tiles[y][x] === '1';

describe("Gary's keys and the jailbreak", () => {
  it('names the three prisoners as the map does, and they leave once freed', () => {
    for (const name of PRISONERS) {
      const npc = cells.npcs.find((n) => n.name === name);
      expect([name, npc?.goneAfter]).toEqual([name, FREED_FLAG]);
    }
  });

  it('walks Gary and the prisoners along the corridor to the ladder', () => {
    for (const a of [...garyWanders(0), ...prisonersBolt([0, 1, 2])]) {
      for (const p of a.path) expect([p, floor(p)]).toEqual([p, true]);
      expect(a.path[a.path.length - 1]).toEqual([20, 8]);
    }
  });

  it('has the Kaloseum waiting for them, with or without Brannoc: Barnaby, his menu, and the guards', () => {
    for (const key of ['pit-guards-freed', 'pit-guards-freed-alone']) {
      const intro = PRISON_INTROS[key];
      expect(intro.lines.join(' ')).toContain("You haven't been here twenty minutes");
      expect(intro.choices?.map((c) => c.label)).toEqual(['Who are you?', "You're too loud."]);
      for (const c of intro.choices!) expect(c.lines.join(' ')).toContain('brings me {his} head');
      expect(intro.choices!.filter((c) => c.deed === 'bad')).toHaveLength(1);
    }
    expect(PRISON_INTROS['pit-guards-freed-alone'].lines.join(' ')).not.toContain('Brannoc');
  });

  it("has the Warden's menu: one to ask, two that start the fight, one of them mean", () => {
    const warden = PRISON_INTROS['pit-warden'];
    expect(warden.questions?.map((q) => q.ask)).toEqual(['Who are you?']);
    expect(warden.choices?.map((c) => c.label)).toEqual(['Any chance you could let me go?', 'Your poor mother.']);
    expect(warden.choices!.filter((c) => c.deed === 'bad')).toHaveLength(1);
  });
});

describe('after the warden', () => {
  it('the three of them turn up at the Warrior City tavern, once pardoned', () => {
    const { PARDONED } = jest.requireActual('../dungeon') as typeof import('../dungeon');
    const tavern = MAPS['wc-tavern'];
    for (const name of PRISONERS) {
      const npc = tavern.npcs.find((n) => n.name === name);
      expect([name, npc?.comesAfter]).toEqual([name, PARDONED]);
      expect(tavern.walkable).toContain(tavern.tiles[npc!.y][npc!.x]);
    }
  });
});

describe("Silas's raven", () => {
  it("takes the place of Kaldor's last line once you've freed him, and only then", () => {
    const { withRaven, SILAS_RAVEN } = jest.requireActual('../dungeon') as typeof import('../dungeon');
    const speech = MAPS['war-hall'].boss!.intro!.lines;
    expect(withRaven('war-hall', speech, [])).toEqual(speech);
    const told = withRaven('war-hall', speech, [FREED_FLAG]);
    expect(told.slice(0, -SILAS_RAVEN.length)).toEqual(speech.slice(0, -1));
    expect(told[told.length - 1]).toBe('Unfortunately for you, you are still a threat to my rule.');
    expect(withRaven('the-pit', speech, [FREED_FLAG])).toEqual(speech);
  });
});
