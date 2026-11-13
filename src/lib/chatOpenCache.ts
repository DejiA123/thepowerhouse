/**
 * What a chat shows besides its messages (reactions, reminder and song cards, who has
 * seen the cards), kept on the phone so a chat opens with all of it in the very first
 * frame, like WhatsApp, instead of each piece popping in (and moving the chat) as it
 * arrives. Memory for this session, localStorage across launches; never sent anywhere.
 */
const mem = new Map<string, unknown>();
const PREFIX = 'chat_open_v1_';

export function readOpenCache<T>(kind: string, userId: string, chatId: string): T | null {
  const key = `${PREFIX}${kind}_${userId}_${chatId}`;
  if (mem.has(key)) return mem.get(key) as T;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as T;
    mem.set(key, value);
    return value;
  } catch {
    return null;
  }
}

export function writeOpenCache(kind: string, userId: string, chatId: string, value: unknown) {
  const key = `${PREFIX}${kind}_${userId}_${chatId}`;
  mem.set(key, value);
  try {
    const raw = JSON.stringify(value);
    // Small things only: a big one stays in memory for this session
    if (raw.length < 60_000) localStorage.setItem(key, raw);
  } catch {
    /* storage full: memory still has it */
  }
}
