/** A tiny step of a task (the first one undone is "the next step") */
export interface TodoStep {
  id: string;
  text: string;
  done: boolean;
  /** Roughly how long it takes */
  minutes?: number | null;
}

export type Repeat = 'daily' | 'weekdays' | 'weekly' | 'monthly';

/** One task in To do (table `todos`, each person's own) */
export interface Todo {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  steps: TodoStep[];
  /** Why it matters (shown when you start it) */
  why: string | null;
  /** "This matters most": done first, like eating the frog */
  important: boolean;
  /** Picked for Today on this date (the phone's own date, YYYY-MM-DD) */
  today_on: string | null;
  /** When I'll start: the reminder rings then */
  plan_at: string | null;
  /** The deadline */
  due_at: string | null;
  /** A deadline with no time ("by Friday"): due_at is the end of that day */
  due_all_day: boolean;
  /** How long the whole thing takes, in minutes */
  estimate_min: number | null;
  repeat: Repeat | null;
  status: 'open' | 'done';
  done_at: string | null;
  /** How many times it's been put off (Not now) */
  snoozes: number;
  /** Minutes spent on it with the focus timer */
  focus_min: number;
  created_at: string;
  updated_at?: string;
  /** On this phone only: waiting to reach the account */
  pending?: boolean;
}

/** The columns the phone may write (never the server's reminder marks) */
export const TODO_COLUMNS = [
  'id', 'user_id', 'title', 'notes', 'steps', 'why', 'important', 'today_on', 'plan_at', 'due_at', 'due_all_day',
  'estimate_min', 'repeat', 'status', 'done_at', 'snoozes', 'focus_min', 'created_at',
] as const;
