/**
 * Where to send someone after they sign in or register. Kept in the URL
 * (/auth?next=…) and in storage, so it survives the email-confirmation link
 * and Google sign-in, which leave the app and come back.
 */
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
