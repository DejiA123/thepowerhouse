import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, ChevronUp, Play, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { church } from '@/config/church';
import { cn } from '@/lib/utils';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

/**
 * Home's "Daily inspiration": the church channel's newest Shorts as a sideways row of
 * tall cards, newest first ("New" for the last 3 days). A tap opens them full screen,
 * one under another like Reels: the ˄ ˅ buttons (a swipe on the video itself goes to
 * YouTube's player, not the page) or a swipe beside it move to the previous / next. The list comes from the
 * fetch-youtube-videos function (`kind: 'shorts'`: YouTube's public feeds, no key and
 * no quota), kept on the phone so it shows at once; playing is YouTube's own embed (no
 * quota). If no list can be had at all, YouTube's player of the channel's Shorts list
 * is shown instead, which is always the newest.
 */
export interface Short {
  id: string;
  title: string;
  publishedAt: string;
}

const CHANNEL_ID = church.youtube.channelId;
const SHORTS_LIST = CHANNEL_ID ? `UUSH${CHANNEL_ID.slice(2)}` : '';
const KEY = 'home_shorts_v1';
const NEW_MS = 3 * 86_400_000;

function readKept(): Short[] {
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) || 'null');
    return Array.isArray(kept?.shorts) ? kept.shorts : [];
  } catch {
    return [];
  }
}

const decode = (text: string) =>
  text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** "Today", "Yesterday", "3 days ago", "12 Nov" */
function whenLabel(iso: string) {
  const t = Date.parse(iso);
  if (!t) return '';
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/** The upright picture of a Short: YouTube's own, then its widest still (cropped to the middle) */
const Thumb = ({ id, className }: { id: string; className?: string }) => {
  const sources = [`https://i.ytimg.com/vi/${id}/oardefault.jpg`, `https://i.ytimg.com/vi/${id}/hq720.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`];
  const [i, setI] = useState(0);
  return (
    <img
      src={sources[i]}
      alt=""
      loading="lazy"
      decoding="async"
      // YouTube answers a missing picture with a tiny grey one: count that as missing too
      onLoad={(e) => e.currentTarget.naturalWidth <= 120 && i < sources.length - 1 && setI(i + 1)}
      onError={() => i < sources.length - 1 && setI(i + 1)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
};

const ShortsRail = () => {
  const [shorts, setShorts] = useState<Short[]>(readKept);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-youtube-videos', { body: { kind: 'shorts' } });
      if (error) throw error;
      if (data?.channelId && data.channelId !== CHANNEL_ID) throw new Error("not the church's channel");
      const list: Short[] = (data?.videos ?? [])
        .filter((v: { id?: string }) => typeof v.id === 'string')
        .map((v: { id: string; title?: string; publishedAt?: string }) => ({ id: v.id, title: decode(v.title || ''), publishedAt: v.publishedAt || '' }));
      if (!list.length) throw new Error('no Shorts');
      setShorts(list);
      setFailed(false);
      try {
        localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), shorts: list }));
      } catch {
        /* full or private */
      }
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  // New reels show up without reopening the app (quietly, every 10 minutes while on screen)
  useLiveRefresh([], refresh, { pollMs: 10 * 60_000 });

  if (!CHANNEL_ID) return null;
  const channelShorts = `https://www.youtube.com/${church.youtube.handle}/shorts`;

  return (
    <section aria-labelledby="daily-inspiration" data-testid="shorts-rail">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 id="daily-inspiration" className="font-outfit text-[22px] font-bold leading-tight tracking-tight text-foreground">Daily inspiration</h2>
          <p className="text-[14px] text-muted-foreground">Short clips from {church.name}</p>
        </div>
        <a
          href={channelShorts}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[14px] font-semibold text-blue-600 dark:text-blue-400"
        >
          See all <ChevronRight className="h-4 w-4" />
        </a>
      </div>

      {shorts.length ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {shorts.map((s, i) => {
            const fresh = Date.now() - Date.parse(s.publishedAt) < NEW_MS;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpen(i)}
                className="group relative aspect-[9/16] w-[44%] max-w-[210px] shrink-0 snap-start overflow-hidden rounded-[20px] bg-slate-900 text-left shadow-md ring-1 ring-black/5 transition active:scale-[0.97] md:w-[200px]"
                aria-label={`Play: ${s.title}`}
                data-testid="short-card"
              >
                <Thumb id={s.id} />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/0" />
                {fresh && (
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow">New</span>
                )}
                <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </span>
                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="line-clamp-3 text-[14px] font-semibold leading-snug text-white [overflow-wrap:anywhere]">{s.title}</span>
                  <span className="mt-1 block text-[12px] text-white/75">{whenLabel(s.publishedAt)}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : failed && SHORTS_LIST ? (
        // No list at all: YouTube's own player of the channel's Shorts (always the newest)
        <div className="mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-[20px] bg-black shadow-md">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/videoseries?list=${SHORTS_LIST}&rel=0&modestbranding=1&playsinline=1`}
            title="Daily inspiration"
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="-mx-4 flex gap-3 overflow-hidden px-4" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="aspect-[9/16] w-[44%] max-w-[210px] shrink-0 animate-pulse rounded-[20px] bg-muted" />
          ))}
        </div>
      )}

      {/* On the page's top level: Home's sections make their own layers, which kept it under the header */}
      {open !== null && createPortal(<ShortsViewer shorts={shorts} start={open} onClose={() => setOpen(null)} />, document.body)}
    </section>
  );
};

/** Full screen, one Short under another (˄ ˅ for the previous / next), above the bottom bar */
const ShortsViewer = ({ shorts, start, onClose }: { shorts: Short[]; start: number; onClose: () => void }) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(start);

  // Open on the one that was tapped
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = start * el.clientHeight;
  }, [start]);

  const go = (step: number) => {
    const el = scroller.current;
    const next = Math.min(shorts.length - 1, Math.max(0, active + step));
    if (el) el.scrollTo({ top: next * el.clientHeight, behavior: 'smooth' });
  };

  // Which one is on screen (only that one plays)
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.index))),
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll('[data-index]').forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [shorts.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily inspiration"
      data-testid="shorts-viewer"
      className="fixed inset-x-0 top-0 bottom-[var(--bottom-nav-h,0px)] z-[200] bg-black"
    >
      <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shorts.map((s, i) => (
          <div key={s.id} data-index={i} className="relative flex h-full snap-start snap-always items-center justify-center">
            <div className="relative aspect-[9/16] h-full max-h-full max-w-full">
              {Math.abs(i - active) === 0 ? (
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${s.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${s.id}`}
                  title={s.title}
                  allow="autoplay; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <Thumb id={s.id} className="opacity-70" />
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)] pt-10">
              <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-white">{s.title}</p>
              <p className="mt-0.5 text-[12.5px] text-white/70">
                {whenLabel(s.publishedAt)} · {i + 1} of {shorts.length}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={active === 0}
          aria-label="Previous"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition active:scale-90 disabled:opacity-30"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={active >= shorts.length - 1}
          aria-label="Next"
          data-testid="shorts-next"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition active:scale-90 disabled:opacity-30"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ShortsRail;
