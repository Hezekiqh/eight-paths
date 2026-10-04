import { FREED_FLAG, KEYS_FLAG, PRISONERS, PRISON_INTROS, garyWanders, prisonersBolt } from '../dungeon';
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

  it('Gary leaves once he has handed over the keys', () => {
    expect(cells.npcs.find((n) => n.id === 'jailer')?.goneAfter).toBe(KEYS_FLAG);
  });

  it('walks Gary and the prisoners along the corridor to the ladder', () => {
    for (const a of [...garyWanders(0), ...prisonersBolt([0, 1, 2])]) {
      for (const p of a.path) expect([p, floor(p)]).toEqual([p, true]);
      expect(a.path[a.path.length - 1]).toEqual([20, 8]);
    }
  });

  it('has the Colosseum waiting for them, with or without Brannoc', () => {
    for (const key of ['pit-guards-freed', 'pit-guards-freed-alone']) {
      const lines = PRISON_INTROS[key].lines.join(' ');
      expect(lines).toContain('What is your name?');
      expect(lines).toContain('BEAT YOU A LESSON');
    }
    expect(PRISON_INTROS['pit-guards-freed-alone'].lines.join(' ')).not.toContain('Brannoc');
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
