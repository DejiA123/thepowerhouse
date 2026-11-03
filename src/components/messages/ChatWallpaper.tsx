import { useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { useIsMobile } from '@/hooks/use-mobile';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import {
  DEFAULT_WALLPAPER,
  WALLPAPERS,
  removeWallpaperPhoto,
  saveWallpaperPhoto,
  setWallpaperChoice,
  useChatWallpaper,
  wallpaperById,
  wallpaperStyle,
} from '@/lib/chatWallpaper';
import { compressImage } from './chatUtils';

/** The wallpaper behind a chat's messages (fills its parent, which must be `relative`) */
export const ChatWallpaper = ({ className }: { className?: string }) => {
  const { choice, photo } = useChatWallpaper();
  if (choice.id === 'custom' && photo) {
    return (
      <div aria-hidden className={cn('pointer-events-none absolute inset-0 bg-cover bg-center', className)} style={{ backgroundImage: `url("${photo}")` }}>
        {choice.dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: choice.dim / 100 }} />}
      </div>
    );
  }
  const w = wallpaperById(choice.id === 'custom' ? DEFAULT_WALLPAPER.id : choice.id);
  return <div aria-hidden className={cn('pointer-events-none absolute inset-0', className)} style={wallpaperStyle(w)} />;
};

const Tick = () => (
  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow">
    <Check className="h-3.5 w-3.5" strokeWidth={3} />
  </span>
);

/** Me → Settings → Chat wallpaper (also from chat info and the chat list's ⋮): pick one, or add your own photo */
export const WallpaperSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const isMobile = useIsMobile();
  const { choice, photo } = useChatWallpaper();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const usingPhoto = choice.id === 'custom' && !!photo;
  const selected = usingPhoto ? 'custom' : choice.id === 'custom' ? DEFAULT_WALLPAPER.id : choice.id;

  const addPhoto = async (file?: File) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      appAlert('Please choose a photo', '', 'error');
      return;
    }
    setBusy(true);
    try {
      // Big enough for any phone screen, small enough to keep on the phone
      await saveWallpaperPhoto(await compressImage(file, 2000, 0.85));
    } catch {
      appAlert("Couldn't use that photo", 'Try another photo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="flex h-[85dvh] w-full flex-col gap-0 rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <SheetTitle className="flex-1 text-[17px] font-semibold">Chat wallpaper</SheetTitle>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SheetDescription className="sr-only">Choose the background behind your chats, or use one of your own photos.</SheetDescription>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1.25rem)] pt-4">
          {/* How chats will look */}
          <div className="relative h-44 overflow-hidden rounded-2xl ring-1 ring-border/70" data-testid="wallpaper-preview">
            <ChatWallpaper />
            <div className="relative flex h-full flex-col justify-center gap-2 px-3">
              <p className="max-w-[80%] self-start rounded-[18px] rounded-bl-md border border-border/60 bg-card px-3 py-1.5 text-sm text-card-foreground shadow-sm">This is how your chats will look.</p>
              <p className="max-w-[80%] self-end rounded-[18px] rounded-br-md bg-blue-600 px-3 py-1.5 text-sm text-white shadow-sm">Looks lovely!</p>
            </div>
          </div>

          <section>
            <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Wallpaper</h2>
            <div className="grid grid-cols-3 gap-3">
              {WALLPAPERS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWallpaperChoice({ id: w.id })}
                  aria-pressed={selected === w.id}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn('relative block aspect-[3/4] w-full overflow-hidden rounded-2xl', selected === w.id ? 'ring-[3px] ring-blue-600' : 'ring-1 ring-border')}
                    style={{ ...wallpaperStyle(w), backgroundSize: '120px 120px' }}
                  >
                    {selected === w.id && <Tick />}
                  </span>
                  <span className="text-center text-[12.5px] font-medium leading-tight text-foreground">{w.name}</span>
                </button>
              ))}
              {photo ? (
                <button onClick={() => setWallpaperChoice({ id: 'custom' })} aria-pressed={usingPhoto} className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn('relative block aspect-[3/4] w-full overflow-hidden rounded-2xl bg-cover bg-center', usingPhoto ? 'ring-[3px] ring-blue-600' : 'ring-1 ring-border')}
                    style={{ backgroundImage: `url("${photo}")` }}
                  >
                    {usingPhoto && <Tick />}
                  </span>
                  <span className="text-center text-[12.5px] font-medium leading-tight text-foreground">My photo</span>
                </button>
              ) : (
                <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex flex-col items-center gap-1.5">
                  <span className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                    {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                  </span>
                  <span className="text-center text-[12.5px] font-medium leading-tight text-foreground">Add my photo</span>
                </button>
              )}
            </div>
          </section>

          {photo && (
            <section className="space-y-3 rounded-2xl bg-muted/60 p-4">
              {usingPhoto && (
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <label id="wallpaper-dim" className="text-[15px] font-medium text-foreground">Dim photo</label>
                    <span className="text-sm text-muted-foreground">{choice.dim}%</span>
                  </div>
                  <Slider aria-labelledby="wallpaper-dim" value={[choice.dim]} min={0} max={60} step={5} onValueChange={(v) => setWallpaperChoice({ dim: v[0] })} />
                  <p className="mt-2 text-xs text-muted-foreground">Darkening a bright photo makes messages easier to read.</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-background text-sm font-semibold text-foreground shadow-sm ring-1 ring-border"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Change photo
                </button>
                <button
                  onClick={() => void removeWallpaperPhoto()}
                  disabled={busy}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-background text-sm font-semibold text-red-600 shadow-sm ring-1 ring-border dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" /> Remove photo
                </button>
              </div>
            </section>
          )}

          <p className="text-sm leading-relaxed text-muted-foreground">
            Your wallpaper is for you only, on this phone. A photo you add stays on your phone: it isn't uploaded or seen by anyone else.
          </p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void addPhoto(e.target.files?.[0])} />
      </SheetContent>
    </Sheet>
  );
};
