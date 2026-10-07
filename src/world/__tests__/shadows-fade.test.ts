import { MAPS, SHADOWS_FADE, withoutGone, withoutShadows, type MapId } from '../maps';

// Kaldor beaten (author, Oct 7, 2026): his power leaves him, and his shadow soldiers fade everywhere with it.

const SHADOW_ROOMS: MapId[] = ['barracks-yard', 'barracks-hall', 'lower-barracks', 'royal-dungeon'];

describe('when Kaldor falls, his shadows fade', () => {
  it.each(SHADOW_ROOMS)('%s has shadows to fight before', (id) => {
    const map = withoutShadows(MAPS[id], []);
    expect(map).toBe(MAPS[id]);
    expect(map.enemies.some((e) => e.kind === 'shadow')).toBe(true);
  });

  it.each(SHADOW_ROOMS)('%s has none after, and keeps everything else', (id) => {
    const map = withoutShadows(MAPS[id], ['pit-champion', SHADOWS_FADE]);
    expect(map.enemies.filter((e) => e.kind === 'shadow')).toEqual([]);
    expect(map.enemies).toEqual(MAPS[id].enemies.filter((e) => e.kind !== 'shadow'));
  });

  it("leaves the barracks yard's echo to fight on", () => {
    const yard = withoutShadows(MAPS['barracks-yard'], [SHADOWS_FADE]);
    expect(yard.enemies.map((e) => e.kind)).toContain('echo');
  });

  it('every room with shadows in it is one of these', () => {
    const withShadows = (Object.keys(MAPS) as MapId[]).filter((id) =>
      MAPS[id].enemies.some((e) => e.kind === 'shadow'),
    );
    expect(withShadows.sort()).toEqual([...SHADOW_ROOMS].sort());
  });

  it('the royal dungeon says so: the rack board changes, and the Rackwarden has news', () => {
    const before = withoutGone(MAPS['royal-dungeon'], []);
    const after = withoutGone(MAPS['royal-dungeon'], [SHADOWS_FADE]);
    expect(before.objects.map((o) => o.id)).toContain('rack-tag');
    expect(before.objects.map((o) => o.id)).not.toContain('racks-empty');
    expect(after.objects.map((o) => o.id)).toContain('racks-empty');
    expect(after.objects.map((o) => o.id)).not.toContain('rack-tag');
    const empty = after.objects.find((o) => o.id === 'racks-empty');
    expect(empty?.type === 'sign' && empty.lines.join(' ')).toMatch(/snuffed candle/);
    const warden = after.npcs.find((n) => n.id === 'rackwarden');
    expect(warden?.after?.flag).toBe(SHADOWS_FADE);
  });
});
