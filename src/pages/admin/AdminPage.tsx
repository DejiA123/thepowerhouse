import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, MessageSquareHeart, ShieldCheck } from 'lucide-react';
import { ListGroup, ListRow, Page, PageTitle, SectionLabel } from '@/components/page/PageKit';
import { RowPicture } from '@/components/nav/Places';
import { supabase } from '@/integrations/supabase/client';
import { notSetUp } from '@/lib/admin';
import AdminGate, { NotSetUp } from './AdminGate';
import ChurchAdminSection from './ChurchAdminSection';

interface Overview {
  active_today: number;
  active_week: number;
  visitors_today: number;
  thumbs_up: number;
  thumbs_down: number;
  new_feedback: number;
  top_areas: { area: string; visits: number }[];
}

const Stat = ({ value, label, tone }: { value: string; label: string; tone?: string }) => (
  <div className="rounded-[18px] border border-slate-200/70 bg-card p-3 text-center shadow-sm dark:border-slate-800">
    <p className={`font-outfit text-[24px] font-bold ${tone ?? 'text-foreground'}`}>{value}</p>
    <p className="text-[11.5px] leading-tight text-muted-foreground">{label}</p>
  </div>
);

/** Me → Admin: how the app is being used, feedback and each member's activity. */
const AdminPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<Overview | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    supabase.rpc('admin_activity_overview' as never).then(({ data, error }) => {
      if (notSetUp(error)) setMissing(true);
      else if (data) setData(data as unknown as Overview);
    });
  }, []);

  const rated = (data?.thumbs_up ?? 0) + (data?.thumbs_down ?? 0);

  return (
    <Page>
      <PageTitle icon={ShieldCheck} tint="bg-gradient-to-br from-slate-600 to-slate-800" title="Admin" subtitle="How the app is being used" back={{ label: 'Me', onClick: () => navigate('/me') }} />
      {missing && <NotSetUp />}

      <div className="grid grid-cols-3 gap-2">
        <Stat value={data ? String(data.active_today) : '–'} label="members active today" />
        <Stat value={data ? String(data.active_week) : '–'} label="this week" />
        <Stat
          value={rated ? `${Math.round((100 * data!.thumbs_up) / rated)}%` : '–'}
          label="👍 last 30 days"
          tone="text-emerald-600 dark:text-emerald-400"
        />
      </div>
      {!!data?.visitors_today && (
        <p className="mt-2 px-1 text-[13px] text-muted-foreground">Plus {data.visitors_today} visitors today who weren't signed in.</p>
      )}

      <ListGroup className="mt-4">
        <ListRow
          leading={<RowPicture icon={MessageSquareHeart} color="teal" />}
          title="Feedback"
          subtitle="What members say about the app"
          trailing={data?.new_feedback ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[12px] font-bold text-white">{data.new_feedback} new</span> : undefined}
          onClick={() => navigate('/admin/feedback')}
          chevron
          className="min-h-[68px] py-3"
        />
        <ListRow
          leading={<RowPicture icon={Activity} color="indigo" />}
          title="Activity"
          subtitle="What each member does in the app"
          onClick={() => navigate('/admin/activity')}
          chevron
          className="min-h-[68px] py-3"
        />
      </ListGroup>

      <ChurchAdminSection />

      {!!data?.top_areas?.length && (
        <>
          <SectionLabel>Most used this week</SectionLabel>
          <ListGroup>
            {data.top_areas.map((a) => (
              <div key={a.area} className="flex justify-between px-4 py-2.5 text-[14.5px]">
                <span className="text-foreground">{a.area}</span>
                <span className="font-semibold text-foreground">{a.visits} visits</span>
              </div>
            ))}
          </ListGroup>
        </>
      )}
    </Page>
  );
};

const AdminPageGated = () => (
  <AdminGate>
    <AdminPage />
  </AdminGate>
);

export default AdminPageGated;
