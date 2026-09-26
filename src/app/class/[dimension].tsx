import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ClassLore } from '@/components/class-lore';
import { CLASSES, DIMENSIONS, type Dimension } from '@/game';
import { colors, spacing } from '@/theme';

function isDimension(value: unknown): value is Dimension {
  return typeof value === 'string' && (DIMENSIONS as readonly string[]).includes(value);
}

export default function ClassSheet() {
  const { dimension } = useLocalSearchParams<{ dimension: string }>();
  if (!isDimension(dimension)) return null;
  return (
    <View style={styles.sheet}>
      <ClassLore info={CLASSES[dimension]} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.card, padding: spacing.xl, paddingBottom: spacing.xxl },
});
