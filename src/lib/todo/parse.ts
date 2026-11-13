import type { Repeat } from './types';
import { addDays, durationLabel, endOfDay, whenLabel } from './brain';

/**
 * Quick add: type a task the way you'd say it and the dates, time, how long and how
 * important are picked out (all on the phone, so it works offline).
 *
 *   "Finish report by Fri 5pm ~2h !"   → due Fri 17:00, about 2 h, important
 *   "Call mum tomorrow"                → due tomorrow (all day)
 *   "Start sermon notes tonight"       → plan to start tonight (a reminder rings)
 *   "Pay rent every month on the 1st"  → repeats monthly
 *   "Read Romans 8 for 20 min"         → about 20 min ("Romans 8" stays: numbers alone aren't times)
 */
export interface QuickAdd {
  title: string;
  due_at: string | null;
  due_all_day: boolean;
  plan_at: string | null;
  estimate_min: number | null;
  important: boolean;
  repeat: Repeat | null;
  /** What was understood, to show under the box */
  chips: string[];
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_WORD = '(?:mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_WORD = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const ORD = '(?:st|nd|rd|th)?';

/** Day first (15/11) everywhere except where the phone writes month first (11/15) */
export function dayFirstHere(): boolean {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'numeric' }).formatToParts(new Date(2020, 10, 15));
    return parts.findIndex((p) => p.type === 'day') < parts.findIndex((p) => p.type === 'month');
  } catch {
    return true;
  }
}

interface Hit {
  start: number;
  end: number;
}

const weekdayIndex = (w: string) => DAYS.indexOf(w.slice(0, 3));
const monthIndex = (w: string) => MONTHS.indexOf(w.slice(0, 3));

/** The coming weekday (today counts: "by Friday" on a Friday is today) */
function upcoming(now: Date, dow: number): Date {
  return addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), (dow - now.getDay() + 7) % 7);
}

type DayFound = Hit & { date: Date; time?: { h: number; m: number } };
type TimeFound = Hit & { h: number; m: number };

function findDay(s: string, now: Date, dayFirst: boolean): DayFound | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rules: [RegExp, (m: RegExpExecArray) => { date: Date; time?: { h: number; m: number } } | null][] = [
    [/\b(?:the\s+)?day after tomorrow\b/, () => ({ date: addDays(today, 2) })],
    [/\b(?:tomorrow|tmrw?|tmr)\b(?:\s+(morning|afternoon|evening|night))?/, (m) => ({ date: addDays(today, 1), time: m[1] ? partOfDay(m[1]) : undefined })],
    [/\btonight\b/, () => ({ date: today, time: { h: 20, m: 0 } })],
    // "this morning" ("Morning prayer" is a title, not a time)
    [/\b(?:this|in the)\s+(morning|afternoon|evening)\b/, (m) => ({ date: today, time: partOfDay(m[1]) })],
    [/\bin (\d{1,3}|an?|half an?) (hours?|hrs?|minutes?|mins?)\b/, (m) => {
      const n = /^half/.test(m[1]) ? 0.5 : wordNumber(m[1]);
      const moment = new Date(now.getTime() + n * (/^h/.test(m[2]) ? 60 : 1) * 60_000);
      return { date: new Date(moment.getFullYear(), moment.getMonth(), moment.getDate()), time: { h: moment.getHours(), m: moment.getMinutes() } };
    }],
    [/\btoday\b/, () => ({ date: today })],
    [/\b(?:end of (?:the )?week|eow)\b/, () => ({ date: upcoming(now, 5) })],
    [/\b(?:end of (?:the )?month|eom)\b/, () => ({ date: new Date(now.getFullYear(), now.getMonth() + 1, 0) })],
    [/\b(?:this\s+)?weekend\b/, () => ({ date: upcoming(now, 6) })],
    [/\bnext week\b/, () => ({ date: addDays(today, ((8 - now.getDay()) % 7) || 7) })],
    [/\bnext month\b/, () => ({ date: new Date(now.getFullYear(), now.getMonth() + 1, 1) })],
    [/\bin (\d{1,3}|a|an|one|two|three) (day|days|week|weeks|month|months)\b/, (m) => {
      const n = wordNumber(m[1]);
      if (m[2].startsWith('day')) return { date: addDays(today, n) };
      if (m[2].startsWith('week')) return { date: addDays(today, n * 7) };
      return { date: new Date(today.getFullYear(), today.getMonth() + n, today.getDate()) };
    }],
    [new RegExp(`\\bnext (${DAY_WORD})\\b`), (m) => ({ date: addDays(upcoming(now, weekdayIndex(m[1])), 7) })],
    // Full day names anywhere; short ones ("sat", "sun") only after by/on/due…, so "Sat with John" stays a title
    // A bare day name counts only at the end or before a time ("Sunday school lesson" is a title)
    [/\b(?:(?:this|on|by|due|until|till|before)\s+)(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, (m) => ({ date: upcoming(now, weekdayIndex(m[1])) })],
    [/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b(?=\s*(?:$|at\b|\d|noon|midday|midnight|morning|afternoon|evening|night))/, (m) => ({ date: upcoming(now, weekdayIndex(m[1])) })],
    [/\b(?:by|on|due|this|until|till|before)\s+(mon|tues?|weds?|thu|thurs?|fri|sat|sun)\b/, (m) => ({ date: upcoming(now, weekdayIndex(m[1])) })],
    [new RegExp(`\\b(\\d{1,2})${ORD}(?: of)? (${MONTH_WORD})\\b`), (m) => withYear(now, monthIndex(m[2]), +m[1])],
    [new RegExp(`\\b(${MONTH_WORD}) (\\d{1,2})${ORD}\\b`), (m) => withYear(now, monthIndex(m[1]), +m[2])],
    // 15/11 only after by/on/due… (or with a year), so "Read 1/2 of the book" stays a title
    [/(?:\b(?:by|on|due|before|until|till)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?|\b(\d{1,2})\/(\d{1,2})\/(\d{2,4}))\b/, (mm) => {
      const m = mm[1] ? [mm[0], mm[1], mm[2], mm[3]] : [mm[0], mm[4], mm[5], mm[6]];
      const [a, b] = [+m[1], +m[2]];
      const [day, month] = dayFirst ? [a, b] : [b, a];
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      if (m[3]) {
        const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
        return { date: new Date(y, month - 1, day) };
      }
      return withYear(now, month - 1, day);
    }],
    // "on the 1st"
    [/\bon the (\d{1,2})(?:st|nd|rd|th)\b/, (m) => {
      const d = +m[1];
      if (d < 1 || d > 31) return null;
      const here = new Date(now.getFullYear(), now.getMonth(), d);
      return { date: here < today ? new Date(now.getFullYear(), now.getMonth() + 1, d) : here };
    }],
  ];
  let best: DayFound | null = null;
  for (const [re, make] of rules) {
    const m = re.exec(s);
    if (!m) continue;
    const got = make(m);
    if (!got) continue;
    const hit = { start: m.index, end: m.index + m[0].length, ...got };
    if (!best || hit.start < best.start) best = hit;
  }
  return best;
}

function findTime(s: string, now: Date): TimeFound | null {
  const rules: [RegExp, (m: RegExpExecArray) => { h: number; m: number } | null][] = [
    [/\b(?:at\s+)?(\d{1,2})(?::|\.)?(\d{2})?\s?(am|pm|a\.m\.|p\.m\.)/, (m) => {
      let h = +m[1];
      const min = m[2] ? +m[2] : 0;
      if (h < 1 || h > 12 || min > 59) return null;
      const pm = m[3].startsWith('p');
      if (h === 12) h = pm ? 12 : 0;
      else if (pm) h += 12;
      return { h, m: min };
    }],
    [/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/, (m) => ({ h: +m[1], m: +m[2] })],
    [/\bat (\d{1,2})\b(?!\s*(?:min|mins|minutes|h|hrs?|hours?|%|\/))/, (m) => {
      const h = +m[1];
      if (h < 1 || h > 12) return null;
      // "at 7": evening up to 7, morning from 8
      return { h: h <= 7 ? h + 12 : h, m: 0 };
    }],
    [/\b(?:at\s+)?(noon|midday)\b/, () => ({ h: 12, m: 0 })],
    [/\b(?:at\s+)?midnight\b/, () => ({ h: 23, m: 59 })],
  ];
  let best: TimeFound | null = null;
  for (const [re, make] of rules) {
    const m = re.exec(s);
    if (!m) continue;
    const got = make(m);
    if (!got) continue;
    const hit = { start: m.index, end: m.index + m[0].length, ...got };
    if (!best || hit.start < best.start) best = hit;
  }
  void now;
  return best;
}

function partOfDay(w: string): { h: number; m: number } {
  if (w === 'morning') return { h: 9, m: 0 };
  if (w === 'afternoon') return { h: 14, m: 0 };
  if (w === 'evening') return { h: 19, m: 0 };
  return { h: 21, m: 0 };
}

function wordNumber(w: string): number {
  const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3 };
  return words[w] ?? Math.max(0, Math.min(999, parseInt(w, 10) || 0));
}

/** A day and month without a year: this year, or next year if it's already well past */
function withYear(now: Date, month: number, day: number) {
  if (month < 0 || day < 1 || day > 31) return null;
  let d = new Date(now.getFullYear(), month, day);
  if (d.getTime() < addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -7).getTime()) d = new Date(now.getFullYear() + 1, month, day);
  return { date: d };
}

/** "~2h", "for 30 min", "takes an hour", "(45m)" */
function findEstimate(s: string): (Hit & { minutes: number }) | null {
  const unit = '(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\\b';
  const rules: RegExp[] = [
    new RegExp(`(?:~|≈|\\babout\\s+|\\btakes\\s+|\\bfor\\s+|\\()\\s*(\\d+(?:[.,]\\d+)?)\\s*${unit}\\)?`),
    /(?:\b(?:takes|for|about)\s+)(an?|half an?)\s+(hour)\b/,
  ];
  for (const re of rules) {
    const m = re.exec(s);
    if (!m) continue;
    let minutes: number;
    if (/^(an?|half an?)$/.test(m[1])) minutes = m[1].startsWith('half') ? 30 : 60;
    else {
      const n = parseFloat(m[1].replace(',', '.'));
      minutes = /^h/.test(m[2]) ? n * 60 : n;
    }
    if (!minutes || minutes > 60 * 24 * 14) continue;
    return { start: m.index, end: m.index + m[0].length, minutes: Math.round(minutes) };
  }
  return null;
}

function findRepeat(s: string): (Hit & { repeat: Repeat; dow?: number }) | null {
  const rules: [RegExp, (m: RegExpExecArray) => { repeat: Repeat; dow?: number }][] = [
    // "daily", "weekly"… count only at the end ("Pay rent monthly"), not in a title
    // ("Weekly team meeting notes", "the monthly report")
    [/\b(?:every ?day|every (?:morning|evening|night)|daily(?=\s*(?:$|at\b|from\b|\d)))/, () => ({ repeat: 'daily' })],
    [/\b(?:every weekday|every work ?day|weekdays(?=\s*(?:$|at\b|\d)))/, () => ({ repeat: 'weekdays' })],
    [new RegExp(`\\bevery (${DAY_WORD})\\b`), (m) => ({ repeat: 'weekly', dow: weekdayIndex(m[1]) })],
    [/\b(?:every week|weekly(?=\s*(?:$|at\b|on\b|\d)))/, () => ({ repeat: 'weekly' })],
    [/\b(?:every month|monthly(?=\s*(?:$|at\b|on\b|\d)))/, () => ({ repeat: 'monthly' })],
  ];
  for (const [re, make] of rules) {
    const m = re.exec(s);
    if (m) return { start: m.index, end: m.index + m[0].length, ...make(m) };
  }
  return null;
}

/** Words that lead into a date and go with it ("by Friday", "due tomorrow", "start at 7") */
const LEAD = /(?:\b(?:by|due|due on|due by|before|on|at|until|till|start(?:ing)?|start(?:ing)? on|start(?:ing)? at)\s+)$/;

export function parseQuickAdd(input: string, now: Date = new Date(), dayFirst = dayFirstHere()): QuickAdd {
  const raw = input.replace(/\s+/g, ' ').trim();
  const lower = raw.toLowerCase();
  const cut: Hit[] = [];
  const chips: string[] = [];

  // Important: a "!" on its own, or at the very end
  let important = false;
  for (const m of lower.matchAll(/(^|\s)(!+)(?=\s|$)/g)) {
    important = true;
    cut.push({ start: m.index! + m[1].length, end: m.index! + m[0].length });
  }
  if (!important && /[^!]!$/.test(lower)) {
    important = true;
    cut.push({ start: lower.length - 1, end: lower.length });
  }

  const est = findEstimate(lower);
  if (est) cut.push(est);

  const rep = findRepeat(lower);
  if (rep) cut.push(rep);

  // Dates and times in what's left (so "for 30 min" isn't read as a time)
  const blank = (s: string, hits: Hit[]) => hits.reduce((acc, h) => acc.slice(0, h.start) + ' '.repeat(h.end - h.start) + acc.slice(h.end), s);
  const rest = blank(lower, cut);
  let day = findDay(rest, now, dayFirst);
  const time = findTime(day ? blank(rest, [day]) : rest, now);

  // "every Monday": the first one is the coming Monday
  if (rep?.dow !== undefined && !day) day = { start: rep.start, end: rep.start, date: upcoming(now, rep.dow) };

  let when: Date | null = null;
  let allDay = false;
  if (day || time) {
    const base = day?.date ?? new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const t = time ?? (day?.time ? { h: day.time.h, m: day.time.m } : null);
    if (t) {
      when = new Date(base.getFullYear(), base.getMonth(), base.getDate(), t.h, t.m);
      // A time alone that's already gone today means tomorrow
      if (!day && when.getTime() <= now.getTime()) when = addDays(when, 1);
    } else {
      when = endOfDay(base);
      allDay = true;
    }
  }

  // Start or deadline? "start…" before the date means when to start
  const firstHit = [day, time].filter(Boolean).sort((a, b) => a!.start - b!.start)[0] as Hit | undefined;
  const before = firstHit ? rest.slice(0, firstHit.start) : '';
  const isStart = !!firstHit && /\bstart(?:ing)?\b/.test(before);

  // "Prepare for Sunday": the day is the deadline and stays in the words
  const keepDay = !!day && /\b(?:for|of)\s+$/.test(rest.slice(0, day.start));
  for (const h of [keepDay ? null : day, time]) {
    if (!h || h.end <= h.start) continue;
    // Take the leading word with it ("by", "due", "at"…)
    const lead = LEAD.exec(rest.slice(0, h.start));
    cut.push({ start: lead ? lead.index : h.start, end: h.end });
  }

  // The title: what's left, tidied
  const keep = [...raw].map((ch, i) => (cut.some((c) => i >= c.start && i < c.end) ? '' : ch)).join('');
  let title = keep
    .replace(/\s+/g, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/[\s,;:–-]+$/g, '')
    .replace(/\s+(?:by|due|on|at|before|until|till|for|every|start|starting)$/i, '')
    .trim();
  if (!title) title = raw.replace(/!+$/, '').trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);

  let due_at: string | null = null;
  let plan_at: string | null = null;
  if (when) {
    if (isStart) {
      plan_at = (allDay ? new Date(when.getFullYear(), when.getMonth(), when.getDate(), 9) : when).toISOString();
      chips.push(`Start ${whenLabel(new Date(plan_at), now)}`);
    } else {
      due_at = when.toISOString();
      chips.push(`Due ${whenLabel(when, now, !allDay)}`);
    }
  }
  if (est) chips.push(`About ${durationLabel(est.minutes)}`);
  if (rep) chips.push(rep.repeat === 'daily' ? 'Every day' : rep.repeat === 'weekdays' ? 'Every weekday' : rep.repeat === 'weekly' ? 'Every week' : 'Every month');
  if (important) chips.push('Important');

  return {
    title,
    due_at,
    due_all_day: !!due_at && allDay,
    plan_at,
    estimate_min: est?.minutes ?? null,
    important,
    repeat: rep?.repeat ?? null,
    chips,
  };
}
