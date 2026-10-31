/**
 * Social Circle, live. A friend request to me, mine accepted, a friend removed:
 * the database tells this phone straight away (friendships is in the realtime
 * publication, and each person only hears about their own friendships), and
 * every screen showing the circle gets the new one at once (CIRCLE_CHANGED).
 */
import { supabase } from '@/integrations/supabase/client';
import { SocialService, type Circle } from '@/services/socialService';
import { uniqueTopic } from './realtime';

/** window event: detail { circle, before } (before: what this phone had, if anything) */
export const CIRCLE_CHANGED = 'circle:changed';

export interface CircleChange {
  circle: Circle;
  before: Circle | null;
}

let refreshing: Promise<Circle | null> | null = null;
let again = false;

/** Fetch the circle now and give it to every screen. Asks made meanwhile share it, plus one more fetch after. */
export function refreshCircle(): Promise<Circle | null> {
  if (refreshing) {
    again = true;
    return refreshing;
  }
  refreshing = (async () => {
    try {
      const before = SocialService.savedCircle();
      const circle = await SocialService.circle();
      window.dispatchEvent(new CustomEvent<CircleChange>(CIRCLE_CHANGED, { detail: { circle, before } }));
      return circle;
    } catch {
      return null; // offline: keep what's on screen
    } finally {
      refreshing = null;
      if (again) {
        again = false;
        void refreshCircle();
      }
    }
  })();
  return refreshing;
}

const knownFriendship = (id: unknown) => {
  const circle = SocialService.savedCircle();
  if (!circle || typeof id !== 'string') return true;
  return [...circle.friends, ...circle.incoming, ...circle.outgoing].some((e) => e.friendshipId === id);
};

/** Calls onChange (once for a burst) whenever one of my friendships changes, and after a reconnect. */
export function watchFriendships(userId: string, onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const soon = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 250);
  };
  let joinedBefore = false;
  const channel = supabase
    .channel(uniqueTopic('friendships'))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: `user_id=eq.${userId}` }, soon)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: `friend_id=eq.${userId}` }, soon)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships', filter: `user_id=eq.${userId}` }, soon)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships', filter: `friend_id=eq.${userId}` }, soon)
    // Deletes can't be filtered and only carry the id: act on ones in my circle
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'friendships' }, (payload) => {
      if (knownFriendship((payload.old as { id?: string })?.id)) soon();
    })
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      // Back after a dropped connection: catch up on anything missed
      if (joinedBefore) soon();
      joinedBefore = true;
    });
  return () => {
    clearTimeout(timer);
    supabase.removeChannel(channel);
  };
}
