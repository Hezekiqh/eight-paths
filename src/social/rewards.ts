import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { haptics } from '@/haptics';
import { useGameStore } from '@/store';
import { useCollection } from '@/store/hooks';
import { useSession } from '@/store/session';

import { collectInviteRewards } from './api';
import { useSocial } from './store';

/** Picks `count` random characters the player hasn't unlocked yet. */
export function pickGifts<T>(lockedIds: T[], count: number, random = Math.random): T[] {
  const pool = [...lockedIds];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return picked;
}

/**
 * The invite reward: a guaranteed 5★ (Legendary) for each friend who joined.
 * Ones the player doesn't have yet come first (`wake`); once every 5★ is awake,
 * the rest are extra copies of a random 5★ (`copies`), so a reward is never lost.
 */
export function pickFiveStars<T extends string>(
  entries: { id: T; rarity: number; core: boolean; unlocked: boolean }[],
  count: number,
  random = Math.random,
): { wake: T[]; copies: T[] } {
  const five = entries.filter((e) => e.rarity === 5 && !e.core);
  const wake = pickGifts(
    five.filter((e) => !e.unlocked).map((e) => e.id),
    count,
    random,
  );
  const copies: T[] = [];
  while (wake.length + copies.length < count && five.length > 0) copies.push(five[Math.floor(random() * five.length)].id);
  return { wake, copies };
}

/**
 * Once a launch, after the intro: if friends joined with this player's code,
 * say so and wake a 5★ hero for each. The unlock plays the usual cocoon
 * hatch through the reveal queue.
 */
export function useInviteRewards() {
  const status = useSocial((s) => s.status);
  const introDone = useSession((s) => s.introDone);
  const collection = useCollection();
  const giftCharacters = useGameStore((s) => s.giftCharacters);
  const giftCopies = useGameStore((s) => s.giftCopies);
  const checked = useRef(false);

  useEffect(() => {
    if (status !== 'ready' || !introDone || checked.current) return;
    checked.current = true;
    collectInviteRewards().then((friends) => {
      if (friends.length === 0) return;
      const { wake, copies } = pickFiveStars(
        collection.entries.map((e) => ({
          id: e.companion.id,
          rarity: e.companion.rarity,
          core: e.companion.kind === 'core',
          unlocked: e.unlocked,
        })),
        friends.length,
      );
      const who = friends.map((f) => `@${f}`).join(', ');
      haptics.celebrate();
      Alert.alert(
        friends.length === 1 ? 'A friend answered your call' : `${friends.length} friends answered your call`,
        `${who} joined the Second 100. ${friends.length === 1 ? 'A 5★ hero is' : `${friends.length} 5★ heroes are`} waking up…`,
        [
          {
            text: 'Wake them',
            onPress: () => {
              if (wake.length) giftCharacters(wake);
              if (copies.length) giftCopies(copies);
            },
          },
        ],
      );
    });
    // Runs once a launch; the collection read is a snapshot at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, introDone]);
}
