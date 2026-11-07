/* Push notification handlers, imported into the generated Workbox service worker. */
/* eslint-disable no-restricted-globals */

const APP_ICON = '/icons/icon-192.png';
const BADGE_ICON = '/icons/badge-96.png';

const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(self.navigator.userAgent || '');

/*
 * End-to-end encrypted chat messages arrive still scrambled (the server can't
 * read them). Open them here with this phone's own chat key, kept by the app
 * in IndexedDB (src/lib/chatCrypto.ts), so the notification can say what the
 * message says. A phone without the key yet opens the copy sealed for it in
 * the notification (data.sealed). Without either it stays "🔒 New message".
 */
const E2E_PREFIX = '::e2e::1:';

/*
 * iPhone (WebKit) sometimes loses its IndexedDB connection while the app is in the
 * background, and every request then fails: notifications said "🔒 New message" now and
 * then though the phone had the key (Nov 2026). So each use of the key store opens a fresh
 * connection, closes it afterwards, gives up after 2 s, and is tried up to 3 times; and the
 * app keeps a second copy of each chat key in Cache Storage (readCachedKey) for when
 * IndexedDB fails altogether.
 */
let keyStoreError = '';

function openKeyStore() {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        reject(new Error('timed out'));
      }
    }, 2000);
    const req = indexedDB.open('ph-chat-keys', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      clearTimeout(timer);
      if (done) {
        req.result.close();
        return;
      }
      done = true;
      resolve(req.result);
    };
    req.onerror = () => {
      clearTimeout(timer);
      if (!done) {
        done = true;
        reject(req.error);
      }
    };
    req.onblocked = () => {
      /* another connection is upgrading: the timer gives up if it takes too long */
    };
  });
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs one request on a fresh connection (closed after), up to 3 tries */
async function withKeyStore(run) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    let db;
    try {
      db = await openKeyStore();
      const result = await run(db);
      keyStoreError = '';
      return result;
    } catch (e) {
      last = e;
      keyStoreError = (e && (e.name || e.message)) || String(e);
      await pause(attempt === 0 ? 120 : 400);
    } finally {
      try {
        if (db) db.close();
      } catch (e) {
        /* already closed */
      }
    }
  }
  throw last;
}

const request = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

/** The second copy of a chat key the app keeps in Cache Storage (raw bytes, base64) */
const KEY_CACHE = 'ph-chat-keys-v1';
const keyCacheUrl = (chatId, keyId) => '/__chatkey/' + encodeURIComponent(chatId) + '/' + encodeURIComponent(keyId);
async function readCachedKey(chatId, keyId) {
  try {
    const hit = await (await caches.open(KEY_CACHE)).match(keyCacheUrl(chatId, keyId));
    if (!hit) return null;
    return await crypto.subtle.importKey('raw', fromBase64((await hit.text()).trim()), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  } catch (e) {
    return null;
  }
}
async function cacheKeyCopy(chatId, keyId, key) {
  try {
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    let bin = '';
    raw.forEach((b) => (bin += String.fromCharCode(b)));
    await (await caches.open(KEY_CACHE)).put(keyCacheUrl(chatId, keyId), new Response(btoa(bin), { headers: { 'Content-Type': 'text/plain' } }));
  } catch (e) {
    /* best effort */
  }
}

/** This phone's chat key: from IndexedDB, or else the Cache Storage copy */
async function readChatKey(chatId, keyId) {
  let key = null;
  try {
    key = await withKeyStore((db) => request(db.transaction('kv').objectStore('kv').get('chatkey:' + chatId + ':' + keyId)));
  } catch (e) {
    key = null;
  }
  if (key) return { key, from: 'key on this phone' };
  const copy = await readCachedKey(chatId, keyId);
  return copy ? { key: copy, from: keyStoreError ? 'key copy (key store failed: ' + keyStoreError + ')' : 'key copy on this phone' } : null;
}

function fromBase64(text) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function storeChatKey(chatId, keyId, key) {
  const idb = withKeyStore((db) => new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(key, 'chatkey:' + chatId + ':' + keyId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  })).catch(() => undefined);
  return Promise.all([idb, cacheKeyCopy(chatId, keyId, key)]);
}

/** This phone's own devices (one per account signed in here), kept by the app: device:<user id> */
function readDevices() {
  return withKeyStore((db) => request(db.transaction('kv').objectStore('kv').getAll(IDBKeyRange.bound('device:', 'device:\uffff'))))
    .then((all) => all || [])
    .catch(() => []);
}

/*
 * The phone hasn't got this chat's key yet (a new chat, or the app hasn't
 * been opened since): the notification carries this person's copy, sealed for
 * each of their phones ({ d: device, w: sealed key, f: sender's public key }).
 * Open it the same way the app does (src/lib/chatCrypto.ts unseal), and keep it.
 */
async function unsealChatKey(chatId, keyId, sealed) {
  if (!Array.isArray(sealed) || !sealed.length) return null;
  const devices = await readDevices();
  for (const device of devices) {
    const mine = sealed.find((s) => s && s.d === device.id);
    if (!mine || !device.privateKey) continue;
    try {
      const pub = await crypto.subtle.importKey('raw', fromBase64(mine.f), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
      const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, device.privateKey, 256));
      const label = new TextEncoder().encode('ph-chat-key-v1|' + chatId + '|' + keyId + '|' + device.id);
      const material = new Uint8Array(shared.length + label.length);
      material.set(shared);
      material.set(label, shared.length);
      const wrapKey = await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', material), { name: 'AES-GCM' }, false, ['decrypt']);
      const bytes = fromBase64(mine.w);
      const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, wrapKey, bytes.subarray(12));
      // Exportable, like the app's copy: it seals keys for the person's other phones
      const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
      await storeChatKey(chatId, keyId, key);
      return key;
    } catch (e) {
      /* sealed for an older copy of this device */
    }
  }
  return null;
}

/*
 * What happened to each chat notification on this phone (newest 30), so the app's
 * "Notification report" (/push-report) can show why one said "🔒 New message".
 */
function logPush(entry) {
  try {
    const req = indexedDB.open('ph-push-log', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('log', { autoIncrement: true });
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('log', 'readwrite');
      const store = tx.objectStore('log');
      store.add(Object.assign({ at: new Date().toISOString() }, entry));
      const keys = store.getAllKeys();
      keys.onsuccess = () => {
        const all = keys.result || [];
        all.slice(0, Math.max(0, all.length - 30)).forEach((k) => store.delete(k));
      };
      tx.oncomplete = () => db.close();
    };
  } catch (e) {
    /* best effort */
  }
}

/*
 * Opens an encrypted chat notification: { text, how } (text null when it can't, and how
 * says why, for the Notification report). Each call keeps its own outcome, so two
 * notifications arriving together never log each other's.
 */
async function openEncrypted(chatId, content, sealed) {
  let how = '';
  try {
    const parts = content.slice(E2E_PREFIX.length).split(':');
    const found = await readChatKey(chatId, parts[0]);
    let key = found ? found.key : null;
    how = found ? found.from : '';
    if (!key) {
      key = await unsealChatKey(chatId, parts[0], sealed);
      how = key
        ? 'opened the copy in the notification'
        : (keyStoreError ? 'key store failed (' + keyStoreError + ') and ' : '') + (Array.isArray(sealed) && sealed.length ? 'no copy for this phone' : 'no key on this phone, no copy sent');
    }
    if (!key) return { text: null, how };
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(parts[1]), additionalData: new TextEncoder().encode(chatId) },
      key,
      fromBase64(parts[2]),
    );
    return { text: new TextDecoder().decode(plain), how };
  } catch (e) {
    return { text: null, how: 'could not open: ' + ((e && e.name) || e) };
  }
}

/** One line, like the app's previewText */
function chatPreview(text) {
  // @[Name](id) → @Name
  text = text.replace(/@\[([^\]\n]{1,80})\]\([0-9a-f-]{36}\)/g, '@$1');
  if (text.startsWith('::voice::')) {
    const secs = Math.round(parseFloat(text.slice(9)) || 0);
    return '🎤 Voice message (' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + ')';
  }
  if (text.startsWith('::file::')) {
    const lines = text.split('\n');
    const caption = lines.slice(1).join(' ').trim();
    let name = 'Document';
    try { name = decodeURIComponent((lines[0].match(/^::file::\d+:([^:]*):/) || [])[1] || name); } catch (e) { /* keep */ }
    return '📄 ' + (caption || name);
  }
  if (text.startsWith('::preview::')) text = text.split('\n').slice(1).join('\n');
  if (text.startsWith('::image::') || text.startsWith('::video::')) {
    const lines = text.split('\n');
    const caption = lines.slice(1).join(' ').trim();
    const video = text.startsWith('::video::');
    const gif = /image%2Fgif|image\/gif|\.gif(?:$|[?#])/i.test(lines[0]);
    const icon = video ? '🎥' : gif ? '🎞️' : '📷';
    const label = video ? 'Video' : gif ? 'GIF' : 'Photo';
    return caption ? icon + ' ' + caption.slice(0, 150) : icon + ' ' + label;
  }
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 160 ? t.slice(0, 159) + '…' : t;
}

async function updateBadge() {
  try {
    const open = await self.registration.getNotifications();
    const count = open.filter((n) => n.data && n.data.kind !== 'test').length;
    if ('setAppBadge' in self.navigator) {
      if (count > 0) await self.navigator.setAppBadge(count);
      else await self.navigator.clearAppBadge();
    }
  } catch (e) {
    /* badges are best effort */
  }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'The Power House', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'The Power House';
  const data = Object.assign({}, payload.data || {}, {
    url: payload.url || '/',
    kind: payload.kind || 'general',
    timestamp: payload.timestamp || Date.now(),
  });

  event.waitUntil((async () => {
    // An encrypted chat message: open it on this phone (the scrambled text never shows)
    if (data.e2e) {
      const { text, how } = await openEncrypted(data.chatId, data.e2e, data.sealed);
      if (text !== null) payload = Object.assign({}, payload, { body: (data.e2ePrefix || '') + chatPreview(text) });
      logPush({ title, shown: text !== null ? 'the message' : '🔒 New message', how, copies: Array.isArray(data.sealed) ? data.sealed.length : 0 });
    } else if (payload.kind === 'chat') {
      logPush({ title, shown: payload.body || '', how: 'nothing to open (not encrypted, or the server sent no text)' });
    }
    delete data.e2e;
    delete data.sealed;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = windows.find((c) => c.visibilityState === 'visible' && c.focused);

    // Tell open tabs so they can refresh / show an in-app banner
    windows.forEach((c) => c.postMessage({ type: 'PUSH_RECEIVED', payload: Object.assign({}, payload, { data }) }));

    // A missed call replaces the ringing notification for the same call
    if (payload.kind === 'call-missed' && payload.tag) {
      const ringing = await self.registration.getNotifications({ tag: payload.tag });
      ringing.forEach((n) => n.close());
    }

    // When the app is open and focused the page shows its own in-app banner.
    // Safari requires every push to show a notification, so only skip elsewhere.
    if (visible && !isSafari && payload.kind !== 'call') {
      return;
    }

    await self.registration.showNotification(title, {
      body: payload.body || '',
      icon: APP_ICON,
      badge: BADGE_ICON,
      image: payload.image,
      tag: payload.tag,
      renotify: Boolean(payload.tag && payload.renotify),
      requireInteraction: Boolean(payload.requireInteraction),
      vibrate: payload.vibrate || [120, 60, 120],
      actions: payload.actions || [],
      timestamp: data.timestamp,
      data,
    });
    await updateBadge();
  })());
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  notification.close();

  if (event.action === 'decline') {
    event.waitUntil((async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windows.forEach((c) => c.postMessage({ type: 'CALL_DECLINED', callId: data.callId }));
      await updateBadge();
    })());
    return;
  }

  let url = data.url || '/';
  // A chat message opens the chat at that message
  if (data.kind === 'chat' && data.messageId && url.indexOf('message=') === -1) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + 'message=' + encodeURIComponent(data.messageId);
  }
  // "Join" button, or a tap on the call notification itself ("Tap to join").
  // iPhone can't show notification buttons, so the tap has to answer.
  const answering = event.action === 'answer' || (data.kind === 'call' && !event.action);
  if (answering && url.indexOf('answer=1') === -1) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + 'answer=1';
  }
  const target = new URL(url, self.location.origin).href;
  const path = new URL(target).pathname + new URL(target).search;

  event.waitUntil((async () => {
    // Remembered too, in case the app doesn't get the message below (an iPhone
    // can wake the app before it's listening): the app checks this when it shows
    await rememberNavigation(path);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((c) => c.url.startsWith(self.location.origin));
    if (existing) {
      // Tell the app first: on iPhone focus() can fail, which used to stop the rest
      existing.postMessage({ type: 'NOTIFICATION_NAVIGATE', url: path });
      try {
        await existing.focus();
      } catch (e) {
        /* the phone brings the app forward itself */
      }
    } else {
      try {
        await self.clients.openWindow(target);
      } catch (e) {
        /* the app opens on its own and picks up the remembered page */
      }
    }
    await updateBadge();
  })());
});

const NAV_CACHE = 'app-pending-navigation';
const NAV_KEY = '/__pending-navigation';
async function rememberNavigation(path) {
  try {
    const cache = await caches.open(NAV_CACHE);
    await cache.put(NAV_KEY, new Response(JSON.stringify({ url: path, at: Date.now() }), { headers: { 'Content-Type': 'application/json' } }));
  } catch (e) {
    /* best effort */
  }
}

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(updateBadge());
});

// Browsers rotate push subscriptions occasionally; re-register the new one.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windows.forEach((c) => c.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' }));
    } catch (e) {
      /* the page re-syncs on next open */
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_NOTIFICATIONS') {
    event.waitUntil((async () => {
      const tag = event.data.tag;
      const open = await self.registration.getNotifications(tag ? { tag } : undefined);
      open.forEach((n) => n.close());
      await updateBadge();
    })());
  }
});
