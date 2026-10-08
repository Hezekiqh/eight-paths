import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { REGULATOR_COLOR } from '@/components/regulator-row';
import { addDays } from '@/game';
import { CLEAN_DAY_BONUS, MAX_COUNT, dayDrain, rawDrain, type DayReport } from '@/game/regulator';
import { haptics } from '@/haptics';
import { useTrackedStimuli } from '@/regulator/hooks';
import { useRegulator } from '@/regulator/store';
import { useToday } from '@/store/hooks';
import { FRAME, colors, fonts, spacing, windowStyle } from '@/theme';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** Kind words after a check-in. Never a verdict. */
function afterword(drain: number, clean: boolean): string {
  if (clean) return 'A steady day. Your Dopamine Baseline is rising.';
  if (drain >= 30) return "A day of big spikes. Today's habits will help your baseline settle back up.";
  return "Noted. Today's habits will bring your baseline back up.";
}

/**
 * The morning check-in: yesterday's super stimuli, one tap each. Easy mode is
 * yes or no; Hard mode asks how many times after a yes. Pass `date` to change
 * an answer already given.
 */
export default function RegulatorSurvey() {
  const today = useToday();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? addDays(today, -1);
  const mode = useRegulator((s) => s.mode);
  const existing = useRegulator((s) => s.reports[date]);
  const save = useRegulator((s) => s.report);
  const stimuli = useTrackedStimuli();
  const [answers, setAnswers] = useState<DayReport>(() => ({ ...existing }));
  const [done, setDone] = useState<{ drain: number; capped: boolean; clean: boolean } | null>(null);

  const set = (id: string, times: number) => {
    haptics.select();
    setAnswers((a) => ({ ...a, [id]: Math.max(0, Math.min(MAX_COUNT, times)) }));
  };

  const submit = () => {
    const report: DayReport = {};
    for (const s of stimuli) report[s.id] = answers[s.id] ?? 0;
    save(date, report);
    const drain = dayDrain(report, stimuli, mode);
    const clean = drain === 0;
    if (clean) haptics.success();
    else haptics.nudge();
    setDone({ drain, capped: rawDrain(report, stimuli, mode) > drain, clean });
  };

  const day =
    date === addDays(today, -1)
      ? 'yesterday'
      : new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  if (done) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.result}>
          <Text style={styles.resultLabel}>{done.clean ? 'STEADY DAY' : 'CHECKED IN'}</Text>
          <Text style={[styles.resultBig, { color: done.clean ? '#3FA34D' : REGULATOR_COLOR }]}>
            {done.clean ? `+${CLEAN_DAY_BONUS} HP` : `−${done.drain} HP`}
          </Text>
          {done.capped && <Text style={styles.hint}>A single day never costs more than this.</Text>}
          <Text style={styles.afterword}>{afterword(done.drain, done.clean)}</Text>
        </View>
        <View style={styles.footer}>
          <Button title="Done" color={REGULATOR_COLOR} onPress={close} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={12}>
          <Text style={styles.cancel}>Later</Text>
        </Pressable>
        <Text style={styles.title}>Morning check-in</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.question}>Which of these came up {day}?</Text>
        <Text style={styles.hint}>Tap the ones that did. Everything else counts as no.</Text>
        {stimuli.map((s) => {
          const times = answers[s.id] ?? 0;
          const yes = times > 0;
          return (
            <View key={s.id} style={[styles.row, yes && { borderColor: REGULATOR_COLOR }]}>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: yes }}
                accessibilityLabel={s.name}
                onPress={() => set(s.id, yes ? 0 : 1)}
                style={styles.rowMain}>
                <Text style={styles.name}>{s.name}</Text>
                <View style={[styles.pill, yes ? { backgroundColor: REGULATOR_COLOR } : styles.pillNo]}>
                  <Text style={[styles.pillText, yes && { color: colors.background }]}>{yes ? 'YES' : 'NO'}</Text>
                </View>
              </Pressable>
              {mode === 'hard' && yes && (
                <View style={styles.stepper}>
                  <Text style={styles.hint}>How many times?</Text>
                  <View style={styles.stepperControls}>
                    <StepButton label="−" onPress={() => set(s.id, times - 1)} />
                    <Text style={styles.count}>{times >= MAX_COUNT ? `${MAX_COUNT}+` : times}</Text>
                    <StepButton label="+" onPress={() => set(s.id, times + 1)} />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Done" color={REGULATOR_COLOR} onPress={submit} />
      </View>
    </SafeAreaView>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'One more' : 'One fewer'}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.cardRaised }]}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerSpacer: { width: 40 },
  cancel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 17 },
  title: { color: colors.text, fontSize: 22, fontFamily: fonts.bold },
  content: { padding: spacing.lg, gap: spacing.sm },
  question: { color: colors.text, fontFamily: fonts.bold, fontSize: 26 },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  row: { ...windowStyle },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  name: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 17 },
  pill: { minWidth: 52, paddingVertical: 4, alignItems: 'center', borderWidth: 2, borderColor: colors.frame },
  pillNo: { backgroundColor: colors.cardRaised, borderColor: colors.border },
  pillText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 17, letterSpacing: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: {
    width: 36,
    height: 36,
    borderWidth: FRAME - 1,
    borderColor: colors.frame,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.text, fontFamily: fonts.bold, fontSize: 24 },
  count: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 24,
    minWidth: 32,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  footer: { padding: spacing.lg },
  result: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  resultLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 18, letterSpacing: 2 },
  resultBig: { fontFamily: fonts.bold, fontSize: 64, fontVariant: ['tabular-nums'] },
  afterword: { color: colors.text, fontFamily: fonts.regular, fontSize: 17, lineHeight: 24, textAlign: 'center' },
});
