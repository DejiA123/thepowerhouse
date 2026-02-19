import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Check, X, Loader2, User } from 'lucide-react';
import { SocialService, Profile, Friendship } from '@/services/socialService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export const UserSearch = () => {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, Friendship | null>>({});

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query || query.length < 2 || !user) return;

        setLoading(true);
        try {
            const users = await SocialService.searchUsers(query, user.id);
            setResults(users);

            // Fetch friendship status for all results
            const statuses: Record<string, Friendship | null> = {};
            await Promise.all(users.map(async (u) => {
                statuses[u.id] = await SocialService.getFriendshipStatus(user.id, u.id);
            }));
            setFriendshipStatuses(statuses);
        } catch (error) {
            toast.error('Failed to search users');
        } finally {
            setLoading(false);
        }
    };

    const sendRequest = async (targetUserId: string) => {
        if (!user) return;
        try {
            const request = await SocialService.sendFriendRequest(user.id, targetUserId);
            setFriendshipStatuses(prev => ({ ...prev, [targetUserId]: request }));
            toast.success('Friend request sent!');
        } catch (error) {
            toast.error('Failed to send friend request');
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Search by name or email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 h-12 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-indigo-500"
                />
            </form>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-sm font-medium text-slate-500">Finding people...</p>
                    </div>
                ) : results.length > 0 ? (
                    results.map((profile) => {
                        const status = friendshipStatuses[profile.id];
                        const isPending = status?.status === 'pending';
                        const isAccepted = status?.status === 'accepted';
                        const isSentByMe = status?.user_id === user?.id;

                        return (
                            <div
                                key={profile.id}
                                className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-all hover:shadow-md"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12 border-2 border-indigo-500/10">
                                        <AvatarImage src={profile.avatar_url || ''} />
                                        <AvatarFallback className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                            <User className="w-6 h-6" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{profile.full_name}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">Member</p>
                                    </div>
                                </div>

                                <div>
                                    {isAccepted ? (
                                        <Button disabled variant="outline" className="rounded-xl gap-2 text-green-600 border-green-100 bg-green-50 dark:bg-green-900/20 dark:border-green-900/30">
                                            <Check className="w-4 h-4" /> Friends
                                        </Button>
                                    ) : isPending ? (
                                        <Button disabled variant="secondary" className="rounded-xl gap-2 italic">
                                            {isSentByMe ? 'Request Sent' : 'Pending Request'}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => sendRequest(profile.id)}
                                            className="rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                                        >
                                            <UserPlus className="w-4 h-4" /> Add Friend
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : query.length >= 2 && !loading ? (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-sm font-medium text-slate-500">No users found matching "{query}"</p>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <User className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-400">Search for people to add them as friends</p>
                    </div>
                )}
            </div>
        </div>
    );
};
