import { supabase } from '@/integrations/supabase/client';

/**
 * STUN finds a public address; TURN relays media when two devices cannot reach
 * each other directly (different mobile networks, strict routers). Without a
 * TURN relay many calls between people on different networks never connect.
 */
const FALLBACK: RTCIceServer[] = [
  { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  // Public Open Relay (best effort) so calls still have a relay if none is configured
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

let cache: { servers: RTCIceServer[]; at: number } | null = null;

export async function getIceServers(): Promise<RTCIceServer[]> {
  if (cache && Date.now() - cache.at < 30 * 60 * 1000) return cache.servers;
  try {
    const { data, error } = await Promise.race([
      supabase.functions.invoke('turn-credentials', { body: {} }),
      new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 4000),
      ),
    ]);
    if (!error && Array.isArray(data?.iceServers) && data.iceServers.length) {
      const servers: RTCIceServer[] = data.relay ? data.iceServers : [...data.iceServers, FALLBACK[1]];
      cache = { servers, at: Date.now() };
      return servers;
    }
  } catch {
    /* fall through to defaults */
  }
  return FALLBACK;
}
