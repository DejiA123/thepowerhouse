import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HOME_TILES, TILE } from '@/data/appDirectory';
import { openSearch } from '@/lib/appEvents';
import { PictureTile } from '@/components/page/PageKit';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import UserAvatar from '@/components/common/UserAvatar';
import VerseOfTheDay from './VerseOfTheDay';

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
 * The top of the home page, made to be obvious at a glance: a greeting (no date,
 * no question: the church's choice, Nov 2026), a big search box, eight big picture
 * buttons, then the verse of the day and the church's photo banners. (No "Carry on
 * reading" card, the church's choice, Nov 2026: the Bible opens where you left off,
 * and the mini player at the bottom carries on listening.)
 */
const HomeToday = ({ banners }: { banners: HomeBanner[] }) => {
  const navigate = useNavigate();
  const { unreadChats } = useNotifications();
  const { user } = useAuth();
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

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-outfit text-[30px] font-bold leading-[1.15] tracking-tight text-foreground md:text-4xl">
            {user ? `${greetingFor(today.getHours())}${firstName ? `, ${firstName}` : ''}` : 'Welcome!'}
            <span aria-hidden> 👋</span>
          </h1>
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

      {/* The big picture buttons */}
      <div data-tour="tiles" role="group" aria-label="Quick links" className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {HOME_TILES.map((t) => (
          <div key={t.id} className="contents">
            <span className="md:hidden">
              <PictureTile layout="row" count={t.id === 'messages' ? unreadChats : 0} icon={t.icon} tint={TILE[t.color]} title={t.title} subtitle={t.subtitle} onClick={() => navigate(typeof t.to === 'function' ? t.to() : t.to)} />
            </span>
            <span className="hidden md:block">
              <PictureTile count={t.id === 'messages' ? unreadChats : 0} icon={t.icon} tint={TILE[t.color]} title={t.title} subtitle={t.subtitle} onClick={() => navigate(typeof t.to === 'function' ? t.to() : t.to)} />
            </span>
          </div>
        ))}
      </div>

      {/* Verse of the day: earlier days and other translations a tap away */}
      <VerseOfTheDay />

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
