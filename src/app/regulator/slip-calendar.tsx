import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { HP_COLORS } from '@/components/player-card';
import { REGULATOR_COLOR } from '@/components/regulator-row';
import { Screen } from '@/components/screen';
import { monthName, monthOf, monthWeeks, shiftMonth } from '@/game';
import { dayDrain, slipsOn } from '@/game/regulator';
import { haptics } from '@/haptics';
import { useHp } from '@/regulator/hooks';
import { allStimuli, useRegulator } from '@/regulator/store';
import { useToday } from '@/store/hooks';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CLEAN = HP_COLORS.high;
const SLIP = `${REGULATOR_COLOR}99`;
/** A day costing this much or more shows in the deeper purple. */
const HEAVY = 25;

type Kind = 'clean' | 'slip' | 'unanswered' | 'outside';

/**
 * The Baseline calendar, the Regulator's month view: steady days in green, spike days in
 * purple (deeper the more they cost), days not checked in left plain. Tap a
 * day to see what came up.
 */
export default function SlipCalendarScreen() {
  const today = useToday();
  const start = useRegulator((s) => s.start);
  const reports = useRegulator((s) => s.reports);
  const mode = useRegulator((s) => s.mode);
  const custom = useRegulator((s) => s.custom);
  // Slips are named from everything ever tracked, so a stimulus dropped later still shows on its old days.
  const everything = allStimuli(custom);
  const { streaks } = useHp(today);
  const [month, setMonth] = useState(monthOf(today));
  const [picked, setPicked] = useState<string | null>(null);

  const firstMonth = start ? monthOf(start) : monthOf(today);
  const canBack = month > firstMonth;
  const canForward = month < monthOf(today);

  const kindOf = (date: string): Kind => {
    if (!start || date < start || date >= today) return 'outside';
    const report = reports[date];
    if (!report) return 'unanswered';
    return slipsOn(report, everything).length === 0 ? 'clean' : 'slip';
  };

  const weeks = monthWeeks(month);
  const days = weeks.flat().filter((d): d is string => d !== null);
  const clean = days.filter((d) => kindOf(d) === 'clean').length;
  const slips = days.filter((d) => kindOf(d) === 'slip').length;

  const go = (delta: number) => {
    haptics.select();
    setPicked(null);
    setMonth((m) => shiftMonth(m, delta));
  };

  const pickedReport = picked ? reports[picked] : undefined;
  const pickedSlips = slipsOn(pickedReport, everything);

  return (
    <Screen>
      <BackHeader title="Baseline calendar" back="Regulator" color={REGULATOR_COLOR} />

      <View style={styles.streaks}>
        <View style={styles.streak}>
          <Text style={[styles.streakBig, { color: CLEAN }]}>{streaks.current}</Text>
          <Text style={styles.streakLabel}>clean days in a row</Text>
        </View>
        <View style={styles.streak}>
          <Text style={styles.streakBig}>{streaks.best}</Text>
          <Text style={styles.streakLabel}>best streak</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            disabled={!canBack}
            onPress={() => go(-1)}
            hitSlop={12}>
            <SymbolView
              name="chevron.left"
              tintColor={canBack ? REGULATOR_COLOR : colors.border}
              size={18}
              weight="bold"
            />
          </Pressable>
          <Text style={styles.title}>{monthName(month).toUpperCase()}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            disabled={!canForward}
            onPress={() => go(1)}
            hitSlop={12}>
            <SymbolView
              name="chevron.right"
              tintColor={canForward ? REGULATOR_COLOR : colors.border}
              size={18}
              weight="bold"
            />
          </Pressable>
        </View>

        <View style={styles.row}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, w) => (
          <View key={w} style={styles.row}>
            {week.map((date, d) => {
              if (!date) return <View key={`pad-${d}`} style={styles.slot} />;
              const kind = kindOf(date);
              const report = reports[date];
              const heavy = kind === 'slip' && !!report && dayDrain(report, everything, mode) >= HEAVY;
              const bg =
                kind === 'clean'
                  ? CLEAN
                  : kind === 'slip'
                    ? heavy
                      ? REGULATOR_COLOR
                      : SLIP
                    : kind === 'unanswered'
                      ? colors.cardRaised
                      : 'transparent';
              const filled = kind === 'clean' || kind === 'slip';
              return (
                <Pressable
                  key={date}
                  style={styles.slot}
                  disabled={kind === 'outside'}
                  accessibilityRole="button"
                  accessibilityLabel={`${date}: ${kind === 'outside' ? 'not tracked' : kind === 'unanswered' ? 'no check-in' : kind}`}
                  onPress={() => {
                    haptics.select();
                    setPicked(date === picked ? null : date);
                  }}>
                  <View style={[styles.day, { backgroundColor: bg }, date === picked && styles.picked]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        kind === 'outside' && styles.dayOutside,
                        filled && { color: colors.background },
                      ]}>
                      {Number(date.slice(8))}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        <Text style={styles.summary}>
          {clean} steady {clean === 1 ? 'day' : 'days'} · {slips} spike {slips === 1 ? 'day' : 'days'}
        </Text>
        <View style={styles.legend}>
          <View style={[styles.legendCell, { backgroundColor: CLEAN }]} />
          <Text style={styles.legendText}>Steady</Text>
          <View style={[styles.legendCell, { backgroundColor: SLIP }]} />
          <Text style={styles.legendText}>Spike</Text>
          <View style={[styles.legendCell, { backgroundColor: REGULATOR_COLOR }]} />
          <Text style={styles.legendText}>Big spike</Text>
          <View style={[styles.legendCell, { backgroundColor: colors.cardRaised }]} />
          <Text style={styles.legendText}>No check-in</Text>
        </View>
      </View>

      {picked && (
        <View style={styles.card}>
          <Text style={styles.label}>
            {new Date(`${picked}T12:00:00`)
              .toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
              .toUpperCase()}
          </Text>
          {!pickedReport ? (
            <Text style={styles.body}>No check-in for this day.</Text>
          ) : pickedSlips.length === 0 ? (
            <Text style={styles.body}>A steady day.</Text>
          ) : (
            pickedSlips.map((s) => (
              <View key={s.id} style={styles.slipRow}>
                <Text style={styles.body}>{s.name}</Text>
                {mode === 'hard' && <Text style={styles.times}>×{pickedReport[s.id]}</Text>}
              </View>
            ))
          )}
        </View>
      )}
      <Text style={styles.note}>Every steady day lets your Dopamine Baseline rise.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { ...windowStyle, padding: spacing.lg, gap: spacing.xs },
  streaks: { flexDirection: 'row', gap: spacing.md },
  streak: { ...windowStyle, flex: 1, padding: spacing.md, alignItems: 'center' },
  streakBig: { color: colors.text, fontFamily: fonts.bold, fontSize: 40, fontVariant: ['tabular-nums'] },
  streakLabel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 22, letterSpacing: 1 },
  row: { flexDirection: 'row' },
  slot: { flex: 1, aspectRatio: 1, padding: 2 },
  weekday: { flex: 1, textAlign: 'center', color: colors.textMuted, fontFamily: fonts.bold, fontSize: 15 },
  day: { flex: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  picked: { borderWidth: 2, borderColor: colors.frame },
  dayNumber: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 18, fontVariant: ['tabular-nums'] },
  dayOutside: { color: colors.border },
  summary: { color: colors.text, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  legendText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, marginRight: spacing.xs },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 15, letterSpacing: 1 },
  body: { color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
  slipRow: { flexDirection: 'row', justifyContent: 'space-between' },
  times: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 18 },
  note: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },
});
