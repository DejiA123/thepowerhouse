// Group reminders (automations): sends the reminders that are due and tells the group's
// members, like a message notification. Called every minute by the cron job
// chat-reminders while one is due (migration 20261107240000), and by the app right after
// an admin's "Send now". It only ever acts on reminders the database says are due, or
// sends made in the last 15 minutes that haven't been notified yet, so it needs no account.
//
// A reminder is a card in the chat (chat_reminder_sends), never an encrypted message: the
// app can't encrypt for a group by itself. Its words are kept on the server, like the
// group's name, and the reminder editor says so.
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { pushConfigured, sendToSubscriptions, subscriptionsForUsers } from '../_shared/webpush.ts';

interface Send {
  id: string;
  chat_id: string;
  message: string;
  sent_at: string;
}

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** The words without WhatsApp's marks (*bold* → bold), for the notification */
const plain = (text: string) =>
  text
    .replace(/```([\s\S]*?)```/g, '$1')
    .replace(/(^|[\s\p{P}])([*_~`])(?!\s)([^\n]*?\S)\2(?=$|[\s\p{P}])/gu, '$1$3')
    .replace(/@\[([^\]\n]{1,80})\]\([0-9a-f-]{36}\)/g, '@$1')
    .replace(/\s+/g, ' ')
    .trim();

/** The group's members who want its notifications (not muted, group notifications on) */
async function recipients(chatId: string): Promise<string[]> {
  const { data: people } = await supabaseAdmin.from('chat_participants').select('user_id, muted_until').eq('chat_id', chatId);
  const now = Date.now();
  const ids = (people ?? [])
    .filter((p: { muted_until: string | null }) => !p.muted_until || new Date(p.muted_until).getTime() <= now)
    .map((p: { user_id: string }) => p.user_id);
  if (!ids.length) return [];
  const { data: prefs } = await supabaseAdmin.from('notification_preferences').select('user_id, group_chat_notifications').in('user_id', ids);
  const off = new Set((prefs ?? []).filter((p: { group_chat_notifications: boolean | null }) => p.group_chat_notifications === false).map((p: { user_id: string }) => p.user_id));
  return ids.filter((id) => !off.has(id));
}

async function notify(send: Send) {
  const { data: chat } = await supabaseAdmin.from('group_chats').select('name').eq('id', send.chat_id).maybeSingle();
  const people = await recipients(send.chat_id);
  if (!people.length) return { sent: 0 };
  return sendToSubscriptions(
    await subscriptionsForUsers(people),
    {
      kind: 'general',
      title: chat?.name?.trim() || 'Group reminder',
      body: `⏰ ${truncate(plain(send.message), 180)}`,
      url: `/group-chats?chat=${send.chat_id}`,
      tag: `reminder-${send.id}`,
      data: { chatId: send.chat_id, reminderSendId: send.id },
    },
    { ttl: 60 * 60 * 6, urgency: 'high' },
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    // 1. Send whatever is due (the database moves each reminder on to its next time)
    const { data: due, error } = await supabaseAdmin.rpc('run_due_chat_reminders');
    if (error) console.error('[chat-reminders] run_due', error.message);
    // 2. Tell the members about every send not yet notified (due ones, and "Send now"),
    //    each exactly once: claimed by setting pushed_at
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: claimed } = await supabaseAdmin
      .from('chat_reminder_sends')
      .update({ pushed_at: new Date().toISOString() })
      .is('pushed_at', null)
      .gt('sent_at', since)
      .select('id, chat_id, message, sent_at');
    const sends = (claimed ?? []) as Send[];
    if (pushConfigured) {
      for (const s of sends) {
        try {
          await notify(s);
        } catch (e) {
          console.error('[chat-reminders] notify failed', s.id, String(e));
        }
      }
    }
    return json({ ok: true, due: Array.isArray(due) ? due.length : 0, notified: sends.length });
  } catch (e) {
    console.error('[chat-reminders]', String(e));
    return json({ error: 'Something went wrong' }, 500);
  }
});
