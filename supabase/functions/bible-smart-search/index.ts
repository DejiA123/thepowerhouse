// Finds the Bible passages someone means from a paraphrase, misquote or
// description ("the verse about God's plans to prosper me" → Jeremiah 29:11).
// Only references are returned — the app always loads the real verse text
// from the Bible API, so the model can never put words in Scripture's mouth.
//
// Providers (first one configured wins, the next is tried if it fails):
//   1. Google Gemini   GEMINI_API_KEY            — free tier, no card needed
//   2. Cloudflare AI   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_API_TOKEN — free daily allowance
//   3. OpenAI          OPENAI_API_KEY            — paid
import { corsHeaders, json } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash-lite';
const CF_ACCOUNT = Deno.env.get('CLOUDFLARE_ACCOUNT_ID') ?? '';
const CF_AI_TOKEN = Deno.env.get('CLOUDFLARE_AI_API_TOKEN') ?? '';
const CF_MODEL = Deno.env.get('CLOUDFLARE_AI_MODEL') ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const OPENAI_MODEL = Deno.env.get('BIBLE_SEARCH_MODEL') ?? 'gpt-4o-mini';

const SYSTEM = `You are a precise Bible verse finder for a church app.
The user types what they remember of a Bible verse or passage: an exact quote, a paraphrase, a misquote with wrong words, a few keywords, a topic, a feeling, or a description of a story.
Return the passages they most likely mean, ranked by likelihood.

Rules:
- Use the 66-book Protestant canon with standard English (KJV) chapter and verse numbering.
- Use full book names exactly like: Genesis, Exodus, 1 Samuel, Psalms, Song of Solomon, Isaiah, Matthew, John, Acts, Romans, 1 Corinthians, Philippians, Hebrews, 1 John, Revelation.
- If the query is clearly one famous verse, put it first with high confidence.
- For a story or topic, return the key verse(s) that best capture it (use verse_end for short ranges, max 6 verses).
- Return between 1 and 8 results. Never invent references; if unsure, give lower confidence.
- "reason" is at most 12 words explaining the match.

Respond with JSON only, no markdown: {"results":[{"book":"John","chapter":3,"verse_start":16,"verse_end":16,"confidence":0.97,"reason":"Matches 'God so loved the world'"}]}`;

class ProviderError extends Error {
  constructor(public provider: string, public status: number, public code?: string, public detail?: string) {
    super(`${provider} ${status} ${code ?? ''}`);
  }
}

const parseJsonText = (text: string) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
};

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Google retires model names over time; if the configured one disappears we
// pick the newest "flash-lite" (then "flash") model this key can use.
let geminiModel = GEMINI_MODEL;
let geminiThinkingOff = true;

async function geminiError(res: Response) {
  try {
    const err = (await res.json())?.error;
    return new ProviderError('gemini', res.status, err?.status, String(err?.message ?? '').slice(0, 160));
  } catch {
    return new ProviderError('gemini', res.status);
  }
}

async function pickGeminiModel(): Promise<string | null> {
  const res = await fetch(`${GEMINI_BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': GEMINI_API_KEY } });
  if (!res.ok) throw await geminiError(res);
  const models: { name: string; supportedGenerationMethods?: string[] }[] = (await res.json())?.models ?? [];
  const usable = models
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /^gemini-/.test(n) && !/(tts|image|audio|live|embedding|vision|thinking|computer)/.test(n));
  const version = (n: string) => Number(n.match(/^gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  const rank = (n: string) => (/-(preview|exp)/.test(n) ? 1 : 0) + (/-\d{3,}$/.test(n) ? 0.5 : 0);
  const best = (re: RegExp) =>
    usable.filter((n) => re.test(n)).sort((a, b) => rank(a) - rank(b) || version(b) - version(a))[0];
  return best(/flash-lite/) ?? best(/flash/) ?? usable[0] ?? null;
}

async function callGemini(q: string) {
  return fetch(`${GEMINI_BASE}/models/${geminiModel}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: q }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 900,
        responseMimeType: 'application/json',
        // Fast answers; this task doesn't need extended reasoning
        ...(geminiThinkingOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });
}

async function askGemini(q: string) {
  let res = await callGemini(q);
  if (res.status === 404) {
    const next = await pickGeminiModel();
    if (next && next !== geminiModel) {
      console.log('gemini model', geminiModel, 'unavailable, using', next);
      geminiModel = next;
      res = await callGemini(q);
    }
  }
  if (res.status === 400 && geminiThinkingOff) {
    // Some models don't accept a thinking budget; retry with their defaults
    geminiThinkingOff = false;
    res = await callGemini(q);
  }
  if (!res.ok) throw await geminiError(res);
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('');
  return parseJsonText(text);
}

async function askCloudflare(q: string) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${CF_MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_AI_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: q },
      ],
      temperature: 0,
      max_tokens: 900,
    }),
  });
  if (!res.ok) throw new ProviderError('cloudflare', res.status);
  const data = await res.json();
  const out = data.result?.response;
  return typeof out === 'string' ? parseJsonText(out) : out;
}

async function askOpenAI(q: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: q },
      ],
    }),
  });
  if (!res.ok) {
    let code: string | undefined;
    try {
      const err = (await res.json())?.error;
      code = err?.code ?? err?.type;
    } catch {
      code = undefined;
    }
    throw new ProviderError('openai', res.status, code);
  }
  const data = await res.json();
  return parseJsonText(data.choices?.[0]?.message?.content ?? '{}');
}

const providers = [
  { name: 'gemini', enabled: !!GEMINI_API_KEY, ask: askGemini },
  { name: 'cloudflare', enabled: !!(CF_ACCOUNT && CF_AI_TOKEN), ask: askCloudflare },
  { name: 'openai', enabled: !!OPENAI_API_KEY, ask: askOpenAI },
].filter((p) => p.enabled);

const cache = new Map<string, { at: number; body: unknown }>();
const TTL = 6 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { query } = await req.json().catch(() => ({ query: '' }));
    const q = typeof query === 'string' ? query.trim().slice(0, 240) : '';
    if (q.length < 2) return json({ results: [] });
    if (providers.length === 0) return json({ results: [], configured: false });

    const key = q.toLowerCase().replace(/\s+/g, ' ');
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return json(hit.body);

    let parsed: any = null;
    const failures: { provider: string; status: number; code?: string; detail?: string }[] = [];
    for (const provider of providers) {
      try {
        parsed = await provider.ask(q);
        if (parsed) break;
      } catch (error) {
        const e = error as ProviderError;
        console.error('provider failed', e.provider ?? provider.name, e.status, e.code ?? (error as Error).message, e.detail ?? '');
        failures.push({ provider: e.provider ?? provider.name, status: e.status ?? 0, code: e.code, detail: e.detail });
      }
    }
    if (!parsed) return json({ results: [], error: 'search-unavailable', failures });

    const results = (Array.isArray(parsed.results) ? parsed.results : [])
      .map((r: any) => ({
        book: String(r.book ?? '').slice(0, 40),
        chapter: Math.max(1, Math.floor(Number(r.chapter) || 0)),
        verse_start: Math.max(1, Math.floor(Number(r.verse_start) || 1)),
        verse_end: Math.max(1, Math.floor(Number(r.verse_end ?? r.verse_start) || 1)),
        confidence: Math.min(1, Math.max(0, Number(r.confidence) || 0)),
        reason: String(r.reason ?? '').slice(0, 120),
      }))
      .filter((r: any) => r.book && r.chapter)
      .slice(0, 8);

    const body = { results };
    cache.set(key, { at: Date.now(), body });
    if (cache.size > 1000) cache.delete(cache.keys().next().value!);
    return json(body);
  } catch (error) {
    console.error('bible-smart-search error', error);
    return json({ results: [], error: 'search-failed' }, 200);
  }
});
