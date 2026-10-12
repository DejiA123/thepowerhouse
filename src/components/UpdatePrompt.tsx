import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { UPDATE_EVENT, applyUpdate, isUpdateReady } from '@/lib/appUpdate';

/**
 * "A new update is ready" with a Refresh button, whenever a new version of the
 * app has downloaded. "Later" hides it; the update then installs by itself
 * the next time the app is closed.
 */
const UpdatePrompt = () => {
  const [show, setShow] = useState(isUpdateReady);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const onReady = () => setShow(true);
    window.addEventListener(UPDATE_EVENT, onReady);
    return () => window.removeEventListener(UPDATE_EVENT, onReady);
  }, []);

  if (!show) return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-label="A new update is ready"
      className="fixed inset-x-3 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[350] mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 md:bottom-6 md:left-auto md:right-6 md:mx-0"
    >
      <div className="rounded-[24px] border border-blue-100 bg-white p-4 text-slate-900 shadow-2xl shadow-blue-900/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-600/30">
            <RefreshCw className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-outfit text-[19px] font-bold leading-tight">A new update is ready ✨</p>
            <p className="mt-1 text-[15px] leading-snug text-slate-600 dark:text-slate-300">Tap Refresh to get the newest version of the app.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => setShow(false)}
            disabled={updating}
            className="h-12 rounded-full px-5 text-[16px] font-semibold text-slate-500 dark:text-slate-400"
          >
            Later
          </button>
          <button
            onClick={() => {
              setUpdating(true);
              applyUpdate();
            }}
            disabled={updating}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-blue-600 px-6 text-[16.5px] font-bold text-white shadow-md shadow-blue-600/30 transition active:scale-95"
          >
            {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
            {updating ? 'Updating…' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default UpdatePrompt;
