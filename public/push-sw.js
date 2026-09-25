/* Push notification handlers, imported into the generated Workbox service worker. */
/* eslint-disable no-restricted-globals */

const APP_ICON = '/icons/icon-192.png';
const BADGE_ICON = '/icons/badge-96.png';

const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(self.navigator.userAgent || '');

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
  // "Join" button, or a tap on the call notification itself ("Tap to join").
  // iPhone can't show notification buttons, so the tap has to answer.
  const answering = event.action === 'answer' || (data.kind === 'call' && !event.action);
  if (answering && url.indexOf('answer=1') === -1) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + 'answer=1';
  }
  const target = new URL(url, self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((c) => c.url.startsWith(self.location.origin));
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'NOTIFICATION_NAVIGATE', url: new URL(target).pathname + new URL(target).search });
    } else {
      await self.clients.openWindow(target);
    }
    await updateBadge();
  })());
});

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
