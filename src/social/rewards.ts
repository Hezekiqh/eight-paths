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
 * Once a launch, after the intro: if friends joined with this player's code,
 * say so and wake a random locked hero for each. The unlock plays the usual
 * cocoon hatch through the reveal queue.
 */
export function useInviteRewards() {
  const status = useSocial((s) => s.status);
  const introDone = useSession((s) => s.introDone);
  const collection = useCollection();
  const giftCharacters = useGameStore((s) => s.giftCharacters);
  const checked = useRef(false);

  useEffect(() => {
    if (status !== 'ready' || !introDone || checked.current) return;
    checked.current = true;
    collectInviteRewards().then((friends) => {
      if (friends.length === 0) return;
      const locked = collection.entries.filter((e) => !e.unlocked).map((e) => e.companion.id);
      const gifts = pickGifts(locked, friends.length);
      const who = friends.map((f) => `@${f}`).join(', ');
      haptics.celebrate();
      Alert.alert(
        friends.length === 1 ? 'A friend answered your call' : `${friends.length} friends answered your call`,
        gifts.length > 0
          ? `${who} joined the Second 100. ${gifts.length === 1 ? 'Someone is' : 'Some are'} waking up…`
          : `${who} joined the Second 100. Every hero is already awake. Thank you for bringing them.`,
        [{ text: gifts.length > 0 ? 'Wake them' : 'OK', onPress: () => gifts.length && giftCharacters(gifts) }],
      );
    });
    // Runs once a launch; the collection read is a snapshot at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, introDone]);
}
