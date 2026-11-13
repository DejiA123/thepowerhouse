import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ListChecks } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doNext, todayOrder } from '@/lib/todo/brain';
import { peekTodos } from '@/lib/todo/store';

/** At the top of My notes: To do, with today's count and what's next (from the phone's copy) */
const TodoNotesCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { today, next } = useMemo(() => {
    const todos = user ? peekTodos(user.id) : [];
    const now = new Date();
    return { today: todayOrder(todos, now).length, next: doNext(todos, now)?.todo.title ?? null };
  }, [user]);

  return (
    <button
      onClick={() => navigate('/todo')}
      className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-left shadow-sm transition hover:bg-muted/40 active:scale-[0.99]"
      data-testid="notes-todo-card"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
        <ListChecks className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16.5px] font-semibold text-foreground">To do</span>
        <span className="block truncate text-[13.5px] text-muted-foreground">
          {next ? `${today ? `${today} for today · ` : ''}Next: ${next}` : 'Beat procrastination, one small step at a time'}
        </span>
      </span>
      {today > 0 && (
        <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[12px] font-bold tabular-nums text-white">{today}</span>
      )}
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" />
    </button>
  );
};

export default TodoNotesCard;
