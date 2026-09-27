import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Segmented } from '@/components/segmented';
import { DIMENSIONS, type ClassInfo, type Dimension, type RadarFilter } from '@/game';
import { useDimensionStats, useRadar } from '@/store/hooks';
import { colors, fonts, spacing } from '@/theme';

import { RadarChart } from './radar-chart';

const FILTERS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All-time' },
] as const;

const CAPTIONS: Record<RadarFilter, string> = {
  week: 'Last 7 days · dashed line is the 7 days before',
  month: 'Last 30 days · dashed line is the 30 days before',
  all: 'How your party leans across all time',
};

type Props = { today: string; classInfo: ClassInfo };

export function RadarCard({ today, classInfo }: Props) {
  const [filter, setFilter] = useState<RadarFilter>('week');
  const radar = useRadar(filter, today);
  const stats = useDimensionStats(today);
  const { width } = useWindowDimensions();
  const size = Math.min(width - spacing.lg * 2, 380);

  const opacity = Object.fromEntries(stats.map((s) => [s.dimension, s.opacity])) as Record<Dimension, number>;
  const windowXp = DIMENSIONS.reduce((sum, d) => sum + radar.xp[d], 0);

  return (
    <View style={styles.card}>
      <Segmented options={FILTERS} value={filter} onChange={setFilter} color={classInfo.color} />
      <View style={styles.chart}>
        <RadarChart
          size={size}
          color={classInfo.color}
          current={radar.current}
          ghost={radar.ghost}
          opacity={opacity}
        />
      </View>
      <Text style={styles.caption}>
        {CAPTIONS[filter]}
        {filter !== 'all' ? ` · ${windowXp} XP earned` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  chart: { alignItems: 'center' },
  caption: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },
});
