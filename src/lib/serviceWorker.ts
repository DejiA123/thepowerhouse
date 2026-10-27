import { syncPushSubscription } from '@/lib/push';
import { track } from '@/lib/activity';

/** Where a tapped notification wants to go, kept by the service worker (see push-sw.js) */
const NAV_CACHE = 'app-pending-navigation';
const NAV_KEY = '/__pending-navigation';
const NAV_MAX_AGE_MS = 2 * 60 * 1000;

const goTo = (url: string) => window.dispatchEvent(new CustomEvent('app:navigate', { detail: { url } }));

/**
 * A notification was tapped but the app didn't get the message (an iPhone can
 * bring the app back before it's listening): open the page it was about.
 */
export async function openPendingNavigation() {
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open(NAV_CACHE);
    const res = await cache.match(NAV_KEY);
    if (!res) return;
    await cache.delete(NAV_KEY);
    const { url, at } = await res.json();
    if (typeof url === 'string' && url.startsWith('/') && Date.now() - at < NAV_MAX_AGE_MS) goTo(url);
  } catch {
    /* nothing waiting */
  }
}

/**
 * Relays service worker messages to the React app as window events
 * (registration itself happens in main.tsx via virtual:pwa-register):
 *   app:navigate       – a notification was tapped, open this in-app URL
 *   app:push           – a push arrived while the app is open
 *   app:call-declined  – "Decline" was tapped on an incoming-call notification
 */
export function registerAppServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data || {};
    switch (data.type) {
      case 'NOTIFICATION_NAVIGATE':
        track('notification_opened', { path: data.url });
        // Handled now: don't open it again later
        caches?.open(NAV_CACHE).then((c) => c.delete(NAV_KEY)).catch(() => undefined);
        goTo(data.url);
        break;
      case 'PUSH_RECEIVED':
        window.dispatchEvent(new CustomEvent('app:push', { detail: data.payload }));
        break;
      case 'CALL_DECLINED':
        window.dispatchEvent(new CustomEvent('app:call-declined', { detail: { callId: data.callId } }));
        break;
      case 'PUSH_SUBSCRIPTION_CHANGED':
        syncPushSubscription();
        break;
    }
  });

  // Opened (or brought back) by tapping a notification
  const check = () => {
    if (document.visibilityState !== 'visible') return;
    openPendingNavigation();
    // The service worker may still be writing it down
    setTimeout(openPendingNavigation, 800);
    setTimeout(openPendingNavigation, 2500);
  };
  document.addEventListener('visibilitychange', check);
  window.addEventListener('pageshow', check);
}
