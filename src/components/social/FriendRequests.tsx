import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, User, Send } from 'lucide-react';
import { SocialService, Profile, Friendship } from '@/services/socialService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const FriendRequests = () => {
    const { user } = useAuth();
    const [incoming, setIncoming] = useState<any[]>([]);
    const [outgoing, setOutgoing] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [inc, out] = await Promise.all([
                SocialService.getIncomingRequests(user.id),
                SocialService.getOutgoingRequests(user.id)
            ]);
            setIncoming(inc);
            setOutgoing(out);
        } catch (error) {
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleRespond = async (friendshipId: string, status: 'accepted' | 'declined') => {
        try {
            await SocialService.updateFriendshipStatus(friendshipId, status);
            toast.success(status === 'accepted' ? 'Friend request accepted!' : 'Request declined');
            fetchData();
        } catch (error) {
            toast.error('Failed to update request');
        }
    };

    const handleCancel = async (friendshipId: string) => {
        try {
            await SocialService.removeFriendship(friendshipId);
            toast.success('Request cancelled');
            fetchData();
        } catch (error) {
            toast.error('Failed to cancel request');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Loading requests...</p>
            </div>
        );
    }

    return (
        <Tabs defaultValue="incoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl mb-6">
                <TabsTrigger value="incoming" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
                    Incoming ({incoming.length})
                </TabsTrigger>
                <TabsTrigger value="outgoing" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all text-xs font-bold uppercase tracking-wider">
                    Sent ({outgoing.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="incoming" className="space-y-4">
                {incoming.length > 0 ? (
                    incoming.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={req.sender?.avatar_url || ''} />
                                    <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-bold text-sm">{req.sender?.full_name}</h4>
                                    <p className="text-[10px] text-slate-500">Wants to be your friend</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleRespond(req.id, 'accepted')} className="bg-green-600 hover:bg-green-700 rounded-xl h-8">
                                    <Check className="w-3 h-3 mr-1" /> Accept
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleRespond(req.id, 'declined')} className="rounded-xl h-8 border-slate-200 dark:border-slate-700">
                                    <X className="w-3 h-3 mr-1" /> Decline
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-400 italic text-sm">No incoming requests</div>
                )}
            </TabsContent>

            <TabsContent value="outgoing" className="space-y-4">
                {outgoing.length > 0 ? (
                    outgoing.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={req.receiver?.avatar_url || ''} />
                                    <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-bold text-sm">{req.receiver?.full_name}</h4>
                                    <p className="text-[10px] text-slate-500">Request pending...</p>
                                </div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleCancel(req.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl h-8">
                                <X className="w-3 h-3 mr-1" /> Cancel
                            </Button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-400 italic text-sm">No sent requests</div>
                )}
            </TabsContent>
        </Tabs>
    );
};
