import { useEffect, useState } from 'react';
import { Check, QrCode, X } from 'lucide-react';
import { ListGroup, ListRow, SectionLabel } from '@/components/page/PageKit';
import { RowPicture } from '@/components/nav/Places';
import UserAvatar from '@/components/common/UserAvatar';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { appAlert } from '@/lib/appAlert';
import { ago } from '@/lib/admin';
import { ChurchShareCard, JoinModePicker } from '@/components/space/ChurchBits';

interface ChurchInfo {
  id: string;
  slug: string;
  name: string;
  join_code: string;
  join_mode: 'open' | 'approval';
}

interface JoinRequest {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  asked_at: string;
}

/** Admin: the church's link, QR code and join code, who can join, and people waiting to join */
const ChurchAdminSection = () => {
  const [info, setInfo] = useState<ChurchInfo | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    supabase.rpc('church_admin_info' as never).then(({ data }) => setInfo(((data as ChurchInfo[] | null) ?? [])[0] ?? null));
    supabase.rpc('church_join_requests' as never).then(({ data }) => setRequests((data as JoinRequest[] | null) ?? []));
  }, []);

  // Not set up yet (database step not applied): nothing to show
  if (!info) return null;

  const answer = async (r: JoinRequest, accept: boolean) => {
    setRequests((list) => list.filter((x) => x.user_id !== r.user_id));
    const { error } = await supabase.rpc('answer_join_request' as never, { p_user: r.user_id, p_accept: accept } as never);
    if (error) {
      appAlert("That didn't save", 'Check your connection and try again.', 'error');
      setRequests((list) => [...list, r]);
    }
  };

  const setMode = async (mode: 'open' | 'approval') => {
    const before = info.join_mode;
    setInfo({ ...info, join_mode: mode });
    const { error } = await supabase.rpc('set_church_join_mode' as never, { p_join_mode: mode } as never);
    if (error) {
      setInfo({ ...info, join_mode: before });
      appAlert("That didn't save", 'Check your connection and try again.', 'error');
    }
  };

  return (
    <>
      {requests.length > 0 && (
        <>
          <SectionLabel>Waiting to join</SectionLabel>
          <ListGroup>
            {requests.map((r) => (
              <div key={r.user_id} className="flex items-center gap-3 px-4 py-3">
                <UserAvatar name={r.full_name || r.email || 'New member'} src={r.avatar_url} seed={r.user_id} className="h-10 w-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">{r.full_name || 'New member'}</span>
                  <span className="block truncate text-[12.5px] text-muted-foreground">{[r.email, ago(r.asked_at).replace('Active now', 'Just now')].filter(Boolean).join(' · ')}</span>
                </span>
                <button onClick={() => answer(r, false)} aria-label="Decline" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <X className="h-[18px] w-[18px]" />
                </button>
                <button onClick={() => answer(r, true)} aria-label="Let in" className="flex h-9 items-center gap-1 rounded-full bg-blue-600 px-3 text-[13.5px] font-semibold text-white">
                  <Check className="h-4 w-4" /> Let in
                </button>
              </div>
            ))}
          </ListGroup>
        </>
      )}

      <ListGroup className="mt-4">
        <ListRow
          leading={<RowPicture icon={QrCode} color="blue" />}
          title="Invite people"
          subtitle={`Link, QR code and join code · ${info.join_mode === 'open' ? 'anyone can join' : 'you approve new members'}`}
          onClick={() => setSharing(true)}
          chevron
          className="min-h-[68px] py-3"
        />
      </ListGroup>

      <Sheet open={sharing} onOpenChange={setSharing}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 sm:mx-auto sm:max-w-md">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
          <SheetTitle className="text-center font-outfit text-[21px] font-bold">Invite people to {info.name}</SheetTitle>
          <SheetDescription className="mb-4 text-center text-[13.5px]">Show this on the screen on Sunday, or share the link.</SheetDescription>
          <ChurchShareCard name={info.name} slug={info.slug} joinCode={info.join_code} />
          <p className="mb-2 mt-5 px-1 text-[12.5px] font-bold uppercase tracking-[.07em] text-slate-500">Who can join?</p>
          <JoinModePicker value={info.join_mode} onChange={setMode} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ChurchAdminSection;
