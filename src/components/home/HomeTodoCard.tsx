import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ListChecks, Play } from 'lucide-react';
import { doNext, isOverdue, localDay, todayOrder } from '@/lib/todo/brain';
import { useTodos } from '@/lib/todo/store';

/**
 * Home → "Your day": To do right under the greeting, because it's about you and today
 * (the church's tiles are about where to go). With tasks: what's next and why, how many are
 * left for today, and Start (straight into focus). All done: a short well done. Never used
 * To do: one slim line, so the picture buttons stay where they are. Signed out: nothing.
 * The list is the phone's copy, refreshed from the server and live (useTodos).
 */
const HomeTodoCard = () => {
  const navigate = useNavigate();
  const { todos, loaded } = useTodos();

  const view = useMemo(() => {
    const now = new Date();
    const open = todos.filter((t) => t.status === 'open');
    const pick = doNext(todos, now);
    const today = todayOrder(todos, now).length;
    const overdue = open.filter((t) => isOverdue(t, now)).length;
    const doneToday = todos.filter((t) => t.done_at && localDay(new Date(t.done_at)) === localDay(now)).length;
    return { open: open.length, pick, today, overdue, doneToday, any: todos.length > 0 };
  }, [todos]);

  // Nothing at all yet: one slim line (only once the server agrees there's nothing)
  if (!view.any) {
    if (!loaded) return null;
    return (
      <button
        onClick={() => navigate('/todo')}
        className="mt-3 flex w-full items-center gap-3 rounded-[18px] border border-border/70 bg-card px-3.5 py-2.5 text-left shadow-sm transition active:scale-[0.99] md:max-w-xl"
        data-testid="home-todo"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <ListChecks className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] text-muted-foreground">
          <span className="font-semibold text-foreground">To do</span> · small steps, started today
        </span>
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" />
      </button>
    );
  }

  const { pick } = view;
  return (
    <div className="mt-3 rounded-[20px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-card md:max-w-xl" data-testid="home-todo">
      <button onClick={() => navigate('/todo')} className="flex w-full items-center gap-2.5 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <ListChecks className="h-[18px] w-[18px]" />
        </span>
        <span className="flex-1 text-[13px] font-bold uppercase tracking-[0.07em] text-emerald-800 dark:text-emerald-300">Your day</span>
        {view.overdue > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[12px] font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">{view.overdue} overdue</span>}
        {view.today > 0 && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[12px] font-semibold text-white">{view.today} today</span>}
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-emerald-700/60" />
      </button>

      {pick ? (
        <div className="mt-2.5 flex items-center gap-3">
          <button onClick={() => navigate(`/todo?task=${pick.todo.id}`)} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[17px] font-semibold text-foreground">{pick.todo.title}</span>
            <span className="block truncate text-[13.5px] text-muted-foreground">{pick.reasons[0] ?? 'Next up'}</span>
          </button>
          <button
            onClick={() => navigate(`/todo?task=${pick.todo.id}&start=1`)}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-[14.5px] font-semibold text-white shadow-sm active:scale-95"
            data-testid="home-todo-start"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Start
          </button>
        </div>
      ) : (
        <button onClick={() => navigate('/todo')} className="mt-2 block w-full text-left">
          <span className="block text-[16px] font-semibold text-foreground">
            {view.doneToday ? `All done for today 🎉` : 'Nothing on your list'}
          </span>
          <span className="block text-[13.5px] text-muted-foreground">
            {view.doneToday ? `${view.doneToday} finished today. Add the next thing when you’re ready.` : 'Add a task when something comes to mind.'}
          </span>
        </button>
      )}
    </div>
  );
};

export default HomeTodoCard;
