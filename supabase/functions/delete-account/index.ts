// Deletes the signed-in player's account: their Sign in with Apple token is
// revoked with Apple (App Store guideline 5.1.1(v)), then the auth user is
// deleted, which cascades to their profile, collection, friendships and blocks.
//
// Deploy: supabase functions deploy delete-account
// Secrets (Apple Developer → Keys → a "Sign in with Apple" key):
//   supabase secrets set APPLE_TEAM_ID=... APPLE_KEY_ID=... APPLE_CLIENT_ID=com.hezekiahhopkins.eightpaths
//   supabase secrets set APPLE_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)"
// Without them the account is still deleted; only the Apple revoke is skipped.

import { createClient } from 'npm:@supabase/supabase-js@2';

const APPLE = 'https://appleid.apple.com';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** A short-lived client secret for Apple's REST API: a JWT signed with the .p8 key. */
async function appleClientSecret(teamId: string, keyId: string, clientId: string, pem: string) {
  const der = Uint8Array.from(
    atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const b64 = (data: Uint8Array | string) =>
    btoa(typeof data === 'string' ? data : String.fromCharCode(...data))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const body = b64(JSON.stringify({ iss: teamId, iat: now, exp: now + 300, aud: APPLE, sub: clientId }));
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${head}.${body}`)),
  );
  return `${head}.${body}.${b64(sig)}`;
}

/** Exchanges a fresh authorization code for a refresh token and revokes it. */
async function revokeApple(authorizationCode: string) {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const clientId = Deno.env.get('APPLE_CLIENT_ID');
  const pem = Deno.env.get('APPLE_PRIVATE_KEY');
  if (!teamId || !keyId || !clientId || !pem) return 'skipped';
  const secret = await appleClientSecret(teamId, keyId, clientId, pem);
  const tokenRes = await fetch(`${APPLE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json();
  const token = tokens.refresh_token ?? tokens.access_token;
  if (!token) return 'no_token';
  await fetch(`${APPLE}/auth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, token, token_type_hint: 'refresh_token' }),
  });
  return 'revoked';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'not_signed_in' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data, error } = await asUser.auth.getUser();
  if (error || !data.user) return json({ error: 'not_signed_in' }, 401);

  const { authorizationCode } = await req.json().catch(() => ({}));
  let apple = 'skipped';
  if (typeof authorizationCode === 'string' && authorizationCode) {
    try {
      apple = await revokeApple(authorizationCode);
    } catch {
      apple = 'failed';
    }
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return json({ error: 'delete_failed' }, 500);
  return json({ deleted: true, apple });
});
