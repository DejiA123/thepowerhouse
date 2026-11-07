import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, FileText, ListMusic, Loader2, Music2, Play, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import {
  choirLocations, choirName, hasLyrics, parseLyrics, setChoirLink, setLabel, setlistSections, songKey, splitSetType, youTubeId,
  NATIONAL, type ChoirSongRow, type SongCardGroup,
} from '@/lib/choirChat';
import { formatClock } from './chatUtils';

const sheetClass = 'flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden';

const SheetHeader = ({ title, onClose, sub }: { title: string; onClose: () => void; sub?: string }) => (
  <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
    <div className="min-w-0 flex-1">
      <SheetTitle className="truncate text-[17px] font-semibold">{title}</SheetTitle>
      {sub && <p className="truncate text-[12.5px] text-muted-foreground">{sub}</p>}
    </div>
    <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
      <X className="h-5 w-5" />
    </button>
  </div>
);

/** A song to play or read: Play (YouTube in the sheet, audio in the app's player) or Lyrics */
export type SongView = { song: ChoirSongRow; show: 'play' | 'lyrics' } | null;

/** Plays a song or shows its lyrics */
export const SongSheet = ({ view, onClose }: { view: SongView; onClose: () => void }) => {
  const isMobile = useIsMobile();
  const [shown, setShown] = useState<SongView>(view);
  useEffect(() => {
    if (view) setShown(view);
  }, [view]);
  const song = shown?.song;
  const video = youTubeId(song?.url);
  const lyrics = parseLyrics(song?.lyrics);
  const sub = song ? [songKey(song.key) && `Key ${songKey(song.key)}`, song.artist, setLabel(song.set_type)].filter(Boolean).join(' · ') : '';

  return (
    <Sheet open={!!view} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass}>
        <SheetHeader title={song?.title ?? 'Song'} sub={sub} onClose={onClose} />
        <SheetDescription className="sr-only">{shown?.show === 'play' ? 'Plays the song' : 'The song’s lyrics'}</SheetDescription>
        {song && (
          <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1.25rem)]">
            {shown?.show === 'play' && video && (
              <div className="aspect-video w-full bg-black">
                <iframe
                  key={video}
                  src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1&playsinline=1&rel=0`}
                  title={song.title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}
            <div className="px-4 pt-4">
              {hasLyrics(song.lyrics) ? (
                <>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Lyrics</p>
                  {lyrics.text.trim() && <p className="whitespace-pre-wrap text-[16px] leading-relaxed text-foreground [overflow-wrap:anywhere]">{lyrics.text.trim()}</p>}
                  {lyrics.imageUrl && <img src={lyrics.imageUrl} alt={`Lyrics of ${song.title}`} className="mt-3 w-full rounded-2xl ring-1 ring-border" />}
                </>
              ) : (
                <p className="rounded-2xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">No lyrics added for this song yet.</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

/** Play: YouTube opens in the sheet; a recording plays in the app's player (keeps playing with the screen off) */
export function useSongPlayer(onShow: (view: SongView) => void) {
  const { playTrack } = useGlobalAudio();
  return (song: ChoirSongRow) => {
    if (!song.url) return onShow({ song, show: 'lyrics' });
    if (youTubeId(song.url)) return onShow({ song, show: 'play' });
    playTrack(song.url, song.title, song.artist || choirSetName(song)).catch(() => {
      window.open(song.url!, '_blank', 'noopener');
    });
  };
}

const choirSetName = (song: ChoirSongRow) => setLabel(song.set_type);

const SongRow = ({ song, onPlay, onLyrics, compact = false }: { song: ChoirSongRow; onPlay: () => void; onLyrics: () => void; compact?: boolean }) => (
  <div className={cn('flex items-center gap-2.5', compact ? 'py-1.5' : 'py-2')}>
    <button
      type="button"
      onClick={onPlay}
      disabled={!song.url}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition active:scale-90 disabled:bg-muted disabled:text-muted-foreground"
      aria-label={`Play ${song.title}`}
    >
      <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
    </button>
    <div className="min-w-0 flex-1">
      <p className="truncate text-[15px] font-semibold leading-tight text-foreground">{song.title}</p>
      <p className="truncate text-[12.5px] text-muted-foreground">{[songKey(song.key) && `Key ${songKey(song.key)}`, song.artist].filter(Boolean).join(' · ') || setLabel(song.set_type)}</p>
    </div>
    <button
      type="button"
      onClick={onLyrics}
      className={cn('flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold transition active:scale-95', hasLyrics(song.lyrics) ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-muted text-muted-foreground')}
      aria-label={`Lyrics of ${song.title}`}
    >
      <FileText className="h-3.5 w-3.5" /> Lyrics
    </button>
  </div>
);

/**
 * In a choir's chat: "New in Praise Set" each time songs are added on the choir
 * page, with Play and Lyrics. Several added together make one card.
 */
export const ChoirSongCard = ({ group, location, onView, onPlay }: { group: SongCardGroup; location: string; onView: (v: SongView) => void; onPlay: (song: ChoirSongRow) => void }) => {
  const { day } = splitSetType(group.setType);
  const many = group.songs.length > 1;
  return (
    <div className="my-1.5 flex justify-start" data-testid="song-card">
      <div className="w-[min(88%,340px)] overflow-hidden rounded-[20px] rounded-bl-md border border-border/60 bg-card shadow-sm">
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2.5 text-white">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20"><Music2 className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold leading-tight">
              {many ? `${group.songs.length} songs added to ${setLabel(group.setType).split(' · ')[0]}` : `New in ${setLabel(group.setType).split(' · ')[0]}`}
            </p>
            <p className="truncate text-[11.5px] text-white/80">{choirName(location)}{day ? ` · Day ${day}` : ''}</p>
          </div>
        </div>
        <div className="divide-y divide-border/50 px-3">
          {group.songs.slice(0, 8).map((song) => (
            <SongRow key={song.id} song={song} onPlay={() => onPlay(song)} onLyrics={() => onView({ song, show: 'lyrics' })} compact={many} />
          ))}
          {group.songs.length > 8 && <p className="py-2 text-center text-[12.5px] text-muted-foreground">+ {group.songs.length - 8} more in the setlist</p>}
        </div>
        <p className="px-3.5 pb-1.5 text-right text-[11px] text-muted-foreground">{formatClock(group.at)}</p>
      </div>
    </div>
  );
};

/** Under the chat's header: this week's setlist, one tap away (like a pinned message) */
export const SetlistBanner = ({ location, count, onOpen }: { location: string; count: number | null; onOpen: () => void }) => (
  <button
    onClick={onOpen}
    className="z-10 flex w-full items-center gap-3 border-b border-border/60 bg-background/95 px-3 py-2 text-left backdrop-blur-xl"
    aria-label="Open the setlist"
    data-testid="setlist-banner"
  >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white"><ListMusic className="h-4 w-4" /></span>
    <span className="min-w-0 w-0 flex-1">
      <span className="block truncate text-xs font-semibold text-blue-600 dark:text-blue-400">{location === NATIONAL ? `${choirName(location)} setlist` : 'This Sunday’s setlist'}</span>
      <span className="block truncate text-sm text-foreground">
        {count === null ? 'Loading…' : count === 0 ? 'No songs yet' : `${count} ${count === 1 ? 'song' : 'songs'} · Play and lyrics`}
      </span>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
  </button>
);

/** The whole setlist: each set's songs with Play and Lyrics, and the way to the choir page */
export const SetlistSheet = ({ open, onOpenChange, location, songs, onView, onPlay }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: string;
  songs: ChoirSongRow[] | null;
  onView: (v: SongView) => void;
  onPlay: (song: ChoirSongRow) => void;
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const sections = setlistSections(songs ?? []);
  let lastDay: number | null = null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass}>
        <SheetHeader title={location === NATIONAL ? 'Setlist' : 'This Sunday’s setlist'} sub={choirName(location)} onClose={() => onOpenChange(false)} />
        <SheetDescription className="sr-only">The songs for the service, with play and lyrics</SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 px-4 pb-4 pt-3">
          {songs === null ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : sections.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No songs in the setlist yet. They show here as soon as they’re added on the choir page.</p>
          ) : (
            sections.map((section) => {
              const { day } = splitSetType(section.setType);
              const showDay = day !== null && day !== lastDay;
              lastDay = day;
              return (
                <div key={section.setType}>
                  {showDay && <p className="mb-1 mt-3 text-[13px] font-bold uppercase tracking-wide text-foreground first:mt-0">Day {day}</p>}
                  <section className="mb-3 rounded-2xl bg-card px-3 shadow-sm">
                    <p className="border-b border-border/50 py-2.5 text-[13px] font-semibold text-blue-700 dark:text-blue-300">{section.label.split(' · ')[0]}</p>
                    <div className="divide-y divide-border/50">
                      {section.songs.map((song) => (
                        <SongRow key={song.id} song={song} onPlay={() => onPlay(song)} onLyrics={() => onView({ song, show: 'lyrics' })} />
                      ))}
                    </div>
                  </section>
                </div>
              );
            })
          )}
        </div>
        <div className="border-t border-border/60 px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)] pt-3">
          <button
            onClick={() => {
              onOpenChange(false);
              navigate(`/groups/choir/${location}`);
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-muted text-[15px] font-semibold text-foreground active:scale-[0.98]"
          >
            <Music2 className="h-4 w-4" /> Open the choir page
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/** Chat info → Choir: which choir's songs and setlist this chat shows */
export const ChoirPickerSheet = ({ open, onOpenChange, chatId, current, canChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  current: string | null;
  canChange: boolean;
}) => {
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState<string | null>(null);
  const pick = async (location: string) => {
    if (!canChange || location === (current ?? '')) return;
    setBusy(location);
    try {
      await setChoirLink(chatId, location);
      onOpenChange(false);
    } catch (e) {
      appAlert('Couldn’t change it', (e as Error).message?.includes('admins') ? 'Only the group’s admins can link it to a choir.' : 'Check your connection and try again.', 'error');
    } finally {
      setBusy(null);
    }
  };
  const options = [{ id: '', name: 'None' }, ...choirLocations()];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass}>
        <SheetHeader title="Choir" onClose={() => onOpenChange(false)} />
        <SheetDescription className="px-4 pt-3 text-[13.5px] text-muted-foreground">
          {canChange
            ? 'Songs added to this choir’s setlist appear here with Play and Lyrics, and the setlist is pinned at the top of the chat.'
            : 'Only the group’s admins can change this.'}
        </SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)] pt-2">
          {options.map((o) => {
            const on = (current ?? '') === o.id;
            return (
              <button
                key={o.id || 'none'}
                onClick={() => pick(o.id)}
                disabled={!canChange || !!busy}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15.5px] text-foreground hover:bg-muted disabled:opacity-100"
              >
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', o.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-muted text-muted-foreground')}>
                  {o.id ? <Music2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </span>
                <span className="flex-1">{o.name}</span>
                {busy === o.id ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : on && <Check className="h-5 w-5 text-blue-600" />}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
