import { Check, CloudOff, Play, Repeat2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { aboutLabel, dayLabel, daysBetween, deadline, dueLabel, isOverdue, planLabel, progress, remainingMinutes, repeatLabel, shouldStart, startBy, whenLabel } from '@/lib/todo/brain';
import type { Todo } from '@/lib/todo/types';

/** One task in a list: tick it, tap it to open, ▶ to start it */
const TaskRow = ({ todo, now, onToggle, onOpen, onStart }: { todo: Todo; now: Date; onToggle: () => void; onOpen: () => void; onStart: () => void }) => {
  const done = todo.status === 'done';
  const due = dueLabel(todo, now);
  const late = isOverdue(todo, now);
  const dueSoon = !late && !!deadline(todo) && daysBetween(now, deadline(todo)!) <= 0;
  const plan = planLabel(todo, now);
  const p = progress(todo);
  const meta: { text: string; tone?: 'red' | 'amber' | 'blue' | 'green' | 'pink'; icon?: 'repeat' | 'offline' }[] = [];
  if (!done) {
    if (due) meta.push({ text: due, tone: late ? 'red' : dueSoon ? 'amber' : undefined });
    if (plan && !(late && plan.startsWith('Planned'))) meta.push({ text: plan, tone: 'blue' });
    // When to start so the deadline is met calmly (only when it's earlier than the deadline day)
    const sb = !late && !plan ? startBy(todo) : null;
    if (sb && dueSoon === false && daysBetween(sb.at, deadline(todo)!) > 0) {
      meta.push(shouldStart(todo, now) ? { text: 'Start today', tone: 'amber' } : { text: `Start by ${sb.dayOnly ? dayLabel(sb.at, now) : whenLabel(sb.at, now)}`, tone: 'blue' });
    }
    if (p.total) meta.push({ text: `${p.done}/${p.total} steps`, tone: p.done ? 'green' : undefined });
    if (todo.estimate_min || p.total) meta.push({ text: `~${aboutLabel(remainingMinutes(todo))}` });
    if (todo.snoozes >= 2) meta.push({ text: `Put off ${todo.snoozes}×`, tone: 'amber' });
    if (todo.buddy_name) meta.push({ text: `${todo.buddy_name.split(' ')[0]} is keeping you to it`, tone: 'pink' });
  } else if (todo.done_at) {
    meta.push({ text: `Done ${new Date(todo.done_at).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}`, tone: 'green' });
  }
  if (todo.repeat) meta.push({ text: repeatLabel(todo.repeat)!, icon: 'repeat' });
  if (todo.pending) meta.push({ text: 'Not synced yet', icon: 'offline' });

  return (
    <div className="flex items-start gap-3 px-3.5 py-3" data-testid="todo-row">
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? `Mark “${todo.title}” not done` : `Mark “${todo.title}” done`}
        className={cn(
          'mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90',
          done ? 'border-emerald-500 bg-emerald-500 text-white' : todo.important ? 'border-amber-400' : 'border-slate-300 dark:border-slate-600',
        )}
      >
        {done && <Check className="todo-tick h-4 w-4" strokeWidth={3} />}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className={cn('block text-[16px] font-medium leading-snug [overflow-wrap:anywhere]', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
          {todo.important && !done && <Star className="-mt-0.5 mr-1 inline h-4 w-4 fill-amber-400 text-amber-400" aria-label="Important" />}
          {todo.title}
        </span>
        {meta.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[12.5px] font-medium">
            {meta.map((m) => (
              <span
                key={m.text}
                className={cn(
                  'inline-flex items-center gap-1',
                  m.tone === 'red' ? 'text-red-600 dark:text-red-400'
                    : m.tone === 'amber' ? 'text-amber-600 dark:text-amber-400'
                      : m.tone === 'blue' ? 'text-blue-600 dark:text-blue-400'
                        : m.tone === 'green' ? 'text-emerald-600 dark:text-emerald-400'
                          : m.tone === 'pink' ? 'text-pink-600 dark:text-pink-400'
                          : 'text-muted-foreground',
                )}
              >
                {m.icon === 'repeat' && <Repeat2 className="h-3.5 w-3.5" />}
                {m.icon === 'offline' && <CloudOff className="h-3.5 w-3.5" />}
                {m.text}
              </span>
            ))}
          </span>
        )}
      </button>
      {!done && (
        <button
          type="button"
          onClick={onStart}
          aria-label={`Start “${todo.title}”`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition active:scale-90 dark:bg-blue-950/60 dark:text-blue-300"
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </button>
      )}
    </div>
  );
};

export default TaskRow;
