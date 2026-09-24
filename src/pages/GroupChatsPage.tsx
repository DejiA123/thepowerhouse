import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCall } from '@/contexts/CallContext';
import { appAlert } from '@/lib/appAlert';
import { GroupChatService, type ChatMessage, type ChatSummary, type GroupChat } from '@/services/groupChatService';
import ChatList from '@/components/messages/ChatList';
import Conversation from '@/components/messages/Conversation';
import CreateGroupDialog from '@/components/messages/CreateGroupDialog';
import NotificationPrompt from '@/components/notifications/NotificationPrompt';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const CACHE_KEY = (userId: string) => `chat_list_cache_v2_${userId}`;

/**
 * Messages: chat list + conversation. The open chat lives in the URL
 * (?chat=<id>) so back buttons, swipe-back and notification taps all work.
 */
const GroupChatsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ongoingCalls } = useCall();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('chat');
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const names = useRef<Record<string, string>>({});

  const [chats, setChats] = useState<ChatSummary[]>(() => {
    if (!user) return [];
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY(user.id)) || '[]');
    } catch {
      return [];
    }
  });
  const [discover, setDiscover] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [openedChat, setOpenedChat] = useState<GroupChat | null>(null);

  const me = useMemo(() => {
    if (!user) return null;
    const meta = (user.user_metadata || {}) as { full_name?: string; avatar_url?: string };
    return {
      id: user.id,
      name: meta.full_name || user.email?.split('@')[0] || 'Me',
      avatar: meta.avatar_url ?? null,
      email: user.email,
    };
  }, [user]);

  const loadChats = useCallback(async () => {
    if (!user) return;
    try {
      const mine = await GroupChatService.getMyChats();
      setChats(mine);
      try {
        localStorage.setItem(CACHE_KEY(user.id), JSON.stringify(mine));
      } catch {
        /* storage full */
      }
      setDiscover(await GroupChatService.getDiscoverableChats(mine.map((c) => c.id)));
    } catch (error) {
      console.error('Failed to load chats', error);
      appAlert('Could not load your chats', 'Check your connection and pull to refresh.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadChats();
    const onChanged = () => loadChats();
    const onVisible = () => document.visibilityState === 'visible' && loadChats();
    window.addEventListener('chats:changed', onChanged);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('chats:changed', onChanged);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadChats]);

  // Keep the list live: new messages in any of my chats move them to the top
  useEffect(() => {
    if (!user) return;
    const channel = GroupChatService.subscribeToAllMessages(async (message) => {
      // Realtime rows don't include the author's name; look it up once
      if (message.user_id !== user.id && !names.current[message.user_id]) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', message.user_id).maybeSingle();
        names.current[message.user_id] = data?.full_name || '';
      }
      setChats((prev) => {
        const index = prev.findIndex((c) => c.id === message.chat_id);
        if (index < 0) return prev;
        const chat = prev[index];
        const isOpen = message.chat_id === selectedIdRef.current;
        const updated: ChatSummary = {
          ...chat,
          last_message: {
            content: message.content,
            created_at: message.created_at,
            user_id: message.user_id,
            sender_name: names.current[message.user_id] || undefined,
          },
          unread: message.user_id !== user.id && !isOpen ? chat.unread + 1 : chat.unread,
        };
        return [updated, ...prev.filter((_, i) => i !== index)];
      });
    });
    return () => GroupChatService.unsubscribe(channel);
  }, [user]);

  const selectedChat: GroupChat | null =
    chats.find((c) => c.id === selectedId) ?? (openedChat?.id === selectedId ? openedChat : null);

  // Opening a chat that isn't in my list yet (e.g. from a link or after joining)
  useEffect(() => {
    if (!selectedId || chats.some((c) => c.id === selectedId) || openedChat?.id === selectedId || loading) return;
    (async () => {
      const all = await GroupChatService.getGroupChats().catch(() => []);
      const found = all.find((c) => c.id === selectedId);
      if (found) setOpenedChat(found);
      else {
        appAlert('Chat not found', 'It may have been deleted or you were removed.');
        setParams({}, { replace: true });
      }
    })();
  }, [selectedId, chats, openedChat, loading, setParams]);

  const openChat = (chat: GroupChat) => {
    setParams({ chat: chat.id });
  };

  const closeChat = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else setParams({}, { replace: true });
  };

  const joinChat = async (chat: GroupChat) => {
    setJoiningId(chat.id);
    try {
      await GroupChatService.joinChat(chat.id);
      await loadChats();
      openChat(chat);
    } catch {
      appAlert(`Could not join ${chat.name}`, 'Please try again.', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  const onActivity = useCallback((message: ChatMessage) => {
    setChats((prev) => {
      const index = prev.findIndex((c) => c.id === message.chat_id);
      if (index < 0) return prev;
      const chat = prev[index];
      const sender = message.user?.full_name || message.user?.user_metadata?.full_name;
      const updated: ChatSummary = {
        ...chat,
        unread: 0,
        last_message: { content: message.content, created_at: message.created_at, user_id: message.user_id, sender_name: sender || undefined },
      };
      return [updated, ...prev.filter((_, i) => i !== index)];
    });
  }, []);

  const onRead = useCallback(() => {
    if (!selectedId) return;
    setChats((prev) => prev.map((c) => (c.id === selectedId ? { ...c, unread: 0 } : c)));
  }, [selectedId]);

  if (!user || !me) return null;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background">
      {/* Chat list */}
      <aside
        className={cn(
          'h-full min-h-0 w-full border-border/60 md:w-[360px] md:shrink-0 md:border-r lg:w-[400px]',
          selectedId ? 'hidden md:block' : 'block',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1">
            <ChatList
              chats={chats}
              discover={discover}
              selectedId={selectedId}
              loading={loading}
              myId={user.id}
              ongoingCalls={ongoingCalls}
              joiningId={joiningId}
              onSelect={openChat}
              onJoin={joinChat}
              onNewGroup={() => setCreating(true)}
              onBack={() => navigate(-1)}
            />
          </div>
          <div className="px-3 pb-3 empty:hidden">
            <NotificationPrompt />
          </div>
        </div>
      </aside>

      {/* Conversation */}
      <section className={cn('h-full min-h-0 flex-1', selectedId ? 'block' : 'hidden md:block')}>
        {selectedChat ? (
          <Conversation
            key={selectedChat.id}
            chat={selectedChat}
            me={me}
            onBack={closeChat}
            onActivity={onActivity}
            onRead={onRead}
            onChatUpdated={(patch) => {
              setChats((prev) => prev.map((c) => (c.id === selectedChat.id ? { ...c, ...patch } : c)));
              setOpenedChat((prev) => (prev && prev.id === selectedChat.id ? { ...prev, ...patch } : prev));
            }}
            onLeft={() => {
              setChats((prev) => prev.filter((c) => c.id !== selectedChat.id));
              setParams({}, { replace: true });
              loadChats();
            }}
          />
        ) : selectedId ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" />
          </div>
        ) : (
          <div className="hidden h-full flex-col items-center justify-center gap-4 p-10 text-center md:flex">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <MessageCircle className="h-9 w-9" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">Your messages</p>
              <p className="mt-1 max-w-sm text-muted-foreground">
                Pick a chat to start talking, or create a group for your team, ministry or friends.
              </p>
            </div>
          </div>
        )}
      </section>

      <CreateGroupDialog
        open={creating}
        userId={user.id}
        onOpenChange={setCreating}
        onCreated={(chat) => {
          loadChats();
          setOpenedChat(chat);
          openChat(chat);
        }}
      />
    </div>
  );
};

export default GroupChatsPage;
