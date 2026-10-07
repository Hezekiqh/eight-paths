import type { PropsWithChildren, ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, spacing } from '@/theme';

/** Every tab opens on its name, in the same place and size (see ScreenTitle). */
type Props = PropsWithChildren<{
  title?: string;
  action?: ReactNode;
  scrollRef?: Ref<ScrollView>;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}>;

export function Screen({ title, action, scrollRef, onScroll, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={styles.content}>
        {(title || action) && <ScreenTitle title={title} action={action} />}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** A tab's name at its top, with an optional button on the right; also used by screens that draw their own scroll. */
export function ScreenTitle({ title, action }: { title?: string; action?: ReactNode }) {
  return (
    <View style={[styles.titleRow, !title && styles.actionOnly]}>
      {title && (
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  // The same height with or without a button, so titles sit level from tab to tab.
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  actionOnly: { justifyContent: 'flex-end' },
  title: { flex: 1, color: colors.text, fontSize: 36, fontFamily: fonts.bold },
});
