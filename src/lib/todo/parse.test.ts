import { describe, expect, test } from 'bun:test';
import { parseQuickAdd } from './parse';

// Wednesday 11 November 2026, 10:00 on the phone
const NOW = new Date(2026, 10, 11, 10, 0);
const p = (s: string) => parseQuickAdd(s, NOW, true);
const local = (iso: string | null) => (iso ? new Date(iso) : null);
const ymdhm = (d: Date | null) => d && [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];

describe('quick add', () => {
  test('a plain task stays as it is', () => {
    const r = p('Buy milk');
    expect(r).toMatchObject({ title: 'Buy milk', due_at: null, plan_at: null, estimate_min: null, important: false, repeat: null });
  });

  test('deadline with a day and time, an estimate and important', () => {
    const r = p('Finish report by Fri 5pm ~2h !');
    expect(r.title).toBe('Finish report');
    expect(ymdhm(local(r.due_at))).toEqual([2026, 11, 13, 17, 0]);
    expect(r.due_all_day).toBe(false);
    expect(r.estimate_min).toBe(120);
    expect(r.important).toBe(true);
  });

  test('a day with no time is an all-day deadline', () => {
    const r = p('Call mum tomorrow');
    expect(r.title).toBe('Call mum');
    expect(ymdhm(local(r.due_at))).toEqual([2026, 11, 12, 23, 59]);
    expect(r.due_all_day).toBe(true);
  });

  test('"start" means when to start, not the deadline', () => {
    const r = p('Start sermon notes tonight');
    expect(r.plan_at).not.toBeNull();
    expect(r.due_at).toBeNull();
    expect(ymdhm(local(r.plan_at))).toEqual([2026, 11, 11, 20, 0]);
  });

  test('a time alone that has passed today means tomorrow', () => {
    const r = p('Pray at 7am');
    expect(ymdhm(local(r.due_at))).toEqual([2026, 11, 12, 7, 0]);
    expect(r.title).toBe('Pray');
  });

  test('"at 7" is the evening, "at 9" the morning', () => {
    expect(local(p('Choir practice at 7').due_at)!.getHours()).toBe(19);
    expect(local(p('Dentist tomorrow at 9').due_at)!.getHours()).toBe(9);
  });

  test('24-hour times', () => {
    expect(ymdhm(local(p('Meeting tomorrow 14:30').due_at))).toEqual([2026, 11, 12, 14, 30]);
  });

  test('numbers in a title are not times or dates', () => {
    const r = p('Read Romans 8 for 20 min');
    expect(r.title).toBe('Read Romans 8');
    expect(r.estimate_min).toBe(20);
    expect(r.due_at).toBeNull();
    expect(p('Read 1/2 of the book').due_at).toBeNull();
    expect(p('Read 1/2 of the book').title).toBe('Read 1/2 of the book');
  });

  test('day words inside titles are left alone', () => {
    expect(p('Morning prayer').due_at).toBeNull();
    expect(p('Sat with John about the youth camp').due_at).toBeNull();
    expect(p('Sunday school lesson').due_at).toBeNull();
  });

  test('a day name at the end, or for the day, is the deadline', () => {
    expect(p('Call John friday').title).toBe('Call John');
    expect(local(p('Call John friday').due_at)!.getDate()).toBe(13);
    const prep = p('Prepare for Sunday');
    expect(prep.title).toBe('Prepare for Sunday');
    expect(local(prep.due_at)!.getDate()).toBe(15);
  });

  test('short day names after by/on', () => {
    expect(ymdhm(local(p('Hand in form by sat').due_at))).toEqual([2026, 11, 14, 23, 59]);
  });

  test('"next" weekday is the one after the coming one', () => {
    expect(local(p('Plan retreat next friday').due_at)!.getDate()).toBe(20);
  });

  test('dates written out, both ways round', () => {
    expect(ymdhm(local(p('Visa form 15 Dec').due_at))).toEqual([2026, 12, 15, 23, 59]);
    expect(ymdhm(local(p('Visa form Dec 15th').due_at))).toEqual([2026, 12, 15, 23, 59]);
    expect(ymdhm(local(p('Rent due on 1/12').due_at))).toEqual([2026, 12, 1, 23, 59]);
    // A date long gone this year means next year
    expect(local(p('Book holiday 3 Feb').due_at)!.getFullYear()).toBe(2027);
  });

  test('month first where the phone writes it that way', () => {
    const r = parseQuickAdd('Rent due on 12/1', NOW, false);
    expect(ymdhm(local(r.due_at))).toEqual([2026, 12, 1, 23, 59]);
  });

  test('relative days and hours', () => {
    expect(local(p('Follow up in 3 days').due_at)!.getDate()).toBe(14);
    expect(ymdhm(local(p('Check oven in 2 hours').due_at))).toEqual([2026, 11, 11, 12, 0]);
    expect(local(p('Tidy garage this weekend').due_at)!.getDate()).toBe(14);
    expect(local(p('Plan budget next week').due_at)!.getDate()).toBe(16);
    expect(local(p('Close books end of month').due_at)!.getDate()).toBe(30);
  });

  test('repeats', () => {
    expect(p('Bible reading every day').repeat).toBe('daily');
    expect(p('Bible reading every day').title).toBe('Bible reading');
    const weekly = p('Choir rehearsal every Thursday 7pm');
    expect(weekly.repeat).toBe('weekly');
    expect(ymdhm(local(weekly.due_at))).toEqual([2026, 11, 12, 19, 0]);
    expect(weekly.title).toBe('Choir rehearsal');
    expect(p('Pay rent every month on the 1st').repeat).toBe('monthly');
    expect(local(p('Pay rent every month on the 1st').due_at)!.getDate()).toBe(1);
  });

  test('repeat words inside a title stay in the title', () => {
    const r = p('Finish the monthly report by Mon 5pm ~2h !');
    expect(r.title).toBe('Finish the monthly report');
    expect(r.repeat).toBeNull();
    expect(p('Weekly team meeting notes').repeat).toBeNull();
    expect(p('Daily devotional').title).toBe('Daily devotional');
    expect(p('Pay rent monthly').repeat).toBe('monthly');
    expect(p('Water plants daily at 8am').repeat).toBe('daily');
  });

  test('estimates in different words', () => {
    expect(p('Clean kitchen (45m)').estimate_min).toBe(45);
    expect(p('Clean kitchen (45m)').title).toBe('Clean kitchen');
    expect(p('Write essay takes 1.5 hours').estimate_min).toBe(90);
    expect(p('Revise notes for half an hour').estimate_min).toBe(30);
  });

  test('a "!" at the end makes it important', () => {
    const r = p('Pay the electricity bill!');
    expect(r.important).toBe(true);
    expect(r.title).toBe('Pay the electricity bill');
  });

  test('says what it understood', () => {
    expect(p('Finish report by Fri 5pm ~2h !').chips).toEqual(['Due Fri 5pm', 'About 2 h', 'Important']);
  });

  test('a date on its own keeps a title', () => {
    expect(p('tomorrow').title).toBe('Tomorrow');
  });
});
