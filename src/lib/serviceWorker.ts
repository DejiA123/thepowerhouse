import { syncPushSubscription } from '@/lib/push';

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
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { url: data.url } }));
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
}
