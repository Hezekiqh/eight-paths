import { DEFAULT_PARTY, ROSTER, type CharacterId } from '@/story/companions';

import { BANTER, banterFor } from '../banter';
import { MAPS, type MapId } from '../maps';
import { splitSpeaker } from '../portraits';

describe('party banter', () => {
  it('only hangs off people and signs that exist', () => {
    for (const key of Object.keys(BANTER)) {
      const [mapId, objectId] = key.split(':');
      const thing = MAPS[mapId as MapId]?.objects.find((o) => o.id === objectId);
      expect([key, thing?.type]).toEqual([key, expect.stringMatching(/^(npc|sign)$/)]);
    }
  });

  it('is spoken by real characters, and every named line shows the speaker', () => {
    const ids = new Set(ROSTER.map((c) => c.id));
    for (const [key, options] of Object.entries(BANTER))
      for (const { who, lines } of options) {
        expect([key, ids.has(who)]).toEqual([key, true]);
        for (const line of lines) {
          if (!/^[A-Z][A-Z' ]+: /.test(line)) continue;
          expect([line, splitSpeaker(line).sprite]).toEqual([line, expect.any(String)]);
        }
      }
  });

  it('lets the first listed party member speak, and nobody when none of them came', () => {
    const party = Object.values(DEFAULT_PARTY);
    expect(banterFor('march-road', 'bo', party)[0]).toMatch(/^PIP: /);
    expect(banterFor('march-road', 'bo', [...party, 'plush' as CharacterId])[0]).toMatch(/^PLUSH: /);
    expect(banterFor('march-road', 'grask', ['brannoc' as CharacterId])).toEqual([]);
    expect(banterFor('millbrook', 'nowhere', party)).toEqual([]);
  });

  it('plays a two-person exchange only when both of them came', () => {
    expect(banterFor('deserters-camp', 'fen', ['brannoc', 'oren'] as CharacterId[])).toContain('OREN: Slower.');
    expect(banterFor('deserters-camp', 'fen', ['brannoc'] as CharacterId[])).not.toContain('OREN: Slower.');
    expect(banterFor('deserters-camp', 'fen', ['brannoc'] as CharacterId[])[0]).toMatch(/^BRANNOC: /);
  });
});
