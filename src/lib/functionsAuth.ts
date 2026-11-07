import { supabase } from '@/integrations/supabase/client';

/**
 * Server functions (song helper, push, social circle…) check who is asking from the
 * sign-in the phone sends. When the Home Screen app wakes up, that sign-in may not have
 * been renewed yet (iPhone pauses the app's timers, and the first renewal can fail while
 * the network wakes), so a signed-in member got "Sign in to compose songs" (Nov 2026).
 *
 * Every function call that comes back 401 therefore renews the sign-in (once more after
 * 1.5 s if the first try fails) and is sent again once with the fresh one. Patched on the
 * functions client's prototype, because `supabase.functions` makes a new client each time.
 */
type InvokeOptions = { headers?: Record<string, string>; [k: string]: unknown };
type Invoke = (name: string, options?: InvokeOptions) => Promise<{ data: unknown; error: unknown }>;

const statusOf = (error: unknown) => (error as { context?: { status?: number } } | null)?.context?.status;

async function freshToken(): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (data.session?.access_token) return data.session.access_token;
      // Signed out, or the renewal itself was refused: nothing to retry with
      if (error && /refresh token|not found|invalid|missing/i.test(error.message)) return null;
    } catch {
      /* the network may still be waking */
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

const proto = Object.getPrototypeOf(supabase.functions) as { invoke: Invoke; __signedIn?: boolean };
if (!proto.__signedIn) {
  proto.__signedIn = true;
  const original = proto.invoke;
  proto.invoke = async function (this: unknown, name: string, options: InvokeOptions = {}) {
    const first = await original.call(this, name, options);
    if (statusOf(first.error) !== 401) return first;
    const token = await freshToken();
    if (!token) return first;
    return original.call(this, name, { ...options, headers: { ...(options.headers ?? {}), Authorization: `Bearer ${token}` } });
  };
}

export {};
