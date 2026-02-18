import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Users,
    Heart,
    Calendar,
    Book,
    MessageCircle,
    Send,
    ArrowLeft,
    Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GroupChatService, GroupChat, ChatMessage } from "@/services/groupChatService";
import { cn } from "@/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";

const GroupChatsHub = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [chats, setChats] = useState<GroupChat[]>([]);
    const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const iconMap: Record<string, any> = {
        Users,
        Heart,
        Calendar,
        Book,
        MessageCircle
    };

    // Fetch group chats
    useEffect(() => {
        const fetchChats = async () => {
            try {
                setLoading(true);
                const data = await GroupChatService.getGroupChats();
                setChats(data);

                // Fetch unread counts for each chat
                if (user) {
                    const counts: Record<string, number> = {};
                    for (const chat of data) {
                        const count = await GroupChatService.getUnreadCount(chat.id);
                        counts[chat.id] = count;
                    }
                    setUnreadCounts(counts);
                }
            } catch (error) {
                console.error('Error fetching chats:', error);
                toast({
                    title: "Error",
                    description: "Failed to load group chats",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchChats();
    }, [user, toast]);

    // Fetch messages when chat is selected
    useEffect(() => {
        if (!selectedChat) return;

        const fetchMessages = async () => {
            try {
                const data = await GroupChatService.getChatMessages(selectedChat.id);
                setMessages(data);

                // Mark as read
                await GroupChatService.markAsRead(selectedChat.id);
                setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));

                // Scroll to bottom
                scrollToBottom();
            } catch (error) {
                console.error('Error fetching messages:', error);
                toast({
                    title: "Error",
                    description: "Failed to load messages",
                    variant: "destructive"
                });
            }
        };

        fetchMessages();

        // Subscribe to new messages
        channelRef.current = GroupChatService.subscribeToMessages(
            selectedChat.id,
            (message: ChatMessage) => {
                setMessages(prev => [...prev, message]);
                scrollToBottom();

                // Mark as read if chat is currently selected
                GroupChatService.markAsRead(selectedChat.id);
            }
        );

        return () => {
            if (channelRef.current) {
                GroupChatService.unsubscribe(channelRef.current);
            }
        };
    }, [selectedChat, toast]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedChat || sending) return;

        try {
            setSending(true);
            await GroupChatService.sendMessage(selectedChat.id, newMessage);
            setNewMessage("");
            scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
            toast({
                title: "Error",
                description: "Failed to send message",
                variant: "destructive"
            });
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const getIconComponent = (iconName: string) => {
        return iconMap[iconName] || MessageCircle;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getUserName = (message: ChatMessage) => {
        return message.user?.user_metadata?.full_name ||
            message.user?.email?.split('@')[0] ||
            'Anonymous';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    // Chat List View
    if (!selectedChat) {
        return (
            <div className="space-y-4">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Group Chats</h2>
                    <p className="text-sm text-slate-500 mt-1">Join conversations with your church community</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {chats.map((chat) => {
                        const IconComponent = getIconComponent(chat.icon);
                        const unreadCount = unreadCounts[chat.id] || 0;

                        return (
                            <button
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800 rounded-[28px] p-6 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 text-left overflow-hidden ring-1 ring-transparent hover:ring-indigo-500/20 active:scale-[0.98]"
                            >
                                {unreadCount > 0 && (
                                    <div className="absolute top-4 right-4 z-20">
                                        <Badge className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg ring-2 ring-white dark:ring-slate-900 animate-pulse">
                                            {unreadCount}
                                        </Badge>
                                    </div>
                                )}

                                <div className="flex items-center gap-5 relative z-10">
                                    <div className={cn(
                                        "w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6",
                                        chat.category === 'life_group' && "bg-gradient-to-br from-indigo-500 to-blue-600 shadow-indigo-500/20",
                                        chat.category === 'prayer_request' && "bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/20",
                                        chat.category === 'events' && "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20",
                                        chat.category === 'bible_plans' && "bg-gradient-to-br from-orange-500 to-rose-500 shadow-orange-500/20",
                                        chat.category === 'follow_up' && "bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20"
                                    )}>
                                        <IconComponent className="w-7 h-7" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-xl text-slate-900 dark:text-white tracking-tighter mb-1 uppercase">
                                            {chat.name}
                                        </h3>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 line-clamp-1 opacity-80 uppercase tracking-widest">
                                            {chat.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Chat Messages View
    const IconComponent = getIconComponent(selectedChat.icon);

    return (
        <div className="flex flex-col h-[70vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedChat(null)}
                    className="text-white hover:bg-white/20 rounded-xl"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>

                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-black text-white tracking-tight">{selectedChat.name}</h3>
                    <p className="text-xs text-white/70 truncate">{selectedChat.description}</p>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 font-medium">No messages yet</p>
                        <p className="text-xs text-slate-400 mt-1">Be the first to start the conversation!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message) => {
                            const isOwnMessage = message.user_id === user?.id;

                            return (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex gap-3 items-start",
                                        isOwnMessage && "flex-row-reverse"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                                        isOwnMessage ? "bg-indigo-600" : "bg-slate-400"
                                    )}>
                                        {getUserName(message).charAt(0).toUpperCase()}
                                    </div>

                                    <div className={cn(
                                        "flex-1 max-w-[75%]",
                                        isOwnMessage && "items-end"
                                    )}>
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className={cn(
                                                "text-xs font-bold",
                                                isOwnMessage ? "text-indigo-600 text-right" : "text-slate-900 dark:text-white"
                                            )}>
                                                {isOwnMessage ? 'You' : getUserName(message)}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {formatTime(message.created_at)}
                                            </span>
                                        </div>

                                        <div className={cn(
                                            "rounded-2xl px-4 py-2 inline-block",
                                            isOwnMessage
                                                ? "bg-indigo-600 text-white rounded-tr-sm"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm"
                                        )}>
                                            <p className="text-sm break-words">{message.content}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1 rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500"
                        disabled={sending}
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-6"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default GroupChatsHub;
