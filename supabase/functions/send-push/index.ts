// Fans out Web Push notifications. Recipients are always computed here on the
// server from the database, never taken from the client, so the endpoint can
// only notify people who genuinely share a chat / follow a choir.
import { corsHeaders, json } from '../_shared/cors.ts';
import { getRequestUser, supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import {
  pushConfigured,
  sendToSubscriptions,
  subscriptionsForTopic,
  subscriptionsForUsers,
  type PushSubscriptionRow,
} from '../_shared/webpush.ts';

const FRESH_MS = 10 * 60 * 1000; // only notify about things created in the last 10 minutes

const isFresh = (iso?: string | null) => !!iso && Date.now() - new Date(iso).getTime() < FRESH_MS;

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

async function displayName(userId: string, fallback = 'Someone') {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .maybeSingle();
  return data?.full_name?.trim() || data?.email?.split('@')[0] || fallback;
}

async function chatRecipients(chatId: string, excludeUserId: string) {
  const { data: participants } = await supabaseAdmin
    .from('chat_participants')
    .select('user_id')
    .eq('chat_id', chatId);
  const ids = (participants ?? []).map((p) => p.user_id).filter((id) => id !== excludeUserId);
  if (ids.length === 0) return [];

  // Respect "group chat notifications" switched off in settings
  const { data: prefs } = await supabaseAdmin
    .from('notification_preferences')
    .select('user_id, group_chat_notifications')
    .in('user_id', ids);
  const muted = new Set((prefs ?? []).filter((p) => p.group_chat_notifications === false).map((p) => p.user_id));
  return ids.filter((id) => !muted.has(id));
}

const SET_LABELS: Record<string, string> = {
  praise: 'Praise Set',
  worship: 'Worship Set',
  special: 'Special Number',
  hymns: 'Hymns',
  thanksgiving: 'Thanksgiving Set',
  offering: 'Offering Set',
  learning: 'Learning Songs',
};

const setLabel = (setType: string) => {
  const [base, day] = setType.split('_d');
  const label = SET_LABELS[base] ?? base.charAt(0).toUpperCase() + base.slice(1);
  return day ? `${label} (Day ${day})` : label;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!pushConfigured) return json({ ok: false, reason: 'push-not-configured' });

  try {
    const body = await req.json();
    const type = body?.type as string;
    const user = await getRequestUser(req);

    // ── Chat message ────────────────────────────────────────────────
    if (type === 'chat-message') {
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: message } = await supabaseAdmin
        .from('chat_messages')
        .select('id, chat_id, user_id, content, created_at')
        .eq('id', body.messageId)
        .maybeSingle();
      if (!message || message.user_id !== user.id || !isFresh(message.created_at)) {
        return json({ error: 'Message not found' }, 404);
      }

      const [{ data: chat }, sender, recipients] = await Promise.all([
        supabaseAdmin.from('group_chats').select('name').eq('id', message.chat_id).maybeSingle(),
        displayName(user.id),
        chatRecipients(message.chat_id, user.id),
      ]);
      const chatName = chat?.name ?? 'Group chat';
      // Photo messages are stored as "::image::<url>\n<caption>"
      const isPhoto = message.content.startsWith('::image::');
      const lines = message.content.split('\n');
      const photoUrl = isPhoto ? lines[0].slice('::image::'.length).trim() : undefined;
      const caption = isPhoto ? lines.slice(1).join(' ').trim() : message.content;
      const preview = isPhoto
        ? (caption ? `📷 ${truncate(caption, 150)}` : '📷 Photo')
        : truncate(caption.replace(/\s+/g, ' ').trim(), 160);

      // Keep the in-app notification centre in sync
      if (recipients.length) {
        await supabaseAdmin.from('chat_notifications').insert(
          recipients.map((uid) => ({
            user_id: uid,
            group_name: chatName,
            message_id: message.id,
            sender_name: sender,
            message_preview: preview,
            is_read: false,
          })),
        ).then(({ error }) => error && console.warn('chat_notifications insert', error.message));
      }

      const result = await sendToSubscriptions(await subscriptionsForUsers(recipients), {
        kind: 'chat',
        title: chatName,
        body: `${sender}: ${preview}`,
        url: `/group-chats?chat=${message.chat_id}`,
        tag: `chat-${message.chat_id}`,
        renotify: true,
        image: isPhoto ? photoUrl : undefined,
        data: { chatId: message.chat_id, messageId: message.id },
      }, { ttl: 60 * 60 * 24, urgency: 'high', topic: `chat-${message.chat_id}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) });
      return json({ ok: true, ...result });
    }

    // ── Incoming call / missed call ─────────────────────────────────
    if (type === 'call' || type === 'call-missed') {
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: call } = await supabaseAdmin
        .from('call_sessions')
        .select('id, chat_id, initiated_by, call_type, status, started_at')
        .eq('id', body.callId)
        .maybeSingle();
      if (!call || call.initiated_by !== user.id) return json({ error: 'Call not found' }, 404);
      if (type === 'call' && call.status !== 'ringing' && call.status !== 'active') {
        return json({ ok: true, skipped: 'call-over' });
      }

      const [{ data: chat }, caller, recipients] = await Promise.all([
        supabaseAdmin.from('group_chats').select('name').eq('id', call.chat_id).maybeSingle(),
        displayName(user.id),
        chatRecipients(call.chat_id, user.id),
      ]);
      const chatName = chat?.name ?? 'Group chat';
      const isVideo = call.call_type === 'video';
      const subs: PushSubscriptionRow[] = await subscriptionsForUsers(recipients);

      if (type === 'call') {
        const result = await sendToSubscriptions(subs, {
          kind: 'call',
          title: `${isVideo ? '📹 Video' : '📞 Voice'} call · ${chatName}`,
          body: `${caller} is calling. Tap to join.`,
          url: `/group-chats?chat=${call.chat_id}&call=${call.id}`,
          tag: `call-${call.id}`,
          renotify: true,
          requireInteraction: true,
          vibrate: [400, 200, 400, 200, 400, 200, 400],
          actions: [
            { action: 'answer', title: 'Join' },
            { action: 'decline', title: 'Decline' },
          ],
          data: { callId: call.id, chatId: call.chat_id, callType: call.call_type },
        }, { ttl: 45, urgency: 'high' });
        return json({ ok: true, ...result });
      }

      const result = await sendToSubscriptions(subs, {
        kind: 'call-missed',
        title: `Missed ${isVideo ? 'video' : 'voice'} call`,
        body: `${caller} called ${chatName}`,
        url: `/group-chats?chat=${call.chat_id}`,
        tag: `call-${call.id}`,
        renotify: false,
        data: { callId: call.id, chatId: call.chat_id },
      }, { ttl: 60 * 60 * 24, urgency: 'normal' });
      return json({ ok: true, ...result });
    }

    // ── Choir: new song(s) ──────────────────────────────────────────
    if (type === 'choir-song') {
      const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === 'string').slice(0, 50) : [];
      if (ids.length === 0) return json({ error: 'No songs' }, 400);
      const table = body.table === 'library' ? 'choir_songs' : 'choir_weekly_set_songs';
      const columns = table === 'choir_songs' ? 'id, title, location, created_at, folder_id' : 'id, title, location, created_at, set_type';
      const { data: rows } = await supabaseAdmin.from(table).select(columns).in('id', ids);
      const songs = (rows ?? []).filter((s: any) => isFresh(s.created_at) && s.location) as any[];
      if (songs.length === 0) return json({ ok: true, skipped: 'nothing-new' });

      const location = songs[0].location as string;
      const sameLocation = songs.filter((s) => s.location === location);

      let where = '';
      if (table === 'choir_weekly_set_songs') {
        const labels = Array.from(new Set(sameLocation.map((s) => setLabel(s.set_type))));
        where = labels.length === 1 ? labels[0] : "this week's setlist";
      } else {
        const { data: folder } = await supabaseAdmin
          .from('choir_folders').select('name').eq('id', sameLocation[0].folder_id).maybeSingle();
        where = folder?.name ? `the “${folder.name}” folder` : 'the song library';
      }

      const actor = user ? await displayName(user.id, '') : '';
      const count = sameLocation.length;
      const titles = sameLocation.slice(0, 3).map((s) => `“${s.title}”`).join(', ');
      const more = count > 3 ? ` +${count - 3} more` : '';
      const lead = actor ? `${actor} added ` : 'Added ';

      let subs = await subscriptionsForTopic(`choir:${location}`);
      const exclude = typeof body.excludeEndpoint === 'string' ? body.excludeEndpoint : null;
      subs = subs.filter((s) => s.endpoint !== exclude && (!user || s.user_id !== user.id));

      const result = await sendToSubscriptions(subs, {
        kind: 'choir',
        title: count === 1 ? '🎵 New song added' : `🎵 ${count} new songs added`,
        body: `${lead}${titles}${more} to ${where}`,
        url: `/groups/choir/${location}`,
        tag: `choir-${location}`,
        renotify: true,
        data: { location, songIds: sameLocation.map((s) => s.id) },
      }, { ttl: 60 * 60 * 24 * 3, urgency: 'normal' });
      return json({ ok: true, ...result });
    }

    // ── Test notification to this user's own devices ────────────────
    if (type === 'test') {
      let subs: PushSubscriptionRow[] = [];
      if (user) subs = await subscriptionsForUsers([user.id]);
      if (typeof body.endpoint === 'string') {
        const { data } = await supabaseAdmin
          .from('push_subscriptions')
          .select('id, user_id, endpoint, p256dh, auth, failure_count')
          .eq('endpoint', body.endpoint);
        subs = subs.concat((data ?? []) as PushSubscriptionRow[]);
      }
      const result = await sendToSubscriptions(subs, {
        kind: 'test',
        title: 'Notifications are on 🎉',
        body: "You'll now get messages, calls and choir updates from The Power House.",
        url: '/',
        tag: 'test',
      }, { ttl: 300, urgency: 'high' });
      return json({ ok: true, ...result });
    }

    return json({ error: 'Unknown type' }, 400);
  } catch (error) {
    console.error('send-push error', error);
    return json({ error: (error as Error).message ?? 'Unexpected error' }, 500);
  }
});
