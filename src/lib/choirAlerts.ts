import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { followTopic, isFollowingTopic } from '@/lib/push';

/** The old "Song alerts" bell's opt-out (Nov 2026: the bell is gone, alerts are always on) */
const OLD_OPT_OUT = (location: string) => `choir_alerts_optout_${location}`;

/** Choirs this phone has told the server about this session */
const told = new Set<string>();

/**
 * Song alerts are always on (the church's choice, Nov 2026: no "Alerts on" button):
 * opening a choir's page follows that choir (`choir:<location>`), so its phone is told
 * when songs are added. Without notifications on yet, the choir is kept on the phone
 * and included as soon as they're turned on. Anyone who switched the old bell off is
 * switched back on.
 */
export function useChoirSongAlerts(location: string | undefined) {
  const { state } = usePushNotifications();
  useEffect(() => {
    if (!location || state === 'loading') return;
    const topic = `choir:${location}`;
    try {
      localStorage.removeItem(OLD_OPT_OUT(location));
    } catch {
      /* private window */
    }
    if (state === 'on') {
      // Once a session, so a follow that failed earlier is made good
      if (told.has(topic)) return;
      told.add(topic);
      followTopic(topic)
        .then((ok) => !ok && told.delete(topic))
        .catch(() => told.delete(topic));
    } else if (!isFollowingTopic(topic)) {
      void followTopic(topic).catch(() => undefined);
    }
  }, [location, state]);
}
