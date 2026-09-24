import { useMemo, useState } from 'react';
import { ArrowLeft, Loader2, MessageCirclePlus, PhoneCall, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';
import type { ChatSummary, GroupChat } from '@/services/groupChatService';
import type { OngoingCall } from '@/contexts/CallContext';
import { formatListTime, previewText } from './chatUtils';

interface Props {
  chats: ChatSummary[];
  discover: GroupChat[];
  selectedId: string | null;
  loading: boolean;
  myId: string;
  ongoingCalls: Record<string, OngoingCall>;
  joiningId: string | null;
  onSelect: (chat: ChatSummary) => void;
  onJoin: (chat: GroupChat) => void;
  onNewGroup: () => void;
  onBack: () => void;
}

type Filter = 'all' | 'unread';

const ChatList = ({
  chats, discover, selectedId, loading, myId, ongoingCalls, joiningId, onSelect, onJoin, onNewGroup, onBack,
}: Props) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => chats.filter((c) =>
      (!q || c.name.toLowerCase().includes(q) || (c.last_message?.content || '').toLowerCase().includes(q)) &&
      (filter === 'all' || c.unread > 0),
    ),
    [chats, q, filter],
  );
  const visibleDiscover = useMemo(
    () => discover.filter((c) => !q || c.name.toLowerCase().includes(q)),
    [discover, q],
  );
  const unreadTotal = chats.reduce((sum, c) => sum + (c.unread > 0 ? 1 : 0), 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:pt-5">
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
        </div>
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
            {visible.map((chat) => {
              const last = chat.last_message;
              const mine = last?.user_id === myId;
              const who = last ? (mine ? 'You' : last.sender_name?.split(' ')[0]) : null;
              const hasCall = !!ongoingCalls[chat.id];
              return (
                <button
                  key={chat.id}
                  onClick={() => onSelect(chat)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition',
                    selectedId === chat.id ? 'bg-blue-50 dark:bg-blue-950/50' : 'hover:bg-muted/70 active:bg-muted',
                  )}
                >
                  <UserAvatar name={chat.name} src={chat.avatar_url} seed={chat.id} className="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className={cn('flex-1 truncate text-[15px] text-foreground', chat.unread ? 'font-bold' : 'font-semibold')}>
                        {chat.name}
                      </p>
                      <span className={cn('shrink-0 text-xs', chat.unread ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-muted-foreground')}>
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
                          <>{who && <span className="font-medium">{who}: </span>}{previewText(last.content)}</>
                        ) : (
                          chat.description || 'No messages yet'
                        )}
                      </p>
                      {chat.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                          {chat.unread > 99 ? '99+' : chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
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
    </div>
  );
};

export default ChatList;
