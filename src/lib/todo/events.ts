import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { newNoteId } from '@/lib/offlineNotes';

/**
 * What actually happens with your tasks, for "Is it working?" (lib/todo/insights.ts):
 * planned, started, focused, put off, stuck (and why), done, let go. Kept on the phone first
 * (`todo_events_v1_<user>`, the last 90 days) and sent to your account in the background
 * (`todo_events`, migration 20261113120000: only you can read them, never changed), so it
 * works offline and follows you to another phone.
 */
export type EventKind = 'planned' | 'started' | 'focused' | 'snoozed' | 'stuck' | 'done' | 'dropped';

export interface TodoEvent {
  id: string;
  todo_id: string | null;
  kind: EventKind;
  at: string;
  data: Record<string, unknown>;
}

const LIST = (u: string) => `todo_events_v1_${u}`;
const QUEUE = (u: string) => `todo_events_queue_v1_${u}`;
const KEEP_DAYS = 90;
const MAX = 3000;

const read = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full: the account's copy has it once sent */
  }
};

const listeners = new Set<(u: string) => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const flushing = new Map<string, Promise<void>>();

const trim = (list: TodoEvent[]) => {
  const from = Date.now() - KEEP_DAYS * 86_400_000;
  return list.filter((e) => Date.parse(e.at) >= from).sort((a, b) => a.at.localeCompare(b.at)).slice(-MAX);
};

export const eventsOf = (u: string): TodoEvent[] => read<TodoEvent[]>(LIST(u), []);

/** Told whenever someone's events change (this phone, or loaded from the account) */
export function subscribeEvents(fn: (u: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Note something that happened (sent to the account soon after) */
export function logEvent(u: string, todoId: string | null, kind: EventKind, data: Record<string, unknown> = {}, at: Date = new Date()) {
  if (!u) return;
  const e: TodoEvent = { id: newNoteId(), todo_id: todoId, kind, at: at.toISOString(), data };
  write(LIST(u), trim([...eventsOf(u), e]));
  write(QUEUE(u), [...read<string[]>(QUEUE(u), []), e.id]);
  listeners.forEach((l) => l(u));
  clearTimeout(timers.get(u));
  timers.set(u, setTimeout(() => void flushEvents(u), 800));
}

/** The last time this kind of thing happened for this task */
export const lastEvent = (u: string, todoId: string, kind: EventKind) =>
  [...eventsOf(u)].reverse().find((e) => e.todo_id === todoId && e.kind === kind) ?? null;

export function flushEvents(u: string): Promise<void> {
  const running = flushing.get(u);
  if (running) return running;
  const job: Promise<void> = (async () => {
    const queued = read<string[]>(QUEUE(u), []);
    if (!queued.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    const byId = new Map(eventsOf(u).map((e) => [e.id, e]));
    const rows = queued.map((id) => byId.get(id)).filter(Boolean).map((e) => ({ ...e!, user_id: u }));
    if (rows.length) {
      const { error } = await supabase.from('todo_events' as never).upsert(rows as never, { onConflict: 'id', ignoreDuplicates: true });
      if (error) return; // offline or before the database update: they wait here
    }
    const sent = new Set(queued);
    write(QUEUE(u), read<string[]>(QUEUE(u), []).filter((id) => !sent.has(id)));
  })()
    .catch(() => undefined)
    .then(() => {
      if (flushing.get(u) === job) flushing.delete(u);
    });
  flushing.set(u, job);
  return job;
}

/** The account's events (from your other phones too), merged with this phone's */
export async function loadEvents(u: string): Promise<void> {
  await flushEvents(u);
  const from = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('todo_events' as never)
    .select('id, todo_id, kind, at, data')
    .eq('user_id', u)
    .gte('at', from)
    .order('at', { ascending: false }) // the newest, if there are ever more than MAX
    .limit(MAX);
  if (error) return;
  void tidy(u);
  const merged = new Map(eventsOf(u).map((e) => [e.id, e]));
  for (const e of (data ?? []) as unknown as TodoEvent[]) merged.set(e.id, e);
  write(LIST(u), trim([...merged.values()]));
  listeners.forEach((l) => l(u));
}

/** Once a day: the account's events older than 120 days go (nothing reads them) */
async function tidy(u: string) {
  const key = `todo_events_tidy_${u}`;
  const today = new Date().toDateString();
  try {
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
  } catch {
    return;
  }
  const before = new Date(Date.now() - 120 * 86_400_000).toISOString();
  await supabase.from('todo_events' as never).delete().eq('user_id', u).lt('at', before);
}

/** "Clear my history": from this phone and the account (the tasks stay) */
export async function clearEvents(u: string): Promise<boolean> {
  const { error } = await supabase.from('todo_events' as never).delete().eq('user_id', u);
  if (error && !/does not exist|schema cache/i.test(error.message ?? '')) return false;
  write(LIST(u), []);
  write(QUEUE(u), []);
  listeners.forEach((l) => l(u));
  return true;
}

export function useTodoEvents() {
  const { user } = useAuth();
  const u = user?.id ?? '';
  const [events, setEvents] = useState<TodoEvent[]>(() => (u ? eventsOf(u) : []));
  useEffect(() => {
    if (!u) return;
    setEvents(eventsOf(u));
    const on = (who: string) => who === u && setEvents(eventsOf(u));
    listeners.add(on);
    void loadEvents(u);
    const flush = () => void flushEvents(u);
    window.addEventListener('online', flush);
    return () => {
      listeners.delete(on);
      window.removeEventListener('online', flush);
    };
  }, [u]);
  return events;
}
