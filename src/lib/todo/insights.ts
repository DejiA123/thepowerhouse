import { addDays, deadline, startOfDay, type Later } from './brain';
import type { TodoEvent } from './events';
import type { Todo } from './types';

/**
 * "Is it working?": what really happened with your tasks (events.ts), told honestly, and
 * what the app learns from it. Pure (the time is passed in), tested in insights.test.ts.
 *
 * A planned start ("I'll start at 7pm") is the core promise, so it's the main measure:
 *   kept    started (the focus timer) from 30 min before to 60 min after the time, or done
 *           any time from planning it up to 3 h after the time
 *   late    started or done later, within a day
 *   missed  nothing within the day, or put off ("Not now") once the time had come
 *   moved   planned again before the time came (re-planning ahead isn't avoiding it)
 *   dropped let go (deleted / Someday) before anything happened
 * Moved and dropped don't count either way. A plan changed again within 3 minutes was
 * just an edit. Kept rate = kept / (kept + late + missed).
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export type Part = 'morning' | 'afternoon' | 'evening' | 'night';
export const PARTS: Part[] = ['morning', 'afternoon', 'evening', 'night'];
export const partOf = (d: Date): Part => {
  const h = d.getHours();
  return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 22 ? 'evening' : 'night';
};

export type PlanResult = 'kept' | 'late' | 'missed' | 'moved' | 'dropped' | 'pending';
export interface PlanOutcome {
  todoId: string;
  /** The planned start */
  at: Date;
  /** When it was planned */
  setAt: Date;
  result: PlanResult;
  part: Part;
}

const time = (e: TodoEvent) => Date.parse(e.at);
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Every planned start and what came of it */
export function planOutcomes(events: TodoEvent[], now: Date): PlanOutcome[] {
  const byTodo = new Map<string, TodoEvent[]>();
  for (const e of events) {
    if (!e.todo_id) continue;
    const list = byTodo.get(e.todo_id) ?? [];
    list.push(e);
    byTodo.set(e.todo_id, list);
  }
  const out: PlanOutcome[] = [];
  const nowMs = now.getTime();
  for (const [todoId, list] of byTodo) {
    list.sort((a, b) => time(a) - time(b));
    list.forEach((e, i) => {
      if (e.kind !== 'planned') return;
      const T = Date.parse(str(e.data?.for) ?? '');
      const S = time(e);
      if (!Number.isFinite(T) || !Number.isFinite(S) || T < S - MIN) return;
      // What ended this plan: planned again, put off, or let go
      const ender = list.slice(i + 1).find((x) => x.kind === 'planned' || x.kind === 'snoozed' || x.kind === 'dropped');
      const end = ender ? time(ender) : Infinity;
      if (ender && ender.kind === 'planned' && end - S < 3 * MIN && end < T) return; // just an edit
      const acts = list.slice(i + 1).filter((x) => (x.kind === 'started' || x.kind === 'done') && time(x) >= S - 1000 && time(x) < end);
      const kept = acts.some((x) =>
        x.kind === 'started' ? time(x) >= T - 30 * MIN && time(x) <= T + HOUR : time(x) <= T + 3 * HOUR,
      );
      let result: PlanResult;
      if (kept) result = 'kept';
      else if (ender && end <= T) result = ender.kind === 'dropped' ? 'dropped' : 'moved';
      else if (acts.some((x) => time(x) <= T + DAY)) result = 'late';
      else if (ender?.kind === 'dropped' && end <= T + 3 * HOUR) result = 'dropped';
      else if (!ender && nowMs < T + 3 * HOUR) result = 'pending';
      else result = 'missed';
      out.push({ todoId, at: new Date(T), setAt: new Date(S), result, part: partOf(new Date(T)) });
    });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export interface Rate {
  kept: number;
  of: number;
  rate: number | null;
}
const rateOf = (kept: number, of: number): Rate => ({ kept, of, rate: of ? kept / of : null });
const decided = (list: PlanOutcome[]) => list.filter((p) => p.result === 'kept' || p.result === 'late' || p.result === 'missed');
const planRate = (list: PlanOutcome[]) => {
  const d = decided(list);
  return rateOf(d.filter((p) => p.result === 'kept').length, d.length);
};

// ── Your pace (how long things really take you) ─────────────────────
export interface Pace {
  /** Real time ÷ your guess (median), null until there's enough */
  ratio: number | null;
  samples: number;
  /** The start-by buffer that follows from it (brain `setPersonalBuffer`) */
  buffer: number | null;
}

/**
 * From tasks finished in the focus screen that had a time guess of 10+ minutes and 5+
 * focused minutes (finished elsewhere, the focus minutes may be only part of the work).
 * Needs 3. The buffer is that ratio plus a fifth for safety, between 1.1 and 3.
 */
export function paceOf(events: TodoEvent[]): Pace {
  const ratios: number[] = [];
  for (const e of events) {
    if (e.kind !== 'done' || e.data?.via !== 'focus') continue;
    const est = num(e.data?.estimate);
    const spent = num(e.data?.focus_min);
    if (!est || est < 10 || !spent || spent < 5) continue;
    ratios.push(Math.min(5, Math.max(0.2, spent / est)));
  }
  if (ratios.length < 3) return { ratio: null, samples: ratios.length, buffer: null };
  ratios.sort((a, b) => a - b);
  const m = ratios.length >> 1;
  const ratio = ratios.length % 2 ? ratios[m] : (ratios[m - 1] + ratios[m]) / 2;
  return { ratio, samples: ratios.length, buffer: Math.min(3, Math.max(1.1, ratio * 1.2)) };
}

// ── Everything ──────────────────────────────────────────────────────
export type StuckReason = 'big' | 'where' | 'boring' | 'perfect' | 'tired' | 'drop';
export const STUCK_LABELS: Record<StuckReason, string> = {
  big: 'It feels too big',
  where: 'Don’t know where to start',
  boring: 'It’s boring',
  perfect: 'Afraid it won’t be good enough',
  tired: 'Tired, or no time',
  drop: 'Don’t actually need to',
};

export interface Tip {
  id: string;
  title: string;
  body: string;
  action?: { label: string; to: string };
}

export type Verdict = 'early' | 'great' | 'good' | 'building';

export interface Insights {
  days: number;
  plans: Rate & { late: number; missed: number; moved: number; pending: number };
  /** Kept rate by the part of the day it was planned for */
  byPart: Record<Part, Rate>;
  deadlines: { onTime: number; late: number; overdue: number; of: number; rate: number | null };
  focus: { sessions: number; minutes: number; twoMin: Rate };
  stuck: { reason: StuckReason; count: number }[];
  snoozes: number;
  /** The open task put off most (2+ times) */
  putOff: Todo | null;
  pace: Pace;
  /** The time of day that works best for you, and how the app knows */
  best: { part: Part; from: 'plans' | 'focus'; rate: Rate | null; worst: { part: Part; rate: Rate } | null } | null;
  /** The "Not now" option to point out */
  bestLater: Later | null;
  /** The last 4 weeks (oldest first): finished, and planned starts kept */
  weeks: { from: Date; done: number; plans: Rate }[];
  /** Kept rate, last 14 days against the 14 before */
  trend: { now: number; before: number } | null;
  verdict: Verdict;
  headline: string;
  summary: string;
  /** The main number in a few words ("7 of 10 planned starts happened"), null early on */
  short: string | null;
  tips: Tip[];
}

const pct = (r: number) => `${Math.round(r * 100)}%`;
const PART_WORDS: Record<Part, string> = { morning: 'morning', afternoon: 'afternoon', evening: 'evening', night: 'late-night' };
const quote = (t: Todo) => `“${t.title.length > 40 ? `${t.title.slice(0, 38).trimEnd()}…` : t.title}”`;

export function computeInsights(todos: Todo[], events: TodoEvent[], now: Date, days = 28): Insights {
  const nowMs = now.getTime();
  const from = startOfDay(addDays(now, -(days - 1))).getTime();
  const inWindow = (ms: number) => ms >= from && ms <= nowMs + MIN;
  const recent = events.filter((e) => inWindow(time(e)));

  // Planned starts (by their time)
  const outcomes = planOutcomes(events, now);
  const windowed = outcomes.filter((p) => inWindow(p.at.getTime()));
  const pr = planRate(windowed);
  const count = (r: PlanResult) => windowed.filter((p) => p.result === r).length;
  const plans = { ...pr, late: count('late'), missed: count('missed'), moved: count('moved'), pending: count('pending') };
  const byPart = Object.fromEntries(PARTS.map((part) => [part, planRate(windowed.filter((p) => p.part === part))])) as Record<Part, Rate>;

  // Deadlines: finished in the window, or past and still open
  let onTime = 0;
  let late = 0;
  let overdue = 0;
  for (const t of todos) {
    const due = deadline(t);
    if (!due) continue;
    if (t.status === 'done' && t.done_at) {
      const done = Date.parse(t.done_at);
      if (!inWindow(done)) continue;
      if (done <= due.getTime() + MIN) onTime++;
      else late++;
    } else if (t.status === 'open' && due.getTime() < nowMs && due.getTime() >= from) overdue++;
  }
  const dOf = onTime + late + overdue;
  const deadlines = { onTime, late, overdue, of: dOf, rate: dOf ? onTime / dOf : null };

  // Focus
  const sessions = recent.filter((e) => e.kind === 'focused');
  const minutes = Math.round(sessions.reduce((n, e) => n + (num(e.data?.minutes) ?? 0), 0));
  const twoMinStarts = sessions.filter((e) => (num(e.data?.initial) ?? 99) <= 2);
  const keptGoing = twoMinStarts.filter((e) => (num(e.data?.minutes) ?? 0) >= 3.5 || e.data?.done === true).length;
  const focus = { sessions: sessions.length, minutes, twoMin: rateOf(keptGoing, twoMinStarts.length) };

  // What gets in the way
  const reasons = new Map<StuckReason, number>();
  for (const e of recent) {
    const r = e.kind === 'stuck' ? (str(e.data?.reason) as StuckReason | null) : null;
    if (r && r in STUCK_LABELS) reasons.set(r, (reasons.get(r) ?? 0) + 1);
  }
  const stuck = [...reasons].map(([reason, n]) => ({ reason, count: n })).sort((a, b) => b.count - a.count);
  const snoozes = recent.filter((e) => e.kind === 'snoozed').length;
  const putOff = todos.filter((t) => t.status === 'open' && t.snoozes >= 2).sort((a, b) => b.snoozes - a.snoozes)[0] ?? null;

  const pace = paceOf(events);

  // Best time of day: from planned starts (3+ decided in a part), else from when you focus
  let best: Insights['best'] = null;
  const ranked = PARTS.map((part) => ({ part, rate: byPart[part] })).filter((x) => x.rate.of >= 3 && x.rate.rate !== null);
  if (ranked.length) {
    ranked.sort((a, b) => b.rate.rate! - a.rate.rate! || b.rate.of - a.rate.of);
    const top = ranked[0];
    const low = ranked.length > 1 ? ranked[ranked.length - 1] : null;
    if (top.rate.rate! >= 0.5) best = { part: top.part, from: 'plans', rate: top.rate, worst: low && top.rate.rate! - low.rate.rate! >= 0.2 ? low : null };
  }
  if (!best) {
    const mins = new Map<Part, number>();
    for (const e of events.filter((x) => x.kind === 'focused')) {
      const m = num(e.data?.minutes) ?? 0;
      if (m < 1) continue;
      const part = partOf(new Date(time(e) - m * MIN));
      mins.set(part, (mins.get(part) ?? 0) + m);
    }
    const total = [...mins.values()].reduce((a, b) => a + b, 0);
    const top = [...mins].sort((a, b) => b[1] - a[1])[0];
    if (top && events.filter((x) => x.kind === 'focused').length >= 5 && top[1] / total >= 0.4) best = { part: top[0], from: 'focus', rate: null, worst: null };
  }
  const bestLater: Later | null = best ? ({ morning: 'tomorrow', afternoon: 'afternoon', evening: 'tonight', night: null } as const)[best.part] : null;

  // The last 4 weeks (7-day stretches ending today)
  const weeks = [3, 2, 1, 0].map((k) => {
    const start = startOfDay(addDays(now, -(k * 7 + 6))).getTime();
    const end = k ? startOfDay(addDays(now, -(k * 7 - 1))).getTime() : nowMs + MIN;
    const doneN = todos.filter((t) => t.done_at && Date.parse(t.done_at) >= start && Date.parse(t.done_at) < end).length;
    return { from: new Date(start), done: doneN, plans: planRate(outcomes.filter((p) => p.at.getTime() >= start && p.at.getTime() < end)) };
  });

  const half = startOfDay(addDays(now, -13)).getTime();
  const a = planRate(outcomes.filter((p) => p.at.getTime() >= half && p.at.getTime() <= nowMs));
  const b = planRate(outcomes.filter((p) => p.at.getTime() >= half - 14 * DAY && p.at.getTime() < half));
  const trend = a.of >= 3 && b.of >= 3 ? { now: a.rate!, before: b.rate! } : null;

  // The verdict: planned starts first, then deadlines, then 2-minute starts
  const measure =
    plans.of >= 3
      ? { rate: plans.rate!, line: `${plans.kept} of ${plans.of} planned starts happened` }
      : deadlines.of >= 3
        ? { rate: deadlines.rate!, line: `${deadlines.onTime} of ${deadlines.of} deadlines met` }
        : focus.twoMin.of >= 3
          ? { rate: focus.twoMin.rate!, line: `${focus.twoMin.kept} of ${focus.twoMin.of} two-minute starts kept going` }
          : null;
  const verdict: Verdict = !measure ? 'early' : measure.rate >= 0.7 ? 'great' : measure.rate >= 0.5 ? 'good' : 'building';
  const span = days <= 7 ? 'this week' : `in the last ${Math.round(days / 7)} weeks`;
  const trendLine = trend && Math.abs(trend.now - trend.before) >= 0.1 ? ` ${trend.now > trend.before ? 'Up' : 'Down'} from ${pct(trend.before)} the fortnight before.` : '';
  const headline = { early: 'Early days', great: 'It’s working', good: 'It’s helping', building: 'Not yet, and that’s worth knowing' }[verdict];
  const summary = !measure
    ? 'Plan a few starts, finish a few tasks, and this fills in: which plans really happen, what gets in your way, and your best time of day.'
    : verdict === 'building'
      ? `${measure.line} ${span}.${trendLine} The tips below are picked for what’s getting in your way.`
      : `${measure.line} ${span}.${trendLine}`;

  // Tips: what the numbers point to, most useful first, at most 3
  const tips: Tip[] = [];
  const overdueNow = todos.filter((t) => t.status === 'open' && deadline(t) && deadline(t)!.getTime() < nowMs).length;
  if (overdueNow >= 2) {
    tips.push({ id: 'fresh', title: 'A fresh start', body: `${overdueNow} tasks are overdue. Give each an honest new day: it takes a minute and lifts the weight.`, action: { label: 'Fresh start', to: '/todo?open=fresh' } });
  }
  const top = stuck[0];
  const target = putOff ?? todos.find((t) => t.status === 'open') ?? null;
  if (top && top.count >= 2) {
    const n = `came up ${top.count} times`;
    const open = (label: string, how: string) => (target ? { label, to: `/todo?task=${target.id}&${how}` } : undefined);
    const byReason: Record<StuckReason, Tip> = {
      big: { id: 'big', title: 'Make it smaller first', body: `“It feels too big” ${n}. Before starting, break it into tiny steps, the first one 2 minutes.`, action: open(target ? `Break down ${quote(target)}` : '', 'breakdown=1') },
      where: { id: 'where', title: 'Decide the first move', body: `Not knowing where to start ${n}. When you add a task, write its very first physical step: “open the laptop and find the file”.`, action: open(target ? `First move for ${quote(target)}` : '', 'breakdown=1') },
      boring: { id: 'boring', title: 'Make it a game', body: `Boredom ${n}. Race the clock for 10 minutes, and give the task a reward for when it’s done.`, action: open(target ? `10 minutes on ${quote(target)}` : '', 'focus=game') },
      perfect: { id: 'perfect', title: 'Rough first, good later', body: `Fear of it not being good enough ${n}. Do a messy 15-minute version on purpose: fixing something is easier than facing a blank page.`, action: open(target ? `Rough version of ${quote(target)}` : '', 'focus=rough') },
      tired: { id: 'tired', title: 'Match tasks to your energy', body: `Tiredness ${n}. Put demanding tasks in your ${best ? PART_WORDS[best.part] : 'freshest hours'} and keep tired times for small ones.`, action: { label: 'Plan my day', to: '/todo?open=plan' } },
      drop: { id: 'drop', title: 'Let go sooner', body: `You decided you didn’t need to ${n}. That’s a good call: next time, decide when you add it, before it weighs on you.` },
    };
    tips.push(byReason[top.reason]);
  }
  if (best?.from === 'plans' && best.worst) {
    tips.push({
      id: 'best-time',
      title: `Plan for the ${PART_WORDS[best.part]}`,
      body: `${pct(best.rate!.rate!)} of your ${PART_WORDS[best.part]} plans happen, against ${pct(best.worst.rate.rate!)} in the ${PART_WORDS[best.worst.part]}. Put what matters there: “Not now” now points it out.`,
      action: { label: 'Plan my day', to: '/todo?open=plan' },
    });
  }
  if (putOff && putOff.snoozes >= 3 && !tips.some((t) => t.action?.to.includes(putOff.id))) {
    tips.push({ id: 'put-off', title: `${quote(putOff)} keeps moving`, body: `Put off ${putOff.snoozes} times. Name what’s in the way, or let it go: either is lighter than carrying it.`, action: { label: 'What’s stopping me?', to: `/todo?task=${putOff.id}&stuck=1` } });
  }
  const openN = todos.filter((t) => t.status === 'open').length;
  if (windowed.length < 3 && openN >= 3) {
    tips.push({ id: 'plan', title: 'Give tasks a time', body: 'A task with a start time (“I’ll start at 7pm”) is far more likely to happen than one without. Plan your day in a minute.', action: { label: 'Plan my day', to: '/todo?open=plan' } });
  }
  if (deadlines.of >= 3 && deadlines.rate! < 0.5) {
    tips.push({ id: 'deadlines', title: 'Start deadlines earlier', body: `${deadlines.onTime} of ${deadlines.of} deadlines met. Add how long a task takes (“~2h”) and the app tells you the day to start.` });
  }
  if (focus.twoMin.of >= 3 && focus.twoMin.rate! >= 0.6) {
    tips.push({ id: 'two-min', title: 'Starting works for you', body: `${focus.twoMin.kept} of ${focus.twoMin.of} two-minute starts kept going. When you’re stuck, just start the timer.` });
  }

  return { days, plans, byPart, deadlines, focus, stuck, snoozes, putOff, pace, best, bestLater, weeks, trend, verdict, headline, summary, short: measure?.line ?? null, tips: tips.slice(0, 3) };
}
