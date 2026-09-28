import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useSocial } from '@/social/store';

/**
 * Opened from a friend's link (eightpaths://friend/8P-XXXX-XXXX). Saves the
 * code and opens Friends, which adds them now or right after sign-up.
 */
export default function FriendLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  useEffect(() => {
    if (code) useSocial.setState({ pendingFriendCode: code.toUpperCase() });
  }, [code]);
  return <Redirect href="/social" />;
}
