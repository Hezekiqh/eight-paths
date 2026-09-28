import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useSocial } from '@/social/store';
import { extractFriendCode } from '@/social/username';

/**
 * Opened from a friend's link (eightpaths://friend/8P-XXXX-XXXX). Saves the
 * code and opens Friends, which adds them now or right after sign-up.
 */
export default function FriendLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  useEffect(() => {
    const clean = extractFriendCode(code ?? '');
    if (clean) useSocial.setState({ pendingFriendCode: clean });
  }, [code]);
  return <Redirect href="/social" />;
}
