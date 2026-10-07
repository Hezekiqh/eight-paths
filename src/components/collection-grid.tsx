import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CharacterPortrait } from '@/components/character-portrait';
import { CLASSES, DIMENSIONS, type Dimension } from '@/game';
import type { CollectionEntry } from '@/store/selectors';
import { RARITY_TIERS, formatNumber, type Alignment, type Rarity } from '@/story/companions';
import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';

const COLUMNS = 3;
const ROWS = 3;
const PER_PAGE = COLUMNS * ROWS;
/** Room between cards, and around the grid. */
const GUTTER = spacing.sm;

/**
 * One hero as a little trading card: framed and tinted in its rarity's colour,
 * standing on a plinth. Heroes still asleep are a grey silhouette in a dashed frame.
 */
function CollectionCard({ entry, width }: { entry: CollectionEntry; width: number }) {
  const { companion, unlocked, inParty } = entry;
  const info = CLASSES[companion.dimension];
  const rarity = RARITY_TIERS[companion.rarity].color;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatNumber(companion.number)}, ${companion.name}, ${
        unlocked ? (inParty ? 'in your party' : info.className) : 'locked'
      }${entry.copies > 1 ? `, ${entry.copies} copies` : ''}`}
      onPress={() => {
        haptics.tap();
        router.push(`/companion/${companion.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { width },
        unlocked ? { borderColor: rarity, backgroundColor: `${rarity}1F` } : styles.lockedCard,
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardTop}>
        <Text style={[styles.number, { color: unlocked ? info.color : colors.textFaint }]}>
          {formatNumber(companion.number)}
        </Text>
        {entry.copies > 1 && <Text style={[styles.copies, { color: info.color }]}>×{entry.copies}</Text>}
        {inParty && <SymbolView name="heart.fill" tintColor={colors.accent} size={12} />}
      </View>
      <View style={styles.portrait}>
        <View style={[styles.plinth, { backgroundColor: unlocked ? `${rarity}40` : colors.border }]} />
        <CharacterPortrait companion={companion} locked={!unlocked} animate={false} scale={2} />
      </View>
      <Text style={[styles.name, !unlocked && styles.lockedName]} numberOfLines={1}>
        {companion.name}
      </Text>
      <Text style={[styles.stars, { color: rarity }, !unlocked && styles.lockedName]}>{stars(companion.rarity)}</Text>
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
      {label && <Text style={[styles.chipText, { color }, selected && { color: colors.text }]}>{label}</Text>}
    </Pressable>
  );
}

/**
 * Every collectible character in pages of 3 × 3 cards, swiped sideways, so the
 * collection stays the same height however many characters it holds. Filters
 * narrow it by class and rarity, and (behind their own chip) alignment.
 */
export function CollectionGrid({ entries: all }: { entries: CollectionEntry[] }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [path, setPath] = useState<Dimension | null>(null);
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [alignment, setAlignment] = useState<Alignment | null>(null);
  // Alignment is the least-used filter, so it waits behind its own chip.
  const [showAlignments, setShowAlignments] = useState(false);
  const alignments = ALIGNMENTS.filter(([a]) => all.some((e) => e.companion.alignment === a));
  // Rarest first: 5★ Legendary, then Epic, Rare, Uncommon, Common.
  const rarities = [...new Set(all.map((e) => e.companion.rarity))].sort((a, b) => b - a);
  // Always in number order, woken or not, so swiping through "All" walks the whole collection from #001.
  const entries = all
    .filter(
      (e) =>
        (path === null || e.companion.dimension === path) &&
        (rarity === null || e.companion.rarity === rarity) &&
        (alignment === null || e.companion.alignment === alignment),
    )
    .sort((a, b) => a.companion.number - b.companion.number);
  const filter = (apply: () => void) => {
    apply();
    setPage(0);
  };
  const pages = Array.from({ length: Math.ceil(entries.length / PER_PAGE) }, (_, i) =>
    entries.slice(i * PER_PAGE, (i + 1) * PER_PAGE),
  );
  const alignmentShort = ALIGNMENTS.find(([a]) => a === alignment)?.[1];

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
          label="All ★"
          selected={rarity === null}
          onPress={() => filter(() => setRarity(null))}
          a11y="All rarities"
        />
        {rarities.map((r) => (
          <Chip
            key={r}
            label={`${r}★`}
            color={RARITY_TIERS[r].color}
            selected={rarity === r}
            onPress={() => filter(() => setRarity(rarity === r ? null : r))}
            a11y={`${RARITY_TIERS[r].name} only`}
          />
        ))}
        <Chip
          label={alignmentShort ?? 'Alignment'}
          symbol={showAlignments ? 'chevron.up' : 'chevron.down'}
          selected={showAlignments || alignment !== null}
          onPress={() => setShowAlignments(!showAlignments)}
          a11y={showAlignments ? 'Hide alignments' : 'Filter by alignment'}
        />
      </ScrollView>
      {showAlignments && (
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
      )}
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
                  <CollectionCard
                    key={entry.companion.id}
                    entry={entry}
                    width={Math.floor((width - GUTTER * (COLUMNS + 1)) / COLUMNS)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      <View
        style={styles.pager}
        accessibilityLabel={`Page ${page + 1} of ${Math.max(pages.length, 1)}, ${entries.length} heroes`}>
        {pages.length > 1 && pages.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotActive]} />)}
        <Text style={styles.pageText}>
          {pages.length > 1 ? `${page + 1}/${pages.length} · ` : ''}
          {entries.length} {entries.length === 1 ? 'hero' : 'heroes'}
        </Text>
      </View>
    </View>
  );
}

const CARD_HEIGHT = 150;

const styles = StyleSheet.create({
  window: { ...windowStyle, paddingTop: spacing.xs, overflow: 'hidden' },
  // A fixed three rows, so a part-filled last page is the same height as the rest.
  page: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: GUTTER,
    padding: GUTTER,
    height: CARD_HEIGHT * ROWS + GUTTER * (ROWS + 1),
  },
  card: {
    height: CARD_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderWidth: 2,
    borderRadius: 3,
  },
  lockedCard: { borderColor: colors.border, borderStyle: 'dashed' },
  pressed: { transform: [{ translateY: 2 }], opacity: 0.85 },
  cardTop: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 18 },
  number: { flex: 1, fontFamily: fonts.bold, fontSize: 13, fontVariant: ['tabular-nums'] },
  copies: { fontFamily: fonts.bold, fontSize: 14 },
  portrait: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  // An oval of shadow the hero stands on.
  plinth: { position: 'absolute', bottom: -3, width: 58, height: 12, borderRadius: 29 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, marginTop: spacing.xs },
  lockedName: { color: colors.textFaint },
  stars: { color: colors.accent, fontSize: 11, letterSpacing: 1 },
  chips: { gap: spacing.xs, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
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
  empty: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', padding: spacing.xl },
  pager: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.md,
  },
  dot: { width: 6, height: 6, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, width: 12 },
  pageText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 13, marginLeft: spacing.xs },
});
