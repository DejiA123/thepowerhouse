import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MoreHorizontal, Search, ShieldAlert, UserMinus, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { appAlert } from '@/lib/appAlert';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineUsers } from '@/contexts/PresenceContext';
import { GroupChatService, type ChatSummary } from '@/services/groupChatService';
import { SocialService, type CircleEntry, type PrivateChat } from '@/services/socialService';
import { formatListTime, isAnsweredCall, parseCall, previewText } from '@/components/messages/chatUtils';
import { EmptyState, PeopleCard, PersonRow, SectionLabel, monthYear } from './PersonRow';

const chatsKey = (userId: string) => `friend_chats_v1_${userId}`;

/** Our chats' latest messages as last seen on this device, so the list opens in its real order. */
const savedChats = (userId?: string): Record<string, ChatSummary> | null => {
    if (!userId) return null;
    try {
        return JSON.parse(localStorage.getItem(chatsKey(userId)) || 'null');
    } catch {
        return null;
    }
};

type Filter = 'all' | 'unread' | 'online';

interface Props {
    friends: CircleEntry[];
    loading: boolean;
    onChanged: () => void;
    onFindPeople: () => void;
}

/**
 * My friends, like a chat list: tap someone to message them, with your latest
 * message and how many are unread, most recent first. Remove / block under ⋯.
 */
export const FriendList = ({ friends, loading, onChanged, onFindPeople }: Props) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const onlineIds = useOnlineUsers();
    const [opening, setOpening] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<{ entry: CircleEntry; kind: 'remove' | 'block' } | null>(null);
    const [saved] = useState(() => savedChats(user?.id));
    const [chats, setChats] = useState<Record<string, ChatSummary>>(saved ?? {});
    const [filter, setFilter] = useState<Filter>('all');
    const [query, setQuery] = useState('');
    // Until we know who we last spoke to, the order isn't known: wait rather than reshuffle
    const [chatsKnown, setChatsKnown] = useState(!!saved);

    // Our private chats' latest message and unread count, kept live
    const chatIds = friends.flatMap((f) => (f.chat ? [f.chat.id] : [])).join(',');
    const loadChats = useCallback(async () => {
        if (!chatIds) return;
        try {
            const list = await GroupChatService.getMyChats(chatIds.split(','));
            setChats(Object.fromEntries(list.map((c) => [c.id, c])));
        } catch {
            /* keep what's on screen (e.g. offline) */
        } finally {
            setChatsKnown(true);
        }
    }, [chatIds]);

    useEffect(() => {
        if (!user || !chatsKnown) return;
        try {
            localStorage.setItem(chatsKey(user.id), JSON.stringify(chats));
        } catch {
            /* storage full */
        }
    }, [user, chats, chatsKnown]);

    useEffect(() => {
        loadChats();
        const onVisible = () => document.visibilityState === 'visible' && loadChats();
        document.addEventListener('visibilitychange', onVisible);
        // Back online after a drop: fetch what was missed
        window.addEventListener('app:resync', loadChats);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('app:resync', loadChats);
        };
    }, [loadChats]);

    useEffect(() => {
        if (!user || !chatIds) return;
        return GroupChatService.watchChats(chatIds.split(','), {
            message: (message) => {
                setChats((prev) => {
                    const chat = prev[message.chat_id];
                    if (!chat) return prev;
                    return {
                        ...prev,
                        [chat.id]: {
                            ...chat,
                            last_message: { content: message.content, created_at: message.created_at, user_id: message.user_id },
                            unread: message.user_id !== user.id && !isAnsweredCall(message.content) ? chat.unread + 1 : chat.unread,
                        },
                    };
                });
            },
            // Someone deleted a message: the latest line may have changed
            deleted: () => loadChats(),
        });
    }, [user, chatIds, loadChats]);

    const lastAt = useCallback((entry: CircleEntry) => {
        const at = entry.chat ? chats[entry.chat.id]?.last_message?.created_at : null;
        return at ? new Date(at).getTime() : 0;
    }, [chats]);
    const sorted = useMemo(() => [...friends].sort((a, b) => lastAt(b) - lastAt(a)), [friends, lastAt]);
    const unreadOf = (entry: CircleEntry) => (entry.chat ? chats[entry.chat.id]?.unread ?? 0 : 0);
    const unreadCount = friends.filter((f) => unreadOf(f) > 0).length;
    const onlineCount = friends.filter((f) => onlineIds.has(f.person.id)).length;
    const q = query.trim().toLowerCase();
    const shown = sorted.filter((entry) => {
        if (filter === 'unread' && unreadOf(entry) === 0) return false;
        if (filter === 'online' && !onlineIds.has(entry.person.id)) return false;
        return !q || entry.person.name.toLowerCase().includes(q);
    });
    const filters: { id: Filter; label: string; count?: number }[] = [
        { id: 'all', label: 'All' },
        { id: 'unread', label: 'Unread', count: unreadCount },
        { id: 'online', label: 'Online', count: onlineCount },
    ];

    /** Our private chat (the one from the list, or made now the first time) */
    const chatFor = async (entry: CircleEntry): Promise<PrivateChat> => entry.chat ?? (await SocialService.chatWith(entry.person.id));

    const message = async (entry: CircleEntry) => {
        setOpening(entry.person.id);
        try {
            const chat = await chatFor(entry);
            navigate(`/group-chats?chat=${chat.id}`);
        } catch (e) {
            appAlert("Couldn't open the chat", (e as Error).message, 'error');
        } finally {
            setOpening(null);
        }
    };

    const confirmed = async () => {
        if (!confirm) return;
        const { entry, kind } = confirm;
        setConfirm(null);
        try {
            if (kind === 'remove') await SocialService.remove(entry.friendshipId);
            else await SocialService.block(entry.person.id);
            onChanged();
        } catch (e) {
            appAlert("That didn't go through", (e as Error).message, 'error');
        }
    };

    if ((loading && friends.length === 0) || (chatIds && !chatsKnown)) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (friends.length === 0) {
        return (
            <EmptyState
                icon={<Users className="h-7 w-7" />}
                title="Your circle is empty"
                message="Find brothers and sisters from church and add them. Once they accept, you can message them here."
                action={
                    <Button onClick={onFindPeople} className="h-11 rounded-full bg-indigo-600 px-6 font-semibold text-white hover:bg-indigo-700">
                        Find people
                    </Button>
                }
            />
        );
    }

    return (
        <>
            <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search friends"
                    aria-label="Search friends"
                    className="h-11 w-full rounded-2xl bg-slate-100 pl-10 pr-10 text-[16px] text-foreground outline-none ring-indigo-500/30 placeholder:text-slate-500 focus:ring-2 dark:bg-slate-800/70 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                    <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Clear search">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
            <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Show">
                {filters.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        aria-pressed={filter === f.id}
                        className={cn(
                            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition active:scale-95',
                            filter === f.id
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/25 dark:text-indigo-100'
                                : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300',
                        )}
                    >
                        {f.label}
                        {!!f.count && <span className={cn('text-xs', filter === f.id ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-500')}>{f.count}</span>}
                    </button>
                ))}
            </div>
            <SectionLabel>
                {filter === 'all' && !q
                    ? friends.length === 1 ? '1 friend' : `${friends.length} friends`
                    : `${shown.length} of ${friends.length} friends`}
            </SectionLabel>
            {shown.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
                    {q ? `No friends called “${query.trim()}”.` : filter === 'unread' ? 'No unread messages. You’re all caught up.' : 'None of your friends are online right now.'}
                </p>
            ) : (
            <PeopleCard>
                {shown.map((entry) => {
                    const summary = entry.chat ? chats[entry.chat.id] : undefined;
                    const last = summary?.last_message;
                    const unread = summary?.unread ?? 0;
                    return (
                        <PersonRow
                            key={entry.friendshipId}
                            person={entry.person}
                            online={onlineIds.has(entry.person.id)}
                            subtitle={last ? (
                                <span className={cn(unread > 0 && 'font-medium text-foreground')}>
                                    {last.user_id === user?.id && !parseCall(last.content) && 'You: '}{previewText(last.content, last.user_id === user?.id)}
                                </span>
                            ) : `Friends since ${monthYear(entry.since)}`}
                            onOpen={() => opening !== entry.person.id && message(entry)}
                            openLabel={`Message ${entry.person.name}`}
                        >
                            <div className="flex flex-col items-end gap-1">
                                {opening === entry.person.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <>
                                        {last && (
                                            <span className={cn('text-xs', unread > 0 ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-muted-foreground')}>
                                                {formatListTime(last.created_at)}
                                            </span>
                                        )}
                                        {unread > 0 && (
                                            <span
                                                aria-label={`${unread} unread`}
                                                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white"
                                            >
                                                {unread > 99 ? '99+' : unread}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-9 w-9 rounded-full p-0" aria-label={`More for ${entry.person.name}`}>
                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
                                    <DropdownMenuItem onClick={() => setConfirm({ entry, kind: 'remove' })} className="gap-2 rounded-xl p-2.5">
                                        <UserMinus className="h-4 w-4" /> Remove friend
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setConfirm({ entry, kind: 'block' })} className="gap-2 rounded-xl p-2.5 text-red-600 focus:text-red-600">
                                        <ShieldAlert className="h-4 w-4" /> Block
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </PersonRow>
                    );
                })}
            </PeopleCard>
            )}

            <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirm?.kind === 'block' ? `Block ${confirm.entry.person.name}?` : `Remove ${confirm?.entry.person.name}?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm?.kind === 'block'
                                ? "You'll no longer see each other in Social Circle, and they can't send you requests."
                                : "They'll be removed from your circle. You can add each other again later."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmed} className="rounded-full bg-red-600 text-white hover:bg-red-700">
                            {confirm?.kind === 'block' ? 'Block' : 'Remove'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
