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
import { church } from '../_shared/church.ts';

const FRESH_MS = 10 * 60 * 1000; // only notify about things created in the last 10 minutes

const E2E_PREFIX = '::e2e::1:';
/** Sealed keys sent per person (one per phone or browser), so a notification stays well under 4 KB */
const MAX_SEALED = 4;
/** Web Push carries about 4 KB, and Apple's form adds a copy of the title and text */
const MAX_PAYLOAD = 3300;

// A chat between two friends (Social Circle) is stored as "A & B" with this description.
// Its notifications show just the other person, like a text message or phone call.
const PRIVATE_CHAT = 'Private chat';

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

/** Who the sender says a message mentions (ids, or ['all']) */
function mentionOpts(raw: unknown): { mentioned?: Set<string>; everyone?: boolean } {
  if (!Array.isArray(raw)) return {};
  if (raw.includes('all')) return { everyone: true };
  const ids = raw.filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 50);
  return ids.length ? { mentioned: new Set(ids) } : {};
}

async function chatRecipients(chatId: string, excludeUserId: string, opts: { skipMuted?: boolean; mentioned?: Set<string>; everyone?: boolean } = {}) {
  const { data: participants } = await supabaseAdmin
    .from('chat_participants')
    .select('*')
    .eq('chat_id', chatId);
  const now = Date.now();
  const ids = (participants ?? [])
    .filter((p: any) => p.user_id !== excludeUserId)
    // A chat someone muted stays quiet for messages (calls still ring, like WhatsApp)
    // …unless it mentions them (or @all), like WhatsApp
    .filter((p: any) => !opts.skipMuted || !p.muted_until || new Date(p.muted_until).getTime() <= now || opts.everyone || opts.mentioned?.has(p.user_id))
    .map((p: any) => p.user_id as string);
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
        supabaseAdmin.from('group_chats').select('name, description').eq('id', message.chat_id).maybeSingle(),
        displayName(user.id),
        chatRecipients(message.chat_id, user.id, { skipMuted: true, ...mentionOpts(body.mentions) }),
      ]);
      const isPrivate = chat?.description === PRIVATE_CHAT;
      const chatName = isPrivate ? sender : chat?.name ?? 'Group chat';
      // End-to-end encrypted: this server can't read it. The phone opens it (push-sw.js) with its own key.
      const encrypted = message.content.startsWith(E2E_PREFIX);
      // Photos / GIFs are stored as "::image::<url>\n<caption>", videos as "::video::<url>\n<caption>"
      const isPhoto = !encrypted && message.content.startsWith('::image::');
      const isVideo = !encrypted && message.content.startsWith('::video::');
      const lines = message.content.split('\n');
      const photoUrl = isPhoto ? lines[0].slice('::image::'.length).trim() : undefined;
      const isGif = !!photoUrl && /\.gif(?:$|[?#])/i.test(photoUrl);
      const caption = isPhoto || isVideo ? lines.slice(1).join(' ').trim() : message.content;
      const [icon, label] = isVideo ? ['🎥', 'Video'] : isGif ? ['🎞️', 'GIF'] : ['📷', 'Photo'];
      const isVoice = !encrypted && message.content.startsWith('::voice::');
      const isFile = !encrypted && message.content.startsWith('::file::');
      const preview = encrypted
        ? '🔒 New message'
        : isVoice
        ? '🎤 Voice message'
        : isFile
        ? `📄 ${decodeURIComponent(message.content.match(/^::file::\d+:([^:\n]*):/)?.[1] || 'Document')}`
        : isPhoto || isVideo
        ? (caption ? `${icon} ${truncate(caption, 150)}` : `${icon} ${label}`)
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

      // Encrypted: the phone shows the real text (push-sw.js opens it with its own key).
      // What it opens: the sender's short preview line (encrypted with the same key),
      // or the message itself when it's small enough for a notification (4 KB at most)
      const keyId = encrypted ? message.content.slice(E2E_PREFIX.length).split(':')[0] : '';
      const sentPreview = typeof body.e2ePreview === 'string' && body.e2ePreview.startsWith(`${E2E_PREFIX}${keyId}:`) && body.e2ePreview.length <= 1200
        ? body.e2ePreview
        : null;
      const e2eText = encrypted ? sentPreview ?? (message.content.length <= 1500 ? message.content : null) : null;
      // Each person's own copy of the chat key, sealed for their phones (useless to anyone
      // else), so a phone that hasn't got the key yet can still open the notification
      const sealedFor = new Map<string, { d: string; w: string; f: string }[]>();
      // Every copy, by device: each phone gets the one sealed for it first
      const sealedByDevice = new Map<string, { d: string; w: string; f: string }>();
      if (e2eText && recipients.length) {
        const { data: keys } = await supabaseAdmin
          .from('chat_keys')
          .select('user_id, device_id, wrapped_key, from_public_key, created_at')
          .eq('chat_id', message.chat_id)
          .eq('key_id', keyId)
          .in('user_id', recipients)
          .order('created_at', { ascending: false });
        for (const k of (keys ?? []) as { user_id: string; device_id: string; wrapped_key: string; from_public_key: string }[]) {
          if (!sealedByDevice.has(k.device_id)) sealedByDevice.set(k.device_id, { d: k.device_id, w: k.wrapped_key, f: k.from_public_key });
          const list = sealedFor.get(k.user_id) ?? [];
          if (list.length < MAX_SEALED) list.push({ d: k.device_id, w: k.wrapped_key, f: k.from_public_key });
          sealedFor.set(k.user_id, list);
        }
      }

      const base = {
        kind: 'chat' as const,
        title: chatName,
        body: isPrivate ? preview : `${sender}: ${preview}`,
        // Opens the chat at this message
        url: `/group-chats?chat=${message.chat_id}&message=${message.id}`,
        tag: `chat-${message.chat_id}`,
        renotify: true,
        image: isPhoto ? photoUrl : undefined,
      };
      const plainData = { chatId: message.chat_id, messageId: message.id };
      const result = await sendToSubscriptions(
        await subscriptionsForUsers(recipients),
        (sub) => {
          const newest = sub.user_id ? sealedFor.get(sub.user_id) ?? [] : [];
          const own = sub.device_id ? sealedByDevice.get(sub.device_id) : undefined;
          // This phone's own copy first (always fits), then the newest others in case it has another account's device
          const sealed = own ? [own, ...newest.filter((c) => c.d !== own.d)].slice(0, MAX_SEALED) : newest;
          const make = (withText: boolean, keys: { d: string; w: string; f: string }[]) => ({
            ...base,
            data: {
              ...plainData,
              // Still scrambled: only the phone can open it
              ...(withText && !!e2eText && { e2e: e2eText, e2ePrefix: isPrivate ? '' : `${sender}: ` }),
              ...(withText && keys.length > 0 && { sealed: keys }),
            },
          });
          // Too big to deliver: keep only this phone's own key, then drop the keys, then the text ("🔒 New message")
          const tries: [boolean, { d: string; w: string; f: string }[]][] = [[true, sealed], ...(own ? [[true, [own]] as [boolean, typeof sealed]] : []), [true, []], [false, []]];
          for (const [text, keys] of tries) {
            const payload = make(text, keys);
            if (JSON.stringify(payload).length <= MAX_PAYLOAD) return payload;
          }
          return make(false, []);
        },
        { ttl: 60 * 60 * 24, urgency: 'high', topic: `chat-${message.chat_id}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) },
      );
      return json({ ok: true, ...result });
    }

    // ── Someone in a call rang me into it ───────────────────────────
    if (type === 'call-invite') {
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const { data: invite } = await supabaseAdmin
        .from('call_invites')
        .select('call_id, user_id, invited_by, status, created_at')
        .eq('call_id', body.callId)
        .eq('user_id', body.userId)
        .maybeSingle();
      if (!invite || invite.invited_by !== user.id || invite.status !== 'ringing' || !isFresh(invite.created_at)) {
        return json({ error: 'Invite not found' }, 404);
      }
      const { data: call } = await supabaseAdmin
        .from('call_sessions')
        .select('id, chat_id, call_type, status')
        .eq('id', invite.call_id)
        .maybeSingle();
      if (!call || (call.status !== 'ringing' && call.status !== 'active')) return json({ ok: true, skipped: 'call-over' });
      const caller = await displayName(user.id);
      const isVideo = call.call_type === 'video';
      const result = await sendToSubscriptions(await subscriptionsForUsers([invite.user_id]), {
        kind: 'call',
        title: caller,
        body: isVideo ? '📹 Inviting you to a video call' : '📞 Inviting you to a voice call',
        url: `/group-chats?call=${call.id}`,
        tag: `call-${call.id}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [400, 200, 400, 200, 400, 200, 400],
        actions: [
          { action: 'answer', title: 'Join' },
          { action: 'decline', title: 'Decline' },
        ],
        data: { callId: call.id, chatId: call.chat_id, callType: call.call_type, invited: true },
      }, { ttl: 45, urgency: 'high' });
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
        supabaseAdmin.from('group_chats').select('name, description').eq('id', call.chat_id).maybeSingle(),
        displayName(user.id),
        chatRecipients(call.chat_id, user.id),
      ]);
      const isPrivate = chat?.description === PRIVATE_CHAT;
      const chatName = chat?.name ?? 'Group chat';
      const isVideo = call.call_type === 'video';
      const subs: PushSubscriptionRow[] = await subscriptionsForUsers(recipients);

      if (type === 'call') {
        const result = await sendToSubscriptions(subs, {
          kind: 'call',
          title: isPrivate ? caller : `${isVideo ? '📹 Video' : '📞 Voice'} call · ${chatName}`,
          body: isPrivate ? (isVideo ? '📹 Incoming video call' : '📞 Incoming voice call') : `${caller} is calling. Tap to join.`,
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
        title: isPrivate ? caller : `Missed ${isVideo ? 'video' : 'voice'} call`,
        body: isPrivate ? `Missed ${isVideo ? 'video' : 'voice'} call` : `${caller} called ${chatName}`,
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

    // ── Prayer Wall: someone is praying for your request ────────────
    if (type === 'prayer-prayed') {
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const requestId = typeof body.prayerRequestId === 'string' ? body.prayerRequestId : '';
      const [{ data: request }, { data: mine }] = await Promise.all([
        supabaseAdmin.from('prayer_requests').select('id, user_id, title').eq('id', requestId).maybeSingle(),
        supabaseAdmin
          .from('prayer_request_prayers')
          .select('created_at')
          .eq('prayer_request_id', requestId)
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (!request || !mine || !isFresh(mine.created_at)) return json({ error: 'Not found' }, 404);
      if (request.user_id === user.id) return json({ ok: true, skipped: 'own-request' });

      const [{ count }, name] = await Promise.all([
        supabaseAdmin
          .from('prayer_request_prayers')
          .select('user_id', { count: 'exact', head: true })
          .eq('prayer_request_id', requestId),
        displayName(user.id),
      ]);
      const others = Math.max(0, (count ?? 1) - 1);
      const result = await sendToSubscriptions(await subscriptionsForUsers([request.user_id]), {
        kind: 'prayer',
        title: '🙏 Someone is praying for you',
        body: others > 0
          ? `${name} and ${others} ${others === 1 ? 'other' : 'others'} are praying for “${truncate(request.title, 60)}”`
          : `${name} is praying for “${truncate(request.title, 60)}”`,
        url: '/prayer?tab=mine',
        // One notification per request that updates, instead of a pile of them
        tag: `prayer-${request.id}`,
        renotify: false,
        data: { prayerRequestId: request.id },
      }, { ttl: 60 * 60 * 24, urgency: 'normal' });
      return json({ ok: true, ...result });
    }

    // ── Test notification to this user's own devices ────────────────
    if (type === 'test') {
      let subs: PushSubscriptionRow[] = [];
      if (user) subs = await subscriptionsForUsers([user.id]);
      // Reminders and messages find a phone through the account it's linked to
      const linkedDevices = subs.length;
      let thisDeviceLinked = false;
      if (typeof body.endpoint === 'string') {
        const { data } = await supabaseAdmin
          .from('push_subscriptions')
          .select('id, user_id, endpoint, p256dh, auth, failure_count')
          .eq('endpoint', body.endpoint);
        const rows = (data ?? []) as PushSubscriptionRow[];
        thisDeviceLinked = !!user && rows.some((r) => r.user_id === user.id);
        subs = subs.concat(rows);
      }
      const result = await sendToSubscriptions(subs, {
        kind: 'test',
        title: 'Notifications are on 🎉',
        body: `You'll now get messages, calls and choir updates from ${church.name}.`,
        url: '/',
        tag: 'test',
      }, { ttl: 300, urgency: 'high' });
      return json({ ok: true, ...result, linkedDevices, thisDeviceLinked });
    }

    return json({ error: 'Unknown type' }, 400);
  } catch (error) {
    console.error('send-push error', error);
    return json({ error: (error as Error).message ?? 'Unexpected error' }, 500);
  }
});
