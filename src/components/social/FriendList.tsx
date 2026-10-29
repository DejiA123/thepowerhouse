import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MoreHorizontal, ShieldAlert, UserMinus, Users } from 'lucide-react';
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
import { formatListTime, previewText } from '@/components/messages/chatUtils';
import { EmptyState, PeopleCard, PersonRow, SectionLabel, monthYear } from './PersonRow';

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
    const [chats, setChats] = useState<Record<string, ChatSummary>>({});

    // Our private chats' latest message and unread count, kept live
    const chatIds = friends.flatMap((f) => (f.chat ? [f.chat.id] : [])).join(',');
    const loadChats = useCallback(async () => {
        if (!chatIds) return;
        try {
            const list = await GroupChatService.getMyChats(chatIds.split(','));
            setChats(Object.fromEntries(list.map((c) => [c.id, c])));
        } catch {
            /* keep what's on screen (e.g. offline) */
        }
    }, [chatIds]);

    useEffect(() => {
        loadChats();
        const onVisible = () => document.visibilityState === 'visible' && loadChats();
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [loadChats]);

    useEffect(() => {
        if (!user || !chatIds) return;
        const channel = GroupChatService.subscribeToAllMessages((message) => {
            setChats((prev) => {
                const chat = prev[message.chat_id];
                if (!chat) return prev;
                return {
                    ...prev,
                    [chat.id]: {
                        ...chat,
                        last_message: { content: message.content, created_at: message.created_at, user_id: message.user_id },
                        unread: message.user_id !== user.id ? chat.unread + 1 : chat.unread,
                    },
                };
            });
        });
        return () => GroupChatService.unsubscribe(channel);
    }, [user, chatIds]);

    const lastAt = useCallback((entry: CircleEntry) => {
        const at = entry.chat ? chats[entry.chat.id]?.last_message?.created_at : null;
        return at ? new Date(at).getTime() : 0;
    }, [chats]);
    const sorted = useMemo(() => [...friends].sort((a, b) => lastAt(b) - lastAt(a)), [friends, lastAt]);

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

    if (loading && friends.length === 0) {
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
            <SectionLabel>{friends.length === 1 ? '1 friend' : `${friends.length} friends`}</SectionLabel>
            <PeopleCard>
                {sorted.map((entry) => {
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
                                    {last.user_id === user?.id && 'You: '}{previewText(last.content)}
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
