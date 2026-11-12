// Compose a song (choir page): the song helper.
//
// write  — a full Christian / gospel song from a brief (theme, scripture, style, feel,
//          key): title, key, tempo, sections with chords over the words, and notes for
//          the choir parts and the band. Gemini (GEMINI_API_KEY; SONG_MODEL, default
//          gemini-3.5-flash, then 3.8-flash, 3.1-flash-lite, 3.1-pro, and any replacement
//          Gemini names when it retires a model), then OpenAI (OPENAI_API_KEY).
//          A second pass revises it like an editor (meter, fresh words, the chorus).
//          Saved as the writer's draft (song_drafts). No daily limits.
// music  — the draft as a full produced song (vocals, choir, band). In order: ACE-Step 1.5
//          (open source) through ACE Music's free cloud (the church's key, connected in the app,
//          or ACEMUSIC_API_KEY), then the official ACE-Step demo on Hugging Face (the church's
//          token or HF_TOKEN), then Google's Lyria (GEMINI_API_KEY, needs billing), then
//          ElevenLabs (ELEVENLABS_API_KEY); stored in the public 'song-drafts' bucket.
//          No daily limits.
// music-service / connect-music / disconnect-music — which music service the church has
//          connected; church admins paste a key once (checked with the service first, kept in
//          Supabase Vault, migration 20261107120000), and can remove it.
//
// Signed-in members only. A request signed like Auth's hooks (SEND_EMAIL_HOOK_SECRET)
// may run {"action":"check"} to see which services answer, for setting up.
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from 'https://esm.sh/@aws-sdk/client-s3@3.540.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { getRequestUser, supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { pushConfigured, sendToSubscriptions, subscriptionsForUsers } from '../_shared/webpush.ts';

const GEMINI = Deno.env.get('GEMINI_API_KEY') ?? '';
const OPENAI = Deno.env.get('OPENAI_API_KEY') ?? '';
const ELEVEN = Deno.env.get('ELEVENLABS_API_KEY') ?? '';
// ACE-Step 1.5 (open source): ACE Music's cloud (free keys, unlimited ACE-Step songs) and the
// official demo on Hugging Face (a free token gives some GPU minutes a day)
const ACE_BASE = 'https://api.acemusic.ai';
const HF_SPACE = Deno.env.get('HF_MUSIC_SPACE') ?? 'https://ace-step-ace-step-v1-5.hf.space';
// The demo's generation_wrapper: its queue function number and the Generate button (from its /config, Gradio 6.2)
const HF_FN = Number(Deno.env.get('HF_MUSIC_FN') ?? 77);
const HF_TRIGGER = Number(Deno.env.get('HF_MUSIC_TRIGGER') ?? 147);
type Service = 'acemusic' | 'huggingface';
const ENV_KEYS: Record<Service, string> = { acemusic: Deno.env.get('ACEMUSIC_API_KEY') ?? '', huggingface: Deno.env.get('HF_TOKEN') ?? '' };
// Timed on this key (Nov 2026): gemini-3.5-flash wrote a full song in ~10 s; 3.8-flash is
// often overloaded on the free tier; flash-lite ~9 s; pro is beyond the free allowance
const SONG_MODEL = Deno.env.get('SONG_MODEL') ?? 'gemini-3.5-flash';
// Each model has its own allowance and its own busy moments, so a long list means a song
// is far more likely to get written. The often-overloaded 3.8-flash and the slow pro come
// last. Checked on this key (Nov 2026): 3.6-flash and 3.7-flash have no free allowance
// (429 at once) and 2.5-flash is retired, so they're not in the list.
const MODELS = [...new Set([SONG_MODEL, 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.1-pro-preview'])];
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
const ADMIN_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '';
// No daily limits (the church's choice): only the services' own allowances apply

// ── The brief and the song ─────────────────────────────────────────────
/** Each style: how it's written and how it should sound (also the music producer's brief) */
const STYLES: Record<string, { sound: string; vamp: boolean }> = {
  gospel_choir: { sound: 'Black gospel choir: soulful lead, full SATB choir answering, Hammond organ with Leslie, gospel piano, bass, drums, claps; builds to a shouting vamp', vamp: true },
  christian_rnb: { sound: 'Christian R&B: smooth slow-to-mid neo-soul groove (around 65–90 BPM, laid-back swung sixteenths), warm Rhodes and electric piano with rich extended chords (maj9, min11, 13ths), deep round bass, soft crisp drums with finger snaps, subtle guitar licks; an intimate, soulful lead with melismatic runs, close layered background harmonies and ad-libs; worshipful and personal, sung to Jesus', vamp: true },
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
  /** The lead voice for the music: auto, female, male or a duet */
  voice?: Voice;
  /** Who Auto picked for the last music: female or male (alternating), so it isn't always a man */
  sung?: 'female' | 'male';
  /** Advanced settings → Studio quality music: the studio server (slower, the best ACE-Step makes) */
  quality?: 'studio';
}
const qualityOf = (q: unknown): 'studio' | undefined => (q === 'studio' ? 'studio' : undefined);
type Voice = 'auto' | 'female' | 'male' | 'duet';
const VOICES: Voice[] = ['auto', 'female', 'male', 'duet'];
const voiceOf = (v: unknown): Voice => (VOICES.includes(v as Voice) ? (v as Voice) : 'auto');
/** The voice the music is sung with: the chosen one, or Auto's pick */
const sungVoice = (b: Brief): Voice => {
  const v = voiceOf(b.voice);
  return v === 'auto' ? (b.sung === 'female' || b.sung === 'male' ? b.sung : 'auto') : v;
};
/** Auto's pick for the next music: the other one from last time (the first time, either) */
const autoPick = (last?: string): 'female' | 'male' => (last === 'female' ? 'male' : last === 'male' ? 'female' : Math.random() < 0.5 ? 'female' : 'male');
/** The lead singer, as the music models are asked for it */
const LEAD: Record<Voice, string> = {
  auto: 'strong expressive lead vocal',
  female: 'powerful expressive female lead vocalist',
  male: 'powerful expressive male lead vocalist',
  duet: 'male and female lead vocal duet, trading lines and joining in harmony on the chorus',
};

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
/** Like clean, but keeps line breaks (a writer's notes may hold lines they want in the song) */
const cleanLines = (s: unknown, max: number) =>
  typeof s === 'string' ? s.split(/\r?\n|\u2028/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12).join('\n').slice(0, max) : '';

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
    voice: voiceOf(input.voice),
    notes: cleanLines(input.notes, 600),
    quality: qualityOf(input.quality),
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
- Original: never copy or closely echo lines, titles or hooks of existing songs or hymns (e.g. not "Great is Thy faithfulness", "Amazing grace", "How great Thou art", "Way maker", "10,000 reasons", "What a beautiful name"); say the truth in your own fresh words. Quote Scripture only briefly and naturally.
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
    b.notes
      ? `The writer's own requests. Follow every one of them exactly; they come before anything else in this brief except the Christian rules. Any line, phrase or title in quotes must appear in the song word for word (put a line meant for the chorus in the chorus). A requested change to the structure replaces the structure below.\n<<<\n${b.notes}\n>>>`
      : '',
    `Structure${b.notes ? ' (unless the writer asked otherwise)' : ''}: Verse 1, (Pre-Chorus), Chorus, Verse 2, Chorus, Bridge, Chorus${STYLES[b.style!].vamp ? ', Vamp' : ''}. Repeat the chorus in full each time it appears.`,
  ]
    .filter(Boolean)
    .join('\n');

const EDITOR = `You are the producer and editor a church choir trusts with every new song. You receive a draft song as JSON. Make it the best version of itself, the way an experienced songwriter would revise before the first rehearsal:
- Meter: make every line in a section scan the same (same syllable count and stress pattern), so one melody fits all of them. Read each line aloud in your head.
- Words: replace anything generic, abstract, clichéd or that sounds machine-written with concrete, fresh images from Scripture and real life. Remove every one of these words: ${TIRED.map((w) => `"${w}"`).join(', ')}.
- Chorus: make it short, singable and memorable on first hearing; the title should sit in it. Repeat it identically every time.
- Rhyme: natural only; fix any forced rhyme or twisted word order.
- Original: rewrite in fresh words any line, title or hook that is close to a well-known song or hymn (e.g. "Great is Thy faithfulness… morning by morning", "Amazing grace", "How great Thou art", "Way maker"), and retitle the song if its title is taken from one.
- Truth: keep it faithful to Scripture and Christ-centred; fix anything doctrinally loose.
- Style: keep it true to the brief's style and language.
- Chords: keep them valid for the key and on stressed syllables; square brackets hold chords only, choir answers in round brackets.
- The writer's requests (in the brief, between <<< and >>>) come first: every line, phrase, title, structure or instruction they asked for stays exactly as they asked, even where you would otherwise change it.
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

/** A model with no answer after this long is overtaken: the next one starts beside it */
const HEDGE_MS = 12_000;
/** No single attempt may take longer than this (an overloaded model took 44 s to say so) */
const ATTEMPT_MS = 35_000;

/**
 * Ask the models until one answers, within `limitMs` of the function's time. They're
 * started in order, but never one whole wait after another: an overloaded model took
 * 44 s to answer "busy" and was then tried again, which used up all the time and ended
 * in "The song helper is busy" (Nov 2026). Now the next model starts as soon as one
 * fails, or after 12 s with no answer (a good answer takes ~8 s), and the first whole
 * song wins. A model that fails fast with 500/503 gets one more try at the end.
 */
async function generate(ask: Ask, limitMs: number, only?: string) {
  const errors: string[] = [];
  const started = Date.now();
  const left = () => limitMs - (Date.now() - started);
  type Out = { song?: Song; refused?: string; error?: string; status?: number };
  if (GEMINI) {
    const queue = only ? [only] : [...MODELS];
    const tried = new Set<string>();
    const retried = new Set<string>();
    // Models that said "busy" or "too many requests": asked once more if every model fails
    const momentary: string[] = [];
    let secondRound = false;
    const won = await new Promise<Out | null>((resolve) => {
      let running = 0;
      let settled = false;
      let hedge: ReturnType<typeof setTimeout> | undefined;
      const finish = (r: Out | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(hedge);
        clearTimeout(end);
        resolve(r);
      };
      const end = setTimeout(() => finish(null), Math.max(1_000, limitMs - 1_000));
      const startNext = () => {
        if (settled) return;
        clearTimeout(hedge);
        let model: string | undefined;
        while (queue.length && !model) {
          const m = queue.shift()!;
          if (!tried.has(m) || retried.has(m)) model = m;
        }
        if (!model || (tried.size >= 10 && !tried.has(model)) || left() < 6_000) {
          if (running) return;
          // Everything failed with time to spare (e.g. the free allowance's per-minute
          // limit): wait a few seconds and ask the momentarily busy ones once more
          if (!secondRound && !only && momentary.length && left() > 25_000) {
            secondRound = true;
            for (const m of momentary) {
              retried.add(m);
              queue.push(m);
            }
            hedge = setTimeout(startNext, 5_000);
            return;
          }
          finish(null);
          return;
        }
        const name = model;
        const again = tried.has(name);
        tried.add(name);
        if (again) retried.delete(name);
        running++;
        const t0 = Date.now();
        gemini(name, ask, Math.max(5_000, Math.min(ATTEMPT_MS, left() - 2_000))).then((r) => {
          running--;
          if (settled) return;
          if (r.song || r.refused) return finish(r);
          errors.push(r.error ?? `${name}: no song`);
          // A retired model's error names its replacement ("… use models/<name> …"): try that next
          const next = r.error?.match(/use models\/([a-z0-9.\-]+)/i)?.[1];
          if (next && !tried.has(next)) queue.unshift(next);
          // Busy for a moment (it said so quickly): one more try, after the others
          if (!again && (r.status === 503 || r.status === 500) && Date.now() - t0 < 8_000) {
            retried.add(name);
            queue.push(name);
          } else if (!secondRound && (r.status === 429 || r.status === 503 || r.status === 500 || r.status === 504) && !momentary.includes(name)) {
            momentary.push(name);
          }
          startNext();
        });
        if (queue.length) hedge = setTimeout(startNext, HEDGE_MS);
      };
      startNext();
    });
    if (won) return won;
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

/** The words in quotes in the writer's notes, which must be in the song word for word */
const quotesIn = (notes?: string) =>
  [...(notes ?? '').matchAll(/["“”]([^"“”]{3,200})["“”]/g)].map((m) => norm(m[1])).filter(Boolean);
const norm = (t: string) => t.toLowerCase().replace(/\[[^\]]*\]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** How many of those the song has (the editor's pass is kept only if it loses none) */
function keptQuotes(song: Song, b: Brief) {
  const quotes = quotesIn(b.notes);
  if (!quotes.length) return 0;
  const text = ` ${norm([song.title, ...song.sections.flatMap((s) => s.lines)].join(' '))} `;
  return quotes.filter((q) => text.includes(` ${q} `)).length;
}

/**
 * Write the song, then revise it as an experienced editor would (meter, fresh
 * words, a stronger chorus). The revision is kept only if it comes back whole
 * and keeps the song's shape; otherwise the first draft stands.
 */
async function writeSong(b: Brief, only?: string) {
  const started = Date.now();
  const first = await generate({ system: SYSTEM, prompt: userPrompt(b), temperature: 0.95 }, 80_000, only);
  if (!first.song) return first;
  // The editor's pass is a bonus: on a slow day the first draft stands rather than making
  // the writer wait (at most 30 s more, and the whole request well inside the limit)
  const left = Math.min(30_000, 115_000 - (Date.now() - started));
  if (left < 12_000) return { ...first, revised: false };
  const second = await generate({ system: EDITOR, prompt: editorPrompt(first.song, b), temperature: 0.5 }, left, only);
  const good =
    second.song &&
    second.song.sections.length >= Math.max(3, first.song.sections.length - 2) &&
    tiredWords(second.song).length <= tiredWords(first.song).length &&
    keptQuotes(second.song, b) >= keptQuotes(first.song, b);
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

/** Google's Lyria music models on the same Gemini key (full songs with voices from words and a description) */
const LYRIA = [...new Set([Deno.env.get('MUSIC_MODEL') ?? 'lyria-3-pro-preview', 'lyria-3-pro-preview', 'lyria-3.5', 'lyria-3-clip-preview'])];

/** What Lyria is asked for: the sound, the voices and the exact words, section by section */
function lyriaPrompt(song: Song, brief: Brief) {
  const style = STYLES[brief.style ?? 'gospel_choir'] ?? STYLES.gospel_choir;
  const words = song.sections
    .map((sec) => `[${sec.name}]\n${sec.lines.map(plain).filter(Boolean).join('\n')}`)
    .filter((block) => block.split('\n').length > 1)
    .join('\n\n');
  return [
    `A complete ${christianGenre(style.sound)} song for a church choir, about three minutes long, recorded like a professional live church session.`,
    `Sound: ${style.sound}.`,
    song.music_style ? `Production: ${song.music_style}` : '',
    `Tempo ${song.bpm} BPM, ${song.time_signature}, key of ${song.key}.`,
    `Voices: ${sungVoice(brief) === 'auto' ? 'a strong, expressive lead singer' : `a ${LEAD[sungVoice(brief)]}`} with a full choir singing harmonies and answering lines in the choruses${style.vamp ? ' and the vamp' : ''}. Clear diction: every word must be understood.`,
    song.arrangement.choir ? `Choir arrangement: ${song.arrangement.choir}` : '',
    song.arrangement.band ? `Band arrangement: ${song.arrangement.band}` : '',
    `Sing exactly these lyrics, in this order (lines in round brackets are the choir's answers):`,
    words,
  ].filter(Boolean).join('\n');
}

async function lyria(model: string, song: Song, brief: Brief, timeoutMs: number): Promise<{ audio?: Uint8Array; mime?: string; error?: string; status?: number }> {
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: lyriaPrompt(song, brief) }] }] }),
    });
  } catch (e) {
    return { error: `${model}: no answer in ${Math.round((Date.now() - t0) / 1000)}s (${String(e).slice(0, 60)})`, status: 504 };
  }
  if (!res.ok) return { error: `${model} ${res.status}: ${(await res.text()).replace(/\s+/g, " ").slice(0, 900)}`, status: res.status };
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const audio = parts.find((p: { inlineData?: { mimeType?: string; data?: string } }) => p.inlineData?.data && /audio/.test(p.inlineData.mimeType ?? ''));
  if (!audio) {
    const said = parts.map((p: { text?: string }) => p.text ?? '').join(' ').slice(0, 200);
    return { error: `${model}: no audio in the answer${said ? ` (it said: ${said})` : ''} ${JSON.stringify(data?.promptFeedback ?? data?.candidates?.[0]?.finishReason ?? '').slice(0, 120)}` };
  }
  const bin = atob(audio.inlineData.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  console.log(`[song-writer] ${model} made ${Math.round(bytes.length / 1024)} KB of ${audio.inlineData.mimeType} in ${Math.round((Date.now() - t0) / 1000)}s`);
  return { audio: bytes, mime: audio.inlineData.mimeType };
}

// ── ACE-Step 1.5 ──────────────────────────────────────────────────────
interface Made { audio?: Uint8Array; mime?: string; error?: string; status?: number }

/** The church's own key for a music service (kept in Vault), else the platform's */
async function keyFor(churchId: string | null | undefined, service: Service): Promise<string> {
  if (churchId) {
    const { data } = await supabaseAdmin.rpc('service_key' as never, { _church: churchId, _service: service } as never);
    if (typeof data === 'string' && data) return data;
  }
  return ENV_KEYS[service];
}

/** "Christian gospel choir", "Christian R&B" (never "Christian christian …") */
const christianGenre = (sound: string) => {
  const g = sound.split(':')[0].trim();
  return /^christian\b/i.test(g) ? g : `Christian ${g.toLowerCase()}`;
};

/** The style as ACE-Step's description: genre, instruments, voices, production */
function aceCaption(song: Song, brief: Brief) {
  const style = STYLES[brief.style ?? 'gospel_choir'] ?? STYLES.gospel_choir;
  const [genre, sound] = style.sound.split(':');
  return [
    christianGenre(genre),
    sound?.trim(),
    `${LEAD[sungVoice(brief)]}, full church choir singing harmonies and answering lines`,
    song.music_style ? song.music_style.slice(0, 260) : '',
    'live church session, warm professional mix, clear vocals, every word understood',
  ].filter(Boolean).join(', ').slice(0, 900);
}

/** The words with ACE-Step's section tags ([Verse 1], [Chorus] …); round brackets stay as the choir's answers */
function aceLyrics(song: Song) {
  return song.sections
    .map((sec) => {
      const lines = sec.lines.map(plain).filter(Boolean);
      if (!lines.length) return '';
      const tag = /vamp/i.test(sec.name) ? 'Outro' : sec.name.replace(/[[\]]/g, '').slice(0, 40);
      return `[${tag}]\n${lines.join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 4000);
}

/** How long the song should run: about two bars a line, a vamp repeated, 1½ to 4 minutes */
function aceSeconds(song: Song) {
  const beats = Number(song.time_signature.split('/')[0]) || 4;
  const barS = (60 / Math.min(200, Math.max(40, song.bpm || 84))) * beats;
  const bars = song.sections.reduce((a, sec) => a + Math.max(4, sec.lines.filter((l) => plain(l)).length * 2 + 1) * (/vamp/i.test(sec.name) ? 2 : 1), 0);
  return Math.round(Math.min(240, Math.max(90, bars * barS + 10)));
}

const aceKey = (key: string) => {
  const m = key.trim().match(/^([A-G][#b]?)(m?)$/);
  return m ? `${m[1]} ${m[2] ? 'Minor' : 'Major'}` : '';
};
/** Beats in a bar as ACE-Step takes it (the demo has no 6) */
const aceTime = (sig: string, demo = false) => {
  const top = sig.split('/')[0];
  return ['2', '3', '4'].includes(top) ? top : top === '6' && !demo ? '6' : '';
};
/** The singing language: a whole song in a language ACE-Step knows, else English, else mixed */
const VOCAL: Record<string, string> = { french: 'fr', spanish: 'es', portuguese: 'pt', swahili: 'sw', polish: 'pl', romanian: 'ro', tagalog: 'tl' };
const aceLanguage = (b: Brief) => (!b.language ? 'en' : b.languageMode === 'all' && VOCAL[b.language.toLowerCase()] ? VOCAL[b.language.toLowerCase()] : 'unknown');

function fromBase64(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** ACE Music's models (the 4B "xl" one sounds best when offered) */
async function aceModels(key: string): Promise<{ ok: boolean; status: number; models: string[] }> {
  try {
    const res = await fetch(`${ACE_BASE}/v1/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
    const d = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, models: ((d?.data ?? []) as { id?: string }[]).map((m) => m.id ?? '').filter(Boolean) };
  } catch {
    return { ok: false, status: 0, models: [] };
  }
}

/** ACE Music's cloud: one request, the finished song comes back inline */
async function aceMusic(key: string, song: Song, brief: Brief, timeoutMs: number): Promise<Made> {
  const t0 = Date.now();
  const { models } = await aceModels(key);
  const model = Deno.env.get('ACE_MODEL') ?? models.find((m) => /xl/i.test(m) && /turbo/i.test(m)) ?? models.find((m) => /xl/i.test(m)) ?? models[0] ?? 'acemusic/acestep-v15-turbo';
  const config: Record<string, unknown> = { format: 'mp3', vocal_language: aceLanguage(brief), duration: aceSeconds(song) };
  if (song.bpm) config.bpm = Math.round(song.bpm);
  if (aceKey(song.key)) config.key_scale = aceKey(song.key);
  if (aceTime(song.time_signature)) config.time_signature = aceTime(song.time_signature);
  let res: Response;
  try {
    res = await fetch(`${ACE_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(Math.max(10_000, timeoutMs - (Date.now() - t0))),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: `<prompt>${aceCaption(song, brief)}</prompt><lyrics>${aceLyrics(song)}</lyrics>` }],
        stream: false,
        thinking: true,
        use_format: false,
        sample_mode: false,
        use_cot_caption: false,
        use_cot_language: false,
        batch_size: 1,
        audio_config: config,
      }),
    });
  } catch (e) {
    return { error: `acemusic: no answer in ${Math.round((Date.now() - t0) / 1000)}s (${String(e).slice(0, 60)})`, status: 504 };
  }
  const text = await res.text();
  if (!res.ok) return { error: `acemusic ${res.status}: ${text.replace(/\s+/g, ' ').slice(0, 400)}`, status: res.status };
  let data: { choices?: { finish_reason?: string; message?: { content?: string; audio?: { audio_url?: { url?: string } }[] } }[] };
  try {
    data = JSON.parse(text);
  } catch {
    return { error: `acemusic: not JSON (${text.slice(0, 120)})` };
  }
  const choice = data.choices?.[0];
  if (choice?.finish_reason === 'error') return { error: `acemusic: ${(choice.message?.content ?? 'failed').slice(0, 300)}` };
  const url = choice?.message?.audio?.find((a) => a.audio_url?.url)?.audio_url?.url ?? '';
  const m = url.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/s);
  if (!m) return { error: `acemusic (${model}): no audio in the answer ${(choice?.message?.content ?? '').slice(0, 160)}` };
  const audio = fromBase64(m[2]);
  console.log(`[song-writer] acemusic ${model} made ${Math.round(audio.length / 1024)} KB of ${m[1]} in ${Math.round((Date.now() - t0) / 1000)}s`);
  return { audio, mime: m[1] };
}

/** The official ACE-Step demo on Hugging Face (Gradio), counted against the token's free GPU minutes */
async function hfMusic(token: string, song: Song, brief: Brief, timeoutMs: number): Promise<Made> {
  const t0 = Date.now();
  const headers = { 'Content-Type': 'application/json', 'x-hf-authorization': `Bearer ${token}` };
  const lang = aceLanguage(brief);
  // The demo's generation_wrapper, every named input in order (custom text-to-music, one song, the 4B model, thinking on)
  const data = [
    'acestep-v15-xl-turbo', 'custom', '', 'unknown', aceCaption(song, brief), aceLyrics(song), Math.round(song.bpm || 0), aceKey(song.key), aceTime(song.time_signature, true), lang,
    8, 7.0, true, '-1', null, aceSeconds(song), 1, null, '', 0.0, -1,
    'Fill the audio semantic mask based on the given conditions:', 1.0, 'text2music', false, 0.0, 1.0, 3.0, 'ode', '', 'mp3',
    0.85, true, 2.0, 0, 0.9, 'NO USER INPUT', true, true, true, false, true, false, false, 0.5, 8, 'vocals', [], false,
  ];
  try {
    // The demo's queue (like the official client): it says why when it refuses, e.g. the
    // token's free GPU minutes for today are used up. Its 54 inputs include 5 hidden ones.
    const session = crypto.randomUUID().replace(/-/g, '').slice(0, 11);
    const join = await fetch(`${HF_SPACE}/gradio_api/queue/join`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data: [...data.slice(0, 40), null, ...data.slice(40), null, null, null, null], fn_index: HF_FN, trigger_id: HF_TRIGGER, session_hash: session, event_data: null }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!join.ok) return { error: `huggingface ${join.status}: ${(await join.text()).slice(0, 200)}`, status: join.status };
    const res = await fetch(`${HF_SPACE}/gradio_api/queue/data?session_hash=${session}`, { headers, signal: AbortSignal.timeout(Math.max(10_000, timeoutMs - (Date.now() - t0))) });
    if (!res.ok || !res.body) return { error: `huggingface ${res.status}: no stream` };
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '';
    let done: { success?: boolean; output?: { data?: unknown[]; error?: string | null; title?: string } } | null = null;
    while (!done) {
      const { value, done: ended } = await reader.read();
      if (ended) break;
      buf += value;
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const m = JSON.parse(line.slice(5));
        if (m.msg === 'process_completed') done = m;
        else if (m.msg === 'unexpected_error') done = { success: false, output: { error: m.message ?? 'unexpected error' } };
      }
    }
    reader.cancel().catch(() => {});
    if (!done) return { error: 'huggingface: the demo stopped without a song' };
    if (!done.success || !done.output?.data) {
      const why = `${done.output?.title ? `${done.output.title}: ` : ''}${done.output?.error ?? 'failed'}`;
      return { error: `huggingface: ${why.slice(0, 300)}`, status: /quota|limit/i.test(why) ? 429 : 500 };
    }
    const out = done.output.data;
    const file = out[0] as { url?: string; path?: string } | string | null;
    const url = typeof file === 'string' ? (file.startsWith('http') ? file : `${HF_SPACE}/gradio_api/file=${file}`) : file?.url ?? (file?.path ? `${HF_SPACE}/gradio_api/file=${file.path}` : '');
    if (!url) return { error: `huggingface: no song in the answer (${String(out[10] ?? '').slice(0, 160)})` };
    const audio = await fetch(url, { headers: { 'x-hf-authorization': `Bearer ${token}` } });
    if (!audio.ok) return { error: `huggingface: couldn't fetch the song (${audio.status})` };
    const bytes = new Uint8Array(await audio.arrayBuffer());
    console.log(`[song-writer] huggingface made ${Math.round(bytes.length / 1024)} KB in ${Math.round((Date.now() - t0) / 1000)}s`);
    return { audio: bytes, mime: (audio.headers.get('content-type') ?? 'audio/mpeg').split(';')[0] };
  } catch (e) {
    return { error: `huggingface: no answer in ${Math.round((Date.now() - t0) / 1000)}s (${String(e).slice(0, 80)})`, status: 504 };
  }
}

/**
 * The full song. ACE-Step through ACE Music's cloud, then the ACE-Step demo on Hugging Face,
 * then Google's Lyria (on the Gemini key), then ElevenLabs. `only` picks one service
 * ('acemusic', 'huggingface', 'elevenlabs') or one Lyria model, for testing.
 */
async function makeMusic(song: Song, brief: Brief, churchId?: string | null, only?: string): Promise<Made> {
  const errors: string[] = [];
  const started = Date.now();
  const left = () => 140_000 - (Date.now() - started);
  const wants = (s: string) => !only || only === s;
  for (const service of ['acemusic', 'huggingface'] as Service[]) {
    if (!wants(service) || left() < 30_000) continue;
    const key = await keyFor(churchId, service);
    if (!key) continue;
    const r = service === 'acemusic' ? await aceMusic(key, song, brief, left() - 3_000) : await hfMusic(key, song, brief, left() - 3_000);
    if (r.audio) return r;
    errors.push(r.error!);
  }
  const lyriaModels = !only ? LYRIA : only.startsWith('lyria') ? [only] : [];
  if (GEMINI) {
    for (const model of lyriaModels) {
      if (left() < 15_000) break;
      const r = await lyria(model, song, brief, left() - 5_000);
      if (r.audio) return r;
      errors.push(r.error!);
    }
  }
  if (ELEVEN && wants('elevenlabs') && left() > 30_000) {
    const res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVEN },
      body: JSON.stringify({ composition_plan: compositionPlan(song, brief), model_id: 'music_v1' }),
    });
    if (res.ok) return { audio: new Uint8Array(await res.arrayBuffer()), mime: 'audio/mpeg' };
    errors.push(`elevenlabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return { error: errors.join(' · ') || NOT_SET_UP };
}
/** A song still "making" after this is given up (the first song wakes the server, which can take minutes) */
const MAKING_LIMIT_MS = 25 * 60_000;
/** The phone shows "Connect the music service" when it sees this */
const NOT_SET_UP = "The music service isn't set up.";

const EXT: Record<string, string> = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/aac': 'aac', 'audio/mp4': 'm4a', 'audio/flac': 'flac', 'audio/webm': 'webm' };

// ── Where the songs are kept ──────────────────────────────────────────
// Cloudflare R2 (the same bucket as chat videos: 10 GB free, nothing charged when the
// choir plays or downloads them), under songs/; the app's own storage (Supabase, 1 GB
// shared with photos and backing tracks) only if R2 isn't set up or fails.
const R2 = {
  endpoint: Deno.env.get('R2_ENDPOINT') ?? '',
  accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID') ?? '',
  secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '',
  bucket: Deno.env.get('R2_BUCKET_NAME') ?? '',
  domain: (Deno.env.get('R2_PUBLIC_DOMAIN') ?? '').replace(/\/$/, ''),
};
let s3: S3Client | null = null;
const r2 = () => {
  if (!R2.endpoint || !R2.accessKeyId || !R2.secretAccessKey || !R2.bucket || !R2.domain) return null;
  s3 ??= new S3Client({ region: 'auto', endpoint: R2.endpoint, credentials: { accessKeyId: R2.accessKeyId, secretAccessKey: R2.secretAccessKey } });
  return s3;
};

/** What the R2 bucket holds, by top folder (chat-media, songs, lyrics, uploads…) */
async function r2Usage() {
  const folders: Record<string, { files: number; bytes: number }> = {};
  let token: string | undefined;
  let pages = 0;
  do {
    const page = await r2()!.send(new ListObjectsV2Command({ Bucket: R2.bucket, ContinuationToken: token, MaxKeys: 1000 }));
    for (const o of page.Contents ?? []) {
      const top = String(o.Key ?? '').split('/')[0] || '(top)';
      folders[top] ??= { files: 0, bytes: 0 };
      folders[top].files++;
      folders[top].bytes += Number(o.Size ?? 0);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token && ++pages < 200);
  const list = Object.entries(folders).map(([folder, f]) => ({ folder, ...f })).sort((a, b) => b.bytes - a.bytes);
  return { bytes: list.reduce((a, f) => a + f.bytes, 0), folders: list };
}

/** Keeps a song's audio and gives its public link */
async function storeAudio(path: string, bytes: Uint8Array, mime: string): Promise<string> {
  const client = r2();
  if (client) {
    try {
      await client.send(new PutObjectCommand({ Bucket: R2.bucket, Key: `songs/${path}`, Body: bytes, ContentType: mime, CacheControl: 'public, max-age=31536000, immutable' }));
      return `${R2.domain}/songs/${path}`;
    } catch (e) {
      console.error('[song-writer] R2 upload failed, using the app storage', String(e).slice(0, 200));
    }
  }
  const up = await supabaseAdmin.storage.from('song-drafts').upload(path, bytes, { contentType: mime, upsert: true });
  if (up.error) throw new Error(up.error.message);
  return supabaseAdmin.storage.from('song-drafts').getPublicUrl(path).data.publicUrl;
}

/** Removes a song's old audio (made again, or the song deleted), wherever it was kept */
async function removeAudio(url: string | null | undefined) {
  if (!url) return;
  try {
    const client = r2();
    if (client && R2.domain && url.startsWith(`${R2.domain}/songs/`)) {
      await client.send(new DeleteObjectCommand({ Bucket: R2.bucket, Key: decodeURIComponent(url.slice(R2.domain.length + 1)) }));
      return;
    }
    const marker = '/storage/v1/object/public/song-drafts/';
    const at = url.indexOf(marker);
    if (at >= 0) await supabaseAdmin.storage.from('song-drafts').remove([decodeURIComponent(url.slice(at + marker.length).split('?')[0])]);
  } catch (e) {
    console.error('[song-writer] removing old audio failed', String(e).slice(0, 200));
  }
}

/** Stores finished music and marks the draft ready (or failed, with the reason); the previous version's audio is removed */
async function finish(id: string, churchId: string, m: Made) {
  const { data: before } = await supabaseAdmin.from('song_drafts').select('audio_url, instrumental_url, vocals_url, audio_status, audio_job, created_by, title, location, brief').eq('id', id).maybeSingle();
  // Already finished (by the phone's check or the watcher): nothing to do twice
  if (before && before.audio_status !== 'making') return;
  let ok = false;
  let madeAudio: { bytes: Uint8Array; mime: string } | null = null;
  try {
    if (!m.audio) throw new Error(m.error ?? 'no audio');
    const mime = (m.mime ?? 'audio/mpeg').split(';')[0];
    const url = await storeAudio(`${churchId}/${id}-${Date.now()}.${EXT[mime] ?? 'mp3'}`, m.audio, mime);
    await supabaseAdmin.from('song_drafts').update({ audio_status: 'ready', audio_url: url, audio_job: null, audio_sections: null, instrumental_url: null, vocals_url: null, stems_at: null }).eq('id', id);
    if (before?.audio_url && before.audio_url !== url) await removeAudio(before.audio_url);
    await removeAudio(before?.instrumental_url);
    await removeAudio(before?.vocals_url);
    ok = true;
    madeAudio = { bytes: m.audio, mime };
  } catch (e) {
    console.error('[song-writer] music failed', String(e));
    await supabaseAdmin.from('song_drafts').update({ audio_status: 'failed', audio_error: String(e).slice(0, 500), audio_job: null }).eq('id', id);
  }
  if (before) await tellWriter(before, id, ok);
  // Where each part starts (Listen by part), and the music only / voices only versions, side
  // by side; the page asks again for either if this doesn't finish
  if (madeAudio) await Promise.all([saveSections(id, madeAudio.bytes, madeAudio.mime, 45_000), makeStems(id, 110_000)]);
}

// ── Music only / voices only: the same recording split by the music server (RoFormer) ──
const STEMS_BUSY_MS = 4 * 60_000;
/** `stems_model` of a split made by the RoFormer models (null = the old Demucs split, made again) */
const stemsDone = (model: string | null | undefined) => !!model && model.startsWith('roformer');

/**
 * Splits a song's recording into the music only and the voices only, and keeps both on
 * R2 beside it. One split at a time per song (`stems_at`); 'busy' while another runs.
 */
async function makeStems(id: string, timeoutMs: number): Promise<'done' | 'busy' | 'failed'> {
  const { data: d } = await supabaseAdmin.from('song_drafts').select('church_id, audio_url, audio_status, instrumental_url, vocals_url, stems_model, stems_at').eq('id', id).maybeSingle();
  if (!d || d.audio_status !== 'ready' || !d.audio_url) return 'failed';
  // An old split (Demucs) keeps playing until the new one is ready
  if (d.instrumental_url && stemsDone(d.stems_model)) return 'done';
  if (d.stems_at && Date.now() - Date.parse(d.stems_at) < STEMS_BUSY_MS) return 'busy';
  const srv = await musicServer();
  if (!srv?.separate) return 'failed';
  const started = new Date().toISOString();
  // Claim it (only if nobody else has since)
  const claim = supabaseAdmin.from('song_drafts').update({ stems_at: started }).eq('id', id);
  const { data: claimed } = await (d.stems_at ? claim.eq('stems_at', d.stems_at) : claim.is('stems_at', null)).select('id');
  if (!claimed?.length) return 'busy';
  try {
    const res = await fetch(srv.separate, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The server waits for its split job this long, then answers 202 (still working)
      body: JSON.stringify({ url: d.audio_url, key: srv.key, wait: Math.max(20, Math.round(timeoutMs / 1000) - 15) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 202) {
      // Still being split on the server (e.g. its models were downloading): the same job is
      // picked up by the next call, so let one come in about 45 s
      await supabaseAdmin.from('song_drafts').update({ stems_at: new Date(Date.now() - STEMS_BUSY_MS + 45_000).toISOString() }).eq('id', id).eq('stems_at', started);
      return 'busy';
    }
    if (!res.ok) throw new Error(`music server ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const out = await res.json();
    if (!out?.instrumental || !out?.vocals) throw new Error('music server: no versions in the answer');
    const t = Date.now();
    const [music, voices] = await Promise.all([
      storeAudio(`${d.church_id}/${id}-${t}-music.mp3`, fromBase64(out.instrumental), 'audio/mpeg'),
      storeAudio(`${d.church_id}/${id}-${t}-voices.mp3`, fromBase64(out.vocals), 'audio/mpeg'),
    ]);
    // Still the same recording? (Make it again may have replaced it meanwhile)
    const { data: now } = await supabaseAdmin.from('song_drafts').select('audio_url').eq('id', id).maybeSingle();
    if (now?.audio_url !== d.audio_url) {
      await removeAudio(music);
      await removeAudio(voices);
      return 'failed';
    }
    const stems_model = out.model === 'instrumental_clean' ? 'roformer-clean' : 'roformer-single';
    await supabaseAdmin.from('song_drafts').update({ instrumental_url: music, vocals_url: voices, stems_model, stems_at: null }).eq('id', id);
    // The old split's files go once the new ones are in place
    if (d.instrumental_url && d.instrumental_url !== music) await removeAudio(d.instrumental_url);
    if (d.vocals_url && d.vocals_url !== voices) await removeAudio(d.vocals_url);
    console.log(`[song-writer] split ${id} in ${out.seconds}s (${out.model ?? 'server'})`);
    return 'done';
  } catch (e) {
    const timedOut = /timeout|abort/i.test(String(e));
    console.error('[song-writer] split failed', String(e));
    // A timed-out split may still finish on the server: leave the claim to expire (4 minutes);
    // a failed one is tried again in half an hour (the claim is moved on 26 minutes)
    if (!timedOut) await supabaseAdmin.from('song_drafts').update({ stems_at: new Date(Date.now() + 26 * 60_000).toISOString() }).eq('id', id).eq('stems_at', started);
    return timedOut ? 'busy' : 'failed';
  }
}

// ── Listen by part: where each section is in the recording ─────────────
interface PartTime { name: string; start: number; end: number }

const toBase64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

/**
 * Gemini listens to the recording with the words beside it and says where each section
 * is sung (in seconds). Checked before use: in order, inside the song, at least 3 s long.
 */
async function timeSections(bytes: Uint8Array, mime: string, song: Song, timeoutMs: number): Promise<PartTime[] | null> {
  if (!GEMINI) return null;
  const parts = song.sections.map((sec, i) => `${i}. [${sec.name}]\n${sec.lines.map(plain).filter(Boolean).join('\n') || '(instrumental)'}`).join('\n\n');
  const prompt = [
    'This is a recording of a church song. Below are its sections in order, numbered, with their words (lines in round brackets are the choir answering).',
    'Listen to the whole recording and say where each section starts and ends, in seconds from the beginning of the recording.',
    'A section starts at its first sung word, or for a section with no words (Intro, Instrumental) where that music begins; it ends where the next section starts (or the music ends).',
    'If the singers repeat or skip a section, give the first time it is sung, and null for a section that is not heard.',
    'Reply with JSON only: {"duration": <seconds>, "sections": [{"i": <number>, "start": <seconds or null>, "end": <seconds or null>}]}',
    '',
    parts,
  ].join('\n');
  const t0 = Date.now();
  for (const model of MODELS.slice(0, 3)) {
    const left = timeoutMs - (Date.now() - t0);
    if (left < 8_000) break;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: toBase64(bytes) } }, { text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
        signal: AbortSignal.timeout(left),
      });
      if (!res.ok) {
        console.error('[song-writer] section timing', model, res.status, (await res.text()).slice(0, 200));
        continue;
      }
      const d = await res.json();
      const text = (d.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
      const out = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
      const timed = checkTimes(out, song);
      if (timed) return timed;
      console.error('[song-writer] section timing unusable', model, text.slice(0, 300));
    } catch (e) {
      console.error('[song-writer] section timing failed', model, String(e));
    }
  }
  return null;
}

/** Keeps sensible times only: in order, inside the recording, each at least 3 s */
function checkTimes(out: { duration?: unknown; sections?: unknown }, song: Song): PartTime[] | null {
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? NaN : Number(v));
  const rows = Array.isArray(out?.sections) ? (out.sections as { i?: unknown; start?: unknown; end?: unknown }[]) : [];
  const said = new Map<number, { start: number; end: number }>();
  for (const r of rows) {
    const i = num(r?.i);
    const start = num(r?.start);
    if (Number.isInteger(i) && i >= 0 && i < song.sections.length && Number.isFinite(start) && start >= 0 && !said.has(i)) said.set(i, { start, end: num(r?.end) });
  }
  // In the song's order; a section said to start before the one before it is left out
  const kept: { i: number; start: number; end: number }[] = [];
  for (let i = 0; i < song.sections.length; i++) {
    const t = said.get(i);
    if (t && t.start >= (kept[kept.length - 1]?.start ?? 0)) kept.push({ i, ...t });
  }
  const duration = num(out?.duration);
  const total = Number.isFinite(duration) && duration > 10 ? duration : Math.max(0, ...kept.map((k) => (Number.isFinite(k.end) ? k.end : 0)));
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const list = kept.map((k, n) => {
    const next = kept[n + 1]?.start;
    // Ends where the next part starts (or where Gemini heard it end, if sooner); the last at the end
    let end = next ?? (Number.isFinite(k.end) && k.end > k.start ? k.end : total);
    if (next !== undefined && Number.isFinite(k.end) && k.end > k.start && k.end < next) end = k.end;
    return { name: song.sections[k.i].name, start: r1(k.start), end: r1(end) };
  });
  const good = list.filter((p) => p.end - p.start >= 3 && (!total || p.start < total));
  return good.length >= 2 ? good : null;
}

/**
 * Times the parts of a song's stored recording (downloads it first). A song that can't be
 * timed is marked tried (`[]`) so the minute-by-minute safety net doesn't keep asking;
 * opening the song asks once more.
 */
async function sectionsFor(id: string, timeoutMs: number): Promise<boolean> {
  const { data: d } = await supabaseAdmin.from('song_drafts').select('audio_url').eq('id', id).maybeSingle();
  if (!d?.audio_url) return false;
  const res = await fetch(d.audio_url, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
  const ok = !!res?.ok && (await saveSections(id, new Uint8Array(await res.arrayBuffer()), (res.headers.get('content-type') ?? 'audio/mpeg').split(';')[0], timeoutMs));
  if (!ok) await supabaseAdmin.from('song_drafts').update({ audio_sections: [] }).eq('id', id).is('audio_sections', null);
  return ok;
}

/** Works out and saves the parts of a song's recording; true when saved */
async function saveSections(id: string, bytes: Uint8Array, mime: string, timeoutMs: number): Promise<boolean> {
  const { data: d } = await supabaseAdmin.from('song_drafts').select('song').eq('id', id).maybeSingle();
  const song = validSong(d?.song);
  if (!song) return false;
  const parts = await timeSections(bytes, mime, song, timeoutMs);
  if (!parts) return false;
  await supabaseAdmin.from('song_drafts').update({ audio_sections: parts }).eq('id', id);
  return true;
}

/**
 * "Your song is ready 🎶" on the writer's phone, unless they're watching the page right
 * now (its checks came in the last 20 seconds: the page tells them itself)
 */
async function tellWriter(d: { created_by: string; title: string; location: string | null; audio_job?: unknown }, id: string, ok: boolean) {
  try {
    const seen = Date.parse(String((d.audio_job as Job | null)?.seen_at ?? ''));
    if (!pushConfigured || (seen && Date.now() - seen < 20_000) || (d as { brief?: { check?: boolean } }).brief?.check) return;
    const subs = await subscriptionsForUsers([d.created_by]);
    if (!subs.length) return;
    await sendToSubscriptions(subs, {
      kind: 'general',
      title: ok ? 'Your song is ready 🎶' : "The music couldn't be made",
      body: ok ? `“${d.title}” has its full recording. Tap to listen.` : `“${d.title}”: please try Make the full song again in a little while.`,
      url: `/groups/choir/${encodeURIComponent(d.location ?? 'national')}/compose?song=${id}`,
      tag: `song-${id}`,
      data: { songId: id },
    }, { ttl: 60 * 60 * 24, urgency: 'normal' });
  } catch (e) {
    console.error('[song-writer] notify failed', String(e));
  }
}

// ── The church's own ACE-Step server (music-server/ace_step.py on Modal) ──
/** Its address and key, saved by the "Deploy music server" workflow (platform entry in Vault) */
const PLATFORM_CHURCH = '00000000-0000-0000-0000-000000000000';
interface Server { url: string; key: string; separate?: string; studio?: string }
async function musicServer(): Promise<Server | null> {
  const { data } = await supabaseAdmin.rpc('service_key' as never, { _church: PLATFORM_CHURCH, _service: 'acestep' } as never);
  try {
    const v = typeof data === 'string' ? JSON.parse(data) : null;
    return v?.url && v?.key
      ? { url: String(v.url).replace(/\/$/, ''), key: String(v.key), separate: v.separate ? String(v.separate) : undefined, studio: v.studio ? String(v.studio).replace(/\/$/, '') : undefined }
      : null;
  } catch {
    return null;
  }
}

/**
 * The server a song is made on: the studio one (music-server/ace_step.py `studio`: the full
 * XL model at 50 steps with the 4B planner) for Studio quality songs, when it's set up;
 * otherwise the everyday one. Same key for both.
 */
const serverFor = (srv: Server, studio: boolean): Server => (studio && srv.studio ? { ...srv, url: srv.studio } : srv);
const wantsStudio = (srv: Server, brief: Brief) => brief.quality === 'studio' && !!srv.studio;

/**
 * Does this church make its music in studio quality? On unless a church admin switched it
 * off in Compose a song → Advanced settings (church_compose_settings; no row = on).
 */
async function churchStudio(churchId: string | null | undefined): Promise<boolean> {
  if (!churchId) return true;
  const { data, error } = await supabaseAdmin.from('church_compose_settings' as never).select('studio').eq('church_id', churchId).maybeSingle();
  if (error || !data) return true;
  return (data as { studio: boolean }).studio !== false;
}

/** Sends the song to the server (it answers at once with a task; asleep, it first wakes up) */
async function serverSubmit(srv: Server, song: Song, brief: Brief, timeoutMs: number, studio = false): Promise<{ taskId?: string; error?: string; timedOut?: boolean }> {
  const body: Record<string, unknown> = {
    prompt: aceCaption(song, brief),
    lyrics: aceLyrics(song),
    thinking: true,
    vocal_language: aceLanguage(brief),
    audio_duration: aceSeconds(song),
    batch_size: 1,
    audio_format: 'mp3',
    use_random_seed: true,
  };
  // The full (non-turbo) model needs its proper number of steps (its default is the turbo's 8)
  if (studio) body.inference_steps = 50;
  if (song.bpm) body.bpm = Math.round(song.bpm);
  if (aceKey(song.key)) body.key_scale = aceKey(song.key);
  if (aceTime(song.time_signature)) body.time_signature = aceTime(song.time_signature);
  try {
    const res = await fetch(`${srv.url}/release_task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${srv.key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) return { error: `music server ${res.status}: ${text.slice(0, 200)}` };
    const taskId = JSON.parse(text)?.data?.task_id;
    return taskId ? { taskId: String(taskId) } : { error: `music server: no task (${text.slice(0, 160)})` };
  } catch (e) {
    const timedOut = /timeout|abort/i.test(String(e));
    return timedOut ? { timedOut: true } : { error: `music server: ${String(e).slice(0, 120)}` };
  }
}

/**
 * Is the server up with its models loaded? A song sent while they were still loading hung
 * for minutes, so songs are only sent once /health says both are loaded ('ready'); the
 * server loads them itself as soon as it starts (warm_up in music-server/ace_step.py).
 */
async function serverReady(srv: Server): Promise<'ready' | 'loading' | 'waking'> {
  try {
    const res = await fetch(`${srv.url}/health`, { headers: { Authorization: `Bearer ${srv.key}` }, signal: AbortSignal.timeout(15_000), redirect: 'manual' });
    if (!res.ok) return 'waking';
    const d = (await res.json())?.data ?? {};
    return d.models_initialized && d.llm_initialized ? 'ready' : 'loading';
  } catch {
    return 'waking';
  }
}

/**
 * Wakes the server a church's music will be made on, so it's loading its models while
 * the song is being written and read (a song sent to a sleeping studio took ~4½ minutes,
 * to an awake one ~2). Asking /health is enough: the server loads its models as it starts.
 */
async function warmServer(churchId: string | null | undefined) {
  try {
    const srv = await musicServer();
    if (!srv) return;
    const use = serverFor(srv, await churchStudio(churchId));
    await fetch(`${use.url}/health`, { headers: { Authorization: `Bearer ${use.key}` }, signal: AbortSignal.timeout(90_000), redirect: 'manual' }).then((r) => r.body?.cancel());
  } catch {
    /* still waking: the request itself started it */
  }
}
const inBackground = (work: Promise<unknown>) => {
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);
};

/** One look at a task: still making (0), done (1, with the song), failed (2), or unknown to the server */
async function serverQuery(srv: Server, taskId: string): Promise<{ state: 'making' | 'done' | 'failed' | 'lost'; made?: Made }> {
  try {
    const res = await fetch(`${srv.url}/query_result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${srv.key}` },
      body: JSON.stringify({ task_id_list: [taskId] }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { state: 'making' };
    const row = (await res.json())?.data?.[0];
    if (!row) return { state: 'lost' };
    if (row.status === 0) return { state: 'making' };
    if (row.status !== 1) return { state: 'failed', made: { error: `music server: ${String(row.error ?? row.result ?? 'failed').slice(0, 300)}` } };
    const results = typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
    const file = (Array.isArray(results) ? results : []).find((r: { file?: string }) => r?.file)?.file as string | undefined;
    if (!file) return { state: 'failed', made: { error: 'music server: no song in the result' } };
    const audio = await fetch(file.startsWith('http') ? file : `${srv.url}${file}`, { headers: { Authorization: `Bearer ${srv.key}` }, signal: AbortSignal.timeout(60_000) });
    if (!audio.ok) return { state: 'making' };
    const bytes = new Uint8Array(await audio.arrayBuffer());
    console.log(`[song-writer] music server made ${Math.round(bytes.length / 1024)} KB`);
    return { state: 'done', made: { audio: bytes, mime: (audio.headers.get('content-type') ?? 'audio/mpeg').split(';')[0] } };
  } catch {
    return { state: 'making' };
  }
}

interface Job {
  service: 'acestep';
  task_id?: string;
  submitted_at: string;
  /** Last time the server-side watcher looked (it keeps going with nobody on the page) */
  watched_at?: string;
  /** Last time the writer's page asked (they're looking at it) */
  seen_at?: string;
  /** When the song was last sent (sent again only 2 minutes later, never twice at once) */
  sent_at?: string;
  /** Made on the studio server (Studio quality): every look and resend goes there too */
  studio?: boolean;
}
/** Adds fields to the draft's job, keeping the rest */
async function touchJob(id: string, patch: Partial<Job>) {
  const { data } = await supabaseAdmin.from('song_drafts').select('audio_job, audio_status').eq('id', id).maybeSingle();
  if (data?.audio_status !== 'making' || !data.audio_job) return;
  await supabaseAdmin.from('song_drafts').update({ audio_job: { ...(data.audio_job as Job), ...patch } }).eq('id', id);
}
const setJob = (id: string, job: Job | null) => supabaseAdmin.from('song_drafts').update({ audio_job: job }).eq('id', id);

/** Looks at the draft's task once; stores the song when it's ready. True when finished either way. */
async function collect(id: string, churchId: string, srv: Server, taskId: string, studio = false): Promise<boolean> {
  const r = await serverQuery(srv, taskId);
  if (r.state === 'making') return false;
  if (r.state === 'lost') {
    // The server restarted (e.g. it hung and its watchdog restarted it): send the song
    // again on the phone's next check (no task id, and "sent" long enough ago)
    console.log('[song-writer] music server lost the song; sending it again');
    await setJob(id, { service: 'acestep', submitted_at: new Date(0).toISOString(), ...(studio && { studio }) });
  } else await finish(id, churchId, r.made!);
  return true;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One step for a song on the music server: store it if it's ready, send it again if the
 * server was waking up (no task after 2 minutes) or lost it, give up after 25 minutes.
 * True when the music is finished (ready or failed).
 */
async function advance(id: string): Promise<boolean> {
  const { data: draft } = await supabaseAdmin.from('song_drafts').select('*').eq('id', id).maybeSingle();
  if (!draft || draft.audio_status !== 'making') return true;
  const job = draft.audio_job as Job | null;
  const age = Date.now() - Date.parse(draft.music_requested_at ?? draft.updated_at);
  if (age > MAKING_LIMIT_MS || (!job && age > 5 * 60_000)) {
    await finish(id, draft.church_id, { error: 'The music took too long. Please try again.' });
    return true;
  }
  if (job?.service !== 'acestep') return false;
  const main = await musicServer();
  if (!main) {
    await finish(id, draft.church_id, { error: NOT_SET_UP });
    return true;
  }
  const studio = !!job.studio && !!main.studio;
  const srv = serverFor(main, studio);
  if (job.task_id) return collect(id, draft.church_id, srv, job.task_id, studio);
  // Not sent yet (or a send got no answer 2 minutes ago): send it once the server is ready
  if (job.sent_at && Date.now() - Date.parse(job.sent_at) < 120_000) return false;
  if ((await serverReady(srv)) !== 'ready') return false;
  const sent = new Date().toISOString();
  await setJob(id, { ...job, service: 'acestep', sent_at: sent });
  const sub = await serverSubmit(srv, draft.song as Song, draft.brief as Brief, 60_000, studio);
  if (sub.taskId) await setJob(id, { ...job, service: 'acestep', task_id: sub.taskId, submitted_at: new Date().toISOString(), sent_at: sent });
  else if (!sub.timedOut) {
    await finish(id, draft.church_id, { error: sub.error });
    return true;
  }
  return false;
}

/**
 * Keeps an eye on the song from the server, so it's finished and stored even with nobody
 * on the page (the phone's checks used to be the only thing collecting it, and the music
 * server sleeps 5 minutes after the last request, losing the song). Each run watches for
 * about two minutes, then hands over to a fresh run of this function (`watch` action),
 * until the song is ready, failed, or 25 minutes old.
 */
async function watch(id: string, started = Date.now()) {
  // A run may last ~150 s in all; a step can take ~20 s (a server check, or storing a song),
  // so hand over to a fresh run in good time (a run cut off mid-step never handed over)
  while (Date.now() - started < 85_000) {
    if (await advance(id)) return;
    await touchJob(id, { watched_at: new Date().toISOString() });
    await pause(5_000);
  }
  await relay(id);
}

const FUNCTION_URL = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1/song-writer`;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
/** Hands the watching over to a fresh run (the watch action answers at once, then watches) */
async function relay(id: string) {
  try {
    const r = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY, 'x-watch-key': SERVICE_KEY },
      body: JSON.stringify({ action: 'watch', draftId: id }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) console.error('[song-writer] watch hand-over refused', r.status);
  } catch (e) {
    console.error('[song-writer] watch hand-over failed', String(e));
  }
}

/**
 * Makes the music in the background. The church's own server first: the song is sent,
 * then watched while the function has time; the phone's checks (music-check) carry on
 * after that, and send it again if the server was still waking up. Otherwise the other
 * services, all at once.
 */
async function produce(id: string, churchId: string, song: Song, brief: Brief) {
  const started = Date.now();
  const main = await musicServer();
  if (main) {
    // Studio quality goes to the studio server (and stays there: the job remembers it)
    const studio = wantsStudio(main, brief);
    const srv = serverFor(main, studio);
    const on = studio ? { studio } : {};
    await setJob(id, { service: 'acestep', submitted_at: new Date().toISOString(), ...on });
    // Waking up or still loading its models: the watcher sends it as soon as it's ready
    if ((await serverReady(srv)) !== 'ready') return watch(id, started);
    const sent = new Date().toISOString();
    await setJob(id, { service: 'acestep', submitted_at: sent, sent_at: sent, ...on });
    const sub = await serverSubmit(srv, song, brief, 60_000, studio);
    if (sub.taskId) {
      await setJob(id, { service: 'acestep', task_id: sub.taskId, submitted_at: new Date().toISOString(), sent_at: sent, ...on });
      return watch(id, started);
    }
    // Still waking up: the watcher sends it again
    if (sub.timedOut) return watch(id, started);
    console.error('[song-writer] music server refused', sub.error);
    await setJob(id, null);
    if (Date.now() - started > 20_000) return finish(id, churchId, { error: sub.error });
  }
  await finish(id, churchId, await makeMusic(song, brief, churchId));
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
    const brief = briefFrom({ theme: typeof input.theme === 'string' ? input.theme : 'Thanksgiving for God\'s faithfulness through a hard year', style: typeof input.style === 'string' ? input.style : 'gospel_choir', feel: 'mid', language: input.language, languageMode: input.languageMode, notes: input.notes, voice: input.voice, quality: input.studio ? 'studio' : undefined })!;
    const out: Record<string, unknown> = { gemini: !!GEMINI, openai: !!OPENAI, elevenlabs: !!ELEVEN, acemusic_env: !!ENV_KEYS.acemusic, huggingface_env: !!ENV_KEYS.huggingface, models_in_order: MODELS };
    // {"cleanChecks": true}: removes the test songs kept by earlier checks (app storage)
    if (input.cleanChecks) {
      const { data: files } = await supabaseAdmin.storage.from('song-drafts').list('checks', { limit: 1000 });
      const paths = (files ?? []).map((f: { name: string }) => `checks/${f.name}`);
      if (paths.length) await supabaseAdmin.storage.from('song-drafts').remove(paths);
      out.cleaned = paths.length;
    }
    out.r2 = !!r2();
    // {"audioOf": "<draft id>", "version": "full"|"music"|"voices"}: a recording, as base64
    if (typeof input.audioOf === 'string') {
      const { data: d } = await supabaseAdmin.from('song_drafts').select('audio_url, instrumental_url, vocals_url').eq('id', input.audioOf).maybeSingle();
      const url = input.version === 'music' ? d?.instrumental_url : input.version === 'voices' ? d?.vocals_url : d?.audio_url;
      if (!url) return json({ ...out, error: 'No such recording' });
      return json({ audio: toBase64(new Uint8Array(await (await fetch(url)).arrayBuffer())) });
    }
    // {"health": true}: what the music server says right now, and how long it took
    if (input.health) {
      // {"health": true, "studio": true} asks the studio server
      const main = await musicServer();
      const srv = main && serverFor(main, !!input.studio);
      if (srv) {
        const t0 = Date.now();
        try {
          const res = await fetch(`${srv.url}/health`, { headers: { Authorization: `Bearer ${srv.key}` }, signal: AbortSignal.timeout(100_000), redirect: 'manual' });
          out.health = { status: res.status, seconds: Math.round((Date.now() - t0) / 1000), body: (await res.text()).slice(0, 400), ready: await serverReady(srv) };
        } catch (e) {
          out.health = { error: String(e).slice(0, 200), seconds: Math.round((Date.now() - t0) / 1000) };
        }
        out.separate_url = !!srv.separate;
      }
    }
    // {"stemsOf": "<draft id>"}: makes that song's music only / voices only now
    if (typeof input.stemsOf === 'string') {
      const t0 = Date.now();
      out.stems = await makeStems(input.stemsOf, 130_000);
      out.stems_seconds = Math.round((Date.now() - t0) / 1000);
    }
    // {"sectionsOf": "<draft id>"}: times that song's sections (shown, not saved)
    if (typeof input.sectionsOf === 'string') {
      const { data: d } = await supabaseAdmin.from('song_drafts').select('song, audio_url').eq('id', input.sectionsOf).maybeSingle();
      const song = validSong(d?.song);
      if (!song || !d?.audio_url) return json({ ...out, error: 'No such song with music' });
      const res = await fetch(d.audio_url);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const t0 = Date.now();
      out.sections = await timeSections(bytes, (res.headers.get('content-type') ?? 'audio/mpeg').split(';')[0], song, 100_000);
      out.sections_seconds = Math.round((Date.now() - t0) / 1000);
      out.song_sections = song.sections.map((s) => `${s.name} (${s.lines.length})`);
    }
    // {"watchTest": true, "song": …}: a hidden test draft whose music is made with nobody on
    // the page (only the server-side watcher collects it); {"watchTest": "<id>"} removes it
    if (input.watchTest === true) {
      const song = validSong(input.song);
      const { data: owner } = await supabaseAdmin.from('user_roles').select('user_id, church_id').eq('is_active', true).in('role', ['administrator', 'pastor']).limit(1).maybeSingle();
      if (!song || !owner) return json({ ...out, error: 'Give a song' });
      const { data: d, error } = await supabaseAdmin.from('song_drafts').insert({
        created_by: owner.user_id, church_id: owner.church_id, location: null, title: `Check: ${song.title}`, song,
        brief: { ...brief, check: true }, shared: false, audio_status: 'making', music_requested_at: new Date().toISOString(),
      }).select('id').single();
      if (error || !d) return json({ ...out, error: error?.message });
      const work = produce(d.id, owner.church_id, song, brief);
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);
      return json({ ...out, watchTest: d.id });
    }
    if (typeof input.watchTest === 'string') {
      const { data: d } = await supabaseAdmin.from('song_drafts').select('id, audio_url, brief').eq('id', input.watchTest).maybeSingle();
      if (!(d?.brief as { check?: boolean } | null)?.check) return json({ ...out, error: 'Not a test draft' });
      // {"watchTest": "<id>", "peek": true}: how it's going, without removing it
      if (input.peek) {
        const { data: p } = await supabaseAdmin.from('song_drafts').select('audio_status, audio_url, audio_error, audio_job, music_requested_at, updated_at').eq('id', d!.id).maybeSingle();
        return json({ ...out, peek: p });
      }
      const { data: urls } = await supabaseAdmin.from('song_drafts').select('instrumental_url, vocals_url').eq('id', d!.id).maybeSingle();
      if (d!.audio_url) await removeAudio(d!.audio_url);
      await removeAudio(urls?.instrumental_url);
      await removeAudio(urls?.vocals_url);
      await supabaseAdmin.from('song_drafts').delete().eq('id', d!.id);
      return json({ ...out, removed: d!.id });
    }
    // {"cors": "<app address>"}: can the app fetch a song file from R2 (needed to save it on iPhone)?
    if (typeof input.cors === 'string' && R2.domain) {
      const { data: row } = await supabaseAdmin.from('song_drafts').select('audio_url').like('audio_url', `${R2.domain}%`).limit(1).maybeSingle();
      if (row?.audio_url) {
        const r = await fetch(row.audio_url, { method: 'GET', headers: { Origin: input.cors, Range: 'bytes=0-15' } });
        out.cors = { status: r.status, allow_origin: r.headers.get('access-control-allow-origin'), type: r.headers.get('content-type') };
        await r.body?.cancel();
      }
    }
    // {"storage": true}: how much the R2 bucket holds, by top folder (chat-media, songs, lyrics…)
    // {"stemsReport": true}: how each song with music was split (null = the old Demucs split)
    if (input.stemsReport) {
      const { data } = await supabaseAdmin.from('song_drafts').select('id, title, stems_model, stems_at, instrumental_url, created_at').eq('audio_status', 'ready').order('created_at', { ascending: false }).limit(40);
      out.stems = (data ?? []).map((d) => ({ id: d.id, title: String(d.title ?? '').slice(0, 40), model: d.stems_model, has: !!d.instrumental_url, claim: d.stems_at, made: d.created_at }));
    }
    if (input.storage && r2()) {
      const u = await r2Usage();
      out.storage = { total_mb: Math.round(u.bytes / 1048576), free_gb: 10, folders: Object.fromEntries(u.folders.map((f) => [f.folder, { files: f.files, mb: Math.round(f.bytes / 104857.6) / 10 }])) };
    }
    if (input.services) {
      const { data: rows } = await supabaseAdmin.from('church_service_keys' as never).select('church_id, service, hint, updated_at');
      out.connected = rows;
    }
    if (input.models && GEMINI) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': GEMINI } });
      const d = await r.json().catch(() => ({}));
      out.models = (d.models ?? [])
        .filter((m: { supportedGenerationMethods?: string[] }) => input.models === 'all' || m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: { name: string; supportedGenerationMethods?: string[]; description?: string }) =>
          input.models === 'all' ? `${m.name.replace('models/', '')} [${(m.supportedGenerationMethods ?? []).join(',')}]${/music|lyria|song|audio/i.test(`${m.name} ${m.description ?? ''}`) ? ' — ' + (m.description ?? '').slice(0, 160) : ''}` : m.name.replace('models/', ''));
    }
    if (input.write) {
      const t0 = Date.now();
      const r = await writeSong(brief, typeof input.model === 'string' ? input.model : undefined);
      out.write_seconds = Math.round((Date.now() - t0) / 1000);
      out.write = r.song ? { ok: true, revised: (r as { revised?: boolean }).revised, title: r.song.title, sections: r.song.sections.map((s) => s.name), first: r.song.sections[0]?.lines.slice(0, 2) } : r;
      if (r.song) out.song = r.song;
    }
    // The church's own server: {"server": true} sends a song (input.song, or the last one
    // written above), {"server": true, "taskId": "…"} looks at it again and stores it when ready
    if (input.server) {
      const main = await musicServer();
      const studio = !!input.studio && !!main?.studio;
      const srv = main && serverFor(main, studio);
      out.server = srv ? { url: srv.url, studio } : null;
      if (srv) {
        const t0 = Date.now();
        let taskId = typeof input.taskId === 'string' ? input.taskId : '';
        if (!taskId) {
          const song = validSong(input.song) ?? (out.song as Song | undefined);
          if (!song) return json({ ...out, error: 'Give a song (or write one with "write": true).' });
          const sub = await serverSubmit(srv, song, brief, 100_000, studio);
          out.submit = { ...sub, seconds: Math.round((Date.now() - t0) / 1000) };
          taskId = sub.taskId ?? '';
        }
        while (taskId && Date.now() - t0 < 130_000) {
          const r = await serverQuery(srv, taskId);
          if (r.state !== 'making') {
            if (r.made?.audio) {
              const url = await storeAudio(`checks/${Date.now()}.mp3`, r.made.audio, r.made.mime ?? 'audio/mpeg');
              out.music = { ok: true, kb: Math.round(r.made.audio.length / 1024), url };
            } else out.music = { state: r.state, ...r.made };
            break;
          }
          await pause(4_000);
        }
        out.task_id = taskId;
        out.seconds = Math.round((Date.now() - t0) / 1000);
      }
    }
    if (input.music) {
      // A short two-section test (about half a minute)
      const t0 = Date.now();
      const test: Song = { title: 'Test', key: 'G', bpm: 84, time_signature: '4/4', feel: '', scripture: [], summary: '', sections: [
        { name: 'Verse', lines: ['[G]You were faithful in the [C]morning', '[Em]You were faithful through the [D]night'] },
        { name: 'Chorus', lines: ['[G]Great is Your [D]faithfulness', '[C]Lord, I will [G]sing'] },
      ], arrangement: { choir: '', band: '' }, music_style: 'warm gospel choir with piano and organ' };
      // The church's connected service (the one given, else any church that connected one)
      let churchId = clean(input.churchId, 40);
      if (!churchId) {
        const { data: anyKey } = await supabaseAdmin.from('church_service_keys' as never).select('church_id').limit(1).maybeSingle();
        churchId = (anyKey as { church_id?: string } | null)?.church_id ?? '';
      }
      const only = typeof input.service === 'string' ? input.service : typeof input.musicModel === 'string' ? input.musicModel : undefined;
      const m = await makeMusic(input.song ? (validSong(input.song) ?? test) : test, brief, churchId || null, only);
      if (m.audio) {
        const mime = (m.mime ?? 'audio/mpeg').split(';')[0];
        const url = await storeAudio(`checks/${Date.now()}.${EXT[mime] ?? 'mp3'}`, m.audio, mime);
        out.music = { ok: true, mime, kb: Math.round(m.audio.length / 1024), seconds: Math.round((Date.now() - t0) / 1000), url };
      } else out.music = m;
    }
    return json(out);
  }

  // The database's minute-by-minute safety net (cron job song-music-watch): carries on every
  // song being made whose watcher has stopped, and gives new songs their music-only /
  // voices-only versions and part times if those didn't finish. Only moves songs along
  // that are already under way, so it needs no account.
  if (input.action === 'watch-all') {
    const work = (async () => {
      const runs: Promise<unknown>[] = [];
      const { data: making } = await supabaseAdmin.from('song_drafts').select('id, audio_job').eq('audio_status', 'making').limit(10);
      for (const d of making ?? []) {
        const job = d.audio_job as Job | null;
        const watched = Date.parse(job?.watched_at ?? '');
        if (job?.service !== 'acestep' || (watched && Date.now() - watched < 30_000)) continue;
        await touchJob(d.id, { watched_at: new Date().toISOString() });
        runs.push(watch(d.id));
      }
      const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
      const { data: ready } = await supabaseAdmin
        .from('song_drafts')
        .select('id, instrumental_url, audio_sections')
        .eq('audio_status', 'ready')
        .not('audio_url', 'is', null)
        .gt('updated_at', dayAgo)
        .or('instrumental_url.is.null,audio_sections.is.null')
        .limit(4);
      for (const d of ready ?? []) {
        if (!d.instrumental_url) runs.push(makeStems(d.id, 110_000));
        if (d.audio_sections === null) runs.push(sectionsFor(d.id, 90_000));
      }
      // Songs still on the old split (Demucs) are split again, two at a time
      const { data: old } = await supabaseAdmin
        .from('song_drafts')
        .select('id')
        .eq('audio_status', 'ready')
        .not('audio_url', 'is', null)
        .not('instrumental_url', 'is', null)
        .is('stems_model', null)
        .gt('created_at', new Date(Date.now() - 60 * 86_400_000).toISOString())
        .limit(2);
      for (const d of old ?? []) if (!(ready ?? []).some((r) => r.id === d.id)) runs.push(makeStems(d.id, 110_000));
      await Promise.all(runs);
    })();
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);
    else await work;
    return json({ ok: true });
  }

  // A fresh run carrying on watching a song's music (from relay(); service key only)
  if (input.action === 'watch') {
    if (!SERVICE_KEY || req.headers.get('x-watch-key') !== SERVICE_KEY) return json({ error: 'Not allowed' }, 403);
    const id = clean(input.draftId, 40);
    const work = watch(id);
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);
    else await work;
    return json({ ok: true });
  }

  const user = await getRequestUser(req);
  if (!user) return json({ error: 'Sign in to compose songs.' }, 401);

  // The page asks for this when a song with no music yet is opened: the studio starts waking
  if (input.action === 'warm') {
    inBackground(warmServer(clean(input.churchId, 40) || null));
    return json({ ok: true });
  }

  if (input.action === 'write') {
    const brief = briefFrom(input);
    if (!brief) return json({ error: 'Say what the song is about.' }, 400);
    // The music server wakes while the words are written
    inBackground(warmServer(clean(input.churchId, 40) || null));
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

  // ── The church's music service (church admins connect it once) ──
  if (input.action === 'music-service' || input.action === 'connect-music' || input.action === 'disconnect-music' || input.action === 'compose-settings') {
    const churchId = clean(input.churchId, 40);
    if (!/^[0-9a-f-]{36}$/i.test(churchId)) return json({ error: 'Open the app for your church first.' }, 400);
    const [{ data: member }, { data: roles }] = await Promise.all([
      supabaseAdmin.from('church_members').select('church_id').eq('church_id', churchId).eq('user_id', user.id).eq('status', 'active').maybeSingle(),
      supabaseAdmin.from('user_roles').select('id').eq('user_id', user.id).eq('church_id', churchId).eq('is_active', true).in('role', ['administrator', 'pastor']).limit(1),
    ]);
    const canManage = Array.isArray(roles) && roles.length > 0;
    if (!member && !canManage) return json({ error: 'Only members of this church can see this.' }, 403);
    const status = async () => {
      const { data: rows } = await supabaseAdmin.from('church_service_keys' as never).select('service, hint, updated_at').eq('church_id', churchId);
      const services = ((rows ?? []) as { service: Service; hint: string | null; updated_at: string }[]).map((r) => ({ service: r.service, hint: canManage ? r.hint : null, updated_at: r.updated_at }));
      const own = await musicServer();
      return { services, canManage, studio: await churchStudio(churchId), platform: { acestep: !!own, studio: !!own?.studio, acemusic: !!ENV_KEYS.acemusic, huggingface: !!ENV_KEYS.huggingface, lyria: !!GEMINI, elevenlabs: !!ELEVEN } };
    };
    if (input.action === 'music-service') return json(await status());
    if (!canManage) return json({ error: 'Only a church admin can change the music service.' }, 403);

    // Advanced settings → Studio quality music, for everyone composing at this church
    if (input.action === 'compose-settings') {
      const { error } = await supabaseAdmin
        .from('church_compose_settings' as never)
        .upsert({ church_id: churchId, studio: input.studio !== false, updated_by: user.id, updated_at: new Date().toISOString() } as never, { onConflict: 'church_id' });
      if (error) return json({ error: "Couldn't save that. Please try again." }, 500);
      return json(await status());
    }

    if (input.action === 'disconnect-music') {
      const service = input.service === 'huggingface' ? 'huggingface' : 'acemusic';
      const { error } = await supabaseAdmin.rpc('remove_service_key' as never, { _church: churchId, _service: service } as never);
      if (error) return json({ error: "Couldn't remove it. Please try again." }, 500);
      return json(await status());
    }

    // A key is checked with its service before it's kept (a Hugging Face token starts hf_)
    const key = String(input.key ?? '').trim().replace(/^Bearer\s+/i, '');
    if (key.length < 8 || key.length > 400 || /\s/.test(key)) return json({ error: 'Paste the whole key, with nothing else.' }, 400);
    const service: Service = key.startsWith('hf_') ? 'huggingface' : 'acemusic';
    if (service === 'acemusic') {
      const r = await aceModels(key);
      if (r.status === 401 || r.status === 403) return json({ error: "ACE Music didn't accept that key. Copy it again from your ACE Music account." }, 400);
      if (!r.ok) return json({ error: "Couldn't reach ACE Music just now. Please try again in a minute." }, 503);
      console.log(`[song-writer] ACE Music key connected for ${churchId}; models: ${r.models.join(', ')}`);
    } else {
      const r = await fetch('https://huggingface.co/api/whoami-v2', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
      if (r && (r.status === 401 || r.status === 403)) return json({ error: "Hugging Face didn't accept that token. Make a new one and copy it again." }, 400);
      if (!r?.ok) return json({ error: "Couldn't reach Hugging Face just now. Please try again in a minute." }, 503);
    }
    const { error } = await supabaseAdmin.rpc('put_service_key' as never, { _church: churchId, _service: service, _key: key, _by: user.id } as never);
    if (error) {
      console.error('[song-writer] saving the key failed', error.message);
      return json({ error: "Couldn't save it. Please try again." }, 500);
    }
    return json({ ...(await status()), connected: service });
  }

  if (input.action === 'music') {
    const id = clean(input.draftId, 40);
    const { data: draft } = await supabaseAdmin.from('song_drafts').select('*').eq('id', id).maybeSingle();
    if (!draft || draft.created_by !== user.id) return json({ error: 'Only the song\'s writer can make its music.' }, 403);
    if (draft.audio_status === 'making' && draft.music_requested_at && Date.now() - Date.parse(draft.music_requested_at) < MAKING_LIMIT_MS) {
      return json({ error: 'The music is already being made.' }, 409);
    }
    // The lead voice chosen for this music is kept with the song (so a retry, or making it
    // again, uses the same voice)
    const before = (draft.brief ?? {}) as Brief;
    const voice = input.voice === undefined ? voiceOf(before.voice) : voiceOf(input.voice);
    // Auto takes turns between a female and a male lead (music models otherwise mostly pick a man)
    // Studio quality is the church's choice (an admin's Advanced settings; on by default),
    // not the phone's; kept in the brief for retries and resends
    const quality = (await churchStudio(draft.church_id as string)) ? 'studio' : undefined;
    const brief: Brief = { ...before, voice, sung: voice === 'auto' ? autoPick(before.sung) : undefined, quality };
    const { data: making } = await supabaseAdmin
      .from('song_drafts')
      .update({ brief, audio_status: 'making', audio_error: null, audio_job: null, music_requested_at: new Date().toISOString() })
      .eq('id', id).select('*').single();
    // Made in the background: the phone gets an answer at once and watches the draft
    const work = produce(id, draft.church_id as string, draft.song as Song, brief);
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);
    else await work;
    return json({ draft: making });
  }

  // Me → Admin → Storage: how full the media store (R2) is. Church admins only.
  if (input.action === 'storage') {
    const churchId = clean(input.churchId, 40);
    const { data: roles } = await supabaseAdmin.from('user_roles').select('id').eq('user_id', user.id).eq('church_id', churchId).eq('is_active', true).in('role', ['administrator', 'pastor']).limit(1);
    if (!Array.isArray(roles) || !roles.length) return json({ error: 'Only church admins can see this.' }, 403);
    if (!r2()) return json({ r2: null });
    try {
      return json({ r2: { ...(await r2Usage()), limit_bytes: 10 * 1024 ** 3 } });
    } catch (e) {
      console.error('[song-writer] storage listing failed', String(e).slice(0, 200));
      return json({ error: "Couldn't read the media store just now." }, 503);
    }
  }

  // Deleting a song also removes its audio (so storage never fills with songs nobody has)
  if (input.action === 'delete') {
    const id = clean(input.draftId, 40);
    const { data: draft } = await supabaseAdmin.from('song_drafts').select('id, created_by, audio_url, instrumental_url, vocals_url').eq('id', id).maybeSingle();
    if (!draft || draft.created_by !== user.id) return json({ error: 'Only the song\'s writer can delete it.' }, 403);
    const { error } = await supabaseAdmin.from('song_drafts').delete().eq('id', id);
    if (error) return json({ error: "Couldn't delete it. Please try again." }, 500);
    await removeAudio(draft.audio_url);
    await removeAudio(draft.instrumental_url);
    await removeAudio(draft.vocals_url);
    return json({ deleted: true });
  }

  // The phone asks every few seconds while a song is being made: the server's task is
  // looked at (and sent again if the server was still waking up when it was first sent)
  // Music only / voices only for a song that has none yet: makes them (or says it's busy)
  if (input.action === 'stems') {
    const id = clean(input.draftId, 40);
    const { data: draft } = await supabaseAdmin.from('song_drafts').select('created_by, shared').eq('id', id).maybeSingle();
    if (!draft || (draft.created_by !== user.id && !draft.shared)) return json({ error: 'Not found' }, 404);
    const state = await makeStems(id, 130_000);
    const { data: after } = await supabaseAdmin.from('song_drafts').select('instrumental_url, vocals_url').eq('id', id).maybeSingle();
    return json({ state, instrumental_url: after?.instrumental_url ?? null, vocals_url: after?.vocals_url ?? null });
  }

  // Listen by part: time the sections of a song whose recording has none yet
  if (input.action === 'sections') {
    const id = clean(input.draftId, 40);
    const { data: draft } = await supabaseAdmin.from('song_drafts').select('id, created_by, shared, audio_url, audio_status, audio_sections').eq('id', id).maybeSingle();
    if (!draft || (draft.created_by !== user.id && !draft.shared)) return json({ error: 'Not found' }, 404);
    const has = Array.isArray(draft.audio_sections) && draft.audio_sections.length > 0;
    if (has || draft.audio_status !== 'ready' || !draft.audio_url) return json({ sections: has ? draft.audio_sections : null });
    await sectionsFor(id, 90_000);
    const { data: after } = await supabaseAdmin.from('song_drafts').select('audio_sections').eq('id', id).maybeSingle();
    return json({ sections: Array.isArray(after?.audio_sections) && after.audio_sections.length ? after.audio_sections : null });
  }

  if (input.action === 'music-check') {
    const id = clean(input.draftId, 40);
    const load = async () => (await supabaseAdmin.from('song_drafts').select('*').eq('id', id).maybeSingle()).data;
    const draft = await load();
    if (!draft || (draft.created_by !== user.id && !draft.shared)) return json({ error: 'Not found' }, 404);
    if (draft.audio_status !== 'making') return json({ draft });
    const job = draft.audio_job as Job | null;
    if (draft.created_by === user.id) await touchJob(id, { seen_at: new Date().toISOString() });
    // The server-side watcher does the work while it's alive; the page's checks take over
    // (and start a new watcher) only if it stopped
    const watched = Date.parse(job?.watched_at ?? '');
    if (!(watched && Date.now() - watched < 30_000)) {
      if (!(await advance(id)) && typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
        await touchJob(id, { watched_at: new Date().toISOString() });
        EdgeRuntime.waitUntil(watch(id));
      }
    }
    return json({ draft: await load() });
  }

  return json({ error: 'Unknown action' }, 400);
});
