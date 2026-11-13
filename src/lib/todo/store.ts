import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { newNoteId } from '@/lib/offlineNotes';
import { localDay, nextOccurrence, setPersonalBuffer } from './brain';
import { eventsOf, logEvent, subscribeEvents } from './events';
import { paceOf } from './insights';
import { TODO_COLUMNS, type Todo } from './types';

/**
 * To do works offline, like Notes: the phone keeps the whole list (`todos_v1_<user>`),
 * every change is made there first and queued (`todos_queue_v1_<user>`, the latest
 * change per task), then sent. Sent on every change, when the connection comes back,
 * when the app comes back on screen and every 30 s while anything waits. Changes on
 * another phone arrive live (realtime on todos).
 */

type Op = { op: 'upsert' | 'delete'; at: number };

const LIST = (u: string) => `todos_v1_${u}`;
const QUEUE = (u: string) => `todos_queue_v1_${u}`;
const FOCUS = (u: string) => `todo_focus_days_v1_${u}`;
/** Done tasks are kept this long (for the Done list and the streak) */
const KEEP_DONE_DAYS = 60;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full: the server copy still has it */
  }
};

const lists = new Map<string, Todo[]>();
const listeners = new Set<(user: string) => void>();
const flushing = new Map<string, Promise<void>>();
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>();

const getList = (u: string) => lists.get(u) ?? (lists.set(u, read<Todo[]>(LIST(u), [])), lists.get(u)!);
const queueOf = (u: string) => read<Record<string, Op>>(QUEUE(u), {});

function setList(u: string, list: Todo[]) {
  const queue = queueOf(u);
  const marked = list.map((t) => ({ ...t, pending: !!queue[t.id] }));
  lists.set(u, marked);
  write(LIST(u), marked);
  listeners.forEach((l) => l(u));
}

function enqueue(u: string, id: string, op: Op['op']) {
  const queue = queueOf(u);
  queue[id] = { op, at: Date.now() };
  write(QUEUE(u), queue);
  clearTimeout(flushTimers.get(u));
  flushTimers.set(u, setTimeout(() => void flushTodos(u), 250));
}

/** The row as the server takes it (never the reminder marks) */
function row(t: Todo) {
  const out: Record<string, unknown> = {};
  for (const c of TODO_COLUMNS) out[c] = t[c as keyof Todo] ?? null;
  out.steps = t.steps ?? [];
  out.important = !!t.important;
  out.due_all_day = !!t.due_all_day;
  out.snoozes = t.snoozes ?? 0;
  out.focus_min = Math.round(t.focus_min ?? 0);
  return out;
}

const missingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message ?? ''));

/** Send what's waiting on this phone (one send at a time per person) */
export function flushTodos(u: string): Promise<void> {
  const running = flushing.get(u);
  if (running) return running;
  // The marker is cleared after the send settles, never inside it: a send with nothing to
  // do finishes at once, and clearing inside it ran before the marker was even set, so it
  // stuck and nothing was ever sent again
  const job: Promise<void> = sendQueued(u).then((ok) => {
    if (flushing.get(u) === job) flushing.delete(u);
    // Changed again while it was sending: send that too
    if (ok && Object.keys(queueOf(u)).length) setTimeout(() => void flushTodos(u), 300);
  });
  flushing.set(u, job);
  return job;
}

/** true: everything it tried went through */
async function sendQueued(u: string): Promise<boolean> {
  try {
    const queue = queueOf(u);
    const ids = Object.keys(queue);
    if (!ids.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) return false;
    const list = getList(u);
    for (const id of ids) {
      const entry = queue[id];
      let error: { code?: string; message?: string } | null = null;
      if (entry.op === 'delete') {
        ({ error } = await supabase.from('todos' as never).delete().eq('id', id));
      } else {
        const t = list.find((x) => x.id === id);
        if (t) ({ error } = await supabase.from('todos' as never).upsert(row(t) as never, { onConflict: 'id' }));
      }
      if (error) {
        if (!missingTable(error)) console.warn('[todo] not sent yet', error.message);
        return false; // keep it (and the rest) for next time
      }
      // Done, unless it was changed again meanwhile
      const now = queueOf(u);
      if (now[id]?.at === entry.at) {
        delete now[id];
        write(QUEUE(u), now);
      }
    }
    setList(u, getList(u));
    return true;
  } catch (e) {
    console.warn('[todo] sync failed', e);
    return false;
  }
}

/** The account's tasks, with anything still waiting on this phone laid over them */
export async function loadTodos(u: string): Promise<void> {
  await flushTodos(u);
  const since = new Date(Date.now() - KEEP_DONE_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('todos' as never)
    .select('*')
    .eq('user_id', u)
    .or(`status.eq.open,done_at.gte.${since}`)
    .order('created_at', { ascending: true })
    .limit(1000);
  if (error) return; // offline, or before the database update: the phone's copy stands
  const queue = queueOf(u);
  const local = new Map(getList(u).map((t) => [t.id, t]));
  const server = ((data ?? []) as unknown as Todo[]).map((t) => ({ ...t, steps: Array.isArray(t.steps) ? t.steps : [] }));
  const merged: Todo[] = [];
  const seen = new Set<string>();
  for (const t of server) {
    seen.add(t.id);
    if (queue[t.id]?.op === 'delete') continue;
    merged.push(queue[t.id] && local.has(t.id) ? local.get(t.id)! : t);
  }
  // Made on this phone and not sent yet
  for (const t of local.values()) if (!seen.has(t.id) && queue[t.id]?.op === 'upsert') merged.push(t);
  setList(u, merged);
}

/** Start-by dates follow your own pace once the app has seen it (insights.ts `paceOf`) */
const paced = new Set<string>();
function applyPace(u: string) {
  paced.add(u);
  setPersonalBuffer(paceOf(eventsOf(u)).buffer);
}

/** The phone's copy, without loading or listening (a card elsewhere in the app) */
export const peekTodos = (u: string): Todo[] => {
  if (!paced.has(u)) applyPace(u);
  return getList(u);
};

// ── Changes ─────────────────────────────────────────────────────────
export function addTodo(u: string, fields: Partial<Todo> & { title: string }): Todo {
  const t: Todo = {
    id: newNoteId(),
    user_id: u,
    notes: null,
    steps: [],
    why: null,
    important: false,
    today_on: null,
    plan_at: null,
    due_at: null,
    due_all_day: false,
    estimate_min: null,
    repeat: null,
    status: 'open',
    done_at: null,
    snoozes: 0,
    focus_min: 0,
    created_at: new Date().toISOString(),
    ...fields,
    title: fields.title.trim().slice(0, 300),
  };
  enqueue(u, t.id, 'upsert');
  setList(u, [...getList(u), t]);
  if (t.plan_at) logEvent(u, t.id, 'planned', { for: t.plan_at });
  return t;
}

/** What "Is it working?" needs to know about a change: planned, or put off */
function noteChange(u: string, before: Todo, after: Todo) {
  const now = Date.now();
  // "Not now": just before the new plan, so the plan it replaced counts as put off
  if ((after.snoozes ?? 0) > (before.snoozes ?? 0)) {
    logEvent(u, after.id, 'snoozed', { from: before.plan_at, to: after.plan_at, due: after.due_at }, new Date(now - 1));
  }
  if ((after.plan_at ?? null) !== (before.plan_at ?? null) && after.status === 'open') {
    logEvent(u, after.id, 'planned', { for: after.plan_at ?? null });
  }
}

export function updateTodo(u: string, id: string, patch: Partial<Todo>) {
  const list = getList(u);
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return;
  const next = [...list];
  next[i] = { ...list[i], ...patch };
  if (patch.title !== undefined) next[i].title = (patch.title.trim() || list[i].title).slice(0, 300);
  enqueue(u, id, 'upsert');
  setList(u, next);
  noteChange(u, list[i], next[i]);
}

export function deleteTodo(u: string, id: string) {
  const t = getList(u).find((x) => x.id === id);
  enqueue(u, id, 'delete');
  setList(u, getList(u).filter((x) => x.id !== id));
  if (t?.status === 'open') logEvent(u, id, 'dropped', { how: 'delete' });
}

/** How it was finished: the focus screen, the list, the task, a fresh start */
export type DoneVia = 'focus' | 'list' | 'sheet' | 'fresh';

/** Done: a repeating task comes round again as a new one */
export function completeTodo(u: string, id: string, via: DoneVia = 'list'): Todo | null {
  const t = getList(u).find((x) => x.id === id);
  if (!t) return null;
  const now = new Date();
  logEvent(u, id, 'done', {
    due: t.due_at,
    all_day: !!t.due_all_day,
    plan: t.plan_at,
    via,
    estimate: t.estimate_min ?? null,
    focus_min: Math.round(t.focus_min ?? 0),
  }, now);
  updateTodo(u, id, { status: 'done', done_at: now.toISOString(), steps: t.steps.map((s) => ({ ...s, done: true })) });
  const again = nextOccurrence(t, now);
  if (!again) return null;
  const { id: _old, created_at: _c, pending: _p, ...rest } = again;
  return addTodo(u, rest);
}

export function reopenTodo(u: string, id: string) {
  updateTodo(u, id, { status: 'open', done_at: null });
}

// ── Focus minutes (the streak counts days with 5+ minutes) ──────────
export const focusDaysOf = (u: string) => read<Record<string, number>>(FOCUS(u), {});

export function logFocus(u: string, id: string, minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (!m) return;
  const days = focusDaysOf(u);
  const today = localDay(new Date());
  days[today] = (days[today] ?? 0) + m;
  // Keep the last 90 days
  const keep = Object.keys(days).sort().slice(-90);
  write(FOCUS(u), Object.fromEntries(keep.map((k) => [k, days[k]])));
  const t = getList(u).find((x) => x.id === id);
  if (t) updateTodo(u, id, { focus_min: (t.focus_min ?? 0) + m });
  else listeners.forEach((l) => l(u));
}

// ── Settings (the morning plan) ─────────────────────────────────────
export interface TodoSettings {
  morning_brief: boolean;
  brief_time: string;
}

/** Make sure the server knows this person's time zone (for the morning plan's times) */
export async function ensureTodoSettings(u: string): Promise<TodoSettings | null> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const { data, error } = await supabase.from('todo_settings' as never).select('morning_brief, brief_time, tz').eq('user_id', u).maybeSingle();
  if (error) return null;
  const found = data as unknown as (TodoSettings & { tz: string }) | null;
  if (!found) {
    // Made once (two screens asking at the same moment make it once too)
    await supabase.from('todo_settings' as never).upsert({ user_id: u, tz } as never, { onConflict: 'user_id', ignoreDuplicates: true });
    return { morning_brief: true, brief_time: '08:00' };
  }
  if (found.tz !== tz) await supabase.from('todo_settings' as never).update({ tz } as never).eq('user_id', u);
  return { morning_brief: found.morning_brief, brief_time: String(found.brief_time).slice(0, 5) };
}

export async function saveTodoSettings(u: string, s: TodoSettings): Promise<boolean> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const { error } = await supabase.from('todo_settings' as never).upsert({ user_id: u, tz, ...s } as never, { onConflict: 'user_id' });
  return !error;
}

// ── The hook ────────────────────────────────────────────────────────
export function useTodos() {
  const { user } = useAuth();
  const u = user?.id ?? '';
  const [todos, setTodos] = useState<Todo[]>(() => (u ? getList(u) : []));
  const [focusDays, setFocusDays] = useState<Record<string, number>>(() => (u ? focusDaysOf(u) : {}));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!u) return;
    applyPace(u);
    const offPace = subscribeEvents((who) => {
      if (who !== u) return;
      applyPace(u);
      setTodos([...getList(u)]);
    });
    setTodos(getList(u));
    setFocusDays(focusDaysOf(u));
    const on = (who: string) => {
      if (who !== u) return;
      setTodos(getList(u));
      setFocusDays(focusDaysOf(u));
    };
    listeners.add(on);
    void loadTodos(u).finally(() => setLoaded(true));
    return () => {
      listeners.delete(on);
      offPace();
    };
  }, [u]);

  const refresh = useCallback(() => (u ? loadTodos(u) : Promise.resolve()), [u]);
  // Other phones' changes, coming back on screen or online, and a poll while anything waits
  useLiveRefresh(u ? [{ table: 'todos', filter: `user_id=eq.${u}` }] : [], refresh, { enabled: !!u, pollMs: 60_000 });
  useEffect(() => {
    if (!u) return;
    const flush = () => void flushTodos(u);
    window.addEventListener('online', flush);
    const timer = setInterval(() => Object.keys(queueOf(u)).length && flush(), 30_000);
    return () => {
      window.removeEventListener('online', flush);
      clearInterval(timer);
    };
  }, [u]);

  return {
    userId: u,
    todos,
    focusDays,
    loaded,
    refresh,
    add: (fields: Partial<Todo> & { title: string }) => addTodo(u, fields),
    update: (id: string, patch: Partial<Todo>) => updateTodo(u, id, patch),
    remove: (id: string) => deleteTodo(u, id),
    complete: (id: string, via?: DoneVia) => completeTodo(u, id, via),
    reopen: (id: string) => reopenTodo(u, id),
    logFocus: (id: string, minutes: number) => logFocus(u, id, minutes),
  };
}
