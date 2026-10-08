import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import {
  CLASSES,
  clockTime,
  createdDay,
  monthName,
  monthOf,
  shiftMonth,
  WEEKDAY_NAMES,
  dayOfWeek,
  type HabitDay,
} from '@/game';
import { haptics } from '@/haptics';
import { useGameStore } from '@/store';
import { useHabitStats, useToday } from '@/store/hooks';
import { colors, fonts, radius, spacing } from '@/theme';
import { showDialog } from '@/components/dialog';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Tuesday 6 Oct" */
const dayName = (date: string) =>
  `${WEEKDAY_NAMES[dayOfWeek(date)]} ${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;

/** What happened on a day of the calendar, in a sentence. */
function describe(day: HabitDay): string {
  switch (day.status) {
    case 'hit':
      return day.at === undefined ? 'Done.' : `Done at ${clockTime(day.at)}.`;
    case 'miss':
      return 'Missed.';
    case 'open':
      return 'Due today. Not done yet.';
    case 'excused':
      return 'Skipped, or saved by a rest token. Your streak carries on.';
    default:
      return 'Not scheduled.';
  }
}

function Tile({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}. ${sub}`}>
      <Text style={styles.tileLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.tileValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </View>
  );
}

/**
 * One habit's stats, from holding it on the Quests screen (author, Oct 7, 2026): a small
 * version of the Stats tab for just this habit. When you usually do it, the day you keep it
 * best, how reliably, and a month of hits and misses; tap a day to see when you did it.
 */
export default function HabitSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const [month, setMonth] = useState(monthOf(today));
  const [picked, setPicked] = useState(today);
  const habit = useHabitStats(id, month, today);
  const skipQuest = useGameStore((s) => s.skipQuest);
  if (!habit) return null;
  const { quest, stats } = habit;
  const info = CLASSES[quest.dimension];
  const color = info.color;

  const firstMonth = monthOf(createdDay(quest));
  const canBack = month > firstMonth;
  const canForward = month < monthOf(today);
  const go = (delta: number) => {
    haptics.select();
    setMonth((m) => shiftMonth(m, delta));
  };

  const days = stats.month.weeks.flat().filter((d): d is HabitDay => d !== null);
  const shown = days.find((d) => d.date === picked);
  const todayDay = month === monthOf(today) ? days.find((d) => d.date === today) : undefined;

  const skip = () =>
    showDialog(
      `Skip "${quest.title}" today?`,
      "It's erased from today: no XP, and your streak is left alone. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip for today',
          style: 'destructive',
          onPress: () => {
            if (skipQuest(quest.id, today)) {
              haptics.select();
              router.back();
            }
          },
        },
      ],
    );

  const rate = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`);

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={[styles.emblem, { borderColor: color }]}>
          <SymbolView name={info.symbol} tintColor={color} size={24} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title} numberOfLines={2}>
            {quest.title}
          </Text>
          <Text style={styles.sub}>
            {info.dimensionLabel} Path · done {stats.total} {stats.total === 1 ? 'time' : 'times'} in all
          </Text>
        </View>
      </View>

      <View style={styles.tiles}>
        <Tile
          label="Usual time"
          value={stats.averageTime === null ? '—' : clockTime(stats.averageTime)}
          sub={stats.timed === 0 ? 'Not timed yet' : `Average of ${stats.timed}`}
          color={color}
        />
        <Tile
          label="Best day"
          value={stats.bestDay?.name ?? '—'}
          sub={stats.bestDay ? `Kept ${stats.bestDay.done} of ${stats.bestDay.due}` : 'Needs a few weeks'}
          color={color}
        />
        <Tile
          label="Last 30 days"
          value={rate(stats.last30.rate)}
          sub={stats.last30.due ? `${stats.last30.done} of ${stats.last30.due} kept` : 'Nothing due yet'}
          color={color}
        />
        <Tile
          label="Streak"
          value={`${stats.streak.current} ${stats.streak.current === 1 ? 'day' : 'days'}`}
          sub={`Best ${stats.streak.best}`}
          color={color}
        />
      </View>

      <View style={styles.calendar}>
        <View style={styles.monthRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            accessibilityState={{ disabled: !canBack }}
            disabled={!canBack}
            onPress={() => go(-1)}
            hitSlop={12}>
            <SymbolView name="chevron.left" tintColor={canBack ? color : colors.border} size={16} weight="bold" />
          </Pressable>
          <Text style={styles.monthTitle}>{monthName(month).toUpperCase()}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: !canForward }}
            disabled={!canForward}
            onPress={() => go(1)}
            hitSlop={12}>
            <SymbolView name="chevron.right" tintColor={canForward ? color : colors.border} size={16} weight="bold" />
          </Pressable>
        </View>
        <View style={styles.row}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>
        {stats.month.weeks.map((week, w) => (
          <View key={w} style={styles.row}>
            {week.map((day, d) => {
              if (!day) return <View key={`pad-${d}`} style={styles.slot} />;
              const hit = day.status === 'hit';
              const miss = day.status === 'miss';
              return (
                <Pressable
                  key={day.date}
                  style={styles.slot}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayName(day.date)}: ${describe(day)}`}
                  onPress={() => {
                    haptics.select();
                    setPicked(day.date);
                  }}>
                  <View
                    style={[
                      styles.day,
                      hit && { backgroundColor: color },
                      miss && { borderColor: colors.danger, borderWidth: 1.5 },
                      day.status === 'open' && { borderColor: color, borderWidth: 1.5, borderStyle: 'dashed' },
                      day.status === 'excused' && { backgroundColor: colors.cardRaised },
                      day.date === picked && styles.picked,
                    ]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        hit && { color: colors.background, fontFamily: fonts.bold },
                        miss && { color: colors.danger },
                        day.status === 'off' && { color: colors.textFaint, opacity: 0.6 },
                      ]}>
                      {day.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Text style={styles.detail}>{shown ? `${dayName(shown.date)} · ${describe(shown)}` : ' '}</Text>
        <View style={styles.legend}>
          <View style={[styles.key, { backgroundColor: color }]} />
          <Text style={styles.legendText}>Done {stats.month.hits}</Text>
          <View style={[styles.key, { borderColor: colors.danger, borderWidth: 1.5 }]} />
          <Text style={styles.legendText}>Missed {stats.month.misses}</Text>
          <View style={[styles.key, { backgroundColor: colors.cardRaised }]} />
          <Text style={styles.legendText}>Skipped or rest token</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {todayDay?.status === 'open' && (
          <View style={{ flex: 1 }}>
            <Button title="Skip for today" variant="ghost" color={colors.textMuted} onPress={skip} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button
            title="Edit quest"
            variant="ghost"
            color={color}
            onPress={() => {
              router.back();
              router.push({ pathname: '/quest-editor', params: { id: quest.id } });
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.card, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emblem: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 22 },
  sub: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.cardRaised,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  tileLabel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, letterSpacing: 1 },
  tileValue: { fontFamily: fonts.bold, fontSize: 22 },
  tileSub: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12 },
  calendar: { gap: spacing.xs },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  monthTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11 },
  slot: { flex: 1, aspectRatio: 1, padding: 2 },
  day: { flex: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderColor: 'transparent' },
  picked: { borderColor: colors.text, borderWidth: 2 },
  dayNumber: { color: colors.text, fontFamily: fonts.regular, fontSize: 13, fontVariant: ['tabular-nums'] },
  detail: { color: colors.text, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', marginTop: spacing.xs },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  key: { width: 12, height: 12, borderRadius: radius.md, marginLeft: spacing.sm },
  legendText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
