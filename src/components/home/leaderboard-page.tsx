import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CharacterPortrait } from '@/components/character-portrait';
import { CLASSES, TUTORIAL_QUEST_ID, type Dimension } from '@/game';
import { useGameStore } from '@/store';
import { COMPANIONS, DEFAULT_PARTY } from '@/story/companions';
import { colors, fonts, spacing } from '@/theme';

/** One row's height. */
export const ROW = 35;

type Row = { id: string; title: string; dimension: Dimension; count: number };

/** How a core hero takes their habit's place: cheering at the top, nervous at the bottom. */
type Reaction = 'cheer' | 'happy' | 'idle' | 'nervous';
/** #1 cheers, the top three are happy, the bottom three (of a long enough list) are nervous, the rest idle. */
const reactionFor = (rank: number, total: number): Reaction =>
  rank === 1 ? 'cheer' : rank <= 3 ? 'happy' : total > 6 && rank > total - 3 ? 'nervous' : 'idle';

function ReactingHero({ dimension, rank, total }: { dimension: Dimension; rank: number; total: number }) {
  const reaction = reactionFor(rank, total);
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    if (reaction === 'cheer')
      y.value = withRepeat(
        withSequence(
          withTiming(-7, { duration: 220, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }),
        ),
        -1,
      );
    if (reaction === 'happy')
      y.value = withRepeat(withSequence(withTiming(-3, { duration: 350 }), withTiming(0, { duration: 350 })), -1);
    if (reaction === 'nervous')
      x.value = withRepeat(
        withSequence(
          withTiming(-1.5, { duration: 70 }),
          withTiming(1.5, { duration: 70 }),
          withTiming(0, { duration: 70 }),
          withTiming(0, { duration: 900 }),
        ),
        -1,
      );
    return () => {
      cancelAnimation(y);
      cancelAnimation(x);
      y.value = 0;
      x.value = 0;
    };
  }, [reaction, reduceMotion, x, y]);

  const motion = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { translateX: x.value }] }));
  const companion = COMPANIONS[DEFAULT_PARTY[dimension]];

  return (
    <View style={styles.hero}>
      {reaction === 'cheer' && <Text style={styles.crown}>★</Text>}
      {reaction === 'nervous' && <View style={styles.sweat} />}
      <Animated.View style={motion}>
        <CharacterPortrait companion={companion} scale={0.625} animate={reaction !== 'nervous'} />
      </Animated.View>
    </View>
  );
}

type Props = { width: number; height: number };

/**
 * Every habit ranked by how often it's been done, all time (archived ones too,
 * once done), each with its Path's core hero reacting to where it stands. The
 * list scrolls inside the pager's fixed height.
 */
export function LeaderboardPage({ width, height }: Props) {
  const completions = useGameStore((s) => s.completions);
  const quests = useGameStore((s) => s.quests);

  const rows = useMemo<Row[]>(() => {
    const counts = new Map<string, number>();
    for (const c of completions) counts.set(c.questId, (counts.get(c.questId) ?? 0) + 1);
    return quests
      .filter((q) => q.id !== TUTORIAL_QUEST_ID && (q.active || counts.has(q.id)))
      .map((q) => ({ id: q.id, title: q.title, dimension: q.dimension, count: counts.get(q.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  }, [completions, quests]);

  const max = Math.max(1, rows[0]?.count ?? 1);

  return (
    <View style={{ width, height }}>
      <Text style={styles.title}>HABIT RANKING · ALL TIME</Text>
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {rows.length === 0 && <Text style={styles.empty}>Add a few quests and your habits line up here.</Text>}
        {rows.map((r, i) => {
          const info = CLASSES[r.dimension];
          const rank = i + 1;
          return (
            <View
              key={r.id}
              style={styles.row}
              accessible
              accessibilityLabel={`Number ${rank}: ${r.title}, done ${r.count} ${r.count === 1 ? 'time' : 'times'}`}>
              <View style={styles.barCol}>
                <Text style={styles.habit} numberOfLines={1}>
                  {r.title}
                </Text>
                <View style={styles.barLine}>
                  <View style={[styles.bar, { backgroundColor: info.color, flex: r.count / max }]} />
                  <Text style={styles.count}>{r.count}</Text>
                  <View style={{ flex: 1 - r.count / max }} />
                </View>
              </View>
              <ReactingHero dimension={r.dimension} rank={rank} total={rows.length} />
              <Text style={[styles.rank, rank <= 3 && { color: info.color }]}>#{rank}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: ROW },
  barCol: { flex: 1, gap: 2 },
  habit: { color: colors.text, fontFamily: fonts.regular, fontSize: 13 },
  barLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bar: { height: 10, minWidth: 4, borderRadius: 1 },
  count: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, fontVariant: ['tabular-nums'] },
  hero: { width: 24, height: ROW - 2, alignItems: 'center', justifyContent: 'flex-end' },
  crown: { position: 'absolute', top: -8, color: '#FFC940', fontSize: 12, zIndex: 1 },
  sweat: { position: 'absolute', top: 6, right: 0, width: 3, height: 4, backgroundColor: '#7AB0E0', zIndex: 1 },
  rank: {
    width: 34,
    textAlign: 'right',
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
});
