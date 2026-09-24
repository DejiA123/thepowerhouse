import webpush from 'npm:web-push@3.6.7';
import { supabaseAdmin } from './supabaseAdmin.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'https://www.thepowerhouseinternational.org';

export const vapidPublicKey = VAPID_PUBLIC_KEY;
export const pushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

export interface PushSubscriptionRow {
  id: string;
  user_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
}

export interface PushPayload {
  kind: 'chat' | 'call' | 'call-missed' | 'choir' | 'prayer' | 'test' | 'general';
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

/**
 * Encrypt and deliver one payload to many subscriptions.
 * Expired subscriptions (404/410) are removed; other failures are counted so
 * that endpoints which keep failing are eventually pruned.
 */
export async function sendToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
  options: SendOptions = {},
): Promise<{ sent: number; failed: number; removed: number }> {
  if (!pushConfigured || subscriptions.length === 0) return { sent: 0, failed: 0, removed: 0 };

  const body = JSON.stringify({ ...payload, timestamp: Date.now() });
  const expired: string[] = [];
  const failed: PushSubscriptionRow[] = [];
  const succeeded: string[] = [];

  // Deduplicate endpoints (a user can be matched by id and topic at the same time)
  const unique = Array.from(new Map(subscriptions.map((s) => [s.endpoint, s])).values());

  const deliver = async (sub: PushSubscriptionRow) => {
    try {
      const details = webpush.generateRequestDetails(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
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
