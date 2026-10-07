import { DEFAULT_PARTY, type CharacterId } from '@/story/companions';

import { partyWithYou } from '../hero';
import { MAPS, type MapId } from '../maps';
import { splitSpeaker } from '../portraits';
import { WALK_BANTER, walkBanterFlag, walkBanterFor } from '../walk-banter';

const everyone = Object.values(DEFAULT_PARTY);
const core = new Set<string>(everyone);

describe('walking banter', () => {
  it('happens in real places, on spots you can stand on', () => {
    for (const b of WALK_BANTER) {
      const map = MAPS[b.map as MapId];
      expect([b.id, !!map]).toEqual([b.id, true]);
      if (!b.area) continue;
      const [x1, y1, x2, y2] = b.area;
      let open = 0;
      for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++)
          if (x < map.width && y < map.tiles.length && !map.solid[y * map.width + x]) open++;
      expect([b.id, open > 0]).toEqual([b.id, true]);
    }
  });

  it('has a name for each, once, and plenty of them, solos and pairs', () => {
    const ids = WALK_BANTER.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(25);
    expect(WALK_BANTER.some((b) => b.with)).toBe(true);
    expect(WALK_BANTER.some((b) => !b.with)).toBe(true);
    // every one of the core eight gets a say somewhere
    for (const id of everyone) expect([id, WALK_BANTER.some((b) => b.who === id || b.with === id)]).toEqual([id, true]);
  });

  it('is spoken by the core eight, and every line shows its speaker, who is in it', () => {
    for (const b of WALK_BANTER) {
      expect([b.id, core.has(b.who), !b.with || core.has(b.with)]).toEqual([b.id, true, true]);
      const names = [b.who, b.with].filter(Boolean).map((id) => id!.toUpperCase());
      for (const line of b.lines) {
        const said = splitSpeaker(line);
        expect([line, said.sprite]).toEqual([line, expect.any(String)]);
        expect([line, names.includes(said.speaker!.toUpperCase())]).toEqual([line, true]);
      }
    }
  });

  it('plays once, on arrival, with the right party', () => {
    const party = ['quill', 'moss'] as CharacterId[];
    const first = walkBanterFor('archive', party, [])!;
    expect(first.id).toBe('archive-count');
    expect(walkBanterFor('archive', party, [walkBanterFlag(first)])).toBeNull();
    // one of the pair missing: nothing of theirs
    expect(walkBanterFor('archive', ['quill'] as CharacterId[], [])).toBeNull();
    expect(walkBanterFor('archive', ['tamsin'] as CharacterId[], [])?.id).toBe('archive-shelf');
    expect(walkBanterFor('nowhere', everyone, [])).toBeNull();
  });

  it("stays quiet for heroes you haven't met in this run of the story", () => {
    const owned = Object.fromEntries(everyone.map((id) => [id, 1]));
    expect(walkBanterFor('archive', partyWithYou(DEFAULT_PARTY, owned, []), [])).toBeNull();
    const met = partyWithYou(DEFAULT_PARTY, owned, ['met:tamsin']);
    expect(walkBanterFor('archive', met, [])?.id).toBe('archive-shelf');
  });

  it('plays a spot only when you stand on it, and before the arrival', () => {
    const party = ['brannoc', 'ysolde', 'pip'] as CharacterId[];
    // at the gate, not the statue
    expect(walkBanterFor('warrior-city', party, [], 2, 19)?.id).toBe('wc-bread');
    expect(walkBanterFor('warrior-city', party, [], 29, 23)?.id).toBe('wc-statue');
    // one arrival a visit: after that, only spots
    expect(walkBanterFor('warrior-city', party, [], 2, 19, true)).toBeNull();
    expect(walkBanterFor('warrior-city', party, [], 29, 23, true)?.id).toBe('wc-statue');
  });

  it('waits for its story flag', () => {
    const party = ['ysolde'] as CharacterId[];
    expect(walkBanterFor('the-pit', party, [])).toBeNull();
    expect(walkBanterFor('the-pit', party, ['pit-champion'])?.id).toBe('kaloseum-nuts');
  });
});
