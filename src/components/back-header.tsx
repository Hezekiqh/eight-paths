import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/haptics';
import { colors, fonts, spacing } from '@/theme';

/** "‹ Back" and a title, for screens pushed inside a tab. */
export function BackHeader({ title, back = 'Back', color }: { title: string; back?: string; color: string }) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Back to ${back}`}
        hitSlop={12}
        onPress={() => {
          haptics.tap();
          if (router.canGoBack()) router.back();
          else router.replace('/journey');
        }}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
        <SymbolView name="chevron.left" tintColor={color} size={18} weight="bold" />
        <Text style={[styles.backText, { color }]}>{back}</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: spacing.xs },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.bold, fontSize: 19 },
  title: { color: colors.text, fontSize: 36, fontFamily: fonts.bold },
});
