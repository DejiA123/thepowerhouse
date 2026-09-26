import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, MessageCircle, Music2, PhoneMissed, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { pushNotificationService, ChatNotification } from '@/services/pushNotificationService';
import { GroupChatService } from '@/services/groupChatService';
import { clearNotifications, setAppBadge } from '@/lib/push';
import { uniqueTopic } from '@/lib/realtime';
import { cn } from '@/lib/utils';

interface NotificationContextType {
  unreadCount: number;
  /** Chats with messages I haven't read */
  unreadChats: number;
  notifications: ChatNotification[];
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  showInAppNotification: (title: string, message: string, groupName?: string, url?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface Banner {
  id: string;
  key?: string;
  kind: 'chat' | 'choir' | 'call-missed' | 'general' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  url?: string;
}

const BANNER_MS = 5000;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const seenKeys = useRef(new Set<string>());
  const chatNames = useRef<Record<string, string>>({});
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  locationRef.current = location;

  const [unreadChats, setUnreadChats] = useState(0);

  /**
   * Unread message notifications, minus any for messages already read in the
   * chat itself (those used to pile up and inflate every badge).
   */
  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadChats(0);
      return;
    }
    GroupChatService.getUnreadChatCount().then(setUnreadChats).catch(() => undefined);
    const unread = await pushNotificationService.getUnreadNotifications(user.id);
    if (!unread.length) {
      setNotifications([]);
      return;
    }
    try {
      const [{ data: messages }, { data: memberships }] = await Promise.all([
        supabase.from('chat_messages').select('id, chat_id, created_at').in('id', unread.map((n) => n.message_id)),
        supabase.from('chat_participants').select('chat_id, last_read_at').eq('user_id', user.id),
      ]);
      const byId = new Map((messages || []).map((m) => [m.id, m]));
      const lastRead = new Map((memberships || []).map((m) => [m.chat_id, m.last_read_at]));
      const stale = unread.filter((n) => {
        const msg = byId.get(n.message_id);
        if (!msg) return true; // message deleted
        if (!lastRead.has(msg.chat_id)) return true; // no longer in that chat
        const read = lastRead.get(msg.chat_id);
        return !!read && msg.created_at <= read;
      });
      if (stale.length) {
        await supabase.from('chat_notifications').update({ is_read: true }).in('id', stale.map((n) => n.id));
      }
      const staleIds = new Set(stale.map((n) => n.id));
      setNotifications(unread.filter((n) => !staleIds.has(n.id)));
    } catch {
      setNotifications(unread);
    }
  }, [user]);

  // Reading a chat clears its notifications and updates the counts
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onRead = () => {
      clearTimeout(timer);
      timer = setTimeout(refreshNotifications, 400);
    };
    window.addEventListener('chats:read', onRead);
    window.addEventListener('chats:changed', onRead);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('chats:read', onRead);
      window.removeEventListener('chats:changed', onRead);
    };
  }, [user, refreshNotifications]);

  useEffect(() => {
    refreshNotifications();
    if (!user) return;
    const interval = setInterval(refreshNotifications, 60000);
    const onVisible = () => document.visibilityState === 'visible' && refreshNotifications();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, refreshNotifications]);

  // Keep the app icon badge in step with unread notifications
  useEffect(() => {
    setAppBadge(notifications.length);
  }, [notifications.length]);

  const isViewingChat = (chatId?: string) => {
    const loc = locationRef.current;
    return !!chatId && loc.pathname === '/group-chats' && new URLSearchParams(loc.search).get('chat') === chatId;
  };

  const pushBanner = useCallback((banner: Omit<Banner, 'id'>) => {
    if (banner.key) {
      if (seenKeys.current.has(banner.key)) return;
      seenKeys.current.add(banner.key);
      if (seenKeys.current.size > 200) seenKeys.current = new Set(Array.from(seenKeys.current).slice(-100));
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setBanners((prev) => [...prev.slice(-2), { ...banner, id }]);
    setTimeout(() => setBanners((prev) => prev.filter((b) => b.id !== id)), BANNER_MS);
  }, []);

  const showInAppNotification = useCallback((title: string, message: string, _groupName?: string, url?: string) => {
    pushBanner({ kind: 'general', title, message, url });
  }, [pushBanner]);

  // Legacy event used by a few screens
  useEffect(() => {
    const handler = (event: Event) => {
      const { title, message, url, kind } = (event as CustomEvent).detail || {};
      if (title) pushBanner({ kind: kind === 'error' || kind === 'success' || kind === 'info' ? kind : 'general', title, message: message || '', url });
    };
    window.addEventListener('showInAppNotification', handler);
    return () => window.removeEventListener('showInAppNotification', handler);
  }, [pushBanner]);

  // Push that arrived while the app is open (the service worker skips the OS banner)
  useEffect(() => {
    const handler = (event: Event) => {
      const p = (event as CustomEvent).detail || {};
      if (p.kind === 'call' || p.kind === 'test') return; // calls ring via CallContext
      if (p.kind === 'chat' && isViewingChat(p.data?.chatId)) return;
      pushBanner({
        kind: p.kind === 'choir' ? 'choir' : p.kind === 'call-missed' ? 'call-missed' : p.kind === 'chat' ? 'chat' : 'general',
        key: p.data?.messageId || p.tag,
        title: p.title,
        message: p.body,
        url: p.url,
      });
      if (p.kind === 'chat') refreshNotifications();
    };
    window.addEventListener('app:push', handler);
    return () => window.removeEventListener('app:push', handler);
  }, [pushBanner, refreshNotifications]);

  // Chats I'm a member of (only these produce banners)
  const myChats = useRef(new Set<string>());
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from('chat_participants').select('chat_id').eq('user_id', user.id);
      myChats.current = new Set((data || []).map((r) => r.chat_id));
    };
    load();
    window.addEventListener('chats:changed', load);
    return () => window.removeEventListener('chats:changed', load);
  }, [user]);

  // Realtime: show a banner for new messages in my chats even without push set up
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(uniqueTopic('inapp-messages'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async ({ new: msg }: any) => {
        if (!msg || msg.user_id === user.id || isViewingChat(msg.chat_id)) return;
        if (!myChats.current.has(msg.chat_id)) return;
        GroupChatService.getUnreadChatCount().then(setUnreadChats).catch(() => undefined);
        if (document.visibilityState !== 'visible') return;

        if (!chatNames.current[msg.chat_id]) {
          const { data: chat } = await supabase.from('group_chats').select('name').eq('id', msg.chat_id).maybeSingle();
          chatNames.current[msg.chat_id] = chat?.name || 'Group chat';
        }
        const { data: sender } = await supabase.from('profiles').select('full_name').eq('id', msg.user_id).maybeSingle();
        pushBanner({
          kind: 'chat',
          key: msg.id,
          title: chatNames.current[msg.chat_id],
          message: `${sender?.full_name || 'Someone'}: ${String(msg.content || '').slice(0, 120)}`,
          url: `/group-chats?chat=${msg.chat_id}`,
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, pushBanner]);

  // Opening a chat clears its OS notifications
  useEffect(() => {
    const chatId = new URLSearchParams(location.search).get('chat');
    if (location.pathname === '/group-chats' && chatId) clearNotifications(`chat-${chatId}`);
  }, [location.pathname, location.search]);

  const markAsRead = async (notificationId: string) => {
    await pushNotificationService.markAsRead(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await pushNotificationService.markAllAsRead(user.id);
    setNotifications([]);
    clearNotifications();
  };

  const value: NotificationContextType = {
    unreadCount: notifications.length,
    unreadChats,
    notifications,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    showInAppNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <BannerStack
        banners={banners}
        onOpen={(b) => {
          setBanners((prev) => prev.filter((x) => x.id !== b.id));
          if (b.url) navigate(b.url);
        }}
        onDismiss={(id) => setBanners((prev) => prev.filter((b) => b.id !== id))}
      />
    </NotificationContext.Provider>
  );
};

const BannerIcon = ({ kind }: { kind: Banner['kind'] }) => {
  const Icon =
    kind === 'choir' ? Music2
      : kind === 'call-missed' ? PhoneMissed
        : kind === 'error' ? AlertCircle
          : kind === 'success' ? CheckCircle2
            : kind === 'info' ? Info
              : MessageCircle;
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white',
        kind === 'choir' ? 'bg-violet-600'
          : kind === 'call-missed' || kind === 'error' ? 'bg-red-500'
            : kind === 'success' ? 'bg-emerald-500'
              : 'bg-blue-600',
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
};

/** iOS-style banners at the top: tap to open, swipe up (or ✕) to dismiss. */
const BannerStack = ({
  banners, onOpen, onDismiss,
}: { banners: Banner[]; onOpen: (b: Banner) => void; onDismiss: (id: string) => void }) => {
  const startY = useRef<Record<string, number>>({});
  if (banners.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9500] flex flex-col items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:items-end sm:pr-6">
      {banners.map((b) => (
        <div
          key={b.id}
          role="status"
          onTouchStart={(e) => (startY.current[b.id] = e.touches[0].clientY)}
          onTouchEnd={(e) => {
            const dy = e.changedTouches[0].clientY - (startY.current[b.id] ?? 0);
            if (dy < -30) onDismiss(b.id);
          }}
          className="pointer-events-auto flex w-full max-w-md cursor-pointer items-center gap-3 rounded-2xl border border-border/60 bg-card/95 p-3 pr-2 shadow-xl backdrop-blur-xl animate-in slide-in-from-top-4 fade-in duration-300"
          onClick={() => onOpen(b)}
        >
          <BannerIcon kind={b.kind} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{b.title}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{b.message}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(b.id);
            }}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
