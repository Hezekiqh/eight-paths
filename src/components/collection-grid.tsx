import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CharacterPortrait } from '@/components/character-portrait';
import { CLASSES, DIMENSIONS, type Dimension } from '@/game';
import type { CollectionEntry } from '@/store/selectors';
import { formatNumber, type Alignment, type Rarity } from '@/story/companions';
import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';

const COLUMNS = 4;
const PER_PAGE = COLUMNS * 4;

function CollectionCard({ entry, width }: { entry: CollectionEntry; width: number }) {
  const { companion, unlocked, inParty } = entry;
  const info = CLASSES[companion.dimension];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatNumber(companion.number)}, ${companion.name}, ${
        unlocked ? (inParty ? 'in your party' : info.className) : 'locked'
      }`}
      onPress={() => {
        haptics.tap();
        router.push(`/companion/${companion.id}`);
      }}
      style={({ pressed }) => [styles.card, { width }, pressed && { backgroundColor: colors.cardRaised }]}>
      {inParty && <SymbolView name="heart.fill" tintColor={colors.accent} size={10} style={styles.partyMark} />}
      <View style={styles.portrait}>
        <CharacterPortrait companion={companion} locked={!unlocked} animate={false} />
      </View>
      <Text style={[styles.number, { color: unlocked ? info.color : colors.textFaint }]}>
        {formatNumber(companion.number)}
      </Text>
      <Text style={[styles.name, !unlocked && styles.lockedName]} numberOfLines={1}>
        {companion.name}
      </Text>
      <Text style={[styles.stars, !unlocked && styles.lockedName]}>{stars(companion.rarity)}</Text>
    </Pressable>
  );
}

const stars = (rarity: Rarity) => '★'.repeat(rarity);

/** The nine alignments in grid order, with the short label shown on each chip. */
const ALIGNMENTS: [Alignment, string][] = [
  ['Lawful Good', 'LG'],
  ['Neutral Good', 'NG'],
  ['Chaotic Good', 'CG'],
  ['Lawful Neutral', 'LN'],
  ['True Neutral', 'TN'],
  ['Chaotic Neutral', 'CN'],
  ['Lawful Evil', 'LE'],
  ['Neutral Evil', 'NE'],
  ['Chaotic Evil', 'CE'],
];

type ChipProps = {
  label?: string;
  symbol?: SFSymbol;
  color?: string;
  selected: boolean;
  onPress: () => void;
  a11y: string;
};

function Chip({ label, symbol, color = colors.textMuted, selected, onPress, a11y }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[
        styles.chip,
        selected && {
          borderColor: color === colors.textMuted ? colors.accent : color,
          backgroundColor: colors.cardRaised,
        },
      ]}>
      {symbol && <SymbolView name={symbol} tintColor={color} size={14} />}
      {label && <Text style={[styles.chipText, selected && { color: colors.text }]}>{label}</Text>}
    </Pressable>
  );
}

/**
 * Every collectible character in pages of 4 × 4, swiped sideways, so the
 * collection stays the same height however many characters it holds. Filters
 * narrow it by class, rarity and alignment.
 */
export function CollectionGrid({ entries: all }: { entries: CollectionEntry[] }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [path, setPath] = useState<Dimension | null>(null);
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [alignment, setAlignment] = useState<Alignment | null>(null);
  const alignments = ALIGNMENTS.filter(([a]) => all.some((e) => e.companion.alignment === a));
  const rarities = [...new Set(all.map((e) => e.companion.rarity))].sort((a, b) => b - a);
  const entries = all.filter(
    (e) =>
      (path === null || e.companion.dimension === path) &&
      (rarity === null || e.companion.rarity === rarity) &&
      (alignment === null || e.companion.alignment === alignment),
  );
  const filter = (apply: () => void) => {
    apply();
    setPage(0);
  };
  const pages = Array.from({ length: Math.ceil(entries.length / PER_PAGE) }, (_, i) =>
    entries.slice(i * PER_PAGE, (i + 1) * PER_PAGE),
  );

  return (
    <View style={styles.window}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" selected={path === null} onPress={() => filter(() => setPath(null))} a11y="All classes" />
        {DIMENSIONS.map((d) => (
          <Chip
            key={d}
            symbol={CLASSES[d].symbol}
            color={CLASSES[d].color}
            selected={path === d}
            onPress={() => filter(() => setPath(path === d ? null : d))}
            a11y={`${CLASSES[d].className} only`}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          label="All"
          selected={alignment === null}
          onPress={() => filter(() => setAlignment(null))}
          a11y="All alignments"
        />
        {alignments.map(([a, short]) => (
          <Chip
            key={a}
            label={short}
            selected={alignment === a}
            onPress={() => filter(() => setAlignment(alignment === a ? null : a))}
            a11y={`${a} only`}
          />
        ))}
      </ScrollView>
      <View style={styles.rarityRow}>
        <Chip
          label="All ★"
          selected={rarity === null}
          onPress={() => filter(() => setRarity(null))}
          a11y="All rarities"
        />
        {rarities.map((r) => (
          <Chip
            key={r}
            label={stars(r)}
            selected={rarity === r}
            onPress={() => filter(() => setRarity(rarity === r ? null : r))}
            a11y={`${r} star only`}
          />
        ))}
        <Text style={styles.count}>{entries.length} shown</Text>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && entries.length === 0 && <Text style={styles.empty}>No characters match these filters.</Text>}
        {width > 0 && entries.length > 0 && (
          <ScrollView
            // A new filter starts back on the first page.
            key={`${path}-${rarity}-${alignment}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / width);
              if (next !== page) haptics.select();
              setPage(next);
            }}>
            {pages.map((items, i) => (
              <View key={i} style={[styles.page, { width }]}>
                {items.map((entry) => (
                  <CollectionCard key={entry.companion.id} entry={entry} width={width / COLUMNS} />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      {pages.length > 1 && (
        <View style={styles.pager} accessibilityLabel={`Page ${page + 1} of ${pages.length}`}>
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
          <Text style={styles.pageText}>
            {page + 1}/{pages.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const CARD_HEIGHT = 104;

const styles = StyleSheet.create({
  window: { ...windowStyle, paddingVertical: spacing.xs, overflow: 'hidden' },
  // A fixed four rows, so a part-filled last page is the same height as the rest.
  page: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', height: CARD_HEIGHT * 4 },
  card: { height: CARD_HEIGHT, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.sm, gap: 1 },
  partyMark: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  portrait: { height: 50, justifyContent: 'flex-end', alignItems: 'center' },
  number: { fontFamily: fonts.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
  name: { color: colors.text, fontFamily: fonts.regular, fontSize: 12, paddingHorizontal: 2 },
  lockedName: { color: colors.textFaint },
  stars: { color: colors.accent, fontSize: 9, letterSpacing: 1 },
  chips: { gap: spacing.xs, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 2,
  },
  chipText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14 },
  count: { flex: 1, textAlign: 'right', color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12 },
  empty: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', padding: spacing.xl },
  pager: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
  dot: { width: 6, height: 6, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, width: 12 },
  pageText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, marginLeft: spacing.xs },
});
