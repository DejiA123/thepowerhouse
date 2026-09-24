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

function ensure(topic: string): Entry {
  const existing = entries.get(topic);
  if (existing) return existing;

  const channel = supabase.channel(topic, { config: { broadcast: { self: false, ack: false } } });
  const listeners = new Set<{ event: string; handler: Handler }>();

  channel.on('broadcast', { event: '*' }, (message) => {
    listeners.forEach((l) => {
      if (l.event === '*' || l.event === message.event) {
        try {
          l.handler(message.payload, message.event);
        } catch (err) {
          console.error(`[realtime] handler for ${topic}/${message.event} failed`, err);
        }
      }
    });
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

/** Unique channel name for postgres_changes subscriptions (never shared). */
export const uniqueTopic = (base: string) => `${base}:${Math.random().toString(36).slice(2, 10)}`;
