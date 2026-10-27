/**
 * A record of what people do in the app, for the church's admins (Me → Admin
 * → Activity). Actions only, never content: "sent a message in Choir", not
 * what it said. Visitors who aren't signed in are counted, never named.
 *
 * Collected in small batches and sent every few seconds (and when the app is
 * put away); kept on the phone while offline. Deleted after 6 months.
 */
import { supabase } from '@/integrations/supabase/client';
import { installContext, isInstalled } from '@/lib/install';

export type ActivityEvent =
  | 'open'
  | 'page'
  | 'bible_read'
  | 'bible_listen'
  | 'message_sent'
  | 'prayer_posted'
  | 'prayed'
  | 'video_watched'
  | 'notification_opened'
  | 'feedback'
  | 'sign_in'
  | 'sign_out';

interface Row {
  user_id: string | null;
  session_id: string;
  event: ActivityEvent;
  area: string | null;
  path: string;
  detail: Record<string, unknown> | null;
  device: string;
  created_at: string;
}

const QUEUE_KEY = 'activity_queue_v1';
const MAX_QUEUE = 300;
const FLUSH_MS = 15_000;

const backend = supabase as unknown as { supabaseUrl?: string; supabaseKey?: string };
const REST_URL = `${backend.supabaseUrl}/rest/v1/app_activity`;
const ANON_KEY = backend.supabaseKey ?? '';

let userId: string | null = null;
let token: string | null = null;
let started = false;

const sessionId = (() => {
  try {
    let id = sessionStorage.getItem('activity_session');
    if (!id) {
      id = crypto.getRandomValues(new Uint32Array(3)).join('-');
      sessionStorage.setItem('activity_session', id);
    }
    return id;
  } catch {
    return String(Math.random()).slice(2);
  }
})();

/** "iPhone · app", "Android · browser", "Computer · browser" */
export const deviceLabel = () => {
  const c = installContext();
  const ua = navigator.userAgent;
  const kind = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    ? 'iPad'
    : /iPhone|iPod/.test(ua)
      ? 'iPhone'
      : /Android/.test(ua)
        ? 'Android'
        : 'Computer';
  return `${kind} · ${isInstalled() || c.kind === 'installed' ? 'app' : 'browser'}`;
};

/** The part of the app a page belongs to, in the words admins see */
export function areaForPath(pathname: string, search = ''): string {
  const p = pathname.toLowerCase();
  if (p === '/') return 'Home';
  if (p.startsWith('/bible-notes')) return 'Notes';
  if (p.startsWith('/bible-reading-plans') || p.startsWith('/learn')) return 'Learn';
  if (p.startsWith('/bible')) return 'Bible';
  if (p.startsWith('/group-chats')) return 'Messages';
  if (p.startsWith('/groups/choir')) return 'Choir';
  if (/^\/(groups|serve|follow-up-team|team-follow-up|fellowship-group)/.test(p)) return 'Teams';
  if (p.startsWith('/services')) return search.includes('watch=1') ? 'Watch' : 'Find a church';
  if (p.startsWith('/give')) return 'Give';
  if (p.startsWith('/prayer')) return 'Prayer Wall';
  if (p.startsWith('/news')) return 'Events';
  if (p.startsWith('/social-media')) return 'Social media';
  if (p.startsWith('/social')) return 'Friends';
  if (p.startsWith('/settings')) return 'Settings';
  if (p.startsWith('/help')) return 'Help';
  if (p.startsWith('/admin')) return 'Admin';
  if (p.startsWith('/me')) return 'Me';
  if (p.startsWith('/auth')) return 'Sign in';
  if (p.startsWith('/new-here')) return 'New here';
  return 'Church';
}

const readQueue = (): Row[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};
const writeQueue = (rows: Row[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(rows.slice(-MAX_QUEUE)));
  } catch {
    /* storage full: these are dropped */
  }
};

let flushing = false;
/** Sends what's waiting. `leaving`: the app is being put away, so the request must outlive it. */
async function flush(leaving = false) {
  if (flushing || !navigator.onLine) return;
  const rows = readQueue();
  if (!rows.length) return;
  // Rows recorded under another account (signed out since) can't be sent as this one
  const sendable = rows.filter((r) => r.user_id === null || r.user_id === userId);
  const stale = rows.length - sendable.length;
  if (!sendable.length) {
    if (stale) writeQueue([]);
    return;
  }
  flushing = true;
  writeQueue([]);
  try {
    const res = await fetch(REST_URL, {
      method: 'POST',
      keepalive: leaving,
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${token ?? ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(sendable),
    });
    // Not set up yet on the server, or refused: keep nothing (it's only usage)
    if (!res.ok && res.status >= 500) writeQueue([...sendable, ...readQueue()]);
  } catch {
    // No connection: try again later
    writeQueue([...sendable, ...readQueue()]);
  } finally {
    flushing = false;
  }
}

/** Records something a person did (see ActivityEvent). Never pass what they wrote. */
export function track(event: ActivityEvent, detail?: Record<string, unknown>) {
  try {
    const row: Row = {
      user_id: userId,
      session_id: sessionId,
      event,
      area: areaForPath(location.pathname, location.search),
      path: (location.pathname + location.search).slice(0, 300),
      detail: detail ?? null,
      device: deviceLabel(),
      created_at: new Date().toISOString(),
    };
    const queue = readQueue();
    queue.push(row);
    writeQueue(queue);
    if (queue.length >= 20) flush();
  } catch {
    /* never get in the way */
  }
}

const visited: string[] = [];

/** A page was opened */
export const trackPage = () => {
  visited.push(location.pathname + location.search);
  if (visited.length > 5) visited.shift();
  track('page');
};

/** The page someone was on before this one (feedback says where it came from) */
export const pageBefore = () => visited[visited.length - 2] ?? null;

/** Starts recording (once, when the app starts). */
export function startActivity() {
  if (started) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => {
    userId = data.session?.user.id ?? null;
    token = data.session?.access_token ?? null;
    track('open');
  });
  supabase.auth.onAuthStateChange((event, session) => {
    const before = userId;
    userId = session?.user.id ?? null;
    token = session?.access_token ?? null;
    if (event === 'SIGNED_IN' && !before && userId) track('sign_in');
  });
  setInterval(() => flush(), FLUSH_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('online', () => flush());
}

/** Before signing out: record it while still signed in, and send it. */
export async function trackSignOut() {
  track('sign_out');
  await flush();
}
