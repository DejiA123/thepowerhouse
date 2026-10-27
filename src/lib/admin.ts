/**
 * Church admins (administrators and pastors, see is_admin in the database):
 * who they are, and the activity record in plain words for Me → Admin.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { bibleBooks } from '@/components/bible/BibleBookList';

const cache = new Map<string, boolean>();

/** Whether the signed-in person is a church admin (null while checking) */
export function useIsAdmin(): boolean | null {
  const { user } = useAuth();
  const [admin, setAdmin] = useState<boolean | null>(() => (user ? cache.get(user.id) ?? null : false));
  useEffect(() => {
    if (!user) {
      setAdmin(false);
      return;
    }
    if (cache.has(user.id)) {
      setAdmin(cache.get(user.id)!);
      return;
    }
    supabase.rpc('is_admin', { _user_id: user.id }).then(({ data, error }) => {
      const yes = !error && data === true;
      cache.set(user.id, yes);
      setAdmin(yes);
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return admin;
}

export interface ActivityRow {
  id: number;
  event: string;
  area: string | null;
  path: string | null;
  detail: Record<string, unknown> | null;
  device: string | null;
  created_at: string;
}

const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
const bookName = (apiName: unknown) =>
  allBooks.find((b) => b.apiName === String(apiName).toLowerCase())?.name ?? String(apiName ?? '');

/** One line of a member's timeline ("Read John 3 (NIV)") */
export function describe(row: ActivityRow): string {
  const d = row.detail ?? {};
  const passage = `${bookName(d.book)} ${d.chapter ?? ''}`.trim() + (d.translation ? ` (${d.translation})` : '');
  switch (row.event) {
    case 'open': return 'Opened the app';
    case 'page': return `Opened ${row.area ?? 'a page'}`;
    case 'bible_read': return `Read ${passage}`;
    case 'bible_listen': return `Listened to ${passage}`;
    case 'message_sent': return `Sent a message in ${d.chat ?? 'a chat'}`;
    case 'prayer_posted': return 'Posted a prayer request';
    case 'prayed': return 'Prayed for a prayer request';
    case 'video_watched': return d.live ? 'Watched the live service' : `Watched “${d.title ?? 'a video'}”`;
    case 'notification_opened': return `Opened ${row.area ?? 'the app'} from a notification`;
    case 'feedback': return `Sent feedback ${d.rating === 'up' ? '👍' : d.rating === 'down' ? '👎' : ''}`.trim();
    case 'sign_in': return 'Signed in';
    case 'sign_out': return 'Signed out';
    default: return row.event;
  }
}

/** "Today", "Yesterday", or "Mon 26 Oct" */
export const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
};

/** "Active now", "10 min ago", "2 h ago", "Yesterday", "5 days ago" */
export const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 5) return 'Active now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
};

/** The database tables aren't set up yet (the migration hasn't been applied) */
export const notSetUp = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST202' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message ?? ''));
