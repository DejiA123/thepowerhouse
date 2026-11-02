import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { prepareSave, saveToPhone } from '@/lib/saveMedia';
import { appAlert } from '@/lib/appAlert';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';

/** Full-screen photo viewer; tap anywhere or press Escape to close. */
const ImageViewer = ({ url, onClose }: { url: string | null; onClose: () => void }) => {
  const [ready, setReady] = useState(false);
  // Got ready to save as it opens (iPhone shares only straight from a tap)
  useEffect(() => {
    setReady(false);
    if (!url) return;
    let stale = false;
    prepareSave(url, 'photo').then(() => !stale && setReady(true)).catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [url]);

  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [url, onClose]);

  if (!url) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 bottom-[var(--bottom-nav-h,0px)] z-[80] flex items-center justify-center bg-black/95 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-label="Photo"
    >
      <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] flex gap-2">
        <button
          onClick={async (e) => {
            e.stopPropagation();
            const result = await saveToPhone(url, 'photo').catch(() => 'error' as const);
            if (result === 'not-ready') appAlert('Getting it ready…', 'Tap Save again in a moment.');
            else if (result === 'error') appAlert("Couldn't save the photo", 'Check your connection and try again.', 'error');
            else if (result === 'downloaded') appAlert('Saved to your phone');
          }}
          className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20"
          aria-label="Save photo"
        >
          {ready ? <Download className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />} Save
        </button>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <img
        src={url}
        alt="Shared photo"
        className="max-h-[90dvh] max-w-[96vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
};

export default ImageViewer;
