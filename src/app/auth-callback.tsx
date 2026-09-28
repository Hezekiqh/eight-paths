import { Redirect } from 'expo-router';

/**
 * Where Google sign-in returns. The in-app browser normally catches this link
 * itself; if the system opens it instead, just go back to Friends.
 */
export default function AuthCallback() {
  return <Redirect href="/social" />;
}
