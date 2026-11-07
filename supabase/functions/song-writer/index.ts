// Compose a song (choir page): the song helper.
//
// write  — a full Christian / gospel song from a brief (theme, scripture, style, feel,
//          key): title, key, tempo, sections with chords over the words, and notes for
//          the choir parts and the band. Gemini (GEMINI_API_KEY; SONG_MODEL, default
//          gemini-3.5-flash, then 3.8-flash, 3.1-flash-lite, 3.1-pro, and any replacement
//          Gemini names when it retires a model), then OpenAI (OPENAI_API_KEY).
//          A second pass revises it like an editor (meter, fresh words, the chorus).
//          Saved as the writer's draft (song_drafts). No daily limits.
// music  — the draft as a full produced song (vocals, choir, band) through ElevenLabs
//          music (ELEVENLABS_API_KEY), stored in the public 'song-drafts' bucket.
//          No daily limits.
//
// Signed-in members only. A request signed like Auth's hooks (SEND_EMAIL_HOOK_SECRET)
// may run {"action":"check"} to see which services answer, for setting up.
import { corsHeaders, json } from '../_shared/cors.ts';
import { getRequestUser, supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const GEMINI = Deno.env.get('GEMINI_API_KEY') ?? '';
const OPENAI = Deno.env.get('OPENAI_API_KEY') ?? '';
const ELEVEN = Deno.env.get('ELEVENLABS_API_KEY') ?? '';
// Timed on this key (Nov 2026): gemini-3.5-flash wrote a full song in ~10 s; 3.8-flash is
// often overloaded on the free tier; flash-lite ~9 s; pro is beyond the free allowance
const SONG_MODEL = Deno.env.get('SONG_MODEL') ?? 'gemini-3.5-flash';
const MODELS = [...new Set([SONG_MODEL, 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'])];
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
const ADMIN_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '';
// No daily limits (the church's choice): only the services' own allowances apply

// ── The brief and the song ─────────────────────────────────────────────
/** Each style: how it's written and how it should sound (also the music producer's brief) */
const STYLES: Record<string, { sound: string; vamp: boolean }> = {
  gospel_choir: { sound: 'Black gospel choir: soulful lead, full SATB choir answering, Hammond organ with Leslie, gospel piano, bass, drums, claps; builds to a shouting vamp', vamp: true },
  contemporary_gospel: { sound: 'Contemporary urban gospel: modern R&B-flavoured grooves, lush choir stacks, synth bass, crisp programmed and live drums, keys, polished vocal runs', vamp: true },
  traditional_gospel: { sound: 'Traditional church gospel: shuffle or 6/8 feel, organ and piano, walking bass, tambourine and claps, call-and-response with the congregation', vamp: true },
  worship: { sound: 'Contemporary worship: congregational, piano and ambient pads, electric guitars with delay, drums building from intimate verses to an anthemic chorus', vamp: false },
  acoustic_worship: { sound: 'Acoustic worship: intimate, acoustic guitar and piano, light percussion, warm close harmonies, unhurried and prayerful', vamp: false },
  anthem: { sound: 'Choir anthem: majestic and building, orchestral strings and brass, timpani, full choir in rich harmony, a key change for the last chorus', vamp: false },
  ballad: { sound: 'Gospel ballad: tender and slow, piano-led with strings, a soloist with choir harmonies swelling in the chorus', vamp: false },
  praise: { sound: 'Upbeat praise: fast and celebratory, bass-driven groove, tight drums, brass stabs, the choir shouting back lines', vamp: true },
  afro_gospel: { sound: 'Afro gospel praise: joyful and danceable, talking drums and shakers, highlife guitar, bright horns, choir call-and-response', vamp: true },
  highlife: { sound: 'Highlife praise: bright palm-wine guitar lines, horns, congas and cowbell, swinging bass, a celebratory church dance feel', vamp: true },
  afrobeats_worship: { sound: 'Afrobeats worship: modern Afrobeats rhythm with log drums and percussion, warm keys and pads, smooth lead vocal, the choir on the hook', vamp: true },
  amapiano_gospel: { sound: 'Amapiano gospel: log-drum basslines, shakers and soft piano chords, airy pads, a laid-back groove with a choir chant on the hook', vamp: true },
  naija_praise: { sound: 'Nigerian Pentecostal praise: fast high-energy praise with talking drum, agogo, bass and keys, short repeated lines the whole church sings', vamp: true },
  south_african_choir: { sound: 'South African choir: rich a cappella-led harmonies, stomping and clapping, call-and-response, building into drums and bass', vamp: true },
  reggae_gospel: { sound: 'Reggae gospel: one-drop rhythm, skanking guitar, deep bass, organ bubble, relaxed joyful vocals', vamp: false },
  southern_gospel: { sound: 'Southern gospel: piano-led, four-part quartet harmony, steady country-gospel rhythm, warm and joyful', vamp: false },
  celtic_worship: { sound: 'Celtic worship: tin whistle and fiddle, bodhrán, acoustic guitar, lilting melody in the Irish tradition', vamp: false },
  hymn: { sound: 'Modern hymn: strong singable melody, verses that tell the story, piano and strings, a full choir on the last verse', vamp: false },
  traditional_hymn: { sound: 'Traditional hymn: stately four-part harmony, organ, regular metre, verses that build doctrine line by line', vamp: false },
  gospel_rap: { sound: 'Gospel hip hop: a sung chorus with rapped verses, punchy drums, deep bass, piano or choir samples, clear Christ-centred lyrics', vamp: false },
  children: { sound: "Children's praise: simple, joyful, easy words and actions, bright piano and percussion, a catchy chorus", vamp: false },
  christmas: { sound: 'Christmas: carol-like melody, bells, strings and choir, warm and celebratory, the birth of Christ', vamp: false },
  easter: { sound: 'Easter: from the cross to the empty tomb, building from reflective to triumphant, choir and full band', vamp: true },
};
const FEELS: Record<string, string> = { slow: '60–72 BPM', mid: '76–96 BPM', fast: '110–132 BPM' };

interface Brief {
  theme: string;
  scripture?: string;
  style?: string;
  feel?: string;
  key?: string;
  /** Another language, for the chorus or the whole song */
  language?: string;
  languageMode?: 'chorus' | 'all';
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
  const language = clean(input.language, 40);
  return {
    theme,
    scripture: clean(input.scripture, 200),
    style: STYLES[String(input.style)] ? String(input.style) : 'gospel_choir',
    feel: FEELS[String(input.feel)] ? String(input.feel) : 'mid',
    key: /^[A-G](b|#)?m?$/.test(String(input.key ?? '')) ? String(input.key) : '',
    language: /^english$/i.test(language) ? '' : language,
    languageMode: input.languageMode === 'all' ? 'all' : 'chorus',
    notes: clean(input.notes, 600),
  };
}

/** Words that give a machine away (or are just tired); the editor removes them */
const TIRED = ['tapestry', 'symphony', 'embrace', 'journey', 'soar', 'ignite', 'unleash', 'realm', 'testament', 'in this moment', 'heart and soul', 'echoes', 'whispers', 'beacon', 'unwavering', 'boundless', 'transcend', 'vibrant', 'resonate', 'navigate', 'tapestries', 'kaleidoscope', 'embers', 'shattered chains'];

const SYSTEM = `You are a seasoned gospel and worship songwriter and arranger who has written for church choirs and bands for thirty years, across gospel, worship, African and traditional styles. You write ONLY Christian worship, praise and gospel songs: Christ-centred, faithful to Scripture and historic Christian belief (the Trinity, salvation by grace through faith in Jesus, His death and resurrection, the work of the Holy Spirit). Never promise wealth or guaranteed outcomes, never put words in God's mouth beyond what Scripture says, never write anything secular, romantic, political or about other religions. If the brief asks for anything else, reply with {"refused": true, "reason": "<one short sentence>"}.

Write like a real songwriter, not a machine:
- Concrete pictures and verbs from Scripture and everyday life (a kitchen table, a hospital corridor, the Jordan, a shepherd's staff), not abstractions. Never use: ${TIRED.map((w) => `"${w}"`).join(', ')}, "rise up" (unless the text demands it).
- Natural, singable words with steady meter: lines in a section have matching syllable counts and stresses, so one melody fits every line. Rhyme where it falls naturally (near rhymes are fine); never force a rhyme or twist word order to get one.
- Sound like the style: the idioms, the phrasing, the call-and-response or the congregational simplicity that style really uses.
- One clear idea per song. Verses tell it; the chorus is short, memorable and repeated exactly; the bridge turns or lifts it. Styles with a vamp end with 1–3 short repeated lines the choir can build on.
- Original: never copy or closely echo lines from existing songs or hymns. Quote Scripture only briefly and naturally.
- Easy for a congregation and a choir: comfortable range, words that fit the mouth.

Chords: write each line in ChordPro style with chords in square brackets right before the syllable they land on, e.g. "[G]Holy is the [D/F#]Lamb who [Em]reigns". Use the song's key; chords true to the style (gospel: 7ths, 9ths, passing diminished and slash chords; worship: open sus and add9; hymn: plain triads), placed on stressed syllables. Every sung line has at least one chord; an intro or turnaround may be a line of chords only. Square brackets hold chords ONLY: write choir answers, ad-libs and directions in round brackets, e.g. "[Eb]He carried me (Choir: He carried me!)". Use # and b for sharps and flats.

Also give: arrangement.choir (SATB or SAT parts: who sings what, call-and-response, harmonies, where the choir enters, ad-libs) and arrangement.band (groove, drum pattern, bass, keys/organ, guitar, dynamics section by section), each under 700 characters; music_style: one sentence describing the genre, instruments, vocal delivery and mood for a music producer (never name a real artist or existing song).

Reply with JSON only, exactly: {"title": string, "key": string, "bpm": number, "time_signature": string, "feel": string, "scripture": string[], "summary": string (one sentence), "sections": [{"name": "Verse 1" | "Pre-Chorus" | "Chorus" | "Verse 2" | "Bridge" | "Vamp" | "Intro" | "Outro" | ..., "lines": string[]}], "arrangement": {"choir": string, "band": string}, "music_style": string}.`;

const languageLine = (b: Brief) =>
  !b.language
    ? 'Language: English.'
    : b.languageMode === 'all'
      ? `Language: write the whole song in ${b.language}, as native ${b.language}-speaking church choirs really sing (natural idiom, not a translation). Keep the section names in English.`
      : `Language: English verses, with the chorus (and the vamp, if any) in ${b.language}, as native speakers sing it in church; you may add the English meaning in round brackets after a line.`;

const userPrompt = (b: Brief) =>
  [
    `Write a complete song.`,
    `What it's about: ${b.theme}`,
    b.scripture ? `Scripture to draw from: ${b.scripture}` : 'Choose fitting Scripture yourself.',
    `Style: ${STYLES[b.style!].sound}`,
    `Tempo: ${FEELS[b.feel!]}`,
    b.key ? `Key: ${b.key}` : 'Pick a key that suits a church choir (e.g. C, D, Eb, F, G, Ab or Bb).',
    languageLine(b),
    b.notes ? `Writer's notes: ${b.notes}` : '',
    `Structure: Verse 1, (Pre-Chorus), Chorus, Verse 2, Chorus, Bridge, Chorus${STYLES[b.style!].vamp ? ', Vamp' : ''}. Repeat the chorus in full each time it appears.`,
  ]
    .filter(Boolean)
    .join('\n');

const EDITOR = `You are the producer and editor a church choir trusts with every new song. You receive a draft song as JSON. Make it the best version of itself, the way an experienced songwriter would revise before the first rehearsal:
- Meter: make every line in a section scan the same (same syllable count and stress pattern), so one melody fits all of them. Read each line aloud in your head.
- Words: replace anything generic, abstract, clichéd or that sounds machine-written with concrete, fresh images from Scripture and real life. Remove every one of these words: ${TIRED.map((w) => `"${w}"`).join(', ')}.
- Chorus: make it short, singable and memorable on first hearing; the title should sit in it. Repeat it identically every time.
- Rhyme: natural only; fix any forced rhyme or twisted word order.
- Truth: keep it faithful to Scripture and Christ-centred; fix anything doctrinally loose.
- Style: keep it true to the brief's style and language.
- Chords: keep them valid for the key and on stressed syllables; square brackets hold chords only, choir answers in round brackets.
Keep the same structure and the same JSON shape and fields. Reply with the revised song as JSON only.`;

const editorPrompt = (song: Song, b: Brief) =>
  `The brief: ${userPrompt(b)}\n\nThe draft:\n${JSON.stringify(song)}`;

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

interface Ask {
  system: string;
  prompt: string;
  temperature: number;
}

async function gemini(model: string, ask: Ask, timeoutMs: number, lowThinking = true): Promise<{ song?: Song; refused?: string; error?: string; status?: number }> {
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI },
      // Each attempt must leave time for another inside the function's limit
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: ask.system }] },
        contents: [{ role: 'user', parts: [{ text: ask.prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: ask.temperature,
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
    if (lowThinking && res.status === 400 && /thinking/i.test(text)) return gemini(model, ask, Math.max(5_000, timeoutMs - (Date.now() - t0)), false);
    return { error: `${model} ${res.status} after ${Math.round((Date.now() - t0) / 1000)}s: ${text.slice(0, 200)}`, status: res.status };
  }
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('');
  const out = parsed(text, model);
  console.log(`[song-writer] ${model} answered in ${Math.round((Date.now() - t0) / 1000)}s`);
  return out;
}

async function openai(ask: Ask): Promise<{ song?: Song; refused?: string; error?: string }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI}` },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_SONG_MODEL') ?? 'gpt-4.1',
      temperature: ask.temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ask.system },
        { role: 'user', content: ask.prompt },
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

/** Ask the models in order until one answers, within `limitMs` of the function's time */
async function generate(ask: Ask, limitMs: number, only?: string) {
  const errors: string[] = [];
  const started = Date.now();
  const left = () => limitMs - (Date.now() - started);
  if (GEMINI) {
    const queue = only ? [only] : [...MODELS];
    const tried = new Set<string>();
    while (queue.length && tried.size < 5 && left() > 8_000) {
      const model = queue.shift()!;
      if (tried.has(model)) continue;
      tried.add(model);
      const budget = () => Math.max(5_000, Math.min(50_000, left() - 3_000));
      let r = await gemini(model, ask, budget());
      // Busy for a moment: one more try
      if ((r.status === 503 || r.status === 500) && left() > 20_000) {
        await new Promise((res) => setTimeout(res, 2000));
        r = await gemini(model, ask, budget());
      }
      if (r.song || r.refused) return r;
      errors.push(r.error!);
      // A retired model's error names its replacement ("… use models/<name> …"): try that next
      const next = r.error?.match(/use models\/([a-z0-9.\-]+)/i)?.[1];
      if (next && !tried.has(next)) queue.unshift(next);
    }
  }
  if (OPENAI && left() > 10_000) {
    const r = await openai(ask).catch((e) => ({ error: `openai: ${String(e).slice(0, 80)}` }) as { song?: Song; refused?: string; error?: string });
    if (r.song || r.refused) return r;
    errors.push(r.error!);
  }
  return { error: errors.join(' · ') || 'No song service is set up.' };
}

const tiredWords = (song: Song) => {
  const text = song.sections.flatMap((s) => s.lines).join(' ').toLowerCase();
  return TIRED.filter((w) => text.includes(w));
};

/**
 * Write the song, then revise it as an experienced editor would (meter, fresh
 * words, a stronger chorus). The revision is kept only if it comes back whole
 * and keeps the song's shape; otherwise the first draft stands.
 */
async function writeSong(b: Brief, only?: string) {
  const started = Date.now();
  const first = await generate({ system: SYSTEM, prompt: userPrompt(b), temperature: 0.95 }, 95_000, only);
  if (!first.song) return first;
  const left = 128_000 - (Date.now() - started);
  if (left < 15_000) return { ...first, revised: false };
  const second = await generate({ system: EDITOR, prompt: editorPrompt(first.song, b), temperature: 0.5 }, left, only);
  const good = second.song && second.song.sections.length >= Math.max(3, first.song.sections.length - 2) && tiredWords(second.song).length <= tiredWords(first.song).length;
  console.log(`[song-writer] revised: ${good ? 'yes' : 'no'} (${Math.round((Date.now() - started) / 1000)}s, tired words ${tiredWords(first.song).length}→${second.song ? tiredWords(second.song).length : '-'})`);
  return good ? { song: second.song, revised: true } : { ...first, revised: false };
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
      ...(STYLES[brief.style ?? 'gospel_choir'] ? [STYLES[brief.style ?? 'gospel_choir'].sound.split(':')[0]] : []),
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
    const brief = briefFrom({ theme: typeof input.theme === 'string' ? input.theme : 'Thanksgiving for God\'s faithfulness through a hard year', style: typeof input.style === 'string' ? input.style : 'gospel_choir', feel: 'mid', language: input.language, languageMode: input.languageMode })!;
    const out: Record<string, unknown> = { gemini: !!GEMINI, openai: !!OPENAI, elevenlabs: !!ELEVEN, models_in_order: MODELS };
    if (input.models && GEMINI) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': GEMINI } });
      const d = await r.json().catch(() => ({}));
      out.models = (d.models ?? [])
        .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: { name: string }) => m.name.replace('models/', ''));
    }
    if (input.write) {
      const t0 = Date.now();
      const r = await writeSong(brief, typeof input.model === 'string' ? input.model : undefined);
      out.write_seconds = Math.round((Date.now() - t0) / 1000);
      out.write = r.song ? { ok: true, revised: (r as { revised?: boolean }).revised, title: r.song.title, sections: r.song.sections.map((s) => s.name), first: r.song.sections[0]?.lines.slice(0, 2) } : r;
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
