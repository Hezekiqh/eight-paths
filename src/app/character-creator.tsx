import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { HeroSprite } from '@/components/avatar/hero-sprite';
import { ModalHeader } from '@/components/modal-header';
import {
  DEFAULT_LOOK,
  EYE_COLORS,
  FACE_EXTRAS,
  FACIAL_HAIR,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADWEAR,
  LOOK_NAMES,
  MOOD_LABELS,
  OUTFIT_COLORS,
  OUTFITS,
  PANTS_COLORS,
  randomLook,
  SKIN_TONES,
  type Mood,
  type PlayerLook,
} from '@/game';
import { haptics } from '@/haptics';
import { useGameStore } from '@/store';
import { useClassInfo, usePlayer } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/** Moods to try the look in before saving. */
const PREVIEW: Mood[] = [
  'ready',
  'victory',
  'overdrive',
  'cool',
  'confident',
  'anxious',
  'strong',
  'smart',
  'cheerful',
  'rich',
  'calm',
  'busy',
  'champion',
  'sleepy',
];

const CATEGORIES: { key: string; label: string; symbol: SFSymbol }[] = [
  { key: 'body', label: 'Body', symbol: 'figure.stand' },
  { key: 'hair', label: 'Hair', symbol: 'scissors' },
  { key: 'face', label: 'Face', symbol: 'face.smiling' },
  { key: 'head', label: 'Head', symbol: 'crown.fill' },
  { key: 'outfit', label: 'Outfit', symbol: 'tshirt.fill' },
];

const COLUMNS = 4;

type Edit = (patch: Partial<PlayerLook>) => void;

function Swatches({
  title,
  list,
  value,
  onPick,
}: {
  title: string;
  list: readonly string[];
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
      <View style={styles.wrap}>
        {list.map((c, i) => {
          const on = c === value;
          return (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`${title} ${i + 1}`}
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptics.select();
                onPick(c);
              }}
              style={[styles.swatch, { backgroundColor: c }, on && styles.swatchOn]}
            />
          );
        })}
      </View>
    </View>
  );
}

/** A grid of tiles, each showing you already wearing that choice. */
function Tiles<K extends keyof PlayerLook>({
  title,
  field,
  list,
  look,
  onPick,
  crop,
  width,
  color,
}: {
  title: string;
  field: K;
  list: readonly PlayerLook[K][];
  look: PlayerLook;
  onPick: Edit;
  crop: 'head' | 'full';
  width: number;
  color: string;
}) {
  const tile = Math.floor((width - spacing.lg * 2 - spacing.sm * (COLUMNS - 1)) / COLUMNS);
  // Head tiles frame 18×20 art pixels; full-body ones 32×48.
  const scale = crop === 'head' ? Math.floor((tile - 12) / 18) : Math.max(1, Math.floor((tile - 12) / 32));
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
      <View style={styles.wrap}>
        {list.map((v) => {
          const on = look[field] === v;
          const name = LOOK_NAMES[v as string] ?? String(v);
          return (
            <Pressable
              key={String(v)}
              accessibilityRole="button"
              accessibilityLabel={name}
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptics.select();
                onPick({ [field]: v } as Partial<PlayerLook>);
              }}
              style={({ pressed }) => [
                styles.tile,
                { width: tile },
                on && { borderColor: color, backgroundColor: colors.cardRaised },
                pressed && { opacity: 0.7 },
              ]}>
              <HeroSprite look={{ ...look, [field]: v }} mood="ready" crop={crop} scale={scale} animate={false} />
              <Text style={[styles.tileText, on && { color }]} numberOfLines={1} adjustsFontSizeToFit>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Make yourself for Today, Sims style: you stand on a stage up top, and the
 * categories below swipe sideways (or tap their tabs), each tile showing you
 * already wearing that choice.
 */
export default function CharacterCreator() {
  const player = usePlayer();
  const classInfo = useClassInfo();
  const setLook = useGameStore((s) => s.setLook);
  const [look, setDraft] = useState<PlayerLook>(player?.look ?? DEFAULT_LOOK);
  const [mood, setMood] = useState<Mood>('ready');
  const [page, setPage] = useState(0);
  const pager = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const color = classInfo?.color ?? colors.accent;

  if (!player) return null;
  const edit: Edit = (patch) => setDraft((l) => ({ ...l, ...patch }));
  const goTo = (i: number) => {
    haptics.select();
    setPage(i);
    pager.current?.scrollTo({ x: i * width, animated: true });
  };
  const tiles = { look, onPick: edit, width, color };

  return (
    <View style={styles.screen}>
      <ModalHeader
        title={player.look ? 'Edit yourself' : 'Create yourself'}
        actionLabel="Save"
        color={color}
        onAction={() => {
          haptics.success();
          setLook(look);
          router.back();
        }}
      />

      <View style={styles.stage}>
        <View style={[styles.plinth, { backgroundColor: color }]} />
        <HeroSprite look={look} mood={mood} scale={4} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Surprise me"
          onPress={() => {
            haptics.tap();
            setDraft(randomLook());
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.dice, { borderColor: color }, pressed && { opacity: 0.6 }]}>
          <SymbolView name="dice.fill" tintColor={color} size={20} />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.moods}
        style={styles.moodBar}>
        {PREVIEW.map((m) => (
          <Pressable
            key={m}
            accessibilityRole="button"
            accessibilityState={{ selected: m === mood }}
            onPress={() => {
              haptics.select();
              setMood(m);
            }}
            style={[styles.chip, m === mood && { borderColor: color }]}>
            <Text style={[styles.chipText, m === mood && { color }]}>{MOOD_LABELS[m]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.tabs} accessibilityRole="tablist">
        {CATEGORIES.map((c, i) => {
          const on = i === page;
          return (
            <Pressable
              key={c.key}
              accessibilityRole="tab"
              accessibilityLabel={c.label}
              accessibilityState={{ selected: on }}
              onPress={() => goTo(i)}
              style={[styles.tab, on && { borderBottomColor: color }]}>
              <SymbolView name={c.symbol} tintColor={on ? color : colors.textMuted} size={20} />
              <Text style={[styles.tabText, on && { color }]}>{c.label.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (i !== page) {
            haptics.select();
            setPage(i);
          }
        }}>
        <ScrollView style={{ width }} contentContainerStyle={styles.page}>
          <Swatches title="Skin" list={SKIN_TONES} value={look.skin} onPick={(skin) => edit({ skin })} />
          <Swatches title="Eyes" list={EYE_COLORS} value={look.eyes} onPick={(eyes) => edit({ eyes })} />
        </ScrollView>
        <ScrollView style={{ width }} contentContainerStyle={styles.page}>
          <Swatches
            title="Hair color"
            list={HAIR_COLORS}
            value={look.hairColor}
            onPick={(hairColor) => edit({ hairColor })}
          />
          <Tiles title="Style" field="hair" list={HAIR_STYLES} crop="head" {...tiles} />
        </ScrollView>
        <ScrollView style={{ width }} contentContainerStyle={styles.page}>
          <Tiles title="Facial hair" field="facial" list={FACIAL_HAIR} crop="head" {...tiles} />
          <Tiles title="Details" field="face" list={FACE_EXTRAS} crop="head" {...tiles} />
        </ScrollView>
        <ScrollView style={{ width }} contentContainerStyle={styles.page}>
          <Tiles title="Headwear" field="headwear" list={HEADWEAR} crop="head" {...tiles} />
        </ScrollView>
        <ScrollView style={{ width }} contentContainerStyle={styles.page}>
          <Swatches
            title="Outfit color"
            list={OUTFIT_COLORS}
            value={look.outfitColor}
            onPick={(outfitColor) => edit({ outfitColor })}
          />
          <Tiles title="Outfit" field="outfit" list={OUTFITS} crop="full" {...tiles} />
          <Swatches
            title="Trousers"
            list={PANTS_COLORS}
            value={look.pantsColor}
            onPick={(pantsColor) => edit({ pantsColor })}
          />
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  stage: { alignItems: 'center', justifyContent: 'flex-end', height: 210, paddingBottom: spacing.xs },
  plinth: { position: 'absolute', bottom: 2, width: 130, height: 12, opacity: 0.25, borderRadius: 2 },
  dice: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.sm,
    width: 44,
    height: 44,
    borderWidth: 2,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  moodBar: { flexGrow: 0 },
  moods: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chip: { borderWidth: 2, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 2 },
  chipText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16 },
  tabs: { flexDirection: 'row', borderTopWidth: 3, borderTopColor: colors.frame, backgroundColor: colors.card },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  pager: { flex: 1, backgroundColor: colors.card },
  page: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  section: { gap: spacing.sm },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1.2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: 38, height: 38, borderRadius: 2, borderWidth: 2, borderColor: colors.border },
  swatchOn: { borderColor: colors.text, borderWidth: 3, transform: [{ scale: 1.1 }] },
  tile: {
    ...windowStyle,
    shadowOffset: { width: 2, height: 2 },
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: 4,
    gap: 2,
    borderColor: colors.border,
  },
  tileText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14 },
});
