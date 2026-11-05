import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * One-to-one chats show the other person's profile photo (like WhatsApp), not
 * the chat's own picture (empty for them, so only initials showed). Looked up
 * once for many chats, kept in memory and on the phone so it shows instantly.
 */
export interface ChatPeer {
  id: string;
  avatar: string | null;
}

const KEY = 'chat_peers_v1';
const memory = new Map<string, ChatPeer>();
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, ChatPeer>;
  Object.entries(saved).forEach(([chat, peer]) => memory.set(chat, peer));
} catch {
  /* private window */
}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch {
    /* full or private */
  }
};

const EVENT = 'chat-peers:changed';
let asked = new Map<string, number>();

/** Fetch the other person of these private chats (each at most once a minute) */
export async function loadChatPeers(myId: string, chatIds: string[]) {
  const now = Date.now();
  const want = [...new Set(chatIds)].filter((id) => now - (asked.get(id) ?? 0) > 60_000);
  if (!want.length) return;
  want.forEach((id) => asked.set(id, now));
  const { data, error } = await supabase
    .from('chat_participants')
    .select('chat_id, user_id, user:user_id ( avatar_url )')
    .in('chat_id', want)
    .neq('user_id', myId);
  if (error) {
    want.forEach((id) => asked.delete(id));
    return;
  }
  let changed = false;
  for (const row of (data || []) as unknown as { chat_id: string; user_id: string; user: { avatar_url: string | null } | null }[]) {
    const next = { id: row.user_id, avatar: row.user?.avatar_url || null };
    const prev = memory.get(row.chat_id);
    if (!prev || prev.id !== next.id || prev.avatar !== next.avatar) {
      memory.set(row.chat_id, next);
      changed = true;
    }
  }
  if (changed) {
    save();
    window.dispatchEvent(new Event(EVENT));
  }
}

export const chatPeer = (chatId: string) => memory.get(chatId) ?? null;

/** Forget what was asked (e.g. someone changed their photo): the next look asks again */
export function refreshChatPeers() {
  asked = new Map();
}

/** The other person of each of these private chats (re-renders when photos arrive) */
export function useChatPeers(myId: string | undefined, privateChatIds: string[]) {
  const [, setTick] = useState(0);
  const key = privateChatIds.join(',');
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  useEffect(() => {
    if (myId && key) loadChatPeers(myId, key.split(',')).catch(() => undefined);
  }, [myId, key]);
  return chatPeer;
}
