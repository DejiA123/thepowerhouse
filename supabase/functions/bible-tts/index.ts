// Reads a short piece of Bible text aloud (the cloud voice for phones).
//
// Only the church's own voice (Lovable AI and then Google / Gemini were removed, Nov 2026,
// at the church's request):
//   1. Kept pieces: every piece the voice has read is kept in the media store (R2,
//      tts/<voice>/<sha256>.mp3), so each is read only once for everybody. The answer is
//      {"url": …} and the phone fetches the MP3 straight from the store.
//   2. The church's own voice: Kokoro-82M (open source) on the music server (Modal, `speak`
//      in music-server/ace_step.py; its address is in the Vault entry `acestep`). No daily
//      allowance; the piece is stored, then {"url": …}.
// A signed {"check": true} (SEND_EMAIL_HOOK_SECRET) reads a sample and reports the result.
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
const env = (name: string) => (Deno.env.get(name) || '').trim();

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
    // The phone asks again a couple of times (the voice may still be waking up)
    return json({ error: own.why === 'not set up' ? 'The voice is not set up' : 'The voice could not read this.' }, 503);
  } catch (error) {
    console.error('bible-tts', error);
    return json({ error: 'The voice could not read this.' }, 500);
  }
});
