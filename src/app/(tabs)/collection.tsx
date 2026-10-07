import { StyleSheet, Text, View } from 'react-native';

import { CollectionGrid } from '@/components/collection-grid';
import { Screen } from '@/components/screen';
import { useStanding } from '@/social/use-standing';
import { useClassInfo, useCollection } from '@/store/hooks';
import { colors, fonts, spacing } from '@/theme';
import { useTourScroller, useTourTarget } from '@/tutorial/tour';

/** The Collection tab: every hero there is, woken or still asleep. */
export default function CollectionScreen() {
  const classInfo = useClassInfo();
  const collection = useCollection();
  const standing = useStanding();
  const scroller = useTourScroller();
  const collectionRef = useTourTarget('collection', scroller);

  if (!classInfo) return null;

  return (
    <Screen scrollRef={scroller.ref} onScroll={scroller.onScroll}>
      <View style={styles.collection}>
        {/* The Keeper's tour points at the collection's heading and its first rows. */}
        <View ref={collectionRef} collapsable={false} style={styles.tourCollection} pointerEvents="none" />
        <View style={styles.sectionRow}>
          <Text style={styles.section}>YOUR COLLECTION</Text>
          {standing?.value != null && (
            <Text style={[styles.sectionCount, { color: classInfo.color }]}>
              {standing.value.toLocaleString()} value
            </Text>
          )}
          <Text style={styles.sectionCount}>
            {collection.unlockedCount} / {collection.entries.length}
          </Text>
        </View>
        <CollectionGrid entries={collection.entries} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1.2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionCount: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  // Same spacing as the Screen's own children.
  collection: { gap: spacing.md },
  tourCollection: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
});
