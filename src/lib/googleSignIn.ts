/**
 * "Continue with Google" straight through Google's own sign-in page.
 *
 * The usual way (supabase.auth.signInWithOAuth) goes via the sign-in server,
 * so Google's page says "to continue to swjzhzmhqyvwfwevijja.supabase.co".
 * Here Google sends people straight back to this app with a signed ID token
 * (the page shows the app's own address), and the server checks the token and
 * starts the session. A full-page visit like the usual way, so it works the
 * same in the iPhone Home Screen app.
 *
 * Needs the church's own Google sign-in client: its ID below, this app's
 * /google-sign-in address added to that client's "Authorized redirect URIs",
 * and the same client set as the Google provider ("Your own credentials").
 * Without an ID, sign-in uses the usual way.
 */
import { supabase } from '@/integrations/supabase/client';

/** The church's Google sign-in client ID (public: it's in every sign-in link) */
export const GOOGLE_CLIENT_ID = '';
export const GOOGLE_RETURN_PATH = '/google-sign-in';
const PENDING_KEY = 'google_signin_pending_v1';
const MAX_AGE_MS = 30 * 60 * 1000;

export const googleDirectSignIn = () => GOOGLE_CLIENT_ID !== '';

const randomText = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const sha256Hex = async (text: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};

/** Leaves for Google's sign-in page (it comes back to /google-sign-in). */
export async function startGoogleSignIn() {
  // The server checks the token was asked for here: Google gets the nonce's
  // hash, the server gets the nonce itself
  const nonce = randomText();
  const state = randomText();
  localStorage.setItem(PENDING_KEY, JSON.stringify({ nonce, state, at: Date.now() }));
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}${GOOGLE_RETURN_PATH}`,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce: await sha256Hex(nonce),
    state,
    // Let people pick which Google account (or add another) every time
    prompt: 'select_account',
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export interface GoogleSignInResult {
  ok: boolean;
  /** Why not (when not ok) */
  reason?: 'cancelled' | 'expired' | 'failed';
  message?: string;
}

/** Back from Google: turns its ID token into a session. */
export async function finishGoogleSignIn(): Promise<GoogleSignInResult> {
  const params = new URLSearchParams(window.location.hash.slice(1));
  // Don't leave the token in the address bar or history
  window.history.replaceState(null, '', window.location.pathname);

  let pending: { nonce: string; state: string; at: number } | null = null;
  try {
    pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* nothing pending */
  }

  const error = params.get('error');
  if (error) return { ok: false, reason: error === 'access_denied' ? 'cancelled' : 'failed', message: error };
  const token = params.get('id_token');
  if (!token || !pending || pending.state !== params.get('state') || Date.now() - pending.at > MAX_AGE_MS) {
    return { ok: false, reason: 'expired' };
  }
  const { error: signInError } = await supabase.auth.signInWithIdToken({ provider: 'google', token, nonce: pending.nonce });
  return signInError ? { ok: false, reason: 'failed', message: signInError.message } : { ok: true };
}
