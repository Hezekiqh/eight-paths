import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Screen } from '@/components/screen';
import { haptics } from '@/haptics';
import { useGameStore } from '@/store';
import { useClassInfo, useToday, useTodayQuests } from '@/store/hooks';
import type { QuestView } from '@/store/selectors';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

const ROW = 64;
const SLOT = ROW + spacing.sm;

type Positions = Record<string, number>;

function clamp(value: number, max: number) {
  'worklet';
  return Math.max(0, Math.min(max, value));
}

/** Moves `id` to slot `to`, shifting everyone between its old and new slot by one. */
function moveTo(positions: Positions, id: string, to: number): Positions {
  'worklet';
  const from = positions[id];
  if (from === to) return positions;
  const next: Positions = {};
  for (const key of Object.keys(positions)) {
    const p = positions[key];
    if (key === id) next[key] = to;
    else if (from < to && p > from && p <= to) next[key] = p - 1;
    else if (from > to && p < from && p >= to) next[key] = p + 1;
    else next[key] = p;
  }
  return next;
}

function DraggableRow({
  view,
  positions,
  count,
  onMoved,
  onPickUp,
}: {
  view: QuestView;
  positions: SharedValue<Positions>;
  count: number;
  onMoved: () => void;
  onPickUp: () => void;
}) {
  const id = view.quest.id;
  const dragging = useSharedValue(false);
  const y = useSharedValue(positions.value[id] * SLOT);
  const start = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      dragging.value = true;
      start.value = positions.value[id] * SLOT;
      scheduleOnRN(onPickUp);
    })
    .onUpdate((e) => {
      y.value = start.value + e.translationY;
      const to = clamp(Math.round(y.value / SLOT), count - 1);
      if (to !== positions.value[id]) positions.set(moveTo(positions.value, id, to));
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      scheduleOnRN(onMoved);
    });

  const style = useAnimatedStyle(() => {
    const top = dragging.value ? y.value : withSpring(positions.value[id] * SLOT, { damping: 20, stiffness: 220 });
    return {
      top,
      zIndex: dragging.value ? 2 : 1,
      transform: [{ scale: withSpring(dragging.value ? 1.03 : 1) }],
      shadowOpacity: dragging.value ? 0.25 : 0,
    };
  });

  const { quest, info } = view;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessibilityLabel={`${quest.title}, ${info.className}`}
        accessibilityHint="Touch and hold, then drag to move"
        style={[styles.row, style]}>
        <View style={styles.body}>
          <Text style={[styles.path, { color: info.color }]}>{info.className.toUpperCase()}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {quest.title}
          </Text>
        </View>
        <SymbolView name="line.3.horizontal" tintColor={colors.textMuted} size={22} />
      </Animated.View>
    </GestureDetector>
  );
}

/** Drag Today's quests into the player's own order. */
export default function ReorderQuestsScreen() {
  const today = useToday();
  const quests = useTodayQuests(today);
  const classInfo = useClassInfo();
  const custom = useGameStore((s) => s.questOrder !== null);
  const setQuestOrder = useGameStore((s) => s.setQuestOrder);
  const accent = classInfo?.color ?? colors.accent;
  // Remount the rows when the list itself changes (e.g. back to the usual order).
  const key = quests.map((v) => v.quest.id).join(',');
  const positions = useSharedValue<Positions>(Object.fromEntries(quests.map((v, i) => [v.quest.id, i])));
  const [listKey, setListKey] = useState(key);
  if (listKey !== key) {
    positions.set(Object.fromEntries(quests.map((v, i) => [v.quest.id, i])));
    setListKey(key);
  }

  const save = () => {
    const order = Object.entries(positions.value)
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => id);
    // Keep quests that aren't on today's list where they were in the saved order.
    const others = (useGameStore.getState().questOrder ?? []).filter((id) => !(id in positions.value));
    setQuestOrder([...order, ...others]);
    haptics.tap();
  };

  return (
    <Screen
      title="Reorder"
      action={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.done, { backgroundColor: accent }]}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      }>
      <Text style={styles.tip}>* Touch and hold a quest, then drag it. New quests start at the bottom.</Text>
      <View key={listKey} style={{ height: quests.length * SLOT }}>
        {quests.map((view) => (
          <DraggableRow
            key={view.quest.id}
            view={view}
            positions={positions}
            count={quests.length}
            onPickUp={haptics.tap}
            onMoved={save}
          />
        ))}
      </View>
      {custom && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.tap();
            setQuestOrder(null);
          }}
          style={({ pressed }) => [styles.reset, pressed && { opacity: 0.6 }]}>
          <Text style={[styles.resetText, { color: accent }]}>Go back to the order I usually do them</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tip: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13 },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...windowStyle,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  body: { flex: 1 },
  path: { fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 19, fontFamily: fonts.semibold },
  done: { paddingHorizontal: spacing.md, height: 36, borderRadius: radius.pill, justifyContent: 'center' },
  doneText: { color: colors.background, fontFamily: fonts.bold, fontSize: 16 },
  reset: { alignSelf: 'center', padding: spacing.sm },
  resetText: { fontFamily: fonts.bold, fontSize: 15 },
});
