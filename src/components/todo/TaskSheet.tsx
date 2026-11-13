import { useEffect, useRef, useState } from 'react';
import { Check, Gift, HeartHandshake, Lightbulb, Loader2, Play, Plus, Sparkles, Star, Sun, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { newNoteId } from '@/lib/offlineNotes';
import {
  addDays, durationLabel, endOfDay, laterTime, localDay, remainingMinutes, startByLabel, whenLabel,
} from '@/lib/todo/brain';
import { breakDown } from '@/lib/todo/helper';
import { loadFriends, savedFriends, tellCommit } from '@/lib/todo/buddy';
import { appAlert } from '@/lib/appAlert';
import UserAvatar from '@/components/common/UserAvatar';
import type { Person } from '@/services/socialService';
import type { Repeat, Todo, TodoStep } from '@/lib/todo/types';
import { Chip, Section, SheetTop, sheetClass, toLocalInput } from './parts';

/** Editing a task: every change is kept at once (on the phone first, then the account) */
const TaskSheet = ({
  todo,
  onClose,
  onChange,
  onDelete,
  onStart,
  onDone,
  autoBreakdown,
}: {
  todo: Todo | null;
  onClose: () => void;
  onChange: (patch: Partial<Todo>) => void;
  onDelete: () => void;
  onStart: () => void;
  onDone: () => void;
  /** Open with the helper already breaking it down (from "It feels too big") */
  autoBreakdown?: boolean;
}) => {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [notes, setNotes] = useState('');
  const [reward, setReward] = useState('');
  /** Choosing a friend to keep you to it */
  const [friends, setFriends] = useState<Person[] | null>(null);
  const [telling, setTelling] = useState(false);
  const [newStep, setNewStep] = useState('');
  const [thinking, setThinking] = useState(false);
  const [tip, setTip] = useState<{ text: string; smart: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** The step being typed in (tap a step to change its words) */
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const opened = useRef<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Fill the boxes when a task opens (not on every change, or typing would jump)
  useEffect(() => {
    if (!todo) {
      opened.current = null;
      return;
    }
    if (opened.current === todo.id) return;
    opened.current = todo.id;
    setTitle(todo.title);
    setWhy(todo.why ?? '');
    setNotes(todo.notes ?? '');
    setReward(todo.reward ?? '');
    setFriends(null);
    setNewStep('');
    setTip(null);
    setConfirmDelete(false);
    if (autoBreakdown) void runBreakdown(todo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todo?.id]);

  /** Text boxes save after a short pause */
  const later = (key: string, patch: Partial<Todo>) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => onChange(patch), 450);
  };
  const flush = () => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    if (!todo) return;
    const patch: Partial<Todo> = {};
    if (title.trim() && title.trim() !== todo.title) patch.title = title.trim();
    if ((why.trim() || null) !== todo.why) patch.why = why.trim() || null;
    if ((notes.trim() || null) !== todo.notes) patch.notes = notes.trim() || null;
    if ((reward.trim() || null) !== (todo.reward ?? null)) patch.reward = reward.trim() || null;
    if (Object.keys(patch).length) onChange(patch);
  };
  const close = () => {
    flush();
    onClose();
  };

  async function runBreakdown(t: Todo) {
    setThinking(true);
    try {
      const out = await breakDown({ ...t, title: title.trim() || t.title });
      const kept = t.steps.filter((s) => s.done);
      onChange({ steps: [...kept, ...out.steps].slice(0, 40), estimate_min: t.estimate_min ?? null });
      setTip({ text: out.tip, smart: out.smart });
    } finally {
      setThinking(false);
    }
  }

  if (!todo) return null;

  const now = new Date();
  const steps = todo.steps;
  const setSteps = (next: TodoStep[]) => onChange({ steps: next });
  const plan = todo.plan_at ? new Date(todo.plan_at) : null;
  const due = todo.due_at ? new Date(todo.due_at) : null;
  const insight = startByLabel(todo, now);
  const today = localDay(now);
  const nextFriday = addDays(now, ((5 - now.getDay() + 7) % 7) || 7);

  const setDueDay = (d: Date) => {
    // Keep a time if it had one
    if (due && !todo.due_all_day) onChange({ due_at: new Date(d.getFullYear(), d.getMonth(), d.getDate(), due.getHours(), due.getMinutes()).toISOString(), due_all_day: false });
    else onChange({ due_at: endOfDay(d).toISOString(), due_all_day: true });
  };
  const sameDayAs = (a: Date | null, b: Date) => !!a && localDay(a) === localDay(b);

  return (
    <Sheet open onOpenChange={(o) => !o && close()}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass} onOpenAutoFocus={(e) => e.preventDefault()} data-testid="task-sheet">
        <SheetTop
          title="Task"
          onClose={close}
          action={
            <button
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              className={cn('h-9 rounded-full px-3 text-[13.5px] font-semibold transition', confirmDelete ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40')}
              aria-label="Delete task"
            >
              {confirmDelete ? 'Delete?' : <Trash2 className="h-[18px] w-[18px]" />}
            </button>
          }
        />
        <SheetDescription className="sr-only">Steps, when you’ll start, the deadline and more</SheetDescription>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          <textarea
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) later('title', { title: e.target.value.trim() });
            }}
            onBlur={flush}
            rows={2}
            maxLength={300}
            aria-label="Task"
            className="w-full resize-none border-0 bg-transparent p-0 font-outfit text-[22px] font-bold leading-tight text-foreground focus:shadow-none focus:outline-none"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <Chip on={todo.important} onClick={() => onChange({ important: !todo.important })}>
              <Star className={cn('h-4 w-4', todo.important && 'fill-current')} /> Matters most
            </Chip>
            <Chip on={todo.today_on === today} onClick={() => onChange({ today_on: todo.today_on === today ? null : today })}>
              <Sun className="h-4 w-4" /> Doing it today
            </Chip>
          </div>

          {/* Tiny steps */}
          <Section title="Tiny steps" hint={steps.length ? undefined : 'Big tasks are scary; tiny steps aren’t. The first one should take 2 minutes.'}>
            {steps.length > 0 && (
              <ul className="overflow-hidden rounded-2xl border border-border/70">
                {steps.map((s, i) => (
                  <li key={s.id} className={cn('flex items-start gap-2.5 px-3 py-2.5', i > 0 && 'border-t border-border/50')}>
                    <button
                      onClick={() => setSteps(steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                      aria-label={s.done ? 'Not done' : 'Done'}
                      className={cn('mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2', s.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600')}
                    >
                      {s.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </button>
                    {editingStep === s.id ? (
                      <textarea
                        defaultValue={s.text}
                        autoFocus
                        rows={Math.min(4, Math.ceil(s.text.length / 32) || 1)}
                        maxLength={120}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), (e.target as HTMLTextAreaElement).blur())}
                        onBlur={(e) => {
                          const text = e.target.value.trim();
                          if (text && text !== s.text) setSteps(steps.map((x) => (x.id === s.id ? { ...x, text } : x)));
                          setEditingStep(null);
                        }}
                        aria-label={`Step ${i + 1}`}
                        className="min-w-0 flex-1 resize-none bg-transparent text-[15px] leading-snug focus:shadow-none focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingStep(s.id)}
                        className={cn('min-w-0 flex-1 text-left text-[15px] leading-snug [overflow-wrap:anywhere]', s.done && 'text-muted-foreground line-through')}
                      >
                        {s.text}
                      </button>
                    )}
                    {s.minutes ? <span className="mt-0.5 shrink-0 text-[12.5px] tabular-nums text-muted-foreground">{s.minutes} min</span> : null}
                    <button onClick={() => setSteps(steps.filter((x) => x.id !== s.id))} aria-label="Remove step" className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = newStep.trim();
                if (!text) return;
                setSteps([...steps, { id: newNoteId(), text: text.slice(0, 120), done: false, minutes: null }]);
                setNewStep('');
              }}
            >
              <input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                placeholder="Add a step…"
                maxLength={120}
                className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-[15px]"
              />
              <button type="submit" disabled={!newStep.trim()} aria-label="Add step" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground disabled:opacity-40">
                <Plus className="h-5 w-5" />
              </button>
            </form>
            <button
              onClick={() => void runBreakdown(todo)}
              disabled={thinking}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-50 text-[14.5px] font-semibold text-violet-700 transition active:scale-[0.99] disabled:opacity-70 dark:bg-violet-950/40 dark:text-violet-300"
              data-testid="break-down"
            >
              {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {thinking ? 'Breaking it down…' : steps.some((s) => !s.done) ? 'Break it down again' : 'Break it into tiny steps'}
            </button>
            {tip?.text && (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[13.5px] leading-snug text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /> {tip.text}
              </p>
            )}
          </Section>

          {/* When I'll start */}
          <Section
            title="When will you start?"
            hint={plan ? `We’ll remind you ${whenLabel(plan, now)}.` : 'People who pick a time are far more likely to actually start.'}
          >
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              <Chip on={false} onClick={onStart}>
                <Play className="h-3.5 w-3.5 fill-current" /> Now
              </Chip>
              {(['hour', 'tonight', 'tomorrow', 'weekend'] as const).map((k) => {
                const at = laterTime(k, now);
                const label = k === 'hour' ? 'In an hour' : k === 'tonight' ? 'Tonight' : k === 'tomorrow' ? 'Tomorrow 9am' : 'Weekend';
                return (
                  <Chip key={k} on={!!plan && Math.abs(plan.getTime() - at.getTime()) < 60_000} onClick={() => onChange({ plan_at: at.toISOString() })}>
                    {label}
                  </Chip>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="datetime-local"
                value={plan ? toLocalInput(plan) : ''}
                onChange={(e) => onChange({ plan_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                aria-label="Start time"
                className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-[15px]"
              />
              {plan && (
                <button onClick={() => onChange({ plan_at: null })} aria-label="No start time" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </Section>

          {/* Deadline */}
          <Section title="Deadline">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              <Chip on={sameDayAs(due, now)} onClick={() => setDueDay(now)}>Today</Chip>
              <Chip on={sameDayAs(due, addDays(now, 1))} onClick={() => setDueDay(addDays(now, 1))}>Tomorrow</Chip>
              <Chip on={sameDayAs(due, nextFriday)} onClick={() => setDueDay(nextFriday)}>Friday</Chip>
              <Chip on={sameDayAs(due, laterTime('nextweek', now))} onClick={() => setDueDay(laterTime('nextweek', now))}>Next week</Chip>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                value={due ? localDay(due) : ''}
                onChange={(e) => {
                  if (!e.target.value) return onChange({ due_at: null, due_all_day: false });
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  setDueDay(new Date(y, m - 1, d));
                }}
                aria-label="Deadline day"
                className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-[15px]"
              />
              <input
                type="time"
                value={due && !todo.due_all_day ? `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}` : ''}
                disabled={!due}
                onChange={(e) => {
                  if (!due) return;
                  if (!e.target.value) return onChange({ due_at: endOfDay(due).toISOString(), due_all_day: true });
                  const [h, m] = e.target.value.split(':').map(Number);
                  onChange({ due_at: new Date(due.getFullYear(), due.getMonth(), due.getDate(), h, m).toISOString(), due_all_day: false });
                }}
                aria-label="Deadline time"
                className="h-11 w-[132px] shrink-0 rounded-xl border border-border bg-background px-2.5 text-[15px] disabled:opacity-40"
              />
              {due && (
                <button onClick={() => onChange({ due_at: null, due_all_day: false })} aria-label="No deadline" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </Section>

          {/* How long */}
          <Section title="How long will it take?">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {[5, 15, 30, 60, 120, 240].map((m) => (
                <Chip key={m} on={todo.estimate_min === m} onClick={() => onChange({ estimate_min: todo.estimate_min === m ? null : m })}>
                  {durationLabel(m)}
                </Chip>
              ))}
            </div>
            {insight && (
              <p className={cn('mt-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium leading-snug', /behind|today/i.test(insight) ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200')} data-testid="start-by">
                {insight}. {todo.estimate_min || steps.length ? '' : 'Set how long it takes for a better guess. '}People usually need about half as long again as they expect, so that’s built in.
              </p>
            )}
            {!insight && (todo.estimate_min || steps.length > 0) && (
              <p className="mt-2 text-[13px] text-muted-foreground">About {durationLabel(remainingMinutes(todo))} of work left.</p>
            )}
          </Section>

          {/* Repeat */}
          <Section title="Repeat">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {([[null, 'Never'], ['daily', 'Daily'], ['weekdays', 'Weekdays'], ['weekly', 'Weekly'], ['monthly', 'Monthly']] as [Repeat | null, string][]).map(([r, label]) => (
                <Chip key={label} on={todo.repeat === r} onClick={() => onChange({ repeat: r })}>{label}</Chip>
              ))}
            </div>
          </Section>

          {/* A reward */}
          <Section title="Your reward when it’s done" hint="Something to look forward to makes starting easier. You’ll see it while you focus, and when you finish.">
            <div className="relative">
              <Gift className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
              <input
                value={reward}
                onChange={(e) => {
                  setReward(e.target.value);
                  later('reward', { reward: e.target.value.trim() || null });
                }}
                onBlur={flush}
                maxLength={200}
                placeholder="e.g. Coffee with a friend, an episode, a walk"
                className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-[15px]"
              />
            </div>
          </Section>

          {/* A friend keeps you to it */}
          <Section title="Keep me to it" hint={todo.buddy_id ? undefined : 'Telling a friend what you’ll do, and by when, makes you far more likely to do it. They only see this one task.'}>
            {todo.buddy_id ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 px-3 py-2.5" data-testid="buddy-set">
                <HeartHandshake className="h-5 w-5 shrink-0 text-pink-500" />
                <span className="min-w-0 flex-1 text-[14.5px] leading-snug text-foreground">
                  <span className="font-semibold">{todo.buddy_name || 'Your friend'}</span> is keeping you to it. They’ll get a message when you tick it done.
                </span>
                <button onClick={() => onChange({ buddy_id: null, buddy_name: null })} className="shrink-0 rounded-full px-2 py-1 text-[13px] font-semibold text-muted-foreground hover:bg-muted">
                  Remove
                </button>
              </div>
            ) : friends === null ? (
              <button
                onClick={() => {
                  setFriends(savedFriends());
                  void loadFriends().then(setFriends);
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-pink-50 text-[14.5px] font-semibold text-pink-700 transition active:scale-[0.99] dark:bg-pink-950/30 dark:text-pink-300"
                data-testid="buddy-pick"
              >
                <HeartHandshake className="h-4 w-4" /> Ask a friend to keep me to it
              </button>
            ) : friends.length === 0 ? (
              <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-[13.5px] text-muted-foreground">Add friends in Me → Friends first, then come back.</p>
            ) : (
              <ul className="max-h-60 divide-y divide-border/50 overflow-y-auto rounded-2xl border border-border/70" data-testid="buddy-list">
                {friends.map((f) => (
                  <li key={f.id}>
                    <button
                      disabled={telling}
                      onClick={async () => {
                        setTelling(true);
                        const t = { ...todo, title: title.trim() || todo.title };
                        onChange({ buddy_id: f.id, buddy_name: f.name });
                        const sent = await tellCommit(f.id, t);
                        setTelling(false);
                        setFriends(null);
                        if (sent) appAlert(`${f.name.split(' ')[0]} knows now`, 'They’ll get another message when you tick it done.', 'success');
                        else appAlert('Saved, but the message didn’t send', `Tell ${f.name.split(' ')[0]} yourself, or try again later.`, 'error');
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted/50 disabled:opacity-60"
                    >
                      <UserAvatar name={f.name} src={f.avatar} seed={f.id} className="h-9 w-9" />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-foreground">{f.name}</span>
                      {telling ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Why */}
          <Section title="Why does it matter?" hint="Shown when you start it. Remembering why makes starting easier.">
            <input
              value={why}
              onChange={(e) => {
                setWhy(e.target.value);
                later('why', { why: e.target.value.trim() || null });
              }}
              onBlur={flush}
              maxLength={300}
              placeholder="e.g. So the family has a calm Christmas"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[15px]"
            />
          </Section>

          <Section title="Notes">
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                later('notes', { notes: e.target.value.trim() || null });
              }}
              onBlur={flush}
              rows={3}
              maxLength={4000}
              placeholder="Links, details, anything"
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-[15px]"
            />
          </Section>
        </div>

        <div className="flex gap-2 border-t border-border/60 px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)] pt-3">
          <button
            onClick={() => {
              flush();
              onStart();
            }}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[15.5px] font-semibold text-white shadow-md shadow-blue-600/25 active:scale-[0.99]"
          >
            <Play className="h-4 w-4 fill-current" /> Start now
          </button>
          <button
            onClick={() => {
              flush();
              onDone();
            }}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-[15.5px] font-semibold text-emerald-700 active:scale-[0.99] dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <Check className="h-5 w-5" strokeWidth={3} /> {todo.status === 'done' ? 'Not done' : 'Done'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskSheet;
