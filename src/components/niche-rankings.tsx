import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CHARACTER_ART } from '@/art/sprites';
import { showDialog } from '@/components/dialog';
import { PixelSprite } from '@/components/pixel-sprite';
import { haptics } from '@/haptics';
import { BOARDS, BOARD_BY_ID, rankBoard, type Board, type RankedPlayer } from '@/social/rankings';
import { useRankings } from '@/social/rankings-store';
import { isCharacterId } from '@/story/companions';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/** How many players each ranking shows (plus you, if you're further down). */
const TOP = 5;

function Face({ id }: { id: string | null }) {
  if (!id || !isCharacterId(id) || !CHARACTER_ART[id]) return null;
  return <PixelSprite sheet={CHARACTER_ART[id].idle} scale={1} animate={false} />;
}

/** One followed ranking: its top players, and you. Hold it to stop following. */
function RankingCard({
  board,
  players,
  meId,
  color,
}: {
  board: Board;
  players: RankedPlayer[];
  meId: string;
  color: string;
}) {
  const unfollow = useRankings((s) => s.unfollow);
  const rows = rankBoard(board, players, meId);
  const mine = rows.findIndex((r) => r.player.userId === meId);
  const shown = rows.slice(0, TOP).map((r, i) => ({ ...r, rank: i + 1 }));
  if (mine >= TOP) shown.push({ ...rows[mine], rank: mine + 1 });

  const remove = () => {
    haptics.tap();
    showDialog(`Stop following ${board.title}?`, 'You can add it back any time from Add a ranking.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => unfollow(board.id) },
    ]);
  };

  return (
    <Pressable
      onLongPress={remove}
      accessibilityActions={[{ name: 'remove', label: 'Stop following' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'remove' && remove()}
      style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{board.title}</Text>
        {mine >= 0 && <Text style={[styles.myRank, { color }]}>You: #{mine + 1}</Text>}
      </View>
      <Text style={styles.blurb}>{board.blurb}</Text>
      {shown.map(({ player, score, face, rank }, i) => {
        const isMe = player.userId === meId;
        return (
          <View
            key={player.userId}
            accessible
            accessibilityLabel={`${rank}. ${player.username}${isMe ? ', you' : ''}, ${board.unit(score)}`}
            style={[styles.row, isMe && { backgroundColor: colors.cardRaised }, i > 0 && rank > shown[i - 1].rank + 1 && styles.gap]}>
            <Text style={[styles.rank, rank <= 3 && { color }]}>{rank}</Text>
            <View style={styles.sprite}>
              <Face id={face} />
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {player.username}
              {isMe ? ' (you)' : ''}
            </Text>
            <Text style={[styles.score, { color }]}>{board.unit(score)}</Text>
          </View>
        );
      })}
    </Pressable>
  );
}

/**
 * Niche rankings on the Social tab: the ones this player follows, each held
 * to remove, and a list of the rest to add.
 */
export function NicheRankings({
  players,
  meId,
  color,
}: {
  /** Everyone to rank (you, the server's players and the rivals), or null while loading. */
  players: RankedPlayer[] | null;
  meId: string;
  color: string;
}) {
  const followed = useRankings((s) => s.followed);
  const follow = useRankings((s) => s.follow);
  const [picking, setPicking] = useState(false);
  const others = BOARDS.filter((b) => !followed.includes(b.id));

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>NICHE RANKINGS</Text>
      <Text style={styles.hint}>Follow the rankings you want to compete in. Hold one to remove it.</Text>
      {players === null ? (
        <ActivityIndicator color={color} />
      ) : (
        followed.map((id) => <RankingCard key={id} board={BOARD_BY_ID[id]} players={players} meId={meId} color={color} />)
      )}

      {others.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: picking }}
          onPress={() => {
            haptics.tap();
            setPicking((p) => !p);
          }}
          style={({ pressed }) => [styles.add, { borderColor: color }, pressed && { backgroundColor: colors.cardRaised }]}>
          <Text style={[styles.addText, { color }]}>{picking ? 'Done adding' : '+ Add a ranking'}</Text>
        </Pressable>
      )}
      {picking && (
        <View style={styles.picker}>
          {others.map((b) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`Follow ${b.title}. ${b.blurb}`}
              onPress={() => {
                haptics.select();
                follow(b.id);
              }}
              style={({ pressed }) => [styles.chip, pressed && { backgroundColor: colors.cardRaised }]}>
              <Text style={styles.chipTitle}>{b.title}</Text>
              <Text style={styles.chipBlurb}>{b.blurb}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.lg },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1.5 },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  card: { ...windowStyle, paddingVertical: spacing.sm, marginTop: spacing.xs },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
  },
  cardTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  myRank: { fontFamily: fonts.bold, fontSize: 15 },
  blurb: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 2 },
  gap: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, borderStyle: 'dashed' },
  rank: { width: 24, color: colors.textMuted, fontFamily: fonts.bold, fontSize: 17, textAlign: 'center' },
  sprite: { width: 28, height: 40, alignItems: 'center', justifyContent: 'flex-end' },
  name: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  score: { fontFamily: fonts.bold, fontSize: 15, fontVariant: ['tabular-nums'] },
  add: { borderWidth: 2, borderStyle: 'dashed', padding: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  addText: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1 },
  picker: { ...windowStyle },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  chipTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  chipBlurb: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
});
