import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Page, PageTitle } from '@/components/page/PageKit';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import { ago, notSetUp } from '@/lib/admin';
import AdminGate, { NotSetUp } from './AdminGate';

interface Feedback {
  id: string;
  user_id: string | null;
  rating: 'up' | 'down' | null;
  kind: 'problem' | 'suggestion' | 'other' | null;
  message: string | null;
  can_contact: boolean;
  page: string | null;
  device: string | null;
  status: 'new' | 'done';
  created_at: string;
}

type Filter = 'all' | 'up' | 'down' | 'problem' | 'suggestion';

const KIND_LABEL = { problem: "Didn't work", suggestion: 'Suggestion', other: 'Other' } as const;
const KIND_TONE = {
  problem: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  suggestion: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
} as const;

/** Admin → Feedback: what members said, newest first; "Done" when handled. */
const AdminFeedbackPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Feedback[] | null>(null);
  const [names, setNames] = useState<Record<string, { name: string; email: string | null }>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('app_feedback' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (notSetUp(error)) {
        setMissing(true);
        setItems([]);
        return;
      }
      const rows = (data ?? []) as unknown as Feedback[];
      setItems(rows);
      const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: people } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
        setNames(Object.fromEntries((people ?? []).map((p) => [p.id, { name: p.full_name, email: p.email }])));
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const all = items ?? [];
    return {
      all: all.length,
      up: all.filter((f) => f.rating === 'up').length,
      down: all.filter((f) => f.rating === 'down').length,
      problem: all.filter((f) => f.kind === 'problem').length,
      suggestion: all.filter((f) => f.kind === 'suggestion').length,
    };
  }, [items]);

  const shown = (items ?? []).filter((f) =>
    filter === 'all' ? true : filter === 'up' || filter === 'down' ? f.rating === filter : f.kind === filter,
  );

  const markDone = async (f: Feedback) => {
    const status = f.status === 'done' ? 'new' : 'done';
    setItems((prev) => prev?.map((x) => (x.id === f.id ? { ...x, status } : x)) ?? null);
    const { error } = await supabase.from('app_feedback' as never).update({ status } as never).eq('id', f.id);
    if (error) appAlert("Couldn't update it", error.message, 'error');
  };

  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: `All ${counts.all}` },
    { id: 'up', label: `👍 ${counts.up}` },
    { id: 'down', label: `👎 ${counts.down}` },
    { id: 'problem', label: `Problems ${counts.problem}` },
    { id: 'suggestion', label: `Suggestions ${counts.suggestion}` },
  ];

  return (
    <Page>
      <PageTitle title="Feedback" back={{ label: 'Admin', onClick: () => navigate('/admin') }} />
      {missing && <NotSetUp />}

      <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold',
              filter === c.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-card text-foreground ring-1 ring-border',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : shown.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-border p-8 text-center text-[14px] text-muted-foreground">No feedback here yet.</p>
      ) : (
        <div className="space-y-2.5">
          {shown.map((f) => {
            const who = f.user_id ? names[f.user_id] : null;
            return (
              <div key={f.id} className={cn('rounded-[22px] border border-slate-200/70 bg-card p-3.5 shadow-sm dark:border-slate-800', f.status === 'done' && 'opacity-60')}>
                <div className="flex items-center gap-2 text-[12.5px]">
                  {f.rating && <span className="text-[18px] leading-none">{f.rating === 'up' ? '👍' : '👎'}</span>}
                  {f.kind && <span className={cn('rounded-full px-2 py-0.5 font-semibold', KIND_TONE[f.kind])}>{KIND_LABEL[f.kind]}</span>}
                  <span className="ml-auto text-muted-foreground">{ago(f.created_at).replace('Active now', 'Just now')}</span>
                </div>
                <p className={cn('mt-2 whitespace-pre-wrap text-[14.5px] leading-snug', f.message ? 'text-foreground' : 'italic text-muted-foreground')}>
                  {f.message || 'No comment'}
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="min-w-0 text-muted-foreground">
                    <b className="text-foreground">{who?.name ?? (f.user_id ? 'A member' : 'Not signed in')}</b>
                    {f.page ? ` · from ${f.page}` : ''}
                    {f.device ? ` · ${f.device.split(' · ')[0]}` : ''}
                    {f.can_contact && who?.email && (
                      <> · <a href={`mailto:${who.email}`} className="font-semibold text-blue-600 dark:text-blue-400">Reply</a></>
                    )}
                  </span>
                  <button
                    onClick={() => markDone(f)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 font-semibold',
                      f.status === 'done' ? 'bg-muted text-muted-foreground' : 'bg-blue-600 text-white',
                    )}
                  >
                    {f.status === 'done' ? 'Undo' : 'Done'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
};

const AdminFeedbackGated = () => (
  <AdminGate>
    <AdminFeedbackPage />
  </AdminGate>
);

export default AdminFeedbackGated;
