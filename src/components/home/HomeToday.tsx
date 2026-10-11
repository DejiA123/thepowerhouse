import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Pause, Play, Search, Share2, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HOME_TILES, TILE } from '@/data/appDirectory';
import { openSearch } from '@/lib/appEvents';
import { PictureTile } from '@/components/page/PageKit';
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
 * The top of the home page, made to be obvious at a glance: a greeting that
 * asks "What would you like to do today?", a big search box, carry on where
 * you left off, eight big picture buttons, then the verse of the day and the
 * church's photo banners.
 */
const HomeToday = ({ banners }: { banners: HomeBanner[] }) => {
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

  const continueLabel = listening
    ? `${audio!.audioState.trackTitle}${audio!.audioState.duration ? ` · ${Math.max(1, Math.round((audio!.audioState.duration - audio!.audioState.currentTime) / 60))} min left` : ''}`
    : `${bookDisplayName(lastBook)} ${lastChapter}`;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="font-outfit text-[30px] font-bold leading-[1.15] tracking-tight text-foreground md:text-4xl">
            {user ? `${greetingFor(today.getHours())}${firstName ? `, ${firstName}` : ''}` : 'Welcome!'}
            <span aria-hidden> 👋</span>
          </h1>
          <p className="mt-1 text-[16.5px] text-muted-foreground">What would you like to do today?</p>
        </div>
        {user ? (
          <button onClick={() => navigate('/me')} aria-label="Me" className="shrink-0">
            <UserAvatar
              name={(user.user_metadata as any)?.full_name || user.email}
              src={(user.user_metadata as any)?.avatar_url}
              seed={user.id}
              className="h-12 w-12"
            />
          </button>
        ) : (
          <button onClick={() => navigate('/auth')} className="mt-5 shrink-0 rounded-full bg-blue-600 px-5 py-2.5 text-[15px] font-semibold text-white shadow-md shadow-blue-600/25">
            Sign in
          </button>
        )}
      </div>

      {/* Find anything */}
      <button
        data-tour="search"
        onClick={() => openSearch()}
        className="mt-4 flex h-14 w-full items-center gap-3 rounded-[18px] border-2 border-blue-100 bg-card px-4 text-left text-[16.5px] text-muted-foreground shadow-[0_6px_18px_rgba(37,99,235,0.08)] transition hover:border-blue-300 active:scale-[0.99] dark:border-slate-700 md:max-w-xl"
      >
        <Search className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
        What are you looking for?
      </button>

      {/* Carry on where you left off */}
      <div className="mt-4 flex items-center gap-3.5 rounded-[20px] border border-border/70 bg-card p-3.5 shadow-sm md:max-w-xl">
        {listening ? (
          <button
            onClick={() => (audio!.audioState.isPlaying ? audio!.pause() : audio!.resume())}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 transition active:scale-90"
            aria-label={audio!.audioState.isPlaying ? 'Pause' : 'Play'}
          >
            {audio!.audioState.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
        ) : (
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white', TILE.blue)}>
            <BookOpen className="h-6 w-6" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-bold uppercase tracking-[0.06em] text-blue-600 dark:text-blue-400">
            {listening ? 'Carry on listening' : 'Carry on reading'}
          </span>
          <span className="block truncate font-outfit text-[17px] font-semibold text-foreground">{continueLabel}</span>
          {listening && audio!.audioState.duration > 0 && (
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-blue-600"
                style={{ width: `${Math.min(100, (100 * audio!.audioState.currentTime) / audio!.audioState.duration)}%` }}
              />
            </span>
          )}
        </span>
        <button
          onClick={() =>
            listening
              ? navigate(`/bible?book=${audio!.audioState.currentBook}&chapter=${audio!.audioState.currentChapter}`)
              : navigate(`/bible?book=${lastBook}&chapter=${lastChapter}`)
          }
          className="h-11 shrink-0 rounded-full bg-blue-600 px-5 text-[15px] font-semibold text-white shadow-md shadow-blue-600/25 transition active:scale-95"
        >
          Open
        </button>
      </div>

      {/* The big picture buttons */}
      <h2 className="mb-2.5 mt-6 px-1 text-[12.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Tap a picture</h2>
      <div data-tour="tiles" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {HOME_TILES.map((t) => (
          <div key={t.id} className="contents">
            <span className="md:hidden">
              <PictureTile layout="row" icon={t.icon} tint={TILE[t.color]} title={t.title} subtitle={t.subtitle} onClick={() => navigate(typeof t.to === 'function' ? t.to() : t.to)} />
            </span>
            <span className="hidden md:block">
              <PictureTile icon={t.icon} tint={TILE[t.color]} title={t.title} subtitle={t.subtitle} onClick={() => navigate(typeof t.to === 'function' ? t.to() : t.to)} />
            </span>
          </div>
        ))}
      </div>

      {/* Verse of the day */}
      <div className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 p-5 text-white shadow-xl shadow-blue-900/20 md:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Verse of the day</p>
          <button
            onClick={() => setVerse(getRandomScripture(verse.reference))}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/15"
            aria-label="Another verse"
          >
            <Shuffle className="h-4 w-4" /> Another
          </button>
        </div>
        <p className="relative mt-2 font-serif text-[19px] leading-relaxed md:text-2xl">“{verse.verse}”</p>
        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold">{verse.reference}</span>
          <div className="flex gap-2">
            <button onClick={openVerse} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/30">
              <BookOpen className="h-4 w-4" /> Read
            </button>
            <button onClick={shareVerse} className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/30">
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
      </div>

      {/* The church's photo banners: swipe on phones, grid on larger screens */}
      <h2 className="mb-2.5 mt-7 px-1 text-[12.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Get involved</h2>
      <div
        ref={carousel}
        onScroll={onCarouselScroll}
        onTouchStart={() => (userTouched.current = true)}
        onPointerDown={() => (userTouched.current = true)}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((banner) => (
          <button
            key={banner.title}
            onClick={banner.onClick}
            className={cn(
              'group relative h-48 w-[84%] shrink-0 snap-start overflow-hidden rounded-3xl text-left shadow-lg transition active:scale-[0.98] md:h-52 md:w-auto',
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
              <h3 className="text-2xl font-bold tracking-tight text-white">{banner.title}</h3>
              <p className="mt-0.5 text-sm text-white/85">{banner.subtitle}</p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-900">
                {banner.cta ?? 'Open'} <ChevronRight className="h-4 w-4" />
              </span>
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
  );
};

export default HomeToday;
