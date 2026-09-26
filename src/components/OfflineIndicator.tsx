import { useEffect, useState } from 'react';
import { CloudOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A small pill at the top while there's no connection. Tap it to see what
 * still works; a short "Back online" follows when the connection returns.
 */
const OfflineIndicator = () => {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const [expanded, setExpanded] = useState(offline);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const goOffline = () => {
      setOffline(true);
      setBackOnline(false);
      setExpanded(true);
    };
    const goOnline = () => {
      setOffline(false);
      setBackOnline(true);
      clearTimeout(timer);
      timer = setTimeout(() => setBackOnline(false), 2500);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // The explanation folds away into the pill after a few seconds
  useEffect(() => {
    if (!expanded) return;
    const t = setTimeout(() => setExpanded(false), 5000);
    return () => clearTimeout(t);
  }, [expanded]);

  if (!offline && !backOnline) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9400] flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.35rem)]">
      <button
        type="button"
        onClick={() => offline && setExpanded((e) => !e)}
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-auto flex max-w-sm items-center gap-2 rounded-full px-3 py-1.5 text-left font-sans text-[12.5px] font-semibold shadow-lg backdrop-blur-xl transition-all animate-in fade-in slide-in-from-top-2 duration-300',
          offline ? 'bg-slate-900/90 text-white dark:bg-slate-700/95' : 'bg-emerald-600 text-white',
        )}
      >
        {offline ? <CloudOff className="h-3.5 w-3.5 shrink-0" /> : <Wifi className="h-3.5 w-3.5 shrink-0" />}
        {offline ? (
          expanded ? (
            <span className="font-medium leading-snug">
              <span className="font-semibold">You're offline.</span> Everything you've opened before, your downloads and your notes still work.
            </span>
          ) : (
            'Offline'
          )
        ) : (
          'Back online'
        )}
      </button>
    </div>
  );
};

export default OfflineIndicator;
