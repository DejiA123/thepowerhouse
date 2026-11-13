import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUp, Bell, Brain, Check, CheckCircle2, ChevronRight, Clock, Flame, ListChecks, Play, Shuffle, Sparkles, Sun, Timer, Trash2 } from 'lucide-react';
import { Page, PageTitle, Segmented } from '@/components/page/PageKit';
import { TILE } from '@/data/appDirectory';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import EnableNotificationsCard from '@/components/notifications/EnableNotificationsCard';
import SwipeRow from '@/components/common/SwipeRow';
import {
  doNext, doNextIn, doneThisWeek, durationLabel, focusThisWeek, isSomeday, isUpcoming, localDay, nextMoment, nextStep, overdueOf,
  sameDay, streak, todayOrder, verseOfTheDay, whenLabel, type DayBlock,
} from '@/lib/todo/brain';
import { parseQuickAdd, type QuickAdd } from '@/lib/todo/parse';
import { ensureTodoSettings, useTodos, type TodoSettings } from '@/lib/todo/store';
import { tellDone } from '@/lib/todo/buddy';
import { newNoteId } from '@/lib/offlineNotes';
import type { Todo } from '@/lib/todo/types';
import TaskRow from '@/components/todo/TaskRow';
import TaskSheet from '@/components/todo/TaskSheet';
import FocusMode from '@/components/todo/FocusMode';
import LaterSheet from '@/components/todo/LaterSheet';
import StuckSheet, { type StuckAction } from '@/components/todo/StuckSheet';
import TodoSettingsSheet from '@/components/todo/TodoSettingsSheet';
import PlanDaySheet from '@/components/todo/PlanDaySheet';
import BrainDumpSheet from '@/components/todo/BrainDumpSheet';
import FreshStartSheet from '@/components/todo/FreshStartSheet';
import { Confetti } from '@/components/todo/parts';

type Tab = 'today' | 'upcoming' | 'someday' | 'done';

const EXAMPLES = ['Finish report by Fri 5pm ~2h', 'Call mum tomorrow', 'Bible reading every day 7am', 'Tidy the garage this weekend'];
const BUDGETS = [5, 15, 30, 60];

/**
 * To do, built to beat procrastination: say the task the way you'd say it, and the app
 * tells you the one thing to do next and why, breaks it into tiny steps, starts you with
 * a 2-minute timer, plans your day to fit the time you really have, asks for a real time
 * when you put something off (and reminds you), notices what you keep avoiding and helps
 * with why, lets a friend keep you to it, and keeps your momentum visible.
 */
const TodoPage = () => {
  const [params, setParams] = useSearchParams();
  const { userId, todos, focusDays, loaded, add, update, remove, complete, reopen, logFocus } = useTodos();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const [tab, setTab] = useState<Tab>('today');
  const [quick, setQuick] = useState('');
  const quickRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => (quick.trim() ? parseQuickAdd(quick, now) : null), [quick, now]);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  /** "I have 15 minutes": Do next picks what fits */
  const [budget, setBudget] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ id: string; breakdown?: boolean } | null>(null);
  const [focus, setFocus] = useState<{ id: string; start: { minutes: number; note?: string } | null } | null>(null);
  const [laterFor, setLaterFor] = useState<string | null>(null);
  const [stuckFor, setStuckFor] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [dump, setDump] = useState<{ text: string } | null>(null);
  const [freshOpen, setFreshOpen] = useState(false);
  const [swiped, setSwiped] = useState<{ id: string; side: 'left' | 'right' } | null>(null);
  const [settings, setSettings] = useState<TodoSettings | null>(null);
  const { state: pushState } = usePushNotifications();

  useEffect(() => {
    if (userId) void ensureTodoSettings(userId).then(setSettings);
  }, [userId]);

  const byId = (id: string | null | undefined) => (id ? todos.find((t) => t.id === id) ?? null : null);

  // From a notification: /todo?task=<id>&start=1 starts it, /todo?task=<id> opens it
  useEffect(() => {
    const id = params.get('task');
    if (!id) return;
    const t = byId(id);
    if (!t && !loaded) return; // wait for the list
    if (t) {
      if (params.get('start') && t.status === 'open') setFocus({ id, start: null });
      else setEditing({ id });
    }
    const next = new URLSearchParams(params);
    next.delete('task');
    next.delete('start');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, loaded, todos.length]);

  // ── The lists ─────────────────────────────────────────────────────
  const open = todos.filter((t) => t.status === 'open');
  // Today: what you've planned a time for, in time order, then the rest by importance
  const today = useMemo(() => {
    const list = todayOrder(todos, now);
    const timed = list.filter((t) => t.plan_at && sameDay(new Date(t.plan_at), now)).sort((a, b) => a.plan_at!.localeCompare(b.plan_at!));
    return [...timed, ...list.filter((t) => !timed.includes(t))];
  }, [todos, now]);
  const upcoming = useMemo(() => todos.filter((t) => isUpcoming(t, now)).sort((a, b) => nextMoment(a) - nextMoment(b)), [todos, now]);
  const someday = useMemo(
    () => todos.filter((t) => isSomeday(t, now)).sort((a, b) => Number(b.important) - Number(a.important) || (a.created_at < b.created_at ? -1 : 1)),
    [todos, now],
  );
  const done = useMemo(
    () => todos.filter((t) => t.status === 'done').sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? '')).slice(0, 60),
    [todos],
  );
  const overdue = useMemo(() => overdueOf(todos, now), [todos, now]);
  const shown = tab === 'today' ? today : tab === 'upcoming' ? upcoming : tab === 'someday' ? someday : done;
  // With a time budget: the best thing that fits; "Something else" goes round, then starts again
  const fitting = useMemo(() => (budget ? doNextIn(todos, now, budget, skip) ?? doNextIn(todos, now, budget) : null), [todos, now, budget, skip]);
  const pick = useMemo(() => fitting ?? doNext(todos, now, skip) ?? doNext(todos, now), [fitting, todos, now, skip]);
  const doneToday = todos.filter((t) => t.done_at && localDay(new Date(t.done_at)) === localDay(now)).length;
  const days = streak(todos, focusDays, now);
  const weekDone = doneThisWeek(todos, now);
  const weekFocus = focusThisWeek(focusDays, now);
  const verse = verseOfTheDay(now);
  const plannedToday = open.some((t) => t.plan_at && sameDay(new Date(t.plan_at), now) && new Date(t.plan_at) > now);
  const needsPush = pushState !== 'on' && pushState !== 'loading' && open.some((t) => t.plan_at && new Date(t.plan_at) > now);

  // ── Actions ───────────────────────────────────────────────────────
  const addQuick = () => {
    if (!parsed?.title) return;
    const { chips: _chips, ...fields } = parsed;
    const t = add(fields);
    setQuick('');
    if (fields.due_at || fields.plan_at) setTab(todayOrder([t], new Date()).length ? 'today' : 'upcoming');
    quickRef.current?.focus();
  };

  const addMany = (items: QuickAdd[]) => {
    for (const { chips: _chips, ...fields } of items) if (fields.title) add(fields);
    setDump(null);
    appAlert(`${items.length} ${items.length === 1 ? 'task' : 'tasks'} added`, 'Your head is clearer already. Now: Do next, or plan your day.', 'success');
  };

  const finish = (t: Todo) => {
    const again = complete(t.id);
    setSkip(new Set());
    setBudget(null);
    setBurst((b) => b + 1);
    const n = doneToday + 1;
    const lines = [
      t.reward ? `Enjoy your reward: ${t.reward} 🎁` : null,
      again ? `It comes round again ${whenLabel(new Date(again.due_at ?? again.plan_at ?? Date.now()), new Date(), !again.due_all_day)}.` : null,
      t.buddy_id ? `${(t.buddy_name || 'Your friend').split(' ')[0]} is getting the good news.` : null,
    ].filter(Boolean);
    appAlert(n === 1 ? 'Done! First one today 🎉' : `Done! That’s ${n} today 🎉`, lines.join(' ') || 'One less thing on your mind.', 'success');
    if (t.buddy_id) void tellDone(t.buddy_id, t);
  };
  const toggle = (t: Todo) => (t.status === 'done' ? reopen(t.id) : finish(t));
  const start = (t: Todo, minutes?: number | null) => setFocus({ id: t.id, start: minutes ? { minutes } : null });
  const notNow = (t: Todo) => (t.snoozes >= 1 ? setStuckFor(t.id) : setLaterFor(t.id));
  const pickToday = (t: Todo) => {
    const on = t.today_on === localDay(new Date());
    update(t.id, { today_on: on ? null : localDay(new Date()) });
    if (!on) appAlert('Added to today', t.title);
  };

  const planFor = (t: Todo, when: Date) => {
    update(t.id, { plan_at: when.toISOString(), snoozes: (t.snoozes ?? 0) + 1, today_on: null });
    setLaterFor(null);
    setSkip(new Set());
    appAlert('Planned', `You’ll be reminded ${whenLabel(when, new Date())}.`, 'success');
  };

  const applyPlan = (blocks: DayBlock[], unchosen: Todo[]) => {
    for (const b of blocks) update(b.todo.id, { plan_at: b.start.toISOString(), today_on: localDay(b.start) });
    for (const t of unchosen) update(t.id, { today_on: null });
    setPlanOpen(false);
    setTab('today');
    const first = blocks[0];
    appAlert(
      sameDay(first.start, new Date()) ? 'Your day is set ☀️' : 'Tomorrow is set ☀️',
      `${blocks.length} ${blocks.length === 1 ? 'task' : 'tasks'}, starting ${whenLabel(first.start, new Date())}. A reminder rings at each start time.`,
      'success',
    );
  };

  const onStuck = (t: Todo, a: StuckAction) => {
    setStuckFor(null);
    if (a.kind === 'breakdown') {
      setFocus(null);
      setEditing({ id: t.id, breakdown: true });
    } else if (a.kind === 'first-step') {
      const first = { id: newNoteId(), text: a.text.slice(0, 120), done: false, minutes: 2 };
      const doneSteps = t.steps.filter((s) => s.done);
      const rest = t.steps.filter((s) => !s.done && s.text.trim() !== a.text.trim());
      update(t.id, { steps: [...doneSteps, first, ...rest] });
      setFocus({ id: t.id, start: { minutes: 2 } });
    } else if (a.kind === 'focus') {
      setFocus({ id: t.id, start: { minutes: a.minutes, note: a.note } });
    } else if (a.kind === 'later') {
      setFocus(null);
      setLaterFor(t.id);
    } else if (a.kind === 'someday') {
      setFocus(null);
      update(t.id, { plan_at: null, due_at: null, due_all_day: false, today_on: null });
      appAlert('Kept for someday', 'No dates, no reminders. It’s there if you need it.');
    } else {
      setFocus(null);
      remove(t.id);
      appAlert('Let go', 'Deleted. One less thing to carry.');
    }
  };

  const focusTodo = byId(focus?.id);
  const editTodo = byId(editing?.id);
  const pickStep = pick ? nextStep(pick.todo) : null;
  const pickMinutes = budget ?? (pick ? (pick.todo.focus_min > 0 || pick.todo.steps.some((s) => s.done) ? 25 : 2) : 2);
  const noFit = !!budget && !fitting;

  return (
    <Page>
      <PageTitle
        icon={ListChecks}
        tint={TILE.green}
        title="To do"
        subtitle="Small steps, started today."
        action={
          <button onClick={() => setSettingsOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition active:scale-95" aria-label="Reminders">
            <Bell className="h-5 w-5" />
          </button>
        }
      />

      {/* Quick add (a pasted list opens the brain dump) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addQuick();
        }}
        className="rounded-[22px] border border-slate-200/80 bg-card p-2 shadow-sm dark:border-slate-800"
      >
        <div className="flex items-center gap-2">
          <input
            ref={quickRef}
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (/\n/.test(text.trim())) {
                e.preventDefault();
                setDump({ text });
              }
            }}
            placeholder="Add a task… e.g. Essay by Fri ~3h"
            aria-label="Add a task"
            enterKeyHint="done"
            maxLength={300}
            className="h-12 min-w-0 flex-1 bg-transparent px-2.5 text-[16px] focus:shadow-none focus:outline-none"
            data-testid="quick-add"
          />
          <button
            type="submit"
            disabled={!parsed?.title}
            aria-label="Add"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/25 transition active:scale-90 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        {parsed && parsed.chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2 pb-1.5 pt-1" data-testid="quick-chips">
            {parsed.chips.map((c) => (
              <span key={c} className="rounded-full bg-blue-50 px-2.5 py-1 text-[12.5px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                {c}
              </span>
            ))}
          </div>
        )}
      </form>

      {/* Plan the day, empty the head */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          onClick={() => setPlanOpen(true)}
          className={cn(
            'flex h-11 items-center justify-center gap-2 rounded-2xl text-[14.5px] font-semibold transition active:scale-[0.98]',
            open.length && !plannedToday ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200' : 'bg-muted text-foreground',
          )}
          data-testid="plan-day-open"
        >
          <Sun className="h-[18px] w-[18px]" /> Plan my day
        </button>
        <button onClick={() => setDump({ text: '' })} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-muted text-[14.5px] font-semibold text-foreground transition active:scale-[0.98]" data-testid="brain-dump-open">
          <Brain className="h-[18px] w-[18px]" /> Brain dump
        </button>
      </div>

      {/* A pile of overdue tasks: a fresh start */}
      {overdue.length >= 2 && (
        <button
          onClick={() => setFreshOpen(true)}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-left transition active:scale-[0.99] dark:bg-red-950/30"
          data-testid="fresh-start-open"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-red-800 dark:text-red-200">{overdue.length} overdue</span>
            <span className="block text-[13px] text-red-700/80 dark:text-red-300/80">Give them a fresh start: an honest new day each, in a minute.</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-red-400" />
        </button>
      )}

      {/* Do next */}
      {pick ? (
        <section className="mt-3 overflow-hidden rounded-[26px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-600/20" data-testid="do-next">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-[12px] font-bold uppercase tracking-[0.14em] text-white/75">{budget && !noFit ? `Fits in ${durationLabel(budget)}` : 'Do next'}</p>
            {open.length > 1 && (
              <button
                onClick={() => setSkip((s) => (s.size + 1 >= open.length ? new Set() : new Set(s).add(pick.todo.id)))}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-white/15 px-3 text-[12.5px] font-semibold text-white transition active:scale-95"
              >
                <Shuffle className="h-3.5 w-3.5" /> Something else
              </button>
            )}
          </div>
          <button onClick={() => setEditing({ id: pick.todo.id })} className="mt-1.5 block w-full text-left">
            <h2 className="font-outfit text-[24px] font-bold leading-tight [overflow-wrap:anywhere]">{pick.todo.title}</h2>
          </button>
          {noFit ? (
            <p className="mt-1 text-[14px] font-medium text-white/85">Nothing fits in {durationLabel(budget!)}, so give this one {durationLabel(budget!)}. Starting is what counts.</p>
          ) : (
            pick.reasons.length > 0 && <p className="mt-1 text-[14px] font-medium text-white/85">{pick.reasons.slice(0, 2).join(' · ')}</p>
          )}
          <div className="mt-3 rounded-2xl bg-white/15 px-3.5 py-3">
            {pickStep ? (
              <p className="text-[15px] leading-snug">
                <span className="font-semibold">First: </span>
                {pickStep.text}
                {pickStep.minutes ? <span className="text-white/70"> · {pickStep.minutes} min</span> : null}
              </p>
            ) : (
              <p className="text-[15px] leading-snug">
                No steps yet. Just start for 2 minutes, or{' '}
                <button onClick={() => setEditing({ id: pick.todo.id, breakdown: true })} className="font-semibold underline underline-offset-2">
                  break it into tiny steps
                </button>
                .
              </p>
            )}
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2.5">
            <button
              onClick={() => start(pick.todo, budget)}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-[16px] font-bold text-indigo-700 shadow-md transition active:scale-[0.98]"
              data-testid="do-next-start"
            >
              <Play className="h-4 w-4 fill-current" /> Start · {pickMinutes} min
            </button>
            <button onClick={() => notNow(pick.todo)} className="h-12 rounded-2xl bg-white/15 px-4 text-[15px] font-semibold transition active:scale-[0.98]" data-testid="not-now">
              Not now
            </button>
          </div>
          {/* "I have 15 minutes" */}
          <div className="mt-3 flex items-center gap-1.5" role="radiogroup" aria-label="Time I have">
            <span className="mr-0.5 text-[12.5px] font-semibold text-white/75">I have</span>
            {BUDGETS.map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={budget === m}
                onClick={() => {
                  setBudget(budget === m ? null : m);
                  setSkip(new Set());
                }}
                className={cn('h-8 flex-1 rounded-full text-[12.5px] font-semibold transition active:scale-95', budget === m ? 'bg-white text-indigo-700' : 'bg-white/15 text-white')}
                data-testid={`budget-${m}`}
              >
                {m < 60 ? `${m} min` : '1 h'}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-3 rounded-[26px] border border-dashed border-slate-300 bg-card p-5 text-center dark:border-slate-700" data-testid="todo-empty">
          {todos.some((t) => t.status === 'done') ? (
            <>
              <p className="text-[34px]">🎉</p>
              <h2 className="mt-1 font-outfit text-[20px] font-bold">All clear for now</h2>
              <p className="mt-1 text-[14.5px] text-muted-foreground">Everything’s done. Add what’s next when it comes to mind.</p>
            </>
          ) : (
            <>
              <Sparkles className="mx-auto h-8 w-8 text-blue-600" />
              <h2 className="mt-2 font-outfit text-[20px] font-bold">What’s on your mind?</h2>
              <p className="mt-1 text-[14.5px] text-muted-foreground">Type it the way you’d say it. The app picks out dates and times, then helps you start.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setQuick(ex);
                      quickRef.current?.focus();
                    }}
                    className="rounded-full bg-muted px-3 py-1.5 text-[13px] font-medium text-foreground"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Momentum (only once there's something to count: three zeros on day one don't help anyone) */}
      {(days > 0 || weekDone > 0 || weekFocus > 0) && (
        <div className="mt-3 grid grid-cols-3 gap-2" data-testid="momentum">
          {[
            { icon: Flame, tint: 'text-orange-500', value: `${days}`, label: 'day streak' },
            { icon: CheckCircle2, tint: 'text-emerald-500', value: `${weekDone}`, label: 'done this week' },
            { icon: Timer, tint: 'text-blue-500', value: weekFocus ? durationLabel(weekFocus) : '0 min', label: 'focused this week' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200/70 bg-card px-3 py-2.5 shadow-sm dark:border-slate-800">
              <s.icon className={cn('h-4 w-4', s.tint)} />
              <p className="mt-1 font-outfit text-[19px] font-bold leading-none tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {needsPush && (
        <EnableNotificationsCard compact className="mt-3" title="Turn on reminders" description="So the app can nudge you when it’s time to start." />
      )}

      {/* Lists (swipe a task right: done; left: today or later) */}
      {todos.length > 0 && (
        <>
          <Segmented<Tab>
            className="mb-3 mt-5"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'today', label: 'Today', count: today.length },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'someday', label: 'Someday' },
              { value: 'done', label: 'Done' },
            ]}
          />
          {shown.length > 0 ? (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-200/70 bg-card shadow-sm dark:divide-slate-800 dark:border-slate-800">
              {shown.map((t) => {
                const isDone = t.status === 'done';
                const close = (fn: () => void) => () => {
                  setSwiped(null);
                  fn();
                };
                return (
                  <SwipeRow
                    key={t.id}
                    open={swiped?.id === t.id ? swiped.side : null}
                    onOpenChange={(side) => setSwiped(side ? { id: t.id, side } : null)}
                    left={[{ label: isDone ? 'Not done' : 'Done', icon: Check, className: 'bg-emerald-500', onClick: close(() => toggle(t)) }]}
                    right={
                      isDone
                        ? [{ label: 'Delete', icon: Trash2, className: 'bg-red-600', onClick: close(() => remove(t.id)) }]
                        : [
                            { label: t.today_on === localDay(now) ? 'Not today' : 'Today', icon: Sun, className: 'bg-amber-500', onClick: close(() => pickToday(t)) },
                            { label: 'Later', icon: Clock, className: 'bg-blue-600', onClick: close(() => notNow(t)) },
                          ]
                    }
                    className="rounded-none"
                  >
                    <div className="bg-card">
                      <TaskRow todo={t} now={now} onToggle={() => toggle(t)} onOpen={() => setEditing({ id: t.id })} onStart={() => start(t)} />
                    </div>
                  </SwipeRow>
                );
              })}
            </div>
          ) : (
            <p className="rounded-[20px] border border-dashed border-slate-300 px-4 py-6 text-center text-[14.5px] text-muted-foreground dark:border-slate-700">
              {tab === 'today'
                ? 'Nothing due or planned for today. Pick something from Upcoming or Someday, or enjoy the space.'
                : tab === 'upcoming'
                  ? 'Nothing with a date coming up.'
                  : tab === 'someday'
                    ? 'Tasks with no date wait here.'
                    : 'Finished tasks from the last 60 days show here.'}
            </p>
          )}
          {tab !== 'done' && shown.length > 0 && (
            <p className="mt-2 text-center text-[12px] text-muted-foreground">Swipe a task right when it’s done, left for Today or Later.</p>
          )}
        </>
      )}

      {/* A word for today */}
      <figure className="mt-6 rounded-[20px] bg-amber-50/70 px-5 py-4 dark:bg-amber-950/20">
        <blockquote className="font-serif text-[16px] italic leading-snug text-amber-950 dark:text-amber-100">“{verse.text}”</blockquote>
        <figcaption className="mt-1.5 text-[12.5px] font-semibold text-amber-800/80 dark:text-amber-200/70">{verse.ref} (KJV)</figcaption>
      </figure>

      {/* Layers */}
      <TaskSheet
        todo={editTodo}
        autoBreakdown={editing?.breakdown}
        onClose={() => setEditing(null)}
        onChange={(patch) => editTodo && update(editTodo.id, patch)}
        onDelete={() => {
          if (editTodo) remove(editTodo.id);
          setEditing(null);
        }}
        onStart={() => {
          if (!editTodo) return;
          setEditing(null);
          start(editTodo);
        }}
        onDone={() => {
          if (!editTodo) return;
          setEditing(null);
          toggle(editTodo);
        }}
      />
      <FocusMode
        todo={focusTodo}
        start={focus?.start}
        onTimer={(id, end) => {
          const t = byId(id);
          if (t && (t.focus_end_at ?? null) !== end) update(id, { focus_end_at: end });
        }}
        onClose={(mins) => {
          if (focusTodo && mins) {
            logFocus(focusTodo.id, mins);
            appAlert(`${mins} min focused`, 'Every bit counts. Come back to it when you’re ready.', 'success');
          }
          setFocus(null);
        }}
        onStepDone={(stepId) => {
          if (!focusTodo) return;
          update(focusTodo.id, { steps: focusTodo.steps.map((s) => (s.id === stepId ? { ...s, done: true } : s)) });
        }}
        onComplete={(mins) => {
          if (!focusTodo) return;
          if (mins) logFocus(focusTodo.id, mins);
          const t = focusTodo;
          update(t.id, { focus_end_at: null });
          setFocus(null);
          finish(t);
        }}
        onStuck={() => focusTodo && setStuckFor(focusTodo.id)}
      />
      <LaterSheet todo={byId(laterFor)} onClose={() => setLaterFor(null)} onPick={(when) => byId(laterFor) && planFor(byId(laterFor)!, when)} />
      <StuckSheet todo={byId(stuckFor)} onClose={() => setStuckFor(null)} onAction={(a) => byId(stuckFor) && onStuck(byId(stuckFor)!, a)} />
      <TodoSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} userId={userId} settings={settings} onSaved={setSettings} />
      <PlanDaySheet open={planOpen} onOpenChange={setPlanOpen} todos={todos} onApply={applyPlan} />
      <BrainDumpSheet open={!!dump} onOpenChange={(o) => !o && setDump(null)} initial={dump?.text} onAdd={addMany} />
      <FreshStartSheet
        open={freshOpen}
        onOpenChange={setFreshOpen}
        overdue={overdue}
        onChange={(id, patch) => update(id, patch)}
        onDone={(t) => finish(t)}
      />
      <Confetti burst={burst} />
    </Page>
  );
};

export default TodoPage;
