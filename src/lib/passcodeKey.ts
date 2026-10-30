/**
 * A passcode the database checks (never written in the app): the National choir,
 * the Follow-up team. Once unlocked, it goes with database requests in a header
 * until it's locked again or the tab is closed, and the database's rules check it
 * on every read or change they guard.
 */
import { supabase } from '@/integrations/supabase/client';

const restHeaders = () => (supabase as unknown as { rest: { headers: Headers } }).rest.headers;

export function passcodeKey({ storageKey, header, check }: {
  storageKey: string;
  header: string;
  /** Asks the database whether this is the passcode */
  check: (passcode: string) => Promise<boolean>;
}) {
  const saved = (): string | null => {
    try {
      return sessionStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const apply = (passcode: string | null) => {
    try {
      if (passcode) sessionStorage.setItem(storageKey, passcode);
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* private mode: still works until the page reloads */
    }
    if (passcode) restHeaders().set(header, passcode);
    else restHeaders().delete(header);
  };

  // Unlocked earlier in this tab: keep sending it
  const earlier = saved();
  if (earlier) restHeaders().set(header, earlier);

  return {
    unlocked: () => !!saved(),
    /** Check the passcode with the database; if it's right, use it from now on. */
    unlock: async (passcode: string) => {
      const ok = await check(passcode);
      if (ok) apply(passcode);
      return ok;
    },
    lock: () => apply(null),
  };
}

/** Calls a database function that answers true or false */
export async function rpcYes(name: string, args: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw error;
  return data === true;
}
