import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasDrafts, syncNoteDrafts } from '@/lib/offlineNotes';
import { bibleHighlightsService } from '@/services/bibleHighlightsService';
import { readingPlanProgressService } from '@/services/readingPlanProgressService';

/** Sends what was saved on this device while offline once the connection is back. */
const OfflineSync = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const sync = () => {
      if (navigator.onLine === false) return;
      // Send highlights made offline, then refresh the phone's copy of them
      bibleHighlightsService.flush().then(() => bibleHighlightsService.refreshCopy(user.id)).catch(() => undefined);
      syncNoteDrafts(user.id).catch(() => undefined);
      readingPlanProgressService.load(user.id).catch(() => undefined);
    };
    const t = setTimeout(sync, 2500);
    // Home Screen apps often miss "online": also when the app is back on screen,
    // and every 30 s while notes or highlights made offline are waiting
    const onVisible = () => document.visibilityState === 'visible' && sync();
    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (hasDrafts(user.id)) syncNoteDrafts(user.id).catch(() => undefined);
      if (bibleHighlightsService.waiting()) bibleHighlightsService.flush().catch(() => undefined);
    }, 30_000);
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      clearTimeout(t);
      clearInterval(poll);
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, [user]);

  return null;
};

export default OfflineSync;
