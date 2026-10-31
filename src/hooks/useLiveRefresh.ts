import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { uniqueTopic } from '@/lib/realtime';

/** A table, optionally narrowed ("location=eq.galway") */
export type LiveTable = string | { table: string; filter?: string };

/**
 * Keep a screen live. `refresh` runs (once for a burst of changes) when any of
 * these tables changes, and also whenever the app comes back on screen, comes
 * back online or reconnects (a Home Screen app's connection can sleep without
 * anyone noticing), plus every `pollMs` while on screen as a last resort.
 *
 * The tables must be in the realtime publication (see the *_realtime migrations).
 * `refresh` should update quietly (no loading spinner over what's on screen).
 */
export function useLiveRefresh(
  tables: LiveTable[],
  refresh: () => unknown,
  { pollMs = 60_000, enabled = true }: { pollMs?: number; enabled?: boolean } = {},
) {
  const latest = useRef(refresh);
  latest.current = refresh;
  const key = JSON.stringify(tables);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      clearTimeout(timer);
      timer = setTimeout(() => latest.current(), 300);
    };

    const list = (JSON.parse(key) as LiveTable[]).map((t) => (typeof t === 'string' ? { table: t, filter: undefined } : t));
    // No tables (busy ones like app_activity aren't sent live): catching up and polling only
    let channel: RealtimeChannel | null = null;
    if (list.length) {
      let ch = supabase.channel(uniqueTopic(`live:${list.map((t) => t.table).join(',')}`));
      for (const { table, filter } of list) {
        ch = ch.on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, run);
        // Deletes can't be narrowed down: hear them all
        if (filter) ch = ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, run);
      }
      let joinedBefore = false;
      ch.subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        if (joinedBefore) run(); // back after a dropped connection: catch up
        joinedBefore = true;
      });
      channel = ch;
    }

    const onVisible = () => document.visibilityState === 'visible' && run();
    const poll = pollMs ? setInterval(() => document.visibilityState === 'visible' && run(), pollMs) : undefined;
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    window.addEventListener('online', run);
    window.addEventListener('app:resync', run);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      window.removeEventListener('online', run);
      window.removeEventListener('app:resync', run);
      if (channel) supabase.removeChannel(channel);
    };
  }, [key, pollMs, enabled]);
}
