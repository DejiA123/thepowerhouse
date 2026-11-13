import type { Repeat, Todo, TodoStep } from './types';

/**
 * The thinking behind To do: what to do next and why, when to start so a deadline is
 * met calmly, what belongs to Today, repeats and momentum. Pure functions (the time is
 * passed in), so it's all tested (brain.test.ts).
 *
 * What it's built on (procrastination research, in plain words):
 * - Starting is the hard part: every task has a next tiny step, and the timer starts at
 *   2 minutes ("just start").
 * - People underestimate how long things take (the planning fallacy): estimates get a
 *   50% buffer, and big work is spread over days, so "start by" comes early enough.
 * - A plan with a time ("I'll start at 7pm") is far more likely to happen than a wish:
 *   planned times ring a reminder and rise to the top when they come.
 * - The task you keep avoiding (put off again and again) rises, instead of sinking.
 * - Do the one that matters most first (important), and keep small wins visible.
 */

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
/** Real focused minutes a day you can give one task (spreading big work over days) */
export const DAILY_FOCUS_MIN = 90;
/** The planning-fallacy buffer: people take about 1.5× what they expect */
export const BUFFER = 1.5;
/** A step with no time takes about this long */
const STEP_MIN = 10;
/** A task with no estimate and no steps */
const DEFAULT_MIN = 30;

// ── Dates (the phone's own time zone) ───────────────────────────────
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 0, 0);
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
/** YYYY-MM-DD on the phone's calendar */
export const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const sameDay = (a: Date, b: Date) => localDay(a) === localDay(b);
/** Whole calendar days from a to b (b later: positive) */
export const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);

const at = (iso: string | null | undefined) => (iso ? new Date(iso) : null);

// ── Steps and time ──────────────────────────────────────────────────
export const progress = (t: Todo) => ({ done: t.steps.filter((s) => s.done).length, total: t.steps.length });

/** The next tiny step (the first one not done) */
export const nextStep = (t: Todo): TodoStep | null => t.steps.find((s) => !s.done && s.text.trim()) ?? null;

/** Minutes of work left */
export function remainingMinutes(t: Todo): number {
  const left = t.steps.filter((s) => !s.done);
  const timed = t.steps.some((s) => s.minutes);
  if (t.steps.length && timed) {
    const leftMin = left.reduce((n, s) => n + (s.minutes || STEP_MIN), 0);
    // Your own estimate stands; the steps' times say how far through it you are
    if (t.estimate_min) {
      const all = t.steps.reduce((n, s) => n + (s.minutes || STEP_MIN), 0);
      return all ? Math.ceil(t.estimate_min * (leftMin / all)) : t.estimate_min;
    }
    return leftMin;
  }
  if (t.estimate_min) return t.steps.length ? Math.ceil(t.estimate_min * (left.length / t.steps.length)) : t.estimate_min;
  if (t.steps.length) return left.length * STEP_MIN;
  return DEFAULT_MIN;
}

/** A rough amount, rounded the way people say it ("about 1 h 45 min", "about 25 min") */
export function aboutLabel(min: number): string {
  const step = min <= 60 ? 5 : 15;
  return durationLabel(Math.max(step, Math.ceil(min / step) * step));
}

/** With the planning-fallacy buffer */
export const bufferedMinutes = (t: Todo) => Math.ceil(remainingMinutes(t) * BUFFER);

/** "2 h 30 min", "45 min" */
export function durationLabel(min: number): string {
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

// ── Deadlines ───────────────────────────────────────────────────────
/** When the deadline really is (an all-day one: the end of that day) */
export function deadline(t: Todo): Date | null {
  const due = at(t.due_at);
  if (!due) return null;
  return t.due_all_day ? endOfDay(due) : due;
}

export const isOverdue = (t: Todo, now: Date) => t.status === 'open' && !!deadline(t) && deadline(t)!.getTime() < now.getTime();

/**
 * When to start so it's finished calmly: the work left, plus the buffer, spread over
 * days at DAILY_FOCUS_MIN a day. Small work against a timed deadline: a time on the day.
 *   due Fri, ~2 h  → 3 h buffered → 2 days → start by Wed
 *   due Fri, 45 min → 68 min       → 1 day  → start by Thu
 *   due Fri, 20 min                          → start by Fri
 *   due today 5pm, 20 min                    → start by 4pm
 */
export function startBy(t: Todo): { at: Date; dayOnly: boolean } | null {
  const due = deadline(t);
  if (!due || t.status !== 'open') return null;
  const need = bufferedMinutes(t);
  if (need <= 60) {
    if (t.due_all_day) return { at: startOfDay(due), dayOnly: true };
    return { at: new Date(due.getTime() - (need + 30) * MIN), dayOnly: false };
  }
  const days = Math.ceil(need / DAILY_FOCUS_MIN);
  return { at: startOfDay(addDays(due, -days)), dayOnly: true };
}

/** Is it time to start (start-by today or past)? */
export function shouldStart(t: Todo, now: Date): boolean {
  const s = startBy(t);
  if (!s) return false;
  return s.dayOnly ? startOfDay(s.at).getTime() <= startOfDay(now).getTime() : s.at.getTime() <= now.getTime() + 60 * MIN;
}

// ── Words for dates ─────────────────────────────────────────────────
/** "5pm" / "5:30pm" on 12-hour phones, "17:00" on 24-hour ones (like Ireland's) */
export function timeLabel(d: Date): string {
  const s = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return /[ap]\.?\s?m\.?/i.test(s) ? s.replace(/[:.]00(?=\D)/, '').replace(/\s|\./g, '').toLowerCase() : s;
}

/** "today", "tomorrow", "Fri", "Fri 15 Nov" */
export function dayLabel(d: Date, now: Date): string {
  const diff = daysBetween(now, d);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

export function whenLabel(d: Date, now: Date, withTime = true): string {
  return withTime ? `${dayLabel(d, now)} ${timeLabel(d)}` : dayLabel(d, now);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Due today 5pm", "Due Fri", "Overdue: was due yesterday" */
export function dueLabel(t: Todo, now: Date): string | null {
  const due = at(t.due_at);
  if (!due) return null;
  if (isOverdue(t, now)) return `Overdue: was due ${whenLabel(due, now, !t.due_all_day)}`;
  return `Due ${whenLabel(due, now, !t.due_all_day)}`;
}

export function planLabel(t: Todo, now: Date): string | null {
  const plan = at(t.plan_at);
  if (!plan) return null;
  return plan.getTime() <= now.getTime() ? `Planned for ${whenLabel(plan, now)}` : `Starting ${whenLabel(plan, now)}`;
}

/** "Start by Wed to finish calmly (about 3 h with a buffer)" */
export function startByLabel(t: Todo, now: Date): string | null {
  const s = startBy(t);
  if (!s || isOverdue(t, now)) return null;
  const need = aboutLabel(bufferedMinutes(t));
  const when = s.dayOnly ? dayLabel(s.at, now) : whenLabel(s.at, now);
  const late = s.dayOnly ? startOfDay(s.at) < startOfDay(now) : s.at < now;
  if (late) return `You're behind: it needs about ${need}, start now`;
  if (s.dayOnly && daysBetween(now, s.at) === 0) return `Start today: it needs about ${need}`;
  return `Start by ${when} to finish calmly (about ${need})`;
}

// ── Today and the lists ─────────────────────────────────────────────
export function inToday(t: Todo, now: Date): boolean {
  if (t.status !== 'open') return false;
  if (t.today_on === localDay(now)) return true;
  if (isOverdue(t, now)) return true;
  const due = deadline(t);
  if (due && due.getTime() <= endOfDay(now).getTime()) return true;
  if (shouldStart(t, now)) return true;
  const plan = at(t.plan_at);
  return !!plan && plan.getTime() <= endOfDay(now).getTime();
}

export const isUpcoming = (t: Todo, now: Date) => t.status === 'open' && !inToday(t, now) && !!(t.due_at || t.plan_at);
export const isSomeday = (t: Todo, now: Date) => t.status === 'open' && !inToday(t, now) && !t.due_at && !t.plan_at;

/** When it next matters (for ordering Upcoming) */
export function nextMoment(t: Todo): number {
  const times = [at(t.plan_at), startBy(t)?.at ?? null, deadline(t)].filter(Boolean) as Date[];
  return times.length ? Math.min(...times.map((d) => d.getTime())) : Infinity;
}

// ── What to do next ─────────────────────────────────────────────────
export interface Pick {
  todo: Todo;
  score: number;
  /** Why it's next, in order of weight */
  reasons: string[];
}

export function score(t: Todo, now: Date): Pick {
  const reasons: [number, string][] = [];
  let s = 0;
  const add = (n: number, why?: string) => {
    s += n;
    if (why) reasons.push([n, why]);
  };
  const due = deadline(t);
  const plan = at(t.plan_at);
  const left = remainingMinutes(t);

  if (due) {
    const days = daysBetween(now, due);
    if (isOverdue(t, now)) add(100 + Math.min(30, -days * 5), 'It’s overdue');
    else if (days === 0) add(55, t.due_all_day ? 'Due today' : `Due today at ${timeLabel(due)}`);
    else if (days === 1) add(32, 'Due tomorrow');
    else if (days <= 3) add(16, `Due ${dayLabel(due, now)}`);
    else if (days <= 7) add(6);
    const sb = startBy(t);
    if (sb && !isOverdue(t, now) && shouldStart(t, now)) {
      const lateDays = sb.dayOnly ? daysBetween(sb.at, now) : 0;
      add(45 + Math.min(30, lateDays * 10), lateDays > 0 ? `You should have started ${lateDays === 1 ? 'yesterday' : `${lateDays} days ago`}` : 'Today’s the day to start it');
    }
  }
  if (plan) {
    const mins = (plan.getTime() - now.getTime()) / MIN;
    if (mins <= 0 && sameDay(plan, now)) add(48, `You planned to start at ${timeLabel(plan)}`);
    else if (mins <= 0) add(40, 'You planned to start it already');
    else if (mins <= 60) add(20, `You planned it for ${timeLabel(plan)}`);
    // Planned for later: you decided, so it waits (unless the deadline says otherwise)
    else if (!isOverdue(t, now) && !shouldStart(t, now)) add(-40);
  }
  if (t.important) add(35, 'It matters most');
  if (t.today_on === localDay(now)) add(25, 'You picked it for today');
  if (t.snoozes >= 2) add(Math.min(24, t.snoozes * 6), `You’ve put it off ${t.snoozes} times`);
  else if (t.snoozes === 1) add(4);
  if (left <= 10) add(10, 'A quick win: about ' + durationLabel(left));
  const progressDone = progress(t);
  if (progressDone.done > 0 && progressDone.done < progressDone.total) add(8, 'You’ve already started it');
  const ageDays = Math.max(0, daysBetween(at(t.created_at) ?? now, now));
  add(Math.min(8, ageDays * 0.5));

  return {
    todo: t,
    score: s,
    reasons: reasons.sort((a, b) => b[0] - a[0]).map(([, why]) => why),
  };
}

/** The one thing to do now (open tasks only; skip lets "Something else" move on) */
export function doNext(todos: Todo[], now: Date, skip: Set<string> = new Set()): Pick | null {
  const open = todos.filter((t) => t.status === 'open' && !skip.has(t.id));
  if (!open.length) return null;
  const picks = open.map((t) => score(t, now)).sort((a, b) => b.score - a.score || (a.todo.created_at < b.todo.created_at ? -1 : 1));
  return picks[0];
}

/** Today's list in the order to do it */
export const todayOrder = (todos: Todo[], now: Date) =>
  todos.filter((t) => inToday(t, now)).map((t) => score(t, now)).sort((a, b) => b.score - a.score).map((p) => p.todo);

// ── Putting it off ──────────────────────────────────────────────────
export type Later = 'hour' | 'tonight' | 'tomorrow' | 'weekend' | 'nextweek';

/** When "Not now" moves it to */
export function laterTime(kind: Later, now: Date): Date {
  const t = (d: Date, h: number, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
  switch (kind) {
    case 'hour':
      return new Date(Math.ceil((now.getTime() + 60 * MIN) / (15 * MIN)) * 15 * MIN);
    case 'tonight':
      return now.getHours() < 19 ? t(now, 19) : new Date(now.getTime() + 60 * MIN);
    case 'tomorrow':
      return t(addDays(now, 1), 9);
    case 'weekend': {
      const sat = addDays(now, ((6 - now.getDay() + 7) % 7) || 7);
      return t(sat, 10);
    }
    case 'nextweek': {
      const mon = addDays(now, ((8 - now.getDay()) % 7) || 7);
      return t(mon, 9);
    }
  }
}

// ── Repeats ─────────────────────────────────────────────────────────
function step(d: Date, repeat: Repeat): Date {
  if (repeat === 'daily') return addDays(d, 1);
  if (repeat === 'weekly') return addDays(d, 7);
  if (repeat === 'weekdays') {
    let n = addDays(d, 1);
    while (n.getDay() === 0 || n.getDay() === 6) n = addDays(n, 1);
    return n;
  }
  // Monthly: the same day next month (a short month uses its last day)
  const want = d.getDate();
  const first = new Date(d.getFullYear(), d.getMonth() + 1, 1, d.getHours(), d.getMinutes());
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(want, last), d.getHours(), d.getMinutes());
}

/** The next time a repeating task comes round (after now), steps reset */
export function nextOccurrence(t: Todo, now: Date): Pick['todo'] | null {
  if (!t.repeat) return null;
  const anchor = at(t.due_at) ?? at(t.plan_at) ?? now;
  let next = step(anchor, t.repeat);
  let guard = 0;
  while (next.getTime() <= now.getTime() && guard++ < 1000) next = step(next, t.repeat);
  const shift = next.getTime() - anchor.getTime();
  const moved = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + shift).toISOString() : null);
  return {
    ...t,
    status: 'open',
    done_at: null,
    snoozes: 0,
    focus_min: 0,
    today_on: null,
    steps: t.steps.map((s) => ({ ...s, done: false })),
    due_at: t.due_at ? moved(t.due_at) : null,
    plan_at: t.plan_at ? moved(t.plan_at) : t.due_at ? null : next.toISOString(),
  };
}

export const repeatLabel = (r: Repeat | null) =>
  r === 'daily' ? 'Every day' : r === 'weekdays' ? 'Every weekday' : r === 'weekly' ? 'Every week' : r === 'monthly' ? 'Every month' : null;

// ── Momentum ────────────────────────────────────────────────────────
/** Days in a row (to today, or to yesterday if nothing yet today) with something done or focused on */
export function streak(todos: Todo[], focusDays: Record<string, number>, now: Date): number {
  const active = new Set<string>();
  for (const t of todos) if (t.done_at) active.add(localDay(new Date(t.done_at)));
  for (const [day, mins] of Object.entries(focusDays)) if (mins >= 5) active.add(day);
  let d = startOfDay(now);
  if (!active.has(localDay(d))) d = addDays(d, -1);
  let n = 0;
  while (active.has(localDay(d)) && n < 3650) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Done in the last 7 days (today included) */
export function doneThisWeek(todos: Todo[], now: Date): number {
  const from = startOfDay(addDays(now, -6)).getTime();
  return todos.filter((t) => t.done_at && new Date(t.done_at).getTime() >= from).length;
}

export function focusThisWeek(focusDays: Record<string, number>, now: Date): number {
  let n = 0;
  for (let i = 0; i < 7; i++) n += focusDays[localDay(addDays(now, -i))] ?? 0;
  return n;
}

// ── A word for today (King James Version: public domain everywhere) ──
const VERSES = [
  { text: 'Whatsoever thy hand findeth to do, do it with thy might.', ref: 'Ecclesiastes 9:10' },
  { text: 'For who hath despised the day of small things?', ref: 'Zechariah 4:10' },
  { text: 'Go to the ant, thou sluggard; consider her ways, and be wise.', ref: 'Proverbs 6:6' },
  { text: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.', ref: 'Colossians 3:23' },
  { text: 'He that observeth the wind shall not sow; and he that regardeth the clouds shall not reap.', ref: 'Ecclesiastes 11:4' },
  { text: 'Commit thy works unto the LORD, and thy thoughts shall be established.', ref: 'Proverbs 16:3' },
  { text: 'In all labour there is profit: but the talk of the lips tendeth only to penury.', ref: 'Proverbs 14:23' },
  { text: 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.', ref: 'Galatians 6:9' },
  { text: 'Redeeming the time, because the days are evil.', ref: 'Ephesians 5:16' },
  { text: 'I can do all things through Christ which strengtheneth me.', ref: 'Philippians 4:13' },
  { text: 'He that is faithful in that which is least is faithful also in much.', ref: 'Luke 16:10' },
  { text: 'The soul of the sluggard desireth, and hath nothing: but the soul of the diligent shall be made fat.', ref: 'Proverbs 13:4' },
];

export function verseOfTheDay(now: Date) {
  const day = Math.floor(startOfDay(now).getTime() / DAY);
  return VERSES[((day % VERSES.length) + VERSES.length) % VERSES.length];
}

export { cap };
