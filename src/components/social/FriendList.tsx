import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { User, MessageCircle, MoreHorizontal, UserMinus, ShieldAlert, Loader2 } from 'lucide-react';
import { SocialService } from '@/services/socialService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';

export const FriendList = () => {
    const { user } = useAuth();
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchFriends = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await SocialService.getFriends(user.id);
            setFriends(data);
        } catch (error) {
            toast.error('Failed to load friends');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFriends();
    }, [user]);

    const handleUnfriend = async (friendshipId: string) => {
        try {
            await SocialService.removeFriendship(friendshipId);
            toast.success('Removed from friends');
            fetchFriends();
        } catch (error) {
            toast.error('Failed to remove friend');
        }
    };

    const handleBlock = async (friendshipId: string) => {
        try {
            await SocialService.updateFriendshipStatus(friendshipId, 'blocked');
            toast.success('User blocked');
            fetchFriends();
        } catch (error) {
            toast.error('Failed to block user');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Loading friends...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {friends.length > 0 ? (
                friends.map((item) => (
                    <div
                        key={item.friendshipId}
                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 transition-all hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12 border-2 border-indigo-500/10">
                                <AvatarImage src={item.friend?.avatar_url || ''} />
                                <AvatarFallback className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                    <User className="w-6 h-6" />
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-100">{item.friend?.full_name}</h4>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">Online</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate('/social-media')} // Redirect to social media to chat/interact
                                className="rounded-xl h-9 w-9 p-0 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
                            >
                                <MessageCircle className="w-4 h-4 text-indigo-500" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 dark:border-slate-800 p-2 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 w-48">
                                    <DropdownMenuItem onClick={() => handleUnfriend(item.friendshipId)} className="text-red-500 focus:text-red-500 rounded-xl gap-2 cursor-pointer p-3">
                                        <UserMinus className="w-4 h-4" /> Unfriend
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBlock(item.friendshipId)} className="text-slate-500 focus:text-slate-500 rounded-xl gap-2 cursor-pointer p-3">
                                        <ShieldAlert className="w-4 h-4" /> Block User
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <User className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">You haven't added any friends yet</p>
                    <p className="text-[10px] text-slate-500 mt-1">Start searching and adding people!</p>
                </div>
            )}
        </div>
    );
};
