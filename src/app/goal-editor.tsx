import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ClassChips } from '@/components/class-chips';
import { ModalHeader } from '@/components/modal-header';
import { CLASSES, addDays, toDateKey, type Dimension } from '@/game';
import { useGameStore } from '@/store';
import { useGoals, useToday } from '@/store/hooks';
import { GOAL_XP } from '@/store/rewards';
import { colors, fonts, spacing, windowStyle } from '@/theme';

const keyToDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export default function GoalEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const today = useToday();
  const existing = useGoals().find((g) => g.id === id);
  const addGoal = useGameStore((s) => s.addGoal);
  const updateGoal = useGameStore((s) => s.updateGoal);
  const deleteGoal = useGameStore((s) => s.deleteGoal);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [dimension, setDimension] = useState<Dimension | undefined>(existing?.dimension);
  const [dueDate, setDueDate] = useState<string | undefined>(existing?.dueDate);

  const color = dimension ? CLASSES[dimension].color : colors.gold;
  const canSave = title.trim().length > 0;

  const save = () => {
    const draft = { title, dimension, dueDate };
    if (existing) updateGoal(existing.id, draft);
    else addGoal(draft);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const earned = existing.completedAt && existing.dimension ? ` The ${GOAL_XP} XP it earned goes with it.` : '';
    Alert.alert('Delete this goal?', `This can't be undone.${earned}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteGoal(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ModalHeader
        title={existing ? 'Edit goal' : 'New goal'}
        actionLabel="Save"
        onAction={save}
        actionDisabled={!canSave}
        color={color}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Goal</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Run a 5K"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoFocus={!existing}
          maxLength={60}
          returnKeyType="done"
        />

        <Text style={styles.label}>Path (optional)</Text>
        <ClassChips value={dimension} onChange={setDimension} optional />
        <Text style={styles.hint}>
          {dimension
            ? `Finishing it earns ${GOAL_XP} ${CLASSES[dimension].className} XP. Tap again to clear.`
            : `Pick a Path and finishing this goal earns ${GOAL_XP} XP there.`}
        </Text>

        <View style={styles.dueRow}>
          <Text style={styles.label}>Target date</Text>
          <Switch
            value={dueDate !== undefined}
            onValueChange={(on) => setDueDate(on ? addDays(today, 30) : undefined)}
            trackColor={{ true: color }}
          />
        </View>
        {dueDate && (
          <DateTimePicker
            value={keyToDate(dueDate)}
            mode="date"
            display="inline"
            themeVariant="dark"
            accentColor={color}
            minimumDate={keyToDate(today)}
            onValueChange={(_, date) => setDueDate(toDateKey(date))}
          />
        )}

        {existing && (
          <Pressable accessibilityRole="button" onPress={remove} style={styles.delete}>
            <SymbolView name="trash" tintColor={colors.danger} size={16} />
            <Text style={styles.deleteText}>Delete goal</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  label: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1.2, marginTop: spacing.sm },
  input: { ...windowStyle, color: colors.text, fontFamily: fonts.regular, fontSize: 17, padding: spacing.lg },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  dueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  deleteText: { color: colors.danger, fontSize: 20, fontFamily: fonts.semibold },
});
