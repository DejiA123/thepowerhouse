import { useEffect, useMemo, useState } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Search, UserRound } from 'lucide-react';
import { ListGroup, Page, PageTitle, SectionLabel } from '@/components/page/PageKit';
import UserAvatar from '@/components/common/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { ago, dayLabel, describe, duration, notSetUp, secondsOf, type ActivityRow } from '@/lib/admin';
import { cn } from '@/lib/utils';
import AdminGate, { NotSetUp } from './AdminGate';

interface Member {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  last_at: string;
  areas: string[] | null;
  /** Minutes in the app in the last 7 days (missing until the database has it) */
  minutes_week?: number;
}

const WEEK_MS = 7 * 86400_000;

/** Admin → Activity: every member and when they were last in the app. */
const MemberList = () => {
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<Member[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [order, setOrder] = useState<'recent' | 'time'>('recent');
  const timed = !!members?.some((m) => typeof m.minutes_week === 'number');
  const shown = useMemo(
    () => (order === 'time' && members ? [...members].sort((a, b) => (b.minutes_week ?? 0) - (a.minutes_week ?? 0)) : members),
    [members, order],
  );

  const loadMembers = () =>
    supabase.rpc('admin_activity_members' as never, { search: search.trim() || null } as never).then(({ data, error }) => {
      if (notSetUp(error)) {
        setMissing(true);
        setMembers([]);
      } else setMembers((data ?? []) as unknown as Member[]);
    });

  useEffect(() => {
    const t = setTimeout(loadMembers, search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  // Who's been active, kept current while it's open
  useLiveRefresh([], loadMembers, { pollMs: 30_000, enabled: !missing });

  return (
    <Page>
      <PageTitle title="Activity" back={{ label: 'Admin', onClick: () => navigate('/admin') }} />
      {missing && <NotSetUp />}
      <label className="mb-3 flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members"
          className="h-full flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>
      {timed && (
        <div className="mb-3 flex rounded-full bg-muted p-0.5 text-[13px] font-semibold" role="tablist" aria-label="Order">
          {(['recent', 'time'] as const).map((o) => (
            <button
              key={o}
              role="tab"
              aria-selected={order === o}
              onClick={() => setOrder(o)}
              className={cn('flex-1 rounded-full py-1.5 transition', order === o ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
            >
              {o === 'recent' ? 'Recently active' : 'Most time this week'}
            </button>
          ))}
        </div>
      )}
      {members === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : members.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-border p-8 text-center text-[14px] text-muted-foreground">
          {search ? 'Nobody by that name.' : 'No activity yet. It appears here as members use the app.'}
        </p>
      ) : (
        <ListGroup>
          {shown!.map((m) => {
            const when = ago(m.last_at);
            return (
              <button key={m.user_id} onClick={() => setParams({ user: m.user_id })} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted">
                <UserAvatar name={m.full_name} src={m.avatar_url} seed={m.user_id} className="h-10 w-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">{m.full_name || 'Member'}</span>
                  <span className="block truncate text-[12.5px] text-muted-foreground">
                    {when}{m.areas?.length ? ` · ${m.areas.join(', ')}` : ''}
                  </span>
                </span>
                {!!m.minutes_week && (
                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-semibold text-foreground">{duration(m.minutes_week)}</span>
                    <span className="block text-[11px] text-muted-foreground">this week</span>
                  </span>
                )}
                {when === 'Active now' && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </ListGroup>
      )}
    </Page>
  );
};

/** One member's timeline: what they did, when (never what they wrote). */
const MemberTimeline = ({ userId }: { userId: string }) => {
  const [, setParams] = useSearchParams();
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  // Time in the app, loaded on its own so a busy timeline can't cut the totals short
  const [timeRows, setTimeRows] = useState<{ detail: Record<string, unknown> | null; created_at: string }[]>([]);
  const [person, setPerson] = useState<{ full_name: string; avatar_url: string | null; created_at: string } | null>(null);

  useEffect(() => {
    supabase.from('profiles').select('full_name, avatar_url, created_at').eq('id', userId).maybeSingle().then(({ data }) => setPerson(data));
    supabase
      .from('app_activity' as never)
      .select('id, event, area, path, detail, device, created_at')
      .eq('user_id', userId)
      .neq('event', 'time')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => setRows((data ?? []) as unknown as ActivityRow[]));
    supabase
      .from('app_activity' as never)
      .select('detail, created_at')
      .eq('user_id', userId)
      .eq('event', 'time')
      .gte('created_at', new Date(Date.now() - 60 * 86400_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => setTimeRows((data ?? []) as unknown as typeof timeRows));
  }, [userId]);

  // Minutes each day, and in the last 7 days
  const { perDay, weekMinutes } = useMemo(() => {
    const perDay = new Map<string, number>();
    let week = 0;
    const weekStart = Date.now() - WEEK_MS;
    for (const r of timeRows) {
      const s = secondsOf(r);
      const day = dayLabel(r.created_at);
      perDay.set(day, (perDay.get(day) ?? 0) + s / 60);
      if (new Date(r.created_at).getTime() >= weekStart) week += s / 60;
    }
    return { perDay, weekMinutes: week };
  }, [timeRows]);

  // Grouped by day; the same thing twice in a row shows once
  const days = useMemo(() => {
    const out: { day: string; items: { time: string; text: string }[] }[] = [];
    let last = '';
    for (const r of rows ?? []) {
      const text = describe(r);
      const day = dayLabel(r.created_at);
      if (text === last && out[out.length - 1]?.day === day) continue;
      last = text;
      if (out[out.length - 1]?.day !== day) out.push({ day, items: [] });
      out[out.length - 1].items.push({ time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text });
    }
    return out;
  }, [rows]);

  const device = rows?.[0]?.device;

  return (
    <Page>
      <PageTitle title="" back={{ label: 'Activity', onClick: () => setParams({}) }} />
      <div className="-mt-4 mb-2 flex items-center gap-3">
        {person ? <UserAvatar name={person.full_name} src={person.avatar_url} seed={userId} className="h-12 w-12" /> : <UserRound className="h-12 w-12 text-muted-foreground" />}
        <span className="min-w-0">
          <span className="block truncate font-outfit text-[24px] font-bold text-foreground">{person?.full_name ?? 'Member'}</span>
          <span className="block text-[13px] text-muted-foreground">
            {[device, person && `joined ${new Date(person.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' })}`].filter(Boolean).join(' · ')}
          </span>
        </span>
      </div>
      {weekMinutes >= 1 && (
        <p className="mb-1 text-[14px] text-foreground" data-testid="week-time">
          <span className="font-semibold">{duration(weekMinutes)}</span> in the app this week
        </p>
      )}
      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : days.length === 0 ? (
        <p className="mt-4 rounded-[22px] border border-dashed border-border p-8 text-center text-[14px] text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        days.map((d) => (
          <div key={d.day}>
            <SectionLabel
              action={(perDay.get(d.day) ?? 0) >= 1 ? <span className="text-[12.5px] text-muted-foreground">{duration(perDay.get(d.day)!)} in the app</span> : undefined}
            >
              {d.day}
            </SectionLabel>
            <ListGroup>
              {d.items.map((it, i) => (
                <div key={i} className="flex gap-3 px-4 py-2.5 text-[14px]">
                  <span className="min-w-11 shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">{it.time}</span>
                  <span className="min-w-0 flex-1 text-foreground">{it.text}</span>
                </div>
              ))}
            </ListGroup>
          </div>
        ))
      )}
    </Page>
  );
};

const AdminActivityPage = () => {
  const [params] = useSearchParams();
  const userId = params.get('user');
  return <AdminGate>{userId ? <MemberTimeline userId={userId} /> : <MemberList />}</AdminGate>;
};

export default AdminActivityPage;
