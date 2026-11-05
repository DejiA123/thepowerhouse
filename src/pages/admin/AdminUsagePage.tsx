import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Hand, Headphones, HeartHandshake, Loader2, MessageCircle, PlayCircle, type LucideIcon } from 'lucide-react';
import { ListGroup, Page, PageTitle, SectionLabel } from '@/components/page/PageKit';
import { supabase } from '@/integrations/supabase/client';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { bookName, duration, notSetUp, shortDuration } from '@/lib/admin';
import { cn } from '@/lib/utils';
import { church } from '@/config/church';
import AdminGate, { NotSetUp } from './AdminGate';

type Count = { times: number; people: number };
interface Usage {
  since: string;
  members: number;
  visitors: number;
  opens: number;
  minutes: number;
  areas: { area: string; visits: number; people: number; minutes: number }[];
  actions: ({ event: string } & Count)[];
  chapters_read: ({ book: string; chapter: number } & Count)[];
  chapters_heard: ({ book: string; chapter: number } & Count)[];
  books: ({ book: string } & Count)[];
  translations: ({ translation: string } & Count)[];
  videos: ({ title: string | null; live: boolean } & Count)[];
  chats: { name: string; messages: number; people: number }[];
  choir: { location: string; visits: number; people: number }[];
  devices: { device: string; people: number }[];
  hours: number[] | null;
  by_day: { day: string; people: number }[];
}

const PERIODS = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
] as const;

const ACTIONS: Record<string, { label: string; icon: LucideIcon }> = {
  bible_read: { label: 'Bible chapters read', icon: BookOpen },
  bible_listen: { label: 'Bible chapters listened to', icon: Headphones },
  message_sent: { label: 'Messages sent', icon: MessageCircle },
  video_watched: { label: 'Videos watched', icon: PlayCircle },
  prayer_posted: { label: 'Prayer requests posted', icon: HeartHandshake },
  prayed: { label: 'Prayed for a request', icon: Hand },
  notification_opened: { label: 'Opened from a notification', icon: Bell },
};

/** Whatever the server sends, a complete Usage: missing lists are empty, missing numbers 0 */
const LISTS = ['areas', 'actions', 'chapters_read', 'chapters_heard', 'books', 'translations', 'videos', 'chats', 'choir', 'devices', 'by_day'] as const;
function complete(raw: unknown): Usage | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const out = {
    since: typeof r.since === 'string' ? r.since : '',
    members: num(r.members),
    visitors: num(r.visitors),
    opens: num(r.opens),
    minutes: num(r.minutes),
    hours: Array.isArray(r.hours) && r.hours.length === 24 ? r.hours.map(num) : null,
  } as Usage;
  for (const k of LISTS) (out as unknown as Record<string, unknown>)[k] = Array.isArray(r[k]) ? r[k] : [];
  return out;
}

const n = (v: number) => (Number.isFinite(v) ? v : 0).toLocaleString();
const people = (v: number) => `${n(v)} ${v === 1 ? 'person' : 'people'}`;
const choirName = (id: string) => (id === 'national' ? church.labels.nationalChoir : `${id.charAt(0).toUpperCase()}${id.slice(1)} choir`);
/** The phone's own clock: "7 PM" or "19:00" */
const twelveHour = (() => {
  try {
    return !!new Intl.DateTimeFormat([], { hour: 'numeric' }).resolvedOptions().hour12;
  } catch {
    return false;
  }
})();
const hourLabel = (h: number) => (twelveHour ? new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric' }) : `${String(h).padStart(2, '0')}:00`);

/** A ranked row: name, number on the right, a bar for its share of the top one, and who */
const Ranked = ({ name, value, sub, share }: { name: string; value: string; sub?: string; share: number }) => (
  <div className="px-4 py-2.5">
    <div className="flex items-baseline justify-between gap-3 text-[14.5px]">
      <span className="min-w-0 truncate text-foreground">{name}</span>
      <span className="shrink-0 font-semibold text-foreground">{value}</span>
    </div>
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(3, Math.min(100, share * 100))}%` }} />
    </div>
    {sub && <p className="mt-1 text-[12px] text-muted-foreground">{sub}</p>}
  </div>
);

const RankedList = <T,>({ title, rows, value, name, sub, show }: {
  title: string;
  rows: T[];
  value: (r: T) => number;
  name: (r: T) => string;
  sub?: (r: T) => string;
  /** How the number reads (default: just the number) */
  show?: (r: T) => string;
}) => {
  if (!rows.length) return null;
  const top = Math.max(1, ...rows.map(value));
  return (
    <>
      <SectionLabel>{title}</SectionLabel>
      <ListGroup>
        {rows.map((r, i) => (
          <Ranked key={i} name={name(r)} value={show ? show(r) : n(value(r))} sub={sub?.(r)} share={value(r) / top} />
        ))}
      </ListGroup>
    </>
  );
};

/** Columns for one series (people by hour, or by day). Tap one to read it; the busiest is read out first. */
const Columns = ({ values, label, tick, read, title, note }: {
  values: number[];
  label: (i: number) => string;
  tick: (i: number) => string | null;
  read: (i: number, v: number) => string;
  title: string;
  note: string;
}) => {
  const max = Math.max(...values);
  const busiest = values.indexOf(max);
  const [chosen, setChosen] = useState<number | null>(null);
  const signature = values.join(',');
  // New numbers (another period): back to the busiest
  useEffect(() => setChosen(null), [signature]);
  if (max <= 0) return null;
  const at = chosen ?? busiest;
  return (
    <>
      <SectionLabel>{title}</SectionLabel>
      <div className="rounded-[22px] border border-slate-200/70 bg-card px-4 pb-3 pt-3 shadow-sm dark:border-slate-800">
        <p className="text-[14px] text-foreground" aria-live="polite">
          <span className="font-semibold">{label(at)}</span>
          <span className="text-muted-foreground"> · {read(at, values[at])}{chosen === null ? ' (the busiest)' : ''}</span>
        </p>
        <div className="mt-3 flex h-24 items-end gap-[2px] border-b border-border" role="group" aria-label={title}>
          {values.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setChosen(i === chosen ? null : i)}
              aria-label={`${label(i)}: ${read(i, v)}`}
              className="flex h-full min-w-0 flex-1 items-end justify-center"
            >
              <span
                className={cn('block w-full max-w-[24px] rounded-t-[4px] transition-colors', i === at ? 'bg-blue-600 dark:bg-blue-400' : 'bg-blue-500/45 dark:bg-blue-400/40', v === 0 && 'opacity-0')}
                style={{ height: `${Math.max(v ? 4 : 0, (100 * v) / max)}%` }}
              />
            </button>
          ))}
        </div>
        <div className="mt-1 flex gap-[2px] text-[11px] text-muted-foreground">
          {values.map((_, i) => (
            <span key={i} className="relative min-w-0 flex-1">
              {tick(i) && <span className="absolute left-0 whitespace-nowrap">{tick(i)}</span>}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">{note}</p>
      </div>
    </>
  );
};

/** Admin → What's used most: which parts and things in the app people use, and when. */
const AdminUsage = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [data, setData] = useState<Usage | null>(null);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(
    () =>
      supabase.rpc('admin_usage' as never, { days, tz: church.locale.timeZone || 'UTC' } as never).then(({ data, error }) => {
        if (notSetUp(error)) setMissing(true);
        else if (!error) {
          const usage = complete(data);
          if (usage) {
            setData(usage);
            setLoadedFor(days);
          }
        }
      }),
    [days],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveRefresh([], load, { pollMs: 60_000, enabled: !missing });

  // Every day in the period, including quiet ones
  const daySeries = useMemo(() => {
    if (!data || days === 1) return null;
    const byDay = new Map(data.by_day.map((d) => [d.day, d.people]));
    const out: { day: Date; people: number }[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ day: d, people: byDay.get(key) ?? 0 });
    }
    return out;
  }, [data, days]);

  const loading = !data || loadedFor !== days;
  const over = days === 1 ? 'today' : `in the last ${days} days`;
  const topArea = Math.max(1, ...(data?.areas ?? []).map((a) => a.visits));

  return (
    <Page>
      <PageTitle title="What's used most" back={{ label: 'Admin', onClick: () => navigate('/admin') }} />
      {missing && <NotSetUp />}

      <div className="mb-4 flex rounded-full bg-muted p-0.5 text-[13.5px] font-semibold" role="tablist" aria-label="Period">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            role="tab"
            aria-selected={days === p.days}
            onClick={() => setDays(p.days)}
            className={cn('flex-1 rounded-full py-2 transition', days === p.days ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {missing ? null : loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : data && (
        <div className={cn('transition-opacity', loading && 'opacity-50')} data-testid="usage">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: n(data.members), label: 'members' },
              { value: n(data.visitors), label: 'visitors not signed in' },
              { value: shortDuration(data.minutes), label: 'in the app' },
            ].map((s) => (
              <div key={s.label} className="rounded-[18px] border border-slate-200/70 bg-card p-3 text-center shadow-sm dark:border-slate-800">
                <p className="font-outfit text-[24px] font-bold text-foreground">{s.value}</p>
                <p className="text-[11.5px] leading-tight text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 text-[13px] text-muted-foreground">
            The app was opened {n(data.opens)} {data.opens === 1 ? 'time' : 'times'} {over}.
          </p>

          {!!data.areas.length && (
            <>
              <SectionLabel>Parts of the app</SectionLabel>
              <ListGroup>
                {data.areas.map((a) => (
                  <Ranked
                    key={a.area}
                    name={a.area}
                    value={`${n(a.visits)} ${a.visits === 1 ? 'visit' : 'visits'}`}
                    share={a.visits / topArea}
                    sub={[a.people ? people(a.people) : null, a.minutes >= 1 ? duration(a.minutes) : null].filter(Boolean).join(' · ') || undefined}
                  />
                ))}
              </ListGroup>
            </>
          )}

          {!!data.actions.length && (
            <>
              <SectionLabel>What people did</SectionLabel>
              <ListGroup>
                {data.actions
                  .filter((a) => ACTIONS[a.event])
                  .map((a) => {
                    const { label, icon: Icon } = ACTIONS[a.event];
                    return (
                      <div key={a.event} className="flex items-center gap-3 px-4 py-2.5">
                        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] text-foreground">{label}</span>
                          <span className="block text-[12px] text-muted-foreground">by {people(a.people)}</span>
                        </span>
                        <span className="shrink-0 text-[15px] font-semibold text-foreground">{n(a.times)}</span>
                      </div>
                    );
                  })}
              </ListGroup>
            </>
          )}

          <RankedList title="Most read in the Bible" rows={data.chapters_read} value={(r) => r.times} name={(r) => `${bookName(r.book)} ${r.chapter}`} sub={(r) => people(r.people)} />
          <RankedList title="Most listened to" rows={data.chapters_heard} value={(r) => r.times} name={(r) => `${bookName(r.book)} ${r.chapter}`} sub={(r) => people(r.people)} />
          <RankedList title="Books of the Bible" rows={data.books} value={(r) => r.times} name={(r) => bookName(r.book)} sub={(r) => `${people(r.people)} · read or listened to`} />
          <RankedList title="Translations" rows={data.translations} value={(r) => r.times} name={(r) => r.translation} sub={(r) => people(r.people)} />
          <RankedList title="Most watched" rows={data.videos} value={(r) => r.times} name={(r) => (r.live ? 'The live service' : r.title ?? 'A video')} sub={(r) => people(r.people)} />
          <RankedList title="Busiest group chats" rows={data.chats} value={(r) => r.messages} name={(r) => r.name} sub={(r) => `messages from ${people(r.people)}`} />
          <RankedList title="Choir pages" rows={data.choir} value={(r) => r.visits} name={(r) => choirName(r.location)} sub={(r) => `visits by ${people(r.people)}`} />

          {data.hours && (
            <Columns
              title="Busiest times of day"
              values={data.hours}
              label={(h) => `${hourLabel(h)} – ${hourLabel((h + 1) % 24)}`}
              tick={(h) => (h % 6 === 0 ? hourLabel(h) : null)}
              read={(_, v) => (days === 1 ? people(v) : `${n(v)} in all`)}
              note={days === 1 ? 'People in the app in each hour today.' : `People in the app in each hour, added up over the ${days} days.`}
            />
          )}
          {daySeries && (
            <Columns
              title="Each day"
              values={daySeries.map((d) => d.people)}
              label={(i) => daySeries[i].day.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
              tick={(i) => (days === 7 ? daySeries[i].day.toLocaleDateString([], { weekday: 'narrow' }) : i % 7 === 0 && i <= daySeries.length - 5 ? daySeries[i].day.toLocaleDateString([], { day: 'numeric', month: 'short' }) : null)}
              read={(_, v) => people(v)}
              note="Members and visitors in the app each day."
            />
          )}

          <RankedList title="Phones and computers" rows={data.devices} value={(r) => r.people} name={(r) => r.device} show={(r) => people(r.people)} />
          <p className="mt-6 px-1 text-[12.5px] leading-snug text-muted-foreground">
            Only actions are counted, never what anyone wrote. One-to-one chats are never listed.
          </p>
        </div>
      )}
    </Page>
  );
};

const AdminUsagePage = () => (
  <AdminGate>
    <AdminUsage />
  </AdminGate>
);

export default AdminUsagePage;
