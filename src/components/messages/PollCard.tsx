import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, ListChecks, Loader2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import UserAvatar from '@/components/common/UserAvatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { POLL_TEMPLATES, type PollVote } from '@/lib/polls';
import { chatPeopleCached, type CardPerson } from '@/lib/cardViews';
import { GroupChatService } from '@/services/groupChatService';
import { MAX_POLL_OPTIONS, timeMs, type Poll } from './chatUtils';
import { When } from './MessageInfo';

/**
 * A poll in a chat, like WhatsApp's: tap an option to vote (tap it again to take
 * the vote back; "Select one or more" polls take several). Counts and bars move
 * as people vote; "View votes" shows who picked what, and when. The group's admins
 * (`adminView`) also see how many have voted and seen it out of everyone ("View votes
 * (5 of 8)", "Seen by 7 of 8") and, in Poll details, who has seen it without voting (with
 * when) and who hasn't seen it yet: the members who were in the group when it was sent.
 * Seen = read up to it (`readMarks`, live), voted, or its time from `chat_message_reads`.
 */
export const PollCard = ({
  poll, votes, myId, isOwn, onVote, chatId, meta, adminView = false, sentAt, messageId, senderId, readMarks,
}: {
  poll: Poll;
  votes: PollVote[];
  myId?: string;
  isOwn: boolean;
  onVote?: (option: number) => void;
  chatId: string;
  meta: React.ReactNode;
  adminView?: boolean;
  /** When the poll was sent (who could have voted) */
  sentAt?: string;
  /** Admins: the poll message (for when each person saw it), its sender, and how far each member has read */
  messageId?: string;
  senderId?: string;
  readMarks?: Record<string, string>;
}) => {
  const [showVotes, setShowVotes] = useState(false);
  const counts = poll.options.map((_, i) => votes.filter((v) => v.option_index === i).length);
  const mine = new Set(votes.filter((v) => v.user_id === myId).map((v) => v.option_index));
  const voterIds = useMemo(() => new Set(votes.map((v) => v.user_id)), [votes]);
  const voters = voterIds.size;
  const most = Math.max(1, ...counts);
  // The group's members, for admins: everyone who could vote, and who hasn't yet
  const [people, setPeople] = useState<CardPerson[] | null>(null);
  useEffect(() => {
    if (!adminView) return;
    let stale = false;
    chatPeopleCached(chatId).then((list) => !stale && setPeople(list)).catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [adminView, chatId, showVotes]);
  const notVoted = useMemo(() => {
    if (!adminView || !people) return null;
    const sent = sentAt ? timeMs(sentAt) : Date.now();
    return people
      .filter((p) => !voterIds.has(p.id) && (!p.joinedAt || p.joinedAt <= sent + 1000))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [adminView, people, voterIds, sentAt]);
  const label = notVoted ? `View votes (${voters} of ${voters + notVoted.length})` : `View votes${voters ? ` (${voters})` : ''}`;

  // Who has seen it (admins): read up to it, voted, sent it, or me; with when, from the read log
  const sent = sentAt ? timeMs(sentAt) : 0;
  const [reads, setReads] = useState<Record<string, string | null>>({});
  const readUpTo = useMemo(
    () => Object.entries(readMarks ?? {}).filter(([, at]) => timeMs(at) >= sent).map(([id]) => id).sort().join(','),
    [readMarks, sent],
  );
  useEffect(() => {
    if (!adminView || !messageId) return;
    let stale = false;
    // A moment after someone new reads up to it, ask for their time
    const t = setTimeout(() => {
      GroupChatService.getMessageReads(messageId).then((r) => !stale && setReads(r)).catch(() => undefined);
    }, readUpTo ? 600 : 0);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [adminView, messageId, readUpTo, showVotes]);
  const hasSeen = (id: string) =>
    id === myId || id === senderId || voterIds.has(id) || id in reads || (!!readMarks?.[id] && timeMs(readMarks[id]) >= sent);
  const firstVote = (id: string) => votes.filter((v) => v.user_id === id && v.created_at).map((v) => v.created_at!).sort()[0] ?? null;
  const seenAt = (id: string) => reads[id] ?? firstVote(id);
  const seenNotVoted = notVoted?.filter((p) => hasSeen(p.id)) ?? null;
  const notSeen = notVoted?.filter((p) => !hasSeen(p.id)) ?? null;
  const seenCount = notVoted && seenNotVoted ? voters + seenNotVoted.length : null;
  const total = notVoted ? voters + notVoted.length : null;

  return (
    <div className="min-w-[230px] max-w-[300px] py-0.5" data-testid="poll">
      <p className="text-[15.5px] font-semibold leading-snug [overflow-wrap:anywhere]">{poll.question}</p>
      <p className={cn('mb-2 mt-0.5 flex items-center gap-1 text-[12px]', isOwn ? 'text-white/75' : 'text-muted-foreground')}>
        {poll.multi ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        {poll.multi ? 'Select one or more' : 'Select one'}
      </p>
      <div className="space-y-2.5">
        {poll.options.map((option, i) => {
          const picked = mine.has(i);
          return (
            <button
              key={i}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onVote?.(i);
              }}
              disabled={!onVote}
              className="block w-full text-left"
              aria-pressed={picked}
              aria-label={`${option}: ${counts[i]} ${counts[i] === 1 ? 'vote' : 'votes'}`}
            >
              <span className="flex items-center gap-2.5">
                <span className={cn(
                  'flex h-[22px] w-[22px] shrink-0 items-center justify-center border-2 transition',
                  poll.multi ? 'rounded-md' : 'rounded-full',
                  picked
                    ? isOwn ? 'border-white bg-white text-blue-600' : 'border-emerald-500 bg-emerald-500 text-white'
                    : isOwn ? 'border-white/70' : 'border-muted-foreground/50',
                )}>
                  {picked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 text-[14.5px] leading-snug [overflow-wrap:anywhere]">{option}</span>
                <span className={cn('shrink-0 text-[13px] font-semibold tabular-nums', isOwn ? 'text-white/90' : 'text-muted-foreground')}>{counts[i]}</span>
              </span>
              <span className={cn('ml-[32px] mt-1.5 block h-[5px] overflow-hidden rounded-full', isOwn ? 'bg-white/25' : 'bg-muted')}>
                <span
                  className={cn('block h-full rounded-full transition-[width] duration-300', isOwn ? 'bg-white' : 'bg-emerald-500')}
                  style={{ width: `${(counts[i] / most) * 100}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>
      <div className={cn('mt-2.5 flex items-end justify-between gap-2 border-t pt-1.5', isOwn ? 'border-white/20' : 'border-border/70')}>
        <div className="flex min-w-0 flex-col items-start">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowVotes(true);
            }}
            className={cn('-ml-1 rounded-full px-1 py-1 text-[13.5px] font-semibold', isOwn ? 'text-white' : 'text-blue-600 dark:text-blue-400')}
          >
            {label}
          </button>
          {seenCount !== null && total ? (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setShowVotes(true);
              }}
              className={cn('-ml-1 -mt-1 rounded-full px-1 py-0.5 text-[12px] font-medium', isOwn ? 'text-white/85' : 'text-muted-foreground')}
              data-testid="poll-seen-by"
            >
              Seen by {seenCount} of {total}
            </button>
          ) : null}
        </div>
        {meta}
      </div>
      <PollVotesSheet
        open={showVotes}
        onOpenChange={setShowVotes}
        poll={poll}
        votes={votes}
        chatId={chatId}
        myId={myId}
        admin={notVoted && seenNotVoted && notSeen && seenCount !== null && total !== null ? { seenNotVoted, notSeen, seenAt, seenCount, total, voters } : null}
      />
    </div>
  );
};

/** Who voted for what (and when); for the group's admins, who has seen it without voting and who hasn't seen it */
const PollVotesSheet = ({ open, onOpenChange, poll, votes, chatId, myId, admin }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poll: Poll;
  votes: PollVote[];
  chatId: string;
  myId?: string;
  /** Admins only (null: not shown) */
  admin: {
    seenNotVoted: CardPerson[];
    notSeen: CardPerson[];
    seenAt: (id: string) => string | null;
    seenCount: number;
    total: number;
    voters: number;
  } | null;
}) => {
  const isMobile = useIsMobile();
  const [members, setMembers] = useState<CardPerson[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let stale = false;
    chatPeopleCached(chatId)
      .then((list) => !stale && setMembers(list))
      .catch(() => !stale && setMembers((m) => m ?? []));
    return () => {
      stale = true;
    };
  }, [open, chatId]);

  const byId = useMemo(() => new Map((members ?? []).map((m) => [m.id, m])), [members]);
  const nameOf = (id: string) => (id === myId ? 'You' : byId.get(id)?.name ?? 'A former member');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <SheetTitle className="flex-1 text-[17px] font-semibold">Poll details</SheetTitle>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SheetDescription className="sr-only">Who voted for each option</SheetDescription>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/30 px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1.25rem)] pt-4" data-testid="poll-details">
          <div className="rounded-2xl bg-card px-4 py-3 shadow-sm">
            <p className="text-[16px] font-semibold text-foreground">{poll.question}</p>
            {admin && (
              <p className="mt-1 text-[13px] text-muted-foreground" data-testid="poll-summary">
                Seen by {admin.seenCount} of {admin.total} · Voted {admin.voters} of {admin.total}
              </p>
            )}
          </div>
          {poll.options.map((option, i) => {
            const who = votes.filter((v) => v.option_index === i);
            return (
              <section key={i} className="rounded-2xl bg-card shadow-sm">
                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                  <p className="min-w-0 flex-1 text-[15px] font-semibold text-foreground [overflow-wrap:anywhere]">{option}</p>
                  <span className="shrink-0 text-[13px] text-muted-foreground">{who.length} {who.length === 1 ? 'vote' : 'votes'}</span>
                </div>
                {who.length === 0 ? (
                  <p className="px-4 py-3 text-[13.5px] text-muted-foreground">No votes</p>
                ) : members === null ? (
                  <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : (
                  <ul className="py-1">
                    {who.map((v) => {
                      const m = byId.get(v.user_id);
                      return (
                        <li key={v.user_id} className="flex items-center gap-3 px-4 py-2">
                          <UserAvatar name={m?.name ?? 'Member'} src={m?.avatar} seed={v.user_id} className="h-9 w-9" />
                          <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{nameOf(v.user_id)}</span>
                          {v.created_at && <When iso={v.created_at} />}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
          {admin && (
            <section className="rounded-2xl bg-card shadow-sm" data-testid="poll-not-voted">
              <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                <p className="min-w-0 flex-1 text-[15px] font-semibold text-foreground">Seen, not voted yet</p>
                <span className="shrink-0 text-[13px] text-muted-foreground">{admin.seenNotVoted.length}</span>
              </div>
              {admin.seenNotVoted.length === 0 ? (
                <p className="px-4 py-3 text-[13.5px] text-muted-foreground">{admin.notSeen.length ? 'No one' : 'Everyone who has seen it has voted'}</p>
              ) : (
                <ul className="py-1">
                  {admin.seenNotVoted.map((p) => {
                    const at = p.id === myId ? null : admin.seenAt(p.id);
                    return (
                      <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                        <UserAvatar name={p.name} src={p.avatar} seed={p.id} className="h-9 w-9" />
                        <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{nameOf(p.id)}</span>
                        {at ? <When iso={at} /> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
          {admin && (
            <section className="rounded-2xl bg-card shadow-sm" data-testid="poll-not-seen">
              <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                <p className="min-w-0 flex-1 text-[15px] font-semibold text-foreground">Not seen yet</p>
                <span className="shrink-0 text-[13px] text-muted-foreground">{admin.notSeen.length}</span>
              </div>
              {admin.notSeen.length === 0 ? (
                <p className="px-4 py-3 text-[13.5px] text-muted-foreground">Everyone has seen it</p>
              ) : (
                <ul className="py-1">
                  {admin.notSeen.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2">
                      <UserAvatar name={p.name} src={p.avatar} seed={p.id} className="h-9 w-9" />
                      <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{nameOf(p.id)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="border-t border-border/50 px-4 py-2.5 text-[12px] text-muted-foreground">Only the group’s admins see who has seen the poll or hasn’t voted.</p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

/** Make a poll: question, options (up to 12), one or several answers; ready-made ones for the choir */
export const NewPollSheet = ({ open, onOpenChange, onSend }: { open: boolean; onOpenChange: (open: boolean) => void; onSend: (poll: Poll) => void }) => {
  const isMobile = useIsMobile();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [multi, setMulti] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuestion('');
    setOptions(['', '']);
    setMulti(false);
  }, [open]);

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const ready = question.trim().length > 0 && filled.length >= 2;

  const setOption = (i: number, value: string) => {
    setOptions((prev) => {
      const next = prev.map((o, j) => (j === i ? value : o));
      // Like WhatsApp: a new empty option appears as the last one is filled in
      if (i === next.length - 1 && value.trim() && next.length < MAX_POLL_OPTIONS) next.push('');
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <SheetTitle className="flex-1 text-[17px] font-semibold">Create poll</SheetTitle>
        </div>
        <SheetDescription className="sr-only">Ask the chat a question with options to vote on.</SheetDescription>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-4">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {POLL_TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => {
                  setQuestion(t.question);
                  setOptions(t.options.length < MAX_POLL_OPTIONS ? [...t.options, ''] : t.options);
                  setMulti(!!t.multi);
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-2 text-[13.5px] font-semibold text-blue-700 active:scale-95 dark:bg-blue-950/60 dark:text-blue-300"
              >
                <ListChecks className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">Question</span>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Ask a question"
              className="w-full resize-none rounded-2xl border border-border bg-muted/40 px-4 py-3 text-[16px] text-foreground outline-none focus:border-blue-500 focus:bg-background"
            />
          </label>
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">Options</span>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={o}
                    onChange={(e) => setOption(i, e.target.value.slice(0, 100))}
                    placeholder={i < 2 ? `Option ${i + 1}` : '+ Add option'}
                    className="h-12 min-w-0 flex-1 rounded-2xl border border-border bg-muted/40 px-4 text-[16px] text-foreground outline-none focus:border-blue-500 focus:bg-background"
                    aria-label={`Option ${i + 1}`}
                  />
                  {options.length > 2 && !(i === options.length - 1 && !o.trim()) && (
                    <button type="button" onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label={`Remove option ${i + 1}`}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-foreground">Allow multiple answers</span>
              <span className="block text-[12.5px] text-muted-foreground">People can pick more than one option</span>
            </span>
            <Switch checked={multi} onCheckedChange={setMulti} aria-label="Allow multiple answers" />
          </label>
        </div>
        <div className="border-t border-border/60 px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)] pt-3">
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              onSend({ question: question.trim(), options: filled, multi });
              onOpenChange(false);
            }}
            className="flex h-12 w-full items-center justify-center rounded-full bg-blue-600 text-[16px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40"
          >
            Send poll
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
