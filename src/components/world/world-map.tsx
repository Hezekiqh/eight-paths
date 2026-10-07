import {
  Canvas,
  DashPathEffect,
  FilterMode,
  Image,
  Line,
  MipmapMode,
  Path,
  Rect,
  Skia,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { useWorldProgress } from '@/world/use-progress';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Segmented } from '@/components/segmented';
import { haptics } from '@/haptics';
import { colors, fonts, spacing } from '@/theme';
import { MAPS, TILE, type MapId, type WorldMap } from '@/world/maps';
import { nextGoal, tileBox, type Goal } from '@/world/guide';
import { EXITS } from '@/world/progress';

const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };
const GOLD = '#FFD27A';
/** Ways out that are never a gate: doors, side roads, the way home. */
const MUTED = '#A8A4BC';
const TAG_W = 120;

/**
 * Where each area sits on the world map, as fractions of the map's width and
 * height. Only areas the player has set foot in are ever drawn; everything else
 * stays black. The Archive floats alone: it's outside space and time.
 */
const AREA_SPOTS: Partial<Record<MapId, { x: number; y: number }>> = {
  // laid out on a grid (author, Oct 4, 2026), so the roads run the way their signs say: the castle
  // north of the kingdom town, Kaldorhold to its east (its wards north, east and south), the Tithe
  // Road south to the Broken Watch and the Field of Banners, and Warrior City's north road up past
  // the camp to the barracks and on round by the March Road
  archive: { x: 0.1, y: 0.08 },
  'castle-grounds': { x: 0.3, y: 0.08 },
  'ring-ward': { x: 0.5, y: 0.08 },
  'barracks-ward': { x: 0.7, y: 0.08 },
  'kingdom-town': { x: 0.3, y: 0.24 },
  kaldorhold: { x: 0.5, y: 0.24 },
  'tithe-road': { x: 0.3, y: 0.4 },
  'frost-ward': { x: 0.5, y: 0.4 },
  'march-road': { x: 0.7, y: 0.4 },
  'barracks-hall': { x: 0.88, y: 0.4 },
  'broken-watch': { x: 0.1, y: 0.56 },
  'deserters-camp': { x: 0.88, y: 0.56 },
  'field-of-banners': { x: 0.1, y: 0.72 },
  'courier-road': { x: 0.3, y: 0.72 },
  'felix-maze': { x: 0.5, y: 0.72 },
  'warrior-city': { x: 0.7, y: 0.72 },
  millbrook: { x: 0.1, y: 0.88 },
  waystation: { x: 0.3, y: 0.88 },
  'south-road': { x: 0.7, y: 0.88 },
};

/** Rooms shown on the World view as the place they belong to (a dungeon is one place). */
const REGION: Partial<Record<MapId, MapId>> = {
  'barracks-armoury': 'barracks-hall',
  'officers-mess': 'barracks-hall',
  'barracks-yard': 'barracks-hall',
  'pit-below': 'barracks-hall',
  'lower-barracks': 'barracks-hall',
  'sleeping-keep': 'barracks-hall',
  'candle-inn': 'kingdom-town',
  forge: 'kingdom-town',
  chapel: 'kingdom-town',
  'old-kings-crypt': 'kingdom-town',
  'hedge-maze': 'kingdom-town',
  'the-pit': 'warrior-city',
  'castle-hall': 'castle-grounds',
  'castle-upper': 'castle-grounds',
  'war-hall': 'castle-grounds',
  'gut-and-gauntlet': 'kaldorhold',
  'hall-of-kaldor': 'kaldorhold',
  'kaldorium-maximus': 'ring-ward',
  'fighters-cells': 'ring-ward',
  'fury-hall': 'barracks-ward',
  stitchery: 'barracks-ward',
  ironhouse: 'barracks-ward',
  'ice-house': 'frost-ward',
  'kingdom-dungeon': 'warrior-city',
  'dungeon-mazes': 'warrior-city',
  'old-mine': 'south-road',
  'wc-chapel': 'warrior-city',
  'wc-library': 'warrior-city',
  'wc-guild': 'warrior-city',
  'wc-hospital': 'warrior-city',
  'wc-tavern': 'warrior-city',
  'wc-store': 'warrior-city',
  'wc-barn': 'warrior-city',
  'wc-bank': 'warrior-city',
  'wc-vault': 'warrior-city',
  'room-brannoc': 'archive',
  'room-ysolde': 'archive',
  'room-quill': 'archive',
  'room-wren': 'archive',
  'room-oren': 'archive',
  'room-pip': 'archive',
  'room-tamsin': 'archive',
  'room-moss': 'archive',
};
const regionOf = (id: MapId): MapId => REGION[id] ?? id;
/** What a place is called on the World view. */
const placeName = (id: MapId) => (id === 'barracks-hall' ? 'The Buried Barracks' : MAPS[id].name);

type Zoom = 'world' | 'area';
const ZOOMS = [
  { value: 'area', label: 'Area' },
  { value: 'world', label: 'Other World' },
] as const;

type Props = {
  map: WorldMap;
  /** Where the player stands, in art pixels. */
  you: { x: number; y: number };
  discovered: MapId[];
  width: number;
  height: number;
  /** Who to walk as, when the next step takes a particular Path. */
  swap?: string | null;
  onClose: () => void;
};

/**
 * The World map, opened from the pause menu. Area shows the room you're in;
 * World shows only the places you've been, everything else solid black: no
 * outlines, no names, no hints. Ways out show as a short stub into the dark.
 */
export function WorldMapView({ map, you, discovered, width, height, swap, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [zoom, setZoom] = useState<Zoom>('area');
  const xp = useWorldProgress();
  const goal = nextGoal(map.id as MapId, discovered, xp);
  const left = Math.max(insets.left, spacing.lg);
  const right = Math.max(insets.right, spacing.lg);
  const boxW = width - left - right;
  const boxH = height - 64 - 64 - Math.max(insets.bottom, spacing.sm);

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
          <AreaMap map={map} you={you} goal={goal} width={boxW} height={boxH} />
        ) : (
          <WorldOverview discovered={discovered} here={map.id as MapId} width={boxW} height={boxH} />
        )}
      </View>

      <View style={[styles.legend, { paddingLeft: left, paddingRight: right }]}>
        <View style={styles.next} accessible accessibilityLabel={`Next step: ${goal.line}${swap ? `. ${swap}` : ''}`}>
          <Text style={styles.nextTitle}>NEXT STEP</Text>
          <View style={styles.nextWords}>
            <Text style={styles.nextLine} numberOfLines={1}>
              {goal.line}
            </Text>
            {swap ? (
              <Text style={styles.nextSwap} numberOfLines={1}>
                {swap}
              </Text>
            ) : goal.mark ? (
              <Text style={styles.nextSwap} numberOfLines={1}>
                {goal.mark.exitId ? `Head for the gold arrow: ${goal.mark.tag}` : `Find ${goal.mark.tag}, marked in gold`}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={styles.legendText}>
          <Text style={{ color: GOLD }}>♥ </Text>You{'   '}
          <Text style={{ color: GOLD }}>▢ </Text>Go here{'   '}
          <Text style={{ color: MUTED }}>▢ </Text>Other ways
        </Text>
      </View>
    </View>
  );
}

/**
 * The room you're in, whole, with you, its ways out named, and the next person
 * or thing to go to (or the way toward them) marked with an arrow from you.
 */
function AreaMap({
  map,
  you,
  goal,
  width,
  height,
}: {
  map: WorldMap;
  you: Props['you'];
  goal: Goal;
  width: number;
  height: number;
}) {
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
  const exits = EXITS.filter((e) => e.from === map.id).flatMap((exit) => {
    const box = tileBox(map, exit.tile);
    return box
      ? [
          {
            exit,
            x: ox + box.x * TILE * scale,
            y: oy + box.y * TILE * scale,
            w: box.w * TILE * scale,
            h: box.h * TILE * scale,
          },
        ]
      : [];
  });
  const meX = ox + you.x * scale;
  const meY = oy + you.y * scale;
  const mark = goal.mark;
  // Someone or something to go to that isn't a way out gets its own marker and tag.
  const spot =
    mark && !mark.exitId
      ? {
          x: ox + mark.box.x * TILE * scale,
          y: oy + mark.box.y * TILE * scale,
          w: mark.box.w * TILE * scale,
          h: mark.box.h * TILE * scale,
        }
      : null;
  const target = spot ?? exits.find((e) => e.exit.id === mark?.exitId);
  const guide = target ? guideArrow(meX, meY, target) : null;

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {image && <Image image={image} x={ox} y={oy} width={w} height={h} sampling={NEAREST} />}
        {exits.map(({ exit, x, y, w, h }) => (
          <Rect
            key={exit.id}
            x={x - 2}
            y={y - 2}
            width={w + 4}
            height={h + 4}
            color={exit.id === mark?.exitId ? GOLD : MUTED}
            style="stroke"
            strokeWidth={exit.id === mark?.exitId ? 3 : 1}
            opacity={exit.id === mark?.exitId ? 1 : 0.7}
          />
        ))}
        {guide && (
          <>
            <Path path={guide.shaft} color="#000000" style="stroke" strokeWidth={5} strokeCap="round" opacity={0.6}>
              <DashPathEffect intervals={[8, 6]} />
            </Path>
            <Path path={guide.shaft} color={GOLD} style="stroke" strokeWidth={3} strokeCap="round">
              <DashPathEffect intervals={[8, 6]} />
            </Path>
            <Path path={guide.head} color={GOLD} />
          </>
        )}
        {spot && (
          <Rect
            x={spot.x - 3}
            y={spot.y - 3}
            width={spot.w + 6}
            height={spot.h + 6}
            color={GOLD}
            style="stroke"
            strokeWidth={2}
          />
        )}
      </Canvas>
      {exits.map((e) => (
        <Tag
          key={e.exit.id}
          label={e.exit.id === mark?.exitId ? `➜ ${e.exit.label}` : e.exit.label}
          color={e.exit.id === mark?.exitId ? GOLD : MUTED}
          box={e}
          areaW={width}
          areaH={height}
        />
      ))}
      {spot && mark && <Tag label={`! ${mark.tag}`} color={GOLD} box={spot} areaW={width} areaH={height} />}
      <Text
        style={[styles.you, { left: ox + you.x * scale - 8, top: oy + you.y * scale - 20 }]}
        accessibilityLabel="You are here">
        ♥
      </Text>
    </View>
  );
}

/**
 * A name beside something on the Area map, with a pointer at it: above when
 * there's room, otherwise below, or beside it for a road off the map's edge.
 */
function Tag({
  label,
  color,
  box,
  areaW,
  areaH,
}: {
  label: string;
  color: string;
  box: { x: number; y: number; w: number; h: number };
  areaW: number;
  areaH: number;
}) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const TAG_H = 30;
  let side: 'above' | 'below' | 'left' | 'right' = box.y - TAG_H >= 0 ? 'above' : 'below';
  if (box.x <= 2) side = 'right';
  else if (box.x + box.w >= areaW - 2) side = 'left';
  else if (side === 'below' && box.y + box.h + TAG_H > areaH) side = 'above';
  const pointer = { above: '▼', below: '▲', left: '▶', right: '◀' }[side];
  const name = (
    <Text style={[styles.tagName, { color }]} numberOfLines={1}>
      {label}
    </Text>
  );
  const arrow = <Text style={[styles.tagPointer, { color }]}>{pointer}</Text>;
  const clampX = (x: number) => Math.min(Math.max(x, 0), areaW - TAG_W);

  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={label}
      style={[
        styles.tag,
        side === 'above' && { left: clampX(cx - TAG_W / 2), top: box.y - TAG_H - 2 },
        side === 'below' && { left: clampX(cx - TAG_W / 2), top: box.y + box.h + 2 },
        side === 'right' && { left: box.x + box.w + 2, top: cy - 9, flexDirection: 'row' },
        side === 'left' && { left: box.x - TAG_W - 2, top: cy - 9, flexDirection: 'row-reverse' },
      ]}>
      {side === 'below' || side === 'right' ? arrow : name}
      {side === 'below' || side === 'right' ? name : arrow}
    </View>
  );
}

/** A dashed arrow from you to a way out, stopping just short of it. */
function guideArrow(fromX: number, fromY: number, to: { x: number; y: number; w: number; h: number }) {
  const toX = to.x + to.w / 2;
  const toY = to.y + to.h / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  // Right on top of it: no arrow needed.
  if (len < 24) return null;
  const ux = dx / len;
  const uy = dy / len;
  const start = 12;
  const end = len - Math.max(to.w, to.h) / 2 - 6;
  if (end <= start + 8) return null;
  const tipX = fromX + ux * end;
  const tipY = fromY + uy * end;
  const shaft = Skia.Path.Make();
  shaft.moveTo(fromX + ux * start, fromY + uy * start);
  shaft.lineTo(tipX - ux * 8, tipY - uy * 8);
  const head = Skia.Path.Make();
  head.moveTo(tipX, tipY);
  head.lineTo(tipX - ux * 12 - uy * 7, tipY - uy * 12 + ux * 7);
  head.lineTo(tipX - ux * 12 + uy * 7, tipY - uy * 12 - ux * 7);
  head.close();
  return { shaft, head };
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
  const known = (id: MapId) => discovered.includes(id) || id === here;
  const regionKnown = (id: MapId) => (Object.keys(MAPS) as MapId[]).some((m) => regionOf(m) === id && known(m));
  const places = (Object.keys(AREA_SPOTS) as MapId[]).filter(regionKnown);
  const at = (id: MapId) => {
    const spot = AREA_SPOTS[regionOf(id)]!;
    return vec(spot.x * width, spot.y * height);
  };
  // Only ways between two different places count; rooms inside one dungeon are one place here.
  const between = EXITS.filter((e) => regionOf(e.from) !== (e.to ? regionOf(e.to.map) : null));
  // Paths between places you've been, drawn once each.
  const paths = between.filter(
    (e) => known(e.from) && e.to && known(e.to.map) && regionOf(e.from) < regionOf(e.to.map),
  );
  // Ways out of places you've been into somewhere you haven't: a short path fading into the dark.
  const stubs = between.filter((e) => known(e.from) && !(e.to && known(e.to.map)));

  return (
    <View style={[styles.dark, { width, height }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        {paths.map((e) => (
          <Line key={e.id} p1={at(e.from)} p2={at(e.to!.map)} color="#8A86A0" strokeWidth={3} />
        ))}
        {stubs.map((e) => {
          const from = at(e.from);
          // Toward where it leads, if that's on the map; otherwise off to the east.
          const target = e.to ? at(e.to.map) : vec(from.x + 100, from.y);
          const dx = target.x - from.x;
          const dy = target.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          return [0, 1, 2].map((i) => {
            const a = 44 + i * 16;
            const b = a + 10;
            return (
              <Line
                key={`${e.id}-${i}`}
                p1={vec(from.x + (dx / len) * a, from.y + (dy / len) * a)}
                p2={vec(from.x + (dx / len) * b, from.y + (dy / len) * b)}
                color="#8A86A0"
                opacity={0.9 - i * 0.3}
                strokeWidth={3}
              />
            );
          });
        })}
      </Canvas>
      {places.map((id) => {
        const spot = AREA_SPOTS[id]!;
        return (
          <View
            key={id}
            style={[styles.place, { left: spot.x * width - 70, top: spot.y * height - 18 }]}
            accessible
            accessibilityLabel={`${placeName(id)}${id === regionOf(here) ? ', you are here' : ''}`}>
            <View style={[styles.placeBox, id === regionOf(here) && styles.placeHere]}>
              <Text style={styles.placeName}>{placeName(id)}</Text>
            </View>
          </View>
        );
      })}
      <Text style={styles.hint}>Places appear here once you&apos;ve been there.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  title: { color: GOLD, fontFamily: fonts.bold, fontSize: 32, letterSpacing: 3 },
  zoom: { width: 220 },
  close: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 20, letterSpacing: 1, marginLeft: 'auto' },
  legend: { height: 64, flexDirection: 'row', alignItems: 'center', columnGap: spacing.lg },
  next: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 2, borderColor: GOLD, paddingHorizontal: 10, paddingVertical: 4 },
  nextTitle: { color: GOLD, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  nextWords: { flex: 1 },
  nextLine: { color: '#FFFFFF', fontFamily: fonts.dialogue, fontSize: 16 },
  nextSwap: { color: '#C9C5DA', fontFamily: fonts.regular, fontSize: 12 },
  legendText: { color: '#C9C5DA', fontFamily: fonts.regular, fontSize: 13 },
  you: { position: 'absolute', color: GOLD, fontSize: 16, width: 16, textAlign: 'center' },
  dark: { backgroundColor: '#000000' },
  tag: { position: 'absolute', width: TAG_W, alignItems: 'center' },
  tagName: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    maxWidth: TAG_W - 14,
  },
  tagPointer: { fontSize: 10, lineHeight: 12, paddingHorizontal: 2 },
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
