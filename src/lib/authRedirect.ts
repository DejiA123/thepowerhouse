/**
 * Where to send someone after they sign in or register. Kept in the URL
 * (/auth?next=…) and in storage, so it survives the email-confirmation link
 * and Google sign-in, which leave the app and come back.
 */
/**
 * A page of this app as a full address, for links in sign-up and password
 * emails. Uses the address the app is open on (the church's app address
 * for everyone), so the links always come back to the same app.
 */
export const appUrl = (path: string) => `${window.location.origin}${path}`;

const NEXT_KEY = 'auth_next_v1';
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

const safePath = (path?: string | null) =>
  path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/auth') ? path : null;

export function rememberNext(path: string) {
  const next = safePath(path);
  if (!next) return;
  try {
    localStorage.setItem(NEXT_KEY, JSON.stringify({ path: next, at: Date.now() }));
  } catch {
    /* private mode */
  }
}

/** The page to return to (and forget it), or "/" */
export function takeNext(fromUrl?: string | null): string {
  let stored: string | null = null;
  try {
    const raw = JSON.parse(localStorage.getItem(NEXT_KEY) || 'null');
    if (raw && Date.now() - raw.at < MAX_AGE_MS) stored = raw.path;
    localStorage.removeItem(NEXT_KEY);
  } catch {
    /* ignore */
  }
  return safePath(fromUrl) || safePath(stored) || '/';
}

export function peekNext(fromUrl?: string | null): string {
  if (safePath(fromUrl)) return fromUrl!;
  try {
    const raw = JSON.parse(localStorage.getItem(NEXT_KEY) || 'null');
    if (raw && Date.now() - raw.at < MAX_AGE_MS && safePath(raw.path)) return raw.path;
  } catch {
    /* ignore */
  }
  return '/';
}

/** Link to the sign-in page that comes back to `next` afterwards. */
export function authUrl(next: string, mode: 'signin' | 'signup' = 'signin') {
  rememberNext(next);
  const params = new URLSearchParams({ next });
  if (mode === 'signup') params.set('mode', 'signup');
  return `/auth?${params}`;
}

const STARTED_KEY = 'auth_started_v1';
/** Which sign-in someone just started, so a failure on return names the right one */
export function markAuthStart(kind: 'google' | 'email') {
  try {
    localStorage.setItem(STARTED_KEY, JSON.stringify({ kind, at: Date.now() }));
  } catch {
    /* storage blocked */
  }
}
/** 'google' or 'email' if one was started in the last day, else null */
export function lastAuthStart(): 'google' | 'email' | null {
  try {
    const v = JSON.parse(localStorage.getItem(STARTED_KEY) || 'null');
    return v && Date.now() - v.at < 86_400_000 && (v.kind === 'google' || v.kind === 'email') ? v.kind : null;
  } catch {
    return null;
  }
}
