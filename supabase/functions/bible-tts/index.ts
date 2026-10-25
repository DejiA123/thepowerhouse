// Reads a short piece of Bible text aloud with Lovable AI (cloud voice for phones).
// Returns a complete WAV file (24 kHz, 16-bit mono).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MODEL = 'google/gemini-3.1-flash-tts-preview';
const VOICES = new Set(['Charon', 'Orus', 'Iapetus', 'Fenrir', 'Puck', 'Kore', 'Aoede', 'Leda', 'Zephyr', 'Callirrhoe']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const voice = typeof body?.voice === 'string' && VOICES.has(body.voice) ? body.voice : 'Charon';
    if (!text || text.length > 2000) return json({ error: 'Text must be 1–2000 characters' }, 400);
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return json({ error: 'The voice is not set up' }, 500);

    const upstream = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: `Read this Bible passage aloud, warmly and reverently, at a calm, steady pace: ${text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
        stream_format: 'audio',
      }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('bible-tts upstream', upstream.status, detail.slice(0, 300));
      const message =
        upstream.status === 402 ? 'AI credits have run out.' :
        upstream.status === 429 ? 'Too many requests, please wait a moment.' :
        'The voice could not read this.';
      return json({ error: message }, upstream.status);
    }
    return new Response(upstream.body, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': upstream.headers.get('Content-Type') || 'audio/wav', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    console.error('bible-tts', error);
    return json({ error: 'The voice could not read this.' }, 500);
  }
});
