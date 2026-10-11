import { FREED_FLAG, PRISONERS, PRISON_INTROS, garyWanders, prisonersBolt } from '../dungeon';
import { MAPS } from '../maps';
import { splitSpeaker, voiceFor } from '../portraits';

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

  it("lets the Kaloseum's welcome play (Episode 13): no menu put up over it, freed prisoners or not", () => {
    for (const key of ['pit-guards', 'pit-guards-alone']) expect(PRISON_INTROS[key].choices).toBeUndefined();
    expect(Object.keys(PRISON_INTROS).filter((k) => k.startsWith('pit-guards-freed'))).toEqual([]);
  });

  it('gives Balderek his face and his low voice, so his lines never show a bare "BALDEREK:"', () => {
    const said = splitSpeaker("BALDEREK: That's enough!");
    expect(said).toMatchObject({ speaker: 'Balderek', sprite: 'warden', text: "That's enough!" });
    expect(voiceFor(said.speaker, said.sprite)).toBe(1);
  });

  it("has the Warden's menu: one to ask, three that start the fight (Episode 14's first), one of them mean", () => {
    const warden = PRISON_INTROS['pit-warden'];
    expect(warden.questions?.map((q) => q.ask)).toEqual(["What's wrong with Barnaby?"]);
    expect(warden.choices?.map((c) => c.label)).toEqual([
      "How's the weather up there?",
      'Any chance you could let me go?',
      'Your poor mother.',
    ]);
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
