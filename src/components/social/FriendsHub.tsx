import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSearch } from './UserSearch';
import { FriendRequests } from './FriendRequests';
import { FriendList } from './FriendList';
import { Search, Users, Heart, ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const FriendsHub = () => {
    const [activeTab, setActiveTab] = useState('list');
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 pb-24">
            {/* Elegant Header */}
            <div className="px-6 pt-12 pb-8 sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex -space-x-3 overflow-hidden">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-950 bg-slate-200 dark:bg-slate-800" />
                        ))}
                    </div>
                </div>

                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Social <span className="text-indigo-500">Circle</span></h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Connect with your brothers & sisters</p>
                    </div>
                    <Button
                        onClick={() => setActiveTab('search')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 px-6 gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" /> Add People
                    </Button>
                </div>
            </div>

            <main className="px-5 pt-6 max-w-2xl mx-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-3xl mb-8">
                        <TabsTrigger value="list" className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xl dark:data-[state=active]:shadow-none transition-all text-xs font-black uppercase tracking-widest gap-2">
                            <Users className="w-3.5 h-3.5" /> Friends
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xl dark:data-[state=active]:shadow-none transition-all text-xs font-black uppercase tracking-widest gap-2">
                            <Heart className="w-3.5 h-3.5" /> Requests
                        </TabsTrigger>
                        <TabsTrigger value="search" className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xl dark:data-[state=active]:shadow-none transition-all text-xs font-black uppercase tracking-widest gap-2">
                            <Search className="w-3.5 h-3.5" /> Discover
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
                        <FriendList />
                    </TabsContent>

                    <TabsContent value="requests" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
                        <FriendRequests />
                    </TabsContent>

                    <TabsContent value="search" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
                        <UserSearch />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};
