import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActivityCalendar } from '@/components/activity-calendar';
import { PlayerCard } from '@/components/player-card';
import { ProgressStrip } from '@/components/progress-strip';
import { RegulatorRow } from '@/components/regulator-row';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { Segmented } from '@/components/segmented';
import { BarChart } from '@/components/stats/bar-chart';
import { Highlight } from '@/components/stats/highlight';
import { PathBars } from '@/components/stats/path-bars';
import { CLASSES, MAX_REST_TOKENS, WEEKDAY_NAMES, type Stats, type StatsPeriod } from '@/game';
import { socialEnabled } from '@/social/config';
import { useStanding } from '@/social/use-standing';
import { useClassInfo, usePlayer, useProgressSummary, useStats, useToday } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import { useTourScroller, useTourTarget } from '@/tutorial/tour';

const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

/** "this week", and the period it's compared with. */
const NOW: Record<StatsPeriod, string> = { week: 'this week', month: 'the last 30 days', year: 'the last year' };
const BEFORE: Record<StatsPeriod, string> = { week: 'last week', month: 'the 30 days before', year: 'the year before' };
const TIMELINE: Record<StatsPeriod, string> = {
  week: 'Each day of the last 7',
  month: 'The last 30 days, 6 days at a time',
  year: 'Each month of the last year',
};

const pct = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);
const pts = (change: number) => `${change > 0 ? '+' : ''}${Math.round(change * 100)} pts`;

/**
 * The Stats tab: first you (name, level, XP, and Health Points with the
 * Dopamine Regulator on), your consistency, the Regulator and your settings;
 * then how reliably you keep what you schedule, for a week, a month
 * or a year. First the overall rate, then what's worth pointing out (most
 * improved, most consistent, needs tending), then the same rate over time, by
 * Path and by weekday, a few patterns in words, and the calendar.
 */
export default function StatsScreen() {
  const today = useToday();
  const classInfo = useClassInfo();
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const s = useStats(period, today);
  const player = usePlayer();
  const summary = useProgressSummary(today);
  const standing = useStanding();
  const scroller = useTourScroller();
  const summaryRef = useTourTarget('journey', scroller);
  const regulatorRef = useTourTarget('regulator', scroller);

  if (!classInfo || !player) return null;
  const color = classInfo.color;
  const { current, change } = s.overall;

  return (
    <Screen scrollRef={scroller.ref} onScroll={scroller.onScroll}>
      <PlayerCard today={today} />
      <View style={styles.extras}>
        <View
          style={styles.tokens}
          accessible
          accessibilityLabel={`${player.restTokens} of ${MAX_REST_TOKENS} rest days`}>
          {Array.from({ length: MAX_REST_TOKENS }, (_, i) => (
            <SymbolView
              key={i}
              name={i < player.restTokens ? 'moon.stars.fill' : 'moon.stars'}
              tintColor={i < player.restTokens ? color : colors.textFaint}
              size={18}
            />
          ))}
          <Text style={styles.tokenText}>
            {player.restTokens} rest {player.restTokens === 1 ? 'day' : 'days'}
          </Text>
        </View>
        {standing && (
          <Text style={[styles.rank, { color }]}>{standing.rank ? `Rank #${standing.rank}` : 'Rank 100+'}</Text>
        )}
      </View>

      <ProgressStrip summary={summary} color={color} />

      <View ref={regulatorRef} collapsable={false}>
        <RegulatorRow today={today} />
      </View>

      <View style={styles.list}>
        {socialEnabled && (
          <>
            <SettingsRow
              icon="users"
              iconColor={color}
              title="Friends · The Second 100"
              subtitle="Share your heroes, never your habits"
              onPress={() => router.push('/social')}
            />
            <View style={styles.divider} />
          </>
        )}
        <SettingsRow
          icon="gamepad"
          iconColor={color}
          title="Settings"
          subtitle="Themes, controls, reminders and more, in the Other World menu"
          onPress={() => router.navigate({ pathname: '/world', params: { tab: 'settings' } })}
        />
      </View>

      <Text style={styles.section}>YOUR HABITS</Text>
      <Segmented options={PERIODS} value={period} onChange={setPeriod} color={color} />

      <View ref={summaryRef} collapsable={false} style={styles.card}>
        <Text style={styles.label}>HABITS KEPT · {NOW[period].toUpperCase()}</Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.big, { color }]}>{pct(current.rate)}</Text>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLine}>
              {current.due > 0 ? `${current.done} of ${current.due} done` : 'Nothing was due yet'}
            </Text>
            {change !== null && (
              <Text style={[styles.change, change > 0 ? styles.up : change < 0 ? styles.down : null]}>
                {change === 0 ? `Same as ${BEFORE[period]}` : `${pts(change)} vs ${BEFORE[period]}`}
              </Text>
            )}
          </View>
        </View>
      </View>

      <Text style={styles.section}>HIGHLIGHTS</Text>
      <Highlights s={s} />

      <Text style={styles.section}>OVER TIME</Text>
      <View style={styles.card}>
        <BarChart bars={s.timeline} color={color} />
        <Text style={styles.caption}>{TIMELINE[period]} · share of what was due that got done</Text>
      </View>

      <Text style={styles.section}>BY PATH</Text>
      <View style={styles.card}>
        <PathBars paths={s.paths} />
        <Text style={styles.caption}>▲▼ points since {BEFORE[period]}</Text>
      </View>

      <Text style={styles.section}>PATTERNS</Text>
      <View style={styles.card}>
        {period !== 'week' && (
          <>
            <Text style={styles.label}>BY WEEKDAY</Text>
            <BarChart bars={s.weekdays} color={color} height={80} highlight={s.bestDay?.label ?? null} />
          </>
        )}
        <Patterns s={s} />
      </View>

      <Text style={styles.section}>CALENDAR</Text>
      <ActivityCalendar today={today} color={color} />
    </Screen>
  );
}

function Highlights({ s }: { s: Stats }) {
  const p = s.period;
  return (
    <View style={styles.highlights}>
      <Highlight
        title="MOST IMPROVED"
        icon="arrow.up.right"
        dimension={s.mostImproved?.dimension ?? null}
        figure={s.mostImproved?.change ? pts(s.mostImproved.change) : undefined}
        detail={
          s.mostImproved
            ? `${pct(s.mostImproved.previous.rate)} ${BEFORE[p]}, ${pct(s.mostImproved.current.rate)} ${NOW[p]}.`
            : `Nothing has climbed since ${BEFORE[p]} yet. Keep showing up and it will.`
        }
      />
      <Highlight
        title="MOST CONSISTENT"
        icon="checkmark.seal.fill"
        dimension={s.mostConsistent?.dimension ?? null}
        figure={s.mostConsistent ? pct(s.mostConsistent.current.rate) : undefined}
        detail={
          s.mostConsistent
            ? `${s.mostConsistent.current.done} of ${s.mostConsistent.current.due} kept ${NOW[p]}. Your steadiest Path.`
            : 'A few days of habits, and your steadiest Path shows up here.'
        }
      />
      <Highlight
        title="NEEDS TENDING"
        icon="leaf.fill"
        dimension={s.needsTending?.dimension ?? null}
        figure={s.needsTending ? pct(s.needsTending.current.rate) : undefined}
        detail={
          s.needsTending
            ? `Kept ${pct(s.needsTending.current.rate)} of the time. One small habit here goes a long way.`
            : 'Nothing is falling behind. Every Path you keep is holding up.'
        }
      />
    </View>
  );
}

/** A few plain sentences about how the period went: when, what, and what's slipping. */
function Patterns({ s }: { s: Stats }) {
  const lines: string[] = [];
  if (s.bestDay?.rate != null) {
    const name = WEEKDAY_NAMES[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(s.bestDay.label)];
    lines.push(`${name} is your strongest day: ${pct(s.bestDay.rate)} kept.`);
  }
  const timed = s.timeOfDay.reduce((n, t) => n + t.count, 0);
  const peak = [...s.timeOfDay].sort((a, b) => b.count - a.count)[0];
  if (timed >= 3 && peak.count > 0) {
    lines.push(`You do most habits in the ${peak.label.toLowerCase()} (${Math.round((peak.count / timed) * 100)}%).`);
  }
  if (s.questsDone > 0) lines.push(`${s.questsDone} ${s.questsDone === 1 ? 'habit' : 'habits'} done ${NOW[s.period]}.`);
  if (s.slipping) lines.push(`"${s.slipping.quest.title}" is slipping: ${pct(s.slipping.rate)} kept.`);

  return (
    <View style={styles.patterns}>
      {lines.length === 0 && <Text style={styles.patternLine}>Patterns show up after a few days of habits.</Text>}
      {lines.map((l) => (
        <Text key={l} style={styles.patternLine}>
          • {l}
        </Text>
      ))}
      {s.topHabits.length > 0 && (
        <View style={styles.top}>
          <Text style={styles.label}>BEST KEPT</Text>
          {s.topHabits.map((h) => (
            <View key={h.quest.id} style={styles.habit}>
              <View style={[styles.dot, { backgroundColor: CLASSES[h.quest.dimension].color }]} />
              <Text style={styles.habitTitle} numberOfLines={1}>
                {h.quest.title}
              </Text>
              <Text style={styles.habitRate}>{pct(h.rate)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  extras: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  tokens: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tokenText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, marginLeft: spacing.xs },
  rank: { fontFamily: fonts.bold, fontSize: 18, fontVariant: ['tabular-nums'] },
  list: { ...windowStyle, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 56 },
  card: { ...windowStyle, padding: spacing.lg, gap: spacing.md },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  big: { fontFamily: fonts.bold, fontSize: 52, fontVariant: ['tabular-nums'] },
  summaryText: { flex: 1, gap: 4 },
  summaryLine: { color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
  change: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14 },
  up: { color: '#2F7D32' },
  down: { color: colors.danger },
  section: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1.2, marginTop: spacing.sm },
  highlights: { gap: spacing.sm },
  caption: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center' },
  patterns: { gap: spacing.sm },
  patternLine: { color: colors.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  top: { gap: spacing.sm, marginTop: spacing.xs },
  habit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  habitTitle: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 },
  habitRate: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, fontVariant: ['tabular-nums'] },
});
