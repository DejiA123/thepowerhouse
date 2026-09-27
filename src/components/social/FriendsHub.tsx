import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Heart, Search, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';
import { SocialService, type Circle } from '@/services/socialService';
import { UserSearch } from './UserSearch';
import { FriendRequests } from './FriendRequests';
import { FriendList } from './FriendList';

type Tab = 'friends' | 'requests' | 'discover';
const TABS: Tab[] = ['friends', 'requests', 'discover'];

const firstTab = (circle: Circle | null): Tab | null =>
    !circle ? null : circle.incoming.length ? 'requests' : circle.friends.length || circle.outgoing.length ? 'friends' : 'discover';

export const FriendsHub = () => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [circle, setCircle] = useState<Circle | null>(() => SocialService.savedCircle());
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setCircle(await SocialService.circle());
        } catch {
            /* keep what's on screen (e.g. offline) */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const friends = circle?.friends ?? [];
    const incoming = circle?.incoming ?? [];
    const outgoing = circle?.outgoing ?? [];

    // The tab is in the address (?tab=requests) so notification taps and Back work.
    // With no tab chosen, it's picked once on opening: requests if someone's
    // waiting, Discover if the circle is empty (and it doesn't jump around after).
    const [opening, setOpening] = useState<Tab | null>(() => firstTab(circle));
    useEffect(() => {
        if (!opening && circle) setOpening(firstTab(circle));
    }, [circle, opening]);
    const chosen = params.get('tab') as Tab | null;
    const tab: Tab = chosen && TABS.includes(chosen) ? chosen : opening ?? 'friends';
    const show = (next: Tab) => setParams((p) => {
        const out = new URLSearchParams(p);
        out.set('tab', next);
        return out;
    }, { replace: true });

    const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number }[] = [
        { id: 'friends', label: 'Friends', icon: Users },
        { id: 'requests', label: 'Requests', icon: Heart, badge: incoming.length },
        { id: 'discover', label: 'Discover', icon: Search },
    ];

    return (
        <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
            <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/85 px-5 pb-4 pt-4 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/85">
                <div className="mx-auto max-w-2xl">
                    <div className="mb-3 flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            aria-label="Back"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-600 transition active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        {friends.length > 0 && (
                            <div className="flex -space-x-2.5">
                                {friends.slice(0, 4).map((f) => (
                                    <UserAvatar key={f.person.id} name={f.person.name} src={f.person.avatar} seed={f.person.id} className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-950" />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-[28px] font-black leading-tight tracking-tight text-slate-900 dark:text-white">
                                Social <span className="text-indigo-500">Circle</span>
                            </h1>
                            <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">Connect with your brothers &amp; sisters</p>
                        </div>
                        {tab !== 'discover' && (
                            <button
                                onClick={() => show('discover')}
                                className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition active:scale-95"
                            >
                                <UserPlus className="h-4 w-4" /> Add people
                            </button>
                        )}
                    </div>

                    <div role="tablist" className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
                        {tabs.map(({ id, label, icon: Icon, badge }) => (
                            <button
                                key={id}
                                role="tab"
                                aria-selected={tab === id}
                                onClick={() => show(id)}
                                className={cn(
                                    'relative flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition',
                                    tab === id
                                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                                        : 'text-slate-500 dark:text-slate-400',
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                                {!!badge && (
                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                                        {badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-2xl px-4 pt-5">
                {tab === 'friends' && (
                    <FriendList friends={friends} loading={loading} onChanged={load} onFindPeople={() => show('discover')} />
                )}
                {tab === 'requests' && (
                    <FriendRequests incoming={incoming} outgoing={outgoing} loading={loading} onChanged={load} onFindPeople={() => show('discover')} />
                )}
                {tab === 'discover' && <UserSearch onChanged={load} />}
            </main>
        </div>
    );
};
