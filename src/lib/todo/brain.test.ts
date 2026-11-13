import { describe, expect, test } from 'bun:test';
import { daysFrom, pickForMe, timesFor } from './brain';
import { doNext, doNextIn, dumpLines, inToday, isSomeday, isUpcoming, laterTime, moveDue, nextOccurrence, planDay, remainingMinutes, score, startBy, startByLabel, streak } from './brain';
import type { Todo } from './types';

// Wednesday 11 November 2026, 10:00 on the phone
const NOW = new Date(2026, 10, 11, 10, 0);
const iso = (...a: number[]) => new Date(a[0], a[1] - 1, a[2], a[3] ?? 0, a[4] ?? 0).toISOString();
let n = 0;
const todo = (over: Partial<Todo> = {}): Todo => ({
  id: `t${++n}`,
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
  created_at: iso(2026, 11, 10, 9),
  ...over,
});
const allDay = (y: number, m: number, d: number) => ({ due_at: iso(y, m, d, 23, 59), due_all_day: true });
const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe('time left', () => {
  test('from the estimate, or the steps, or a default', () => {
    expect(remainingMinutes(todo({ estimate_min: 120 }))).toBe(120);
    expect(remainingMinutes(todo())).toBe(30);
    expect(remainingMinutes(todo({ steps: [{ id: 'a', text: 'x', done: true }, { id: 'b', text: 'y', done: false }] }))).toBe(10);
    expect(remainingMinutes(todo({ estimate_min: 60, steps: [{ id: 'a', text: 'x', done: true }, { id: 'b', text: 'y', done: false }] }))).toBe(30);
    expect(remainingMinutes(todo({ steps: [{ id: 'a', text: 'x', done: false, minutes: 25 }, { id: 'b', text: 'y', done: false, minutes: 5 }] }))).toBe(30);
    // Your estimate stands; the steps' times say how far through you are
    expect(remainingMinutes(todo({ estimate_min: 120, steps: [{ id: 'a', text: 'x', done: true, minutes: 30 }, { id: 'b', text: 'y', done: false, minutes: 30 }] }))).toBe(60);
  });
});

describe('start by', () => {
  test('big work starts days ahead (with the planning-fallacy buffer)', () => {
    // due Fri, ~2 h → 3 h with buffer → 2 days of 90 min → start Wed
    expect(ymd(startBy(todo({ ...allDay(2026, 11, 13), estimate_min: 120 }))!.at)).toEqual([2026, 11, 11]);
    // 45 min → 68 min → start Thu
    expect(ymd(startBy(todo({ ...allDay(2026, 11, 13), estimate_min: 45 }))!.at)).toEqual([2026, 11, 12]);
    // 20 min → on the day
    expect(ymd(startBy(todo({ ...allDay(2026, 11, 13), estimate_min: 20 }))!.at)).toEqual([2026, 11, 13]);
  });
  test('small work against a timed deadline: a time on the day', () => {
    const s = startBy(todo({ due_at: iso(2026, 11, 11, 17), estimate_min: 20 }))!;
    expect(s.dayOnly).toBe(false);
    expect([s.at.getHours(), s.at.getMinutes()]).toEqual([16, 0]);
  });
  test('says so in words', () => {
    expect(startByLabel(todo({ ...allDay(2026, 11, 20), estimate_min: 240 }), NOW)).toMatch(/^Start by .* to finish calmly \(about 6 h\)$/);
    expect(startByLabel(todo({ ...allDay(2026, 11, 13), estimate_min: 120 }), NOW)).toBe('Start today: it needs about 3 h');
    expect(startByLabel(todo({ ...allDay(2026, 11, 12), estimate_min: 300 }), NOW)).toMatch(/^You're behind/);
  });
});

describe('today, upcoming, someday', () => {
  test('what belongs to today', () => {
    expect(inToday(todo({ ...allDay(2026, 11, 11) }), NOW)).toBe(true); // due today
    expect(inToday(todo({ ...allDay(2026, 11, 9) }), NOW)).toBe(true); // overdue
    expect(inToday(todo({ plan_at: iso(2026, 11, 11, 19) }), NOW)).toBe(true); // planned tonight
    expect(inToday(todo({ plan_at: iso(2026, 11, 10, 19) }), NOW)).toBe(true); // planned yesterday, not done
    expect(inToday(todo({ today_on: '2026-11-11' }), NOW)).toBe(true); // picked
    expect(inToday(todo({ ...allDay(2026, 11, 13), estimate_min: 120 }), NOW)).toBe(true); // time to start
    expect(inToday(todo({ ...allDay(2026, 11, 20), estimate_min: 20 }), NOW)).toBe(false);
    expect(inToday(todo({ status: 'done', ...allDay(2026, 11, 11) }), NOW)).toBe(false);
  });
  test('upcoming has a date, someday has none', () => {
    expect(isUpcoming(todo({ ...allDay(2026, 11, 20) }), NOW)).toBe(true);
    expect(isSomeday(todo(), NOW)).toBe(true);
    expect(isSomeday(todo({ today_on: '2026-11-11' }), NOW)).toBe(false);
  });
});

describe('do next', () => {
  test('overdue beats everything', () => {
    const late = todo({ title: 'late', ...allDay(2026, 11, 10) });
    const important = todo({ title: 'important', important: true });
    expect(doNext([important, late], NOW)!.todo.title).toBe('late');
  });
  test('the important one beats a someday one', () => {
    const plain = todo({ title: 'plain' });
    const frog = todo({ title: 'frog', important: true });
    const pick = doNext([plain, frog], NOW)!;
    expect(pick.todo.title).toBe('frog');
    expect(pick.reasons).toContain('It matters most');
  });
  test('a planned time that has come rises, a later plan waits', () => {
    const now = todo({ title: 'now', plan_at: iso(2026, 11, 11, 9, 30) });
    const later = todo({ title: 'later', plan_at: iso(2026, 11, 12, 9), important: true });
    expect(doNext([later, now], NOW)!.todo.title).toBe('now');
    expect(score(now, NOW).reasons[0]).toBe('You planned to start at 9:30am');
  });
  test('the task you keep avoiding rises', () => {
    const avoided = todo({ title: 'avoided', snoozes: 4 });
    const fresh = todo({ title: 'fresh' });
    const pick = doNext([fresh, avoided], NOW)!;
    expect(pick.todo.title).toBe('avoided');
    expect(pick.reasons).toContain('You’ve put it off 4 times');
  });
  test('skipping moves on to the next one', () => {
    const a = todo({ title: 'a', important: true });
    const b = todo({ title: 'b' });
    expect(doNext([a, b], NOW, new Set([a.id]))!.todo.title).toBe('b');
    expect(doNext([], NOW)).toBeNull();
  });
});

describe('not now', () => {
  test('later times', () => {
    expect(laterTime('tonight', NOW).getHours()).toBe(19);
    expect(ymd(laterTime('tomorrow', NOW))).toEqual([2026, 11, 12]);
    expect(laterTime('tomorrow', NOW).getHours()).toBe(9);
    expect(ymd(laterTime('weekend', NOW))).toEqual([2026, 11, 14]);
    expect(ymd(laterTime('nextweek', NOW))).toEqual([2026, 11, 16]);
    const hour = laterTime('hour', NOW);
    expect([hour.getHours(), hour.getMinutes()]).toEqual([11, 0]);
  });
});

describe('repeats', () => {
  test('weekly moves to the next week, steps unticked', () => {
    const t = todo({ repeat: 'weekly', due_at: iso(2026, 11, 11, 19), status: 'done', steps: [{ id: 's', text: 'x', done: true }] });
    const next = nextOccurrence(t, NOW)!;
    expect(ymd(new Date(next.due_at!))).toEqual([2026, 11, 18]);
    expect(next.status).toBe('open');
    expect(next.steps[0].done).toBe(false);
  });
  test('weekdays skip the weekend', () => {
    const t = todo({ repeat: 'weekdays', due_at: iso(2026, 11, 13, 8) });
    expect(ymd(new Date(nextOccurrence(t, new Date(2026, 10, 13, 9))!.due_at!))).toEqual([2026, 11, 16]);
  });
  test('monthly on the 31st uses the last day of a short month', () => {
    const t = todo({ repeat: 'monthly', due_at: iso(2027, 1, 31, 9) });
    expect(ymd(new Date(nextOccurrence(t, new Date(2027, 0, 31, 10))!.due_at!))).toEqual([2027, 2, 28]);
  });
  test('a repeat long overdue catches up to after now', () => {
    const t = todo({ repeat: 'daily', due_at: iso(2026, 11, 1, 7) });
    expect(ymd(new Date(nextOccurrence(t, NOW)!.due_at!))).toEqual([2026, 11, 12]);
  });
});

describe('streak', () => {
  test('days in a row with something done or focused', () => {
    const done = (d: number) => todo({ status: 'done', done_at: iso(2026, 11, d, 12) });
    expect(streak([done(11), done(10), done(9), done(7)], {}, NOW)).toBe(3);
    // Nothing yet today: yesterday's run still counts
    expect(streak([done(10), done(9)], {}, NOW)).toBe(2);
    // Focus counts too (5 minutes or more)
    expect(streak([done(10)], { '2026-11-11': 12, '2026-11-09': 3 }, NOW)).toBe(2);
    expect(streak([], {}, NOW)).toBe(0);
  });
});

describe('the time you have', () => {
  test('fits by its next step, or the whole thing', () => {
    const steps = (m: number) => [{ id: 's', text: 'x', done: false, minutes: m }];
    expect(doNextIn([todo({ title: 'long', steps: steps(40) }), todo({ title: 'short', steps: steps(10) })], NOW, 15)!.todo.title).toBe('short');
    expect(doNextIn([todo({ title: 'big', estimate_min: 120 })], NOW, 15)).toBeNull();
    expect(doNextIn([todo({ title: 'quick', estimate_min: 5 })], NOW, 15)!.todo.title).toBe('quick');
    // No idea how long: 15 minutes is enough to make a start, 5 isn't
    expect(doNextIn([todo({ title: 'call' })], NOW, 15)!.todo.title).toBe('call');
    expect(doNextIn([todo({ title: 'call' })], NOW, 5)).toBeNull();
  });
});

describe('plan my day', () => {
  test('a timeline from the next quarter hour, deadlines with a time first, with gaps', () => {
    const now = new Date(2026, 10, 11, 10, 7);
    const a = todo({ title: 'a', estimate_min: 30, important: true });
    const b = todo({ title: 'b', estimate_min: 20, due_at: iso(2026, 11, 11, 12) });
    const plan = planDay([a, b], now, { capacityMin: 180 });
    expect(plan.blocks.map((x) => x.todo.title)).toEqual(['b', 'a']);
    expect([plan.blocks[0].start.getHours(), plan.blocks[0].start.getMinutes()]).toEqual([10, 15]);
    expect([plan.blocks[1].start.getHours(), plan.blocks[1].start.getMinutes()]).toEqual([10, 40]);
    expect(plan.planned).toBe(50);
    expect(plan.overflow).toEqual([]);
  });
  test('never more than the time you have: the rest is listed', () => {
    const tasks = [60, 60, 60].map((m, i) => todo({ title: `t${i}`, estimate_min: m }));
    const plan = planDay(tasks, NOW, { capacityMin: 120 });
    expect(plan.blocks.length).toBe(2);
    expect(plan.overflow.length).toBe(1);
  });
  test('big work gets today’s share, and a break after 90 minutes', () => {
    const big = todo({ title: 'big', estimate_min: 300 });
    const small = todo({ title: 'small', estimate_min: 30 });
    const plan = planDay([big, small], NOW, { capacityMin: 240 });
    expect(plan.blocks[0]).toMatchObject({ minutes: 90, partial: true });
    expect(plan.breaks.length).toBe(1);
    expect(plan.blocks[1].start.getTime()).toBe(plan.breaks[0].end.getTime());
  });
  test('a block ending after its deadline is marked late', () => {
    const now = new Date(2026, 10, 11, 10, 0);
    const t = todo({ estimate_min: 90, due_at: iso(2026, 11, 11, 11) });
    expect(planDay([t], now, { capacityMin: 240 }).blocks[0].late).toBe(true);
  });
  test('in the small hours it plans the morning; an overdue task isn’t marked late again', () => {
    const plan = planDay([todo({ estimate_min: 30, due_at: iso(2026, 11, 9, 17) })], new Date(2026, 10, 11, 0, 30), { capacityMin: 120 });
    expect([plan.from.getDate(), plan.from.getHours()]).toEqual([11, 9]);
    expect(plan.blocks[0].late).toBe(false);
  });
  test('late at night it plans tomorrow from 9', () => {
    const plan = planDay([todo({ estimate_min: 30 })], new Date(2026, 10, 11, 22, 30), { capacityMin: 120 });
    expect([plan.from.getDate(), plan.from.getHours()]).toEqual([12, 9]);
  });
});

describe('fresh start and brain dump', () => {
  test('moving a deadline keeps its time if still ahead', () => {
    const t = todo({ due_at: iso(2026, 11, 9, 17) });
    const moved = moveDue(t, NOW, NOW);
    expect(new Date(moved.due_at!).getHours()).toBe(17);
    expect(moved.due_all_day).toBe(false);
    const early = moveDue(todo({ due_at: iso(2026, 11, 9, 8) }), NOW, NOW);
    expect(early.due_all_day).toBe(true);
  });
  test('lines from a pasted list', () => {
    expect(dumpLines('- Buy milk\n• Call John tomorrow\n1. Read 2 chapters of Romans\n[ ] Pay rent\n\n2 chapters a day')).toEqual([
      'Buy milk', 'Call John tomorrow', 'Read 2 chapters of Romans', 'Pay rent', '2 chapters a day',
    ]);
  });
});

describe('picking a time without typing', () => {
  const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
  test('pick for me: about half an hour away, on the half hour, in the daytime', () => {
    expect(pickForMe(at(13, 10, 5))).toEqual(at(13, 11, 0));
    expect(pickForMe(at(13, 10, 40))).toEqual(at(13, 11, 30));
  });
  test('pick for me: never in the night', () => {
    expect(pickForMe(at(13, 3, 44))).toEqual(at(13, 9));
    expect(pickForMe(at(13, 23, 10))).toEqual(at(14, 9));
    expect(pickForMe(at(13, 21, 20))).toEqual(at(14, 9));
  });
  test('pick for me: makes a close deadline', () => {
    const t = pickForMe(at(13, 10, 5), at(13, 10, 40));
    expect(t.getTime()).toBeLessThanOrEqual(at(13, 10, 40).getTime());
    expect(t.getTime()).toBeGreaterThan(at(13, 10, 5).getTime());
  });
  test('pick for me: your best time of day when the app knows it', () => {
    expect(pickForMe(at(13, 10, 5), null, 'tonight')).toEqual(at(13, 19));
  });
  test('times: every hour 7–21, none already gone', () => {
    expect(timesFor(at(14, 0), at(13, 10)).map((d) => d.getHours())).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
    expect(timesFor(at(13, 0), at(13, 18, 55)).map((d) => d.getHours())).toEqual([20, 21]);
  });
  test('days: today while it has times, then tomorrow first', () => {
    expect(daysFrom(at(13, 10))[0].getDate()).toBe(13);
    expect(daysFrom(at(13, 21, 30))[0].getDate()).toBe(14);
    expect(daysFrom(at(13, 10))).toHaveLength(8);
  });
});
