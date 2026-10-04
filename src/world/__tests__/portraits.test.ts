import { MAPS } from '../maps';
import { portraitFor, splitSpeaker, voiceFor } from '../portraits';

const allText = () =>
  Object.values(MAPS).flatMap((map) => JSON.stringify(map.objects) + JSON.stringify(map.boss ?? {}));

describe('portraits', () => {
  it('finds a face for everyone who talks', () => {
    for (const map of Object.values(MAPS)) {
      for (const npc of map.npcs) expect(portraitFor(npc.name)).toBeDefined();
    }
    expect(portraitFor('Kaldor the Kingbreaker')).toBe('kaldor');
    expect(portraitFor('The Keeper')).toBe('keeper');
  });

  it('hands a line to whoever is named at its start', () => {
    expect(splitSpeaker('VARGA: Move.')).toEqual({
      speaker: 'Varga',
      sprite: portraitFor('Captain Varga'),
      text: 'Move.',
    });
    expect(splitSpeaker('LITTLE BRUNNA: Grr.').speaker).toBe('Little Brunna');
  });

  it('leaves signs and narration alone', () => {
    expect(splitSpeaker('BY ORDER OF THE KING: No singing.')).toEqual({ text: 'BY ORDER OF THE KING: No singing.' });
    expect(splitSpeaker('The plaque: Here stood a king.')).toEqual({ text: 'The plaque: Here stood a king.' });
  });

  it('gives the big a low voice and each speaker the same voice every time', () => {
    expect(voiceFor('Kaldor the Kingbreaker', 'kaldor')).toBe(1);
    expect(voiceFor('Gert', 'gert')).toBe(voiceFor('Gert', 'gert'));
  });
});

describe('the Entity stays a mystery', () => {
  it('is never named by anyone in Season 1', () => {
    for (const text of allText()) expect(text).not.toMatch(/Entity/);
  });
});

describe("the Keeper's voice", () => {
  it('is deeper than anyone else, his alone', () => {
    expect(voiceFor('The Keeper', 'keeper')).toBe(0);
    expect(voiceFor('Kaldor the Kingbreaker', 'kaldor')).toBeGreaterThan(0);
  });
});

describe("narration in a speaker's box", () => {
  it('a line starting "* " is narration: no name, no face', () => {
    const { splitSpeaker } = jest.requireActual('../portraits') as typeof import('../portraits');
    expect(splitSpeaker('* He snaps his fingers.')).toEqual({ text: 'He snaps his fingers.', narration: true });
    expect(splitSpeaker('*squeak*').narration).toBeUndefined();
  });
});
