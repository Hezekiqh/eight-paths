import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { SettingsRow } from '@/components/settings-row';
import { haptics } from '@/haptics';
import { changeUsername } from '@/social/api';
import { useSocial } from '@/social/store';
import { USERNAME_RULES } from '@/social/username';
import { useGameStore } from '@/store';
import { usePlayer } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/** A settings row that opens in place into a name field, with Save and Cancel. */
function NameRow({
  title,
  subtitle,
  current,
  color,
  hint,
  maxLength,
  capitalize,
  onSave,
}: {
  title: string;
  subtitle: string;
  current: string;
  color: string;
  hint: string;
  maxLength: number;
  capitalize: 'none' | 'words';
  /** Saves the name; throws to show why it can't be used. */
  onSave: (name: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = () => {
    setName(current);
    setError(null);
    setEditing(true);
  };
  const save = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(name);
      haptics.success();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!editing) return <SettingsRow icon="user" iconColor={color} title={title} subtitle={subtitle} onPress={open} />;
  return (
    <View style={styles.editor}>
      <Text style={styles.label}>{title}</Text>
      <TextInput
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        placeholder={current}
        placeholderTextColor={colors.textFaint}
        autoCapitalize={capitalize}
        autoCorrect={false}
        autoFocus
        maxLength={maxLength}
        returnKeyType="done"
        onSubmitEditing={save}
        accessibilityLabel={title}
        style={styles.input}
      />
      <Text style={[styles.hint, error && styles.error]}>{error ?? hint}</Text>
      <Button title={busy ? 'Saving…' : 'Save name'} onPress={save} color={color} disabled={busy || !name.trim()} />
      <Pressable accessibilityRole="button" onPress={() => setEditing(false)} hitSlop={8}>
        <Text style={[styles.hint, styles.cancel]}>Cancel</Text>
      </Pressable>
    </View>
  );
}

/**
 * Change your name in Settings: the name the game calls you by, and (when
 * signed in) your username for friends, with the same rules as choosing one.
 */
export function NameRows({ color, divider }: { color: string; divider: ReactNode }) {
  const player = usePlayer();
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const profile = useSocial((s) => s.profile);
  if (!player) return null;
  return (
    <>
      <NameRow
        title="Your name"
        subtitle={`${player.name} · what the Keeper calls you`}
        current={player.name}
        color={color}
        hint="Shown on Today and used in the story. Only on this phone."
        maxLength={24}
        capitalize="words"
        onSave={setPlayerName}
      />
      {profile && (
        <>
          {divider}
          <NameRow
            title="Username"
            subtitle={`${profile.username} · what friends see`}
            current={profile.username}
            color={color}
            hint={`${USERNAME_RULES} Your founder number and friends stay.`}
            maxLength={16}
            capitalize="none"
            onSave={changeUsername}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  editor: { padding: spacing.md, gap: spacing.sm },
  label: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  input: { ...windowStyle, color: colors.text, fontFamily: fonts.regular, fontSize: 18, padding: spacing.md },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger },
  cancel: { textAlign: 'center', textDecorationLine: 'underline', paddingVertical: spacing.sm },
});
