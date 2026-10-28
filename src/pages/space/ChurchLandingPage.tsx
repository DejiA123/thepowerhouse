import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, CalendarDays, ChevronLeft, Clock, HandHeart, Hourglass, Loader2, MapPin, MessageCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { appAlert } from '@/lib/appAlert';
import { authUrl } from '@/lib/authRedirect';
import { profileFromRow, type ChurchRow } from '@/config/church';
import { applyColour, chooseChurch, chosenChurch, findChurch, JOINING_KEY, rgbToHex, paletteFor } from '@/lib/churchSpace';
import { ChurchLogo } from '@/components/space/ChurchBits';

type Membership = 'none' | 'active' | 'pending';

/**
 * A church's page on the Church Space address (/gracechapel): opened from a
 * search, a link or a QR code, already in the church's colours. "Join" makes
 * the app that church's app.
 */
const ChurchLandingPage = () => {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [row, setRow] = useState<ChurchRow | null | undefined>(undefined);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    findChurch({ slug }).then((found) => {
      setRow(found);
      window.dispatchEvent(new Event('app-ready'));
    });
  }, [slug]);

  // Show the page in the church's colour
  useEffect(() => {
    if (!row) return;
    const page = document.getElementById('church-landing');
    if (page) applyColour(profileFromRow(row).colour, page);
  }, [row]);

  useEffect(() => {
    if (!row || loading) return;
    if (!user) {
      setMembership('none');
      return;
    }
    supabase
      .from('church_members' as never)
      .select('status')
      .eq('church_id', row.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setMembership(((data as { status: Membership } | null)?.status as Membership) ?? 'none'));
  }, [row, user, loading]);

  // Back from signing in to join: finish joining
  useEffect(() => {
    if (!row || !user || membership === null) return;
    let joining: string | null = null;
    try {
      joining = localStorage.getItem(JOINING_KEY);
      if (joining === row.id) localStorage.removeItem(JOINING_KEY);
    } catch {
      /* nothing remembered */
    }
    if (joining !== row.id) return;
    if (membership === 'none') join();
    else if (membership === 'active') chooseChurch(row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, user, membership]);

  // Opened from this church's icon on the Home Screen: straight in
  useEffect(() => {
    if (!row || membership !== 'active' || !params.has('open')) return;
    if (chosenChurch?.id === row.id) navigate('/', { replace: true });
    else chooseChurch(row);
  }, [row, membership, params, navigate]);

  const join = async () => {
    if (!row) return;
    if (!user) {
      try {
        localStorage.setItem(JOINING_KEY, row.id);
      } catch {
        /* the button below still works after signing in */
      }
      navigate(authUrl(`/${row.slug}`, 'signup'));
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('join_church' as never, { target: row.id } as never);
    setBusy(false);
    if (error) {
      appAlert("Couldn't join", 'Check your connection and try again.', 'error');
      return;
    }
    if (data === 'active') chooseChurch(row);
    else setMembership('pending');
  };

  if (row === undefined) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (row === null) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <p className="font-outfit text-[22px] font-bold text-foreground">We couldn't find that church</p>
        <p className="mt-1 text-[14.5px] text-muted-foreground">Check the link, or search for it.</p>
        <button onClick={() => navigate('/find')} className="mt-5 h-12 rounded-full bg-blue-600 px-7 text-[15px] font-semibold text-white">
          Find your church
        </button>
      </div>
    );
  }

  const profile = profileFromRow(row);
  const palette = paletteFor(profile.colour);
  const times = profile.liveTimesLabel;
  const place = profile.campuses[0]?.street ? `${profile.campuses[0].street}, ${profile.campuses[0].name}` : profile.city;
  const parts = [
    { icon: BookOpen, label: 'Bible', tint: 'bg-orange-100 text-orange-600' },
    ...(profile.features.prayerWall ? [{ icon: HandHeart, label: 'Prayer', tint: 'bg-violet-100 text-violet-600' }] : []),
    { icon: MessageCircle, label: 'Messages', tint: 'bg-sky-100 text-sky-600' },
    ...(profile.features.events ? [{ icon: CalendarDays, label: 'Events', tint: 'bg-rose-100 text-rose-600' }] : []),
  ];

  return (
    <div id="church-landing" className="relative min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      <div
        className="absolute inset-x-0 top-0 h-[330px]"
        style={{ background: `linear-gradient(to bottom, ${rgbToHex(palette['900'])}, ${rgbToHex(palette['600'])})` }}
      />
      <div className="relative mx-auto max-w-md px-5 pb-10 pt-[max(env(safe-area-inset-top),16px)]">
        <button onClick={() => navigate('/find')} className="mt-2 flex items-center gap-1 text-[15px] font-semibold text-white/85">
          <ChevronLeft className="h-5 w-5" /> Find a church
        </button>
        <ChurchLogo row={row} className="mx-auto mt-6 h-24 w-24 rounded-[26px] text-[34px] shadow-xl ring-4 ring-white/25" />
        <h1 className="mt-4 text-center font-outfit text-[26px] font-bold leading-tight text-white">{row.name}</h1>
        {profile.city && <p className="mt-1 text-center text-[14px] text-white/80">{profile.city}</p>}

        <div className="mt-9 space-y-3 rounded-[22px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {times && (
            <p className="flex items-center gap-3 text-[14.5px] text-slate-700 dark:text-slate-200">
              <Clock className="h-5 w-5 shrink-0 text-blue-600" />
              {times}
            </p>
          )}
          {place && (
            <p className="flex items-center gap-3 text-[14.5px] text-slate-700 dark:text-slate-200">
              <MapPin className="h-5 w-5 shrink-0 text-blue-600" />
              {place}
            </p>
          )}
          <p className="flex items-center gap-3 text-[14.5px] text-slate-700 dark:text-slate-200">
            <Users className="h-5 w-5 shrink-0 text-blue-600" />
            {row.members ?? 0} {row.members === 1 ? 'member' : 'members'} on the app
          </p>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[12px] font-medium text-slate-600 dark:text-slate-300">
          {parts.map(({ icon: Icon, label, tint }) => (
            <div key={label}>
              <span className={`mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-2xl ${tint}`}>
                <Icon className="h-6 w-6" />
              </span>
              {label}
            </div>
          ))}
        </div>

        {membership === 'pending' ? (
          <div className="mt-7 flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-[14px] leading-snug text-amber-900 dark:text-amber-200">
              <b>You've asked to join.</b> The church's team will let you in soon. Open this page again then.
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={membership === 'active' ? () => chooseChurch(row) : join}
              disabled={busy || membership === null}
              className="mt-7 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-[16px] font-semibold text-white shadow-md shadow-blue-600/30 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {membership === 'active' ? `Open ${row.name}` : `Join ${row.name}`}
            </button>
            <p className="mt-3 text-center text-[13px] text-muted-foreground">
              {membership === 'active'
                ? "You're a member."
                : user
                  ? row.join_mode === 'approval'
                    ? "Free. The church's team says yes to new members."
                    : 'Free. You join straight away.'
                  : "Free. You'll sign in or create an account next."}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ChurchLandingPage;
