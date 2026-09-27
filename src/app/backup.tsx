import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { useGameStore } from '@/store';
import { useClassInfo } from '@/store/hooks';
import { colors, radius, spacing } from '@/theme';

/** Paste a backup made with "Back up progress" to restore it on this phone. */
export default function RestoreBackup() {
  const importSave = useGameStore((s) => s.importSave);
  const hasProgress = useGameStore((s) => s.player !== null);
  const color = useClassInfo()?.color ?? colors.grid;
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const restore = () => {
    const result = importSave(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.dismissAll();
    router.replace('/');
  };

  const confirm = () => {
    if (!hasProgress) return restore();
    Alert.alert('Replace your progress?', "Everything on this phone will be replaced by the backup. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: restore },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <ModalHeader
        title="Restore backup"
        actionLabel="Restore"
        onAction={confirm}
        actionDisabled={text.trim().length === 0}
        color={color}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.note}>
          Open the backup you saved (in Notes, Files or an email), copy all of it, and paste it below.
        </Text>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            setError(null);
          }}
          placeholder="Paste your backup here"
          placeholderTextColor={colors.textFaint}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={styles.input}
        />
        {error && (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },
  note: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  input: {
    minHeight: 180,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 13,
    fontFamily: 'Menlo',
    padding: spacing.lg,
    textAlignVertical: 'top',
  },
  error: { backgroundColor: colors.cardRaised, borderRadius: radius.md, padding: spacing.md },
  errorText: { color: '#FF6B81', fontSize: 14 },
});
