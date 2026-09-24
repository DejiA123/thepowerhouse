// Finds the Bible passages someone means from a paraphrase, misquote or
// description ("the verse about God's plans to prosper me" → Jeremiah 29:11).
// Only references are returned — the app always loads the real verse text
// from the Bible API, so the model can never put words in Scripture's mouth.
import { corsHeaders, json } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const MODEL = Deno.env.get('BIBLE_SEARCH_MODEL') ?? 'gpt-4o-mini';

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

Respond with JSON only: {"results":[{"book":"John","chapter":3,"verse_start":16,"verse_end":16,"confidence":0.97,"reason":"Matches 'God so loved the world'"}]}`;

const cache = new Map<string, { at: number; body: unknown }>();
const TTL = 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { query } = await req.json().catch(() => ({ query: '' }));
    const q = typeof query === 'string' ? query.trim().slice(0, 240) : '';
    if (q.length < 2) return json({ results: [] });
    if (!OPENAI_API_KEY) return json({ results: [], configured: false });

    const key = q.toLowerCase().replace(/\s+/g, ' ');
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return json(hit.body);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
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
      const detail = await res.text().catch(() => '');
      console.error('OpenAI error', res.status, detail);
      // Status + OpenAI's error code only (e.g. 401 invalid_api_key, 429 insufficient_quota) — no secrets
      let code: string | undefined;
      try {
        code = JSON.parse(detail)?.error?.code ?? JSON.parse(detail)?.error?.type;
      } catch {
        code = undefined;
      }
      return json({ results: [], error: 'search-unavailable', upstream: res.status, code }, 200);
    }
    const data = await res.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
    } catch {
      parsed = {};
    }

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
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return json(body);
  } catch (error) {
    console.error('bible-smart-search error', error);
    return json({ results: [], error: 'search-failed' }, 200);
  }
});
