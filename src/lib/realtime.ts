import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared broadcast channels.
 *
 * supabase-js returns the SAME channel object for the same topic name, so when
 * two screens subscribed to e.g. `chat-signals:<id>` and one of them called
 * removeChannel(), the other silently stopped receiving events. This hub keeps
 * one channel per topic and only removes it when the last listener leaves.
 */

type Handler = (payload: any, event: string) => void;

interface Entry {
  channel: RealtimeChannel;
  listeners: Set<{ event: string; handler: Handler }>;
  joined: Promise<void>;
}

const entries = new Map<string, Entry>();

function dispatch(topic: string, entry: Entry, event: string, payload: unknown) {
  entry.listeners.forEach((l) => {
    if (l.event === '*' || l.event === event) {
      try {
        l.handler(payload, event);
      } catch (err) {
        console.error(`[realtime] handler for ${topic}/${event} failed`, err);
      }
    }
  });
}

function ensure(topic: string): Entry {
  const existing = entries.get(topic);
  if (existing) return existing;

  const channel = supabase.channel(topic, { config: { broadcast: { self: false, ack: false } } });
  const listeners = new Set<{ event: string; handler: Handler }>();

  channel.on('broadcast', { event: '*' }, (message) => {
    const entry = entries.get(topic);
    if (entry) dispatch(topic, entry, message.event, message.payload);
  });

  const joined = new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
    });
  });

  const entry = { channel, listeners, joined };
  entries.set(topic, entry);
  return entry;
}

/** Listen to a broadcast event on a topic. Returns an unsubscribe function. */
export function onBroadcast(topic: string, event: string, handler: Handler): () => void {
  const entry = ensure(topic);
  const listener = { event, handler };
  entry.listeners.add(listener);

  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0 && entries.get(topic) === entry) {
      entries.delete(topic);
      supabase.removeChannel(entry.channel);
    }
  };
}

/**
 * Send a broadcast. Uses the open socket when this device is listening to the
 * topic, otherwise supabase-js falls back to the REST broadcast endpoint.
 */
export async function broadcast(topic: string, event: string, payload: unknown): Promise<void> {
  const entry = entries.get(topic);
  if (entry) {
    await Promise.race([entry.joined, new Promise((r) => setTimeout(r, 3000))]);
    await entry.channel.send({ type: 'broadcast', event, payload });
    return;
  }
  // One-off send over REST. supabase.channel() may hand back a channel some
  // other code already joined, so only clean up a channel we created unjoined.
  const temp = supabase.channel(topic, { config: { broadcast: { self: false } } });
  const createdHere = (temp as any).state === 'closed';
  try {
    await temp.send({ type: 'broadcast', event, payload });
  } finally {
    if (createdHere && !entries.has(topic)) supabase.removeChannel(temp);
  }
}

/**
 * Give a broadcast to this device's own listeners too. The server never sends
 * our own broadcasts back (self: false). That's right for a message the open
 * chat already shows, but something made elsewhere in the app (a call kept in
 * the chat) still has to reach the open chat and the lists on this phone.
 */
export function emitLocal(topic: string, event: string, payload: unknown) {
  const entry = entries.get(topic);
  if (entry) dispatch(topic, entry, event, payload);
}

/**
 * After the phone was locked or the app was in the background, iOS has often
 * frozen the live connection without closing it. It would only notice at the
 * next missed heartbeat (up to ~50 s later), so chats looked stuck until they
 * were reopened. On coming back, check straight away and reconnect if there's
 * no answer; the channels then rejoin by themselves.
 */
export function keepRealtimeAwake() {
  const rt = supabase.realtime;
  let probe: ReturnType<typeof setTimeout> | undefined;
  const wake = () => {
    if (document.visibilityState !== 'visible' || rt.getChannels().length === 0) return;
    if (!rt.isConnected()) {
      rt.connect();
      return;
    }
    rt.sendHeartbeat();
    clearTimeout(probe);
    // No reply by now: this second heartbeat finds the first unanswered and reconnects
    probe = setTimeout(() => rt.sendHeartbeat(), 4000);
  };
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('online', wake);
  window.addEventListener('pageshow', wake);

  // Reconnected after a drop: nothing missed meanwhile is replayed, so tell the
  // screens to fetch it ('app:resync'), once the channels have rejoined
  let dropped = false;
  let resync: ReturnType<typeof setTimeout> | undefined;
  const drop = () => {
    dropped = true;
  };
  rt.stateChangeCallbacks.close.push(['keep-awake-drop', drop]);
  rt.stateChangeCallbacks.error.push(['keep-awake-drop', drop]);
  rt.stateChangeCallbacks.open.push(['keep-awake-open', () => {
    if (!dropped) return;
    dropped = false;
    clearTimeout(resync);
    resync = setTimeout(() => window.dispatchEvent(new Event('app:resync')), 1500);
  }]);
}

/** Unique channel name for postgres_changes subscriptions (never shared). */
export const uniqueTopic = (base: string) => `${base}:${Math.random().toString(36).slice(2, 10)}`;
