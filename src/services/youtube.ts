/**
 * The church's YouTube channel inside the app: the latest videos (from the
 * fetch-youtube-videos backend function, kept on the phone so they show at
 * once and offline) and whether a service is live right now.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const CHANNEL_ID = 'UC35azCG6jqVkR2G8aH91v4A';
export const CHANNEL_URL = `https://www.youtube.com/channel/${CHANNEL_ID}`;

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

export interface LiveStatus {
  live: boolean;
  videoId: string | null;
  title: string | null;
}

const CACHE_KEY = 'yt_latest_v1';
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

/** The latest videos on the channel, newest first. */
export async function latestVideos(): Promise<YouTubeVideo[]> {
  const cached = readCache();
  if (cached && Date.now() - cached.at < FRESH_MS && cached.videos.length) return cached.videos;
  try {
    const { data, error } = await supabase.functions.invoke('fetch-youtube-videos', { body: {} });
    if (error) throw error;
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
 * Live right now? A service marked live by the church team comes first;
 * otherwise the channel itself is checked (see api/youtube-live.js).
 */
export async function liveStatus(): Promise<LiveStatus> {
  try {
    const { data } = await supabase
      .from('live_services')
      .select('youtube_video_id, title')
      .eq('is_live', true)
      .limit(1)
      .maybeSingle();
    if (data?.youtube_video_id) return { live: true, videoId: data.youtube_video_id, title: data.title ?? null };
  } catch {
    /* checked on YouTube below */
  }
  try {
    const res = await fetch('/api/youtube-live', { cache: 'no-store' });
    const json = await res.json();
    if (json?.live && typeof json.videoId === 'string') return { live: true, videoId: json.videoId, title: json.title ?? null };
  } catch {
    /* not live, or offline */
  }
  return { live: false, videoId: null, title: null };
}

/** Live status, checked every minute while the app is on screen. */
export function useLiveStatus(): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>({ live: false, videoId: null, title: null });
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      liveStatus().then((s) => {
        if (!cancelled) setStatus((prev) => (prev.live === s.live && prev.videoId === s.videoId ? prev : s));
      });
    };
    check();
    const t = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return status;
}

/** The in-app player address for a video */
export const embedUrl = (videoId: string) =>
  `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

export const relativeDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};
