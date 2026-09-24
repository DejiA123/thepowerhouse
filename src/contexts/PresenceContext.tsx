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

    const track = () => {
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
      document.removeEventListener('visibilitychange', track);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return <PresenceContext.Provider value={online}>{children}</PresenceContext.Provider>;
};
