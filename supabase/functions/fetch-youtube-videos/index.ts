// "Latest sermons" (Home and Watch): the newest videos on the church's own
// YouTube channel. Only ever real, public videos from that one channel: never
// made-up placeholders, and never another channel's (the channel id comes from
// the church profile, it isn't searched for). Shorts, and premieres or streams
// that haven't started, are left out: this is for sermons. The live service is
// shown separately (see api/youtube-live.js).
//
//  1. With a YouTube API key: the channel's uploads list (1 quota unit), then
//     those videos' details (1 unit) to check channel, privacy, length and
//     whether they've started.
//  2. No key, or the API failed or ran out of quota: the channel's public RSS
//     feed (no key or quota; YouTube links Shorts there as /shorts/).
//  3. Both failed: the last good list (up to a day old), else an empty list
//     (the app then keeps what it already has, or links to the channel).
import { church } from '../_shared/church.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHANNEL_ID = church.youtube.channelId;
const FRESH_MS = 30 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;
const MAX_SHORT_SECONDS = 180; // YouTube Shorts are up to 3 minutes
const LIMIT = 8;

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
}

let cache: { videos: Video[]; at: number; source: string } | null = null;
let inFlight: Promise<{ videos: Video[]; source: string; apiCalls: number }> | null = null;

const decodeXml = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

/** "PT1H2M3S" → 3723 (a stream that's on now is "P0D": 0) */
export function durationSeconds(iso = ''): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => Number(x) || 0);
  return d * 86400 + h * 3600 + min * 60 + s;
}

const newestFirst = (a: Video, b: Video) => b.publishedAt.localeCompare(a.publishedAt);

/** The uploads list and the videos' details (YouTube Data API), filtered to this channel's public sermons. */
export function videosFromApi(details: any, channelId = CHANNEL_ID): Video[] {
  return (details?.items ?? [])
    .filter((v: any) =>
      v?.id &&
      v.snippet?.channelId === channelId &&
      v.status?.privacyStatus === 'public' &&
      v.snippet?.liveBroadcastContent === 'none' &&
      durationSeconds(v.contentDetails?.duration) > MAX_SHORT_SECONDS)
    .map((v: any) => ({
      id: v.id,
      title: v.snippet.title ?? '',
      description: (v.snippet.description ?? '').slice(0, 140),
      thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      publishedAt: v.snippet.publishedAt ?? '',
      channelTitle: v.snippet.channelTitle ?? '',
    }))
    .sort(newestFirst);
}

/** The channel's public RSS feed, filtered to this channel's videos (not Shorts). */
export function videosFromFeed(xml: string, channelId = CHANNEL_ID): Video[] {
  const feedChannel = /<yt:channelId>([^<]+)<\/yt:channelId>/.exec(xml.split('<entry>')[0])?.[1]?.trim();
  if (feedChannel && feedChannel !== channelId) return [];
  const channelTitle = decodeXml(/<author>\s*<name>([^<]*)<\/name>/.exec(xml)?.[1] ?? '');
  return xml
    .split('<entry>')
    .slice(1)
    .map((entry) => {
      const id = /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(entry)?.[1];
      const entryChannel = /<yt:channelId>([^<]+)<\/yt:channelId>/.exec(entry)?.[1]?.trim();
      const link = /<link rel="alternate" href="([^"]+)"/.exec(entry)?.[1] ?? '';
      if (!id || (entryChannel && entryChannel !== channelId) || link.includes('/shorts/')) return null;
      return {
        id,
        title: decodeXml(/<title>([^<]*)<\/title>/.exec(entry)?.[1] ?? ''),
        description: decodeXml(/<media:description>([\s\S]*?)<\/media:description>/.exec(entry)?.[1] ?? '').slice(0, 140),
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: /<published>([^<]+)<\/published>/.exec(entry)?.[1] ?? '',
        channelTitle,
      } as Video;
    })
    .filter((v): v is Video => !!v)
    .sort(newestFirst);
}

async function getJson(url: string) {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message || `YouTube API ${res.status}`);
  return body;
}

async function fromApi(key: string): Promise<Video[]> {
  // Every channel's uploads list is its id with "UC" swapped for "UU"
  const uploads = `UU${CHANNEL_ID.slice(2)}`;
  const list = await getJson(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=30&key=${key}`,
  );
  const ids: string[] = (list?.items ?? []).map((i: any) => i?.contentDetails?.videoId).filter(Boolean);
  if (!ids.length) return [];
  const details = await getJson(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${ids.join(',')}&key=${key}`,
  );
  return videosFromApi(details);
}

async function fromFeed(): Promise<Video[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
  if (!res.ok) throw new Error(`YouTube feed ${res.status}`);
  return videosFromFeed(await res.text());
}

async function latest(): Promise<{ videos: Video[]; source: string; apiCalls: number }> {
  const key = Deno.env.get('YOUTUBE_API_KEY');
  if (key) {
    try {
      const videos = await fromApi(key);
      if (videos.length) return { videos: videos.slice(0, LIMIT), source: 'api', apiCalls: 2 };
    } catch (error) {
      console.warn('YouTube API unavailable, using the channel feed:', error instanceof Error ? error.message : error);
    }
  }
  return { videos: (await fromFeed()).slice(0, LIMIT), source: 'feed', apiCalls: key ? 2 : 0 };
}

async function logApiUsage(apiCalls: number, success: boolean, errorMessage?: string, cached = false) {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    await supabase.rpc('log_youtube_api_usage', {
      _function_name: 'fetch-youtube-videos',
      _api_calls_made: apiCalls,
      _quota_units_used: apiCalls, // 1 unit each (uploads list, video details)
      _success: success,
      _error_message: errorMessage,
      _cached_response: cached,
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}

const respond = (body: Record<string, unknown>, cacheState: string) =>
  new Response(JSON.stringify({ channelId: CHANNEL_ID, ...body }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': cacheState },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (cache && Date.now() - cache.at < FRESH_MS) {
    return respond({ videos: cache.videos, source: cache.source, cachedAt: new Date(cache.at).toISOString() }, 'HIT');
  }

  try {
    // Everyone asking at once shares one lookup
    inFlight ??= latest().finally(() => {
      inFlight = null;
    });
    const { videos, source, apiCalls } = await inFlight;
    if (!videos.length) throw new Error('No videos found on the channel');
    cache = { videos, at: Date.now(), source };
    await logApiUsage(apiCalls, true);
    return respond({ videos, source, cachedAt: new Date(cache.at).toISOString() }, 'MISS');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Could not fetch the latest videos:', message);
    await logApiUsage(0, false, message);
    if (cache && Date.now() - cache.at < STALE_MS) {
      return respond({ videos: cache.videos, source: cache.source, stale: true, cachedAt: new Date(cache.at).toISOString() }, 'STALE');
    }
    return respond({ videos: [], error: 'YouTube is unavailable right now' }, 'ERROR');
  }
});
