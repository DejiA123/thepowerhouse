import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, Forward, Loader2, Lock, Phone, Search, Send, Smartphone, Star, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { church } from '@/config/church';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import { useIsMobile } from '@/hooks/use-mobile';
import UserAvatar from '@/components/common/UserAvatar';
import { GroupChatService, senderName, type ChatMessage, type ChatSummary, type GroupChat } from '@/services/groupChatService';
import { chatTitle, formatClock, formatDayLabel, previewText } from './chatUtils';

/** Like WhatsApp: a message goes to at most 5 chats at once */
export const FORWARD_LIMIT = 5;

const Panel = ({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="flex h-[85dvh] w-full flex-col gap-0 rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <SheetTitle className="flex-1 text-[17px] font-semibold">{title}</SheetTitle>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
};

const SearchBox = ({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) => (
  <div className="relative mx-4 my-3">
    <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      autoFocus={autoFocus}
      enterKeyHint="search"
      className="h-11 w-full rounded-full bg-muted/70 pl-10 pr-4 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500/25"
    />
  </div>
);

// ── Forward ─────────────────────────────────────────────────────────

/** Pick up to 5 chats and send them a copy of the message, marked "Forwarded" */
export const ForwardSheet = ({ message, myName, onClose, onForwarded }: {
  /** One message, or several chosen together (sent in order) */
  message: ChatMessage | ChatMessage[] | null;
  myName: string;
  onClose: () => void;
  /** The copies that were sent (one per chat) */
  onForwarded: (sent: ChatMessage[]) => void;
}) => {
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const open = !!message;

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setPicked([]);
    GroupChatService.getMyChats().then(setChats).catch(() => setChats([]));
  }, [open]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (chats || []).filter((c) => !q || chatTitle(c, myName).toLowerCase().includes(q));
  }, [chats, query, myName]);

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : prev.length >= FORWARD_LIMIT ? prev : [...prev, id]));

  const list = !message ? [] : Array.isArray(message) ? message : [message];
  const send = async () => {
    if (!list.length || !picked.length) return;
    setSending(true);
    const sent: ChatMessage[] = [];
    let failed = 0;
    for (const chatId of picked) {
      try {
        for (const m of list) {
          const copy = await GroupChatService.sendMessage(chatId, m.content, false, { forwarded: true });
          if (copy) sent.push(copy);
        }
      } catch {
        failed += 1;
      }
    }
    setSending(false);
    onForwarded(sent);
    onClose();
    if (failed) appAlert(`Couldn't forward to ${failed} ${failed === 1 ? 'chat' : 'chats'}`, 'Check your connection and try again.', 'error');
    else appAlert(picked.length === 1 ? (list.length === 1 ? 'Forwarded' : `${list.length} messages forwarded`) : `Forwarded to ${picked.length} chats`);
  };

  const names = picked.map((id) => chats?.find((c) => c.id === id)).filter(Boolean).map((c) => chatTitle(c as GroupChat, myName));

  return (
    <Panel open={open} onOpenChange={(o) => !o && onClose()} title="Forward to…">
      {list.length > 0 && (
        <p className="mx-4 mt-3 flex items-center gap-2 truncate rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <Forward className="h-4 w-4 shrink-0" />
          <span className="truncate">{list.length === 1 ? previewText(list[0].content) : `${list.length} messages`}</span>
        </p>
      )}
      <SearchBox value={query} onChange={setQuery} placeholder="Search chats" />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
        {chats === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{query ? 'No chats match' : 'No chats yet'}</p>
        ) : (
          shown.map((c) => {
            const on = picked.includes(c.id);
            const full = !on && picked.length >= FORWARD_LIMIT;
            const title = chatTitle(c, myName);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                disabled={full}
                aria-pressed={on}
                className={cn('flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition active:bg-muted', full && 'opacity-40')}
              >
                <UserAvatar name={title} src={c.avatar_url} seed={c.id} className="h-11 w-11" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-foreground">{title}</span>
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', on ? 'border-blue-600 bg-blue-600 text-white' : 'border-muted-foreground/40')}>
                  {on && <Check className="h-4 w-4" />}
                </span>
              </button>
            );
          })
        )}
      </div>
      <div className="flex items-center gap-3 border-t border-border/60 px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)] pt-3">
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {names.length ? names.join(', ') : `Choose up to ${FORWARD_LIMIT} chats`}
        </p>
        <button
          onClick={send}
          disabled={!picked.length || sending}
          className={cn('flex h-12 w-12 items-center justify-center rounded-full transition active:scale-90', picked.length ? 'bg-blue-600 text-white shadow-md' : 'bg-muted text-muted-foreground')}
          aria-label="Send forwarded message"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </Panel>
  );
};

// ── A list of messages (search results, starred) ────────────────────

const MessageRow = ({ message, myId, onOpen, starred }: { message: ChatMessage; myId: string; onOpen: (m: ChatMessage) => void; starred?: boolean }) => {
  const mine = message.user_id === myId && (!message.imported_from || message.imported_as === myId);
  return (
  <button onClick={() => onOpen(message)} className="flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition active:bg-muted">
    <UserAvatar name={senderName(message)} src={message.user?.avatar_url ?? null} seed={message.user_id} className="h-9 w-9" />
    <span className="min-w-0 flex-1">
      <span className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{mine ? 'You' : senderName(message)}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{formatDayLabel(message.created_at)} {formatClock(message.created_at)}</span>
      </span>
      <span className="mt-0.5 flex items-start gap-1 text-sm text-muted-foreground">
        {starred && <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
        <span className="line-clamp-2 break-words">{previewText(message.content, mine)}</span>
      </span>
    </span>
  </button>
  );
};

/** Search this chat's messages; tap one to go to it */
export const ChatSearchSheet = ({ open, chatId, myId, onOpenChange, onOpenMessage }: {
  open: boolean;
  chatId: string;
  myId: string;
  onOpenChange: (open: boolean) => void;
  onOpenMessage: (m: ChatMessage) => void;
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatMessage[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setResults(null);
      return;
    }
    let stale = false;
    setBusy(true);
    const t = setTimeout(() => {
      GroupChatService.searchMessages(chatId, q)
        .then((r) => !stale && setResults(r))
        .catch(() => !stale && setResults([]))
        .finally(() => !stale && setBusy(false));
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, open, chatId]);

  return (
    <Panel open={open} onOpenChange={onOpenChange} title="Search messages">
      <SearchBox value={query} onChange={setQuery} placeholder="Search this chat" autoFocus />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)]">
        {busy && results === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : results === null ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Type a word to find messages and captions in this chat.</p>
        ) : results.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages found</p>
        ) : (
          <>
            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {results.length} {results.length === 1 ? 'message' : 'messages'}
            </p>
            {results.map((m) => <MessageRow key={m.id} message={m} myId={myId} onOpen={onOpenMessage} />)}
          </>
        )}
      </div>
    </Panel>
  );
};

/** My starred messages in this chat; tap one to go to it */
export const StarredSheet = ({ open, chatId, myId, onOpenChange, onOpenMessage, version }: {
  open: boolean;
  chatId: string;
  myId: string;
  onOpenChange: (open: boolean) => void;
  onOpenMessage: (m: ChatMessage) => void;
  /** Changes when a star is added or removed */
  version: number;
}) => {
  const [list, setList] = useState<ChatMessage[] | null>(null);
  useEffect(() => {
    if (!open) return;
    let stale = false;
    GroupChatService.starredMessages(chatId)
      .then((r) => !stale && setList(r))
      .catch(() => !stale && setList([]));
    return () => {
      stale = true;
    };
  }, [open, chatId, version]);

  return (
    <Panel open={open} onOpenChange={onOpenChange} title="Starred messages">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)] pt-2">
        {list === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-500 dark:bg-amber-900/40"><Star className="h-7 w-7 fill-current" /></span>
            <p className="mt-4 font-semibold text-foreground">No starred messages</p>
            <p className="mt-1 text-sm text-muted-foreground">Press and hold a message, then tap Star to keep it here and find it easily.</p>
          </div>
        ) : (
          list.map((m) => <MessageRow key={m.id} message={m} myId={myId} onOpen={onOpenMessage} starred />)
        )}
      </div>
    </Panel>
  );
};

// ── Message info ────────────────────────────────────────────────────

/** For my message: who has read it, and who hasn't yet */
export const MessageInfoSheet = ({ message, chatId, myId, readMarks, onClose }: {
  message: ChatMessage | null;
  chatId: string;
  myId: string;
  /** Each member's "read up to" time */
  readMarks: Record<string, string>;
  onClose: () => void;
}) => {
  const [people, setPeople] = useState<{ id: string; name: string; avatar: string | null }[] | null>(null);
  const open = !!message;

  useEffect(() => {
    if (!open) return;
    setPeople(null);
    GroupChatService.getParticipants(chatId)
      .then((list) => setPeople(list.filter((p) => p.user_id !== myId).map((p) => ({ id: p.user_id, name: p.user?.full_name || 'Member', avatar: p.user?.avatar_url ?? null }))))
      .catch(() => setPeople([]));
  }, [open, chatId, myId]);

  const read = (people || []).filter((p) => message && readMarks[p.id] && readMarks[p.id] >= message.created_at);
  const unread = (people || []).filter((p) => !read.includes(p));

  const Person = ({ p, seen }: { p: { id: string; name: string; avatar: string | null }; seen: boolean }) => (
    <div className="flex items-center gap-3 px-4 py-2">
      <UserAvatar name={p.name} src={p.avatar} seed={p.id} className="h-9 w-9" />
      <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{p.name}</span>
      {seen ? <CheckCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : <Check className="h-4 w-4 text-muted-foreground" />}
    </div>
  );

  return (
    <Panel open={open} onOpenChange={(o) => !o && onClose()} title="Message info">
      {message && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)]">
          <div className="mx-4 mt-4 rounded-2xl bg-blue-600 px-4 py-3 text-[15px] text-white">
            <p className="line-clamp-4 whitespace-pre-wrap break-words">{previewText(message.content, true)}</p>
            <p className="mt-1 text-right text-xs text-white/75">
              {message.edited_at ? 'Edited · ' : ''}Sent {formatDayLabel(message.created_at).toLowerCase()} at {formatClock(message.created_at)}
            </p>
          </div>
          {people === null ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <p className="px-4 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Read by {read.length ? `(${read.length})` : ''}</p>
              {read.length ? read.map((p) => <Person key={p.id} p={p} seen />) : <p className="px-4 py-2 text-sm text-muted-foreground">No one yet</p>}
              {unread.length > 0 && (
                <>
                  <p className="px-4 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Not read yet ({unread.length})</p>
                  {unread.map((p) => <Person key={p.id} p={p} seen={false} />)}
                </>
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  );
};

// ── What end-to-end encryption means here ("Learn more") ──────────────

/** A padlock with a solid body and an open shackle (like the one beside WhatsApp's encryption notice) */
export const SolidLock = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path d="M7.75 10.5V7.9a4.25 4.25 0 0 1 8.5 0v2.6" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
    <rect x="4.75" y="10" width="14.5" height="11.25" rx="2.6" fill="currentColor" />
  </svg>
);

export const EncryptionInfo = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[22rem] gap-0 rounded-3xl p-0">
      <div className="flex flex-col items-center px-6 pb-2 pt-7 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FCF1D6] text-neutral-800 dark:bg-[#1F2C33] dark:text-[#F7D58E]">
          <SolidLock className="h-8 w-8" />
        </span>
        <DialogTitle className="mt-4 text-lg font-semibold">Your chats are end-to-end encrypted</DialogTitle>
        <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
          Only people in this chat can read, listen to, or share what's sent in it. No one else can, not even {church.name}.
        </DialogDescription>
      </div>
      <ul className="space-y-3.5 px-6 py-4 text-sm text-foreground">
        {[
          { icon: Lock, text: 'Messages, captions and photos are locked on your phone before they leave it. Only the phones of the people in this chat have the key.' },
          { icon: Phone, text: 'Voice and video calls go straight between phones and are encrypted too.' },
          { icon: Smartphone, text: 'On a new phone, your chats open once another member opens the app and their phone shares the key.' },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <p className="px-6 pb-2 text-xs text-muted-foreground">
        Messages sent before encryption started, and video files, are protected but not end-to-end encrypted.
      </p>
      <div className="p-4">
        <button onClick={() => onOpenChange(false)} className="h-11 w-full rounded-full bg-blue-600 text-[15px] font-semibold text-white transition active:scale-[0.98]">
          OK
        </button>
      </div>
    </DialogContent>
  </Dialog>
);

// ── Clear chat(s) ────────────────────────────────────────────────────

/** "Clear this chat?" (or several), like WhatsApp: only for me, with "Keep starred messages" */
export const ClearChatDialog = ({ open, count = 1, name, onOpenChange, onConfirm }: {
  open: boolean;
  /** How many chats (1 = this chat) */
  count?: number;
  name?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (keepStarred: boolean) => Promise<void> | void;
}) => {
  const [keepStarred, setKeepStarred] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setKeepStarred(true);
  }, [open]);
  const many = count > 1;
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-[22rem] gap-0 rounded-3xl p-0">
        <div className="px-6 pb-2 pt-6">
          <DialogTitle className="text-lg font-semibold">{many ? `Clear ${count} chats?` : name ? `Clear chat with ${name}?` : 'Clear this chat?'}</DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
            {many ? 'Their messages' : 'Its messages'} will be removed from your phone and account. Everyone else in {many ? 'those chats' : 'the chat'} keeps theirs.
          </DialogDescription>
        </div>
        <label className="mx-6 mt-3 flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-[15px] text-foreground">
          <input type="checkbox" checked={keepStarred} onChange={(e) => setKeepStarred(e.target.checked)} className="h-5 w-5 accent-blue-600" />
          Keep starred messages
        </label>
        <div className="flex flex-col gap-2 p-6">
          <button
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(keepStarred);
                onOpenChange(false);
              } catch {
                /* stays open; the caller said what went wrong */
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-red-600 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {many ? 'Clear chats' : 'Clear chat'}
          </button>
          <button onClick={() => onOpenChange(false)} disabled={busy} className="h-11 rounded-full text-[15px] font-medium text-foreground hover:bg-muted">
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
