import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { syncNoteDrafts } from '@/lib/offlineNotes';
import { bibleHighlightsService } from '@/services/bibleHighlightsService';
import { readingPlanProgressService } from '@/services/readingPlanProgressService';

/** Sends what was saved on this device while offline once the connection is back. */
const OfflineSync = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const sync = () => {
      if (navigator.onLine === false) return;
      bibleHighlightsService.flush().catch(() => undefined);
      syncNoteDrafts(user.id).catch(() => undefined);
      readingPlanProgressService.load(user.id).catch(() => undefined);
    };
    const t = setTimeout(sync, 2500);
    window.addEventListener('online', sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener('online', sync);
    };
  }, [user]);

  return null;
};

export default OfflineSync;
