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
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
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
    UserCheck
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { GroupChatService, GroupChat, ChatMessage } from "@/services/groupChatService";
import { cn } from "@/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    // Dialog States
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDescription, setNewGroupDescription] = useState("");
    const [creatingGroup, setCreatingGroup] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const presenceChannelRef = useRef<RealtimeChannel | null>(null);

    const iconMap: Record<string, any> = {
        Users,
        Heart,
        Calendar,
        Book,
        MessageCircle,
        UserCheck,
        Music: Users // Fallback
    };

    // Set user presence on mount
    useEffect(() => {
        if (user) {
            GroupChatService.setUserPresence(true);
            presenceChannelRef.current = GroupChatService.subscribeToPresence((presence) => {
                setOnlineUsers(prev => {
                    const newSet = new Set(prev);
                    if (presence.is_online) {
                        newSet.add(presence.user_id);
                    } else {
                        newSet.delete(presence.user_id);
                    }
                    return newSet;
                });
            });
            return () => {
                GroupChatService.setUserPresence(false);
                if (presenceChannelRef.current) GroupChatService.unsubscribe(presenceChannelRef.current);
            };
        }
    }, [user]);

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
                const counts: Record<string, number> = {};
                for (const chat of data) {
                    counts[chat.id] = await GroupChatService.getUnreadCount(chat.id);
                }
                setUnreadCounts(counts);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch messages when chat is selected
    useEffect(() => {
        if (!selectedChat) return;

        const fetchMessages = async () => {
            try {
                const data = await GroupChatService.getChatMessages(selectedChat.id);
                setMessages(data);
                await GroupChatService.markAsRead(selectedChat.id);
                setUnreadCounts(prev => ({ ...prev, [selectedChat.id]: 0 }));
                scrollToBottom();
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        fetchMessages();
        channelRef.current = GroupChatService.subscribeToMessages(selectedChat.id, (message) => {
            setMessages(prev => [...prev, message]);
            scrollToBottom();
            GroupChatService.markAsRead(selectedChat.id);
        });

        return () => {
            if (channelRef.current) GroupChatService.unsubscribe(channelRef.current);
        };
    }, [selectedChat]);

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedChat || sending) return;
        try {
            setSending(true);
            await GroupChatService.sendMessage(selectedChat.id, newMessage);
            setNewMessage("");
            scrollToBottom();
        } catch (error) {
            toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !user) return;
        try {
            setCreatingGroup(true);
            await GroupChatService.createCustomGroup(newGroupName, newGroupDescription, []);
            toast({ title: "Success", description: "Group created successfully!" });
            setShowCreateGroup(false);
            setNewGroupName("");
            setNewGroupDescription("");
            fetchChats();
        } catch (error) {
            toast({ title: "Error", description: "Failed to create group", variant: "destructive" });
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleDeleteGroup = async (chatId: string) => {
        if (!confirm("Are you sure you want to delete this group?")) return;
        try {
            await GroupChatService.deleteGroup(chatId);
            toast({ title: "Success", description: "Group deleted" });
            if (selectedChat?.id === chatId) setSelectedChat(null);
            fetchChats();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete group", variant: "destructive" });
        }
    };

    const handleBackToMenu = () => {
        setSelectedChat(null);
    };

    const getIconComponent = (iconName: string) => iconMap[iconName] || MessageCircle;

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getUserName = (message: ChatMessage) =>
        message.user?.user_metadata?.full_name || message.user?.email?.split('@')[0] || 'Anonymous';

    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Sidebar - Hidden on mobile when chat is selected */}
            <div className={cn(
                "w-full md:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col",
                selectedChat ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/resources')} className="rounded-xl">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="text-2xl font-black tracking-tight">Chats</h1>
                        </div>
                        <Button onClick={() => setShowCreateGroup(true)} size="icon" variant="ghost" className="rounded-full">
                            <Plus className="w-6 h-6 text-indigo-600" />
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search chats..."
                            className="pl-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2">
                        {filteredChats.map((chat) => {
                            const IconComponent = getIconComponent(chat.icon);
                            return (
                                <div key={chat.id} className="relative group/item">
                                    <button
                                        onClick={() => setSelectedChat(chat)}
                                        className={cn(
                                            "w-full p-4 rounded-2xl text-left transition-all mb-2 flex items-center gap-3",
                                            selectedChat?.id === chat.id ? "bg-indigo-50 dark:bg-indigo-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0",
                                            chat.is_custom ? "bg-indigo-500" : "bg-blue-500"
                                        )}>
                                            <IconComponent className="w-6 h-6" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-bold text-slate-900 dark:text-white truncate">{chat.name}</h3>
                                                {unreadCounts[chat.id] > 0 && (
                                                    <Badge className="bg-indigo-600 text-white ml-2 shrink-0">{unreadCounts[chat.id]}</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">{chat.description}</p>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Window - Hidden on mobile when no chat selected */}
            <div className={cn(
                "flex-1 flex-col h-full overflow-hidden",
                !selectedChat ? "hidden md:flex" : "flex"
            )}>
                {selectedChat ? (
                    <>
                        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                {/* Mobile Back Button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden rounded-xl mr-1"
                                    onClick={handleBackToMenu}
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>

                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                                    selectedChat.is_custom ? "bg-indigo-500" : "bg-blue-500"
                                )}>
                                    {React.createElement(getIconComponent(selectedChat.icon), { className: "w-5 h-5" })}
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-900 dark:text-white">{selectedChat.name}</h2>
                                    <p className="text-xs text-slate-500">{selectedChat.description}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="rounded-xl text-slate-600 hover:text-indigo-600">
                                    <Phone className="w-5 h-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="rounded-xl text-slate-600 hover:text-indigo-600">
                                    <Video className="w-5 h-5" />
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-xl">
                                            <MoreVertical className="w-5 h-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            <Users className="w-4 h-4 mr-2" /> View Participants
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteGroup(selectedChat.id)}>
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 min-h-0">
                            <div className="space-y-4 max-w-4xl mx-auto pb-4">
                                {messages.map((message) => {
                                    const isOwn = message.user_id === user?.id;
                                    return (
                                        <div key={message.id} className={cn("flex gap-3 items-start", isOwn && "flex-row-reverse")}>
                                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0", isOwn ? "bg-indigo-600" : "bg-slate-400")}>
                                                {getUserName(message).charAt(0).toUpperCase()}
                                            </div>
                                            <div className={cn("flex-1 max-w-[75%]", isOwn && "items-end")}>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className={cn("text-xs font-bold", isOwn ? "text-indigo-600" : "text-slate-900")}>
                                                        {isOwn ? 'You' : getUserName(message)}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">{formatTime(message.created_at)}</span>
                                                </div>
                                                <div className={cn("rounded-2xl px-4 py-2 inline-block", isOwn ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm")}>
                                                    <p className="text-sm break-words">{message.content}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                            <div className="flex gap-2 max-w-4xl mx-auto">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="Type your message..."
                                    className="flex-1 rounded-xl h-12"
                                    disabled={sending}
                                />
                                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-6 h-12">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                        <div className="text-center">
                            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Select a chat</h3>
                            <p className="text-slate-500">Choose a conversation to start messaging</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Group Dialog */}
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Group Name</Label>
                            <Input
                                placeholder="Ex: Youth Leadership"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="What is this group for?"
                                value={newGroupDescription}
                                onChange={(e) => setNewGroupDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateGroup(false)}>Cancel</Button>
                        <Button onClick={handleCreateGroup} disabled={creatingGroup || !newGroupName.trim()}>
                            {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Group"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
export default GroupChatsPage;
