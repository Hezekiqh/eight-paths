import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, spacing } from '@/theme';

/** Tab screens leave out `title`; the tab bar already names them. */
type Props = PropsWithChildren<{ title?: string; action?: ReactNode }>;

export function Screen({ title, action, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {(title || action) && (
          <View style={[styles.titleRow, !title && styles.actionOnly]}>
            {title && <Text style={styles.title}>{title}</Text>}
            {action}
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  actionOnly: { justifyContent: 'flex-end', marginBottom: 0 },
  title: { color: colors.text, fontSize: 42, fontFamily: fonts.bold },
});
