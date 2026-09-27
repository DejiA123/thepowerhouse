import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Search, UserPlus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { appAlert } from '@/lib/appAlert';
import { SocialService, type DiscoverPage, type Person, type Relation } from '@/services/socialService';
import { EmptyState, PeopleCard, PersonRow, SectionLabel } from './PersonRow';

type Found = DiscoverPage['people'][number];

/**
 * Everyone in the app, A–Z, narrowed down as you type a name (no need to
 * press search). Add, accept or cancel right from the list.
 */
export const UserSearch = ({ onChanged }: { onChanged: () => void }) => {
    const [query, setQuery] = useState('');
    const [people, setPeople] = useState<Found[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [nextOffset, setNextOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const latest = useRef(0);
    const typed = query.trim();

    // Search as you type: a short pause so every letter doesn't start a new search
    useEffect(() => {
        const id = ++latest.current;
        setLoading(true);
        setError(null);
        const t = setTimeout(async () => {
            try {
                const page = await SocialService.discover(typed);
                if (id !== latest.current) return;
                setPeople(page.people);
                setHasMore(page.hasMore);
                setNextOffset(page.nextOffset);
            } catch (e) {
                if (id === latest.current) setError((e as Error).message);
            } finally {
                if (id === latest.current) setLoading(false);
            }
        }, typed ? 250 : 0);
        return () => clearTimeout(t);
    }, [typed]);

    const more = async () => {
        setLoadingMore(true);
        try {
            const page = await SocialService.discover(typed, nextOffset);
            setPeople((list) => [...list, ...page.people.filter((p) => !list.some((x) => x.person.id === p.person.id))]);
            setHasMore(page.hasMore);
            setNextOffset(page.nextOffset);
        } catch (e) {
            appAlert("Couldn't load more people", (e as Error).message, 'error');
        } finally {
            setLoadingMore(false);
        }
    };

    const setRelation = (personId: string, relation: Relation) =>
        setPeople((list) => list.map((p) => (p.person.id === personId ? { ...p, relation } : p)));

    const act = async (person: Person, relation: Relation) => {
        setBusy(person.id);
        try {
            if (relation.kind === 'none') setRelation(person.id, await SocialService.request(person.id));
            else if (relation.kind === 'received') setRelation(person.id, await SocialService.accept(relation.friendshipId));
            else if (relation.kind === 'sent') {
                await SocialService.remove(relation.friendshipId);
                setRelation(person.id, { kind: 'none' });
            }
            onChanged();
        } catch (e) {
            appAlert("That didn't go through", (e as Error).message, 'error');
        } finally {
            setBusy(null);
        }
    };

    const action = ({ person, relation }: Found) => {
        const working = busy === person.id;
        const spinner = <Loader2 className="h-4 w-4 animate-spin" />;
        switch (relation.kind) {
            case 'friends':
                return (
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[13px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Check className="h-4 w-4" /> Friends
                    </span>
                );
            case 'sent':
                return (
                    <Button variant="outline" size="sm" disabled={working} onClick={() => act(person, relation)} className="h-9 rounded-full px-3.5 text-[13px] font-semibold" aria-label={`Cancel request to ${person.name}`}>
                        {working ? spinner : 'Requested'}
                    </Button>
                );
            case 'received':
                return (
                    <Button size="sm" disabled={working} onClick={() => act(person, relation)} className="h-9 rounded-full bg-emerald-600 px-3.5 text-[13px] font-semibold text-white hover:bg-emerald-700">
                        {working ? spinner : <><Check className="mr-1 h-4 w-4" /> Accept</>}
                    </Button>
                );
            default:
                return (
                    <Button size="sm" disabled={working} onClick={() => act(person, relation)} className="h-9 rounded-full bg-indigo-600 px-3.5 text-[13px] font-semibold text-white hover:bg-indigo-700">
                        {working ? spinner : <><UserPlus className="mr-1 h-4 w-4" /> Add</>}
                    </Button>
                );
        }
    };

    const subtitle = ({ relation }: Found) =>
        relation.kind === 'received' ? 'Wants to add you' : relation.kind === 'sent' ? 'Request sent' : relation.kind === 'friends' ? 'In your circle' : 'Member';

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                    enterKeyHint="search"
                    autoComplete="off"
                    autoCorrect="off"
                    placeholder="Search people by name"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-11 text-[16px] text-foreground outline-none ring-indigo-500/30 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 [&::-webkit-search-cancel-button]:hidden"
                />
                {loading && typed ? (
                    <Loader2 className="pointer-events-none absolute right-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 animate-spin text-slate-400" />
                ) : query ? (
                    <button onClick={() => setQuery('')} aria-label="Clear" className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="h-4 w-4" />
                    </button>
                ) : null}
            </div>

            {error ? (
                <EmptyState icon={<Users className="h-7 w-7" />} title="Couldn't load people" message={error} />
            ) : loading && people.length === 0 ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                </div>
            ) : people.length === 0 ? (
                <EmptyState
                    icon={<Search className="h-7 w-7" />}
                    title={typed ? `No one called "${typed}"` : 'No one here yet'}
                    message={typed ? 'Check the spelling, or try just their first or last name.' : 'When people join the app, they appear here.'}
                />
            ) : (
                <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                    <SectionLabel>{typed ? 'People' : 'Everyone in The Power House'}</SectionLabel>
                    <PeopleCard>
                        {people.map((found) => (
                            <PersonRow key={found.person.id} person={found.person} subtitle={subtitle(found)}>
                                {action(found)}
                            </PersonRow>
                        ))}
                    </PeopleCard>
                    {hasMore && (
                        <Button variant="ghost" onClick={more} disabled={loadingMore} className="mt-3 h-11 w-full rounded-2xl font-semibold text-indigo-600 dark:text-indigo-300">
                            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Show more people'}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
