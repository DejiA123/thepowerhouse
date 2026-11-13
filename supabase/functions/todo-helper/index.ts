// To do's helper: turns one task into tiny, concrete steps (the first one two minutes
// or less), with honest times, so starting is easy. Signed-in members only, on
// demand ("Break it into tiny steps"). Gemini on GEMINI_API_KEY, the light models
// first (each model has its own free allowance, so this doesn't eat the song writer's);
// the app has its own steps to fall back on if this can't answer.
import { corsHeaders, json } from '../_shared/cors.ts';
import { getRequestUser } from '../_shared/supabaseAdmin.ts';

const GEMINI = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODELS = [...new Set([Deno.env.get('TODO_MODEL') ?? 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'])];

const SYSTEM = `You help a person beat procrastination by turning ONE task into tiny steps they can start right now.
Rules:
- 3 to 8 steps, in the order they should be done.
- Each step is one concrete physical action that starts with a verb ("Open…", "Write…", "Call…"), at most 90 characters, no numbering.
- The FIRST step takes 2 minutes or less and is almost too easy (e.g. "Open a blank document and type the title").
- No step longer than 25 minutes: split bigger ones.
- "minutes" is an honest whole number for each step.
- Write in the same language as the task.
- "tip": one short, warm, practical sentence (at most 120 characters) for getting started. You may encourage gently in a Christian way, never preach.
- If the task is harmful or illegal, answer {"refused": true}.
Answer ONLY with JSON: {"steps":[{"text":"…","minutes":2}],"tip":"…"}`;

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

interface Step {
  text: string;
  minutes: number;
}

function valid(obj: unknown): { steps: Step[]; tip: string } | { refused: true } | null {
  const o = obj as { steps?: unknown; tip?: unknown; refused?: unknown } | null;
  if (!o) return null;
  if (o.refused) return { refused: true };
  if (!Array.isArray(o.steps)) return null;
  const steps = o.steps
    .map((s) => {
      const x = s as { text?: unknown; minutes?: unknown };
      const text = clean(x?.text, 120).replace(/^\d+[.)]\s*/, '');
      const minutes = Math.round(Number(x?.minutes));
      return { text, minutes: Number.isFinite(minutes) ? Math.min(240, Math.max(1, minutes)) : 10 };
    })
    .filter((s) => s.text.length >= 3)
    .slice(0, 8);
  if (steps.length < 2) return null;
  // The first step must be easy to start
  steps[0].minutes = Math.min(steps[0].minutes, 2);
  return { steps, tip: clean(o.tip, 140) };
}

async function ask(model: string, prompt: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? '')
    .join('');
  return valid(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getRequestUser(req);
    if (!user) return json({ error: 'Sign in to use the helper' }, 401);
    const body = await req.json().catch(() => ({}));
    const title = clean(body?.title, 300);
    if (!title) return json({ error: 'Nothing to break down' }, 400);
    if (!GEMINI) return json({ error: 'The helper isn’t set up' }, 503);
    const notes = clean(body?.notes, 1000);
    const why = clean(body?.why, 300);
    const estimate = Number(body?.estimate) || 0;
    const due = clean(body?.due, 80);
    const done = Array.isArray(body?.done) ? body.done.map((d: unknown) => clean(d, 120)).filter(Boolean).slice(0, 20) : [];
    const prompt = [
      `Task: ${title}`,
      notes && `Details: ${notes}`,
      why && `Why it matters to them: ${why}`,
      estimate && `They think it takes about ${estimate} minutes.`,
      due && `Deadline: ${due}.`,
      done.length && `Already done (don't repeat): ${done.join('; ')}`,
    ].filter(Boolean).join('\n');

    let lastError = '';
    for (const model of MODELS) {
      try {
        const out = await ask(model, prompt);
        if (out) return json({ ok: true, model, ...out });
        lastError = `${model}: unusable answer`;
      } catch (e) {
        lastError = String(e).slice(0, 200);
        console.warn('[todo-helper]', lastError);
      }
    }
    return json({ error: 'The helper is busy', detail: lastError }, 503);
  } catch (e) {
    console.error('[todo-helper]', String(e));
    return json({ error: 'Something went wrong' }, 500);
  }
});
