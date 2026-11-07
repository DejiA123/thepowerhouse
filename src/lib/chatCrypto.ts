import { supabase } from '@/integrations/supabase/client';

/**
 * End-to-end encrypted chats, like WhatsApp. Everything here runs on the phone.
 *
 * - Each phone or browser has its own key pair (ECDH P-256). The private half
 *   is made on the phone, can't be exported, and never leaves it (IndexedDB).
 *   The public half goes in `chat_devices`.
 * - Each chat has a key (AES-256-GCM), made by whichever phone needs one first.
 *   It's sealed separately for every member's device (`chat_keys`) with a
 *   secret only those two devices can work out, so the server only stores
 *   sealed keys and scrambled messages.
 * - A device that joins later (a new phone, the Home Screen app, a new member)
 *   is sent the keys by any member's device that has them, the next time that
 *   device is open (`shareAllKeys`). Until then its messages show "Waiting for
 *   this message", as on WhatsApp.
 * - When someone leaves a chat, the next message uses a new key they don't get.
 *
 * Messages are stored as "::e2e::1:<keyId>:<iv>:<ciphertext>" (base64), bound to
 * their chat. Photos are encrypted with their own key, which travels inside
 * the encrypted message ("…#e2e=<key>.<iv>.<type>").
 */

export const E2E_PREFIX = '::e2e::1:';
export const isEncrypted = (content: string | null | undefined) => !!content && content.startsWith(E2E_PREFIX);
/** What shows instead of a message this device can't open yet */
export const WAITING_TEXT = '🔒 Waiting for this message. This may take a while.';
/** Window event: this device was sent new chat keys ({ chatId }) */
export const KEYS_ARRIVED = 'chat-keys:arrived';

const enc = new TextEncoder();
const dec = new TextDecoder();

// ── Small helpers ───────────────────────────────────────────────────

export function toB64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}
export function fromB64(text: string) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const urlB64 = (data: Uint8Array) => toB64(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromUrlB64 = (text: string) => fromB64(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));

const randomId = (bytes = 8) => urlB64(crypto.getRandomValues(new Uint8Array(bytes)));
function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ── The phone's own key store (IndexedDB: CryptoKeys stay non-exportable) ──

const DB_NAME = 'ph-chat-keys';
const STORE = 'kv';
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}
async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Is encryption on? (the migration has been applied) ──────────────

let readyPromise: Promise<boolean> | null = null;
/** True once the database has the encryption tables. Before that, chats work as they always have. */
export function e2eReady(): Promise<boolean> {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (typeof indexedDB === 'undefined' || !crypto?.subtle) return false;
      const { error } = await supabase.from('chat_devices' as never).select('id').limit(1);
      return !error;
    })().catch(() => false);
    // Not there yet: look again later in the session (it may be applied meanwhile)
    readyPromise.then((ok) => !ok && setTimeout(() => (readyPromise = null), 5 * 60_000));
  }
  return readyPromise;
}

// ── This device ─────────────────────────────────────────────────────

interface Device {
  id: string;
  userId: string;
  privateKey: CryptoKey;
  publicKey: string;
}

const devices = new Map<string, Promise<Device | null>>();

/** This phone's device for this account (made and registered the first time) */
export function myDevice(userId: string): Promise<Device | null> {
  let p = devices.get(userId);
  if (!p) {
    p = (async () => {
      if (!(await e2eReady())) return null;
      let device = await idbGet<Device>(`device:${userId}`);
      if (!device) {
        const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])) as CryptoKeyPair;
        const publicKey = toB64(await crypto.subtle.exportKey('raw', pair.publicKey));
        device = { id: uuid(), userId, privateKey: pair.privateKey, publicKey };
        await idbSet(`device:${userId}`, device);
      }
      // (Re-)register: harmless if it's already there; also says it was seen today
      const { error } = await supabase
        .from('chat_devices' as never)
        .upsert({ id: device.id, user_id: userId, public_key: device.publicKey, last_seen_at: new Date().toISOString() } as never, { onConflict: 'id' });
      if (error) throw error;
      return device;
    })();
    p.catch(() => devices.delete(userId));
    devices.set(userId, p);
  }
  return p;
}

// ── Keys between two devices, and chat keys ─────────────────────────

/** The secret only these two devices can work out, for one purpose (`info`) */
async function pairKey(privateKey: CryptoKey, theirPublic: string, info: string): Promise<CryptoKey> {
  const pub = await crypto.subtle.importKey('raw', fromB64(theirPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, privateKey, 256));
  const label = enc.encode(`ph-chat-key-v1|${info}`);
  const material = new Uint8Array(shared.length + label.length);
  material.set(shared);
  material.set(label, shared.length);
  const digest = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

const sealInfo = (chatId: string, keyId: string, deviceId: string) => `${chatId}|${keyId}|${deviceId}`;

async function seal(device: Device, chatId: string, keyId: string, chatKey: CryptoKey, to: { id: string; public_key: string }) {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', chatKey));
  const wrapKey = await pairKey(device.privateKey, to.public_key, sealInfo(chatId, keyId, to.id));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrapKey, raw));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toB64(out);
}

async function unseal(device: Device, chatId: string, keyId: string, wrapped: string, fromPublic: string): Promise<CryptoKey> {
  const bytes = fromB64(wrapped);
  const wrapKey = await pairKey(device.privateKey, fromPublic, sealInfo(chatId, keyId, device.id));
  const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, wrapKey, bytes.subarray(12));
  // Exportable only so this device can seal it for other members' devices
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

/** Chat keys this device holds: chatId → keyId → key (loaded once per session, then kept up to date) */
const held = new Map<string, Map<string, CryptoKey>>();
/** When this device last asked the server for its keys in a chat */
const fetchedAt = new Map<string, number>();
/** The key new messages in a chat are sent with (this session) */
const sending = new Map<string, string>();
/** When this phone last checked that every member's device has that key */
const sendingChecked = new Map<string, number>();

const storeKey = (chatId: string, keyId: string) => `chatkey:${chatId}:${keyId}`;

async function keep(chatId: string, keyId: string, key: CryptoKey) {
  let m = held.get(chatId);
  if (!m) held.set(chatId, (m = new Map()));
  if (!m.has(keyId)) {
    m.set(keyId, key);
    // Also read by the service worker to show notifications
    await idbSet(storeKey(chatId, keyId), key).catch(() => undefined);
  }
}

/** Every key this device has been sent for a chat (from the phone, then the server) */
async function loadKeys(userId: string, chatId: string, force = false): Promise<Map<string, CryptoKey>> {
  const device = await myDevice(userId);
  if (!device) return new Map();
  const last = fetchedAt.get(chatId) ?? 0;
  if (!force && Date.now() - last < 30_000 && held.has(chatId)) return held.get(chatId)!;
  fetchedAt.set(chatId, Date.now());
  const { data, error } = await supabase
    .from('chat_keys' as never)
    .select('key_id, wrapped_key, from_public_key, created_at')
    .eq('chat_id', chatId)
    .eq('device_id', device.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  for (const row of (data || []) as { key_id: string; wrapped_key: string; from_public_key: string }[]) {
    if (held.get(chatId)?.has(row.key_id)) continue;
    const cached = await idbGet<CryptoKey>(storeKey(chatId, row.key_id)).catch(() => undefined);
    try {
      await keep(chatId, row.key_id, cached ?? (await unseal(device, chatId, row.key_id, row.wrapped_key, row.from_public_key)));
    } catch {
      /* sealed for an older copy of this device: someone will send it again */
    }
  }
  return held.get(chatId) ?? new Map();
}

async function keyFor(userId: string, chatId: string, keyId: string): Promise<CryptoKey | null> {
  const known = held.get(chatId)?.get(keyId);
  if (known) return known;
  const cached = await idbGet<CryptoKey>(storeKey(chatId, keyId)).catch(() => undefined);
  if (cached) {
    await keep(chatId, keyId, cached);
    return cached;
  }
  // Not here: ask the server (at most every 30 s per chat, unless keys just arrived)
  const keys = await loadKeys(userId, chatId).catch(() => null);
  return keys?.get(keyId) ?? null;
}

interface MemberDevice {
  id: string;
  user_id: string;
  public_key: string;
}

/** Members of a chat and all their devices */
async function memberDevices(chatId: string): Promise<{ members: Set<string>; devices: MemberDevice[] }> {
  const { data: people, error } = await supabase.from('chat_participants').select('user_id').eq('chat_id', chatId);
  if (error) throw error;
  const members = new Set((people || []).map((p) => p.user_id as string));
  if (!members.size) return { members, devices: [] };
  const { data: list, error: devErr } = await supabase
    .from('chat_devices' as never)
    .select('id, user_id, public_key')
    .in('user_id', [...members]);
  if (devErr) throw devErr;
  return { members, devices: (list || []) as MemberDevice[] };
}

/** Which devices hold which of a chat's keys */
async function holders(chatId: string): Promise<{ key_id: string; device_id: string; user_id: string }[]> {
  const { data, error } = await supabase.from('chat_keys' as never).select('key_id, device_id, user_id').eq('chat_id', chatId);
  if (error) throw error;
  return (data || []) as { key_id: string; device_id: string; user_id: string }[];
}

async function sealFor(device: Device, chatId: string, keyId: string, key: CryptoKey, targets: MemberDevice[]) {
  if (!targets.length) return;
  const rows = await Promise.all(
    targets.map(async (t) => ({
      chat_id: chatId,
      key_id: keyId,
      device_id: t.id,
      user_id: t.user_id,
      wrapped_key: await seal(device, chatId, keyId, key, t),
      from_device_id: device.id,
      from_public_key: device.publicKey,
    })),
  );
  const { error } = await supabase
    .from('chat_keys' as never)
    .upsert(rows as never, { onConflict: 'chat_id,key_id,device_id', ignoreDuplicates: true });
  if (error) throw error;
}

/** Send the keys this device holds for a chat to every member device that doesn't have them yet */
export async function shareKeys(userId: string, chatId: string): Promise<void> {
  const device = await myDevice(userId);
  if (!device) return;
  const keys = await loadKeys(userId, chatId);
  if (!keys.size) return;
  const [{ devices: targets }, have] = await Promise.all([memberDevices(chatId), holders(chatId)]);
  const has = new Set(have.map((h) => `${h.key_id}|${h.device_id}`));
  // Every key goes to every current member's device, including keys someone who has since
  // left also holds: they're the keys of past messages, which today's members may read (new
  // members see the history) and which tell the former member nothing new. Only sending
  // stops using such a key (sendingKey picks a fresh one). Skipping them here left the
  // Choir group's imported history "Waiting for this message" for everyone added after
  // a member left (Nov 2026).
  for (const [keyId, key] of keys) {
    await sealFor(device, chatId, keyId, key, targets.filter((t) => !has.has(`${keyId}|${t.id}`)));
  }
}

/** The key to send with: the newest one held that no former member has, or a new one for everyone */
async function sendingKey(userId: string, chatId: string): Promise<{ keyId: string; key: CryptoKey }> {
  const known = sending.get(chatId);
  const keys = await loadKeys(userId, chatId);
  // Look again at least once a minute: someone may have joined (an invite link) on their own phone
  if (known && keys.get(known) && Date.now() - (sendingChecked.get(chatId) ?? 0) < 60_000) return { keyId: known, key: keys.get(known)! };
  sendingChecked.set(chatId, Date.now());

  const device = await myDevice(userId);
  if (!device) throw new Error('Encryption is not available');
  const [{ members, devices: targets }, have] = await Promise.all([memberDevices(chatId), holders(chatId)]);
  const usable = [...keys.keys()].reverse().find((keyId) => !have.some((h) => h.key_id === keyId && !members.has(h.user_id)));
  if (usable) {
    sending.set(chatId, usable);
    const key = keys.get(usable)!;
    const has = new Set(have.filter((h) => h.key_id === usable).map((h) => h.device_id));
    // Anyone who hasn't got it yet gets it now
    await sealFor(device, chatId, usable, key, targets.filter((t) => !has.has(t.id))).catch(() => undefined);
    return { keyId: usable, key };
  }

  // A new key for this chat, sealed for every member's device (this one included)
  const key = (await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])) as CryptoKey;
  const keyId = randomId(9);
  const everyone = targets.some((t) => t.id === device.id) ? targets : [...targets, { id: device.id, user_id: userId, public_key: device.publicKey }];
  await sealFor(device, chatId, keyId, key, everyone);
  await keep(chatId, keyId, key);
  sending.set(chatId, keyId);
  return { keyId, key };
}

/** Membership changed (someone added or removed): the next message checks its key again */
export function membersChanged(chatId: string) {
  sending.delete(chatId);
  fetchedAt.delete(chatId);
}

// ── Messages ────────────────────────────────────────────────────────

/** Encrypt a message for a chat (needs `e2eReady()`) */
export async function encryptMessage(userId: string, chatId: string, text: string): Promise<string> {
  const { keyId, key } = await sendingKey(userId, chatId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(chatId) }, key, enc.encode(text));
  return `${E2E_PREFIX}${keyId}:${toB64(iv)}:${toB64(ct)}`;
}

/** Many messages at once (importing a chat): one key, no extra lookups */
export async function encryptMany(userId: string, chatId: string, texts: string[]): Promise<string[]> {
  const { keyId, key } = await sendingKey(userId, chatId);
  const ad = enc.encode(chatId);
  return Promise.all(
    texts.map(async (text) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: ad }, key, enc.encode(text));
      return `${E2E_PREFIX}${keyId}:${toB64(iv)}:${toB64(ct)}`;
    }),
  );
}

/** The text of an encrypted message, or null when this device doesn't have its key (yet) */
export async function decryptMessage(userId: string, chatId: string, content: string): Promise<string | null> {
  const [keyId, iv, ct] = content.slice(E2E_PREFIX.length).split(':');
  if (!keyId || !iv || !ct) return null;
  const key = await keyFor(userId, chatId, keyId);
  if (!key) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv), additionalData: enc.encode(chatId) }, key, fromB64(ct));
    return dec.decode(plain);
  } catch {
    return null;
  }
}

/** This phone's device id for the signed-in account (notifications carry the key copy sealed for it) */
export async function currentDeviceId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return null;
    return (await myDevice(userId))?.id ?? null;
  } catch {
    return null;
  }
}

const KEPT_KEY = (userId: string) => `chat_keys_kept_${userId}`;

/**
 * Every chat key sealed for this phone, opened and kept on the phone, so the
 * notification helper (push-sw.js) can show any message, even in a chat the
 * app hasn't opened since its key changed. Only keys new since last time.
 */
export async function keepAllKeys(userId: string): Promise<number> {
  const device = await myDevice(userId);
  if (!device) return 0;
  let since = '1970-01-01T00:00:00Z';
  try {
    since = localStorage.getItem(KEPT_KEY(userId)) || since;
  } catch {
    /* private window */
  }
  const { data, error } = await supabase
    .from('chat_keys' as never)
    .select('chat_id, key_id, wrapped_key, from_public_key, created_at')
    .eq('device_id', device.id)
    .gt('created_at', since)
    .order('created_at', { ascending: true })
    .limit(1000);
  if (error) throw error;
  const rows = (data || []) as { chat_id: string; key_id: string; wrapped_key: string; from_public_key: string; created_at: string }[];
  let kept = 0;
  for (const row of rows) {
    if (held.get(row.chat_id)?.has(row.key_id)) continue;
    const stored = await idbGet<CryptoKey>(storeKey(row.chat_id, row.key_id)).catch(() => undefined);
    if (stored) continue;
    try {
      await keep(row.chat_id, row.key_id, await unseal(device, row.chat_id, row.key_id, row.wrapped_key, row.from_public_key));
      kept++;
    } catch {
      /* sealed for an older copy of this device */
    }
  }
  const newest = rows[rows.length - 1]?.created_at;
  if (newest) {
    try {
      localStorage.setItem(KEPT_KEY(userId), newest);
    } catch {
      /* private window */
    }
  }
  // A full page: there may be more
  if (rows.length === 1000) kept += await keepAllKeys(userId);
  return kept;
}

/** Keys arrived for this device: forget when the server was last asked, so the next read asks again */
export function keysArrived(chatId: string) {
  fetchedAt.delete(chatId);
}

/** Share keys in every chat this device holds keys for (on start, when back on screen, when a member adds a device) */
export async function shareAllKeys(userId: string): Promise<void> {
  const device = await myDevice(userId);
  if (!device) return;
  const { data, error } = await supabase.from('chat_keys' as never).select('chat_id').eq('device_id', device.id);
  if (error) return;
  const chats = [...new Set(((data || []) as { chat_id: string }[]).map((r) => r.chat_id))];
  for (const chatId of chats) await shareKeys(userId, chatId).catch(() => undefined);
}

// ── Photos ──────────────────────────────────────────────────────────

/** Encrypt a photo with its own key; the key goes in the (encrypted) message after "#e2e=" */
export async function encryptFile(blob: Blob): Promise<{ data: Blob; fragment: string }> {
  const key = (await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])) as CryptoKey;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await blob.arrayBuffer());
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  return { data: new Blob([ct], { type: 'application/octet-stream' }), fragment: `e2e=${urlB64(raw)}.${urlB64(iv)}.${encodeURIComponent(blob.type || 'image/jpeg')}` };
}

export const isEncryptedFile = (url: string | null | undefined) => !!url && url.includes('#e2e=');
/** The type an encrypted photo really is ("image/gif" …) */
export const encryptedFileType = (url: string) => decodeURIComponent(url.split('#e2e=')[1]?.split('.')[2] ?? '');

const opened = new Map<string, Promise<string>>();

/** An encrypted photo's address, opened on the phone (a blob: URL), kept for the session */
export function openEncryptedFile(url: string): Promise<string> {
  let p = opened.get(url);
  if (!p) {
    p = (async () => {
      const [address, fragment] = url.split('#e2e=');
      const [k, iv, type] = fragment.split('.');
      const res = await fetch(address);
      if (!res.ok) throw new Error(`Couldn't load (${res.status})`);
      const key = await crypto.subtle.importKey('raw', fromUrlB64(k), { name: 'AES-GCM' }, false, ['decrypt']);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromUrlB64(iv) }, key, await res.arrayBuffer());
      return URL.createObjectURL(new Blob([plain], { type: decodeURIComponent(type || 'image/jpeg') }));
    })();
    p.catch(() => opened.delete(url));
    opened.set(url, p);
  }
  return p;
}
