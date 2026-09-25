import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, Info, Loader2, Phone, PhoneCall, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import { useCall } from '@/contexts/CallContext';
import { useOnlineUsers } from '@/contexts/PresenceContext';
import UserAvatar from '@/components/common/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { GroupChatService, signalsTopic, type ChatMessage, type GroupChat } from '@/services/groupChatService';
import { broadcast } from '@/lib/realtime';
import MessageBubble, { type ReactionGroup } from './MessageBubble';
import ChatComposer from './ChatComposer';
import MessageActionsSheet from './MessageActionsSheet';
import ImageViewer from './ImageViewer';
import GroupInfoSheet from './GroupInfoSheet';
import { IMAGE_PREFIX, dayKey, formatDayLabel, parseMessageContent, uploadChatImage } from './chatUtils';

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
}

type Reaction = { emoji: string; user_id: string; id: string };

const PAGE = 50;
const GROUP_GAP_MS = 5 * 60 * 1000;

/** Keeps the chat above the on-screen keyboard on iOS (which doesn't resize the page). */
function useKeyboardSafeHeight(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isIOS) return;
    const update = () => {
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.paddingBottom = keyboard > 80 ? `${keyboard}px` : '';
      if (keyboard > 80) window.scrollTo(0, 0);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      el.style.paddingBottom = '';
    };
  }, [ref]);
}

const Conversation = ({ chat, me, onBack, onChatUpdated, onLeft, onActivity, onRead }: Props) => {
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
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const [unreadAnchor, setUnreadAnchor] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  // ── Initial load ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    initialScrollDone.current = false;
    setLoading(true);
    setMessages([]);
    setReactions({});
    setHasMore(true);
    setTyping({});
    setUnreadAnchor(null);

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
        setReadMarks(Object.fromEntries((marks || []).filter((m) => m.user_id !== me.id && m.last_read_at).map((m) => [m.user_id, m.last_read_at!])));

        const lastRead = membership?.last_read_at;
        const firstUnread = lastRead ? data.find((m) => m.user_id !== me.id && m.created_at > lastRead) : null;
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
  }, [chat.id, me.id]);

  // ── Realtime ──────────────────────────────────────────────────────
  useEffect(() => {
    const dbChannel = GroupChatService.subscribeToMessages(chat.id, addMessage);

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
      supabase.removeChannel(readChannel);
    };
  }, [chat.id, me.id, addMessage]);

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
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onVisible);
    };
  }, [chat.id, addMessage, loading]);

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
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
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
      return;
    }
    const last = messages[messages.length - 1];
    if (last && (atBottomRef.current || last.user_id === me.id)) scrollToBottom(true);
  }, [messages, me.id, scrollToBottom, unreadAnchor, loading]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
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
  const sendContent = useCallback(async (content: string, existingTempId?: string) => {
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
      const saved = await GroupChatService.sendMessage(chat.id, content);
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

  const sendPhoto = useCallback(async (file: File, caption: string) => {
    try {
      const url = await uploadChatImage(me.id, file);
      await sendContent(`${IMAGE_PREFIX}${url}${caption ? `\n${caption}` : ''}`);
    } catch (error) {
      console.error('Photo upload failed', error);
      appAlert("Couldn't send photo", 'Please check your connection and try again.', 'error');
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
      await GroupChatService.deleteMessage(message.id);
    } catch {
      setMessages(snapshot);
      appAlert('Could not delete message', '', 'error');
    }
  };

  const retry = (message: ChatMessage) => {
    setActionsFor(null);
    sendContent(message.content, message.id);
  };

  // Latest time any other member has read up to (for ✓✓)
  const othersReadUpTo = useMemo(() => Object.values(readMarks).sort().pop() ?? null, [readMarks]);

  // ── Render helpers ────────────────────────────────────────────────
  const typingNames = Object.values(typing).map((t) => t.name);
  const ongoing = ongoingCalls[chat.id];
  const inThisCall = call?.chatId === chat.id;

  const subtitle = typingNames.length
    ? `${typingNames.slice(0, 2).join(', ')}${typingNames.length > 2 ? ' and others' : ''} ${typingNames.length === 1 ? 'is' : 'are'} typing…`
    : memberCount != null
      ? `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`
      : 'Tap for group info';

  const rendered: React.ReactNode[] = [];
  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
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
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Unread messages</span>
          <div className="h-px flex-1 bg-blue-500/30" />
        </div>,
      );
    }
    const gapBefore = prev ? new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() : Infinity;
    const gapAfter = next ? new Date(next.created_at).getTime() - new Date(m.created_at).getTime() : Infinity;
    const isFirst = newDay || !prev || prev.user_id !== m.user_id || gapBefore > GROUP_GAP_MS || m.id === unreadAnchor;
    const isLast = !next || next.user_id !== m.user_id || gapAfter > GROUP_GAP_MS || dayKey(next.created_at) !== dayKey(m.created_at) || next.id === unreadAnchor;
    const isOwn = m.user_id === me.id;

    rendered.push(
      <MessageBubble
        key={m.id}
        message={m}
        isOwn={isOwn}
        isFirst={isFirst}
        isLast={isLast}
        reactions={reactionGroups[m.id] || EMPTY}
        seen={isOwn && !!othersReadUpTo && othersReadUpTo >= m.created_at}
        onOpenActions={setActionsFor}
        onToggleReaction={toggleReaction}
        onOpenImage={setViewImage}
        onRetry={retry}
      />,
    );
  });

  return (
    <div ref={rootRef} className="relative flex h-full min-h-0 flex-col bg-background">
      {/* Header */}
      <header className="z-20 flex items-center gap-2 border-b border-border/60 bg-background/90 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-xl md:px-4 md:pt-3">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted md:hidden" aria-label="Back to chats">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setInfoOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-muted/60">
          <UserAvatar name={chat.name} src={chat.avatar_url} seed={chat.id} className="h-10 w-10" />
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight text-foreground">{chat.name}</p>
            <p className={cn('truncate text-xs', typingNames.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
              {subtitle}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => startCall({ id: chat.id, name: chat.name }, 'video')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-blue-600 hover:bg-muted dark:text-blue-400"
            aria-label="Start video call"
          >
            <Video className="h-5 w-5" />
          </button>
          <button
            onClick={() => startCall({ id: chat.id, name: chat.name }, 'audio')}
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
          onClick={() => joinCall({ callId: ongoing.callId, chatId: chat.id, chatName: chat.name, callType: ongoing.callType })}
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

      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="absolute inset-0 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] [background-size:22px_22px]"
        >
          <div className="mx-auto flex min-h-full max-w-3xl flex-col px-3 pb-3 pt-2 sm:px-5">
            <div ref={topSentinel} className="h-1" />
            {loadingOlder && (
              <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            )}
            {!hasMore && messages.length > 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">This is the start of {chat.name}</p>
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
              <div className="flex flex-col items-center py-16 text-center">
                <UserAvatar name={chat.name} src={chat.avatar_url} seed={chat.id} className="h-20 w-20 text-2xl" />
                <p className="mt-4 text-lg font-semibold text-foreground">Say hello to {chat.name} 👋</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">Messages you send here reach every member, even when their app is closed.</p>
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

      <ChatComposer onSend={(text) => sendContent(text)} onSendPhoto={sendPhoto} onTyping={onTyping} />

      <MessageActionsSheet
        message={actionsFor}
        isOwn={actionsFor?.user_id === me.id}
        myReactions={actionsFor ? (reactions[actionsFor.id] || []).filter((r) => r.user_id === me.id).map((r) => r.emoji) : []}
        onClose={() => setActionsFor(null)}
        onReact={(emoji) => actionsFor && toggleReaction(actionsFor.id, emoji)}
        onCopy={() => {
          if (actionsFor) navigator.clipboard?.writeText(parseMessageContent(actionsFor.content).text).catch(() => undefined);
          setActionsFor(null);
          appAlert('Copied');
        }}
        onDelete={() => actionsFor && deleteMessage(actionsFor)}
        onRetry={() => actionsFor && retry(actionsFor)}
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
        onCall={(type) => {
          setInfoOpen(false);
          startCall({ id: chat.id, name: chat.name }, type);
        }}
      />
    </div>
  );
};

export default Conversation;
