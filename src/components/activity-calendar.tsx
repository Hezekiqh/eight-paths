import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/haptics';
import { monthOf, shiftMonth } from '@/game';
import { useCalendar } from '@/store/hooks';
import type { CalendarDay } from '@/store/selectors';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** How brightly a day glows: dark when nothing was done, full colour at 4+. */
function glow(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 0.35;
  if (count <= 3) return 0.65;
  return 1;
}

/** Two hex digits of alpha for `opacity`, appended to a #RRGGBB colour. */
const alpha = (opacity: number) =>
  Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');

function Day({ day, today, color }: { day: CalendarDay; today: string; color: string }) {
  const strength = day.outside ? 0 : glow(day.count);
  const bright = strength >= 0.65;
  const label = day.outside
    ? `${day.date}`
    : `${day.date}: ${day.count === 0 ? 'nothing done' : `${day.count} done`}${day.rest ? ', rest day' : ''}`;
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.day,
        { backgroundColor: strength ? `${color}${alpha(strength)}` : day.outside ? 'transparent' : colors.cardRaised },
        day.date === today && styles.today,
      ]}>
      <Text
        style={[
          styles.dayNumber,
          day.outside && styles.dayOutside,
          bright && { color: colors.background },
          day.date === today && !bright && { color: colors.text },
        ]}>
        {day.day}
      </Text>
      {day.rest && (
        <SymbolView
          name="moon.stars.fill"
          tintColor={bright ? colors.background : color}
          size={10}
          style={styles.restMark}
        />
      )}
    </View>
  );
}

/**
 * A month of play as a calendar. Each day glows brighter the more quests were
 * done; days before the journey began or still to come stay dimmed.
 */
export function ActivityCalendar({ today, color }: { today: string; color: string }) {
  const [month, setMonth] = useState(monthOf(today));
  const calendar = useCalendar(month, today);
  const canBack = month > calendar.firstMonth;
  const canForward = month < calendar.currentMonth;

  const go = (delta: number) => {
    haptics.select();
    setMonth((m) => shiftMonth(m, delta));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          accessibilityState={{ disabled: !canBack }}
          disabled={!canBack}
          onPress={() => go(-1)}
          hitSlop={12}>
          <SymbolView name="chevron.left" tintColor={canBack ? colors.gold : colors.border} size={18} weight="bold" />
        </Pressable>
        <Text style={styles.title}>{calendar.title.toUpperCase()}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canForward }}
          disabled={!canForward}
          onPress={() => go(1)}
          hitSlop={12}>
          <SymbolView name="chevron.right" tintColor={canForward ? colors.gold : colors.border} size={18} weight="bold" />
        </Pressable>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      {calendar.weeks.map((week, w) => (
        <View key={w} style={styles.row}>
          {week.map((day, d) =>
            day ? (
              <View key={day.date} style={styles.slot}>
                <Day day={day} today={today} color={color} />
              </View>
            ) : (
              <View key={`pad-${d}`} style={styles.slot} />
            ),
          )}
        </View>
      ))}

      <Text style={styles.summary}>
        {calendar.possible === 0
          ? 'Your journey had not started yet.'
          : `Showed up ${calendar.shownUp} of ${calendar.possible} ${calendar.possible === 1 ? 'day' : 'days'}`}
      </Text>

      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 1, 2, 4].map((count) => (
          <View
            key={count}
            style={[
              styles.legendCell,
              { backgroundColor: count ? `${color}${alpha(glow(count))}` : colors.cardRaised },
            ]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
        <SymbolView name="moon.stars.fill" tintColor={color} size={12} style={styles.legendRest} />
        <Text style={styles.legendText}>Rest day</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...windowStyle, padding: spacing.lg, gap: spacing.xs, marginTop: spacing.sm },
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
  today: { borderWidth: 2, borderColor: colors.frame },
  dayNumber: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 18, fontVariant: ['tabular-nums'] },
  dayOutside: { color: colors.border },
  restMark: { position: 'absolute', top: 2, right: 2 },
  summary: { color: colors.text, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: spacing.xs },
  legendText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
  legendRest: { marginLeft: spacing.sm },
});
