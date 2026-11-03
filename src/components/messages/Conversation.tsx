import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, Copy, Forward, Info, Loader2, Phone, PhoneCall, Pin, Star, Trash2, Video, X } from 'lucide-react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { KEYS_ARRIVED, e2eReady } from '@/lib/chatCrypto';
import WhatsAppImport from './WhatsAppImport';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import { useCall } from '@/contexts/CallContext';
import { useOnlineUsers } from '@/contexts/PresenceContext';
import UserAvatar from '@/components/common/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { GroupChatService, readable, senderName, signalsTopic, type ChatMessage, type ChatPin, type GroupChat } from '@/services/groupChatService';
import { broadcast } from '@/lib/realtime';
import MessageBubble, { type Quote, type ReactionGroup } from './MessageBubble';
import { ChatSearchSheet, ClearChatDialog, EncryptionInfo, ForwardSheet, MessageInfoSheet, SolidLock, StarredSheet } from './ChatPanels';
import ChatComposer from './ChatComposer';
import MessageActionsSheet from './MessageActionsSheet';
import ImageViewer from './ImageViewer';
import GroupInfoSheet from './GroupInfoSheet';
import { ChatWallpaper } from './ChatWallpaper';
import {
  IMAGE_PREFIX, VIDEO_PREFIX, canEditMessage, chatTitle, dayKey, editableText, formatDayLabel, formatLastSeen, isAnsweredCall, isPrivateChat, isVideoFile,
  FILE_PREFIX, VOICE_PREFIX, encodePreview, parseCall, parseMessageContent, plainMentions, previewText, uploadChatFile, uploadChatImage, uploadChatVideo, withEditedText,
  type LinkPreview,
} from './chatUtils';
import type { VoiceRecording } from '@/lib/voiceRecorder';
import { track } from '@/lib/activity';
import { useKeyboardSafeHeight } from '@/hooks/useKeyboardSafeHeight';

interface Me {
  id: string;
  name: string;
  avatar: string | null;
  email?: string;
}

interface Props {
  chat: GroupChat;
  me: Me;
  onBack: () => void;
  onChatUpdated: (patch: Partial<GroupChat>) => void;
  onLeft: () => void;
  onActivity: (message: ChatMessage) => void;
  onRead: () => void;
  /** Show this message (opened from its notification), then call onFocused */
  focusMessageId?: string | null;
  onFocused?: () => void;
}

type Reaction = { emoji: string; user_id: string; id: string };

const PAGE = 50;
const GROUP_GAP_MS = 5 * 60 * 1000;
/** "Delete for everyone" for 2 days after sending, like WhatsApp (the database checks too) */
const DELETE_FOR_EVERYONE_MS = 2 * 24 * 3600_000;

const nearBottom = (el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight < 120;

const formatClockShort = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' });
/** My message? (imported from WhatsApp: only the lines that were mine there) */
const isMine = (m: ChatMessage, myId: string) => m.user_id === myId && (!m.imported_from || m.imported_as === myId);
/** Who a message is shown from, for grouping a run of messages */
const author = (m: ChatMessage) => (m.imported_from ? `wa:${m.imported_from}` : m.user_id);

const Conversation = ({ chat, me, onBack, onChatUpdated, onLeft, onActivity, onRead, focusMessageId, onFocused }: Props) => {
  const { startCall, joinCall, ongoingCalls, refreshOngoingCall, call } = useCall();
  const onlineIds = useOnlineUsers();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [readMarks, setReadMarks] = useState<Record<string, string>>({});
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [typing, setTyping] = useState<Record<string, { name: string; at: number }>>({});
  const [actionsFor, setActionsFor] = useState<ChatMessage | null>(null);
  // One of my messages being edited in the message box
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  // Like WhatsApp: replying to a message (swipe it), forwarding, info, search, starred, pinned, deleted for me
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwardFor, setForwardFor] = useState<ChatMessage | ChatMessage[] | null>(null);
  const [infoFor, setInfoFor] = useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [starredOpen, setStarredOpen] = useState(false);
  const [starred, setStarred] = useState<Set<string>>(() => new Set());
  const [starVersion, setStarVersion] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [pin, setPin] = useState<ChatPin | null>(null);
  // Quoted or pinned messages that aren't loaded (null: deleted or not reachable)
  const [extraMessages, setExtraMessages] = useState<Record<string, ChatMessage | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>();
  const replyRef = useRef<ChatMessage | null>(null);
  replyRef.current = replyTo;
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  // End-to-end encryption is on; a WhatsApp chat can be imported; reload after an import
  const [encryptedChats, setEncryptedChats] = useState(false);
  const [canImport, setCanImport] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [encryptionInfo, setEncryptionInfo] = useState(false);
  // Choosing several messages (null: not choosing)
  const [picking, setPicking] = useState<Set<string> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [clearing, setClearing] = useState(false);
  // My mute / archive settings; a group's members (to @mention)
  const [settings, setSettings] = useState<{ muted_until: string | null; archived_at: string | null } | null>(null);
  const [mentionables, setMentionables] = useState<{ id: string; name: string; avatar?: string | null }[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const [unreadAnchor, setUnreadAnchor] = useState<string | null>(null);
  // Private chat: the other person, and when they were last in the app
  const [otherId, setOtherId] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const restoreScroll = useRef<{ height: number; top: number } | null>(null);
  const initialScrollDone = useRef(false);

  useKeyboardSafeHeight(rootRef);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setNewBelow(0);
  }, []);

  const addMessage = useCallback((incoming: ChatMessage) => {
    setMessages((prev) => {
      if (incoming.is_deleted) return prev.filter((m) => m.id !== incoming.id);
      if (prev.some((m) => m.id === incoming.id)) return prev;
      // Replace my optimistic copy if this is its confirmed version
      const pendingIndex = incoming.user_id === me.id
        ? prev.findIndex((m) => m.pending && m.content === incoming.content)
        : -1;
      if (pendingIndex >= 0) {
        const next = [...prev];
        next[pendingIndex] = incoming;
        return next;
      }
      return [...prev, incoming].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
    if (incoming.user_id !== me.id && !incoming.is_deleted) {
      onActivity(incoming);
      if (atBottomRef.current && document.visibilityState === 'visible') {
        GroupChatService.markAsRead(chat.id, incoming.created_at);
      } else {
        setNewBelow((n) => n + 1);
      }
      setTyping((prev) => {
        if (!prev[incoming.user_id]) return prev;
        const next = { ...prev };
        delete next[incoming.user_id];
        return next;
      });
    }
  }, [chat.id, me.id, onActivity]);

  /** An edit, from this phone or anyone's (the signal is instant, the database feed backs it up) */
  const applyEdit = useCallback((id: string, content: string, editedAt?: string | null) => {
    setMessages((prev) => prev.map((m) => (
      m.id === id && (m.content !== content || !m.edited_at) ? { ...m, content, edited_at: editedAt || m.edited_at || new Date().toISOString() } : m
    )));
  }, []);

  // ── Initial load ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    initialScrollDone.current = false;
    setEditing(null);
    setReplyTo(null);
    setStarred(new Set());
    setHidden(new Set());
    setPin(null);
    setExtraMessages({});
    GroupChatService.starredIds(chat.id).then((ids) => !cancelled && setStarred(ids)).catch(() => undefined);
    GroupChatService.hiddenIds(chat.id).then((ids) => !cancelled && setHidden(ids)).catch(() => undefined);
    GroupChatService.getPin(chat.id).then((p) => !cancelled && setPin(p)).catch(() => undefined);
    setLoading(true);
    setMessages([]);
    setReactions({});
    setHasMore(true);
    setTyping({});
    setUnreadAnchor(null);
    setOtherId(null);

    (async () => {
      try {
        const [{ data: membership }, data, { data: marks }] = await Promise.all([
          supabase.from('chat_participants').select('last_read_at').eq('chat_id', chat.id).eq('user_id', me.id).maybeSingle(),
          GroupChatService.getChatMessages(chat.id, PAGE),
          supabase.from('chat_participants').select('user_id, last_read_at').eq('chat_id', chat.id),
        ]);
        if (cancelled) return;
        setMessages(data);
        setLoading(false);
        setHasMore(data.length === PAGE);
        setMemberCount(marks?.length ?? null);
        if (isPrivateChat(chat)) setOtherId(marks?.find((m) => m.user_id !== me.id)?.user_id ?? null);
        setReadMarks(Object.fromEntries((marks || []).filter((m) => m.user_id !== me.id && m.last_read_at).map((m) => [m.user_id, m.last_read_at!])));

        const lastRead = membership?.last_read_at;
        const firstUnread = lastRead ? data.find((m) => m.user_id !== me.id && m.created_at > lastRead && !isAnsweredCall(m.content)) : null;
        setUnreadAnchor(firstUnread?.id ?? null);

        if (data.length) setReactions(await GroupChatService.getReactions(data.map((m) => m.id)));
        const last = data[data.length - 1];
        await GroupChatService.markAsRead(chat.id, last?.created_at);
        onRead();
      } catch (error) {
        console.error('Failed to load messages', error);
        if (!cancelled) appAlert('Could not load messages', 'Check your connection and try again.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    refreshOngoingCall(chat.id);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, me.id, reloadTick]);

  useEffect(() => {
    e2eReady().then(setEncryptedChats).catch(() => undefined);
    GroupChatService.canImport().then(setCanImport).catch(() => undefined);
    setPicking(null);
    setSettings(null);
    setMentionables([]);
    GroupChatService.mySettings(chat.id).then(setSettings).catch(() => undefined);
    if (!isPrivateChat(chat)) {
      GroupChatService.getParticipants(chat.id)
        .then((list) => setMentionables(list.filter((p) => p.user_id !== me.id && p.user?.full_name).map((p) => ({ id: p.user_id, name: p.user!.full_name!.trim(), avatar: p.user?.avatar_url ?? null }))))
        .catch(() => undefined);
    }
    // Only when the chat changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

  // Keys for this chat just reached this phone: open the messages that were waiting for them
  useEffect(() => {
    const onKeys = (e: Event) => {
      if ((e as CustomEvent).detail?.chatId !== chat.id) return;
      const waiting = messagesRef.current.filter((m) => m.locked);
      if (waiting.length) {
        readable(waiting).then((opened) => {
          const byIdOpened = new Map(opened.map((m) => [m.id, m]));
          setMessages((prev) => prev.map((m) => byIdOpened.get(m.id) ?? m));
        }).catch(() => undefined);
      }
      setExtraMessages((prev) => {
        const next = { ...prev };
        Object.entries(prev).forEach(([id, m]) => m?.locked && delete next[id]);
        return next;
      });
    };
    window.addEventListener(KEYS_ARRIVED, onKeys);
    return () => window.removeEventListener(KEYS_ARRIVED, onKeys);
  }, [chat.id]);

  // ── Realtime ──────────────────────────────────────────────────────
  useEffect(() => {
    const dbChannel = GroupChatService.subscribeToMessages(chat.id, addMessage, (row) => applyEdit(row.id, row.content, row.edited_at));
    const offPins = GroupChatService.watchPin(chat.id, () => GroupChatService.getPin(chat.id).then(setPin).catch(() => undefined));

    const offSignals = GroupChatService.onChatSignals(chat.id, (signal) => {
      if (signal.type === 'new-message' && signal.payload?.id) {
        addMessage(signal.payload as ChatMessage);
      } else if (signal.type === 'typing' && signal.from && signal.from !== me.id) {
        setTyping((prev) => {
          const next = { ...prev };
          if (signal.payload?.isTyping) next[signal.from!] = { name: signal.payload.name || 'Someone', at: Date.now() };
          else delete next[signal.from!];
          return next;
        });
      } else if (signal.type === 'message-deleted' && signal.payload?.messageId) {
        setMessages((prev) => prev.filter((m) => m.id !== signal.payload.messageId));
      } else if (signal.type === 'message-edited' && signal.payload?.messageId && typeof signal.payload.content === 'string') {
        applyEdit(signal.payload.messageId, signal.payload.content, signal.payload.edited_at);
      } else if (signal.type === 'imported') {
        // A WhatsApp chat was imported into this chat: load it again (the history is in place by date)
        setReloadTick((t) => t + 1);
      } else if (signal.type === 'pin') {
        GroupChatService.getPin(chat.id).then(setPin).catch(() => undefined);
      } else if (signal.type === 'read' && signal.from && signal.from !== me.id && signal.payload?.at) {
        // Someone read up to here: my ✓✓ show it straight away
        const at = String(signal.payload.at);
        setReadMarks((prev) => (prev[signal.from!] >= at ? prev : { ...prev, [signal.from!]: at }));
      } else if (signal.type === 'reaction' && signal.payload?.messageId) {
        GroupChatService.getReactions([signal.payload.messageId]).then((r) =>
          setReactions((prev) => ({ ...prev, [signal.payload.messageId]: r[signal.payload.messageId] || [] })),
        );
      }
    });

    const readChannel = supabase
      .channel(`read-marks:${chat.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_participants', filter: `chat_id=eq.${chat.id}` }, ({ new: row }: any) => {
        if (row?.user_id && row.user_id !== me.id && row.last_read_at) {
          setReadMarks((prev) => ({ ...prev, [row.user_id]: row.last_read_at }));
        }
      })
      .subscribe();

    return () => {
      GroupChatService.unsubscribe(dbChannel);
      offSignals();
      offPins();
      supabase.removeChannel(readChannel);
    };
  }, [chat.id, me.id, addMessage, applyEdit]);

  // Typing indicators expire if the "stopped typing" signal is lost
  useEffect(() => {
    if (Object.keys(typing).length === 0) return;
    const t = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => now - v.at < 6000));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [typing]);

  // Private chat: "Online", or when they were last in the app
  const otherOnline = !!otherId && onlineIds.has(otherId);
  useEffect(() => {
    if (!otherId) return;
    let cancelled = false;
    setLastSeen(null);
    supabase.from('user_presence').select('last_seen').eq('user_id', otherId).maybeSingle()
      .then(({ data }) => !cancelled && setLastSeen(data?.last_seen ?? null));
    return () => {
      cancelled = true;
    };
  }, [otherId]);
  // They've just left the app while this chat is open: that's their last seen
  const sawOnline = useRef<string | null>(null);
  useEffect(() => {
    if (otherOnline) sawOnline.current = otherId;
    else if (otherId && sawOnline.current === otherId) {
      sawOnline.current = null;
      setLastSeen(new Date().toISOString());
    }
  }, [otherOnline, otherId]);

  // Catch up after the phone was locked, the app was in the background or the
  // connection dropped: live updates don't replay what was missed, so fetch it.
  // Messages that failed to send while offline are sent again automatically.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const catchingUp = useRef(false);
  useEffect(() => {
    const catchUp = async (resendFailed: boolean) => {
      if (document.visibilityState !== 'visible' || !navigator.onLine || catchingUp.current || loading) return;
      catchingUp.current = true;
      try {
        const confirmed = messagesRef.current.filter((m) => !m.pending && !m.failed && !String(m.id).startsWith('temp-'));
        const last = confirmed[confirmed.length - 1];
        if (last) {
          const missed = await GroupChatService.getMessagesAfter(chat.id, last.created_at);
          missed.forEach(addMessage);
          // Edits made while this phone was away (messages can only change for 15 minutes)
          (await GroupChatService.getRecentEdits(chat.id)).forEach((m) => applyEdit(m.id, m.content, m.edited_at));
          if (missed.length) {
            const r = await GroupChatService.getReactions(missed.map((m) => m.id));
            setReactions((prev) => ({ ...prev, ...r }));
          }
        }
        if (resendFailed) {
          messagesRef.current.filter((m) => m.failed).forEach((m) => sendContentRef.current?.(m.content, m.id));
        }
      } catch (error) {
        console.warn('Catch-up failed', error);
      } finally {
        catchingUp.current = false;
      }
    };
    const onVisible = () => catchUp(false);
    const onOnline = () => catchUp(true);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onVisible);
    // The live connection came back after a drop
    window.addEventListener('app:resync', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('app:resync', onVisible);
    };
  }, [chat.id, addMessage, applyEdit, loading]);

  // Mark read when returning to the app
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && atBottomRef.current) {
        const last = messages[messages.length - 1];
        if (last) GroupChatService.markAsRead(chat.id, last.created_at);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [chat.id, messages]);

  // ── Scrolling ─────────────────────────────────────────────────────
  const lastMessageId = useRef<string | null>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Only a new latest message scrolls down (not an edit, or older messages loading)
    const latest = messages[messages.length - 1]?.id ?? null;
    const newLatest = latest !== lastMessageId.current;
    lastMessageId.current = latest;
    if (restoreScroll.current) {
      // Keep the view steady after older messages are prepended
      el.scrollTop = el.scrollHeight - restoreScroll.current.height + restoreScroll.current.top;
      restoreScroll.current = null;
      return;
    }
    if (!initialScrollDone.current && messages.length > 0 && !loading) {
      initialScrollDone.current = true;
      const anchor = unreadAnchor ? el.querySelector(`[data-unread-divider]`) : null;
      if (anchor) (anchor as HTMLElement).scrollIntoView({ block: 'center' });
      else el.scrollTop = el.scrollHeight;
      atBottomRef.current = nearBottom(el);
      return;
    }
    const last = messages[messages.length - 1];
    if (last && newLatest && (atBottomRef.current || last.user_id === me.id)) scrollToBottom(true);
  }, [messages, me.id, scrollToBottom, unreadAnchor, loading]);

  // Photos and videos only get their height once they've loaded, after the chat
  // has scrolled down, so they'd push the newest message out of view. Keep it in
  // view while they load (and when the keyboard opens), unless the person has
  // scrolled up. New messages scroll in on their own, above.
  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content) return;
    let count = messagesRef.current.length;
    const observer = new ResizeObserver(() => {
      const newMessages = messagesRef.current.length !== count;
      count = messagesRef.current.length;
      if (!newMessages && atBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(content);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = nearBottom(el);
    atBottomRef.current = bottom;
    if (bottom !== atBottom) setAtBottom(bottom);
    if (bottom && newBelow > 0) {
      setNewBelow(0);
      const last = messages[messages.length - 1];
      if (last) GroupChatService.markAsRead(chat.id, last.created_at);
    }
  };

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const older = await GroupChatService.getChatMessages(chat.id, PAGE, messages[0].created_at);
      const el = scrollRef.current;
      if (el) restoreScroll.current = { height: el.scrollHeight, top: el.scrollTop };
      setMessages((prev) => [...older.filter((o) => !prev.some((p) => p.id === o.id)), ...prev]);
      setHasMore(older.length === PAGE);
      if (older.length) {
        const r = await GroupChatService.getReactions(older.map((m) => m.id));
        setReactions((prev) => ({ ...r, ...prev }));
      }
    } finally {
      setLoadingOlder(false);
    }
  }, [chat.id, hasMore, loadingOlder, messages]);

  // ── Opened from a message's notification: show that message ──────────
  // It may still be on its way (the phone was asleep) or older than what's
  // loaded, so fetch newer messages first, then older pages, until it's there.
  const loadOlderRef = useRef(loadOlder);
  loadOlderRef.current = loadOlder;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const onFocusedRef = useRef(onFocused);
  onFocusedRef.current = onFocused;
  useEffect(() => {
    if (!focusMessageId || loading) return;
    let cancelled = false;
    const find = () =>
      scrollRef.current?.querySelector<HTMLElement>(`[data-message-id="${focusMessageId.replace(/["\\]/g, '')}"]`) ?? null;
    const settle = () => new Promise((r) => setTimeout(r, 250));
    (async () => {
      for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
        const el = find();
        if (el) {
          initialScrollDone.current = true;
          el.scrollIntoView({ block: 'center' });
          if (scrollRef.current) atBottomRef.current = nearBottom(scrollRef.current);
          el.animate?.(
            [{ backgroundColor: 'rgba(59, 130, 246, 0.22)' }, { backgroundColor: 'rgba(59, 130, 246, 0)' }],
            { duration: 2400, easing: 'ease-out' },
          );
          break;
        }
        if (attempt === 0) {
          const confirmed = messagesRef.current.filter((m) => !m.pending && !String(m.id).startsWith('temp-'));
          const last = confirmed[confirmed.length - 1];
          const newer = last ? await GroupChatService.getMessagesAfter(chat.id, last.created_at).catch(() => []) : [];
          if (!cancelled) newer.forEach(addMessage);
        } else if (hasMoreRef.current) {
          await loadOlderRef.current();
        }
        await settle();
      }
      if (!cancelled) onFocusedRef.current?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [focusMessageId, loading, chat.id, addMessage]);

  // Load older messages when the top comes into view
  useEffect(() => {
    const target = topSentinel.current;
    const root = scrollRef.current;
    if (!target || !root || loading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && initialScrollDone.current) loadOlder();
    }, { root, rootMargin: '200px 0px 0px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadOlder, loading]);

  // ── Sending ───────────────────────────────────────────────────────
  const sendContent = useCallback(async (content: string, existingTempId?: string, replyToId?: string | null) => {
    if (!existingTempId) track('message_sent', { chat: chat.name, chatId: chat.id });
    const tempId = existingTempId ?? `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: ChatMessage = {
      id: tempId,
      client_id: tempId,
      chat_id: chat.id,
      user_id: me.id,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      reply_to_id: replyToId ?? null,
      pending: true,
      user: { id: me.id, email: me.email, full_name: me.name, avatar_url: me.avatar },
    };
    setMessages((prev) =>
      existingTempId
        ? prev.map((m) => (m.id === existingTempId ? optimistic : m))
        : [...prev, optimistic],
    );
    atBottomRef.current = true;

    try {
      const saved = await GroupChatService.sendMessage(chat.id, content, false, { replyTo: replyToId });
      if (saved) {
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          if (withoutTemp.some((m) => m.id === saved.id)) return withoutTemp;
          return [...withoutTemp, saved].sort((a, b) => a.created_at.localeCompare(b.created_at));
        });
        onActivity(saved);
      }
    } catch (error) {
      console.error('Send failed', error);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
    }
  }, [chat.id, me, onActivity]);

  const sendContentRef = useRef<typeof sendContent>();
  sendContentRef.current = sendContent;

  const sendMedia = useCallback(async (file: File, caption: string, onProgress: (pct: number) => void) => {
    const video = isVideoFile(file);
    try {
      const url = video ? await uploadChatVideo(chat.id, me.id, file, onProgress) : await uploadChatImage(me.id, file, 'chat', await e2eReady());
      const replying = replyRef.current?.id ?? null;
      await sendContent(`${video ? VIDEO_PREFIX : IMAGE_PREFIX}${url}${caption ? `\n${caption}` : ''}`, undefined, replying);
      setReplyTo(null);
    } catch (error) {
      console.error('Upload failed', error);
      const message = error instanceof Error && !/fetch|network|load failed/i.test(error.message) ? error.message : 'Please check your connection and try again.';
      appAlert(video ? "Couldn't send the video" : "Couldn't send the photo", message, 'error');
      throw error;
    }
  }, [chat.id, me.id, sendContent]);

  const sendVoice = useCallback(async (rec: VoiceRecording) => {
    try {
      const url = await uploadChatFile(me.id, rec.blob, { encrypt: await e2eReady(), ext: 'mp3' });
      const replying = replyRef.current?.id ?? null;
      setReplyTo(null);
      await sendContent(`${VOICE_PREFIX}${rec.seconds.toFixed(1)}:${rec.bars}:${url}`, undefined, replying);
    } catch (error) {
      console.error('Voice message failed', error);
      appAlert("Couldn't send the voice message", 'Check your connection and try again.', 'error');
    }
  }, [me.id, sendContent]);

  const sendFile = useCallback(async (file: File, caption: string, onProgress: (pct: number) => void) => {
    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'bin';
      const url = await uploadChatFile(me.id, file, { encrypt: await e2eReady(), ext, onProgress });
      const replying = replyRef.current?.id ?? null;
      setReplyTo(null);
      const name = encodeURIComponent(file.name.slice(0, 120)).replace(/:/g, '%3A');
      await sendContent(`${FILE_PREFIX}${file.size}:${name}:${url}${caption ? `\n${caption}` : ''}`, undefined, replying);
    } catch (error) {
      console.error('Document failed', error);
      appAlert("Couldn't send the document", error instanceof Error && !/fetch|network/i.test(error.message) ? error.message : 'Check your connection and try again.', 'error');
      throw error;
    }
  }, [me.id, sendContent]);

  const onTyping = useCallback((isTyping: boolean) => {
    GroupChatService.sendTyping(chat.id, me.id, me.name.split(' ')[0], isTyping).catch(() => undefined);
  }, [chat.id, me.id, me.name]);

  // ── Reactions & actions ───────────────────────────────────────────
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    setActionsFor(null);
    const mine = (reactions[messageId] || []).some((r) => r.emoji === emoji && r.user_id === me.id);
    setReactions((prev) => {
      const current = prev[messageId] || [];
      return {
        ...prev,
        [messageId]: mine
          ? current.filter((r) => !(r.emoji === emoji && r.user_id === me.id))
          : [...current, { emoji, user_id: me.id, id: `temp-${emoji}` }],
      };
    });
    try {
      await GroupChatService.toggleReaction(messageId, emoji);
      // Let others with the chat open refresh this message's reactions
      broadcast(signalsTopic(chat.id), 'signal', { type: 'reaction', from: me.id, payload: { messageId } }).catch(() => undefined);
    } catch {
      appAlert('Could not react', '', 'error');
    }
  }, [reactions, me.id, chat.id]);

  const reactionGroups = useMemo(() => {
    const out: Record<string, ReactionGroup[]> = {};
    for (const [messageId, list] of Object.entries(reactions)) {
      const map = new Map<string, ReactionGroup>();
      list.forEach((r) => {
        const g = map.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
        g.count += 1;
        if (r.user_id === me.id) g.mine = true;
        map.set(r.emoji, g);
      });
      out[messageId] = Array.from(map.values());
    }
    return out;
  }, [reactions, me.id]);

  const EMPTY: ReactionGroup[] = useMemo(() => [], []);

  const deleteMessage = async (message: ChatMessage) => {
    setActionsFor(null);
    if (message.pending || message.failed) {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      return;
    }
    const snapshot = messages;
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    try {
      await GroupChatService.deleteMessage(message.id, chat.id);
    } catch (error) {
      setMessages(snapshot);
      const reason = String((error as { message?: string })?.message ?? '');
      appAlert('Could not delete message', /2 days/.test(reason) ? 'Messages can be deleted for everyone up to 2 days after sending. You can still delete it for yourself.' : '', 'error');
    }
  };

  /** Like WhatsApp: my messages can be deleted for everyone for 2 days (imported history always) */
  const canDeleteForEveryone = (m: ChatMessage) =>
    m.user_id === me.id && (!!m.imported_from || Date.now() - new Date(m.created_at).getTime() < DELETE_FOR_EVERYONE_MS);

  // ── Choosing several messages ──────────────────────────────────────
  const togglePick = useCallback((m: ChatMessage) => {
    setPicking((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
  }, []);
  const picked = picking ? messages.filter((m) => picking.has(m.id)) : [];
  const pickedAllDeletable = picked.length > 0 && picked.every(canDeleteForEveryone);

  const startEdit = (message: ChatMessage) => {
    setActionsFor(null);
    setEditing(message);
  };

  const saveEdit = async (text: string) => {
    const message = editing;
    setEditing(null);
    if (!message) return;
    const content = withEditedText(message.content, text);
    if (content === message.content) return;
    // Shown straight away; put back if the edit can't be saved
    applyEdit(message.id, content, new Date().toISOString());
    try {
      const saved = await GroupChatService.editMessage(message.id, chat.id, content);
      applyEdit(saved.id, saved.content, saved.edited_at);
      onActivity(saved);
    } catch (error) {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, content: message.content, edited_at: message.edited_at ?? null } : m)));
      const reason = String((error as { message?: string })?.message ?? '');
      if (/15 minutes/.test(reason)) appAlert("This message can't be edited any more", 'You can edit a message for 15 minutes after sending it.', 'error');
      else if (/deleted/i.test(reason)) appAlert("Couldn't edit the message", 'It was deleted.', 'error');
      else appAlert("Couldn't edit the message", 'Check your connection and try again.', 'error');
    }
  };

  const retry = (message: ChatMessage) => {
    setActionsFor(null);
    sendContent(message.content, message.id, message.reply_to_id);
  };

  // ── Reply, forward, star, pin, delete for me, go to a message ───────
  const startReply = useCallback((message: ChatMessage) => {
    setActionsFor(null);
    setEditing(null);
    setReplyTo(message);
  }, []);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const known = useCallback((id: string) => byId.get(id) ?? extraMessages[id] ?? undefined, [byId, extraMessages]);

  // Quoted (and pinned) messages that aren't loaded: fetch them once
  useEffect(() => {
    const wanted = new Set<string>();
    messages.forEach((m) => m.reply_to_id && wanted.add(m.reply_to_id));
    if (pin) wanted.add(pin.message_id);
    const missing = [...wanted].filter((id) => !byId.has(id) && !(id in extraMessages));
    if (!missing.length) return;
    let stale = false;
    GroupChatService.getMessagesByIds(missing)
      .then((found) => {
        if (stale) return;
        setExtraMessages((prev) => {
          const next = { ...prev };
          missing.forEach((id) => (next[id] = found.find((f) => f.id === id) ?? null));
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [messages, byId, extraMessages, pin]);

  const quoteOf = useCallback((original: ChatMessage | null | undefined, id: string): Quote => {
    if (original === undefined) return { id, userId: '', name: '…', text: '' };
    if (original === null) return { id, userId: '', name: 'Message', text: '', missing: true };
    const own = isMine(original, me.id);
    return {
      id,
      userId: original.user_id,
      name: own ? 'You' : senderName(original),
      text: previewText(original.content, own),
      image: parseMessageContent(original.content).imageUrl,
    };
  }, [me.id]);

  const quotes = useMemo(() => {
    const out: Record<string, Quote> = {};
    messages.forEach((m) => {
      if (m.reply_to_id) out[m.id] = quoteOf(known(m.reply_to_id), m.reply_to_id);
    });
    return out;
  }, [messages, known, quoteOf]);

  /** Scroll to a message and flash it (loading older messages first if needed) */
  const jumpTo = useCallback(async (id: string) => {
    const show = () => {
      const el = scrollRef.current?.querySelector<HTMLElement>(`[data-message-id="${id.replace(/["\\]/g, '')}"]`);
      if (!el) return false;
      atBottomRef.current = false;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setHighlightId(id);
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightId(null), 1800);
      return true;
    };
    if (hidden.has(id)) {
      appAlert('You deleted this message for you');
      return;
    }
    if (show()) return;
    try {
      const target = byId.get(id) ?? extraMessages[id] ?? (await GroupChatService.getMessagesByIds([id]))[0];
      const oldest = messagesRef.current.find((m) => !m.pending && !m.failed && !String(m.id).startsWith('temp-'));
      if (!target || target.chat_id !== chat.id || !oldest) {
        appAlert("This message isn't available");
        return;
      }
      const older = await GroupChatService.getMessagesBetween(chat.id, target.created_at, oldest.created_at);
      const el = scrollRef.current;
      if (el) restoreScroll.current = { height: el.scrollHeight, top: el.scrollTop };
      setMessages((prev) => [...older.filter((o) => !prev.some((p) => p.id === o.id)), ...prev]);
      if (older.length) {
        const r = await GroupChatService.getReactions(older.map((m) => m.id));
        setReactions((prev) => ({ ...r, ...prev }));
      }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!show()) appAlert("This message isn't available");
      }));
    } catch {
      appAlert("Couldn't find that message", 'Check your connection and try again.', 'error');
    }
  }, [hidden, byId, extraMessages, chat.id]);

  const openFound = (m: ChatMessage) => {
    setSearchOpen(false);
    setStarredOpen(false);
    setTimeout(() => jumpTo(m.id), 250); // once the panel has gone
  };

  const toggleStar = async (message: ChatMessage) => {
    setActionsFor(null);
    const on = !starred.has(message.id);
    const flip = (add: boolean) => setStarred((prev) => {
      const next = new Set(prev);
      if (add) next.add(message.id);
      else next.delete(message.id);
      return next;
    });
    flip(on);
    try {
      await GroupChatService.setStarred(message.id, chat.id, on);
      setStarVersion((v) => v + 1);
    } catch {
      flip(!on);
      appAlert(on ? "Couldn't star the message" : "Couldn't unstar the message", 'Check your connection and try again.', 'error');
    }
  };

  const togglePin = async (message: ChatMessage) => {
    setActionsFor(null);
    const before = pin;
    const unpin = pin?.message_id === message.id;
    setPin(unpin ? null : { chat_id: chat.id, message_id: message.id, pinned_by: me.id, pinned_at: new Date().toISOString() });
    try {
      await GroupChatService.setPin(chat.id, unpin ? null : message.id);
    } catch {
      setPin(before);
      appAlert(unpin ? "Couldn't unpin the message" : "Couldn't pin the message", 'Check your connection and try again.', 'error');
    }
  };

  const deleteForMe = async (message: ChatMessage) => {
    setActionsFor(null);
    if (replyTo?.id === message.id) setReplyTo(null);
    setHidden((prev) => new Set(prev).add(message.id));
    try {
      await GroupChatService.deleteForMe(message.id, chat.id);
    } catch {
      setHidden((prev) => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
      appAlert("Couldn't delete the message", 'Check your connection and try again.', 'error');
    }
  };

  const pinned = pin ? known(pin.message_id) : null;

  // Tapping "Missed voice call" in the chat calls back
  const callBack = useCallback((type: 'audio' | 'video') => startCall(chat, type), [startCall, chat]);

  // Latest time any other member has read up to (for ✓✓)
  const othersReadUpTo = useMemo(() => Object.values(readMarks).sort().pop() ?? null, [readMarks]);

  // ── Render helpers ────────────────────────────────────────────────
  const typingNames = Object.values(typing).map((t) => t.name);
  const ongoing = ongoingCalls[chat.id];
  const inThisCall = call?.chatId === chat.id;

  const title = chatTitle(chat, me.name);
  const privateChat = isPrivateChat(chat);
  const subtitle = typingNames.length
    ? `${typingNames.slice(0, 2).join(', ')}${typingNames.length > 2 ? ' and others' : ''} ${typingNames.length === 1 ? 'is' : 'are'} typing…`
    : privateChat
      ? otherOnline ? 'Online' : lastSeen ? formatLastSeen(lastSeen) : ''
      : memberCount != null
      ? `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`
      : 'Tap for group info';

  // Messages I deleted just for me aren't shown
  const visible = hidden.size ? messages.filter((m) => !hidden.has(m.id)) : messages;
  const rendered: React.ReactNode[] = [];
  visible.forEach((m, i) => {
    const prev = visible[i - 1];
    const next = visible[i + 1];
    const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
    if (newDay) {
      rendered.push(
        <div key={`day-${m.id}`} className="sticky top-2 z-10 my-3 flex justify-center">
          <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-border/60 backdrop-blur">
            {formatDayLabel(m.created_at)}
          </span>
        </div>,
      );
    }
    if (m.id === unreadAnchor) {
      rendered.push(
        <div key={`unread-${m.id}`} data-unread-divider className="my-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-blue-500/30" />
          <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-blue-600 shadow-sm dark:text-blue-400">Unread messages</span>
          <div className="h-px flex-1 bg-blue-500/30" />
        </div>,
      );
    }
    const gapBefore = prev ? new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() : Infinity;
    const gapAfter = next ? new Date(next.created_at).getTime() - new Date(m.created_at).getTime() : Infinity;
    const isFirst = newDay || !prev || author(prev) !== author(m) || gapBefore > GROUP_GAP_MS || m.id === unreadAnchor;
    const isLast = !next || author(next) !== author(m) || gapAfter > GROUP_GAP_MS || dayKey(next.created_at) !== dayKey(m.created_at) || next.id === unreadAnchor;
    const isOwn = isMine(m, me.id);

    rendered.push(
      <MessageBubble
        key={m.id}
        message={m}
        isOwn={isOwn}
        isFirst={isFirst}
        isLast={isLast}
        reactions={reactionGroups[m.id] || EMPTY}
        seen={isOwn && !m.imported_from && !!othersReadUpTo && othersReadUpTo >= m.created_at}
        onOpenActions={setActionsFor}
        onToggleReaction={toggleReaction}
        onOpenImage={setViewImage}
        onRetry={retry}
        onCall={callBack}
        quote={quotes[m.id] ?? null}
        onQuoteTap={jumpTo}
        onReply={startReply}
        starred={starred.has(m.id)}
        highlighted={highlightId === m.id}
        myId={me.id}
        selecting={!!picking}
        selected={!!picking?.has(m.id)}
        onToggleSelect={togglePick}
      />,
    );
  });

  return (
    <div ref={rootRef} className="relative flex h-full min-h-0 flex-col bg-background">
      {/* Choosing several messages: what to do with them */}
      {picking && (
        <header className="z-30 flex items-center gap-1 border-b border-border/60 bg-background px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:px-4 md:pt-3" aria-label="Chosen messages">
          <button onClick={() => setPicking(null)} className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted" aria-label="Stop choosing">
            <X className="h-5 w-5" />
          </button>
          <p className="flex-1 text-[17px] font-semibold text-foreground">{picked.length} selected</p>
          {[
            {
              icon: Star,
              label: 'Star',
              onClick: async () => {
                const toStar = picked.filter((m) => !starred.has(m.id));
                setPicking(null);
                for (const m of toStar) await toggleStar(m);
              },
            },
            {
              icon: Copy,
              label: 'Copy',
              onClick: () => {
                const text = picked
                  .map((m) => `[${formatClockShort(m.created_at)}] ${isMine(m, me.id) ? me.name : senderName(m)}: ${plainMentions(parseMessageContent(m.content).text) || previewText(m.content)}`)
                  .join('\n');
                navigator.clipboard?.writeText(text).catch(() => undefined);
                setPicking(null);
                appAlert(picked.length === 1 ? 'Copied' : `${picked.length} messages copied`);
              },
            },
            {
              icon: Forward,
              label: 'Forward',
              onClick: () => {
                setForwardFor(picked.filter((m) => !parseCall(m.content) && !m.locked));
                setPicking(null);
              },
            },
            { icon: Trash2, label: 'Delete', onClick: () => setConfirmDelete(true) },
          ].map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={!picked.length}
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted disabled:opacity-40"
              aria-label={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </header>
      )}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="max-w-sm rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {picked.length} {picked.length === 1 ? 'message' : 'messages'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pickedAllDeletable ? 'Delete them for everyone in this chat, or just for you.' : 'They’ll be deleted just for you.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            {pickedAllDeletable && (
              <button
                onClick={async () => {
                  const list = picked;
                  setConfirmDelete(false);
                  setPicking(null);
                  for (const m of list) await deleteMessage(m);
                }}
                className="h-11 rounded-full bg-red-600 text-[15px] font-semibold text-white"
              >
                Delete for everyone
              </button>
            )}
            <button
              onClick={async () => {
                const list = picked;
                setConfirmDelete(false);
                setPicking(null);
                for (const m of list) await deleteForMe(m);
              }}
              className="h-11 rounded-full border border-red-200 text-[15px] font-semibold text-red-600 dark:border-red-900"
            >
              Delete for me
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="w-full rounded-full">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <header className={cn('z-20 flex items-center gap-2 border-b border-border/60 bg-background/90 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-xl md:px-4 md:pt-3', picking && 'hidden')}>
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted md:hidden" aria-label="Back to chats">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setInfoOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-muted/60">
          <UserAvatar name={title} src={chat.avatar_url} seed={chat.id} className="h-10 w-10" />
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight text-foreground">{title}</p>
            {subtitle && (
              <p className={cn('truncate text-xs', typingNames.length || (privateChat && otherOnline) ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                {subtitle}
              </p>
            )}
          </div>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => startCall(chat, 'video')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-blue-600 hover:bg-muted dark:text-blue-400"
            aria-label="Start video call"
          >
            <Video className="h-5 w-5" />
          </button>
          <button
            onClick={() => startCall(chat, 'audio')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-blue-600 hover:bg-muted dark:text-blue-400"
            aria-label="Start voice call"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button onClick={() => setInfoOpen(true)} className="hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted md:flex" aria-label="Group info">
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Ongoing call banner */}
      {ongoing && !inThisCall && (
        <button
          onClick={() => joinCall({ callId: ongoing.callId, chatId: chat.id, chatName: title, callType: ongoing.callType })}
          className="flex items-center gap-3 bg-emerald-600 px-4 py-2.5 text-left text-white"
        >
          <PhoneCall className="h-5 w-5 animate-pulse" />
          <span className="flex-1 text-sm font-medium">
            {ongoing.callType === 'video' ? 'Video' : 'Voice'} call in progress
            {ongoing.initiatorName ? ` · started by ${ongoing.initiatorName}` : ''}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-emerald-700">Join</span>
        </button>
      )}

      {/* Pinned message (any member can pin one): tap to go to it */}
      {pin && pinned && (
        <div className="z-10 flex items-center gap-2 border-b border-border/60 bg-background/95 py-1.5 pl-3 pr-1 backdrop-blur-xl">
          <button onClick={() => jumpTo(pin.message_id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left" aria-label="Go to the pinned message">
            <Pin className="h-4 w-4 shrink-0 rotate-45 text-blue-600 dark:text-blue-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-blue-600 dark:text-blue-400">Pinned message</span>
              <span className="block truncate text-sm text-foreground">{previewText(pinned.content, pinned.user_id === me.id)}</span>
            </span>
          </button>
          <button onClick={() => togglePin(pinned)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Unpin">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <ChatWallpaper />
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="absolute inset-0 overflow-y-auto overscroll-contain"
        >
          <div ref={contentRef} className="mx-auto flex min-h-full max-w-3xl flex-col px-3 pb-3 pt-2 sm:px-5">
            <div ref={topSentinel} className="h-1" />
            {loadingOlder && (
              <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            )}
            {!hasMore && messages.length > 0 && (
              <p className="mx-auto my-4 w-fit max-w-full rounded-full bg-background/90 px-3 py-1 text-center text-xs text-muted-foreground shadow-sm">{privateChat ? `This is the start of your chat with ${title}` : `This is the start of ${title}`}</p>
            )}
            {encryptedChats && !loading && (
              <button
                onClick={() => setEncryptionInfo(true)}
                className="mx-auto my-3 block max-w-[20rem] rounded-xl bg-[#FCF1D6] px-4 py-2.5 text-center text-[13px] leading-[1.45] text-neutral-800 shadow-[0_1px_0.5px_rgba(0,0,0,0.08)] dark:bg-[#1F2C33] dark:text-[#F7D58E]"
              >
                <SolidLock className="-mt-[3px] mr-1 inline h-[15px] w-[15px]" />
                Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them.{' '}
                <span className="font-semibold">Learn more</span>
              </button>
            )}
            <div className="flex-1" />
            {loading ? (
              <div className="space-y-3 py-6">
                {[40, 64, 52, 72, 36].map((w, i) => (
                  <div key={i} className={cn('flex', i % 2 ? 'justify-end' : 'justify-start')}>
                    <div className="h-10 animate-pulse rounded-2xl bg-muted" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto my-10 flex max-w-sm flex-col items-center rounded-3xl bg-background/90 px-6 py-8 text-center shadow-sm">
                <UserAvatar name={title} src={chat.avatar_url} seed={chat.id} className="h-20 w-20 text-2xl" />
                <p className="mt-4 text-lg font-semibold text-foreground">Say hello to {title} 👋</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  {privateChat
                    ? 'Only the two of you can see this chat. Messages arrive even when their app is closed.'
                    : 'Messages you send here reach every member, even when their app is closed.'}
                </p>
              </div>
            ) : (
              rendered
            )}
            {typingNames.length > 0 && (
              <div className="mb-2 ml-10 flex w-fit items-center gap-1 rounded-full bg-card px-3 py-2 shadow-sm ring-1 ring-border/60">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d * 150}ms` }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {!atBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 right-4 flex h-11 items-center gap-1.5 rounded-full bg-background px-3 text-sm font-medium text-foreground shadow-lg ring-1 ring-border transition hover:bg-muted"
            aria-label="Jump to latest"
          >
            {newBelow > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">{newBelow}</span>}
            <ArrowDown className="h-5 w-5" />
          </button>
        )}
      </div>

      <ChatComposer
        onSend={(text, linkPreview?: LinkPreview | null) => {
          const replying = replyTo?.id ?? null;
          setReplyTo(null);
          sendContent(linkPreview ? `${encodePreview(linkPreview)}\n${text}` : text, undefined, replying);
        }}
        onSendMedia={sendMedia}
        onSendVoice={sendVoice}
        onSendFile={sendFile}
        mentionables={mentionables}
        onTyping={onTyping}
        replyTo={replyTo ? { ...quoteOf(replyTo, replyTo.id), name: replyTo.user_id === me.id ? 'yourself' : senderName(replyTo) } : null}
        onCancelReply={() => setReplyTo(null)}
        editing={editing ? { id: editing.id, text: plainMentions(editableText(editing.content)), caption: editableText(editing.content) !== editing.content } : null}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditing(null)}
      />

      <MessageActionsSheet
        message={actionsFor}
        isOwn={actionsFor?.user_id === me.id}
        myReactions={actionsFor ? (reactions[actionsFor.id] || []).filter((r) => r.user_id === me.id).map((r) => r.emoji) : []}
        onClose={() => setActionsFor(null)}
        onReact={(emoji) => actionsFor && toggleReaction(actionsFor.id, emoji)}
        onCopy={() => {
          if (actionsFor) navigator.clipboard?.writeText(plainMentions(parseMessageContent(actionsFor.content).text)).catch(() => undefined);
          setActionsFor(null);
          appAlert('Copied');
        }}
        canDeleteForEveryone={!!actionsFor && canDeleteForEveryone(actionsFor)}
        onSelect={() => {
          if (actionsFor) setPicking(new Set([actionsFor.id]));
          setActionsFor(null);
        }}
        onDelete={() => actionsFor && deleteMessage(actionsFor)}
        onRetry={() => actionsFor && retry(actionsFor)}
        onEdit={actionsFor && canEditMessage(actionsFor, me.id) ? () => startEdit(actionsFor) : undefined}
        onReply={() => actionsFor && startReply(actionsFor)}
        onForward={() => {
          setForwardFor(actionsFor);
          setActionsFor(null);
        }}
        starred={!!actionsFor && starred.has(actionsFor.id)}
        onToggleStar={() => actionsFor && toggleStar(actionsFor)}
        pinned={!!actionsFor && pin?.message_id === actionsFor.id}
        onTogglePin={() => actionsFor && togglePin(actionsFor)}
        onInfo={actionsFor && isMine(actionsFor, me.id) && !actionsFor.imported_from ? () => {
          setInfoFor(actionsFor);
          setActionsFor(null);
        } : undefined}
        onDeleteForMe={() => actionsFor && deleteForMe(actionsFor)}
      />

      <ForwardSheet
        message={forwardFor}
        myName={me.name}
        onClose={() => setForwardFor(null)}
        onForwarded={(sent) => sent.filter((m) => m.chat_id === chat.id).forEach((m) => {
          addMessage(m);
          onActivity(m);
        })}
      />
      <EncryptionInfo open={encryptionInfo} onOpenChange={setEncryptionInfo} />
      <ClearChatDialog
        open={clearing}
        name={privateChat ? title : undefined}
        onOpenChange={setClearing}
        onConfirm={async (keepStarred) => {
          try {
            await GroupChatService.clearChat(chat.id, keepStarred);
            if (!keepStarred) setStarred(new Set());
            setReloadTick((n) => n + 1);
            appAlert('Chat cleared');
          } catch {
            appAlert("Couldn't clear the chat", 'Check your connection and try again.', 'error');
            throw new Error('not cleared');
          }
        }}
      />
      <ChatSearchSheet open={searchOpen} chatId={chat.id} myId={me.id} onOpenChange={setSearchOpen} onOpenMessage={openFound} />
      <StarredSheet open={starredOpen} chatId={chat.id} myId={me.id} onOpenChange={setStarredOpen} onOpenMessage={openFound} version={starVersion} />
      <MessageInfoSheet message={infoFor} chatId={chat.id} myId={me.id} readMarks={readMarks} onClose={() => setInfoFor(null)}
      />

      <ImageViewer url={viewImage} onClose={() => setViewImage(null)} />

      <GroupInfoSheet
        chat={chat}
        userId={me.id}
        open={infoOpen}
        onOpenChange={setInfoOpen}
        onChatUpdated={onChatUpdated}
        onLeft={onLeft}
        onlineIds={onlineIds}
        privateStatus={privateChat && !typingNames.length ? subtitle : undefined}
        privateName={privateChat ? title : undefined}
        onCall={(type) => {
          setInfoOpen(false);
          startCall(chat, type);
        }}
        onSearch={() => {
          setInfoOpen(false);
          setSearchOpen(true);
        }}
        onStarred={() => {
          setInfoOpen(false);
          setStarredOpen(true);
        }}
        onImport={canImport ? () => {
          setInfoOpen(false);
          setImportOpen(true);
        } : undefined}
        encrypted={encryptedChats}
        settings={settings}
        onMute={async (until) => {
          const before = settings;
          setSettings((s) => (s ? { ...s, muted_until: until ? until.toISOString() : null } : s));
          try {
            await GroupChatService.setMuted(chat.id, until);
            appAlert(until ? 'Notifications muted' : 'Notifications on');
          } catch {
            setSettings(before);
            appAlert("Couldn't change notifications", 'Check your connection and try again.', 'error');
          }
        }}
        onClear={() => {
          setInfoOpen(false);
          setClearing(true);
        }}
        onArchive={async (archived) => {
          const before = settings;
          setSettings((s) => (s ? { ...s, archived_at: archived ? new Date().toISOString() : null } : s));
          try {
            await GroupChatService.setArchived(chat.id, archived);
            appAlert(archived ? 'Chat archived' : 'Chat unarchived');
          } catch {
            setSettings(before);
            appAlert("Couldn't change that", 'Check your connection and try again.', 'error');
          }
        }}
      />

      <WhatsAppImport
        open={importOpen}
        onOpenChange={setImportOpen}
        chat={chat}
        me={{ id: me.id, name: me.name }}
        otherId={otherId}
        onImported={() => setReloadTick((t) => t + 1)}
      />
    </div>
  );
};

export default Conversation;
