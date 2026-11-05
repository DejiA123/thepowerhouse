import { useMemo, useState } from 'react';
import { appAlert } from '@/lib/appAlert';
import { CHAT_SETTINGS_CHANGED, GroupChatService, MAX_PINNED, sortChats } from '@/services/groupChatService';
import SwipeRow from '@/components/common/SwipeRow';
import ChatMoreSheet from './ChatMoreSheet';
import { ClearChatDialog } from './ChatPanels';
import { WallpaperSheet } from './ChatWallpaper';
import ChatPeek, { type PeekTarget } from './ChatPeek';
import HoldButton from '@/components/common/HoldButton';
import { Archive, ArchiveRestore, MoreHorizontal, Pin, PinOff, ArrowLeft, BellOff, Check, CheckSquare, ChevronRight, Eraser, Loader2, MessageCirclePlus, MoreVertical, PhoneCall, Search, Users, Wallpaper, X, MessageSquareDot, CheckCheck as ReadAll } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';
import { useChatPeers } from '@/lib/chatPhotos';
import type { ChatSummary, GroupChat } from '@/services/groupChatService';
import type { OngoingCall } from '@/contexts/CallContext';
import { chatTitle, formatListTime, isPrivateChat, parseCall, previewText } from './chatUtils';

interface Props {
  chats: ChatSummary[];
  discover: GroupChat[];
  selectedId: string | null;
  loading: boolean;
  myId: string;
  /** My name, so a private chat can show the other person's name */
  myName?: string;
  ongoingCalls: Record<string, OngoingCall>;
  joiningId: string | null;
  onSelect: (chat: ChatSummary) => void;
  onJoin: (chat: GroupChat) => void;
  onNewGroup: () => void;
  onBack: () => void;
}

type Filter = 'all' | 'unread';

const ChatList = ({
  chats, discover, selectedId, loading, myId, myName, ongoingCalls, joiningId, onSelect, onJoin, onNewGroup, onBack,
}: Props) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // Archived chats sit in their own list (like WhatsApp's "Archived")
  const [showArchived, setShowArchived] = useState(false);
  // ⋮ menu, choosing chats, clearing them
  const [menuOpen, setMenuOpen] = useState(false);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [peek, setPeek] = useState<PeekTarget | null>(null);
  // One-to-one chats: the other person's profile photo
  const peerOf = useChatPeers(myId, chats.filter((c) => isPrivateChat(c)).map((c) => c.id));
  const photoOf = (chat: GroupChat) => (isPrivateChat(chat) ? peerOf(chat.id)?.avatar ?? chat.avatar_url : chat.avatar_url);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [clearIds, setClearIds] = useState<string[] | null>(null);
  // Swiping a row (like WhatsApp): which row shows its actions, and the "More" menu
  const [swiped, setSwiped] = useState<{ id: string; side: 'left' | 'right' } | null>(null);
  const [moreFor, setMoreFor] = useState<ChatSummary | null>(null);
  const pinnedCount = chats.filter((c) => !!c.pinned_at).length;
  const togglePinned = async (chat: ChatSummary) => {
    try {
      const ok = await GroupChatService.setPinned(chat.id, !chat.pinned_at, chat.pinned_at ? 0 : pinnedCount);
      if (!ok) appAlert(`You can only pin up to ${MAX_PINNED} chats`, 'Unpin one first.', 'info');
    } catch {
      appAlert(chat.pinned_at ? "Couldn't unpin the chat" : "Couldn't pin the chat", 'Check your connection and try again.', 'error');
    }
  };
  const toggleRead = async (chat: ChatSummary) => {
    if (chat.unread > 0) await GroupChatService.markAsRead(chat.id).catch(() => undefined);
    else await GroupChatService.setMarkedUnread(chat.id, true).catch(() => undefined);
    window.dispatchEvent(new CustomEvent(CHAT_SETTINGS_CHANGED, { detail: { chatId: chat.id } }));
  };
  const toggleArchived = async (chat: ChatSummary) => {
    try {
      await GroupChatService.setArchived(chat.id, !chat.archived_at);
      appAlert(chat.archived_at ? 'Chat unarchived' : 'Chat archived');
    } catch {
      appAlert("Couldn't change it", 'Check your connection and try again.', 'error');
    }
  };
  const togglePick = (id: string) => setPicked((prev) => {
    if (!prev) return prev;
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const clearChats = async (ids: string[], keepStarred: boolean) => {
    let failed = 0;
    for (const id of ids) {
      try {
        await GroupChatService.clearChat(id, keepStarred);
      } catch {
        failed += 1;
      }
    }
    setPicked(null);
    if (failed) {
      appAlert(`Couldn't clear ${failed} ${failed === 1 ? 'chat' : 'chats'}`, 'Check your connection and try again.', 'error');
      if (failed === ids.length) throw new Error('not cleared');
    } else appAlert(ids.length === 1 ? 'Chat cleared' : `${ids.length} chats cleared`);
  };
  const archivePicked = async () => {
    const ids = [...(picked ?? [])];
    setPicked(null);
    const archiving = ids.some((id) => !chats.find((c) => c.id === id)?.archived_at);
    for (const id of ids) await GroupChatService.setArchived(id, archiving).catch(() => undefined);
    appAlert(archiving ? (ids.length === 1 ? 'Chat archived' : `${ids.length} chats archived`) : 'Unarchived');
  };

  // "Mark as unread" / "Mark as read" (like WhatsApp): unread if any chosen chat isn't
  const markPicked = async () => {
    const ids = [...(picked ?? [])];
    setPicked(null);
    const markUnread = ids.some((id) => !(chats.find((c) => c.id === id)?.unread ?? 0));
    for (const id of ids) {
      if (markUnread) await GroupChatService.setMarkedUnread(id, true).catch(() => undefined);
      else await GroupChatService.markAsRead(id).catch(() => undefined);
    }
    // The list reloads (as it does for mute and archive)
    window.dispatchEvent(new CustomEvent(CHAT_SETTINGS_CHANGED));
  };
  const pickedAllRead = !!picked?.size && [...picked].every((id) => !(chats.find((c) => c.id === id)?.unread ?? 0));

  const q = query.trim().toLowerCase();
  const archived = useMemo(() => chats.filter((c) => !!c.archived_at), [chats]);
  const visible = useMemo(
    () => sortChats(chats).filter((c) =>
      // Searching looks everywhere; otherwise archived chats only in their list
      (q ? true : showArchived ? !!c.archived_at : !c.archived_at) &&
      (!q || chatTitle(c, myName).toLowerCase().includes(q) || (c.last_message?.content || '').toLowerCase().includes(q)) &&
      (filter === 'all' || c.unread > 0),
    ),
    [chats, q, filter, showArchived, myName],
  );
  const isMuted = (c: ChatSummary) => !!c.muted_until && new Date(c.muted_until).getTime() > Date.now();
  const visibleDiscover = useMemo(
    () => discover.filter((c) => !q || c.name.toLowerCase().includes(q)),
    [discover, q],
  );
  const unreadTotal = chats.reduce((sum, c) => sum + (c.unread > 0 ? 1 : 0), 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:pt-5">
        {picked ? (
          // Choosing chats: what to do with them
          <div className="flex items-center gap-1" aria-label="Chosen chats">
            <button onClick={() => setPicked(null)} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted" aria-label="Stop choosing">
              <X className="h-5 w-5" />
            </button>
            <p className="flex-1 text-[20px] font-bold text-foreground">{picked.size} selected</p>
            <button
              onClick={markPicked}
              disabled={!picked.size}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40"
              aria-label={pickedAllRead || !picked.size ? 'Mark as unread' : 'Mark as read'}
            >
              {pickedAllRead || !picked.size ? <MessageSquareDot className="h-5 w-5" /> : <ReadAll className="h-5 w-5" />}
            </button>
            <button onClick={archivePicked} disabled={!picked.size} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40" aria-label="Archive chosen chats">
              <Archive className="h-5 w-5" />
            </button>
            <button onClick={() => setClearIds([...picked])} disabled={!picked.size} className="flex h-10 w-10 items-center justify-center rounded-full text-red-600 hover:bg-muted disabled:opacity-40" aria-label="Clear chosen chats">
              <Eraser className="h-5 w-5" />
            </button>
          </div>
        ) : (
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted md:hidden" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-[28px] font-bold tracking-tight text-foreground">Messages</h1>
          <button
            onClick={onNewGroup}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 active:scale-90"
            aria-label="New group"
          >
            <MessageCirclePlus className="h-5 w-5" />
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted" aria-label="More" aria-expanded={menuOpen}>
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
                <div className="absolute right-0 top-11 z-40 w-52 overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-xl animate-in fade-in" role="menu">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setPicked(new Set());
                    }}
                    disabled={!chats.length}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    <CheckSquare className="h-4 w-4 text-muted-foreground" /> Select chats
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setWallpaperOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-foreground hover:bg-muted"
                  >
                    <Wallpaper className="h-4 w-4 text-muted-foreground" /> Chat wallpaper
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setClearIds(chats.map((c) => c.id));
                    }}
                    disabled={!chats.length}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-red-600 hover:bg-muted disabled:opacity-40 dark:text-red-400"
                  >
                    <Eraser className="h-4 w-4" /> Clear all chats
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        )}
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="h-10 w-full rounded-xl bg-muted/70 pl-10 pr-3 text-[15px] text-foreground outline-none ring-blue-500/30 placeholder:text-muted-foreground focus:ring-2"
          />
        </div>
        <div className="mt-3 flex gap-2">
          {(['all', 'unread'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                filter === f ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {f === 'all' ? 'All' : `Unread${unreadTotal ? ` · ${unreadTotal}` : ''}`}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
        {loading && chats.length === 0 ? (
          <div className="space-y-1 px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 && visibleDiscover.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Users className="h-7 w-7" />
            </div>
            <p className="mt-4 font-semibold text-foreground">{q ? 'No chats found' : filter === 'unread' ? "You're all caught up" : 'No chats yet'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {q ? 'Try a different name.' : 'Start a group with friends, or join a community group below.'}
            </p>
          </div>
        ) : (
          <>
            {!q && (showArchived ? (
              <button onClick={() => setShowArchived(false)} className="mb-1 flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left text-[15px] font-semibold text-foreground hover:bg-muted/70">
                <ArrowLeft className="h-5 w-5 text-muted-foreground" /> Archived
              </button>
            ) : archived.length > 0 && filter === 'all' && (
              <button onClick={() => setShowArchived(true)} className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left hover:bg-muted/70" aria-label={`Archived chats (${archived.length})`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Archive className="h-5 w-5" /></span>
                <span className="flex-1 text-[15px] font-semibold text-foreground">Archived</span>
                <span className="text-sm text-muted-foreground">{archived.length}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
            {visible.map((chat) => {
              const last = chat.last_message;
              const mine = last?.user_id === myId;
              // A one-to-one chat doesn't name the other person again (like WhatsApp)
              const who = last ? (mine ? 'You' : isPrivateChat(chat) ? null : last.sender_name?.split(' ')[0]) : null;
              const hasCall = !!ongoingCalls[chat.id];
              return (
                <SwipeRow
                  key={chat.id}
                  disabled={!!picked}
                  open={swiped?.id === chat.id ? swiped.side : null}
                  onOpenChange={(side) => setSwiped(side ? { id: chat.id, side } : null)}
                  left={[
                    { label: chat.unread > 0 ? 'Read' : 'Unread', icon: chat.unread > 0 ? ReadAll : MessageSquareDot, className: 'bg-emerald-600', onClick: () => toggleRead(chat) },
                    { label: chat.pinned_at ? 'Unpin' : 'Pin', icon: chat.pinned_at ? PinOff : Pin, className: 'bg-slate-500', onClick: () => togglePinned(chat) },
                  ]}
                  right={[
                    { label: 'More', icon: MoreHorizontal, className: 'bg-slate-500', onClick: () => setMoreFor(chat) },
                    { label: chat.archived_at ? 'Unarchive' : 'Archive', icon: chat.archived_at ? ArchiveRestore : Archive, className: 'bg-blue-600', onClick: () => toggleArchived(chat) },
                  ]}
                >
                <HoldButton
                  // Hold: look inside without opening it (like WhatsApp)
                  onHold={picked ? undefined : () => setPeek({
                    chatId: chat.id,
                    title: chatTitle(chat, myName),
                    avatar: photoOf(chat),
                    isPrivate: isPrivateChat(chat),
                    unread: chat.unread,
                    muted: isMuted(chat),
                  })}
                  onClick={() => (picked ? togglePick(chat.id) : onSelect(chat))}
                  aria-pressed={picked ? picked.has(chat.id) : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition',
                    picked?.has(chat.id) ? 'bg-blue-50 dark:bg-blue-950/50' : selectedId === chat.id && !picked ? 'bg-blue-50 dark:bg-blue-950/50' : 'hover:bg-muted/70 active:bg-muted',
                  )}
                >
                  {picked && (
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', picked.has(chat.id) ? 'border-blue-600 bg-blue-600 text-white' : 'border-muted-foreground/40')} aria-hidden>
                      {picked.has(chat.id) && <Check className="h-4 w-4" />}
                    </span>
                  )}
                  <UserAvatar name={chatTitle(chat, myName)} src={photoOf(chat)} seed={chat.id} className="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className={cn('flex-1 truncate text-[15px] text-foreground', chat.unread ? 'font-bold' : 'font-semibold')}>
                        {chatTitle(chat, myName)}
                      </p>
                      {isMuted(chat) && <BellOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Muted" />}
                      <span className={cn('shrink-0 text-xs', chat.unread && !isMuted(chat) ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-muted-foreground')}>
                        {formatListTime(last?.created_at || chat.created_at)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className={cn('flex-1 truncate text-sm', chat.unread ? 'text-foreground' : 'text-muted-foreground')}>
                        {hasCall ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                            <PhoneCall className="h-3.5 w-3.5" /> Call in progress
                          </span>
                        ) : last ? (
                          <>{who && !parseCall(last.content) && <span className="font-medium">{who}: </span>}{previewText(last.content, mine)}</>
                        ) : (
                          (isPrivateChat(chat) ? 'Say hello 👋' : chat.description) || 'No messages yet'
                        )}
                      </p>
                      {chat.pinned_at && <Pin className="h-3.5 w-3.5 shrink-0 rotate-45 text-muted-foreground" aria-label="Pinned" />}
                      {chat.unread > 0 && (chat.marked_unread ? (
                        // Marked unread by me: a dot, like WhatsApp
                        <span aria-label="Marked unread" className={cn('h-3 w-3 shrink-0 rounded-full', isMuted(chat) ? 'bg-muted-foreground/60' : 'bg-blue-600')} />
                      ) : (
                        <span className={cn('flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white', isMuted(chat) ? 'bg-muted-foreground/60' : 'bg-blue-600')}>
                          {chat.unread > 99 ? '99+' : chat.unread}
                        </span>
                      ))}
                    </div>
                  </div>
                </HoldButton>
                </SwipeRow>
              );
            })}

            {visibleDiscover.length > 0 && filter === 'all' && (
              <div className="mt-5">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Community groups</p>
                {visibleDiscover.map((chat) => (
                  <div key={chat.id} className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5">
                    <UserAvatar name={chat.name} src={chat.avatar_url} seed={chat.id} className="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-foreground">{chat.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{chat.description || 'Community group'}</p>
                    </div>
                    <button
                      onClick={() => onJoin(chat)}
                      disabled={joiningId === chat.id}
                      className="flex h-9 min-w-[64px] items-center justify-center rounded-full bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                    >
                      {joiningId === chat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <WallpaperSheet open={wallpaperOpen} onOpenChange={setWallpaperOpen} />
      <ChatMoreSheet
        chat={moreFor}
        title={moreFor ? chatTitle(moreFor, myName) : ''}
        onClose={() => setMoreFor(null)}
        onClear={(id) => setClearIds([id])}
        onSelect={(id) => setPicked(new Set([id]))}
      />
      <ChatPeek
        target={peek}
        onClose={() => setPeek(null)}
        onOpen={(id) => {
          const chat = chats.find((c) => c.id === id);
          if (chat) onSelect(chat);
        }}
      />
      <ClearChatDialog
        open={!!clearIds}
        count={clearIds?.length ?? 1}
        name={clearIds?.length === 1 ? chatTitle(chats.find((c) => c.id === clearIds[0]) ?? { name: '' }, myName) || undefined : undefined}
        onOpenChange={(o) => !o && setClearIds(null)}
        onConfirm={(keepStarred) => clearChats(clearIds ?? [], keepStarred)}
      />
    </div>
  );
};

export default ChatList;
