import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface GroupChat {
    id: string;
    name: string;
    description: string;
    category: string | null;
    icon: string;
    is_active: boolean;
    is_custom: boolean;
    avatar_url: string | null;
    created_at: string;
    created_by: string;
    created_by_user: string | null;
}

export interface ChatMessage {
    id: string;
    chat_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    user?: {
        id: string;
        email?: string;
        user_metadata?: {
            full_name?: string;
            avatar_url?: string;
        };
    };
}

export interface ChatParticipant {
    id: string;
    chat_id: string;
    user_id: string;
    joined_at: string;
    last_read_at: string;
}

export interface UserPresence {
    user_id: string;
    is_online: boolean;
    last_seen: string;
    status_message: string | null;
    updated_at: string;
}

export interface GroupAdmin {
    id: string;
    chat_id: string;
    user_id: string;
    can_add_members: boolean;
    can_remove_members: boolean;
    can_edit_info: boolean;
}

export interface CallSession {
    id: string;
    chat_id: string;
    initiated_by: string;
    call_type: 'audio' | 'video';
    status: 'ringing' | 'active' | 'ended' | 'missed';
    started_at: string;
    ended_at: string | null;
}

export class GroupChatService {
    /**
     * Get all active group chats (both system and custom)
     */
    static async getGroupChats(): Promise<GroupChat[]> {
        const { data, error } = await supabase
            .from('group_chats')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching group chats:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Create a custom group chat
     */
    static async createCustomGroup(
        name: string,
        description: string,
        memberIds: string[]
    ): Promise<GroupChat> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('User must be authenticated');
        }

        // Create the group
        const { data: group, error: groupError } = await supabase
            .from('group_chats')
            .insert({
                name,
                description,
                is_custom: true,
                created_by_user: user.id,
                created_by: user.id
            })
            .select()
            .single();

        if (groupError) {
            console.error('Error creating group:', groupError);
            throw groupError;
        }

        // Add creator as admin
        await supabase.from('group_admins').insert({
            chat_id: group.id,
            user_id: user.id,
            can_add_members: true,
            can_remove_members: true,
            can_edit_info: true
        });

        // Add members
        const participants = [user.id, ...memberIds].map(userId => ({
            chat_id: group.id,
            user_id: userId
        }));

        await supabase.from('chat_participants').insert(participants);

        return group;
    }


    /**
     * Delete a group chat (admin only)
     */
    static async deleteGroup(chatId: string): Promise<void> {
        const { error } = await supabase
            .from('group_chats')
            .update({ is_active: false })
            .eq('id', chatId);

        if (error) {
            console.error('Error deleting group:', error);
            throw error;
        }
    }

    /**
     * Search for users by name or email
     */
    static async searchUsers(query: string): Promise<{ id: string; email: string; full_name: string; avatar_url: string }[]> {
        if (!query.trim()) return [];

        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(10);

        if (error) {
            console.error('Error searching users:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Update group information (admin only)
     */
    static async updateGroupInfo(
        chatId: string,
        updates: { name?: string; description?: string; avatar_url?: string }
    ): Promise<void> {
        const { error } = await supabase
            .from('group_chats')
            .update(updates)
            .eq('id', chatId);

        if (error) {
            console.error('Error updating group:', error);
            throw error;
        }
    }

    /**
     * Add members to a group (admin only)
     */
    static async addMembers(chatId: string, userIds: string[]): Promise<void> {
        const participants = userIds.map(userId => ({
            chat_id: chatId,
            user_id: userId
        }));

        const { error } = await supabase
            .from('chat_participants')
            .insert(participants);

        if (error) {
            console.error('Error adding members:', error);
            throw error;
        }
    }

    /**
     * Remove a member from a group (admin only)
     */
    static async removeMember(chatId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('chat_participants')
            .delete()
            .eq('chat_id', chatId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error removing member:', error);
            throw error;
        }
    }

    /**
     * Get messages for a specific chat with user information
     */
    static async getChatMessages(chatId: string, limit: number = 100): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select(`
        *,
        user:user_id (
          id,
          email,
          user_metadata
        )
      `)
            .eq('chat_id', chatId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error fetching chat messages:', error);
            throw error;
        }

        return (data || []).map((msg: any) => ({
            ...msg,
            user: msg.user ? {
                id: msg.user.id,
                email: msg.user.email,
                user_metadata: msg.user.user_metadata as { full_name?: string; avatar_url?: string } | undefined
            } : undefined
        })) as ChatMessage[];
    }

    /**
     * Send a message to a chat
     */
    static async sendMessage(chatId: string, content: string): Promise<ChatMessage | null> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('User must be authenticated to send messages');
        }

        // Ensure user is a participant
        await this.joinChat(chatId);

        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                chat_id: chatId,
                user_id: user.id,
                content: content.trim()
            })
            .select(`
        *,
        user:user_id (
          id,
          email,
          user_metadata
        )
      `)
            .single();

        if (error) {
            console.error('Error sending message:', error);
            throw error;
        }

        if (!data) return null;

        const msg = data as any;
        const chatMessage = {
            ...msg,
            user: msg.user ? {
                id: msg.user.id,
                email: msg.user.email,
                user_metadata: msg.user.user_metadata as { full_name?: string; avatar_url?: string } | undefined
            } : undefined
        } as ChatMessage;

        // Trigger notifications for other members
        if (chatMessage) {
            import("./pushNotificationService").then(({ pushNotificationService }) => {
                const senderName = chatMessage.user?.user_metadata?.full_name || chatMessage.user?.email || 'Someone';
                pushNotificationService.notifyGroupMembers(
                    chatId,
                    '', // Group name can be fetched if needed
                    user.id,
                    senderName,
                    chatMessage.content,
                    chatMessage.id
                );
            });
        }

        return chatMessage;
    }

    /**
     * Join a chat room (auto-joins if not already a participant)
     */
    static async joinChat(chatId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('User must be authenticated to join chats');
        }

        // Check if already a participant
        const { data: existing } = await supabase
            .from('chat_participants')
            .select('id')
            .eq('chat_id', chatId)
            .eq('user_id', user.id)
            .single();

        if (existing) {
            return; // Already a participant
        }

        // Join the chat
        const { error } = await supabase
            .from('chat_participants')
            .insert({
                chat_id: chatId,
                user_id: user.id
            });

        if (error) {
            console.error('Error joining chat:', error);
            throw error;
        }
    }

    /**
     * Mark messages as read
     */
    static async markAsRead(chatId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { error } = await supabase
            .from('chat_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('chat_id', chatId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error marking as read:', error);
        }
    }

    /**
     * Get unread message count for a chat
     */
    static async getUnreadCount(chatId: string): Promise<number> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return 0;

        // Try to get participant record from cache-like object or fetch
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('last_read_at')
            .eq('chat_id', chatId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!participant) return 0;

        const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chatId)
            .gt('created_at', participant.last_read_at || '1970-01-01')
            .neq('user_id', user.id);

        if (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }

        return count || 0;
    }

    /**
     * Get all unread counts for a user in one go (more efficient)
     */
    static async getAllUnreadCounts(): Promise<Record<string, number>> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return {};

        const { data: participants, error: pError } = await supabase
            .from('chat_participants')
            .select('chat_id, last_read_at')
            .eq('user_id', user.id);

        if (pError || !participants) return {};

        const counts: Record<string, number> = {};

        // Use Promise.all to fetch counts in parallel for now.
        // A truly optimized version would use an RPC call or a single join query.
        await Promise.all(participants.map(async (p) => {
            const { count } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('chat_id', p.chat_id)
                .gt('created_at', p.last_read_at || '1970-01-01')
                .neq('user_id', user.id);

            counts[p.chat_id] = count || 0;
        }));

        return counts;
    }

    /**
     * Get participants of a chat with presence info
     */
    static async getParticipants(chatId: string): Promise<(ChatParticipant & { presence?: UserPresence })[]> {
        const { data, error } = await supabase
            .from('chat_participants')
            .select('*')
            .eq('chat_id', chatId)
            .order('joined_at', { ascending: false });

        if (error) {
            console.error('Error fetching participants:', error);
            throw error;
        }

        // Fetch presence separately to avoid relationship issues
        const participants = data || [];
        const participantsWithPresence = await Promise.all(
            participants.map(async (p: any) => {
                const { data: presenceData } = await supabase
                    .from('user_presence')
                    .select('*')
                    .eq('user_id', p.user_id)
                    .maybeSingle();

                return {
                    ...p,
                    presence: presenceData as UserPresence | undefined
                };
            })
        );

        return participantsWithPresence;
    }

    /**
     * Set  user presence (online/offline)
     */
    static async setUserPresence(isOnline: boolean, statusMessage?: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { error } = await supabase
            .from('user_presence')
            .upsert({
                user_id: user.id,
                is_online: isOnline,
                last_seen: new Date().toISOString(),
                status_message: statusMessage || null
            });

        if (error) {
            console.error('Error setting presence:', error);
        }
    }

    /**
     * Subscribe to presence changes
     */
    static subscribeToPresence(callback: (presence: UserPresence) => void): RealtimeChannel {
        const channel = supabase
            .channel('presence_all')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_presence'
                },
                (payload) => {
                    callback(payload.new as UserPresence);
                }
            )
            .subscribe();

        return channel;
    }

    /**
     * Subscribe to new messages in a chat
     */
    static subscribeToMessages(
        chatId: string,
        callback: (message: ChatMessage) => void
    ): RealtimeChannel {
        const channel = supabase
            .channel(`chat:${chatId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT', // Only listen for new messages for speed
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `chat_id=eq.${chatId}`
                },
                async (payload) => {
                    console.log('✅ Realtime message received:', payload.new.id);

                    // Fetch profile info - keep it minimal
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('id, email, user_metadata')
                        .eq('id', payload.new.user_id)
                        .single();

                    const chatMessage: ChatMessage = {
                        ...payload.new as any,
                        user: data ? {
                            id: data.id,
                            email: data.email,
                            user_metadata: data.user_metadata as any
                        } : undefined
                    };

                    callback(chatMessage);
                }
            )
            .subscribe();

        return channel;
    }

    /**
     * Subscribe to messages across ALL chats (for global notifications/unread counts)
     */
    static subscribeToAllMessages(callback: (message: ChatMessage) => void): RealtimeChannel {
        const channel = supabase
            .channel('global-chat-messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages'
                },
                (payload) => {
                    callback(payload.new as ChatMessage);
                }
            )
            .subscribe();

        return channel;
    }

    /**
     * Unsubscribe from a channel
     */
    static unsubscribe(channel: RealtimeChannel): void {
        supabase.removeChannel(channel);
    }

    /**
     * Delete a message (soft delete)
     */
    static async deleteMessage(messageId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('User must be authenticated to delete messages');
        }

        const { error } = await supabase
            .from('chat_messages')
            .update({ is_deleted: true })
            .eq('id', messageId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }

    /**
     * Initiate a call (basic setup - requires WebRTC implementation)
     */
    static async initiateCall(chatId: string, callType: 'audio' | 'video'): Promise<CallSession> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('User must be authenticated');
        }

        const { data, error } = await supabase
            .from('call_sessions')
            .insert({
                chat_id: chatId,
                initiated_by: user.id,
                call_type: callType,
                status: 'ringing'
            })
            .select()
            .single();

        if (error) {
            console.error('Error initiating call:', error);
            throw error;
        }

        const callData = data as any;

        // Trigger push notifications for incoming call
        const { pushNotificationService } = await import("./pushNotificationService");
        const senderName = user.user_metadata?.full_name || user.email || 'Someone';

        // Fetch group name for the notification
        const { data: chatData } = await supabase
            .from('group_chats')
            .select('name')
            .eq('id', chatId)
            .single();

        pushNotificationService.notifyCallIncoming(
            chatId,
            chatData?.name || 'Group Chat',
            user.id,
            senderName,
            callType
        );

        return {
            ...callData,
            call_type: callData.call_type as 'audio' | 'video'
        };
    }

    /**
     * End a call
     */
    static async endCall(callId: string): Promise<void> {
        const { error } = await supabase
            .from('call_sessions')
            .update({
                status: 'ended',
                ended_at: new Date().toISOString()
            })
            .eq('id', callId);

        if (error) {
            console.error('Error ending call:', error);
            throw error;
        }
    }

    /**
     * Send a WebRTC signal (Offer, Answer, ICE Candidate, or Join Call)
     */
    static async sendSignal(chatId: string, type: 'offer' | 'answer' | 'ice-candidate' | 'join-call', payload: any, recipientId?: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.channel(`chat:${chatId}`).send({
            type: 'broadcast',
            event: 'signal',
            payload: {
                type,
                payload,
                from: user.id,
                to: recipientId
            }
        });
    }

    /**
     * Subscribe to WebRTC signals
     */
    static subscribeToSignals(chatId: string, callback: (signal: any) => void): RealtimeChannel {
        const channel = supabase.channel(`chat:${chatId}`)
            .on(
                'broadcast',
                { event: 'signal' },
                (payload) => callback(payload.payload)
            )
            .subscribe();
        return channel;
    }

    /**
     * Check if user is admin of a group
     */
    static async isAdmin(chatId: string): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return false;

        const { data } = await supabase
            .from('group_admins')
            .select('id')
            .eq('chat_id', chatId)
            .eq('user_id', user.id)
            .single();

        return !!data;
    }
}
