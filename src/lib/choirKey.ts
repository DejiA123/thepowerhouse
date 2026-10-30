/**
 * The National choir's passcode. The database checks it (choir_unlock, and
 * choir_can_edit on every change), so it's never written in the app. Once
 * unlocked, it goes with database requests as x-choir-key until the choir
 * page is locked again or the tab is closed. Branch choirs don't need it.
 */
import { supabase } from '@/integrations/supabase/client';

const KEY = 'choir_admin_key';
const restHeaders = () => (supabase as unknown as { rest: { headers: Headers } }).rest.headers;

const saved = (): string | null => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

const apply = (passcode: string | null) => {
  try {
    if (passcode) sessionStorage.setItem(KEY, passcode);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode: still works until the page reloads */
  }
  if (passcode) restHeaders().set('x-choir-key', passcode);
  else restHeaders().delete('x-choir-key');
};

// Unlocked earlier in this tab: keep sending it
const earlier = saved();
if (earlier) restHeaders().set('x-choir-key', earlier);

/** Unlocked in this tab */
export const choirUnlocked = () => !!saved();

/** Check the passcode with the database; if it's right, use it from now on. */
export async function unlockChoir(location: string, passcode: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('choir_unlock' as never, { _location: location, _passcode: passcode } as never);
  if (error) throw error;
  const ok = data === true;
  if (ok) apply(passcode);
  return ok;
}

export const lockChoir = () => apply(null);
