// To do reminders: the time someone said they'd start has come, a deadline is under two
// hours away, or it's their morning plan. Called every minute by the cron job
// todo-reminders while one is due (migration 20261113090000). It only ever sends what
// claim_todo_reminders() hands it (each marked sent as it's handed over), so it needs
// no account and can't be made to send anything else.
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { pushConfigured, sendToSubscriptions, subscriptionsForUsers } from '../_shared/webpush.ts';

interface Due {
  kind: 'plan' | 'due' | 'brief';
  user_id: string;
  todo_id: string;
  title: string;
  step: string | null;
  at: string | null;
  extra: { why?: string | null; snoozes?: number; count?: number; overdue?: number; important?: boolean } | null;
}

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** "5:30pm" in the person's own time zone */
function clock(iso: string, tz: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz })
      .format(new Date(iso))
      .replace(/\s/g, '')
      .replace(':00', '')
      .toLowerCase();
  } catch {
    return '';
  }
}

function message(r: Due, tz: string) {
  const title = truncate(r.title.trim(), 90);
  const step = r.step ? truncate(r.step.trim(), 80) : null;
  if (r.kind === 'plan') {
    const put = r.extra?.snoozes ?? 0;
    return {
      title: put >= 2 ? `⏰ It’s time. Just 2 minutes` : '⏰ Time to start',
      body: step ? `${title}\nFirst: ${step}` : `${title}\nJust start for 2 minutes. That’s all.`,
      url: `/todo?task=${r.todo_id}&start=1`,
      tag: `todo-plan-${r.todo_id}`,
    };
  }
  if (r.kind === 'due') {
    const when = r.at ? clock(r.at, tz) : '';
    return {
      title: `⌛ Due${when ? ` at ${when}` : ' soon'}`,
      body: step ? `${title}\nNext: ${step}` : title,
      url: `/todo?task=${r.todo_id}&start=1`,
      tag: `todo-due-${r.todo_id}`,
    };
  }
  const count = r.extra?.count ?? 1;
  const late = r.extra?.overdue ?? 0;
  return {
    title: '☀️ Your plan for today',
    body:
      (count > 1 ? `${count} things today${late ? ` (${late} overdue)` : ''}. Start with: ${title}` : `Today: ${title}`) +
      (step ? `\nFirst step: ${step}` : ''),
    url: '/todo',
    tag: 'todo-brief',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { data, error } = await supabaseAdmin.rpc('claim_todo_reminders');
    if (error) {
      console.error('[todo-reminders] claim', error.message);
      return json({ error: 'Could not read reminders' }, 500);
    }
    const due = (data ?? []) as Due[];
    if (!due.length || !pushConfigured) return json({ ok: true, sent: 0, due: due.length });

    // Each person's time zone, for the times in the words
    const people = [...new Set(due.map((d) => d.user_id))];
    const { data: settings } = await supabaseAdmin.from('todo_settings').select('user_id, tz').in('user_id', people);
    const tzOf = new Map(((settings ?? []) as { user_id: string; tz: string }[]).map((s) => [s.user_id, s.tz]));

    let sent = 0;
    for (const r of due) {
      try {
        const m = message(r, tzOf.get(r.user_id) || 'UTC');
        const result = await sendToSubscriptions(
          await subscriptionsForUsers([r.user_id]),
          { kind: 'reminder', title: m.title, body: m.body, url: m.url, tag: m.tag, renotify: true, data: { todoId: r.todo_id, reminder: r.kind } },
          { ttl: r.kind === 'brief' ? 60 * 60 * 6 : 60 * 60, urgency: 'high' },
        );
        sent += result.sent;
      } catch (e) {
        console.error('[todo-reminders] send failed', r.kind, r.todo_id, String(e));
      }
    }
    return json({ ok: true, due: due.length, sent });
  } catch (e) {
    console.error('[todo-reminders]', String(e));
    return json({ error: 'Something went wrong' }, 500);
  }
});
