import type { ErrorBoundaryProps } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { colors, fonts, spacing } from '@/theme';

/**
 * Shown instead of a blank screen when a screen throws. Progress is saved
 * on every change, so "Try again" re-renders from the saved game.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <SymbolView name="exclamationmark.shield.fill" tintColor={colors.grid} size={48} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.text}>
          Your progress is saved on this device and hasn&apos;t been lost. Try again, and if this keeps
          happening, restart the app.
        </Text>
        {__DEV__ && <Text style={styles.detail}>{error.message}</Text>}
      </View>
      <View style={styles.footer}>
        <Button title="Try again" onPress={retry} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  title: { color: colors.text, fontSize: 31, fontFamily: fonts.bold, textAlign: 'center' },
  text: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  detail: { color: colors.textFaint, fontSize: 12, fontFamily: 'Menlo', textAlign: 'center' },
  footer: { padding: spacing.xl },
});
