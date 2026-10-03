import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, spacing } from '@/theme';

type Props = PropsWithChildren<{
  /** Which step of how many, when onboarding has more than one. */
  step?: { at: number; of: number };
  title: string;
  subtitle?: string;
  footer: ReactNode;
}>;

export function OnboardingStep({ step, title, subtitle, footer, children }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step && (
            <Text style={styles.step}>
              STEP {step.at} OF {step.of}
            </Text>
          )}
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <View style={styles.body}>{children}</View>
        </ScrollView>
        <View style={styles.footer}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.xxl + spacing.lg, gap: spacing.sm },
  step: { color: colors.accent, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 39, fontFamily: fonts.bold },
  subtitle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  body: { marginTop: spacing.lg, gap: spacing.md },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
});
