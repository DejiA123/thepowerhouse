import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Loader2, MoreHorizontal } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { timeOf } from '@/lib/offlineNotes';
import { cn } from '@/lib/utils';
import { GroupChatService, type ChatMessage } from '@/services/groupChatService';
import { ChatWallpaper } from './ChatWallpaper';
import { formatClock, formatDayLabel } from './chatUtils';

export interface Person {
  id: string;
  name: string;
  avatar: string | null;
  joinedAt: number;
}

/** How many names show before "•••" */
const FIRST = 6;

/** "today 11:45", "yesterday 20:10", "Mon 18:03", "12 Nov 18:03", as WhatsApp's Message info */
function whenLabel(iso: string) {
  const d = new Date(timeOf(iso));
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const day =
    d.toDateString() === now.toDateString() ? 'today'
      : d.toDateString() === yesterday.toDateString() ? 'yesterday'
        : now.getTime() - d.getTime() < 6 * 86_400_000 ? d.toLocaleDateString([], { weekday: 'short' })
          : d.toLocaleDateString([], { day: 'numeric', month: 'short', ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }) });
  return { day, time: formatClock(d.toISOString()) };
}

export const When = ({ iso }: { iso: string | null | undefined }) => {
  if (!iso) return null;
  const { day, time } = whenLabel(iso);
  return (
    <span className="shrink-0 whitespace-nowrap text-[14px] tabular-nums">
      <span className="text-muted-foreground">{day}</span> <span className="text-foreground">{time}</span>
    </span>
  );
};

export const Heading = ({ seen, children }: { seen: boolean; children: React.ReactNode }) => (
  <h3 className="mb-2 mt-6 flex items-center gap-2 px-3 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
    {seen ? <CheckCheck className="h-[18px] w-[18px] text-blue-600 dark:text-blue-400" /> : <Check className="h-[18px] w-[18px]" />}
    {children}
  </h3>
);

export const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-hidden rounded-2xl bg-background shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">{children}</div>
);

const Row = ({ person, when, note }: { person: Person; when?: string | null; note?: string | null }) => (
  <div className="flex min-h-[64px] items-center gap-3 px-4 py-2" data-testid="info-person">
    <UserAvatar name={person.name} src={person.avatar} seed={person.id} className="h-11 w-11" />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[16px] text-foreground">{person.name}</span>
      {note && <span className="block truncate text-[13px] text-muted-foreground">{note}</span>}
    </span>
    <When iso={when} />
  </div>
);

/** A list that shows the first few names, then "•••" for the rest (like WhatsApp) */
export const People = ({ list, timeOfPerson, noteOf, empty }: { list: Person[]; timeOfPerson?: (p: Person) => string | null | undefined; noteOf?: (p: Person) => string | null; empty: string }) => {
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, FIRST);
  return (
    <Card>
      {list.length === 0 ? (
        <p className="px-4 py-4 text-[15px] text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y divide-border/60">
          {shown.map((p) => <Row key={p.id} person={p} when={timeOfPerson?.(p)} note={noteOf?.(p)} />)}
          {list.length > shown.length && (
            <button
              type="button"
              onClick={() => setAll(true)}
              className="flex h-12 w-full items-center justify-center text-muted-foreground active:bg-muted"
              aria-label={`Show ${list.length - shown.length} more`}
            >
              <MoreHorizontal className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

/**
 * Message info, like WhatsApp (swipe my message left, or long-press → Info): the message
 * as it looks in the chat, then who has seen it and when, and who hasn't yet. Times come
 * from chat_message_reads (when each person first read up to it); someone who sees it
 * while this is open is timed there and then. A full screen above the bottom bar.
 */
export const MessageInfoScreen = ({
  message,
  chatId,
  privateChat,
  myId,
  readMarks,
  onClose,
  renderBubble,
}: {
  message: ChatMessage | null;
  chatId: string;
  /** One-to-one: "Seen" and "Sent" instead of lists */
  privateChat: boolean;
  myId: string;
  /** Each member's "read up to" time */
  readMarks: Record<string, string>;
  onClose: () => void;
  /** The message drawn exactly as in the chat */
  renderBubble: (message: ChatMessage) => React.ReactNode;
}) => {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [times, setTimes] = useState<Record<string, string | null>>({});
  /** Seen while this screen was open: timed when it happened */
  const [liveSeen, setLiveSeen] = useState<Record<string, string>>({});
  const seenAtOpen = useRef<Set<string> | null>(null);
  const messageId = message?.id;
  const sentAt = message ? timeOf(message.created_at) : 0;

  useEffect(() => {
    if (!messageId) return;
    let cancelled = false;
    setPeople(null);
    setTimes({});
    setLiveSeen({});
    seenAtOpen.current = null;
    Promise.all([
      GroupChatService.getParticipants(chatId).catch(() => []),
      GroupChatService.getMessageReads(messageId).catch(() => ({})),
    ]).then(([list, reads]) => {
      if (cancelled) return;
      setTimes(reads);
      setPeople(
        list
          .filter((p) => p.user_id !== myId)
          .map((p) => ({ id: p.user_id, name: p.user?.full_name || 'Member', avatar: p.user?.avatar_url ?? null, joinedAt: timeOf(p.joined_at) })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [messageId, chatId, myId]);

  // Escape closes it (computers)
  useEffect(() => {
    if (!messageId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [messageId, onClose]);

  const hasSeen = (id: string) => (readMarks[id] ? timeOf(readMarks[id]) >= sentAt : false) || id in times;
  const seenIds = useMemo(() => new Set((people || []).filter((p) => hasSeen(p.id)).map((p) => p.id)), [people, readMarks, times, sentAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Someone sees it while this is open: time it now, and ask the server for its own time
  useEffect(() => {
    if (!people || !messageId) return;
    if (!seenAtOpen.current) {
      seenAtOpen.current = new Set(seenIds);
      return;
    }
    const fresh = [...seenIds].filter((id) => !seenAtOpen.current!.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => seenAtOpen.current!.add(id));
    const now = new Date().toISOString();
    setLiveSeen((prev) => ({ ...prev, ...Object.fromEntries(fresh.map((id) => [id, now])) }));
    const t = setTimeout(() => {
      GroupChatService.getMessageReads(messageId).then((reads) => setTimes((prev) => ({ ...prev, ...reads }))).catch(() => undefined);
    }, 1500);
    return () => clearTimeout(t);
  }, [seenIds, people, messageId]);

  if (!message) return null;

  const timeFor = (p: Person) => times[p.id] ?? liveSeen[p.id] ?? null;
  const byName = (a: Person, b: Person) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  const seen = (people || []).filter((p) => seenIds.has(p.id)).sort(byName);
  // Not seen yet: only people who were in the chat when it was sent
  const waiting = (people || []).filter((p) => !seenIds.has(p.id) && (!p.joinedAt || p.joinedAt <= sentAt + 1000)).sort(byName);
  const other = privateChat ? (people || [])[0] : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Message info"
      data-testid="message-info"
      className="fixed inset-x-0 top-0 bottom-[var(--bottom-nav-h,0px)] z-[200] flex flex-col bg-slate-100 animate-in fade-in slide-in-from-right-full duration-200 motion-reduce:animate-none dark:bg-slate-950 md:left-auto md:w-[420px] md:border-l md:border-border md:shadow-2xl"
    >
      <header className="relative z-10 flex items-center border-b border-border/60 bg-background/90 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-xl md:pt-3">
        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="pointer-events-none absolute inset-x-14 bottom-2 flex h-10 items-center justify-center text-[17px] font-semibold text-foreground">Message info</h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* The message, as it looks in the chat */}
        <div className="relative overflow-hidden px-2 pb-3 pt-4">
          <ChatWallpaper />
          <div className="relative">
            <div className="mb-3 flex justify-center">
              <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">{formatDayLabel(message.created_at)}</span>
            </div>
            <div className="pointer-events-auto">{renderBubble(message)}</div>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-3 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1.5rem)]">
          {people === null ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : privateChat ? (
            <div className="mt-5">
              <Card>
                <div className="divide-y divide-border/60">
                  <div className="flex min-h-[56px] items-center gap-3 px-4 py-2" data-testid="info-seen">
                    <CheckCheck className={cn('h-5 w-5', other && seenIds.has(other.id) ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground')} />
                    <span className="flex-1 text-[16px] text-foreground">{other && seenIds.has(other.id) ? 'Seen' : 'Not seen yet'}</span>
                    {other && seenIds.has(other.id) ? (timeFor(other) ? <When iso={timeFor(other)} /> : null) : <span className="text-muted-foreground">—</span>}
                  </div>
                  <div className="flex min-h-[56px] items-center gap-3 px-4 py-2">
                    <Check className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-[16px] text-foreground">Sent</span>
                    <When iso={message.created_at} />
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <>
              <Heading seen>Seen by{seen.length ? ` · ${seen.length}` : ''}</Heading>
              <People list={seen} timeOfPerson={timeFor} empty="No one yet" />
              {waiting.length > 0 && (
                <>
                  <Heading seen={false}>Not seen yet · {waiting.length}</Heading>
                  <People list={waiting} empty="" />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
