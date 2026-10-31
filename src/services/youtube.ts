/**
 * The church's YouTube channel inside the app: the latest videos (from the
 * fetch-youtube-videos backend function, kept on the phone so they show at
 * once and offline) and whether a service is live right now.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { church } from '@/config/church';
import { uniqueTopic } from '@/lib/realtime';

export const CHANNEL_ID = church.youtube.channelId;
export const CHANNEL_URL = `https://www.youtube.com/channel/${CHANNEL_ID}`;

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

export interface LiveStatus {
  live: boolean;
  /** A video id, or the channel id when the team marked it live without a link */
  videoId: string | null;
  title: string | null;
  /** Marked live by the church team (rather than found on YouTube) */
  manual?: boolean;
}

/** "UC…": a channel, played as its current live stream */
export const isChannelId = (id: string) => /^UC[\w-]{22}$/.test(id);

// v2: phones may still hold the old made-up placeholder videos under v1
const CACHE_KEY = 'yt_latest_v2';
const FRESH_MS = 30 * 60 * 1000;

const readCache = (): { at: number; videos: YouTubeVideo[] } | null => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  } catch {
    return null;
  }
};

/** The videos kept from last time (shown straight away) */
export const cachedVideos = (): YouTubeVideo[] => readCache()?.videos ?? [];

/** The latest videos on the church's own channel, newest first (Shorts and upcoming streams left out). */
export async function latestVideos(force = false): Promise<YouTubeVideo[]> {
  const cached = readCache();
  if (!force && cached && Date.now() - cached.at < FRESH_MS && cached.videos.length) return cached.videos;
  try {
    const { data, error } = await supabase.functions.invoke('fetch-youtube-videos', { body: {} });
    if (error) throw error;
    // Only this channel's real videos: never placeholders (an older version of the
    // function sent some), never another channel's
    if (data?.isFallback || (data?.channelId && data.channelId !== CHANNEL_ID)) throw new Error('not the channel\'s own videos');
    const videos: YouTubeVideo[] = (data?.videos ?? [])
      .filter((v: { id?: string }) => typeof v.id === 'string')
      .map((v: { id: string; title?: string; thumbnail?: string; publishedAt?: string }) => ({
        id: v.id,
        title: decodeEntities(v.title || ''),
        thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
        publishedAt: v.publishedAt || '',
      }));
    if (videos.length) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), videos }));
      } catch {
        /* storage full */
      }
      return videos;
    }
  } catch (error) {
    console.warn('[youtube] latest videos unavailable', error);
  }
  return cached?.videos ?? [];
}

/** YouTube titles arrive HTML-escaped ("&#39;", "&amp;") */
const decodeEntities = (text: string) => {
  const el = document.createElement('textarea');
  el.innerHTML = text;
  return el.value;
};

/**
 * Live right now? A service marked live by the church team comes first (Watch →
 * "We're live"); otherwise the channel is checked on YouTube (the youtube-live
 * backend function; api/youtube-live.js on Vercel while that isn't deployed).
 */
export async function liveStatus(): Promise<LiveStatus> {
  const NOT_LIVE: LiveStatus = { live: false, videoId: null, title: null };
  try {
    const { data } = await supabase
      .from('live_services')
      .select('youtube_video_id, title')
      .eq('is_live', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return { live: true, videoId: data.youtube_video_id || CHANNEL_ID, title: data.title ?? null, manual: true };
  } catch {
    /* checked on YouTube below */
  }
  if (!CHANNEL_ID) return NOT_LIVE;
  const found = (json: { live?: boolean; videoId?: unknown; title?: string | null } | null): LiveStatus | null =>
    json?.live && typeof json.videoId === 'string' ? { live: true, videoId: json.videoId, title: json.title ?? null } : null;
  try {
    const { data, error } = await supabase.functions.invoke('youtube-live', {
      body: { channelId: CHANNEL_ID, handle: church.youtube.handle },
    });
    if (!error) return found(data) ?? NOT_LIVE;
  } catch {
    /* not deployed yet: ask the Vercel copy */
  }
  try {
    const res = await fetch(`/api/youtube-live?channel=${encodeURIComponent(CHANNEL_ID)}`, { cache: 'no-store' });
    return found(await res.json()) ?? NOT_LIVE;
  } catch {
    return NOT_LIVE; // offline
  }
}

/** Within a usual service time (an hour either side), when it's worth checking more often */
const nearServiceTime = () => {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  return church.liveTimes.some((t) => now.getDay() === t.day && h >= t.from - 1 && h <= t.to + 1);
};

// One shared check for every screen that shows it (Home and Watch can both be mounted)
let current: LiveStatus = { live: false, videoId: null, title: null };
const listeners = new Set<(s: LiveStatus) => void>();
let stopWatching: (() => void) | null = null;

function startWatching() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let checking = false;
  const check = async () => {
    clearTimeout(timer);
    if (document.visibilityState === 'visible' && !checking) {
      checking = true;
      const next = await liveStatus().finally(() => {
        checking = false;
      });
      if (next.live !== current.live || next.videoId !== current.videoId || next.title !== current.title || next.manual !== current.manual) {
        current = next;
        listeners.forEach((l) => l(current));
      }
    }
    // Every 20 s around service times or while live, otherwise every minute
    timer = setTimeout(check, current.live || nearServiceTime() ? 20_000 : 60_000);
  };
  const onVisible = () => document.visibilityState === 'visible' && check();
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', check);
  window.addEventListener('app:resync', check);
  window.addEventListener('live:recheck', check);
  // The team pressing "We're live" / "End": everyone sees it at once
  const channel = supabase
    .channel(uniqueTopic('live-services'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_services' }, () => check())
    .subscribe();
  check();
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', check);
    window.removeEventListener('app:resync', check);
    window.removeEventListener('live:recheck', check);
    supabase.removeChannel(channel);
  };
}

/** Recheck straight away (after marking a service live or ended) */
export const recheckLive = () => window.dispatchEvent(new Event('live:recheck'));

/** Live status, kept up to date while the app is on screen. */
export function useLiveStatus(): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>(current);
  useEffect(() => {
    listeners.add(setStatus);
    setStatus(current);
    stopWatching ??= startWatching();
    return () => {
      listeners.delete(setStatus);
      if (listeners.size === 0) {
        stopWatching?.();
        stopWatching = null;
      }
    };
  }, []);
  return status;
}

/** The in-app player address for a video (a channel id: whatever it's streaming live now) */
export const embedUrl = (videoId: string) =>
  isChannelId(videoId)
    ? `https://www.youtube-nocookie.com/embed/live_stream?channel=${videoId}&autoplay=1&playsinline=1`
    : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

export const relativeDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};
