// Reads a short piece of Bible text aloud (the cloud voice for phones).
// Returns a complete WAV file (24 kHz, 16-bit mono).
//
// Uses whichever voice service has a key, in this order, and moves on to the
// next if one fails (no credit left, too busy, down):
//   1. GOOGLE_TTS_API_KEY: Google Cloud Text-to-Speech, Chirp 3 HD voices (the
//      same voices: Charon, Kore, …). Free for the first million characters a
//      month, then paid. GOOGLE_TTS_LANGUAGE picks the accent (default en-GB).
//   2. GEMINI_API_KEY: Google's Gemini speech model directly (aistudio.google.com).
//   3. LOVABLE_API_KEY: the same model through Lovable AI (uses Lovable credits).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_MODEL = 'google/gemini-3.1-flash-tts-preview';
const VOICES = new Set(['Charon', 'Orus', 'Iapetus', 'Fenrir', 'Puck', 'Kore', 'Aoede', 'Leda', 'Zephyr', 'Callirrhoe']);
const PROMPT = 'Read this Bible passage aloud, warmly and reverently, at a calm, steady pace: ';

type Result = { ok: true; audio: Uint8Array | ReadableStream<Uint8Array>; type: string } | { ok: false; status: number; why: string };

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
  console.error(`bible-tts ${service}`, res.status, detail.slice(0, 300));
  return { ok: false, status: res.status, why: detail.slice(0, 200) };
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

/** The same model through Lovable AI */
async function lovable(text: string, voice: string, key: string): Promise<Result> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LOVABLE_MODEL,
      contents: [{ role: 'user', parts: [{ text: PROMPT + text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
      stream_format: 'audio',
    }),
  });
  if (!res.ok || !res.body) return failed('lovable', res);
  return { ok: true, audio: res.body, type: res.headers.get('Content-Type') || 'audio/wav' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const voice = typeof body?.voice === 'string' && VOICES.has(body.voice) ? body.voice : 'Charon';
    if (!text || text.length > 2000) return json({ error: 'Text must be 1–2000 characters' }, 400);

    const services: [string, (t: string, v: string, k: string) => Promise<Result>][] = [
      ['GOOGLE_TTS_API_KEY', googleCloud],
      ['GEMINI_API_KEY', gemini],
      ['LOVABLE_API_KEY', lovable],
    ];
    const statuses: number[] = [];
    for (const [name, speak] of services) {
      const key = env(name);
      if (!key) continue;
      const result = await speak(text, voice, key).catch((e) => {
        console.error(`bible-tts ${name}`, e);
        return { ok: false, status: 502, why: String(e) } as Result;
      });
      if (result.ok) {
        return new Response(result.audio, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': result.type, 'Cache-Control': 'no-cache', 'X-Voice-Service': name.split('_')[0].toLowerCase() },
        });
      }
      statuses.push(result.status);
    }
    if (!statuses.length) return json({ error: 'The voice is not set up' }, 503);
    // Every service refused: say why in the app's words
    const status = statuses.includes(429) ? 429 : statuses.every((s) => s === 402 || s === 401 || s === 403) ? 402 : statuses[statuses.length - 1];
    const message =
      status === 402 ? 'AI credits have run out.' :
      status === 429 ? 'Too many requests, please wait a moment.' :
      'The voice could not read this.';
    return json({ error: message }, status >= 400 && status < 600 ? status : 502);
  } catch (error) {
    console.error('bible-tts', error);
    return json({ error: 'The voice could not read this.' }, 500);
  }
});
