import { useState } from 'react';
import { Check, Heart, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appAlert } from '@/lib/appAlert';
import { SocialService, type CircleEntry } from '@/services/socialService';
import { EmptyState, PeopleCard, PersonRow, SectionLabel } from './PersonRow';

interface Props {
    incoming: CircleEntry[];
    outgoing: CircleEntry[];
    loading: boolean;
    onChanged: () => void;
    onFindPeople: () => void;
}

const ago = (iso: string) => {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 7 ? `${days} days ago` : new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** Requests waiting for me, and the ones I've sent. */
export const FriendRequests = ({ incoming, outgoing, loading, onChanged, onFindPeople }: Props) => {
    const [busy, setBusy] = useState<string | null>(null);

    const run = async (id: string, work: () => Promise<unknown>) => {
        setBusy(id);
        try {
            await work();
            onChanged();
        } catch (e) {
            appAlert("That didn't go through", (e as Error).message, 'error');
        } finally {
            setBusy(null);
        }
    };

    if (loading && incoming.length === 0 && outgoing.length === 0) {
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (incoming.length === 0 && outgoing.length === 0) {
        return (
            <EmptyState
                icon={<Heart className="h-7 w-7" />}
                title="No requests right now"
                message="When someone wants to add you, it shows up here. You'll get a notification too."
                action={
                    <Button onClick={onFindPeople} variant="outline" className="h-11 rounded-full px-6 font-semibold">
                        Find people
                    </Button>
                }
            />
        );
    }

    const spinner = <Loader2 className="h-4 w-4 animate-spin" />;

    return (
        <div className="space-y-6">
            {incoming.length > 0 && (
                <section>
                    <SectionLabel>Waiting for you</SectionLabel>
                    <PeopleCard>
                        {incoming.map((req) => (
                            <PersonRow
                                key={req.friendshipId}
                                person={req.person}
                                subtitle={`Wants to add you · ${ago(req.since)}`}
                                below={
                                    <>
                                        <Button
                                            size="sm"
                                            disabled={busy === req.friendshipId}
                                            onClick={() => run(req.friendshipId, () => SocialService.accept(req.friendshipId))}
                                            className="h-9 flex-1 rounded-full bg-emerald-600 text-[13px] font-semibold text-white hover:bg-emerald-700"
                                        >
                                            {busy === req.friendshipId ? spinner : <><Check className="mr-1 h-4 w-4" /> Accept</>}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={busy === req.friendshipId}
                                            onClick={() => run(req.friendshipId, () => SocialService.decline(req.friendshipId))}
                                            className="h-9 flex-1 rounded-full text-[13px] font-semibold"
                                        >
                                            <X className="mr-1 h-4 w-4" /> Decline
                                        </Button>
                                    </>
                                }
                            />
                        ))}
                    </PeopleCard>
                </section>
            )}

            {outgoing.length > 0 && (
                <section>
                    <SectionLabel>Sent</SectionLabel>
                    <PeopleCard>
                        {outgoing.map((req) => (
                            <PersonRow key={req.friendshipId} person={req.person} subtitle={`Sent ${ago(req.since)}`}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy === req.friendshipId}
                                    onClick={() => run(req.friendshipId, () => SocialService.remove(req.friendshipId))}
                                    className="h-9 rounded-full px-3.5 text-[13px] font-semibold"
                                >
                                    {busy === req.friendshipId ? spinner : 'Cancel'}
                                </Button>
                            </PersonRow>
                        ))}
                    </PeopleCard>
                </section>
            )}
        </div>
    );
};
