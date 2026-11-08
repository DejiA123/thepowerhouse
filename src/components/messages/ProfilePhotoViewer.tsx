import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, Download, Loader2, Pencil } from 'lucide-react';
import { prepareSave, saveToPhone } from '@/lib/saveMedia';
import { appAlert } from '@/lib/appAlert';

/**
 * A group's (or a person's) profile photo, full screen like WhatsApp: tap the photo in
 * chat info. Black page with Back, the name and the photo as large as it fits (never
 * cropped), plus Save, and Edit for those who can change it (a group's admins). Its own
 * Radix dialog, so it opens over chat info (a sheet) without closing it; Back or Escape
 * returns to chat info. Ends above the bottom bar like every full-screen layer.
 */
const ProfilePhotoViewer = ({
  src,
  title,
  onClose,
  onEdit,
}: {
  /** The photo to show (null = closed) */
  src: string | null;
  title: string;
  onClose: () => void;
  /** Change the photo (shown only when given) */
  onEdit?: () => void;
}) => {
  const [ready, setReady] = useState(false);
  // Got ready to save as it opens (iPhone shares only straight from a tap)
  useEffect(() => {
    setReady(false);
    if (!src) return;
    let stale = false;
    prepareSave(src, 'photo').then(() => !stale && setReady(true)).catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [src]);

  const save = async () => {
    if (!src) return;
    const result = await saveToPhone(src, 'photo').catch(() => 'error' as const);
    if (result === 'not-ready') appAlert('Getting it ready…', 'Tap Save again in a moment.');
    else if (result === 'error') appAlert("Couldn't save the photo", 'Check your connection and try again.', 'error');
    else if (result === 'downloaded') appAlert('Saved to your phone');
  };

  return (
    <DialogPrimitive.Root open={!!src} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-x-0 top-0 bottom-[var(--bottom-nav-h,0px)] z-[250] flex flex-col bg-black outline-none animate-in fade-in duration-150"
          data-testid="profile-photo"
        >
          <header className="flex items-center gap-1 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-white">
            <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="Back">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate text-[18px] font-semibold">{title}</DialogPrimitive.Title>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
                aria-label="Change photo"
              >
                <Pencil className="h-5 w-5" />
              </button>
            )}
            <button type="button" onClick={save} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10" aria-label="Save photo">
              {ready ? <Download className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
            </button>
          </header>
          <div className="flex min-h-0 flex-1 items-center justify-center pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+3rem)]">
            {src && <img src={src} alt={`${title} photo`} className="max-h-full w-full max-w-[640px] object-contain" />}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default ProfilePhotoViewer;
