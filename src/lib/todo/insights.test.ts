import { describe, expect, test } from 'bun:test';
import { bufferedMinutes, laterTime, setPersonalBuffer, startByLabel } from './brain';
import type { EventKind, TodoEvent } from './events';
import { computeInsights, paceOf, partOf, planOutcomes } from './insights';
import type { Todo } from './types';

// Friday 13 November 2026, 20:00 on the phone
const NOW = new Date(2026, 10, 13, 20, 0);
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
let n = 0;
const ev = (todo: string, kind: EventKind, when: Date, data: Record<string, unknown> = {}): TodoEvent => ({
  id: `e${++n}`,
  todo_id: todo,
  kind,
  at: when.toISOString(),
  data,
});
const plan = (todo: string, setAt: Date, forAt: Date | null) => ev(todo, 'planned', setAt, { for: forAt?.toISOString() ?? null });
const todo = (over: Partial<Todo> = {}): Todo => ({
  id: over.id ?? `t${++n}`,
  user_id: 'u',
  title: over.title ?? `Task ${n}`,
  notes: null,
  steps: [],
  why: null,
  important: false,
  today_on: null,
  plan_at: null,
  due_at: null,
  due_all_day: false,
  estimate_min: null,
  repeat: null,
  status: 'open',
  done_at: null,
  snoozes: 0,
  focus_min: 0,
  created_at: at(1, 9).toISOString(),
  ...over,
});
const results = (events: TodoEvent[]) => planOutcomes(events, NOW).map((p) => p.result);

describe('planned starts', () => {
  test('started near the time, or done by 3 h after: kept', () => {
    expect(results([plan('a', at(12, 8), at(12, 9)), ev('a', 'started', at(12, 9, 20))])).toEqual(['kept']);
    expect(results([plan('a', at(12, 8), at(12, 9)), ev('a', 'started', at(12, 8, 40))])).toEqual(['kept']);
    expect(results([plan('a', at(12, 8), at(12, 9)), ev('a', 'done', at(12, 11, 30))])).toEqual(['kept']);
    // Done early is even better
    expect(results([plan('a', at(12, 8), at(12, 19)), ev('a', 'done', at(12, 10))])).toEqual(['kept']);
  });

  test('later the same day: late; nothing: missed; still to come: pending', () => {
    expect(results([plan('a', at(12, 8), at(12, 9)), ev('a', 'started', at(12, 15))])).toEqual(['late']);
    expect(results([plan('a', at(11, 8), at(11, 9))])).toEqual(['missed']);
    expect(results([plan('a', at(13, 12), at(13, 21))])).toEqual(['pending']);
    // Its time has passed but done can still come within 3 h
    expect(results([plan('a', at(13, 12), at(13, 18))])).toEqual(['pending']);
  });

  test('put off once the time came: missed; planned again ahead of time: moved', () => {
    const putOff = [plan('a', at(12, 8), at(12, 9)), ev('a', 'snoozed', at(12, 9, 5)), plan('a', at(12, 9, 5), at(13, 9)), ev('a', 'started', at(13, 9))];
    expect(results(putOff)).toEqual(['missed', 'kept']);
    const moved = [plan('a', at(12, 8), at(12, 18)), plan('a', at(12, 12), at(13, 9)), ev('a', 'started', at(13, 9, 10))];
    expect(results(moved)).toEqual(['moved', 'kept']);
  });

  test('an edit within 3 minutes is one plan; a plan taken off or let go doesn’t count', () => {
    const edit = [plan('a', at(12, 8), at(12, 10)), plan('a', at(12, 8, 1), at(12, 11)), ev('a', 'started', at(12, 11))];
    expect(results(edit)).toEqual(['kept']);
    expect(results([plan('a', at(12, 8), at(12, 18)), plan('a', at(12, 9), null)])).toEqual(['moved']);
    expect(results([plan('a', at(12, 8), at(12, 18)), ev('a', 'dropped', at(12, 9), { how: 'delete' })])).toEqual(['dropped']);
  });

  test('parts of the day', () => {
    expect([at(1, 5), at(1, 11, 59), at(1, 12), at(1, 17), at(1, 22), at(1, 2)].map(partOf)).toEqual(['morning', 'morning', 'afternoon', 'evening', 'night', 'night']);
  });
});

describe('the verdict and what it learns', () => {
  // Mornings work, evenings don't
  const events: TodoEvent[] = [];
  for (const d of [6, 7, 9, 10, 11, 12]) {
    events.push(plan(`m${d}`, at(d - 1, 21), at(d, 8)), ev(`m${d}`, 'started', at(d, 8, 5)));
    events.push(plan(`e${d}`, at(d, 9), at(d, 19)));
  }
  events.push(ev('e12', 'started', at(12, 19, 10)));

  test('rates, best time and the "Not now" to point out', () => {
    const r = computeInsights([], events, NOW);
    expect(r.plans.kept).toBe(7);
    expect(r.plans.of).toBe(12);
    expect(r.byPart.morning).toEqual({ kept: 6, of: 6, rate: 1 });
    expect(r.byPart.evening.kept).toBe(1);
    expect(r.best?.part).toBe('morning');
    expect(r.best?.worst?.part).toBe('evening');
    expect(r.bestLater).toBe('tomorrow');
    expect(r.verdict).toBe('good');
    expect(r.summary).toMatch(/^7 of 12 planned starts happened in the last 4 weeks/);
    expect(r.tips.some((t) => t.id === 'best-time')).toBe(true);
  });

  test('a week only counts that week', () => {
    const r = computeInsights([], events, NOW, 7);
    expect(r.plans.of).toBe(10);
    expect(r.summary).toMatch(/this week/);
  });

  test('nothing yet: early days, no made-up numbers', () => {
    const r = computeInsights([todo()], [], NOW);
    expect(r.verdict).toBe('early');
    expect(r.plans.rate).toBeNull();
    expect(r.best).toBeNull();
    expect(r.bestLater).toBeNull();
  });

  test('deadlines met, late and overdue', () => {
    const todos = [
      todo({ status: 'done', due_at: at(10, 17).toISOString(), done_at: at(10, 16).toISOString() }),
      todo({ status: 'done', due_at: at(11, 23, 59).toISOString(), due_all_day: true, done_at: at(11, 22).toISOString() }),
      todo({ status: 'done', due_at: at(9, 17).toISOString(), done_at: at(10, 9).toISOString() }),
      todo({ due_at: at(12, 12).toISOString() }),
      todo({ due_at: at(20, 12).toISOString() }),
    ];
    const r = computeInsights(todos, [], NOW);
    expect(r.deadlines).toEqual({ onTime: 2, late: 1, overdue: 1, of: 4, rate: 0.5 });
    expect(r.verdict).toBe('good');
  });

  test('2-minute starts that kept going, and what gets in the way', () => {
    const e = [
      ev('a', 'focused', at(12, 9), { minutes: 2.1, initial: 2, done: false }),
      ev('a', 'focused', at(12, 10), { minutes: 7, initial: 2, done: false }),
      ev('b', 'focused', at(12, 11), { minutes: 1.5, initial: 2, done: true }),
      ev('c', 'focused', at(12, 12), { minutes: 25, initial: 25, done: false }),
      ev('a', 'stuck', at(12, 9), { reason: 'perfect' }),
      ev('b', 'stuck', at(12, 9), { reason: 'perfect' }),
      ev('c', 'stuck', at(12, 9), { reason: 'big' }),
      ev('c', 'stuck', at(12, 9), { reason: 'nonsense' }),
    ];
    const r = computeInsights([todo({ id: 'c', snoozes: 4 })], e, NOW);
    expect(r.focus.sessions).toBe(4);
    expect(r.focus.minutes).toBe(36);
    expect(r.focus.twoMin).toEqual({ kept: 2, of: 3, rate: 2 / 3 });
    expect(r.stuck).toEqual([{ reason: 'perfect', count: 2 }, { reason: 'big', count: 1 }]);
    expect(r.putOff?.id).toBe('c');
    expect(r.tips[0].id).toBe('perfect');
    expect(r.tips[0].action?.to).toBe('/todo?task=c&focus=rough');
    expect(r.tips.length).toBeLessThanOrEqual(3);
  });

  test('a pile of overdue tasks comes first', () => {
    const todos = [todo({ due_at: at(10, 9).toISOString() }), todo({ due_at: at(11, 9).toISOString() })];
    expect(computeInsights(todos, [], NOW).tips[0].id).toBe('fresh');
  });

  test('the weeks, oldest first', () => {
    const todos = [todo({ status: 'done', done_at: at(13, 9).toISOString() }), todo({ status: 'done', done_at: at(5, 9).toISOString() })];
    const r = computeInsights(todos, [], NOW);
    expect(r.weeks.map((w) => w.done)).toEqual([0, 0, 1, 1]);
    expect(r.weeks[3].from.getDate()).toBe(7);
  });
});

describe('your pace', () => {
  const done = (est: number, spent: number, via = 'focus') => ev('x', 'done', at(12, 9), { estimate: est, focus_min: spent, via });

  test('needs 3 tasks finished in focus with a real guess', () => {
    expect(paceOf([done(30, 60), done(30, 45)]).ratio).toBeNull();
    expect(paceOf([done(30, 60), done(30, 45), done(5, 40), done(30, 90, 'list')]).ratio).toBeNull();
    const p = paceOf([done(30, 60), done(30, 45), done(60, 120)]);
    expect(p.ratio).toBe(2);
    expect(p.buffer).toBe(2.4);
    // Quick ones: never below 1.1
    expect(paceOf([done(60, 20), done(60, 30), done(60, 25)]).buffer).toBe(1.1);
  });

  test('start-by uses it, and says so', () => {
    const t = todo({ estimate_min: 100, due_at: at(20, 23, 59).toISOString(), due_all_day: true });
    expect(bufferedMinutes(t)).toBe(150);
    setPersonalBuffer(2.4);
    expect(bufferedMinutes(t)).toBe(240);
    expect(startByLabel(t, NOW)).toMatch(/at your pace\)$/);
    setPersonalBuffer(null);
    expect(bufferedMinutes(t)).toBe(150);
    expect(startByLabel(t, NOW)).not.toMatch(/your pace/);
  });

  test('"Not now" in the afternoon', () => {
    expect(laterTime('afternoon', at(13, 10)).getHours()).toBe(14);
    expect(laterTime('afternoon', at(13, 10)).getDate()).toBe(13);
    expect(laterTime('afternoon', at(13, 15)).getDate()).toBe(14);
  });
});
