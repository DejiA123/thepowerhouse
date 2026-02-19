import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Users,
    Heart,
    Calendar,
    Book,
    MessageCircle,
    Send,
    Search,
    Plus,
    Phone,
    Video,
    Loader2,
    ArrowLeft,
    MoreVertical,
    Trash2,
    Settings,
    Edit2,
    UserCheck,
    Mic
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useCall } from "@/contexts/CallContext";
import { GroupChatService, GroupChat, ChatMessage } from "@/services/groupChatService";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RealtimeChannel } from "@supabase/supabase-js";

const GroupChatsPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [chats, setChats] = useState<GroupChat[]>([]);
    const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    // Call State
    const { startCall } = useCall();

    // Dialog & UI States
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const [reactions, setReactions] = useState<Record<string, { emoji: string; user_id: string; id: string }[]>>({});

    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDescription, setNewGroupDescription] = useState("");
    const [creatingGroup, setCreatingGroup] = useState(false);

    const [participants, setParticipants] = useState<any[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [addingMember, setAddingMember] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const iconMap: Record<string, any> = {
        Users, Heart, Calendar, Book, MessageCircle, UserCheck, Music: Users
    };

    // Fetch chats
    useEffect(() => {
        fetchChats();
    }, [user]);

    const fetchChats = async () => {
        try {
            setLoading(true);
            const data = await GroupChatService.getGroupChats();
            setChats(data);
            if (user) {
                const counts = await GroupChatService.getAllUnreadCounts();
                setUnreadCounts(counts);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Global listener for ALL messages to update unread counts and sidebar
    useEffect(() => {
        if (!user) return;

        const globalChannel = GroupChatService.subscribeToAllMessages((message) => {
            // Update unread counts if it's not the selected chat and not our own message
            if (message.user_id !== user.id) {
                if (!selectedChat || selectedChat.id !== message.chat_id) {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [message.chat_id]: (prev[message.chat_id] || 0) + 1
                    }));
                } else {
                    setMessages(prev => {
                        if (prev.some(m => m.id === message.id)) return prev;
                        return [...prev, message];
                    });
                    scrollToBottom();
                }
            }

            // Update chat list preview
            setChats(prevChats => {
                return prevChats.map(chat => {
                    if (chat.id === message.chat_id) {
                        return { ...chat, description: message.content };
                    }
                    return chat;
                });
            });
        });

        const readStatusChannel = GroupChatService.subscribeToReadStatus((payload) => {
            // Clear unread count when chat is read (even on another device)
            setUnreadCounts(prev => ({
                ...prev,
                [payload.chat_id]: 0
            }));
        });

        return () => {
            GroupChatService.unsubscribe(globalChannel);
            GroupChatService.unsubscribe(readStatusChannel);
        };
    }, [user, selectedChat]);

    // Auto-Join & Fetch messages when chat is selected
    useEffect(() => {
        if (!selectedChat) return;

        const initChat = async () => {
            try {
                await GroupChatService.joinChat(selectedChat.id);
            } catch (e) {
                console.error("Auto-join failed", e);
            }

            try {
                const data = await GroupChatService.getChatMessages(selectedChat.id);
                setMessages(data);

                // Fetch reactions for all messages
                if (data.length > 0) {
                    const reactionData = await GroupChatService.getReactions(data.map(m => m.id));
                    setReactions(reactionData);
                }

                // Use the latest message's timestamp to mark as read, or current time
                const lastMsg = data[data.length - 1];
                await GroupChatService.markAsRead(selectedChat.id, lastMsg?.created_at);

                setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));
                // Instant anchor to bottom on load
                scrollToBottom("instant");
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        initChat();

        const dbChannel = GroupChatService.subscribeToMessages(selectedChat.id, (message) => {
            setMessages(prev => {
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
            scrollToBottom();
            GroupChatService.markAsRead(selectedChat.id, message.created_at);
            // Also ensure unread count is cleared locally immediately
            setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));
        });

        const signalChannel = GroupChatService.subscribeToSignals(selectedChat.id, (payload) => {
            if (payload.type === 'new-message') {
                const message = payload.payload;
                setMessages(prev => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
                scrollToBottom();
                GroupChatService.markAsRead(selectedChat.id, message.created_at);
                setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));
            }
        });

        channelRef.current = dbChannel;

        return () => {
            GroupChatService.unsubscribe(dbChannel);
            GroupChatService.unsubscribe(signalChannel);
        };
    }, [selectedChat]);

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        if (behavior === "instant") {
            // Use multiple frames to ensure DOM is fully rendered
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
                });
            });
        } else {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            });
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedChat || sending) return;
        try {
            setSending(true);
            const sentMsg = await GroupChatService.sendMessage(selectedChat.id, newMessage);
            setNewMessage("");

            if (sentMsg) {
                setMessages(prev => {
                    if (prev.some(m => m.id === sentMsg.id)) return prev;
                    return [...prev, sentMsg];
                });
                scrollToBottom();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm("Delete this message?")) return;
        try {
            await GroupChatService.deleteMessage(messageId);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
        }
    };

    const handleToggleReaction = async (messageId: string, emoji: string) => {
        try {
            const added = await GroupChatService.toggleReaction(messageId, emoji);
            setReactions(prev => {
                const current = prev[messageId] || [];
                if (added) {
                    return { ...prev, [messageId]: [...current, { emoji, user_id: user!.id, id: 'temp' }] };
                } else {
                    return { ...prev, [messageId]: current.filter(r => !(r.emoji === emoji && r.user_id === user!.id)) };
                }
            });
        } catch (error) {
            console.error('Error toggling reaction:', error);
        }
    };
    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !user) return;
        try {
            setCreatingGroup(true);
            await GroupChatService.createCustomGroup(newGroupName, newGroupDescription, []);
            setShowCreateGroup(false);
            setNewGroupName(""); setNewGroupDescription("");
            fetchChats();
        } catch (error) {
            toast({ title: "Error", description: "Failed to create group", variant: "destructive" });
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleDeleteGroup = async (chatId: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await GroupChatService.deleteGroup(chatId);
            toast({ title: "Group Deleted" });
            if (selectedChat?.id === chatId) setSelectedChat(null);
            fetchChats();
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
    };

    const fetchParticipants = async () => {
        if (!selectedChat) return;
        const data = await GroupChatService.getParticipants(selectedChat.id);
        setParticipants(data);
    };

    const handleAddMember = async (userId: string) => {
        if (!selectedChat) return;
        await GroupChatService.addMembers(selectedChat.id, [userId]);
        setShowAddMember(false);
        toast({ title: "Member Added" });
    };

    const handleSearchUsers = async (q: string) => {
        setUserSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        setSearchingUsers(true);
        const res = await GroupChatService.searchUsers(q);
        setSearchResults(res);
        setSearchingUsers(false);
    };

    const getIconComponent = (iconName: string) => iconMap[iconName] || MessageCircle;

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const getUserName = (message: ChatMessage) =>
        message.user?.user_metadata?.full_name || message.user?.email?.split('@')[0] || 'Anonymous';

    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden overscroll-none">
            {/* Sidebar */}
            <div className={cn(
                "w-full md:w-[380px] bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col z-30",
                selectedChat ? "hidden md:flex" : "flex"
            )}>
                {/* Sidebar Header */}
                <div className="p-8 pb-4 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate('/resources')}
                                className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Messages</h1>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500/80">Active Community</p>
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowCreateGroup(true)}
                            size="icon"
                            className="rounded-full w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 hover:scale-110 active:scale-90 transition-all"
                        >
                            <Plus className="w-6 h-6" />
                        </Button>
                    </div>

                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors z-10">
                            <Search className="w-full h-full" />
                        </div>
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search chats..."
                            className="pl-12 h-14 rounded-2xl bg-white dark:bg-slate-800/80 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/20 transition-all text-sm font-semibold placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Chat List */}
                <ScrollArea className="flex-1 px-4">
                    <div className="py-4 space-y-2">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-12 gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                                    <MessageCircle className="w-5 h-5 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <p className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.2em]">Synchronizing</p>
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="text-center p-10 bg-white/40 dark:bg-slate-800/20 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">No conversations found</p>
                            </div>
                        ) : (
                            filteredChats.map((chat) => {
                                const IconComponent = getIconComponent(chat.icon);
                                const isActive = selectedChat?.id === chat.id;
                                return (
                                    <button
                                        key={chat.id}
                                        onClick={() => setSelectedChat(chat)}
                                        className={cn(
                                            "w-full p-4 rounded-[24px] text-left transition-all flex items-center gap-4 group relative overflow-hidden",
                                            isActive
                                                ? "bg-white dark:bg-slate-800 shadow-xl shadow-indigo-500/5 ring-1 ring-slate-200/50 dark:ring-slate-700/50 scale-[1.02]"
                                                : "hover:bg-white/80 dark:hover:bg-slate-800/40"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-14 h-14 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg relative z-10 transition-all group-hover:scale-105",
                                            isActive ? "bg-indigo-600 rotate-3" : "bg-slate-200 dark:bg-slate-700"
                                        )}>
                                            {chat.avatar_url ? (
                                                <img src={chat.avatar_url} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <IconComponent className={cn("w-6 h-6", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                                            )}
                                            {unreadCounts[chat.id] > 0 && (
                                                <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900 animate-bounce">
                                                    {unreadCounts[chat.id]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className={cn(
                                                    "text-[15px] font-black tracking-tight truncate",
                                                    isActive ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                                                )}>{chat.name}</h3>
                                            </div>
                                            <p className={cn(
                                                "text-xs truncate font-medium",
                                                isActive ? "text-indigo-600/80 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                                            )}>{chat.description || "Start a conversation"}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {chat.is_custom && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(chat.id); }}
                                                    className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all opacity-0 group-hover:opacity-100 z-20"
                                                    title="Delete group"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {isActive && (
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50" />
                                            )}
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Window */}
            <div className={cn(
                "flex-1 flex flex-col h-full relative overflow-hidden bg-white dark:bg-[#0b141a]",
                selectedChat ? "flex" : "hidden md:flex"
            )}>
                {selectedChat ? (
                    <>
                        {/* Modern Chat Header */}
                        <div className="h-[90px] px-8 flex items-center justify-between shrink-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-5">
                                <Button variant="ghost" size="icon" className="md:hidden rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setSelectedChat(null)}>
                                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                                </Button>
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-xl overflow-hidden ring-4 ring-indigo-500/10">
                                        {selectedChat.avatar_url ? (
                                            <img src={selectedChat.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            React.createElement(getIconComponent(selectedChat.icon), { className: "w-6 h-6 text-white" })
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-[3px] border-white dark:border-slate-900 shadow-sm" />
                                </div>
                                <div className="cursor-pointer group py-1" onClick={() => { fetchParticipants(); setShowParticipants(true); }}>
                                    <h2 className="font-black text-slate-900 dark:text-white leading-none group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-xl mb-1">{selectedChat.name}</h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none">Community Active</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1">
                                    <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 shadow-none transition-all" onClick={() => startCall(selectedChat.id, 'video')}>
                                        <Video className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 shadow-none transition-all" onClick={() => startCall(selectedChat.id, 'audio')}>
                                        <Phone className="w-4 h-4" />
                                    </Button>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-2xl w-10 h-10 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                                            <MoreVertical className="w-5 h-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl p-2 border-slate-100 dark:border-slate-800 shadow-2xl">
                                        <DropdownMenuItem className="rounded-xl" onClick={() => { fetchParticipants(); setShowParticipants(true); }}>
                                            Group Info
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-xl" onClick={() => setShowAddMember(true)}>
                                            Add Members
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-xl" onClick={() => setShowSettings(true)}>
                                            Settings
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="rounded-xl text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30" onClick={() => handleDeleteGroup(selectedChat.id)}>
                                            Exit Group
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Modern Chat Background & Messages */}
                        <div className="flex-1 min-h-0 relative bg-slate-50/30 dark:bg-slate-950/30">
                            {/* Modern Mesh Gradient Background */}
                            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20">
                                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 dark:bg-indigo-900 rounded-full blur-[120px]" />
                                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-200 dark:bg-purple-900 rounded-full blur-[120px]" />
                                <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-blue-100 dark:bg-blue-900 rounded-full blur-[120px]" />
                            </div>

                            <ScrollArea className="h-full absolute inset-0 z-10">
                                <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col justify-end min-h-full">
                                    <div className="flex flex-col-reverse gap-4">
                                        <div ref={messagesEndRef} className="h-0.5 w-full shrink-0" />
                                        {[...messages].reverse().map((message) => {
                                            const isOwn = message.user_id === user?.id;
                                            const msgReactions = reactions[message.id] || [];
                                            // Group reactions by emoji
                                            const reactionGroups: Record<string, string[]> = {};
                                            msgReactions.forEach(r => {
                                                if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = [];
                                                reactionGroups[r.emoji].push(r.user_id);
                                            });

                                            return (
                                                <div
                                                    key={message.id}
                                                    className={cn("flex w-full group/msg", isOwn ? "justify-end" : "justify-start")}
                                                >
                                                    <div className={cn(
                                                        "relative max-w-[85%] md:max-w-[70%] space-y-1",
                                                        isOwn ? "items-end" : "items-start"
                                                    )}>
                                                        {!isOwn && (
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-3 mb-1 block">
                                                                {getUserName(message)}
                                                            </span>
                                                        )}
                                                        <div className={cn(
                                                            "px-6 py-4 shadow-xl overflow-hidden relative backdrop-blur-sm",
                                                            isOwn
                                                                ? "bg-indigo-600 text-white rounded-[28px] rounded-tr-none shadow-indigo-600/20"
                                                                : "bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white rounded-[28px] rounded-tl-none border border-slate-100/50 dark:border-slate-700/50 shadow-slate-200/50"
                                                        )}>
                                                            <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words font-semibold">
                                                                {message.content}
                                                            </div>

                                                            <div className={cn(
                                                                "text-[8px] font-black uppercase tracking-[0.2em] mt-3 flex items-center gap-1.5 opacity-50",
                                                                isOwn ? "justify-end text-white/90" : "justify-start text-slate-400"
                                                            )}>
                                                                {formatTime(message.created_at)}
                                                            </div>
                                                        </div>

                                                        {/* Emoji Reactions Display */}
                                                        {Object.keys(reactionGroups).length > 0 && (
                                                            <div className={cn("flex flex-wrap gap-1 mt-1", isOwn ? "justify-end mr-2" : "ml-2")}>
                                                                {Object.entries(reactionGroups).map(([emoji, users]) => (
                                                                    <button
                                                                        key={emoji}
                                                                        onClick={() => handleToggleReaction(message.id, emoji)}
                                                                        className={cn(
                                                                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border",
                                                                            users.includes(user?.id || '')
                                                                                ? "bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700"
                                                                                : "bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                                        )}
                                                                    >
                                                                        <span>{emoji}</span>
                                                                        <span className="text-[10px] font-bold text-slate-500">{users.length}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Reaction Picker (shown on hover) */}
                                                        <div className={cn(
                                                            "flex items-center gap-0.5 mt-1 opacity-0 group-hover/msg:opacity-100 transition-all",
                                                            isOwn ? "justify-end" : "justify-start"
                                                        )}>
                                                            {['❤️', '👍', '😂', '🙏', '🔥', '😮'].map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => handleToggleReaction(message.id, emoji)}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-125 transition-all text-base"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {isOwn && (
                                                            <button
                                                                onClick={() => handleDeleteMessage(message.id)}
                                                                className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all opacity-0 group-hover/msg:opacity-100"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Modern Floating Chat Input Area */}
                        <div className="px-8 py-6 bg-white dark:bg-[#0b141a] border-t border-slate-100 dark:border-slate-800/50 shrink-0">
                            <div className="max-w-4xl mx-auto flex items-end gap-4">
                                <Button variant="ghost" size="icon" className="rounded-full w-14 h-14 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0 active:scale-90 shadow-sm mb-0.5">
                                    <Plus className="w-6 h-6 text-slate-500" />
                                </Button>
                                <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 rounded-[32px] flex items-end px-6 py-2 groups/input-focus ring-1 ring-slate-200 dark:ring-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all shadow-inner">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Write your message..."
                                        className="flex-1 border-none bg-transparent focus:outline-none py-3 min-h-[50px] max-h-[150px] text-[15px] font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 resize-none scrollbar-none"
                                        disabled={sending}
                                        rows={1}
                                        style={{ height: 'auto' }}
                                        ref={(el) => {
                                            if (el) {
                                                el.style.height = 'auto';
                                                el.style.height = el.scrollHeight + 'px';
                                            }
                                        }}
                                    />
                                </div>
                                {newMessage.trim() ? (
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={sending}
                                        className="rounded-full w-14 h-14 p-0 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 hover:scale-110 active:scale-90 transition-all shrink-0 mb-0.5"
                                    >
                                        <Send className="w-6 h-6 text-white" />
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="icon" className="group rounded-full w-14 h-14 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-all shrink-0 active:scale-90 shadow-sm mb-0.5">
                                        <Mic className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-950 relative">
                        {/* Empty State Mesh Background */}
                        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
                            <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-indigo-200 rounded-full blur-[140px]" />
                        </div>

                        <div className="text-center max-w-sm px-8 relative z-10 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-[32px] bg-indigo-600 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-600/30 ring-4 ring-indigo-500/20">
                                <MessageCircle className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Your Hub</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-[15px] leading-7 font-medium">
                                Connect with your fellowship groups instantly. Stay synced across all your devices with The Powerhouse.
                            </p>
                            <div className="mt-12 flex items-center justify-center gap-3">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-slate-800 border-4 border-white dark:border-slate-950 flex items-center justify-center font-bold text-xs text-indigo-600">
                                            {String.fromCharCode(64 + i)}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">+ 50 Active Members</span>
                            </div>
                            <div className="mt-12 px-6 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-600" />
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5">Community Secured</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogContent className="rounded-3xl p-8 max-w-md border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Create New Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Group Subject</Label>
                            <Input
                                placeholder="What's this group about?"
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none px-6 font-medium focus-visible:ring-indigo-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Description (Optional)</Label>
                            <Textarea
                                placeholder="Briefly describe the purpose..."
                                value={newGroupDescription}
                                onChange={e => setNewGroupDescription(e.target.value)}
                                className="min-h-[120px] rounded-2xl bg-slate-50 dark:bg-slate-900 border-none p-6 font-medium focus-visible:ring-indigo-500/50 resize-none"
                            />
                        </div>
                        <Button
                            onClick={handleCreateGroup}
                            disabled={creatingGroup || !newGroupName.trim()}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            {creatingGroup ? <Loader2 className="animate-spin w-5 h-5" /> : "Create Group"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
                <DialogContent className="rounded-3xl p-0 max-w-md border-none shadow-2xl overflow-hidden">
                    <div className="relative h-48 bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col items-center justify-center p-6 text-white">
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <Button variant="ghost" size="icon" className="rounded-xl bg-white/10 hover:bg-white/20 text-white" onClick={() => setShowParticipants(false)}>
                                <Plus className="w-5 h-5 rotate-45" />
                            </Button>
                        </div>
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[32px] flex items-center justify-center text-white mb-4 shadow-xl ring-4 ring-white/10">
                            {selectedChat?.avatar_url ? (
                                <img src={selectedChat.avatar_url} className="w-full h-full rounded-[32px] object-cover" />
                            ) : (
                                <Users className="w-10 h-10" />
                            )}
                        </div>
                        <h3 className="font-black text-2xl uppercase tracking-tighter">{selectedChat?.name}</h3>
                        <p className="text-xs font-bold text-white/60 uppercase tracking-widest mt-1">{participants.length} Community Members</p>
                    </div>

                    <div className="p-4">
                        <div className="px-4 py-2 flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Member List</span>
                            <Button variant="ghost" className="h-8 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 p-0" onClick={() => { setShowParticipants(false); setShowAddMember(true); }}>
                                Add Member
                            </Button>
                        </div>
                        <ScrollArea className="h-full max-h-[350px]">
                            <div className="space-y-1 px-2 pb-6">
                                {participants.map((p: any) => (
                                    <div key={p.user_id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md ring-1 ring-indigo-500/10">
                                                {(p.user?.user_metadata?.full_name?.[0] || p.user_id?.[0] || "U").toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-bold text-slate-900 dark:text-white leading-none">
                                                    {p.user_id === user?.id ? "You" : (p.user?.user_metadata?.full_name || p.user_id.split('-')[0])}
                                                </p>
                                                {p.presence?.is_online && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                        <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">Active Now</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                <DialogContent className="rounded-3xl p-8 max-w-md border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Add Participant</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <Input
                                placeholder="Search by name or email..."
                                value={userSearchQuery}
                                onChange={e => handleSearchUsers(e.target.value)}
                                className="pl-11 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none font-medium focus-visible:ring-indigo-500/50 shadow-inner"
                            />
                        </div>

                        <ScrollArea className="h-full max-h-[300px]">
                            <div className="space-y-2">
                                {searchingUsers ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500" /></div>
                                ) : searchResults.length === 0 && userSearchQuery.length >= 2 ? (
                                    <p className="text-center text-sm font-medium text-slate-400 py-8 uppercase tracking-widest">No users found</p>
                                ) : searchResults.map(u => (
                                    <div key={u.id} className="flex justify-between items-center p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                                                {((u.full_name || u.email)?.[0] || "?").toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{u.full_name || u.email}</p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate">{u.email}</p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddMember(u.id)}
                                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent className="rounded-3xl p-8 max-w-sm border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Group Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-6 font-medium">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Group Avatar URL</Label>
                            <Input
                                placeholder="https://image-url.com/avatar.jpg"
                                value={selectedChat?.avatar_url || ""}
                                onChange={e => selectedChat && GroupChatService.updateGroupInfo(selectedChat.id, { avatar_url: e.target.value })}
                                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none px-6 focus-visible:ring-indigo-500/50"
                            />
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 leading-relaxed">Changes to group settings are applied instantly to all community members.</p>
                        </div>
                        <Button onClick={() => setShowSettings(false)} className="w-full h-14 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 rounded-2xl font-bold shadow-lg transition-all">
                            Done
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GroupChatsPage;
