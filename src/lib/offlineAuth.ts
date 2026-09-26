import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Staying signed in with no connection.
 *
 * Supabase renews the sign-in every hour. Offline, that renewal can't happen:
 * every data request would first spend ~30 seconds retrying it, and the app
 * would then treat the person as signed out. While offline we hand back the
 * saved session instead (requests are answered from the offline cache
 * anyway), and renew it as soon as the connection returns.
 */

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** The session Supabase saved on this device, even if its token has expired. */
export function storedSession(): Session | null {
  try {
    const key = Object.keys(localStorage).find((k) => /^sb-.+-auth-token$/.test(k));
    if (!key) return null;
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    const session = raw?.currentSession ?? raw;
    return session?.user && session?.refresh_token ? (session as Session) : null;
  } catch {
    return null;
  }
}

let installed = false;

export function installOfflineAuth() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const auth = supabase.auth;
  const getSession = auth.getSession.bind(auth);
  auth.getSession = (async () => {
    if (isOffline()) {
      const saved = storedSession();
      if (saved) return { data: { session: saved }, error: null };
    }
    return getSession();
  }) as typeof auth.getSession;

  // Back online: renew right away instead of waiting for the next tick
  window.addEventListener('online', () => {
    auth.startAutoRefresh().catch(() => undefined);
    getSession().catch(() => undefined);
  });
  window.addEventListener('offline', () => {
    // Stop the background renewal loop from spinning while there's no network
    auth.stopAutoRefresh().catch(() => undefined);
  });
  if (isOffline()) auth.stopAutoRefresh().catch(() => undefined);
}

export { isOffline };
