import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';

/** Full-screen photo viewer; tap anywhere or press Escape to close. */
const ImageViewer = ({ url, onClose }: { url: string | null; onClose: () => void }) => {
  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [url, onClose]);

  if (!url) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-label="Photo"
    >
      <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] flex gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Open original"
        >
          <Download className="h-5 w-5" />
        </a>
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
