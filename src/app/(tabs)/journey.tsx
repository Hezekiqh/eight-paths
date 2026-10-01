import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ActivityCalendar } from '@/components/activity-calendar';
import { describeChange, formatRate } from '@/components/progress-strip';
import { Screen } from '@/components/screen';
import type { Consistency } from '@/game';
import { useClassInfo, useMilestones, useMonthComparison, useProgressSummary, useToday } from '@/store/hooks';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';
import { useTourTarget } from '@/tutorial/tour';

/** Milestone badges per row, so rows line up as a grid. */
const BADGE_COLUMNS = 7;

type TileProps = { label: string; value: string; detail?: string | null; width: number };

function Tile({ label, value, detail, width }: TileProps) {
  return (
    <View style={[styles.tile, { width }]}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {detail ? <Text style={styles.tileDetail}>{detail}</Text> : null}
    </View>
  );
}

function CompareRow({ label, now, before }: { label: string; now: string; before: string }) {
  return (
    <View style={styles.compareRow}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={styles.compareBefore}>{before}</Text>
      <SymbolView name="arrow.right" tintColor={colors.textFaint} size={12} />
      <Text style={styles.compareNow}>{now}</Text>
    </View>
  );
}

const rate = (c: Consistency) => formatRate(c);

export default function JourneyScreen() {
  const today = useToday();
  const classInfo = useClassInfo();
  const summary = useProgressSummary(today);
  const month = useMonthComparison(today);
  const milestones = useMilestones();
  const { width } = useWindowDimensions();
  const shownUpRef = useTourTarget('journey');

  if (!classInfo) return null;
  const color = classInfo.color;
  // Two tiles a row, sized exactly: flex sizing let long tiles push past the screen edge.
  const tile = Math.floor((width - spacing.lg * 2 - spacing.sm) / 2);
  const next = milestones.find((m) => !m.reached);

  return (
    <Screen>
      <Text style={styles.lede}>* Every day you show up counts, even the small ones. This is the proof.</Text>

      <View ref={shownUpRef} collapsable={false} style={styles.tiles}>
        <Tile
          width={tile}
          label="DAYS SHOWN UP"
          value={String(summary.daysShownUp)}
          detail={summary.nextMilestone ? `Next milestone: ${summary.nextMilestone}` : 'Every milestone reached'}
        />
        <Tile
          width={tile}
          label="STREAK"
          value={`${summary.showUp.current}`}
          detail={`Best ever: ${summary.showUp.best}`}
        />
      </View>
      <View style={styles.tiles}>
        <Tile
          width={tile}
          label="THIS WEEK"
          value={rate(summary.week.current)}
          detail={describeChange(summary.week.current, summary.week.previous, 'week')}
        />
        <Tile
          width={tile}
          label="THIS MONTH"
          value={rate(summary.month.current)}
          detail={describeChange(summary.month.current, summary.month.previous, 'month')}
        />
      </View>

      <Text style={styles.section}>CALENDAR</Text>
      <ActivityCalendar today={today} color={color} />

      <Text style={styles.section}>LAST 30 DAYS VS THE 30 BEFORE</Text>
      <View style={styles.card}>
        <CompareRow label="Days shown up" before={String(month.daysShownUp[1])} now={String(month.daysShownUp[0])} />
        <CompareRow label="Quests done" before={String(month.completions[1])} now={String(month.completions[0])} />
        <CompareRow label="Consistency" before={rate(month.consistency[1])} now={rate(month.consistency[0])} />
      </View>

      <Text style={styles.section}>MILESTONES</Text>
      <View style={styles.card}>
        <View style={styles.badges}>
          {milestones.map((m) => (
            <View key={m.days} style={styles.badgeSlot}>
              <View
                style={[
                  styles.badge,
                  m.reached ? { backgroundColor: color } : { borderColor: color, borderWidth: 1.5 },
                ]}>
                <Text style={[styles.badgeText, { color: m.reached ? colors.background : color }]}>{m.days}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.badgeCaption}>
          {next
            ? `${next.days - summary.daysShownUp} more ${next.days - summary.daysShownUp === 1 ? 'day' : 'days'} of showing up to reach ${next.days}.`
            : 'You have reached every milestone. Legendary.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lede: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, marginBottom: spacing.md },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    ...windowStyle,
    padding: spacing.lg,
    gap: 2,
  },
  tileLabel: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.bold, letterSpacing: 1 },
  tileValue: { color: colors.text, fontSize: 36, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  tileDetail: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  section: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1.2, marginTop: spacing.lg },
  card: { ...windowStyle, padding: spacing.lg, gap: spacing.md, marginTop: spacing.sm },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compareLabel: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 },
  compareBefore: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, fontVariant: ['tabular-nums'] },
  compareNow: {
    color: colors.text,
    fontSize: 20,
    fontFamily: fonts.bold,
    fontVariant: ['tabular-nums'],
    minWidth: 44,
    textAlign: 'right',
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, rowGap: spacing.sm },
  badgeSlot: { width: `${100 / BADGE_COLUMNS}%`, paddingHorizontal: 3 },
  badge: { height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 18, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  badgeCaption: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
});
