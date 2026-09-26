// Daily Verse and Reading Reminder notifications.
//
// Called every minute by pg_cron (see migration 20260926090000_daily_reminders).
// Each person chooses their own times in Settings → Notifications; times are
// in their own time zone. A reminder goes out once a day, at or just after
// the chosen minute, and is skipped if it's more than two hours late (for
// example after an outage) so nobody is woken up by a stale reminder.
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { pushConfigured, sendToSubscriptions, subscriptionsForUsers } from '../_shared/webpush.ts';
import { scriptureForDate } from '../_shared/dailyScriptures.ts';

const LATE_LIMIT_MINUTES = 120;

const PLAN_NAMES: Record<string, string> = {
  'bible-year': 'Bible in a Year',
  'new-testament': 'New Testament in 90 Days',
  gospels: 'The Four Gospels',
  'john-21': 'John in 21 Days',
  'foundations-faith': 'Foundations of Faith',
  'psalms-proverbs': 'Psalms & Proverbs',
  'proverbs-month': 'Proverbs in a Month',
  'acts-28': 'Acts: The Church Is Born',
  epistles: "Paul's Letters",
  prophets: 'Major Prophets',
};

interface Prefs {
  user_id: string;
  daily_verse_enabled: boolean | null;
  daily_verse_time: string | null;
  reading_reminder_enabled: boolean | null;
  reading_reminder_time: string | null;
  timezone: string | null;
  daily_verse_last_sent: string | null;
  reading_reminder_last_sent: string | null;
}

interface LocalTime {
  year: number;
  month: number;
  day: number;
  minutes: number;
  /** YYYY-MM-DD */
  date: string;
}

function localTime(timeZone: string, now: Date): LocalTime {
  const read = (tz: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(now);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = read(timeZone || 'UTC');
  } catch {
    parts = read('UTC');
  }
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour') % 24;
  return {
    year,
    month,
    day,
    minutes: hour * 60 + get('minute'),
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

const toMinutes = (hhmm: string | null, fallback: string) => {
  const [h, m] = (hhmm || fallback).split(':').map(Number);
  return (Number.isFinite(h) ? h : 8) * 60 + (Number.isFinite(m) ? m : 0);
};

const isDue = (enabled: boolean | null, time: string | null, fallback: string, lastSent: string | null, local: LocalTime) => {
  if (!enabled || lastSent === local.date) return false;
  const target = toMinutes(time, fallback);
  return local.minutes >= target && local.minutes - target <= LATE_LIMIT_MINUTES;
};

/** Claim today's reminder for this person; false if another run already did. */
async function claim(userId: string, column: 'daily_verse_last_sent' | 'reading_reminder_last_sent', date: string) {
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .update({ [column]: date })
    .eq('user_id', userId)
    .or(`${column}.is.null,${column}.neq.${date}`)
    .select('user_id');
  return !error && (data?.length ?? 0) > 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!pushConfigured) return json({ ok: false, error: 'Push notifications are not configured' }, 503);

  const now = new Date();
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .select(
      'user_id, daily_verse_enabled, daily_verse_time, reading_reminder_enabled, reading_reminder_time, timezone, daily_verse_last_sent, reading_reminder_last_sent',
    )
    .or('daily_verse_enabled.eq.true,reading_reminder_enabled.eq.true');
  if (error) return json({ ok: false, error: error.message }, 500);

  let verses = 0;
  let readings = 0;

  for (const p of (data ?? []) as Prefs[]) {
    const local = localTime(p.timezone || 'UTC', now);

    if (isDue(p.daily_verse_enabled, p.daily_verse_time, '08:00', p.daily_verse_last_sent, local)) {
      if (await claim(p.user_id, 'daily_verse_last_sent', local.date)) {
        const verse = scriptureForDate(local.year, local.month, local.day);
        const result = await sendToSubscriptions(
          await subscriptionsForUsers([p.user_id]),
          {
            kind: 'reminder',
            title: `Verse of the day · ${verse.reference}`,
            body: verse.verse,
            url: '/',
            tag: 'daily-verse',
            data: { reminder: 'daily-verse', date: local.date },
          },
          { ttl: 60 * 60 * 6, urgency: 'normal', topic: 'daily-verse' },
        );
        verses += result.sent;
      }
    }

    if (isDue(p.reading_reminder_enabled, p.reading_reminder_time, '19:00', p.reading_reminder_last_sent, local)) {
      if (await claim(p.user_id, 'reading_reminder_last_sent', local.date)) {
        // Point to their reading plan when they have one on the go
        const { data: plans } = await supabaseAdmin
          .from('reading_plan_progress')
          .select('plan_id, current_day, enrolled_at')
          .eq('user_id', p.user_id)
          .order('enrolled_at', { ascending: false })
          .limit(1);
        const plan = plans?.[0];
        const planName = plan ? PLAN_NAMES[plan.plan_id] : undefined;
        const result = await sendToSubscriptions(
          await subscriptionsForUsers([p.user_id]),
          planName
            ? {
                kind: 'reminder',
                title: `Day ${plan!.current_day ?? 1} of ${planName}`,
                body: "Today's reading is ready. A few minutes with God's Word.",
                url: `/bible-reading-plans?plan=${plan!.plan_id}`,
                tag: 'reading-reminder',
                data: { reminder: 'reading', date: local.date },
              }
            : {
                kind: 'reminder',
                title: 'Time to read your Bible',
                body: 'Pick up where you left off. A few minutes with God’s Word.',
                url: '/bible',
                tag: 'reading-reminder',
                data: { reminder: 'reading', date: local.date },
              },
          { ttl: 60 * 60 * 6, urgency: 'normal', topic: 'reading-reminder' },
        );
        readings += result.sent;
      }
    }
  }

  return json({ ok: true, checked: data?.length ?? 0, verses, readings });
});
