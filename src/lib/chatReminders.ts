import { supabase } from '@/integrations/supabase/client';
import { church } from '@/config/church';

/**
 * Group reminders (automations): a group's admins set reminders the app posts into the
 * group at set times (migration 20261107240000). Each one is a card in the chat
 * (chat_reminder_sends) plus a notification to the members, sent by the chat-reminders
 * function every minute while one is due. Up to 10 a group.
 */
export type Repeat = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ChatReminder {
  id: string;
  chat_id: string;
  created_by: string | null;
  message: string;
  repeat: Repeat;
  /** weekly: 0 = Sunday … 6 = Saturday */
  days: number[];
  day_of_month: number | null;
  on_date: string | null;
  /** "HH:MM:SS" */
  at_time: string;
  time_zone: string;
  ends_on: string | null;
  active: boolean;
  next_run_at: string | null;
  last_sent_at: string | null;
}

export interface ReminderSend {
  id: string;
  reminder_id: string | null;
  chat_id: string;
  message: string;
  sent_at: string;
  set_by: string | null;
}

export type ReminderDraft = Pick<ChatReminder, 'message' | 'repeat' | 'days' | 'day_of_month' | 'on_date' | 'at_time' | 'ends_on' | 'active'> & { time_zone?: string };

export const MAX_REMINDERS = 10;
export const REMINDER_TIME_ZONE = church.locale.timeZone && church.locale.timeZone !== 'UTC' ? church.locale.timeZone : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// The tables are new: typed loosely until the generated types catch up
const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a?: Record<string, unknown>) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function listReminders(chatId: string): Promise<ChatReminder[]> {
  const { data, error } = await db.from('chat_reminders').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatReminder[];
}

export async function saveReminder(chatId: string, draft: ReminderDraft, id?: string): Promise<ChatReminder> {
  const row = {
    message: draft.message.trim(),
    repeat: draft.repeat,
    days: draft.repeat === 'weekly' ? [...new Set(draft.days)].sort() : [],
    day_of_month: draft.repeat === 'monthly' ? draft.day_of_month : null,
    on_date: draft.repeat === 'once' ? draft.on_date : null,
    at_time: draft.at_time.length === 5 ? `${draft.at_time}:00` : draft.at_time,
    ends_on: draft.repeat === 'once' ? null : draft.ends_on || null,
    active: draft.active,
    time_zone: draft.time_zone ?? REMINDER_TIME_ZONE,
  };
  const q = id ? db.from('chat_reminders').update(row).eq('id', id) : db.from('chat_reminders').insert({ ...row, chat_id: chatId });
  const { data, error } = await q.select('*').single();
  if (error) throw error;
  return data as ChatReminder;
}

export async function deleteReminder(id: string) {
  const { error } = await db.from('chat_reminders').delete().eq('id', id);
  if (error) throw error;
}

/** "Send now": posts it into the group at once, then has members notified */
export async function sendReminderNow(id: string): Promise<ReminderSend> {
  const { data, error } = await db.rpc('send_chat_reminder_now', { _reminder_id: id });
  if (error) throw error;
  void supabase.functions.invoke('chat-reminders', { body: {} }).catch(() => undefined);
  return data as ReminderSend;
}

/** The group's sent reminders (the cards in the chat), newest last */
export async function listSends(chatId: string, limit = 60): Promise<ReminderSend[]> {
  const { data, error } = await db.from('chat_reminder_sends').select('id, reminder_id, chat_id, message, sent_at, set_by').eq('chat_id', chatId).order('sent_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return ((data ?? []) as ReminderSend[]).reverse();
}

// ── Describing a schedule ───────────────────────────────────────────────
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** "10:00" or "10:00 am", as the phone shows times */
export function clockOf(atTime: string) {
  const [h, m] = atTime.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;

/** "Every Saturday at 10:00", "Every Tuesday and Friday at 19:30", "On Wed 24 Dec at 08:00" */
export function describeSchedule(r: Pick<ChatReminder, 'repeat' | 'days' | 'day_of_month' | 'on_date' | 'at_time' | 'ends_on'>) {
  const at = clockOf(r.at_time);
  let when: string;
  if (r.repeat === 'daily') when = 'Every day';
  else if (r.repeat === 'monthly') when = `Every month on the ${ordinal(r.day_of_month ?? 1)}`;
  else if (r.repeat === 'once') {
    when = r.on_date ? `On ${new Date(`${r.on_date}T12:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}` : 'Once';
  } else {
    const days = [...r.days].sort((a, b) => a - b);
    if (days.length === 7) when = 'Every day';
    else if (days.join() === '1,2,3,4,5') when = 'Every weekday';
    else if (days.join() === '0,6') when = 'Every weekend';
    else {
      const names = days.map((d) => DAY_NAMES[d]);
      when = `Every ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? ''}`;
    }
  }
  const until = r.ends_on && r.repeat !== 'once' ? `, until ${new Date(`${r.ends_on}T12:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' })}` : '';
  return `${when} at ${at}${until}`;
}

/** "Next: Sat 9 Nov, 10:00" (in the phone's own time) */
export function nextLabel(r: Pick<ChatReminder, 'active' | 'next_run_at' | 'repeat' | 'last_sent_at'>) {
  if (!r.active) return r.repeat === 'once' && r.last_sent_at ? 'Sent' : 'Paused';
  if (!r.next_run_at) return 'No more to send';
  const d = new Date(r.next_run_at);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const day = d.toDateString() === today.toDateString() ? 'Today' : d.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return `Next: ${day}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

/** Ready-made reminders to start from */
export const REMINDER_TEMPLATES: { label: string; draft: Partial<ReminderDraft> }[] = [
  { label: 'Evangelism outreach', draft: { message: '📣 *Evangelism outreach today!*\n\n🕙 10:00 am\n📍 Meeting point: \n\nCome ready to share the good news. Bring a friend! 🙏', repeat: 'weekly', days: [6], at_time: '08:00' } },
  { label: 'Day before', draft: { message: '⏰ *Reminder:* we meet *tomorrow* at 10:00 am for evangelism.\n\nPlease reply if you can make it 🙌', repeat: 'weekly', days: [5], at_time: '18:00' } },
  { label: 'Prayer meeting', draft: { message: '🙏 *Prayer meeting tonight* at 7:30 pm.\n\n"Pray without ceasing." 1 Thessalonians 5:17', repeat: 'weekly', days: [3], at_time: '17:00' } },
  { label: 'Rehearsal', draft: { message: '🎶 *Rehearsal today* at 6:00 pm. Please be on time and bring your setlist.', repeat: 'weekly', days: [4], at_time: '12:00' } },
  { label: 'Sunday service', draft: { message: '⛪ *Join us for Sunday service* at 10:00 am. See you there! ✨', repeat: 'weekly', days: [0], at_time: '08:00' } },
];
