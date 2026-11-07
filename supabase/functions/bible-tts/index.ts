// Reads a short piece of Bible text aloud (the cloud voice for phones).
// Returns a complete WAV file (24 kHz, 16-bit mono).
//
// First the church's own voice, then Google (Lovable AI was removed, Nov 2026):
//   0. Kept pieces: every piece the own voice has read is kept in the media store (R2,
//      tts/<voice>/<sha256>.mp3), so each is read only once for everybody. The answer is
//      then {"url": …} and the phone fetches the MP3 straight from the store.
//   0b. The church's own voice: Kokoro-82M (open source) on the music server (Modal,
//      `speak` in music-server/ace_step.py; its address is in the Vault entry `acestep`).
//      No daily allowance; the piece is stored, then {"url": …}.
// Then, only if that fails, in this order, moving on when one fails:
//   1. Google Cloud Text-to-Speech, Chirp 3 HD voices (the same voices: Charon, Kore, …),
//      with GOOGLE_TTS_API_KEY, or else the GEMINI_API_KEY (a Google Cloud key too: it
//      works here once the Text-to-Speech API is enabled on its project, with billing).
//      Far higher limits than Gemini's free tier. GOOGLE_TTS_LANGUAGE picks the accent
//      (default en-GB).
//   2. GEMINI_API_KEY: Google's Gemini speech model (aistudio.google.com; the free tier
//      has a small daily allowance).
// A signed {"check": true} (SEND_EMAIL_HOOK_SECRET) tries each and reports why one fails.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.540.0';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
const VOICES = new Set(['Charon', 'Orus', 'Iapetus', 'Fenrir', 'Puck', 'Kore', 'Aoede', 'Leda', 'Zephyr', 'Callirrhoe']);
/** The app's voices → Kokoro voices of the same kind (mostly British, for an Irish church) */
const KOKORO: Record<string, string> = {
  Charon: 'bm_george', Orus: 'am_michael', Iapetus: 'bm_fable', Fenrir: 'bm_lewis', Puck: 'am_puck',
  Kore: 'bf_emma', Aoede: 'af_heart', Leda: 'bf_isabella', Zephyr: 'af_bella', Callirrhoe: 'af_nicole',
};
/** Changing how the own voice reads (model, speed) starts a fresh set of kept pieces */
const KEPT_VERSION = 'k2-0.95-loud';
const SPEED = 0.95;
const PROMPT = 'Read this Bible passage aloud, warmly and reverently, at a calm, steady pace: ';

type Result =
  | { ok: true; audio: Uint8Array | ReadableStream<Uint8Array>; type: string }
  | { ok: false; status: number; why: string; retryAfter?: number; daily?: boolean };

const env = (name: string) => (Deno.env.get(name) || '').trim();

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Raw 16-bit PCM → a WAV file */
export function wavFromPcm(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const out = new Uint8Array(44 + pcm.length);
  const v = new DataView(out.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

async function failed(service: string, res: Response): Promise<Result> {
  const detail = await res.text().catch(() => '');
  console.error(`bible-tts ${service}`, res.status, detail.slice(0, 600));
  const result: Result = { ok: false, status: res.status, why: detail.slice(0, 500) };
  if (res.status === 429) {
    // Google says how long to wait ("retryDelay": "37s"), and whether the day's allowance is used up
    const delay = Number(detail.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/)?.[1]);
    if (delay > 0) result.retryAfter = Math.ceil(delay);
    if (/PerDay/i.test(detail)) result.daily = true;
  }
  return result;
}

/** Google Cloud Text-to-Speech (Chirp 3 HD) */
async function googleCloud(text: string, voice: string, key: string): Promise<Result> {
  const preferred = env('GOOGLE_TTS_LANGUAGE') || 'en-GB';
  let last: Result = { ok: false, status: 500, why: '' };
  for (const lang of [...new Set([preferred, 'en-US'])]) {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: lang, name: `${lang}-Chirp3-HD-${voice}` },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
      }),
    });
    if (!res.ok) {
      last = await failed(`google ${lang}`, res);
      // That accent doesn't have this voice: try the next one
      if (res.status === 400 || res.status === 404) continue;
      return last;
    }
    const body = await res.json().catch(() => null);
    if (typeof body?.audioContent !== 'string') return { ok: false, status: 502, why: 'no audio' };
    // LINEAR16 comes with its WAV header
    return { ok: true, audio: fromBase64(body.audioContent), type: 'audio/wav' };
  }
  return last;
}

/** Gemini speech, straight from Google */
async function gemini(text: string, voice: string, key: string): Promise<Result> {
  const model = env('GEMINI_TTS_MODEL') || 'gemini-2.5-flash-preview-tts';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT + text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  if (!res.ok) return failed('gemini', res);
  const body = await res.json().catch(() => null);
  const part = body?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data?: string } }) => p?.inlineData?.data);
  if (!part) return { ok: false, status: 502, why: 'no audio' };
  const rate = Number(String(part.inlineData.mimeType || '').match(/rate=(\d+)/)?.[1]) || 24000;
  return { ok: true, audio: wavFromPcm(fromBase64(part.inlineData.data), rate), type: 'audio/wav' };
}

async function signedByAdmin(req: Request, body: string): Promise<boolean> {
  const secret = env('SEND_EMAIL_HOOK_SECRET');
  const id = req.headers.get('webhook-id');
  const ts = req.headers.get('webhook-timestamp');
  const sigs = req.headers.get('webhook-signature');
  if (!id || !ts || !sigs || !secret || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const raw = secret.replace(/^v1,/, '').replace(/^whsec_/, '');
  const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  const expected = btoa(String.fromCharCode(...mac));
  return sigs.split(' ').some((x) => x.replace(/^v1,/, '') === expected);
}

// ── The church's own voice and the kept pieces ─────────────────────────
const R2 = {
  endpoint: env('R2_ENDPOINT'),
  accessKeyId: env('R2_ACCESS_KEY_ID'),
  secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
  bucket: env('R2_BUCKET_NAME'),
  domain: env('R2_PUBLIC_DOMAIN').replace(/\/$/, ''),
};
let s3: S3Client | null = null;
const r2 = () => {
  if (!R2.endpoint || !R2.accessKeyId || !R2.secretAccessKey || !R2.bucket || !R2.domain) return null;
  s3 ??= new S3Client({ region: 'auto', endpoint: R2.endpoint, credentials: { accessKeyId: R2.accessKeyId, secretAccessKey: R2.secretAccessKey } });
  return s3;
};

/** Where a piece is kept: tts/<voice>/<sha256 of version, voice and words>.mp3 */
async function keptPath(voice: string, text: string) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${KEPT_VERSION}|${voice}|${text}`)));
  return `tts/${voice}/${[...digest].map((b) => b.toString(16).padStart(2, '0')).join('')}.mp3`;
}

/** The kept piece's public address, if it's there */
async function kept(path: string): Promise<string | null> {
  if (!R2.domain) return null;
  const url = `${R2.domain}/${path}`;
  const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChurchSpace/1.0)' } }).catch(() => null);
  return res?.ok ? url : null;
}

/** The music server's address and key (the voice is `speak` there) */
let server: { speak: string; key: string } | null | undefined;
async function voiceServer() {
  if (server !== undefined) return server;
  const { data } = await supabaseAdmin.rpc('service_key' as never, { _church: '00000000-0000-0000-0000-000000000000', _service: 'acestep' } as never);
  try {
    const v = typeof data === 'string' ? JSON.parse(data) : null;
    server = v?.speak && v?.key ? { speak: String(v.speak), key: String(v.key) } : null;
  } catch {
    server = null;
  }
  return server;
}

/** The own voice reads the piece and it's kept; answers its public address */
async function ownVoice(text: string, voice: string, path: string): Promise<{ url?: string; audio?: Uint8Array; why?: string }> {
  const srv = await voiceServer();
  if (!srv) return { why: 'not set up' };
  const res = await fetch(srv.speak, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: KOKORO[voice] ?? 'bm_george', speed: SPEED, key: srv.key }),
    signal: AbortSignal.timeout(60_000),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }) as unknown as Response);
  if (!res.ok) return { why: `${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}` };
  const audio = new Uint8Array(await res.arrayBuffer());
  const client = r2();
  if (!client) return { audio };
  try {
    await client.send(new PutObjectCommand({ Bucket: R2.bucket, Key: path, Body: audio, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
    return { url: `${R2.domain}/${path}` };
  } catch (e) {
    console.error('bible-tts keep', String(e));
    return { audio };
  }
}

/** The voice services in order, with the key each uses (Google Cloud takes the Gemini key too) */
function services(): [string, string, (t: string, v: string, k: string) => Promise<Result>][] {
  const cloudKey = env('GOOGLE_TTS_API_KEY') || env('GEMINI_API_KEY');
  return [
    ['google-cloud', cloudKey, googleCloud],
    ['gemini', env('GEMINI_API_KEY'), gemini],
  ];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const raw = await req.text();
    const body = (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();
    // {"check": true}, signed: try each service with a few words and say what happened
    if (body?.check === true) {
      if (!(await signedByAdmin(req, raw))) return json({ error: 'Not allowed' }, 403);
      const out: Record<string, unknown> = {};
      {
        const t0 = Date.now();
        const sample = typeof body?.text === 'string' ? body.text : 'In the beginning God created the heavens and the earth.';
        const own = await ownVoice(sample, 'Charon', await keptPath('Charon', sample)).catch((e) => ({ why: String(e) }) as { url?: string; audio?: Uint8Array; why?: string });
        out.own_voice = own.url || own.audio ? { ok: true, ms: Date.now() - t0, url: own.url ?? null, bytes: own.audio?.length ?? null } : { ok: false, why: own.why };
      }
      for (const [name, key, speak] of services()) {
        if (!key) {
          out[name] = 'no key';
          continue;
        }
        const t0 = Date.now();
        const r = await speak('In the beginning God created the heavens and the earth.', 'Charon', key).catch((e) => ({ ok: false, status: 0, why: String(e) }) as Result);
        out[name] = r.ok ? { ok: true, ms: Date.now() - t0, bytes: r.audio instanceof Uint8Array ? r.audio.length : null } : { ok: false, status: r.status, why: r.why, daily: r.daily };
      }
      out.google_tts_key = !!env('GOOGLE_TTS_API_KEY');
      return json(out, 200);
    }
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const voice = typeof body?.voice === 'string' && VOICES.has(body.voice) ? body.voice : 'Charon';
    if (!text || text.length > 2000) return json({ error: 'Text must be 1–2000 characters' }, 400);

    // 0. Read before (by anyone): the phone fetches it from the media store
    const path = await keptPath(voice, text);
    const before = await kept(path);
    if (before) return json({ url: before, kept: true }, 200);
    // 0b. The church's own voice (kept for everybody from now on)
    const own = await ownVoice(text, voice, path).catch((e) => ({ why: String(e) }) as { url?: string; audio?: Uint8Array; why?: string });
    if (own.url) return json({ url: own.url, kept: false }, 200);
    if (own.audio) return new Response(own.audio, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache', 'X-Voice-Service': 'own' } });
    console.error('bible-tts own voice', own.why);

    const statuses: number[] = [];
    let retryAfter = 0;
    let daily = false;
    for (const [name, key, speak] of services()) {
      if (!key) continue;
      const result = await speak(text, voice, key).catch((e) => {
        console.error(`bible-tts ${name}`, e);
        return { ok: false, status: 502, why: String(e) } as Result;
      });
      if (result.ok) {
        return new Response(result.audio, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': result.type, 'Cache-Control': 'no-cache', 'X-Voice-Service': name },
        });
      }
      statuses.push(result.status);
      if (result.status === 429) {
        retryAfter = Math.max(retryAfter, result.retryAfter ?? 0);
        daily = daily || !!result.daily;
      }
    }
    if (!statuses.length) return json({ error: 'The voice is not set up' }, 503);
    // Every service refused: say why in the app's words
    if (daily) {
      return json({ error: 'The voice has reached its daily limit.' }, 429);
    }
    const status = statuses.includes(429) ? 429 : statuses.every((s) => s === 402 || s === 401 || s === 403) ? 402 : statuses[statuses.length - 1];
    const message =
      status === 402 ? 'The voice service isn’t available right now.' :
      status === 429 ? 'Too many requests, please wait a moment.' :
      'The voice could not read this.';
    const res = json({ error: message }, status >= 400 && status < 600 ? status : 502);
    if (status === 429) res.headers.set('Retry-After', String(Math.min(60, retryAfter || 10)));
    return res;
  } catch (error) {
    console.error('bible-tts', error);
    return json({ error: 'The voice could not read this.' }, 500);
  }
});
