import { StyleSheet, Text, View } from 'react-native';

import { CollectionGrid } from '@/components/collection-grid';
import { Screen } from '@/components/screen';
import { XpBar } from '@/components/xp-bar';
import { useStanding } from '@/social/use-standing';
import { useClassInfo, useCollection } from '@/store/hooks';
import type { CollectionEntry } from '@/store/selectors';
import { RARITY_TIERS, type Rarity } from '@/story/companions';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import { useTourScroller, useTourTarget } from '@/tutorial/tour';

const RARITIES: Rarity[] = [5, 4, 3, 2, 1];

/** The Collection tab: how many heroes you've woken, by rarity, then every hero there is. */
export default function CollectionScreen() {
  const classInfo = useClassInfo();
  const collection = useCollection();
  const standing = useStanding();
  const scroller = useTourScroller();
  const collectionRef = useTourTarget('collection', scroller);

  if (!classInfo) return null;
  const total = collection.entries.length;

  return (
    <Screen title="Collection" scrollRef={scroller.ref} onScroll={scroller.onScroll}>
      {/* The Keeper's tour points at the tally: how many, and how rare. */}
      <View ref={collectionRef} collapsable={false} style={styles.summary}>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: classInfo.color }]}>{collection.unlockedCount}</Text>
          <Text style={styles.of}>/ {total} heroes woken</Text>
          {standing?.value != null && <Text style={styles.value}>{standing.value.toLocaleString()} value</Text>}
        </View>
        <XpBar fill={total > 0 ? collection.unlockedCount / total : 0} color={classInfo.color} height={10} />
        <View style={styles.tally}>
          {RARITIES.map((r) => (
            <RarityTally key={r} rarity={r} entries={collection.entries} />
          ))}
        </View>
      </View>
      <CollectionGrid entries={collection.entries} />
    </Screen>
  );
}

function RarityTally({ rarity, entries }: { rarity: Rarity; entries: CollectionEntry[] }) {
  const tier = entries.filter((e) => e.companion.rarity === rarity);
  if (tier.length === 0) return null;
  const woken = tier.filter((e) => e.unlocked).length;
  const { name, color } = RARITY_TIERS[rarity];
  return (
    <View style={styles.tier} accessible accessibilityLabel={`${name}: ${woken} of ${tier.length}`}>
      <Text style={[styles.tierStars, { color }]}>{rarity}★</Text>
      <Text style={styles.tierCount}>
        {woken}/{tier.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { ...windowStyle, padding: spacing.lg, gap: spacing.sm },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  count: { fontFamily: fonts.bold, fontSize: 40, fontVariant: ['tabular-nums'] },
  of: { flex: 1, color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16 },
  value: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
  tally: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  tier: { alignItems: 'center', gap: 2 },
  tierStars: { fontFamily: fonts.bold, fontSize: 16 },
  tierCount: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
});
