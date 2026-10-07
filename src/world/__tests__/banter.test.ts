import { DEFAULT_PARTY, ROSTER, type CharacterId } from '@/story/companions';

import { BANTER, banterFor } from '../banter';
import { partyWithYou } from '../hero';
import { MAPS, type MapId } from '../maps';
import { MEMORIES } from '../memories';
import { splitSpeaker } from '../portraits';

describe('party banter', () => {
  it('only hangs off people, signs, tiles and memories that exist', () => {
    for (const key of Object.keys(BANTER)) {
      const [mapId, objectId, letter] = key.split(':');
      const map = MAPS[mapId as MapId];
      // "tile:<letter>": a tile you examine, which has something to say of its own
      if (objectId === 'tile') {
        expect([key, map?.examine[letter]?.length ?? 0]).toEqual([key, expect.any(Number)]);
        expect(map.examine[letter].length).toBeGreaterThan(0);
        continue;
      }
      // a memory's id: the party has its say once the memory closes
      const memory = MEMORIES.find((m) => m.id === objectId);
      if (memory) {
        expect([key, memory.map]).toEqual([key, mapId]);
        continue;
      }
      const thing = map?.objects.find((o) => o.id === objectId);
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

  it('lets every listed party member speak, in order, and nobody when none of them came', () => {
    const party = Object.values(DEFAULT_PARTY);
    expect(banterFor('march-road', 'bo', party)[0]).toMatch(/^PIP: /);
    const both = banterFor('march-road', 'bo', [...party, 'plush' as CharacterId]);
    expect(both[0]).toMatch(/^PLUSH: /);
    expect(both.some((l) => l.startsWith('PIP: '))).toBe(true);
    expect(banterFor('march-road', 'grask', ['brannoc' as CharacterId])).toEqual([]);
    expect(banterFor('millbrook', 'nowhere', party)).toEqual([]);
  });

  it('plays a two-person exchange only when both of them came', () => {
    expect(banterFor('deserters-camp', 'fen', ['brannoc', 'oren'] as CharacterId[])).toContain('OREN: Slower.');
    expect(banterFor('deserters-camp', 'fen', ['brannoc'] as CharacterId[])).not.toContain('OREN: Slower.');
    expect(banterFor('deserters-camp', 'fen', ['brannoc'] as CharacterId[])[0]).toMatch(/^BRANNOC: /);
  });

  it("doesn't repeat someone who already spoke in a pair, but lets the rest pile in", () => {
    const lines = banterFor('deserters-camp', 'fen', ['brannoc', 'oren', 'wren'] as CharacterId[]);
    expect(lines.filter((l) => l.startsWith('BRANNOC: Haunted?'))).toHaveLength(1);
    expect(lines.at(-1)).toMatch(/^WREN: /);
  });

  it("stays quiet for party members you haven't met yet", () => {
    // A new save: all eight in the party, only the hero you woke as with you.
    const party = partyWithYou(DEFAULT_PARTY, { quill: 1 });
    expect(party).toEqual(['quill']);
    expect(banterFor('millbrook', 'hoot', party)).toEqual([]);
    expect(banterFor('courier-road', 'nib', partyWithYou(DEFAULT_PARTY, { brannoc: 1 })).join()).not.toContain('OREN');
  });
});
