import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { broadcast } from '@/lib/realtime';
import { signalsTopic } from '@/services/groupChatService';

/**
 * Who has seen the cards the app puts into a group chat (group reminders and the choir's
 * "songs added" cards), for the group's admins (migration 20261112090000).
 *
 * The cards aren't messages, so read receipts can't tell: opening a chat marks it read only
 * up to its last message. Each phone therefore records a card when it's really on screen
 * (`useSeenWhenVisible` → `noteCardSeen`): at least half of it (or a good part of the
 * screen, for a tall card) for 0.6 s, with the app in front. Sent in small batches
 * (`mark_chat_cards_seen`), once per card and person (kept on the phone), retried when the
 * phone is back online. The group's admins ask `chat_card_seen` (when each person first saw
 * each card, or read on past it), and a `cards-seen` chat signal tells their open screens.
 */

export type CardKind = 'reminder' | 'song';
export interface CardSeenRow {
  kind: CardKind;
  item_id: string;
  user_id: string;
  seen_at: string;
}

// The functions are new: called loosely until the generated types catch up
const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>)(fn, args);

/** The database doesn't have the functions yet (migration not run): stop asking this visit */
const missing = (e: { code?: string; message?: string } | null) => !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function/i.test(e.message || ''));

// ── Recording ────────────────────────────────────────────────────────
const SENT_KEY = (userId: string) => `card_seen_v1_${userId}`;
const SENT_MAX = 3000;
let sentFor: string | null = null;
let sent = new Set<string>();
let unavailable = false;
const pending = new Map<string, { userId: string; reminders: Set<string>; songs: Set<string> }>();
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function loadSent(userId: string) {
  if (sentFor === userId) return;
  sentFor = userId;
  try {
    sent = new Set(JSON.parse(localStorage.getItem(SENT_KEY(userId)) || '[]'));
  } catch {
    sent = new Set();
  }
}
function saveSent(userId: string) {
  try {
    const list = [...sent];
    localStorage.setItem(SENT_KEY(userId), JSON.stringify(list.slice(-SENT_MAX)));
    if (list.length > SENT_MAX) sent = new Set(list.slice(-SENT_MAX));
  } catch {
    /* private window: the server ignores repeats anyway */
  }
}
const sentId = (chatId: string, kind: CardKind, id: string) => `${chatId}:${kind}:${id}`;

/** A card is on my screen: record it (batched; each card once) */
export function noteCardSeen(chatId: string, userId: string, kind: CardKind, ids: string[]) {
  if (unavailable || !chatId || !userId || !ids.length) return;
  loadSent(userId);
  const fresh = ids.filter((id) => id && !sent.has(sentId(chatId, kind, id)));
  if (!fresh.length) return;
  const entry = pending.get(chatId) ?? { userId, reminders: new Set<string>(), songs: new Set<string>() };
  fresh.forEach((id) => (kind === 'reminder' ? entry.reminders : entry.songs).add(id));
  pending.set(chatId, entry);
  if (!timer) timer = setTimeout(flush, 700);
}

async function flush() {
  timer = null;
  if (flushing || unavailable) return;
  flushing = true;
  try {
    for (const [chatId, entry] of [...pending]) {
      const reminders = [...entry.reminders];
      const songs = [...entry.songs];
      const { data, error } = await rpc('mark_chat_cards_seen', { _chat_id: chatId, _reminders: reminders, _songs: songs });
      if (missing(error)) {
        unavailable = true;
        pending.clear();
        return;
      }
      if (error) continue; // offline or a hiccup: kept, tried again later
      pending.delete(chatId);
      loadSent(entry.userId);
      reminders.forEach((id) => sent.add(sentId(chatId, 'reminder', id)));
      songs.forEach((id) => sent.add(sentId(chatId, 'song', id)));
      saveSent(entry.userId);
      // The group's admins with the chat open see it at once
      if (Number(data) > 0) {
        broadcast(signalsTopic(chatId), 'signal', { type: 'cards-seen', from: entry.userId, payload: { reminders, songs } }).catch(() => undefined);
      }
    }
  } finally {
    flushing = false;
  }
}

if (typeof window !== 'undefined') {
  const retry = () => {
    if (pending.size && !timer && document.visibilityState === 'visible') timer = setTimeout(flush, 500);
  };
  window.addEventListener('online', retry);
  document.addEventListener('visibilitychange', retry);
  setInterval(retry, 30_000);
}

/**
 * Calls `onSeen` once when the element has really been seen: at least half of it, or a
 * good part of the screen for a tall card, in view for 0.6 s with the app in front.
 */
export function useSeenWhenVisible<T extends Element>(onSeen: (() => void) | undefined, key: string) {
  const ref = useRef<T | null>(null);
  const callback = useRef(onSeen);
  callback.current = onSeen;
  const enabled = !!onSeen;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || typeof IntersectionObserver === 'undefined') return;
    let dwell: ReturnType<typeof setTimeout> | null = null;
    let inView = false;
    let done = false;
    const stop = () => {
      if (dwell) clearTimeout(dwell);
      dwell = null;
    };
    const maybeStart = () => {
      if (done || dwell || !inView || document.visibilityState !== 'visible') return;
      dwell = setTimeout(() => {
        dwell = null;
        if (!inView || document.visibilityState !== 'visible') return;
        done = true;
        observer.disconnect();
        callback.current?.();
      }, 600);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        const tall = entry.intersectionRect.height >= Math.min(window.innerHeight * 0.4, 320);
        inView = entry.isIntersecting && (entry.intersectionRatio >= 0.5 || tall);
        if (inView) maybeStart();
        else stop();
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    observer.observe(el);
    const onVisibility = () => (document.visibilityState === 'visible' ? maybeStart() : stop());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, key]);
  return ref;
}

// ── For the group's admins ───────────────────────────────────────────
const MANAGE_KEY = (userId: string, chatId: string) => `chat_can_manage_${userId}_${chatId}`;

/** Remembered answer (so the "Seen by" lines show at once), then the server's */
export function cachedCanManage(userId: string, chatId: string): boolean {
  try {
    return localStorage.getItem(MANAGE_KEY(userId, chatId)) === '1';
  } catch {
    return false;
  }
}

/** Is this person one of the group's admins (or its creator, or a church admin)? */
export async function canManageChat(userId: string, chatId: string): Promise<boolean> {
  const { data, error } = await rpc('can_manage_chat', { _chat_id: chatId });
  if (error) return cachedCanManage(userId, chatId);
  const yes = data === true;
  try {
    if (yes) localStorage.setItem(MANAGE_KEY(userId, chatId), '1');
    else localStorage.removeItem(MANAGE_KEY(userId, chatId));
  } catch {
    /* private window */
  }
  return yes;
}

/** When each person first saw each of these cards (the group's admins only; null if not allowed or not set up yet) */
export async function getCardSeen(chatId: string, reminders: string[], songs: string[]): Promise<CardSeenRow[] | null> {
  if (!reminders.length && !songs.length) return [];
  const { data, error } = await rpc('chat_card_seen', { _chat_id: chatId, _reminders: reminders, _songs: songs });
  if (error) return null;
  return (data as CardSeenRow[] | null) ?? [];
}

/** The group's members, for the "Seen by" lists */
export interface CardPerson {
  id: string;
  name: string;
  avatar: string | null;
  /** When they joined the group (ms) */
  joinedAt: number;
}

export async function getChatPeople(chatId: string): Promise<CardPerson[]> {
  const { data, error } = await supabase
    .from('chat_participants')
    .select('user_id, joined_at, user:user_id ( full_name, avatar_url, email )')
    .eq('chat_id', chatId);
  if (error) throw error;
  return ((data ?? []) as unknown as { user_id: string; joined_at: string | null; user: { full_name: string | null; avatar_url: string | null; email?: string | null } | null }[]).map((p) => ({
    id: p.user_id,
    name: p.user?.full_name?.trim() || p.user?.email?.split('@')[0] || 'Member',
    avatar: p.user?.avatar_url ?? null,
    joinedAt: p.joined_at ? Date.parse(p.joined_at.replace(/(\.\d{3})\d+/, '$1')) || 0 : 0,
  }));
}

/** The group's members, shared by everything on screen that needs them (asked at most every 30 s) */
const peopleCache = new Map<string, { at: number; list: Promise<CardPerson[]> }>();
export function chatPeopleCached(chatId: string): Promise<CardPerson[]> {
  const known = peopleCache.get(chatId);
  if (known && Date.now() - known.at < 30_000) return known.list;
  const list = getChatPeople(chatId);
  peopleCache.set(chatId, { at: Date.now(), list });
  list.catch(() => peopleCache.delete(chatId));
  return list;
}

export interface CardSeenSummary {
  /** Saw all of it, with the time they had (the last song seen, for a song card) */
  seen: { person: CardPerson; at: string }[];
  /** A song card that grew after they saw it: some of its songs */
  partly: { person: CardPerson; at: string; count: number }[];
  /** In the group when it was posted, not seen yet */
  waiting: CardPerson[];
  /** Everyone counted (seen + partly + waiting) */
  total: number;
}

const ms = (iso: string) => Date.parse(iso.replace(/(\.\d{3})\d+/, '$1')) || 0;
const byName = (a: CardPerson, b: CardPerson) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/**
 * Who has seen one card. `items` are its reminder send (one) or its songs; `postedAt` is
 * when it went into the chat. Not listed: whoever is asking, and the reminder's setter (they
 * wrote it), like WhatsApp leaves out a message's sender. "Not seen yet" is only people who
 * were in the group when it was posted; someone who joined later shows only once they've seen it.
 */
export function summariseCard(kind: CardKind, items: string[], postedAt: string, people: CardPerson[], rows: CardSeenRow[], leaveOut: (string | null | undefined)[]): CardSeenSummary {
  const want = new Set(items);
  const skip = new Set(leaveOut.filter(Boolean));
  const per = new Map<string, { count: number; at: string }>();
  for (const r of rows) {
    if (r.kind !== kind || !want.has(r.item_id)) continue;
    const p = per.get(r.user_id);
    if (!p) per.set(r.user_id, { count: 1, at: r.seen_at });
    else per.set(r.user_id, { count: p.count + 1, at: ms(r.seen_at) > ms(p.at) ? r.seen_at : p.at });
  }
  const posted = ms(postedAt);
  const seen: CardSeenSummary['seen'] = [];
  const partly: CardSeenSummary['partly'] = [];
  const waiting: CardPerson[] = [];
  for (const person of people) {
    if (skip.has(person.id)) continue;
    const p = per.get(person.id);
    if (p && p.count >= want.size) seen.push({ person, at: p.at });
    else if (p) partly.push({ person, at: p.at, count: p.count });
    else if (!person.joinedAt || person.joinedAt <= posted + 1000) waiting.push(person);
  }
  seen.sort((a, b) => byName(a.person, b.person));
  partly.sort((a, b) => byName(a.person, b.person));
  waiting.sort(byName);
  return { seen, partly, waiting, total: seen.length + partly.length + waiting.length };
}
