import { useState } from 'react';
import { Loader2, MessageCircle, MoreHorizontal, ShieldAlert, UserMinus, Users } from 'lucide-react';
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
import { SocialService, type CircleEntry } from '@/services/socialService';
import { EmptyState, PeopleCard, PersonRow, SectionLabel, monthYear } from './PersonRow';

interface Props {
    friends: CircleEntry[];
    loading: boolean;
    onChanged: () => void;
    onFindPeople: () => void;
}

/** My friends: message them, or remove / block. */
export const FriendList = ({ friends, loading, onChanged, onFindPeople }: Props) => {
    const navigate = useNavigate();
    const [opening, setOpening] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<{ entry: CircleEntry; kind: 'remove' | 'block' } | null>(null);

    const message = async (entry: CircleEntry) => {
        setOpening(entry.person.id);
        try {
            const chatId = await SocialService.chatWith(entry.person.id);
            navigate(`/group-chats?chat=${chatId}`);
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
                {friends.map((entry) => (
                    <PersonRow key={entry.friendshipId} person={entry.person} subtitle={`Friends since ${monthYear(entry.since)}`}>
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
