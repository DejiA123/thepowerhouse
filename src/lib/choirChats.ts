import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { GroupChatService } from '@/services/groupChatService';
import { previewText } from '@/components/messages/chatUtils';

/**
 * The group chat(s) linked to a choir (chat info → Choir), as the choir's page shows
 * them: one tap opens a chat I'm in (with its unread count and latest message), and
 * anyone else can join a community group or ask a private group's admins to add them
 * (`choir_chats` / `ask_to_join_chat`, migration 20261112200000).
 *
 * One shared copy per choir and person (the header's Chat button and the home card
 * load it once), kept on the phone so it shows at once.
 */
export interface ChoirChat {
  id: string;
  name: string;
  avatar_url: string | null;
  /** How many people are in it (null before the database update) */
  members: number | null;
  is_private: boolean;
  is_member: boolean;
  /** My request to join, while it waits for the group's admins */
  asked_at: string | null;
  unread: number;
  marked_unread: boolean;
  last: { text: string; at: string; who?: string } | null;
}

type Row = {
  chat_id: string;
  name: string | null;
  avatar_url: string | null;
  members: number | null;
  is_private: boolean | null;
  is_member: boolean;
  asked_at: string | null;
};

const membersText = (n: number | null) => (n === null ? '' : `${n} ${n === 1 ? 'member' : 'members'}`);

/** "Group · 24 members · Private" */
export const chatFacts = (c: ChoirChat) =>
  ['Group', membersText(c.members), c.is_member ? '' : c.is_private ? 'Private' : 'Community'].filter(Boolean).join(' · ');

const STORE_KEY = (key: string) => `choir_chats_v1_${key}`;
const keyFor = (userId: string | undefined, location: string) => `${userId ?? 'anon'}_${location}`;

const memory = new Map<string, ChoirChat[]>();
const loadedAt = new Map<string, number>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<(key: string) => void>();

function read(key: string): ChoirChat[] | null {
  const kept = memory.get(key);
  if (kept) return kept;
  try {
    const raw = localStorage.getItem(STORE_KEY(key));
    const list = raw ? (JSON.parse(raw) as ChoirChat[]) : null;
    if (Array.isArray(list)) memory.set(key, list);
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

function write(key: string, list: ChoirChat[]) {
  memory.set(key, list);
  try {
    localStorage.setItem(STORE_KEY(key), JSON.stringify(list));
  } catch {
    /* private window */
  }
  listeners.forEach((l) => l(key));
}

/** Change one chat on screen at once (joined, asked), before the server's answer comes back */
function patch(key: string, chatId: string, change: Partial<ChoirChat>) {
  const list = read(key);
  if (!list) return;
  write(key, list.map((c) => (c.id === chatId ? { ...c, ...change } : c)));
}

async function fetchChats(location: string, userId: string | undefined): Promise<ChoirChat[] | null> {
  let rows: Row[];
  const { data, error } = await supabase.rpc('choir_chats' as never, { _location: location } as never);
  if (!error) {
    rows = ((data as unknown as Row[] | null) ?? []).filter((r) => r?.chat_id);
  } else {
    // Before the database update: only the chats I'm in can be seen (as before)
    if (!userId) return [];
    const { data: links, error: linkError } = await supabase.from('choir_chat_links' as never).select('chat_id').eq('location', location);
    if (linkError) return null; // offline: keep what's shown
    rows = ((links ?? []) as { chat_id: string }[]).map((l) => ({
      chat_id: l.chat_id,
      name: null,
      avatar_url: null,
      members: null,
      is_private: true,
      is_member: true,
      asked_at: null,
    }));
  }
  const mineIds = userId ? rows.filter((r) => r.is_member).map((r) => r.chat_id) : [];
  const mine = mineIds.length ? await GroupChatService.getMyChats(mineIds) : [];
  const byId = new Map(mine.map((c) => [c.id, c]));
  return rows.flatMap((r): ChoirChat[] => {
    const c = byId.get(r.chat_id);
    if (r.is_member && !c) return []; // left it, or no longer there
    return [{
      id: r.chat_id,
      name: c?.name || r.name || 'Choir chat',
      avatar_url: c?.avatar_url ?? r.avatar_url ?? null,
      members: r.members,
      is_private: r.is_private ?? true,
      is_member: !!c,
      asked_at: c ? null : r.asked_at,
      unread: c?.unread ?? 0,
      marked_unread: !!c?.marked_unread,
      last: c?.last_message
        ? {
            text: previewText(c.last_message.content, c.last_message.user_id === userId),
            at: c.last_message.created_at,
            who: c.last_message.user_id === userId ? 'You' : c.last_message.sender_name?.split(' ')[0],
          }
        : null,
    }];
  });
}

/** Load (again) the choir's chats; loads already on their way are shared, and quick repeats skipped */
export function refreshChoirChats(location: string, userId: string | undefined, force = false): Promise<void> {
  const key = keyFor(userId, location);
  const running = inflight.get(key);
  if (running) return running;
  if (!force && Date.now() - (loadedAt.get(key) ?? 0) < 2000) return Promise.resolve();
  const job = (async () => {
    try {
      const list = await fetchChats(location, userId);
      if (list) {
        loadedAt.set(key, Date.now());
        write(key, list);
      }
    } catch {
      /* offline: keep what's shown */
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

export type JoinResult = 'member' | 'joined' | 'asked';

/**
 * Join the choir's chat: a community group adds me at once ('joined'); a private group
 * gets a request its admins answer ('asked'), and they're told.
 */
export async function joinChoirChat(location: string, userId: string, chatId: string): Promise<JoinResult> {
  const key = keyFor(userId, location);
  const result = await GroupChatService.askToJoin(chatId);
  if (result === 'asked') patch(key, chatId, { asked_at: new Date().toISOString() });
  else patch(key, chatId, { is_member: true, asked_at: null });
  void refreshChoirChats(location, userId, true);
  return result;
}

/** Take back my request to join */
export async function cancelChoirChatRequest(location: string, userId: string, chatId: string) {
  const key = keyFor(userId, location);
  const { error } = await supabase.from('chat_join_requests' as never).delete().eq('chat_id', chatId).eq('user_id', userId);
  if (error) throw error;
  patch(key, chatId, { asked_at: null });
  void refreshChoirChats(location, userId, true);
}

/**
 * The choir's chats for whoever is signed in (or nobody). `live` keeps them fresh:
 * new messages and reads, being added, a request answered, coming back on screen.
 * Use it once per page (the other users of the same choir share its copy).
 */
export function useChoirChats(location: string | undefined, { live = false }: { live?: boolean } = {}) {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const key = location && !loading ? keyFor(userId, location) : '';
  const [chats, setChats] = useState<ChoirChat[]>(() => (key ? read(key) ?? [] : []));

  useEffect(() => {
    setChats(key ? read(key) ?? [] : []);
    if (!key) return;
    const onChange = (changed: string) => changed === key && setChats(read(key) ?? []);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, [key]);

  const refresh = useCallback(() => (location && !loading ? refreshChoirChats(location, userId) : Promise.resolve()), [location, userId, loading]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // New messages, reads elsewhere, being added to a group, a request answered
  useLiveRefresh(userId ? [{ table: 'chat_join_requests', filter: `user_id=eq.${userId}` }] : [], refresh, {
    pollMs: 30_000,
    enabled: live && !!location && !loading,
  });
  useEffect(() => {
    if (!live) return;
    const again = () => void refresh();
    const now = () => location && void refreshChoirChats(location, userId, true);
    window.addEventListener('chats:changed', now);
    window.addEventListener('chats:read', again);
    window.addEventListener('choir-chat:changed', now);
    return () => {
      window.removeEventListener('chats:changed', now);
      window.removeEventListener('chats:read', again);
      window.removeEventListener('choir-chat:changed', now);
    };
  }, [live, refresh, location, userId]);

  return { chats, signedIn: !!userId, refresh };
}
