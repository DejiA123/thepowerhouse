// Is the church live on YouTube right now? Home and Watch ask while they're on
// screen, so a live service shows in the app (with its chat) whatever day it is.
//
//  1. With a YouTube API key: the channel's newest uploads (live streams are in
//     there from the moment they're scheduled) and their live details. 2 quota
//     units, asked at most once a minute per channel however many people look.
//  2. The channel's public "/live" page, which points at the broadcast while
//     there is one (no key; YouTube sometimes answers servers with a consent or
//     "are you a bot" page instead, which is why it's no longer the only way).
//
// The church team can also mark a service live in the app (live_services); the
// app checks that first, so it never depends on YouTube's answer alone.
import { church } from '../_shared/church.ts';
import { corsHeaders, json } from '../_shared/cors.ts';

interface Live {
  live: boolean;
  upcoming: boolean;
  videoId: string | null;
  title: string | null;
  /** When an upcoming broadcast is due to start */
  startsAt?: string | null;
  source: 'api' | 'page' | 'none';
}

const NOT_LIVE: Live = { live: false, upcoming: false, videoId: null, title: null, source: 'none' };
const FRESH_MS = 60_000;
const cache = new Map<string, { at: number; status: Live }>();
const inFlight = new Map<string, Promise<Live>>();

const decode = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

async function getJson(url: string) {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message || `YouTube API ${res.status}`);
  return body;
}

/** The newest uploads and their live details (YouTube Data API) */
export async function fromApi(channelId: string, key: string): Promise<Live | null> {
  const uploads = `UU${channelId.slice(2)}`;
  const list = await getJson(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=10&key=${key}`,
  );
  const ids: string[] = (list?.items ?? []).map((i: any) => i?.contentDetails?.videoId).filter(Boolean);
  if (!ids.length) return null;
  const details = await getJson(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${ids.join(',')}&key=${key}`,
  );
  return pickLive(details?.items ?? [], channelId);
}

/** From videos.list items: the one that's live now, else the next upcoming one (within a day) */
export function pickLive(items: any[], channelId: string): Live {
  const mine = items.filter((v) => v?.snippet?.channelId === channelId);
  const now = mine.find((v) =>
    v.snippet?.liveBroadcastContent === 'live' ||
    (v.liveStreamingDetails?.actualStartTime && !v.liveStreamingDetails?.actualEndTime));
  if (now) return { live: true, upcoming: false, videoId: now.id, title: now.snippet?.title ?? null, source: 'api' };
  const soon = mine
    .filter((v) => v.snippet?.liveBroadcastContent === 'upcoming' && v.liveStreamingDetails?.scheduledStartTime)
    .map((v) => ({ v, at: Date.parse(v.liveStreamingDetails.scheduledStartTime) }))
    .filter(({ at }) => at - Date.now() < 24 * 3600_000 && Date.now() - at < 6 * 3600_000)
    .sort((a, b) => a.at - b.at)[0];
  if (soon) {
    return {
      live: false, upcoming: true, videoId: soon.v.id, title: soon.v.snippet?.title ?? null,
      startsAt: soon.v.liveStreamingDetails.scheduledStartTime, source: 'api',
    };
  }
  return { ...NOT_LIVE, source: 'api' };
}

/** Read a channel "/live" page */
export function fromLivePage(html: string): Live | null {
  const videoId =
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1] ??
    html.match(/"currentVideoEndpoint":\{[^}]*?"videoId":"([\w-]{11})"/)?.[1] ??
    null;
  // Not a video page at all (a consent page or a bot check): we don't know
  if (!videoId && !/"channelId":"UC/.test(html)) return null;
  // "isLive" stays false on recordings of past streams
  const live = !!videoId && /"(isLive|isLiveNow)":\s*true/.test(html);
  const upcoming = !!videoId && !live && /"isUpcoming":\s*true/.test(html);
  const title = decode(html.match(/<meta name="title" content="([^"]*)"/)?.[1] ?? '');
  return { live, upcoming, videoId: live || upcoming ? videoId : null, title: live || upcoming ? title || null : null, source: 'page' };
}

async function fromPage(path: string): Promise<Live | null> {
  const res = await fetch(`https://www.youtube.com/${path}/live`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Accept-Language': 'en-GB,en;q=0.9',
      // Skips the cookie-consent page YouTube shows in Europe
      Cookie: 'SOCS=CAI',
    },
  });
  return fromLivePage(await res.text());
}

async function check(channelId: string, handle: string): Promise<Live> {
  const key = Deno.env.get('YOUTUBE_API_KEY');
  if (key) {
    try {
      const status = await fromApi(channelId, key);
      if (status?.live) return status;
      // Not live per the API: still look at the page, in case the stream isn't in the uploads yet
      const page = await fromPage(`channel/${channelId}`).catch(() => null);
      if (page?.live) return page;
      if (status) return status;
    } catch (error) {
      console.warn('YouTube API unavailable, reading the live page:', error instanceof Error ? error.message : error);
    }
  }
  for (const path of [`channel/${channelId}`, ...(handle ? [handle] : [])]) {
    try {
      const page = await fromPage(path);
      if (page) return page;
    } catch {
      /* try the next way */
    }
  }
  return NOT_LIVE;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  // Church Space: each church asks about its own channel
  const channelId = /^UC[\w-]{22}$/.test(String(body.channelId ?? '')) ? String(body.channelId) : church.youtube.channelId;
  const handle = /^@[\w.-]{1,100}$/.test(String(body.handle ?? '')) ? String(body.handle) : channelId === church.youtube.channelId ? church.youtube.handle : '';

  const cached = cache.get(channelId);
  if (cached && Date.now() - cached.at < FRESH_MS) return json({ ...cached.status, cached: true });

  let pending = inFlight.get(channelId);
  if (!pending) {
    pending = check(channelId, handle).finally(() => inFlight.delete(channelId));
    inFlight.set(channelId, pending);
  }
  try {
    const status = await pending;
    cache.set(channelId, { at: Date.now(), status });
    return json(status);
  } catch (error) {
    return json({ ...NOT_LIVE, error: error instanceof Error ? error.message : String(error) });
  }
});
