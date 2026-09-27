import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { Segmented } from '@/components/segmented';
import { CLASSES, DAILY, DIMENSIONS, WEEKDAYS, scheduleKind, type Dimension, type ScheduleKind } from '@/game';
import { useGameStore } from '@/store';
import { usePlayer, useQuest } from '@/store/hooks';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

const SCHEDULES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'custom', label: 'Pick days' },
] as const;

/** Monday-first, matching how people read a week. */
const DAY_TOGGLES = [
  { day: 1, label: 'M' },
  { day: 2, label: 'T' },
  { day: 3, label: 'W' },
  { day: 4, label: 'T' },
  { day: 5, label: 'F' },
  { day: 6, label: 'S' },
  { day: 0, label: 'S' },
];

export default function QuestEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useQuest(id);
  const player = usePlayer();
  const addQuest = useGameStore((s) => s.addQuest);
  const updateQuest = useGameStore((s) => s.updateQuest);
  const archiveQuest = useGameStore((s) => s.archiveQuest);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [dimension, setDimension] = useState<Dimension>(
    existing?.dimension ?? player?.classDimension ?? 'physical',
  );
  const [kind, setKind] = useState<ScheduleKind>(existing ? scheduleKind(existing.repeatDays) : 'daily');
  const [customDays, setCustomDays] = useState<number[]>(
    existing && scheduleKind(existing.repeatDays) === 'custom' ? existing.repeatDays : [1, 3, 5],
  );

  const info = CLASSES[dimension];
  const repeatDays = kind === 'daily' ? DAILY : kind === 'weekdays' ? WEEKDAYS : customDays;
  const canSave = title.trim().length > 0 && repeatDays.length > 0;

  const save = () => {
    const draft = { title, dimension, repeatDays };
    if (existing) updateQuest(existing.id, draft);
    else addQuest(draft);
    router.back();
  };

  const archive = () => {
    if (!existing) return;
    Alert.alert('Archive this quest?', 'It leaves your quest board. The XP you earned stays.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => {
          archiveQuest(existing.id);
          router.back();
        },
      },
    ]);
  };

  const toggleDay = (day: number) =>
    setCustomDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]));

  return (
    <View style={styles.screen}>
      <ModalHeader
        title={existing ? 'Edit quest' : 'New quest'}
        actionLabel="Save"
        onAction={save}
        actionDisabled={!canSave}
        color={info.color}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Quest</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Stretch for 10 min"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoFocus={!existing}
          maxLength={60}
          returnKeyType="done"
        />

        <Text style={styles.label}>Class</Text>
        <View style={styles.classes}>
          {DIMENSIONS.map((d) => {
            const c = CLASSES[d];
            const selected = d === dimension;
            return (
              <Pressable
                key={d}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setDimension(d)}
                style={[styles.classChip, selected && { borderColor: c.color, backgroundColor: colors.cardRaised }]}>
                <SymbolView name={c.symbol} tintColor={c.color} size={18} />
                <Text style={[styles.classChipText, selected && { color: c.color }]}>{c.className}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{info.growth}</Text>

        <Text style={styles.label}>Repeat</Text>
        <Segmented options={SCHEDULES} value={kind} onChange={setKind} color={info.color} />
        {kind === 'custom' && (
          <View style={styles.days}>
            {DAY_TOGGLES.map(({ day, label }) => {
              const on = customDays.includes(day);
              return (
                <Pressable
                  key={day}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggleDay(day)}
                  style={[styles.day, on && { backgroundColor: info.color, borderColor: info.color }]}>
                  <Text style={[styles.dayText, on && { color: colors.background }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {existing && (
          <Pressable accessibilityRole="button" onPress={archive} style={styles.archive}>
            <SymbolView name="archivebox" tintColor={colors.textMuted} size={16} />
            <Text style={styles.archiveText}>Archive quest</Text>
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
  input: {
    ...windowStyle,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 17,
    padding: spacing.lg,
  },
  classes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  classChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...windowStyle,
  },
  classChipText: { color: colors.text, fontSize: 20, fontFamily: fonts.semibold },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { color: colors.text, fontSize: 20, fontFamily: fonts.bold },
  archive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  archiveText: { color: colors.textMuted, fontSize: 20, fontFamily: fonts.semibold },
});
