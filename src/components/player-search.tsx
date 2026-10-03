import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { haptics } from '@/haptics';
import { addFriendById, searchPlayers, type FoundPlayer } from '@/social/api';
import { founderLabel } from '@/social/username';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/**
 * Find players by username: type two or more letters and matching players
 * show up (never yourself or anyone blocked), each with an Add button.
 */
export function PlayerSearch({ color }: { color: string }) {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<FoundPlayer[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);

  // Searches a moment after typing stops; a newer search replaces an older one.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let live = true;
    const timer = setTimeout(() => {
      setBusy(true);
      searchPlayers(q)
        .then((rows) => live && (setFound(rows), setError(null)))
        .catch((e: Error) => live && setError(e.message))
        .finally(() => live && setBusy(false));
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);

  const add = (p: FoundPlayer) => {
    haptics.tap();
    addFriendById(p.id)
      .then(() => {
        haptics.success();
        setAdded((a) => [...a, p.id]);
      })
      .catch((e: Error) => setError(e.message));
  };

  // Under two letters, nothing's searched and nothing's shown.
  const shown = query.trim().length >= 2 ? found : null;

  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={(t) => setQuery(t.replace(/[^A-Za-z0-9_]/g, ''))}
        placeholder="Search players by username"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search players by username"
        style={styles.input}
      />
      {busy && shown === null && <ActivityIndicator color={color} />}
      {error && <Text style={[styles.hint, styles.error]}>{error}</Text>}
      {shown && shown.length === 0 && !busy && <Text style={styles.hint}>No one by that name yet.</Text>}
      {shown && shown.length > 0 && (
        <View style={styles.list}>
          {shown.map((p, i) => {
            const friend = p.isFriend || added.includes(p.id);
            return (
              <View key={p.id} style={[styles.row, i === shown.length - 1 && styles.last]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {p.username}
                  </Text>
                  {p.founderNumber !== null && <Text style={styles.hint}>{founderLabel(p.founderNumber)}</Text>}
                </View>
                {friend ? (
                  <Text style={[styles.friend, { color }]}>Friends</Text>
                ) : (
                  <Button title="Add" onPress={() => add(p)} color={color} />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  input: { ...windowStyle, color: colors.text, fontFamily: fonts.regular, fontSize: 18, padding: spacing.md },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  error: { color: colors.danger },
  list: { ...windowStyle },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  last: { borderBottomWidth: 0 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 19 },
  friend: { fontFamily: fonts.bold, fontSize: 16 },
});
