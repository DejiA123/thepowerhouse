import { supabase } from '@/integrations/supabase/client';

/**
 * Web Push for the installed PWA (Android, desktop, and iOS 16.4+ when the app
 * is added to the Home Screen). Subscriptions are stored server-side by the
 * `push-subscribe` edge function; notifications are fanned out by `send-push`.
 */

const TOPICS_KEY = 'push_topics_v1';
const ENABLED_KEY = 'push_enabled_v1';

export type PushState =
  | 'unsupported'      // browser has no Push API
  | 'needs-install'    // iOS Safari tab: must be added to Home Screen first
  | 'denied'           // user blocked notifications
  | 'default'          // not asked yet
  | 'granted-off'      // permission granted but this device is not subscribed
  | 'on';              // subscribed and ready

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

let vapidKeyPromise: Promise<string | null> | null = null;

async function getVapidKey(): Promise<string | null> {
  if (!vapidKeyPromise) {
    vapidKeyPromise = supabase.functions
      .invoke('push-subscribe', { body: { action: 'vapid' } })
      .then(({ data, error }) => {
        if (error || !data?.publicKey) {
          vapidKeyPromise = null; // retry next time
          return null;
        }
        return data.publicKey as string;
      })
      .catch(() => {
        vapidKeyPromise = null;
        return null;
      });
  }
  return vapidKeyPromise;
}

const urlBase64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

async function getRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await getRegistration(3000);
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function getCurrentEndpoint(): Promise<string | null> {
  return (await currentSubscription())?.endpoint ?? null;
}

const readLocalTopics = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(TOPICS_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeLocalTopics = (topics: string[]) => {
  try {
    localStorage.setItem(TOPICS_KEY, JSON.stringify(Array.from(new Set(topics))));
  } catch {
    /* storage may be unavailable */
  }
  window.dispatchEvent(new CustomEvent('push:changed'));
};

export const getLocalTopics = readLocalTopics;

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') return 'default';
  return (await currentSubscription()) ? 'on' : 'granted-off';
}

async function register(subscription: PushSubscription, topics: string[] = []) {
  const json = subscription.toJSON();
  const { error } = await supabase.functions.invoke('push-subscribe', {
    body: { action: 'subscribe', subscription: json, topics },
  });
  if (error) throw error;
}

/**
 * Ask for permission (must run from a tap/click) and subscribe this device.
 */
export async function enablePush(extraTopics: string[] = []): Promise<PushState> {
  if (!pushSupported()) return isIOS() ? 'needs-install' : 'unsupported';
  if (isIOS() && !isStandalone()) return 'needs-install';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default';

  const reg = await getRegistration();
  if (!reg) throw new Error('Service worker is not ready yet. Please reload and try again.');

  const key = await getVapidKey();
  if (!key) throw new Error('Push notifications are not configured on the server yet.');

  let sub = await reg.pushManager.getSubscription();
  // A key rotation on the server invalidates old subscriptions
  if (sub) {
    const current = sub.options?.applicationServerKey;
    const expected = urlBase64ToUint8Array(key);
    if (current && new Uint8Array(current).toString() !== expected.toString()) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }

  const topics = Array.from(new Set([...readLocalTopics(), ...extraTopics]));
  await register(sub, topics);
  writeLocalTopics(topics);
  localStorage.setItem(ENABLED_KEY, '1');
  return 'on';
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (sub) {
    await supabase.functions
      .invoke('push-subscribe', { body: { action: 'unsubscribe', endpoint: sub.endpoint } })
      .catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
  }
  localStorage.removeItem(ENABLED_KEY);
  window.dispatchEvent(new CustomEvent('push:changed'));
}

/**
 * Re-send the existing subscription (links it to the signed-in user and
 * refreshes rotated endpoints). Safe to call on every app start.
 */
export async function syncPushSubscription(): Promise<void> {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    const sub = await currentSubscription();
    if (sub) {
      await register(sub, readLocalTopics());
    } else if (localStorage.getItem(ENABLED_KEY)) {
      // Subscription was dropped by the browser: silently re-create it
      await enablePush();
    }
  } catch (error) {
    console.warn('[push] sync failed', error);
  }
}

/** On sign-out: keep topic alerts (e.g. choir) but stop personal messages. */
export async function detachPushFromUser(): Promise<void> {
  const endpoint = await getCurrentEndpoint();
  if (!endpoint) return;
  await supabase.functions
    .invoke('push-subscribe', { body: { action: 'detach', endpoint } })
    .catch(() => undefined);
}

export async function followTopic(topic: string): Promise<boolean> {
  const topics = readLocalTopics();
  if (!topics.includes(topic)) writeLocalTopics([...topics, topic]);
  const endpoint = await getCurrentEndpoint();
  if (!endpoint) return false;
  const { error } = await supabase.functions.invoke('push-subscribe', {
    body: { action: 'topics', endpoint, add: [topic] },
  });
  return !error;
}

export async function unfollowTopic(topic: string): Promise<void> {
  writeLocalTopics(readLocalTopics().filter((t) => t !== topic));
  const endpoint = await getCurrentEndpoint();
  if (!endpoint) return;
  await supabase.functions
    .invoke('push-subscribe', { body: { action: 'topics', endpoint, remove: [topic] } })
    .catch(() => undefined);
}

export const isFollowingTopic = (topic: string) => readLocalTopics().includes(topic);

type PushEvent =
  | { type: 'chat-message'; messageId: string }
  | { type: 'call'; callId: string }
  | { type: 'call-missed'; callId: string }
  | { type: 'choir-song'; table: 'weekly' | 'library'; ids: string[] }
  | { type: 'prayer-prayed'; prayerRequestId: string }
  | { type: 'test' };

/**
 * Ask the server to notify the right people. Fire-and-forget: a failed push
 * must never break sending a message or adding a song.
 */
export function sendPush(event: PushEvent): void {
  (async () => {
    const extra: Record<string, unknown> = {};
    // Don't notify the device that made the change; for tests, target this device
    if (event.type === 'choir-song') extra.excludeEndpoint = await getCurrentEndpoint();
    if (event.type === 'test') extra.endpoint = await getCurrentEndpoint();
    const { error } = await supabase.functions.invoke('send-push', { body: { ...event, ...extra } });
    if (error) console.warn('[push] send failed', event.type, error.message);
  })().catch((e) => console.warn('[push] send failed', e));
}

/** Clear OS notifications for a chat once the user has opened it. */
export async function clearNotifications(tag?: string) {
  try {
    const reg = await getRegistration(2000);
    reg?.active?.postMessage({ type: 'CLEAR_NOTIFICATIONS', tag });
    if (!tag && 'clearAppBadge' in navigator) await (navigator as any).clearAppBadge();
  } catch {
    /* best effort */
  }
}

export async function setAppBadge(count: number) {
  try {
    if (!('setAppBadge' in navigator)) return;
    if (count > 0) await (navigator as any).setAppBadge(count);
    else await (navigator as any).clearAppBadge();
  } catch {
    /* unsupported */
  }
}
