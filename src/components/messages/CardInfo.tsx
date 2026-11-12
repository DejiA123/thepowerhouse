import { useEffect } from 'react';
import { ArrowLeft, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CardSeenSummary } from '@/lib/cardViews';
import { ChatWallpaper } from './ChatWallpaper';
import { formatDayLabel } from './chatUtils';
import { Heading, People, type Person } from './MessageInfo';

/**
 * For the group's admins: "Seen by 5 of 8" under a reminder or a choir song card, and,
 * one tap away, who has seen it and when (CardInfoScreen), like WhatsApp's Message info.
 */
export const SeenByLine = ({ summary, onOpen, tone = 'plain', className }: {
  summary: CardSeenSummary | null;
  onOpen: () => void;
  /** 'amber' on a reminder card */
  tone?: 'plain' | 'amber';
  className?: string;
}) => {
  if (!summary || summary.total === 0) return null;
  const everyone = summary.seen.length === summary.total;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={cn(
        'inline-flex min-h-[28px] items-center gap-1.5 rounded-full px-2 text-[12px] font-medium active:opacity-70',
        tone === 'amber'
          ? 'text-amber-900 hover:bg-amber-100/80 dark:text-amber-200 dark:hover:bg-amber-900/40'
          : 'text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40',
        className,
      )}
      aria-label={`Seen by ${summary.seen.length} of ${summary.total}. See who`}
      data-testid="seen-by"
    >
      <Eye className={cn('h-3.5 w-3.5', everyone && 'text-blue-600 dark:text-blue-400')} />
      <span className="tabular-nums">Seen by {summary.seen.length} of {summary.total}</span>
    </button>
  );
};

const asPerson = (p: { id: string; name: string; avatar: string | null; joinedAt: number }): Person => p;

/** A full screen above the bottom bar (a right-hand panel on computers) */
export const CardInfoScreen = ({ open, title, postedAt, summary, songCount, renderCard, onClose }: {
  open: boolean;
  /** "Reminder info" / "Songs info" */
  title: string;
  postedAt: string;
  /** null while loading */
  summary: CardSeenSummary | null;
  /** A song card: how many songs it has (for "4 of 6 songs") */
  songCount?: number;
  /** The card, drawn as in the chat */
  renderCard: () => React.ReactNode;
  onClose: () => void;
}) => {
  // Escape closes it (computers)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const seenAt = new Map((summary?.seen ?? []).map((s) => [s.person.id, s.at]));
  const partlyOf = new Map((summary?.partly ?? []).map((s) => [s.person.id, s]));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="card-info"
      className="fixed inset-x-0 top-0 bottom-[var(--bottom-nav-h,0px)] z-[200] flex flex-col bg-slate-100 animate-in fade-in slide-in-from-right-full duration-200 motion-reduce:animate-none dark:bg-slate-950 md:left-auto md:w-[420px] md:border-l md:border-border md:shadow-2xl"
    >
      <header className="relative z-10 flex items-center border-b border-border/60 bg-background/90 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-xl md:pt-3">
        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="pointer-events-none absolute inset-x-14 bottom-2 flex h-10 items-center justify-center text-[17px] font-semibold text-foreground">{title}</h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* The card, as it looks in the chat */}
        <div className="relative overflow-hidden px-2 pb-3 pt-4">
          <ChatWallpaper />
          <div className="relative">
            <div className="mb-1 flex justify-center">
              <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">{formatDayLabel(postedAt)}</span>
            </div>
            {renderCard()}
          </div>
        </div>

        <div className="mx-auto max-w-xl px-3 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1.5rem)]">
          {summary === null ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <Heading seen>Seen by{summary.seen.length ? ` · ${summary.seen.length}` : ''}</Heading>
              <People list={summary.seen.map((s) => asPerson(s.person))} timeOfPerson={(p) => seenAt.get(p.id)} empty="No one yet" />
              {summary.partly.length > 0 && (
                <>
                  <Heading seen={false}>Seen some of the songs · {summary.partly.length}</Heading>
                  <People
                    list={summary.partly.map((s) => asPerson(s.person))}
                    timeOfPerson={(p) => partlyOf.get(p.id)?.at}
                    noteOf={(p) => {
                      const s = partlyOf.get(p.id);
                      return s && songCount ? `${s.count} of ${songCount} songs (more were added after)` : null;
                    }}
                    empty=""
                  />
                </>
              )}
              {summary.waiting.length > 0 && (
                <>
                  <Heading seen={false}>Not seen yet · {summary.waiting.length}</Heading>
                  <People list={summary.waiting.map(asPerson)} empty="" />
                </>
              )}
              <p className="mt-5 px-3 text-[12.5px] leading-snug text-muted-foreground" data-testid="card-info-note">
                Seen means it was on their screen in this chat, or they read the chat past it. Only the group’s admins can see this.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
