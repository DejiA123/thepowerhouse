import webpush from 'https://esm.sh/web-push@3.6.7';
import { supabaseAdmin } from './supabaseAdmin.ts';
import { church } from './church.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? church.website;

/** Where notification taps open the app */
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? church.appUrl;
const isApple = (endpoint: string) => {
  try {
    return new URL(endpoint).hostname.endsWith('push.apple.com');
  } catch {
    return false;
  }
};

export const vapidPublicKey = VAPID_PUBLIC_KEY;
export const pushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

export interface PushSubscriptionRow {
  id: string;
  user_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
  /** The phone's encryption device (chat notifications carry the key sealed for it) */
  device_id?: string | null;
}

export interface PushPayload {
  kind: 'chat' | 'call' | 'call-missed' | 'choir' | 'prayer' | 'test' | 'general' | 'reminder';
  title: string;
  body: string;
  url: string;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: { action: string; title: string }[];
  image?: string;
  data?: Record<string, unknown>;
}

export interface SendOptions {
  ttl?: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  topic?: string;
}

/** The two forms of one payload: the usual one, and Apple's (see below) */
function bodiesFor(payload: PushPayload, timestamp: number) {
  const message = { ...payload, timestamp };
  const body = JSON.stringify(message);
  // An encrypted chat message only makes sense once the phone opens it, so iPhones get the
  // ordinary form: iOS must then run push-sw.js, which opens it and shows the real text.
  // (With the declarative form iOS may show its "🔒 New message" text without running it.)
  if (payload.data && (payload.data as { e2e?: unknown }).e2e) return { body, appleBody: body };
  return {
    body,
    // iPhones and iPads (Apple's push service) also get Apple's "declarative"
    // form. From iOS 18.4 the phone shows that by itself, without waking the
    // app's background code, unless it's marked `mutable`: then the code
    // (public/push-sw.js) runs and replaces it (opening an encrypted message,
    // for one). If the code fails, the declarative one still shows.
    appleBody: JSON.stringify({
      ...message,
      web_push: 8030,
      notification: {
        title: payload.title,
        body: payload.body,
        navigate: new URL(payload.url || '/', APP_ORIGIN).href,
        mutable: true,
        ...(payload.tag ? { tag: payload.tag } : {}),
      },
    }),
  };
}

/**
 * Encrypt and deliver one payload to many subscriptions (or a payload made
 * for each one: an encrypted chat message carries that person's own sealed key).
 * Expired subscriptions (404/410) are removed; other failures are counted so
 * that endpoints which keep failing are eventually pruned.
 */
export async function sendToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload | ((sub: PushSubscriptionRow) => PushPayload),
  options: SendOptions = {},
): Promise<{ sent: number; failed: number; removed: number }> {
  if (!pushConfigured || subscriptions.length === 0) return { sent: 0, failed: 0, removed: 0 };

  const timestamp = Date.now();
  const shared = typeof payload === 'function' ? null : bodiesFor(payload, timestamp);
  const expired: string[] = [];
  const failed: PushSubscriptionRow[] = [];
  const succeeded: string[] = [];

  // Deduplicate endpoints (a user can be matched by id and topic at the same time)
  const unique = Array.from(new Map(subscriptions.map((s) => [s.endpoint, s])).values());

  const deliver = async (sub: PushSubscriptionRow) => {
    try {
      const details = webpush.generateRequestDetails(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        (() => {
          const bodies = shared ?? bodiesFor((payload as (sub: PushSubscriptionRow) => PushPayload)(sub), timestamp);
          return isApple(sub.endpoint) ? bodies.appleBody : bodies.body;
        })(),
        {
          vapidDetails: { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY },
          TTL: options.ttl ?? 60 * 60 * 24,
          urgency: options.urgency ?? 'normal',
          topic: options.topic,
        },
      );
      const res = await fetch(details.endpoint, {
        method: details.method,
        headers: details.headers as Record<string, string>,
        body: details.body as Uint8Array,
      });
      if (res.status === 404 || res.status === 410) {
        expired.push(sub.id);
      } else if (!res.ok) {
        console.warn('push failed', res.status, await res.text().catch(() => ''));
        failed.push(sub);
      } else {
        succeeded.push(sub.id);
      }
    } catch (err) {
      console.error('push error', err);
      failed.push(sub);
    }
  };

  // Deliver in small batches so a big group does not exhaust sockets
  for (let i = 0; i < unique.length; i += 25) {
    await Promise.all(unique.slice(i, i + 25).map(deliver));
  }

  if (expired.length) {
    await supabaseAdmin.from('push_subscriptions').delete().in('id', expired);
  }
  const now = new Date().toISOString();
  if (succeeded.length) {
    await supabaseAdmin
      .from('push_subscriptions')
      .update({ failure_count: 0, last_success_at: now })
      .in('id', succeeded);
  }
  for (const sub of failed) {
    if (sub.failure_count >= 9) {
      await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
    } else {
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ failure_count: sub.failure_count + 1, updated_at: now })
        .eq('id', sub.id);
    }
  }

  return { sent: succeeded.length, failed: failed.length, removed: expired.length };
}

const SUB_COLUMNS = 'id, user_id, endpoint, p256dh, auth, failure_count';

export async function subscriptionsForUsers(userIds: string[]): Promise<PushSubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const withDevice = await supabaseAdmin
    .from('push_subscriptions')
    .select(`${SUB_COLUMNS}, device_id`)
    .in('user_id', userIds);
  if (!withDevice.error) return (withDevice.data ?? []) as PushSubscriptionRow[];
  // Before the device column exists
  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select(SUB_COLUMNS)
    .in('user_id', userIds);
  if (error) throw error;
  return (data ?? []) as PushSubscriptionRow[];
}

export async function subscriptionsForTopic(topic: string): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select(SUB_COLUMNS)
    .contains('topics', [topic]);
  if (error) throw error;
  return (data ?? []) as PushSubscriptionRow[];
}
