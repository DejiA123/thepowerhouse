import type { ChatMessage } from '@/services/groupChatService';

/**
 * The latest messages of each chat, kept on the phone (like WhatsApp), so a chat
 * opens instantly with what was there last time and then catches up quietly.
 * In memory for this session, and in IndexedDB (`ph-chat-cache`) across launches.
 * Messages are kept as this phone shows them (opened), never sent anywhere.
 */

const KEEP = 60;
const mem = new Map<string, ChatMessage[]>();
const key = (userId: string, chatId: string) => `${userId}:${chatId}`;

let dbPromise: Promise<IDBDatabase | null> | null = null;
function openDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open('ph-chat-cache', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('chats');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

/** What to keep: sent messages only (not ones still sending), without the bulky media streams */
function keepable(messages: ChatMessage[]) {
  return messages
    .filter((m) => !m.pending && !m.failed)
    .slice(-KEEP)
    .map(({ pending: _p, failed: _f, ...m }) => m as ChatMessage);
}

/** Straight from memory (this session), or nothing */
export function peekCachedMessages(userId: string, chatId: string): ChatMessage[] | null {
  return mem.get(key(userId, chatId)) ?? null;
}

/** From memory, else from the phone's storage */
export async function readCachedMessages(userId: string, chatId: string): Promise<ChatMessage[] | null> {
  const hit = mem.get(key(userId, chatId));
  if (hit) return hit;
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction('chats').objectStore('chats').get(key(userId, chatId));
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? (req.result as ChatMessage[]) : null;
        if (list) mem.set(key(userId, chatId), list);
        resolve(list);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Keep a chat's latest messages (called as the open chat changes, and when chats are prefetched) */
export function writeCachedMessages(userId: string, chatId: string, messages: ChatMessage[]) {
  const list = keepable(messages);
  mem.set(key(userId, chatId), list);
  openDb().then((db) => {
    if (!db) return;
    try {
      db.transaction('chats', 'readwrite').objectStore('chats').put(list, key(userId, chatId));
    } catch {
      /* storage full or closed: memory still has it */
    }
  });
}

/** Forget a chat's copy (cleared, left) */
export function dropCachedMessages(userId: string, chatId: string) {
  mem.delete(key(userId, chatId));
  openDb().then((db) => {
    try {
      db?.transaction('chats', 'readwrite').objectStore('chats').delete(key(userId, chatId));
    } catch {
      /* nothing to drop */
    }
  });
}
