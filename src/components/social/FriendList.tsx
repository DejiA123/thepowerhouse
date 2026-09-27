import { useState } from 'react';
import { Loader2, MessageCircle, MoreHorizontal, Phone, ShieldAlert, UserMinus, Users, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { useCall } from '@/contexts/CallContext';
import { SocialService, type CircleEntry, type PrivateChat } from '@/services/socialService';
import { EmptyState, PeopleCard, PersonRow, SectionLabel, monthYear } from './PersonRow';

interface Props {
    friends: CircleEntry[];
    loading: boolean;
    onChanged: () => void;
    onFindPeople: () => void;
}

/** My friends: message or call them, or remove / block. */
export const FriendList = ({ friends, loading, onChanged, onFindPeople }: Props) => {
    const navigate = useNavigate();
    const { startCall } = useCall();
    const [opening, setOpening] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<{ entry: CircleEntry; kind: 'remove' | 'block' } | null>(null);

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

    // Rings them like any call in the app (they get a call notification too)
    const call = async (entry: CircleEntry, type: 'audio' | 'video') => {
        try {
            const chat = await chatFor(entry);
            if (!entry.chat) onChanged();
            await startCall({ id: chat.id, name: chat.name }, type);
        } catch (e) {
            appAlert("Couldn't start the call", (e as Error).message, 'error');
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
                {friends.map((entry) => (
                    <PersonRow key={entry.friendshipId} person={entry.person} subtitle={`Friends since ${monthYear(entry.since)}`}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    aria-label={`Call ${entry.person.name}`}
                                    className="h-10 w-10 rounded-full bg-emerald-50 p-0 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                                >
                                    <Phone className="h-[18px] w-[18px]" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
                                <DropdownMenuItem onClick={() => call(entry, 'audio')} className="gap-2 rounded-xl p-2.5">
                                    <Phone className="h-4 w-4" /> Voice call
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => call(entry, 'video')} className="gap-2 rounded-xl p-2.5">
                                    <Video className="h-4 w-4" /> Video call
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            size="sm"
                            onClick={() => message(entry)}
                            disabled={opening === entry.person.id}
                            aria-label={`Message ${entry.person.name}`}
                            className="h-10 w-10 rounded-full bg-indigo-50 p-0 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-200"
                        >
                            {opening === entry.person.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-[18px] w-[18px]" />}
                        </Button>
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
                ))}
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
