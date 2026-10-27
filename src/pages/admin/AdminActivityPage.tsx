import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Search, UserRound } from 'lucide-react';
import { ListGroup, Page, PageTitle, SectionLabel } from '@/components/page/PageKit';
import UserAvatar from '@/components/common/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { ago, dayLabel, describe, notSetUp, type ActivityRow } from '@/lib/admin';
import AdminGate, { NotSetUp } from './AdminGate';

interface Member {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  last_at: string;
  areas: string[] | null;
}

/** Admin → Activity: every member and when they were last in the app. */
const MemberList = () => {
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<Member[] | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      supabase.rpc('admin_activity_members' as never, { search: search.trim() || null } as never).then(({ data, error }) => {
        if (notSetUp(error)) {
          setMissing(true);
          setMembers([]);
        } else setMembers((data ?? []) as unknown as Member[]);
      });
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

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
      {members === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : members.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-border p-8 text-center text-[14px] text-muted-foreground">
          {search ? 'Nobody by that name.' : 'No activity yet. It appears here as members use the app.'}
        </p>
      ) : (
        <ListGroup>
          {members.map((m) => {
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
  const [person, setPerson] = useState<{ full_name: string; avatar_url: string | null; created_at: string } | null>(null);

  useEffect(() => {
    supabase.from('profiles').select('full_name, avatar_url, created_at').eq('id', userId).maybeSingle().then(({ data }) => setPerson(data));
    supabase
      .from('app_activity' as never)
      .select('id, event, area, path, detail, device, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => setRows((data ?? []) as unknown as ActivityRow[]));
  }, [userId]);

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
      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : days.length === 0 ? (
        <p className="mt-4 rounded-[22px] border border-dashed border-border p-8 text-center text-[14px] text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        days.map((d) => (
          <div key={d.day}>
            <SectionLabel>{d.day}</SectionLabel>
            <ListGroup>
              {d.items.map((it, i) => (
                <div key={i} className="flex gap-3 px-4 py-2.5 text-[14px]">
                  <span className="w-11 shrink-0 tabular-nums text-muted-foreground">{it.time}</span>
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
