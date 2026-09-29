import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { close } from '@/components/modal-header';
import { KEEPER_LINES, lineWeight } from '@/game';
import { resyncRemindersNow } from '@/notifications';
import { EMPTY_STATS } from '@/notifications/stats-rules';
import { useKeeperStats } from '@/notifications/stats-store';
import { useClassInfo } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';

const TEXT = new Map(KEEPER_LINES.map((l) => [l.id, l.text]));

const percent = (n: number, of: number) => (of === 0 ? '—' : `${Math.round((n / of) * 100)}%`);

const when = (at: number) =>
  new Date(at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Development only: how each of the Keeper's lines is doing on this phone,
 * so weak ones can be rewritten, and what's scheduled next.
 */
export default function KeeperStats() {
  const color = useClassInfo()?.color ?? colors.accent;
  const { lines, pending, log } = useKeeperStats();
  const rows = KEEPER_LINES.map((l) => ({ id: l.id, ...(lines[l.id] ?? { sends: 0, opens: 0, conversions: 0 }) }))
    .filter((r) => r.sends > 0 || r.opens > 0)
    .sort((a, b) => lineWeight(b) - lineWeight(a));
  const totals = Object.values(lines).reduce(
    (t, l) => ({ sends: t.sends + l.sends, opens: t.opens + l.opens, conversions: t.conversions + l.conversions }),
    { sends: 0, opens: 0, conversions: 0 },
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.bar}>
        <Text style={styles.title}>The Keeper&apos;s record</Text>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={12}>
          <Text style={[styles.done, { color }]}>Done</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>
          {totals.sends} sent · {totals.opens} opened ({percent(totals.opens, totals.sends)}) · {totals.conversions}{' '}
          followed by a quest within 2 hours ({percent(totals.conversions, totals.sends)}). Better-opened lines are
          picked more often. Only on this phone.
        </Text>

        <Text style={styles.section}>BY LINE</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.id, styles.head]}>LINE</Text>
            <Text style={[styles.cell, styles.head]}>SENT</Text>
            <Text style={[styles.cell, styles.head]}>OPEN</Text>
            <Text style={[styles.cell, styles.head]}>QUEST</Text>
          </View>
          {rows.length === 0 && <Text style={styles.empty}>Nothing sent yet.</Text>}
          {rows.map((r) => (
            <View key={r.id} style={[styles.row, styles.rowLine]}>
              <Text style={styles.id}>{r.id}</Text>
              <Text style={styles.cell}>{r.sends}</Text>
              <Text style={styles.cell}>{percent(r.opens, r.sends)}</Text>
              <Text style={styles.cell}>{percent(r.conversions, r.sends)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>NEXT UP ({pending.length} SCHEDULED)</Text>
        <View style={styles.table}>
          {pending.length === 0 && <Text style={styles.empty}>Nothing scheduled.</Text>}
          {pending.slice(0, 12).map((p, i) => (
            <View key={`${p.at}-${p.lineId}`} style={[styles.call, i > 0 && styles.rowLine]}>
              <Text style={styles.meta}>
                {when(p.at)} · {p.lineId}
              </Text>
              <Text style={styles.line}>{p.body ?? TEXT.get(p.lineId)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>LAST SENT</Text>
        <View style={styles.table}>
          {log.length === 0 && <Text style={styles.empty}>Nothing sent yet.</Text>}
          {log
            .slice(-8)
            .reverse()
            .map((c, i) => (
              <Text key={`${c.at}-${c.lineId}`} style={[styles.meta, styles.call, i > 0 && styles.rowLine]}>
                {when(c.at)} · {c.lineId}
                {c.opened ? ' · opened' : ''}
                {c.converted ? ' · quest' : ''}
              </Text>
            ))}
        </View>

        <Button title="Re-plan now" color={color} onPress={() => resyncRemindersNow()} />
        <Button
          title="Reset the record"
          variant="ghost"
          color={color}
          onPress={() => useKeeperStats.setState({ ...EMPTY_STATS, pending })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 22 },
  done: { fontFamily: fonts.bold, fontSize: 22 },
  content: { padding: spacing.xl, gap: spacing.lg },
  body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1 },
  table: { ...windowStyle, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  head: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14 },
  id: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  cell: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15, textAlign: 'right' },
  call: { paddingVertical: spacing.sm, gap: 2 },
  meta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  line: { color: colors.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  empty: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 14, paddingVertical: spacing.sm },
});
