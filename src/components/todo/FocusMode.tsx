import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Gift, Headphones, HelpCircle, Pause, Play, PartyPopper, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nextStep, progress } from '@/lib/todo/brain';
import type { Todo } from '@/lib/todo/types';

/**
 * Focus: one task, one step, one timer. Starting is the hard part, so the first time it's
 * 2 minutes ("just start"); most people keep going once they've begun. The timer runs
 * from a start time (kept on the phone), so it's right after the screen locks or the app
 * is put away, and the screen is kept awake while it runs. Minutes spent are added to
 * the task and to the streak.
 */
interface Session {
  todoId: string;
  /** Length chosen, seconds */
  total: number;
  /** Seconds done before the current run */
  before: number;
  /** When the current run started (ms), null while paused */
  startedAt: number | null;
  note?: string;
  /** The length it began with, minutes (did a 2-minute start keep going?) */
  initial?: number;
}

/** How a session went, for "Is it working?" */
export interface FocusResult {
  seconds: number;
  /** The length it began with, minutes */
  initial: number;
}

const KEY = 'todo_focus_session_v1';
const CHOICES = [2, 10, 25, 45];

const readSession = (): Session | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
};
const saveSession = (s: Session | null) => {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* private window */
  }
};

const elapsedOf = (s: Session, now = Date.now()) => s.before + (s.startedAt ? (now - s.startedAt) / 1000 : 0);
/** Minutes worth recording (45 seconds counts as one) */
const minutesOf = (seconds: number) => (seconds >= 45 ? Math.max(1, Math.round(seconds / 60)) : 0);
const resultOf = (s: Session | null): FocusResult | null =>
  s ? { seconds: Math.round(elapsedOf(s)), initial: s.initial ?? Math.round(s.total / 60) } : null;

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = [660, 880, 1046][i];
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.4);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 1200);
  } catch {
    /* no sound */
  }
  try {
    navigator.vibrate?.([180, 90, 180]);
  } catch {
    /* no vibration */
  }
}

// ── Calm sound: soft brown noise made on the phone (no download), for shutting out the room
const noise: { ctx: AudioContext | null; src: AudioBufferSourceNode | null; gain: GainNode | null } = { ctx: null, src: null, gain: null };

/** Must run inside a tap (iPhone only lets sound start from one) */
function startNoise() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = noise.ctx ?? new Ctx();
    noise.ctx = ctx;
    void ctx.resume();
    if (noise.src) return;
    const len = ctx.sampleRate * 6;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    // Ease the end into the start so the loop doesn't click
    const fade = Math.floor(ctx.sampleRate * 0.25);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 1.2);
    src.connect(gain).connect(ctx.destination);
    src.start();
    noise.src = src;
    noise.gain = gain;
  } catch {
    /* no sound here */
  }
}

function stopNoise() {
  const { ctx, src, gain } = noise;
  noise.src = null;
  noise.gain = null;
  if (!ctx || !src || !gain) return;
  try {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    src.stop(ctx.currentTime + 0.45);
  } catch {
    /* already stopped */
  }
}

const FocusMode = ({
  todo,
  start,
  onClose,
  onStepDone,
  onComplete,
  onStuck,
  onTimer,
  onBegin,
}: {
  todo: Todo | null;
  /** Length and a note for this run (from the coach), else 2 minutes the first time, 25 after */
  start?: { minutes: number; note?: string } | null;
  /** Closed: minutes spent */
  onClose: (minutes: number, result: FocusResult | null) => void;
  onStepDone: (stepId: string) => void;
  /** The whole task is done: minutes spent */
  onComplete: (minutes: number, result: FocusResult | null) => void;
  /** A new session began (not one carried on) */
  onBegin?: (todoId: string, minutes: number) => void;
  onStuck: () => void;
  /** While the timer runs: when it will run out (null when paused or closed), for the "time's up" notification */
  onTimer?: (todoId: string, endIso: string | null) => void;
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [sound, setSound] = useState(false);
  const [, tick] = useState(0);
  const rang = useRef(false);

  // Open: carry on a session for this task, or start a new one straight away
  useEffect(() => {
    if (!todo) return;
    const kept = readSession();
    if (kept && kept.todoId === todo.id && !start) {
      setSession(kept);
      rang.current = elapsedOf(kept) >= kept.total;
      return;
    }
    const minutes = start?.minutes ?? (todo.focus_min > 0 || progress(todo).done > 0 ? 25 : 2);
    const fresh: Session = { todoId: todo.id, total: minutes * 60, before: 0, startedAt: Date.now(), note: start?.note, initial: minutes };
    saveSession(fresh);
    setSession(fresh);
    rang.current = false;
    onBegin?.(todo.id, minutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todo?.id, start]);

  const update = useCallback((s: Session | null) => {
    saveSession(s);
    setSession(s);
  }, []);

  // Tell the server when the timer will run out, so a notification rings if you're in
  // another app (doing the task!). Only when it changes: started, paused, longer, closed.
  const sentEnd = useRef<string | null | undefined>(undefined);
  // The task the timer belonged to, so closing still cancels its notification
  const timerTask = useRef<string | null>(null);
  useEffect(() => {
    if (!onTimer) return;
    const id = session?.todoId ?? timerTask.current;
    if (!id) return;
    if (session && session.todoId !== timerTask.current) {
      // Another task's timer: cancel the old one's notification first
      if (timerTask.current && sentEnd.current) onTimer(timerTask.current, null);
      timerTask.current = session.todoId;
      sentEnd.current = undefined;
    }
    let end: string | null = null;
    if (session?.startedAt) {
      const left = session.total - elapsedOf(session);
      if (left > 0) end = new Date(Math.round((Date.now() + left * 1000) / 1000) * 1000).toISOString();
    }
    const same = end && sentEnd.current ? Math.abs(Date.parse(end) - Date.parse(sentEnd.current)) < 5000 : end === sentEnd.current;
    if (same) return;
    sentEnd.current = end;
    onTimer(id, end);
    if (!session) timerTask.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // The calm sound stops when focus closes
  useEffect(() => {
    if (!todo) {
      stopNoise();
      setSound(false);
    }
  }, [todo]);
  useEffect(() => () => stopNoise(), []);

  const running = !!session?.startedAt;
  const elapsed = session ? elapsedOf(session) : 0;
  const left = session ? Math.max(0, session.total - elapsed) : 0;
  const finished = !!session && left <= 0;

  // The clock (and the chime when time's up)
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      tick((n) => n + 1);
      const s = readSession();
      if (s && s.startedAt && !rang.current && elapsedOf(s) >= s.total) {
        rang.current = true;
        if (document.visibilityState === 'visible') chime();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [running]);

  // Keep the screen awake while the timer runs
  useEffect(() => {
    if (!todo || !running || finished) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    const take = () => nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);
    void take();
    const again = () => document.visibilityState === 'visible' && void take();
    document.addEventListener('visibilitychange', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      lock?.release().catch(() => undefined);
    };
  }, [todo, running, finished]);

  const close = useCallback(() => {
    const s = readSession();
    const mins = s ? minutesOf(elapsedOf(s)) : 0;
    update(null);
    onClose(mins, resultOf(s));
  }, [onClose, update]);

  // Escape closes
  useEffect(() => {
    if (!todo) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [todo, close]);

  const step = todo ? nextStep(todo) : null;
  const upcoming = useMemo(() => (todo ? todo.steps.filter((s) => !s.done && s.id !== step?.id).slice(0, 3) : []), [todo, step?.id]);
  if (!todo || !session) return null;

  const pause = () => update({ ...session, before: elapsed, startedAt: null });
  const resume = () => update({ ...session, startedAt: Date.now() });
  const setLength = (min: number) => {
    rang.current = elapsed >= min * 60;
    // Picked straight away: that's the length it began with
    update({ ...session, total: min * 60, startedAt: session.startedAt ?? Date.now(), initial: elapsed < 60 ? min : session.initial });
  };
  const more = (min: number) => {
    rang.current = false;
    update({ ...session, total: Math.max(elapsed, session.total) + min * 60, before: elapsed, startedAt: Date.now() });
  };
  const finishTask = () => {
    const mins = minutesOf(elapsed);
    const result = resultOf(session);
    update(null);
    onComplete(mins, result);
  };

  const mm = Math.floor(left / 60);
  const ss = Math.floor(left % 60);
  const R = 96;
  const C = 2 * Math.PI * R;
  const frac = session.total ? Math.min(1, elapsed / session.total) : 0;
  const p = progress(todo);

  // On the page's own layer it would sit under the app's header (the page's opening
  // animation pins fixed layers inside the page), so it goes straight on the body
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Focus on ${todo.title}`}
      className="fixed inset-x-0 top-0 z-[180] flex flex-col overflow-y-auto bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 text-white"
      style={{ bottom: 'var(--bottom-nav-h, 0px)' }}
      data-testid="focus-mode"
    >
      <div className="flex items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button onClick={close} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition active:scale-95" aria-label="Close focus">
          <X className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[14px] font-semibold text-white/70">{todo.title}</p>
        <button
          onClick={() => {
            if (sound) stopNoise();
            else startNoise();
            setSound(!sound);
          }}
          aria-pressed={sound}
          aria-label={sound ? 'Turn the calm sound off' : 'Calm sound'}
          title="Calm sound"
          className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95', sound ? 'bg-indigo-400 text-slate-950' : 'bg-white/10')}
          data-testid="focus-sound"
        >
          <Headphones className="h-5 w-5" />
        </button>
        <button onClick={onStuck} className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13.5px] font-semibold transition active:scale-95">
          <HelpCircle className="h-4 w-4" /> Stuck?
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-5">
        <div className="mt-6 text-center">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-indigo-300">{finished ? 'Time!' : 'Right now, just'}</p>
          <h2 className="mt-2 font-outfit text-[24px] font-bold leading-tight [overflow-wrap:anywhere]" data-testid="focus-step">
            {finished
              ? 'You started. That was the hard part.'
              : session.note ?? step?.text ?? 'Just begin. Nothing else, only this.'}
          </h2>
          {!finished && session.note && step && <p className="mt-2 text-[14px] text-white/60">Next step: {step.text}</p>}
        </div>

        {/* The timer */}
        <div className="relative mx-auto mt-6 h-[220px] w-[220px]">
          <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
            <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
            <circle
              cx="110"
              cy="110"
              r={R}
              fill="none"
              stroke={finished ? '#34d399' : '#818cf8'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - frac)}
              style={{ transition: 'stroke-dashoffset 250ms linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-outfit text-[52px] font-bold tabular-nums leading-none" data-testid="focus-clock">
              {finished ? <PartyPopper className="h-14 w-14 text-emerald-300" /> : `${mm}:${String(ss).padStart(2, '0')}`}
            </span>
            <span className="mt-2 text-[13px] text-white/60">
              {finished ? `${minutesOf(elapsed) || 1} min focused` : running ? 'Focusing' : 'Paused'}
            </span>
          </div>
        </div>

        {finished ? (
          <div className="mt-6 space-y-2.5">
            <p className="text-center text-[15px] text-white/80">Keep going while you’re in the flow?</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => more(5)} className="h-12 rounded-2xl bg-white/10 text-[15px] font-semibold active:scale-[0.98]">+5 min</button>
              <button onClick={() => more(25)} className="h-12 rounded-2xl bg-indigo-500 text-[15px] font-semibold active:scale-[0.98]">+25 min</button>
            </div>
            <button onClick={close} className="h-12 w-full rounded-2xl bg-white/10 text-[15px] font-semibold active:scale-[0.98]">Take a break</button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex justify-center gap-2" role="radiogroup" aria-label="How long">
              {CHOICES.map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={session.total === m * 60}
                  onClick={() => setLength(m)}
                  className={cn('h-9 min-w-[56px] rounded-full px-3 text-[14px] font-semibold transition', session.total === m * 60 ? 'bg-white text-slate-900' : 'bg-white/10 text-white/80')}
                >
                  {m} min
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={running ? pause : resume}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition active:scale-95"
                aria-label={running ? 'Pause' : 'Resume'}
              >
                {running ? <Pause className="h-6 w-6 fill-current" /> : <Play className="ml-1 h-6 w-6 fill-current" />}
              </button>
            </div>
          </>
        )}

        {/* Steps */}
        {step && (
          <button
            onClick={() => onStepDone(step.id)}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[15.5px] font-semibold text-white shadow-lg shadow-emerald-900/30 transition active:scale-[0.98]"
            data-testid="focus-step-done"
          >
            <Check className="h-5 w-5" strokeWidth={3} /> Step done{upcoming.length ? ', next one' : ''}
          </button>
        )}
        {upcoming.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {upcoming.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-[14px] text-white/55">
                <ChevronRight className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{s.text}</span>
                {s.minutes ? <span className="shrink-0 tabular-nums">{s.minutes} min</span> : null}
              </li>
            ))}
          </ul>
        )}
        {p.total > 0 && <p className="mt-3 text-center text-[13px] text-white/50">{p.done} of {p.total} steps done</p>}
        {todo.why && <p className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-center text-[14px] italic text-white/75">“{todo.why}”</p>}
        {todo.reward && (
          <p className="mt-3 flex items-center justify-center gap-2 text-[14px] text-amber-200/90">
            <Gift className="h-4 w-4" /> When it’s done: {todo.reward}
          </p>
        )}

        <div className="flex-1" />
        <button
          onClick={finishTask}
          className="mt-6 h-12 w-full rounded-2xl border border-white/20 text-[15px] font-semibold text-white transition active:scale-[0.98]"
          data-testid="focus-finished"
        >
          I finished the whole task 🎉
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default FocusMode;
