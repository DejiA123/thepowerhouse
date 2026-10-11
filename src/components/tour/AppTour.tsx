import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SECTIONS } from '@/data/appDirectory';
import { TOUR_DONE_KEY, TOUR_EVENT } from '@/lib/appEvents';

interface Step {
  /** The part of the screen to light up (data-tour="…"); none = a welcome card in the middle */
  target?: string;
  emoji: string;
  title: string;
  body: string;
  sections?: boolean;
}

const STEPS: Step[] = [
  {
    emoji: '👋',
    title: 'Welcome to The Power House',
    body: "Let's take a quick look around. It takes less than a minute.",
  },
  {
    target: 'tabs',
    emoji: '🧭',
    title: 'Everything lives here',
    body: 'Tap one of these to go there. You can always come back to Home.',
    sections: true,
  },
  {
    target: 'tiles',
    emoji: '👆',
    title: 'Tap a picture to start',
    body: 'Read the Bible, watch a service, give, pray and more. One tap and you are there.',
  },
  {
    target: 'search',
    emoji: '🔍',
    title: "Can't find something?",
    body: 'Type what you want here, like “choir lessons” or “give”, and we will take you straight there.',
  },
  {
    target: 'help',
    emoji: '🙋',
    title: 'Help is always here',
    body: 'Tap Help any time to ask “How do I…?”. You can watch this tour again from Help or from Me.',
  },
];

const done = () => {
  try {
    return localStorage.getItem(TOUR_DONE_KEY) === '1';
  } catch {
    return true;
  }
};

/** The visible element for a step (the phone and tablet layouts each have their own). */
const findTarget = (name: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)).find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

const PAD = 8;
const CARD_W = 380;

// The splash screen is gone once the first page is up (see AppReady in App.tsx)
let appReady = false;
if (typeof window !== 'undefined') window.addEventListener('app-ready', () => (appReady = true), { once: true });

/**
 * A short welcome tour, shown once to everyone on Home (including people who
 * used the app before this layout), then any time from Help or Me.
 */
const AppTour = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight });

  // First time on Home: start once the app is showing
  useEffect(() => {
    if (done() || step !== null || pathname !== '/') return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const begin = () => {
      t = setTimeout(() => {
        if (!done() && window.location.pathname === '/') setStep(0);
      }, 1200);
    };
    if (appReady) begin();
    else window.addEventListener('app-ready', begin, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('app-ready', begin);
    };
  }, [pathname, step]);

  // "Show me around" from Help or Me: back to Home and start again
  useEffect(() => {
    const replay = () => {
      navigate('/');
      setTimeout(() => setStep(0), 450);
    };
    window.addEventListener(TOUR_EVENT, replay);
    return () => window.removeEventListener(TOUR_EVENT, replay);
  }, [navigate]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(TOUR_DONE_KEY, '1');
    } catch {
      /* private mode */
    }
    setStep(null);
  }, []);

  const current = step === null ? null : STEPS[step];

  // Light up this step's part of the screen (and keep it lined up)
  useLayoutEffect(() => {
    if (!current) return;
    const measure = () => {
      setView({ w: window.innerWidth, h: window.innerHeight });
      const el = current.target ? findTarget(current.target) : undefined;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const el = current.target ? findTarget(current.target) : undefined;
    if (el) el.scrollIntoView({ block: 'center', inline: 'nearest' });
    measure();
    const t = setTimeout(measure, 120);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [current]);

  // Leaving Home in the middle of the tour ends it
  useEffect(() => {
    if (step !== null && pathname !== '/') setStep(null);
  }, [pathname, step]);

  if (!current) return null;

  const last = step === STEPS.length - 1;
  const next = () => (last ? finish() : setStep((s) => (s ?? 0) + 1));

  // Where the card goes: beside a tall sidebar, otherwise above or below the lit-up part
  const cardW = Math.min(CARD_W, view.w - 32);
  let cardStyle: React.CSSProperties;
  let arrow: 'up' | 'down' | 'left' | null = null;
  if (!rect) {
    cardStyle = { left: (view.w - cardW) / 2, top: Math.max(24, view.h / 2 - 170) };
  } else if (rect.height > view.h * 0.5 && view.w - rect.right > cardW + 40) {
    cardStyle = { left: rect.right + 20, top: Math.min(Math.max(24, rect.top + 40), view.h - 360) };
    arrow = 'left';
  } else {
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), view.w - cardW - 16);
    if (view.h - rect.bottom > 300 || view.h - rect.bottom > rect.top) {
      cardStyle = { left, top: rect.bottom + PAD + 16 };
      arrow = 'up';
    } else {
      cardStyle = { left, bottom: view.h - rect.top + PAD + 16 };
      arrow = 'down';
    }
  }
  const arrowLeft = rect ? Math.min(Math.max(28, rect.left + rect.width / 2 - (cardStyle.left as number)), cardW - 28) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[400]" role="dialog" aria-modal="true" aria-label="Welcome tour">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-[24px] transition-all duration-300 ease-out"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 4px #fff, 0 0 0 9999px rgba(15,23,42,0.66)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/65" />
      )}
      {/* Taps outside the card do nothing, so nobody skips the tour by accident */}
      <div className="absolute inset-0" />

      <div
        className="absolute rounded-[26px] bg-white p-5 text-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ ...cardStyle, width: cardW }}
        key={step}
      >
        {arrow === 'up' && <span className="absolute -top-2 h-5 w-5 -translate-x-1/2 rotate-45 rounded-[3px] bg-white" style={{ left: arrowLeft }} />}
        {arrow === 'down' && <span className="absolute -bottom-2 h-5 w-5 -translate-x-1/2 rotate-45 rounded-[3px] bg-white" style={{ left: arrowLeft }} />}
        {arrow === 'left' && <span className="absolute -left-2 top-10 h-5 w-5 rotate-45 rounded-[3px] bg-white" />}

        <div className="text-[40px] leading-none">{current.emoji}</div>
        <h2 className="mt-3 font-outfit text-[23px] font-bold leading-tight tracking-tight">{current.title}</h2>
        <p className="mt-2 text-[16.5px] leading-relaxed text-slate-600">{current.body}</p>
        {current.sections && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SECTIONS.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[13.5px] font-semibold text-blue-700">
                <s.icon className="h-4 w-4" /> {s.title}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button onClick={finish} className="text-[15.5px] font-semibold text-slate-500">
            {step === 0 ? 'Not now' : 'Skip'}
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={cn('h-2 rounded-full transition-all', i === step ? 'w-5 bg-blue-600' : 'w-2 bg-slate-300')} />
            ))}
          </div>
          <button onClick={next} className="h-12 rounded-full bg-blue-600 px-6 text-[16.5px] font-bold text-white shadow-md shadow-blue-600/30 transition active:scale-95">
            {step === 0 ? "Let's go" : last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AppTour;
