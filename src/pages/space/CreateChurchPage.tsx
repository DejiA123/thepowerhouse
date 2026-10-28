import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CalendarDays, Check, CheckCircle2, ChevronLeft, HandHeart, HeartHandshake, ImagePlus, Link2, Loader2,
  MessageCircle, Music, Plus, Tv, Users, XCircle, type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { appAlert } from '@/lib/appAlert';
import { authUrl } from '@/lib/authRedirect';
import { cn } from '@/lib/utils';
import { PLATFORM, RESERVED_SLUGS, slugFromName, type ChurchRow, type FeatureId, type SpaceProfile } from '@/config/church';
import { applyColour, chooseChurch, findChurch, paletteFor, rgbToHex } from '@/lib/churchSpace';
import { ChurchShareCard, JoinModePicker } from '@/components/space/ChurchBits';

const COLOURS = ['blue', 'emerald', 'violet', 'rose', 'amber'];
const ROLES = [
  { id: 'pastor', label: 'Pastor' },
  { id: 'admin', label: 'Church admin' },
  { id: 'media', label: 'Media team' },
] as const;

interface Part {
  id: FeatureId | 'bible' | 'messages';
  icon: LucideIcon;
  tint: string;
  title: string;
  subtitle: string;
  /** Always there (Bible, messages) */
  always?: boolean;
  /** Not ready for other churches yet */
  soon?: boolean;
}

const PARTS: Part[] = [
  { id: 'bible', icon: BookOpen, tint: 'bg-orange-100 text-orange-600', title: 'Bible', subtitle: 'Read and listen, plans, notes', always: true },
  { id: 'messages', icon: MessageCircle, tint: 'bg-sky-100 text-sky-600', title: 'Messages', subtitle: 'Chats and church groups', always: true },
  { id: 'prayerWall', icon: HandHeart, tint: 'bg-violet-100 text-violet-600', title: 'Prayer wall', subtitle: 'Share and pray for requests' },
  { id: 'events', icon: CalendarDays, tint: 'bg-blue-100 text-blue-600', title: 'Events', subtitle: "Services and what's on" },
  { id: 'teams', icon: Users, tint: 'bg-amber-100 text-amber-600', title: 'Teams', subtitle: 'Groups and volunteers' },
  { id: 'watch', icon: Tv, tint: 'bg-rose-100 text-rose-600', title: 'Sermons and live', subtitle: 'From your YouTube channel', soon: true },
  { id: 'giving', icon: HeartHandshake, tint: 'bg-emerald-100 text-emerald-600', title: 'Giving', subtitle: 'Tithes and offerings online', soon: true },
  { id: 'choir', icon: Music, tint: 'bg-pink-100 text-pink-600', title: 'Choir', subtitle: 'Songs, rehearsals, academy', soon: true },
];

/** A picture made square (cropped to the middle) and saved as a PNG of `size` pixels */
const squarePng = (file: File, size: number) =>
  new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read the picture'))), 'image/png');
    };
    img.onerror = () => reject(new Error('Could not read the picture'));
    img.src = URL.createObjectURL(file);
  });

const Step = ({ step, title, subtitle, onBack, children, footer }: { step: number; title: string; subtitle?: string; onBack: () => void; children: ReactNode; footer: ReactNode }) => (
  <div className="flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-950">
    <div className="mx-auto w-full max-w-md flex-1 px-5 pt-[max(env(safe-area-inset-top),16px)]">
      <div className="mt-2 flex items-center justify-between text-[15px] font-semibold text-blue-600">
        <button onClick={onBack} className="flex items-center gap-1">
          <ChevronLeft className="h-5 w-5" /> Back
        </button>
        <span className="text-[13px] text-slate-400">Step {step} of 4</span>
      </div>
      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={cn('h-[5px] flex-1 rounded-full', n <= step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800')} />
        ))}
      </div>
      <h1 className="mt-6 font-outfit text-[27px] font-bold leading-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-[14.5px] text-muted-foreground">{subtitle}</p>}
      <div className="pb-6">{children}</div>
    </div>
    <div className="sticky bottom-0 mx-auto w-full max-w-md bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-4 dark:from-slate-950 dark:via-slate-950">
      {footer}
    </div>
  </div>
);

const Label = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 mt-5 px-1 text-[12.5px] font-bold uppercase tracking-[.07em] text-slate-500">{children}</p>
);

const NextButton = ({ onClick, disabled, busy, children }: { onClick: () => void; disabled?: boolean; busy?: boolean; children: ReactNode }) => (
  <button
    onClick={onClick}
    disabled={disabled || busy}
    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-[16px] font-semibold text-white shadow-md shadow-blue-600/30 disabled:opacity-50"
  >
    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
);

/** "Create your church space": four steps for a pastor or church admin */
const CreateChurchPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]['id']>('pastor');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugFree, setSlugFree] = useState<boolean | null>(null);
  const [colour, setColour] = useState('blue');
  const [logo, setLogo] = useState<{ preview: string; icon192: Blob; icon512: Blob } | null>(null);
  const [parts, setParts] = useState<Record<string, boolean>>({ prayerWall: true, events: true, teams: false });
  const [joinMode, setJoinMode] = useState<'open' | 'approval'>('open');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ row: ChurchRow; joinCode: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.dispatchEvent(new Event('app-ready'));
  }, []);

  // The link follows the name until it's changed by hand
  useEffect(() => {
    if (!slugEdited) setSlug(slugFromName(name));
  }, [name, slugEdited]);

  useEffect(() => {
    setSlugFree(null);
    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug) || RESERVED_SLUGS.includes(slug)) return;
    const t = setTimeout(() => findChurch({ slug }).then((row) => setSlugFree(!row)), 350);
    return () => clearTimeout(t);
  }, [slug]);

  useEffect(() => {
    if (previewRef.current) applyColour(colour, previewRef.current);
  }, [colour, step]);

  const slugProblem = useMemo(() => {
    if (!slug) return '';
    if (slug.length < 3) return 'At least 3 letters';
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) return 'Letters, numbers and - only';
    if (RESERVED_SLUGS.includes(slug) || slugFree === false) return 'Already taken: try another';
    return '';
  }, [slug, slugFree]);

  const pickLogo = async (file?: File) => {
    if (!file) return;
    try {
      const [icon512, icon192] = await Promise.all([squarePng(file, 512), squarePng(file, 192)]);
      setLogo({ preview: URL.createObjectURL(icon192), icon192, icon512 });
    } catch {
      appAlert("That picture didn't work", 'Try a PNG or JPG picture.', 'error');
    }
  };

  const create = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const profile: Partial<SpaceProfile> = {
        city: city.trim(),
        colour,
        features: Object.fromEntries(PARTS.filter((p) => !p.always && !p.soon).map((p) => [p.id, !!parts[p.id]])),
      };
      if (logo) {
        const base = `${user.id}/${slug}-${Date.now()}`;
        const upload = async (blob: Blob, size: number) => {
          const path = `${base}-${size}.png`;
          const { error } = await supabase.storage.from('church-logos').upload(path, blob, { contentType: 'image/png', upsert: true });
          if (error) throw error;
          return supabase.storage.from('church-logos').getPublicUrl(path).data.publicUrl;
        };
        profile.icon512 = await upload(logo.icon512, 512);
        profile.icon192 = await upload(logo.icon192, 192);
        profile.logo = profile.icon192;
      }
      const { data, error } = await supabase.rpc('create_church' as never, {
        p_name: name.trim(),
        p_slug: slug,
        p_role: role === 'pastor' ? 'pastor' : 'admin',
        p_join_mode: joinMode,
        p_profile: profile,
      } as never);
      if (error) throw error;
      const result = (data as { id: string; slug: string; join_code: string }[])[0];
      const row = await findChurch({ id: result.id });
      setMade({ row: row ?? { id: result.id, slug: result.slug, name: name.trim(), join_mode: joinMode, profile, members: 1 }, joinCode: result.join_code });
    } catch (e) {
      const message = e instanceof Error ? e.message : (e as { message?: string })?.message;
      appAlert("Your church space wasn't created", message || 'Check your connection and try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-6 text-center dark:bg-slate-950">
        <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-indigo-500 via-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/30">
          <Plus className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-outfit text-[26px] font-bold text-foreground">Create your church space</h1>
        <p className="mt-1 max-w-xs text-[14.5px] text-muted-foreground">Your church's own app, free. First, sign in or create your account: you'll be its admin.</p>
        <button onClick={() => navigate(authUrl('/create-church', 'signup'))} className="mt-6 h-[52px] w-full max-w-xs rounded-full bg-blue-600 text-[16px] font-semibold text-white shadow-md shadow-blue-600/30">
          Sign in or create an account
        </button>
        <button onClick={() => navigate('/find')} className="mt-3 text-[14px] font-semibold text-blue-600">
          Back
        </button>
      </div>
    );
  }

  // Done: share it
  if (made) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 px-5 pb-10 pt-[max(env(safe-area-inset-top),20px)] dark:bg-slate-950">
        <div className="mx-auto max-w-md">
          <div className="mt-1 flex gap-1.5">
            {[1, 2, 3, 4].map((n) => <span key={n} className="h-[5px] flex-1 rounded-full bg-blue-600" />)}
          </div>
          <div className="mt-6 text-center">
            <span className="text-[34px]">🎉</span>
            <h1 className="font-outfit text-[26px] font-bold leading-tight text-foreground">{made.row.name} is ready</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">Show this on the screen on Sunday.</p>
          </div>
          <div className="mt-4">
            <ChurchShareCard name={made.row.name} slug={made.row.slug} joinCode={made.joinCode} />
          </div>
          <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-center text-[13.5px] text-muted-foreground ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
            {joinMode === 'open' ? 'Anyone with the link joins straight away.' : 'You approve new members (Me → Admin).'} You can change this later.
          </p>
          <div className="mt-6">
            <NextButton onClick={() => chooseChurch(made.row)}>Open {made.row.name}</NextButton>
          </div>
        </div>
      </div>
    );
  }

  const back = () => (step === 1 ? navigate('/find') : setStep(step - 1));
  const palette = paletteFor(colour);

  if (step === 1) {
    return (
      <Step step={1} title="About your church" subtitle="You can change all of this later." onBack={back}
        footer={<NextButton onClick={() => setStep(2)} disabled={name.trim().length < 2 || !slug || !!slugProblem || slugFree !== true}>Next</NextButton>}>
        <Label>Church name</Label>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} placeholder="Grace Chapel Dublin" autoFocus
          className="h-[50px] w-full rounded-2xl border-2 border-slate-200 bg-white px-3.5 text-[16px] text-foreground outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900" />
        <Label>Town and country</Label>
        <input value={city} onChange={(e) => setCity(e.target.value.slice(0, 60))} placeholder="Dublin, Ireland"
          className="h-[50px] w-full rounded-2xl border-2 border-slate-200 bg-white px-3.5 text-[16px] text-foreground outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900" />
        <Label>Your role</Label>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button key={r.id} onClick={() => setRole(r.id)}
              className={cn('rounded-full px-4 py-2 text-[14px] outline-none', role === r.id ? 'border-2 border-blue-600 bg-blue-50 font-semibold text-blue-700' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}>
              {r.label}
            </button>
          ))}
        </div>
        {name.trim().length >= 2 && (
          <div className="mt-6 rounded-[22px] border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Link2 className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] text-slate-500">Your church's link</span>
                <span className="block text-[13px] font-semibold text-foreground">{PLATFORM.url.replace('https://', '')}/</span>
                <input value={slug} onChange={(e) => { setSlugEdited(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)); }}
                  className="w-full bg-transparent text-[16px] font-semibold text-blue-600 outline-none" aria-label="Your church's link" />
              </span>
              {slugProblem ? <XCircle className="h-5 w-5 shrink-0 text-rose-500" /> : slugFree ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
            </div>
            {slugProblem && <p className="mt-1.5 pl-[50px] text-[12.5px] text-rose-600">{slugProblem}</p>}
          </div>
        )}
      </Step>
    );
  }

  if (step === 2) {
    return (
      <Step step={2} title="Make it yours" onBack={back} footer={<NextButton onClick={() => setStep(3)}>Next</NextButton>}>
        <div ref={previewRef}>
          <div className="mt-4 overflow-hidden rounded-[22px] shadow-lg ring-1 ring-slate-200">
            <div className="px-4 py-4 text-white" style={{ background: `linear-gradient(135deg, ${rgbToHex(palette['800'])}, ${rgbToHex(palette['500'])})` }}>
              <div className="flex items-center gap-3">
                {logo ? (
                  <img src={logo.preview} alt="" className="h-11 w-11 rounded-xl bg-white object-cover" />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white font-outfit text-[16px] font-bold" style={{ color: rgbToHex(palette['700']) }}>
                    {name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-[12px] text-white/75">Good morning</p>
                  <p className="font-outfit text-[18px] font-bold leading-tight">{name.trim()}</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-white/15 px-3 py-2.5 text-[13px]">"This is the day the Lord has made."</div>
            </div>
            <div className="flex items-center justify-around bg-white py-2.5 text-[11px] text-slate-500">
              <span className="font-semibold text-blue-600">Home</span><span>Bible</span><span>Prayer</span><span>Me</span>
            </div>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[12px] text-slate-400">Preview</p>

        <Label>Logo</Label>
        <div className="flex items-center gap-3 rounded-[22px] border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">
            {logo ? <img src={logo.preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" />}
          </span>
          <span className="flex-1 text-[14px] text-muted-foreground">{logo ? 'Your logo' : 'A square picture works best'}</span>
          <button onClick={() => fileRef.current?.click()} className="rounded-full bg-slate-100 px-3.5 py-1.5 text-[13.5px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {logo ? 'Change' : 'Add'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
        </div>

        <Label>Main colour</Label>
        <div className="flex flex-wrap gap-3">
          {COLOURS.map((c) => (
            <button key={c} onClick={() => setColour(c)} aria-label={c}
              className={cn('h-11 w-11 rounded-full', colour === c && 'ring-[3px] ring-white outline outline-[3px]')}
              style={{ background: rgbToHex(paletteFor(c)['600']), outlineColor: rgbToHex(paletteFor(c)['600']) }} />
          ))}
          <label className={cn('relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400', colour.startsWith('#') && 'border-solid ring-[3px] ring-white outline outline-[3px]')}
            style={colour.startsWith('#') ? { background: colour, outlineColor: colour } : undefined} aria-label="Your own colour">
            {!colour.startsWith('#') && <Plus className="h-5 w-5" />}
            <input type="color" value={colour.startsWith('#') ? colour : '#2563eb'} onChange={(e) => setColour(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
      </Step>
    );
  }

  if (step === 3) {
    return (
      <Step step={3} title="What will you use?" subtitle="Start simple. You can add more later." onBack={back} footer={<NextButton onClick={() => setStep(4)}>Next</NextButton>}>
        <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {PARTS.map((p, i) => {
            const on = p.always || (!p.soon && !!parts[p.id]);
            return (
              <button key={p.id} disabled={p.always || p.soon} onClick={() => setParts({ ...parts, [p.id]: !parts[p.id] })}
                className={cn('flex w-full items-center gap-3 px-4 py-[11px] text-left', i > 0 && 'border-t border-slate-100 dark:border-slate-800', p.soon && 'opacity-60')}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', p.tint)}><p.icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[14.5px] text-foreground">{p.title}</b>
                  <span className="block truncate text-[12.5px] text-muted-foreground">{p.always ? 'Always included' : p.soon ? 'Coming soon' : p.subtitle}</span>
                </span>
                <span className={cn('relative h-7 w-[46px] shrink-0 rounded-full transition', on ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700')}>
                  <span className={cn('absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all', on ? 'right-[3px]' : 'left-[3px]')} />
                </span>
              </button>
            );
          })}
        </div>
      </Step>
    );
  }

  return (
    <Step step={4} title="Who can join?" subtitle="You can change this any time." onBack={back}
      footer={<NextButton onClick={create} busy={busy}><Check className="h-5 w-5" /> Create {name.trim()}</NextButton>}>
      <div className="mt-4">
        <JoinModePicker value={joinMode} onChange={setJoinMode} />
      </div>
      <p className="mt-4 px-1 text-[13.5px] leading-relaxed text-muted-foreground">
        You'll be {name.trim()}'s admin{role === 'pastor' ? ' and pastor' : ''}. Next you'll get its link, QR code and join code to share.
      </p>
    </Step>
  );
};

export default CreateChurchPage;
