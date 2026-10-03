import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { haptics } from '@/haptics';
import type { QuestSort } from '@/game';
import { useGameStore } from '@/store';
import { useClassInfo, useToday, useTodayQuests } from '@/store/hooks';
import type { QuestView } from '@/store/selectors';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

const ROW = 64;

/** The ways Today can be ordered, and what each does, in the player's words. */
const SORTS: { value: QuestSort['by']; label: string; about: string }[] = [
  {
    value: 'auto',
    label: 'Auto',
    about: 'The game learns when you usually do each quest and re-orders the list day by day.',
  },
  { value: 'mine', label: 'Mine', about: 'Your own order. Touch and hold a quest, then drag it.' },
  { value: 'done', label: 'Done', about: "Today's finished quests come first, in the order you finished them." },
];
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

  const { quest, info, done } = view;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessibilityLabel={`${quest.title}, ${info.className}${done ? ', done today' : ''}`}
        accessibilityHint="Touch and hold, then drag to move"
        style={[styles.row, style]}>
        <View style={styles.body}>
          <Text style={[styles.path, { color: info.color }]}>{info.className.toUpperCase()}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {quest.title}
          </Text>
        </View>
        {done && <SymbolView name="checkmark" tintColor={info.color} size={18} />}
        <SymbolView name="line.3.horizontal" tintColor={colors.textMuted} size={22} />
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * How Today is ordered: auto (the order the player usually does them in,
 * re-learned day by day), their own dragged order, or as finished today; and
 * whether unfinished quests go on top. Dragging a quest switches to their own order.
 */
export default function ReorderQuestsScreen() {
  const today = useToday();
  const quests = useTodayQuests(today);
  const classInfo = useClassInfo();
  const sort = useGameStore((s) => s.questSort);
  const setQuestOrder = useGameStore((s) => s.setQuestOrder);
  const setQuestSort = useGameStore((s) => s.setQuestSort);
  const accent = classInfo?.color ?? colors.accent;
  // Remount the rows when the list itself changes (e.g. back to the usual order).
  const key = quests.map((v) => v.quest.id).join(',');
  const positions = useSharedValue<Positions>(Object.fromEntries(quests.map((v, i) => [v.quest.id, i])));
  const [listKey, setListKey] = useState(key);
  if (listKey !== key) {
    positions.set(Object.fromEntries(quests.map((v, i) => [v.quest.id, i])));
    setListKey(key);
  }

  const pickSort = (by: QuestSort['by']) => {
    if (by === 'auto') return setQuestOrder(null);
    // "Mine" with nothing dragged yet starts from the list as it stands now.
    if (by === 'mine' && !useGameStore.getState().questOrder) return save();
    setQuestSort({ by });
  };

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
      <Text style={styles.label}>SORT BY</Text>
      <Segmented options={SORTS} value={sort.by} onChange={pickSort} color={accent} />
      <Text style={styles.about}>{SORTS.find((s) => s.value === sort.by)?.about}</Text>
      <View style={styles.toggle}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>Unfinished on top</Text>
          <Text style={styles.about}>Quests still to do today move above the ones you&apos;ve finished.</Text>
        </View>
        <Switch
          accessibilityLabel="Unfinished on top"
          value={sort.unfinishedFirst}
          onValueChange={(unfinishedFirst) => {
            haptics.tap();
            setQuestSort({ unfinishedFirst });
          }}
          trackColor={{ true: accent }}
        />
      </View>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  tip: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13 },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  about: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  toggle: { ...windowStyle, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  toggleTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
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
});
