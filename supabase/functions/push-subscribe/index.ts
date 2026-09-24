// Registers, updates and removes Web Push subscriptions for this device.
// Works for signed-in users (subscription is linked to the user) and for
// anonymous visitors who only follow topics such as "choir:<location>".
import { corsHeaders, json } from '../_shared/cors.ts';
import { getRequestUser, supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { pushConfigured, vapidPublicKey } from '../_shared/webpush.ts';

const TOPIC_PATTERN = /^[a-z0-9:_-]{1,64}$/;
const MAX_TOPICS = 30;

const cleanTopics = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((t): t is string => typeof t === 'string' && TOPIC_PATTERN.test(t)).slice(0, MAX_TOPICS)
    : [];

const validEndpoint = (endpoint: unknown): endpoint is string => {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  try {
    return new URL(endpoint).protocol === 'https:';
  } catch {
    return false;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method === 'GET') {
    return json({ publicKey: vapidPublicKey, configured: pushConfigured });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'vapid') {
      return json({ publicKey: vapidPublicKey, configured: pushConfigured });
    }

    const user = await getRequestUser(req);

    if (action === 'subscribe') {
      const sub = body.subscription;
      if (!validEndpoint(sub?.endpoint) || typeof sub?.keys?.p256dh !== 'string' || typeof sub?.keys?.auth !== 'string') {
        return json({ error: 'Invalid subscription' }, 400);
      }

      const { data: existing } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, topics, user_id')
        .eq('endpoint', sub.endpoint)
        .maybeSingle();

      const topics = new Set<string>(existing?.topics ?? []);
      cleanTopics(body.topics).forEach((t) => topics.add(t));

      const row = {
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        // Signed-in devices are linked to the user; anonymous calls keep any existing link
        user_id: user?.id ?? existing?.user_id ?? null,
        topics: Array.from(topics).slice(0, MAX_TOPICS),
        user_agent: (req.headers.get('user-agent') ?? '').slice(0, 300),
        failure_count: 0,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .upsert(row, { onConflict: 'endpoint' });
      if (error) throw error;

      return json({ ok: true, topics: row.topics, linked: Boolean(row.user_id) });
    }

    if (!validEndpoint(body.endpoint)) {
      return json({ error: 'Missing endpoint' }, 400);
    }

    const { data: current } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, topics, user_id')
      .eq('endpoint', body.endpoint)
      .maybeSingle();

    if (action === 'status') {
      return json({
        subscribed: Boolean(current),
        topics: current?.topics ?? [],
        linked: Boolean(current?.user_id),
      });
    }

    if (!current) return json({ ok: true, subscribed: false });

    if (action === 'unsubscribe') {
      await supabaseAdmin.from('push_subscriptions').delete().eq('id', current.id);
      return json({ ok: true });
    }

    if (action === 'detach') {
      // Called on sign-out so a shared device stops receiving that user's messages
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ user_id: null, updated_at: new Date().toISOString() })
        .eq('id', current.id);
      return json({ ok: true });
    }

    if (action === 'topics') {
      const topics = new Set<string>(current.topics ?? []);
      cleanTopics(body.add).forEach((t) => topics.add(t));
      cleanTopics(body.remove).forEach((t) => topics.delete(t));
      const next = Array.from(topics).slice(0, MAX_TOPICS);
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ topics: next, updated_at: new Date().toISOString() })
        .eq('id', current.id);
      return json({ ok: true, topics: next });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('push-subscribe error', error);
    return json({ error: (error as Error).message ?? 'Unexpected error' }, 500);
  }
});
