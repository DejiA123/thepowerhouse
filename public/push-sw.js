/* Push notification handlers, imported into the generated Workbox service worker. */
/* eslint-disable no-restricted-globals */

const APP_ICON = '/icons/icon-192.png';
const BADGE_ICON = '/icons/badge-96.png';

const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(self.navigator.userAgent || '');

/*
 * End-to-end encrypted chat messages arrive still scrambled (the server can't
 * read them). Open them here with this phone's own chat key, kept by the app
 * in IndexedDB (src/lib/chatCrypto.ts), so the notification can say what the
 * message says. Without the key it stays "🔒 New message".
 */
const E2E_PREFIX = '::e2e::1:';

function openKeyStore() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ph-chat-keys', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readChatKey(chatId, keyId) {
  return openKeyStore().then((db) => new Promise((resolve) => {
    const req = db.transaction('kv').objectStore('kv').get('chatkey:' + chatId + ':' + keyId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  }));
}

function fromBase64(text) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function openEncrypted(chatId, content) {
  try {
    const parts = content.slice(E2E_PREFIX.length).split(':');
    const key = await readChatKey(chatId, parts[0]);
    if (!key) return null;
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(parts[1]), additionalData: new TextEncoder().encode(chatId) },
      key,
      fromBase64(parts[2]),
    );
    return new TextDecoder().decode(plain);
  } catch (e) {
    return null;
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
      const text = await openEncrypted(data.chatId, data.e2e);
      if (text !== null) payload = Object.assign({}, payload, { body: (data.e2ePrefix || '') + chatPreview(text) });
      delete data.e2e;
    }
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
