import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { GroupChatService, type ChatSummary } from '@/services/groupChatService';
import { formatListTime, previewText } from '@/components/messages/chatUtils';
import UserAvatar from '@/components/common/UserAvatar';

type Card = Pick<ChatSummary, 'id' | 'name' | 'avatar_url' | 'unread' | 'marked_unread'> & {
  last?: { text: string; at: string; who?: string } | null;
};

const KEY = (user: string, location: string) => `choir_home_chats_${user}_${location}`;
const keep = (key: string, cards: Card[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(cards));
  } catch {
    /* private window */
  }
};
const kept = (key: string): Card[] | null => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

/**
 * On a choir's page: the group chat(s) linked to that choir (chat info → Choir),
 * one tap to open, with the latest message and the unread count like the chat
 * list. Only for people in that chat (the link is only visible to its members),
 * so it shows nothing to anyone else, signed out included.
 */
const ChoirChatCard = ({ locationId }: { locationId?: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const key = user && locationId ? KEY(user.id, locationId) : '';
  const [cards, setCards] = useState<Card[]>(() => (key ? kept(key) ?? [] : []));

  const load = useCallback(async () => {
    if (!user || !locationId) return;
    const { data, error } = await supabase.from('choir_chat_links' as never).select('chat_id').eq('location', locationId);
    if (error) return; // before the migration, or offline: keep what's shown
    const ids = ((data ?? []) as { chat_id: string }[]).map((r) => r.chat_id);
    const chats = ids.length ? await GroupChatService.getMyChats(ids) : [];
    const next: Card[] = chats.map((c) => ({
      id: c.id,
      name: c.name,
      avatar_url: c.avatar_url,
      unread: c.unread,
      marked_unread: c.marked_unread,
      last: c.last_message
        ? {
            text: previewText(c.last_message.content, c.last_message.user_id === user.id),
            at: c.last_message.created_at,
            who: c.last_message.user_id === user.id ? 'You' : c.last_message.sender_name?.split(' ')[0],
          }
        : null,
    }));
    setCards(next);
    keep(KEY(user.id, locationId), next);
  }, [user, locationId]);

  useEffect(() => {
    setCards(key ? kept(key) ?? [] : []);
    void load();
  }, [key, load]);
  // New messages and reading the chat elsewhere update the count
  useLiveRefresh([], load, { pollMs: 30_000, enabled: !!user && !!locationId });
  useEffect(() => {
    const again = () => void load();
    window.addEventListener('chats:changed', again);
    window.addEventListener('chats:read', again);
    return () => {
      window.removeEventListener('chats:changed', again);
      window.removeEventListener('chats:read', again);
    };
  }, [load]);

  if (!user || !cards.length) return null;
  return (
    <div className="mb-6 space-y-2.5" data-testid="choir-chat-card">
      {cards.map((c) => {
        const unread = c.unread > 0;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => navigate(`/group-chats?chat=${c.id}`)}
            className="flex w-full items-center gap-3 rounded-[22px] border border-slate-200/70 bg-card p-3.5 text-left shadow-sm transition active:scale-[0.99] dark:border-slate-800"
          >
            <span className="relative shrink-0">
              <UserAvatar name={c.name} src={c.avatar_url} seed={c.id} className="h-12 w-12" />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-card">
                <MessageCircle className="h-3 w-3" />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-emerald-600 dark:text-emerald-400">Choir chat</span>
                {c.last && <span className="ml-auto shrink-0 text-[12px] text-muted-foreground">{formatListTime(c.last.at)}</span>}
              </span>
              <span className="block truncate text-[16px] font-semibold text-foreground">{c.name}</span>
              <span className={`block truncate text-[13.5px] ${unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {c.last ? `${c.last.who ? `${c.last.who}: ` : ''}${c.last.text}` : 'Open the chat'}
              </span>
            </span>
            {unread || c.marked_unread ? (
              <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[12px] font-bold text-white tabular-nums" aria-label={`${c.unread || 1} unread`}>
                {c.unread ? (c.unread > 99 ? '99+' : c.unread) : ''}
              </span>
            ) : (
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ChoirChatCard;
