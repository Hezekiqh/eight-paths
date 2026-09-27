import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CLASSES, daysBetween, type Goal } from '@/game';
import { GOAL_XP } from '@/store/rewards';
import { colors, fonts, spacing, windowStyle } from '@/theme';

function describeDue(dueDate: string, today: string): string {
  const days = daysBetween(today, dueDate);
  if (days < 0) return `${-days} ${days === -1 ? 'day' : 'days'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

/** A personal goal: tick it off, or tap the text to edit it. */
export function GoalRow({ goal, today, onToggle }: { goal: Goal; today: string; onToggle: () => void }) {
  const info = goal.dimension ? CLASSES[goal.dimension] : null;
  const done = !!goal.completedAt;
  const detail = [
    info && `${info.className} · +${GOAL_XP} XP`,
    !done && goal.dueDate && describeDue(goal.dueDate, today),
    done && 'Done',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={[styles.row, done && styles.done]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={goal.title}
        onPress={onToggle}
        hitSlop={8}>
        <SymbolView
          name={done ? 'checkmark.square.fill' : 'square'}
          tintColor={done ? (info?.color ?? colors.gold) : colors.textMuted}
          size={26}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Edit goal"
        onPress={() => router.push({ pathname: '/goal-editor', params: { id: goal.id } })}
        style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]}>{goal.title}</Text>
        {detail ? <Text style={[styles.detail, info && !done && { color: info.color }]}>{detail}</Text> : null}
      </Pressable>
      {info && <SymbolView name={info.symbol} tintColor={info.color} size={18} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { ...windowStyle, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  done: { opacity: 0.55 },
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 21 },
  titleDone: { textDecorationLine: 'line-through' },
  detail: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
});
