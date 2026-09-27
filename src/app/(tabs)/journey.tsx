import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { describeChange, formatRate } from '@/components/progress-strip';
import { Screen } from '@/components/screen';
import type { Consistency } from '@/game';
import {
  useClassInfo,
  useHistory,
  useMilestones,
  useMonthComparison,
  useProgressSummary,
  useToday,
} from '@/store/hooks';
import type { HistoryDay } from '@/store/selectors';
import { colors, radius, spacing } from '@/theme';

const WEEKS = 17;
const CELL_GAP = 4;

/** Class colour at an opacity that grows with how much was done that day. */
function cellColor(day: HistoryDay, color: string): string {
  if (day.outside) return 'transparent';
  if (day.count === 0) return colors.cardRaised;
  if (day.count === 1) return `${color}59`;
  if (day.count <= 3) return `${color}A6`;
  return color;
}

function Tile({ label, value, detail }: { label: string; value: string; detail?: string | null }) {
  return (
    <View style={styles.tile}>
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
  const history = useHistory(today, WEEKS);
  const milestones = useMilestones();
  const { width } = useWindowDimensions();

  if (!classInfo) return null;
  const color = classInfo.color;
  const cell = Math.floor((Math.min(width, 440) - spacing.lg * 4 - CELL_GAP * (WEEKS - 1)) / WEEKS);
  const next = milestones.find((m) => !m.reached);

  return (
    <Screen title="Journey">
      <Text style={styles.lede}>
        Every day you show up counts, even the small ones. This is the proof.
      </Text>

      <View style={styles.tiles}>
        <Tile
          label="DAYS SHOWN UP"
          value={String(summary.daysShownUp)}
          detail={summary.nextMilestone ? `Next milestone: ${summary.nextMilestone}` : 'Every milestone reached'}
        />
        <Tile label="SHOWING-UP STREAK" value={`${summary.showUp.current}`} detail={`Best ever: ${summary.showUp.best}`} />
        <Tile
          label="THIS WEEK"
          value={rate(summary.week.current)}
          detail={describeChange(summary.week.current, summary.week.previous, 'week')}
        />
        <Tile
          label="THIS MONTH"
          value={rate(summary.month.current)}
          detail={describeChange(summary.month.current, summary.month.previous, 'month')}
        />
      </View>

      <Text style={styles.section}>LAST {WEEKS} WEEKS</Text>
      <View style={styles.card}>
        <View style={[styles.heatmap, { gap: CELL_GAP }]}>
          {history.map((week) => (
            <View key={week[0].date} style={{ gap: CELL_GAP }}>
              {week.map((day) => (
                <View
                  key={day.date}
                  accessibilityLabel={`${day.date}: ${day.count} completed${day.rest ? ', rest day' : ''}`}
                  style={[
                    { width: cell, height: cell, borderRadius: 3, backgroundColor: cellColor(day, color) },
                    day.rest && { borderWidth: 1.5, borderColor: color },
                    day.date === today && { borderWidth: 1.5, borderColor: colors.text },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendText}>Less</Text>
          {[0, 1, 2, 4].map((count) => (
            <View
              key={count}
              style={[styles.legendCell, { backgroundColor: cellColor({ date: '', count, rest: false, outside: false }, color) }]}
            />
          ))}
          <Text style={styles.legendText}>More</Text>
          <View style={[styles.legendCell, styles.legendRest, { borderColor: color }]} />
          <Text style={styles.legendText}>Rest day</Text>
        </View>
      </View>

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
            <View
              key={m.days}
              style={[styles.badge, m.reached ? { backgroundColor: color } : { borderColor: color, borderWidth: 1.5 }]}>
              <Text style={[styles.badgeText, { color: m.reached ? colors.background : color }]}>{m.days}</Text>
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
  lede: { color: colors.textMuted, fontSize: 15, lineHeight: 21, marginBottom: spacing.md },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 2,
  },
  tileLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  tileValue: { color: colors.text, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tileDetail: { color: colors.textMuted, fontSize: 12 },
  section: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, marginTop: spacing.sm },
  heatmap: { flexDirection: 'row', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  legendText: { color: colors.textMuted, fontSize: 11 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
  legendRest: { borderWidth: 1.5, backgroundColor: colors.cardRaised, marginLeft: spacing.sm },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compareLabel: { flex: 1, color: colors.text, fontSize: 15 },
  compareBefore: { color: colors.textMuted, fontSize: 15, fontVariant: ['tabular-nums'] },
  compareNow: { color: colors.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'right' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { minWidth: 44, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  badgeText: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  badgeCaption: { color: colors.textMuted, fontSize: 13 },
});
