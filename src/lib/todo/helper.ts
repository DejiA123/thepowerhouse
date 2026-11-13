import { supabase } from '@/integrations/supabase/client';
import { newNoteId } from '@/lib/offlineNotes';
import { dueLabel, remainingMinutes } from './brain';
import type { Todo, TodoStep } from './types';

/**
 * "Break it into tiny steps": the todo-helper function (Gemini) writes concrete steps,
 * the first one two minutes or less. With no connection, or if the helper is busy, the
 * phone's own steps for that kind of task are used instead, so the button always helps.
 */
export interface Breakdown {
  steps: TodoStep[];
  tip: string;
  /** Written by the helper (true) or the phone's own steps (false) */
  smart: boolean;
}

const step = (text: string, minutes: number): TodoStep => ({ id: newNoteId(), text, done: false, minutes });

/** The phone's own steps, by the kind of task */
export function localBreakdown(title: string): Breakdown {
  const t = title.toLowerCase();
  const kinds: [RegExp, [string, number][], string][] = [
    [/\b(write|essay|report|sermon|article|letter|blog|speech|assignment|thesis|draft|notes?)\b/, [
      ['Open a blank page and type the title', 2],
      ['Jot down every idea as bullet points, no editing', 10],
      ['Put the points in order', 10],
      ['Write a rough first draft (messy is fine)', 25],
      ['Read it through once and fix the obvious', 15],
      ['Send it or hand it in', 5],
    ], 'A messy first draft beats a perfect blank page.'],
    [/\b(clean|tidy|declutter|wash|laundry|dishes|hoover|vacuum|organi[sz]e (?:the )?(?:room|house|garage|kitchen))\b/, [
      ['Put on some worship music and set a 10-minute timer', 1],
      ['Clear just one surface', 10],
      ['Put away everything that has a home', 10],
      ['Bin or bag what you don’t need', 10],
      ['Wipe down and finish', 10],
    ], 'Ten minutes of tidying changes how a whole room feels.'],
    [/\b(call|phone|ring|text|email|reply|message)\b/, [
      ['Find their number or the email', 1],
      ['Write the two or three things you need to say', 3],
      ['Make the call or send it', 10],
      ['Note what was agreed and the next step', 2],
    ], 'The dread is always bigger than the call.'],
    [/\b(study|revise|revision|read|learn|exam|test|homework|course|lesson|chapter)\b/, [
      ['Get your book or notes out and open them at the page', 2],
      ['Read one section only', 15],
      ['Write down three things you learned', 5],
      ['Test yourself on them without looking', 10],
      ['Mark where to start next time', 1],
    ], 'One section at a time. Small portions, faithfully.'],
    [/\b(pay|bill|bills|form|forms|apply|application|tax|insurance|renew|register|book|booking|appointment)\b/, [
      ['Find the bill or form and open the website', 2],
      ['Fill in everything you already know', 10],
      ['Look up what’s missing', 10],
      ['Check it once and submit', 5],
      ['Save the confirmation', 1],
    ], 'Most forms take less time than worrying about them.'],
    [/\b(plan|prepare|organi[sz]e|event|party|trip|meeting|service|programme|program|rehearsal)\b/, [
      ['Write what a great result looks like in one line', 2],
      ['List everything that needs doing', 10],
      ['Put dates beside the list and pick who does what', 10],
      ['Do the first item on the list', 20],
      ['Send a short update to the people involved', 5],
    ], 'A plan on paper is already half the work.'],
    [/\b(exercise|gym|run|walk|workout|train)\b/, [
      ['Put your shoes on', 1],
      ['Warm up for five minutes', 5],
      ['Do the main part', 25],
      ['Stretch and drink some water', 5],
    ], 'Shoes on is the hardest part.'],
  ];
  const found = kinds.find(([re]) => re.test(t));
  const list: [string, number][] = found?.[1] ?? [
    ['Open or gather what you need for it', 2],
    ['Do the first small part (badly is fine)', 10],
    ['Keep going for one focused block', 25],
    ['Check what’s left and write the next step', 3],
  ];
  return {
    steps: list.map(([text, minutes]) => step(text, minutes)),
    tip: found?.[2] ?? 'Start small: two minutes is enough to get going.',
    smart: false,
  };
}

/** Ask the helper, or fall back to the phone's own steps */
export async function breakDown(t: Pick<Todo, 'title' | 'notes' | 'why' | 'estimate_min' | 'due_at' | 'due_all_day' | 'steps'> & Partial<Todo>): Promise<Breakdown> {
  const done = t.steps.filter((s) => s.done).map((s) => s.text);
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline');
    const due = t.due_at ? dueLabel({ ...(t as Todo), status: 'open' }, new Date()) : null;
    const { data, error } = await Promise.race([
      supabase.functions.invoke('todo-helper', {
        body: {
          title: t.title,
          notes: t.notes ?? '',
          why: t.why ?? '',
          estimate: t.estimate_min ?? (t.steps.length ? remainingMinutes(t as Todo) : 0),
          due,
          done,
        },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('slow')), 25_000)),
    ]);
    if (error || !data?.ok || !Array.isArray(data.steps)) throw new Error(error?.message || data?.error || 'no steps');
    return {
      steps: (data.steps as { text: string; minutes: number }[]).map((s) => step(s.text, s.minutes)),
      tip: typeof data.tip === 'string' ? data.tip : '',
      smart: true,
    };
  } catch {
    return localBreakdown(t.title);
  }
}
