import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CharacterPortrait } from '@/components/character-portrait';
import { CLASSES } from '@/game';
import type { CollectionEntry } from '@/store/selectors';
import { formatNumber } from '@/story/companions';
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
      {inParty && <SymbolView name="heart.fill" tintColor={colors.gold} size={10} style={styles.partyMark} />}
      <View style={styles.portrait}>
        <CharacterPortrait companion={companion} locked={!unlocked} />
      </View>
      <Text style={[styles.number, { color: unlocked ? info.color : colors.textFaint }]}>
        {formatNumber(companion.number)}
      </Text>
      <Text style={[styles.name, !unlocked && styles.lockedName]} numberOfLines={1}>
        {companion.name}
      </Text>
    </Pressable>
  );
}

/**
 * Every collectible character in pages of 4 × 4, swiped sideways, so the
 * collection stays the same height however many characters it holds.
 */
export function CollectionGrid({ entries }: { entries: CollectionEntry[] }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pages = Array.from({ length: Math.ceil(entries.length / PER_PAGE) }, (_, i) =>
    entries.slice(i * PER_PAGE, (i + 1) * PER_PAGE),
  );

  return (
    <View style={styles.window}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <ScrollView
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

const CARD_HEIGHT = 96;

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
  pager: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
  dot: { width: 6, height: 6, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.gold, width: 12 },
  pageText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, marginLeft: spacing.xs },
});
