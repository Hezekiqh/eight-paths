import { Canvas, FilterMode, Image, MipmapMode, Rect, useImage } from '@shopify/react-native-skia';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Segmented } from '@/components/segmented';
import { haptics } from '@/haptics';
import { useXpTotals } from '@/store/hooks';
import { colors, fonts, spacing } from '@/theme';
import { MAPS, TILE, type MapId, type WorldMap } from '@/world/maps';
import { EXITS, describeRequirement, standing } from '@/world/progress';

const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };
const GOLD = '#FFD27A';

/**
 * Where each area sits on the world map, as fractions of the map's width and
 * height. Only areas the player has set foot in are ever drawn; everything else
 * stays black. The Archive floats alone: it's outside space and time.
 */
const AREA_SPOTS: Record<MapId, { x: number; y: number }> = {
  archive: { x: 0.5, y: 0.3 },
  'courier-road': { x: 0.5, y: 0.62 },
};

type Zoom = 'world' | 'area';
const ZOOMS = [
  { value: 'area', label: 'Area' },
  { value: 'world', label: 'World' },
] as const;

type Props = {
  map: WorldMap;
  /** Where the player stands, in art pixels. */
  you: { x: number; y: number };
  discovered: MapId[];
  width: number;
  height: number;
  onClose: () => void;
};

/**
 * The World map, opened from the pause menu. Area shows the room you're in;
 * World shows only the places you've been, everything else solid black: no
 * outlines, no names, no hints. Ways out show as a short stub into the dark.
 */
export function WorldMapView({ map, you, discovered, width, height, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [zoom, setZoom] = useState<Zoom>('area');
  const xp = useXpTotals();
  const exits = EXITS.filter((e) => e.from === map.id && !e.back);
  const left = Math.max(insets.left, spacing.lg);
  const right = Math.max(insets.right, spacing.lg);
  const boxW = width - left - right;
  const boxH = height - 64 - 56 - Math.max(insets.bottom, spacing.sm);

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <View style={[styles.header, { paddingLeft: left, paddingRight: right }]}>
        <Text style={styles.title}>MAP</Text>
        <View style={styles.zoom}>
          <Segmented options={ZOOMS} value={zoom} onChange={setZoom} color={colors.accent} />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.tap();
            onClose();
          }}
          hitSlop={10}>
          <Text style={styles.close}>CLOSE</Text>
        </Pressable>
      </View>

      <View style={{ width: boxW, height: boxH, marginLeft: left }}>
        {zoom === 'area' ? (
          <AreaMap map={map} you={you} width={boxW} height={boxH} />
        ) : (
          <WorldOverview discovered={discovered} here={map.id as MapId} width={boxW} height={boxH} />
        )}
      </View>

      <View style={[styles.legend, { paddingLeft: left, paddingRight: right }]}>
        {exits.map((exit) => {
          const s = standing(exit.needs, xp);
          return (
            <Text key={exit.id} style={styles.legendText}>
              <Text style={{ color: GOLD }}>▢ </Text>
              {exit.label} · {describeRequirement(exit.needs)}
              {s.met ? ' ✓' : ` (you're Lv ${s.have})`}
            </Text>
          );
        })}
        <Text style={styles.legendText}>
          <Text style={{ color: GOLD }}>♥ </Text>You
        </Text>
      </View>
    </View>
  );
}

/** The room you're in, whole, with you and its ways out marked. */
function AreaMap({ map, you, width, height }: { map: WorldMap; you: Props['you']; width: number; height: number }) {
  const image = useImage(map.image);
  const artW = map.width * TILE;
  const artH = map.height * TILE;
  // Whole pixels per art pixel once there's room for two or more, so the pixel art stays sharp.
  const fit = Math.min(width / artW, height / artH);
  const scale = fit >= 2 ? Math.floor(fit) : fit;
  const w = artW * scale;
  const h = artH * scale;
  const ox = (width - w) / 2;
  const oy = (height - h) / 2;
  const exits = EXITS.filter((e) => e.from === map.id).map((e) => ({ exit: e, box: tileBox(map, e.tile) }));

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {image && <Image image={image} x={ox} y={oy} width={w} height={h} sampling={NEAREST} />}
        {exits.map(({ exit, box }) =>
          box ? (
            <Rect
              key={exit.id}
              x={ox + box.x * TILE * scale - 2}
              y={oy + box.y * TILE * scale - 2}
              width={box.w * TILE * scale + 4}
              height={box.h * TILE * scale + 4}
              color={GOLD}
              style="stroke"
              strokeWidth={2}
            />
          ) : null,
        )}
      </Canvas>
      <Text
        style={[styles.you, { left: ox + you.x * scale - 8, top: oy + you.y * scale - 20 }]}
        accessibilityLabel="You are here">
        ♥
      </Text>
    </View>
  );
}

/** The places you've been, and nothing else. */
function WorldOverview({
  discovered,
  here,
  width,
  height,
}: {
  discovered: MapId[];
  here: MapId;
  width: number;
  height: number;
}) {
  const places = (Object.keys(AREA_SPOTS) as MapId[]).filter((id) => discovered.includes(id) || id === here);
  return (
    <View style={[styles.dark, { width, height }]}>
      {places.map((id) => {
        const spot = AREA_SPOTS[id];
        const ways = EXITS.filter((e) => e.from === id && !e.back);
        return (
          <View
            key={id}
            style={[styles.place, { left: spot.x * width - 70, top: spot.y * height - 22 }]}
            accessible
            accessibilityLabel={`${MAPS[id].name}${id === here ? ', you are here' : ''}`}>
            <View style={[styles.placeBox, id === here && styles.placeHere]}>
              <Text style={styles.placeName}>{MAPS[id].name}</Text>
            </View>
            {/* Each way out: a short path that fades into the dark. */}
            {ways.map((w) => {
              // A path to somewhere you've been is solid; one into the unknown fades into the dark.
              const known = w.to !== null && discovered.includes(w.to.map);
              return (
                <View key={w.id} style={styles.stub}>
                  <View style={[styles.stubDash, { opacity: known ? 1 : 0.9 }]} />
                  <View style={[styles.stubDash, { opacity: known ? 1 : 0.55 }]} />
                  <View style={[styles.stubDash, { opacity: known ? 1 : 0.25 }]} />
                </View>
              );
            })}
          </View>
        );
      })}
      <Text style={styles.hint}>Places appear here once you&apos;ve been there.</Text>
    </View>
  );
}

/** The bounding box, in tiles, of every tile with this letter. */
function tileBox(map: WorldMap, letter: string): { x: number; y: number; w: number; h: number } | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  map.tiles.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== letter) return;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }),
  );
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  title: { color: GOLD, fontFamily: fonts.bold, fontSize: 32, letterSpacing: 3 },
  zoom: { width: 220 },
  close: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 20, letterSpacing: 1, marginLeft: 'auto' },
  legend: { height: 56, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.lg },
  legendText: { color: '#C9C5DA', fontFamily: fonts.regular, fontSize: 13 },
  you: { position: 'absolute', color: GOLD, fontSize: 16, width: 16, textAlign: 'center' },
  dark: { backgroundColor: '#000000' },
  place: { position: 'absolute', width: 140, alignItems: 'center' },
  placeBox: {
    borderWidth: 2,
    borderColor: '#5A5670',
    backgroundColor: '#12101A',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  placeHere: { borderColor: GOLD },
  placeName: { color: '#FFFFFF', fontFamily: fonts.dialogue, fontSize: 16 },
  stub: { alignItems: 'center', gap: 4, marginTop: 4 },
  stubDash: { width: 3, height: 10, backgroundColor: '#8A86A0' },
  hint: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    color: '#5A5670',
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
