// Compose a song (choir page): the song helper.
//
// write  — a full Christian / gospel song from a brief (theme, scripture, style, feel,
//          key): title, key, tempo, sections with chords over the words, and notes for
//          the choir parts and the band. Gemini (GEMINI_API_KEY; SONG_MODEL, default
//          gemini-3.1-pro-preview, then gemini-3.8-flash, and any
//          replacement Gemini names when it retires a model), then OpenAI (OPENAI_API_KEY).
//          Saved as the writer's draft (song_drafts). 25 a day per person.
// music  — the draft as a full produced song (vocals, choir, band) through ElevenLabs
//          music (ELEVENLABS_API_KEY), stored in the public 'song-drafts' bucket.
//          4 a day per person.
//
// Signed-in members only. A request signed like Auth's hooks (SEND_EMAIL_HOOK_SECRET)
// may run {"action":"check"} to see which services answer, for setting up.
import { corsHeaders, json } from '../_shared/cors.ts';
import { getRequestUser, supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const GEMINI = Deno.env.get('GEMINI_API_KEY') ?? '';
const OPENAI = Deno.env.get('OPENAI_API_KEY') ?? '';
const ELEVEN = Deno.env.get('ELEVENLABS_API_KEY') ?? '';
// Fast first (generous free allowance, answers in seconds); the stronger model as backup
const SONG_MODEL = Deno.env.get('SONG_MODEL') ?? 'gemini-3.8-flash';
const BACKUP_MODEL = Deno.env.get('SONG_BACKUP_MODEL') ?? 'gemini-3.1-pro-preview';
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
const ADMIN_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '';
const WRITES_PER_DAY = 25;
const SONGS_PER_DAY = 4;

// ── The brief and the song ─────────────────────────────────────────────
const STYLES: Record<string, string> = {
  gospel_choir: 'Gospel choir: soulful lead with a full choir answering, Hammond organ, piano, bass, drums, claps; builds to a vamp',
  worship: 'Contemporary worship: congregational, piano and pads, electric guitars, drums build from soft verses to a big chorus',
  afro_gospel: 'Afro gospel praise: joyful, danceable, talking drums and percussion, highlife guitar, bright horns, choir call-and-response',
  ballad: 'Gospel ballad: tender and slow, piano-led with strings, a soloist with choir harmonies swelling in the chorus',
  hymn: 'Modern hymn: strong singable melody, verses that tell the story, piano and strings, a full choir on the last verse',
  praise: 'Upbeat praise: fast, celebratory, bass-driven groove, drums, brass stabs, the choir shouting back lines',
};
const FEELS: Record<string, string> = { slow: '60–72 BPM', mid: '76–96 BPM', fast: '110–132 BPM' };

interface Brief {
  theme: string;
  scripture?: string;
  style?: string;
  feel?: string;
  key?: string;
  language?: string;
  notes?: string;
}

interface Song {
  title: string;
  key: string;
  bpm: number;
  time_signature: string;
  feel: string;
  scripture: string[];
  summary: string;
  sections: { name: string; lines: string[] }[];
  arrangement: { choir: string; band: string };
  music_style: string;
}

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');

function briefFrom(input: Record<string, unknown>): Brief | null {
  const theme = clean(input.theme, 600);
  if (theme.length < 3) return null;
  return {
    theme,
    scripture: clean(input.scripture, 200),
    style: STYLES[String(input.style)] ? String(input.style) : 'gospel_choir',
    feel: FEELS[String(input.feel)] ? String(input.feel) : 'mid',
    key: /^[A-G](b|#)?m?$/.test(String(input.key ?? '')) ? String(input.key) : '',
    language: clean(input.language, 60),
    notes: clean(input.notes, 600),
  };
}

const SYSTEM = `You are a seasoned gospel and worship songwriter and arranger who writes for a church choir and band. You write ONLY Christian worship, praise and gospel songs: Christ-centred, faithful to Scripture and historic Christian belief (the Trinity, salvation by grace through faith in Jesus, His death and resurrection, the work of the Holy Spirit). Never promise wealth or guaranteed outcomes, never put words in God's mouth beyond what Scripture says, never write anything secular, romantic, political or about other religions. If the brief asks for anything else, reply with {"refused": true, "reason": "<one short sentence>"}.

Write like a real songwriter, not a machine:
- Concrete pictures and verbs drawn from Scripture and everyday life, not abstractions. Avoid tired filler: "tapestry", "symphony", "embrace", "journey", "soar", "ignite", "unleash", "realm", "testament to", "in this moment", "heart and soul", "rise up" (unless the text demands it).
- Natural, singable English with steady meter: lines in a section have matching syllable counts and stresses. Rhyme where it falls naturally (near rhymes are fine); never force a rhyme or twist word order to get one.
- One clear idea per song. Verses tell it; the chorus is short, memorable and repeated exactly; the bridge turns or lifts it. Gospel styles end with a vamp of 1–3 short repeated lines the choir can build on.
- Original: never copy or closely echo lines from existing songs or hymns. Quote Scripture only briefly and naturally.
- Easy for a congregation and a choir: comfortable range, words that fit the mouth.

Chords: write each line in ChordPro style with chords in square brackets right before the syllable they land on, e.g. "[G]Holy is the [D/F#]Lamb who [Em]reigns". Use the song's key; diatonic chords with tasteful colour (sus, add9, slash chords, a borrowed IV minor or passing chord where it serves). Every line has at least one chord. Use # and b for sharps and flats.

Also give: arrangement.choir (SATB or SAT parts: who sings what, call-and-response, harmonies, where the choir enters, ad-libs) and arrangement.band (groove, drum pattern, bass, keys/organ, guitar, dynamics section by section), each under 700 characters; music_style: one sentence describing the genre, instruments, vocal delivery and mood for a music producer (never name a real artist or existing song).

Reply with JSON only, exactly: {"title": string, "key": string, "bpm": number, "time_signature": string, "feel": string, "scripture": string[], "summary": string (one sentence), "sections": [{"name": "Verse 1" | "Pre-Chorus" | "Chorus" | "Verse 2" | "Bridge" | "Vamp" | "Intro" | "Outro" | ..., "lines": string[]}], "arrangement": {"choir": string, "band": string}, "music_style": string}.`;

const userPrompt = (b: Brief) =>
  [
    `Write a complete song.`,
    `What it's about: ${b.theme}`,
    b.scripture ? `Scripture to draw from: ${b.scripture}` : 'Choose fitting Scripture yourself.',
    `Style: ${STYLES[b.style!]}`,
    `Tempo: ${FEELS[b.feel!]}`,
    b.key ? `Key: ${b.key}` : 'Pick a key that suits a church choir (e.g. C, D, Eb, F, G, Ab or Bb).',
    b.language ? `Language: mostly English, with ${b.language} where it fits naturally (give the line in that language as it is sung).` : 'Language: English.',
    b.notes ? `Writer's notes: ${b.notes}` : '',
    `Structure: Verse 1, (Pre-Chorus), Chorus, Verse 2, Chorus, Bridge, Chorus${b.style === 'gospel_choir' || b.style === 'afro_gospel' || b.style === 'praise' ? ', Vamp' : ''}. Repeat the chorus in full each time it appears.`,
  ]
    .filter(Boolean)
    .join('\n');

function validSong(x: unknown): Song | null {
  const s = x as Song;
  if (!s || typeof s !== 'object' || !Array.isArray(s.sections) || !s.sections.length) return null;
  const sections = s.sections
    .map((sec) => ({ name: clean(sec?.name, 40) || 'Section', lines: (Array.isArray(sec?.lines) ? sec.lines : []).map((l) => clean(l, 200)).filter(Boolean).slice(0, 16) }))
    .filter((sec) => sec.lines.length)
    .slice(0, 14);
  if (!sections.length) return null;
  return {
    title: clean(s.title, 80) || 'Untitled',
    key: clean(s.key, 8) || 'G',
    bpm: Math.min(180, Math.max(50, Math.round(Number(s.bpm) || 84))),
    time_signature: clean(s.time_signature, 6) || '4/4',
    feel: clean(s.feel, 60),
    scripture: (Array.isArray(s.scripture) ? s.scripture : []).map((r) => clean(r, 40)).filter(Boolean).slice(0, 6),
    summary: clean(s.summary, 240),
    sections,
    arrangement: { choir: clean(s.arrangement?.choir, 900), band: clean(s.arrangement?.band, 900) },
    music_style: clean(s.music_style, 300),
  };
}

async function gemini(model: string, b: Brief, timeoutMs: number, lowThinking = true): Promise<{ song?: Song; refused?: string; error?: string; status?: number }> {
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI },
      // Each attempt must leave time for another inside the function's limit
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt(b) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.9,
          maxOutputTokens: 8192,
          // Thinking at length makes an answer take minutes: a little is plenty for a song
          ...(lowThinking ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}),
        },
      }),
    });
  } catch (e) {
    return { error: `${model} gave no answer in ${Math.round((Date.now() - t0) / 1000)}s (${String(e).slice(0, 60)})`, status: 504 };
  }
  if (!res.ok) {
    const text = await res.text();
    // A model that doesn't take the thinking setting: ask again without it
    if (lowThinking && res.status === 400 && /thinking/i.test(text)) return gemini(model, b, Math.max(5_000, timeoutMs - (Date.now() - t0)), false);
    return { error: `${model} ${res.status} after ${Math.round((Date.now() - t0) / 1000)}s: ${text.slice(0, 200)}`, status: res.status };
  }
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('');
  const out = parsed(text, model);
  console.log(`[song-writer] ${model} answered in ${Math.round((Date.now() - t0) / 1000)}s`);
  return out;
}

async function openai(b: Brief): Promise<{ song?: Song; refused?: string; error?: string }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI}` },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_SONG_MODEL') ?? 'gpt-4.1',
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userPrompt(b) },
      ],
    }),
  });
  if (!res.ok) return { error: `openai ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const data = await res.json();
  return parsed(data?.choices?.[0]?.message?.content ?? '', 'openai');
}

function parsed(text: string, who: string): { song?: Song; refused?: string; error?: string } {
  try {
    const obj = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    if (obj?.refused) return { refused: clean(obj.reason, 200) || 'That brief isn\'t one the song helper can write.' };
    const song = validSong(obj);
    return song ? { song } : { error: `${who}: the song came back incomplete` };
  } catch {
    return { error: `${who}: the song came back unreadable` };
  }
}

async function writeSong(b: Brief) {
  const errors: string[] = [];
  const started = Date.now();
  if (GEMINI) {
    const queue = [SONG_MODEL, BACKUP_MODEL];
    const tried = new Set<string>();
    // The function has ~150 s in all: the first model gets most of it, any others what's left
    while (queue.length && tried.size < 5 && Date.now() - started < 125_000) {
      const model = queue.shift()!;
      if (tried.has(model)) continue;
      tried.add(model);
      const budget = () => Math.max(5_000, Math.min(110_000, 130_000 - (Date.now() - started)));
      let r = await gemini(model, b, budget());
      // Busy for a moment: one more try
      if ((r.status === 503 || r.status === 500) && Date.now() - started < 30_000) {
        await new Promise((res) => setTimeout(res, 2000));
        r = await gemini(model, b, budget());
      }
      if (r.song || r.refused) return r;
      errors.push(r.error!);
      // A retired model's error names its replacement ("… use models/<name> …"): try that next
      const next = r.error?.match(/use models\/([a-z0-9.\-]+)/i)?.[1];
      if (next && !tried.has(next)) queue.unshift(next);
    }
  }
  if (OPENAI && Date.now() - started < 120_000) {
    const r = await openai(b).catch((e) => ({ error: `openai: ${String(e).slice(0, 80)}` }) as { song?: Song; refused?: string; error?: string });
    if (r.song || r.refused) return r;
    errors.push(r.error!);
  }
  return { error: errors.join(' · ') || 'No song service is set up.' };
}

// ── The music ─────────────────────────────────────────────────────────
const plain = (line: string) => line.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

/** ElevenLabs' composition plan: global styles and one block per section with its words */
function compositionPlan(song: Song, brief: Brief) {
  const barMs = (60000 / song.bpm) * (Number(song.time_signature.split('/')[0]) || 4);
  let sections = song.sections.map((sec) => {
    const lines = sec.lines.map(plain).filter(Boolean);
    const name = sec.name;
    const isChorus = /chorus|vamp/i.test(name);
    // About two bars a line, plus a bar to breathe; a vamp repeats
    const bars = Math.max(4, lines.length * 2 + 1) * (/vamp/i.test(name) ? 2 : 1);
    return {
      section_name: name.slice(0, 40),
      positive_local_styles: isChorus ? ['full choir', 'big', 'lifted'] : /bridge/i.test(name) ? ['build', 'rising'] : /verse/i.test(name) ? ['lead vocal', 'gentle'] : [],
      negative_local_styles: [] as string[],
      duration_ms: Math.round(Math.min(60000, Math.max(5000, bars * barMs))),
      lines: lines.slice(0, 16),
    };
  });
  // Keep the whole song to about three minutes (it has to be made within the function's time)
  const total = sections.reduce((a, s) => a + s.duration_ms, 0);
  if (total > 180000) {
    const k = 180000 / total;
    sections = sections.map((s) => ({ ...s, duration_ms: Math.max(4000, Math.round(s.duration_ms * k)) }));
  }
  return {
    positive_global_styles: [
      'christian gospel', 'church choir', 'live band', 'uplifting', 'reverent',
      ...(song.music_style ? [song.music_style.slice(0, 200)] : []),
      ...(STYLES[brief.style ?? 'gospel_choir'] ? [STYLES[brief.style ?? 'gospel_choir'].split(':')[0]] : []),
      `${song.bpm} bpm`, `key of ${song.key}`,
    ],
    negative_global_styles: ['explicit', 'secular', 'distorted', 'lo-fi', 'spoken word'],
    sections,
  };
}

async function makeMusic(song: Song, brief: Brief): Promise<{ audio?: Uint8Array; error?: string }> {
  if (!ELEVEN) return { error: 'The music service isn\'t set up.' };
  const res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVEN },
    body: JSON.stringify({ composition_plan: compositionPlan(song, brief), model_id: 'music_v1' }),
  });
  if (!res.ok) return { error: `music ${res.status}: ${(await res.text()).slice(0, 400)}` };
  return { audio: new Uint8Array(await res.arrayBuffer()) };
}

/** Makes the music, stores it and marks the draft ready (or failed, with the reason) */
async function produce(id: string, churchId: string, song: Song, brief: Brief) {
  try {
    const m = await makeMusic(song, brief);
    if (!m.audio) throw new Error(m.error ?? 'no audio');
    const path = `${churchId}/${id}-${Date.now()}.mp3`;
    const up = await supabaseAdmin.storage.from('song-drafts').upload(path, m.audio, { contentType: 'audio/mpeg', upsert: true });
    if (up.error) throw new Error(up.error.message);
    const url = supabaseAdmin.storage.from('song-drafts').getPublicUrl(path).data.publicUrl;
    await supabaseAdmin.from('song_drafts').update({ audio_status: 'ready', audio_url: url }).eq('id', id);
  } catch (e) {
    console.error('[song-writer] music failed', String(e));
    await supabaseAdmin.from('song_drafts').update({ audio_status: 'failed', audio_error: String(e).slice(0, 500) }).eq('id', id);
  }
}

// ── Requests ──────────────────────────────────────────────────────────
async function signedByAdmin(req: Request, body: string): Promise<boolean> {
  const id = req.headers.get('webhook-id');
  const ts = req.headers.get('webhook-timestamp');
  const sigs = req.headers.get('webhook-signature');
  if (!id || !ts || !sigs || !ADMIN_SECRET || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const raw = ADMIN_SECRET.replace(/^v1,/, '').replace(/^whsec_/, '');
  const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  const expected = btoa(String.fromCharCode(...mac));
  return sigs.split(' ').some((s) => s.replace(/^v1,/, '') === expected);
}

const startOfDay = () => new Date(Date.now() - 24 * 3600_000).toISOString();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const raw = await req.text();
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw || '{}');
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const admin = await signedByAdmin(req, raw);

  if (input.action === 'check') {
    if (!admin) return json({ error: 'Not allowed' }, 403);
    const brief = briefFrom({ theme: 'Thanksgiving for God\'s faithfulness through a hard year', style: 'gospel_choir', feel: 'mid' })!;
    const out: Record<string, unknown> = { gemini: !!GEMINI, openai: !!OPENAI, elevenlabs: !!ELEVEN, model: SONG_MODEL };
    if (input.models && GEMINI) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': GEMINI } });
      const d = await r.json().catch(() => ({}));
      out.models = (d.models ?? [])
        .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: { name: string }) => m.name.replace('models/', ''));
    }
    if (input.write) {
      const t0 = Date.now();
      const r = await writeSong(brief);
      out.write_seconds = Math.round((Date.now() - t0) / 1000);
      out.write = r.song ? { ok: true, title: r.song.title, sections: r.song.sections.map((s) => s.name), first: r.song.sections[0]?.lines.slice(0, 2) } : r;
      if (r.song) out.song = r.song;
    }
    if (input.music) {
      // A short two-section test (about half a minute)
      const t0 = Date.now();
      const test: Song = { title: 'Test', key: 'G', bpm: 84, time_signature: '4/4', feel: '', scripture: [], summary: '', sections: [
        { name: 'Verse', lines: ['[G]You were faithful in the [C]morning', '[Em]You were faithful through the [D]night'] },
        { name: 'Chorus', lines: ['[G]Great is Your [D]faithfulness', '[C]Lord, I will [G]sing'] },
      ], arrangement: { choir: '', band: '' }, music_style: 'warm gospel choir with piano and organ' };
      const m = await makeMusic(test, brief);
      out.music = m.audio ? { ok: true, bytes: m.audio.length, seconds: Math.round((Date.now() - t0) / 1000) } : m;
    }
    return json(out);
  }

  const user = await getRequestUser(req);
  if (!user) return json({ error: 'Sign in to compose songs.' }, 401);

  if (input.action === 'write') {
    const brief = briefFrom(input);
    if (!brief) return json({ error: 'Say what the song is about.' }, 400);
    const { count } = await supabaseAdmin
      .from('song_drafts').select('id', { count: 'exact', head: true })
      .eq('created_by', user.id).gte('created_at', startOfDay());
    if ((count ?? 0) >= WRITES_PER_DAY) return json({ error: `You've written ${WRITES_PER_DAY} songs today. Try again tomorrow.` }, 429);
    const r = await writeSong(brief);
    if (r.refused) return json({ refused: r.refused }, 200);
    if (!r.song) {
      console.error('[song-writer] write failed', r.error);
      return json({ error: 'The song helper is busy. Please try again in a minute.' }, 503);
    }
    const location = clean(input.location, 40) || null;
    // The church the app is open for, if this person is a member of it (else the default)
    let churchId = clean(input.churchId, 40);
    if (churchId) {
      const { data: member } = await supabaseAdmin.from('church_members').select('church_id').eq('church_id', churchId).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (!member) churchId = '';
    }
    const { data, error } = await supabaseAdmin
      .from('song_drafts')
      .insert({ created_by: user.id, location, title: r.song.title, brief, song: r.song, ...(churchId ? { church_id: churchId } : {}) })
      .select('*').single();
    if (error) return json({ error: 'Couldn\'t save the song. Please try again.' }, 500);
    return json({ draft: data });
  }

  if (input.action === 'music') {
    const id = clean(input.draftId, 40);
    const { data: draft } = await supabaseAdmin.from('song_drafts').select('*').eq('id', id).maybeSingle();
    if (!draft || draft.created_by !== user.id) return json({ error: 'Only the song\'s writer can make its music.' }, 403);
    if (draft.audio_status === 'making' && draft.music_requested_at && Date.now() - Date.parse(draft.music_requested_at) < 5 * 60_000) {
      return json({ error: 'The music is already being made.' }, 409);
    }
    const { count } = await supabaseAdmin
      .from('song_drafts').select('id', { count: 'exact', head: true })
      .eq('created_by', user.id).gte('music_requested_at', startOfDay());
    if ((count ?? 0) >= SONGS_PER_DAY) return json({ error: `You've made ${SONGS_PER_DAY} songs' music today. Try again tomorrow.` }, 429);
    const { data: making } = await supabaseAdmin
      .from('song_drafts')
      .update({ audio_status: 'making', audio_error: null, music_requested_at: new Date().toISOString() })
      .eq('id', id).select('*').single();
    // Made in the background: the phone gets an answer at once and watches the draft
    const work = produce(id, draft.church_id as string, draft.song as Song, draft.brief as Brief);
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);
    else await work;
    return json({ draft: making });
  }

  return json({ error: 'Unknown action' }, 400);
});
