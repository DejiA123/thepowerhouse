import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronRight, Compass, Globe, Heart, MessageCircle, NotebookPen, Pause, Play, PlayCircle, Share2, Shuffle, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { useBiblePreferences } from '@/hooks/useBiblePreferences';
import { normalizeBookApiName } from '@/components/bible/bookUtils';
import { bookDisplayName, parseReference } from '@/services/bibleSmartSearch';
import { getRandomScripture, getTodaysScripture } from '@/utils/dailyScriptureUtils';
import UserAvatar from '@/components/common/UserAvatar';
import { appAlert } from '@/lib/appAlert';

export interface HomeBanner {
  title: string;
  subtitle: string;
  image: string;
  position: string;
  fallback: string;
  onClick: () => void;
  cta?: string;
}

const greetingFor = (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');

/**
 * The top of the home page: a personal greeting, the church's photo banners as a
 * swipeable carousel, verse of the day, "continue" and one-tap shortcuts.
 */
const HomeToday = ({ banners, websiteUrl, teachingsUrl }: { banners: HomeBanner[]; websiteUrl: string; teachingsUrl: string }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const audio = useGlobalAudio();
  const { preferences } = useBiblePreferences();
  const [verse, setVerse] = useState(getTodaysScripture);
  const [slide, setSlide] = useState(0);
  const carousel = useRef<HTMLDivElement>(null);
  const userTouched = useRef(false);

  const firstName = ((user?.user_metadata as any)?.full_name || '').trim().split(/\s+/)[0];
  const today = new Date();

  // Gentle auto-advance on phones until the person swipes
  useEffect(() => {
    const t = setInterval(() => {
      const el = carousel.current;
      if (!el || userTouched.current || el.scrollWidth <= el.clientWidth + 8) return;
      const next = (slide + 1) % banners.length;
      const card = el.children[next] as HTMLElement | undefined;
      if (card) el.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' });
    }, 6000);
    return () => clearInterval(t);
  }, [slide, banners.length]);

  const onCarouselScroll = () => {
    const el = carousel.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    children.forEach((c, i) => {
      if (Math.abs(c.offsetLeft + c.clientWidth / 2 - center) < Math.abs(children[best].offsetLeft + children[best].clientWidth / 2 - center)) best = i;
    });
    if (best !== slide) setSlide(best);
  };

  const openVerse = () => {
    const ref = parseReference(verse.reference.replace(/[–-]\d+$/, ''));
    if (ref) navigate(`/bible?book=${ref.book}&chapter=${ref.chapter}`);
    else navigate('/bible');
  };

  const shareVerse = async () => {
    // Same layout as copying from the Bible page: reference, then the verse
    const text = `${verse.reference}
${verse.verse}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        appAlert('Verse copied', 'Paste it anywhere to share.', 'success');
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  // "Continue" — the audio Bible if something is loaded, otherwise the last chapter read
  const listening = audio?.audioState.hasAudio && audio.audioState.isBibleMode;
  const lastBook = normalizeBookApiName(preferences.preferredBook || 'genesis');
  const lastChapter = preferences.preferredChapter || 1;

  const shortcuts = [
    { label: 'Bible', icon: BookOpen, tint: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300', onClick: () => navigate('/bible') },
    { label: 'Messages', icon: MessageCircle, tint: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300', onClick: () => navigate('/group-chats') },
    { label: 'Notes', icon: NotebookPen, tint: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300', onClick: () => navigate('/bible-notes') },
    { label: 'Prayer', icon: Sparkles, tint: 'bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300', onClick: () => navigate('/prayer') },
    { label: 'Website', icon: Globe, tint: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300', onClick: () => window.open(websiteUrl, '_blank', 'noopener') },
    { label: 'Teachings', icon: PlayCircle, tint: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300', onClick: () => window.open(teachingsUrl, '_blank', 'noopener') },
    { label: 'Social', icon: Heart, tint: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300', onClick: () => navigate('/social-media') },
    { label: 'New to faith', icon: Compass, tint: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', onClick: () => navigate('/resources') },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 pt-4">
      {/* Greeting */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="truncate font-outfit text-[28px] font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            {user ? `${greetingFor(today.getHours())}${firstName ? `, ${firstName}` : ''}` : 'Welcome to The Power House'}
          </h1>
        </div>
        {user ? (
          <button onClick={() => navigate('/settings')} aria-label="Your profile">
            <UserAvatar
              name={(user.user_metadata as any)?.full_name || user.email}
              src={(user.user_metadata as any)?.avatar_url}
              seed={user.id}
              className="h-11 w-11"
            />
          </button>
        ) : (
          <button onClick={() => navigate('/auth')} className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/25">
            Sign in
          </button>
        )}
      </div>

      {/* Photo banners: swipe on phones, grid on larger screens */}
      <div>
        <div
          ref={carousel}
          onScroll={onCarouselScroll}
          onTouchStart={() => (userTouched.current = true)}
          onPointerDown={() => (userTouched.current = true)}
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden"
        >
          {banners.map((banner) => (
            <button
              key={banner.title}
              onClick={banner.onClick}
              className={cn(
                'group relative h-52 w-[84%] shrink-0 snap-start overflow-hidden rounded-3xl text-left shadow-lg transition active:scale-[0.98] md:h-56 md:w-auto lg:h-64',
                banner.fallback,
              )}
              style={{
                backgroundImage: `url('${banner.image}')`,
                backgroundSize: 'cover',
                backgroundPosition: banner.position,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="mb-2 h-1 w-10 rounded-full bg-white/80" />
                <h2 className="text-2xl font-bold tracking-tight text-white">{banner.title}</h2>
                <p className="mt-0.5 text-sm text-white/80">{banner.subtitle}</p>
                {banner.cta && (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-900">
                    {banner.cta} <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-1.5 md:hidden" aria-hidden>
          {banners.map((b, i) => (
            <span key={b.title} className={cn('h-1.5 rounded-full transition-all', i === slide ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-300 dark:bg-slate-600')} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Verse of the day */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 p-5 text-white shadow-xl shadow-blue-900/20 md:p-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Verse of the day</p>
            <button
              onClick={() => setVerse(getRandomScripture(verse.reference))}
              className="rounded-full p-2 text-white/80 hover:bg-white/15"
              aria-label="Another verse"
            >
              <Shuffle className="h-4 w-4" />
            </button>
          </div>
          <p className="relative mt-2 font-serif text-[19px] leading-relaxed md:text-2xl">“{verse.verse}”</p>
          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="font-semibold">{verse.reference}</span>
            <div className="flex gap-2">
              <button onClick={openVerse} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-medium backdrop-blur hover:bg-white/30">
                <BookOpen className="h-4 w-4" /> Read
              </button>
              <button onClick={shareVerse} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-sm font-medium backdrop-blur hover:bg-white/30">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Continue */}
          <div className="flex items-center gap-4 rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
            {listening ? (
              <button
                onClick={() => (audio!.audioState.isPlaying ? audio!.pause() : audio!.resume())}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/30 transition active:scale-90"
                aria-label={audio!.audioState.isPlaying ? 'Pause' : 'Play'}
              >
                {audio!.audioState.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                <BookOpen className="h-5 w-5" />
              </div>
            )}
            <button
              onClick={() =>
                listening
                  ? navigate(`/bible?book=${audio!.audioState.currentBook}&chapter=${audio!.audioState.currentChapter}`)
                  : navigate(`/bible?book=${lastBook}&chapter=${lastChapter}`)
              }
              className="min-w-0 flex-1 text-left"
            >
              <p className="font-semibold text-foreground">{listening ? 'Continue listening' : 'Continue reading'}</p>
              <p className="truncate text-sm text-muted-foreground">
                {listening
                  ? `${audio!.audioState.trackTitle}${audio!.audioState.duration ? ` · ${Math.max(1, Math.round((audio!.audioState.duration - audio!.audioState.currentTime) / 60))} min left` : ''}`
                  : `${bookDisplayName(lastBook)} ${lastChapter}`}
              </p>
              {listening && audio!.audioState.duration > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Math.min(100, (100 * audio!.audioState.currentTime) / audio!.audioState.duration)}%` }}
                  />
                </div>
              )}
            </button>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </div>

          {/* Shortcuts */}
          <div className="grid grid-cols-4 gap-x-2 gap-y-3 rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
            {shortcuts.map((s) => (
              <button key={s.label} onClick={s.onClick} className="flex flex-col items-center gap-1.5 rounded-2xl py-1 transition active:scale-95">
                <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', s.tint)}>
                  <s.icon className="h-6 w-6" />
                </span>
                <span className="text-center text-[12px] font-medium leading-tight text-foreground/80">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeToday;
