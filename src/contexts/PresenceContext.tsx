import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

/**
 * Who is using the app right now, via Supabase Realtime Presence.
 * A member counts as online while the app is open and visible.
 */
const PresenceContext = createContext<Set<string>>(new Set());

export const useOnlineUsers = () => useContext(PresenceContext);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setOnline(new Set());
      return;
    }

    const channel = supabase.channel('app-online', { config: { presence: { key: user.id } } });

    // When they were last here, for "Last seen …" in private chats: on opening and
    // leaving the app, and every minute in between (leaving isn't always recorded)
    const stamp = () => {
      supabase.from('user_presence').upsert({ user_id: user.id, last_seen: new Date().toISOString() }).then(() => undefined);
    };
    const heartbeat = setInterval(() => document.visibilityState === 'visible' && stamp(), 60_000);

    const track = () => {
      stamp();
      if (document.visibilityState === 'visible') channel.track({ at: Date.now() }).catch(() => undefined);
      else channel.untrack().catch(() => undefined);
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') track();
      });

    document.addEventListener('visibilitychange', track);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', track);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return <PresenceContext.Provider value={online}>{children}</PresenceContext.Provider>;
};
