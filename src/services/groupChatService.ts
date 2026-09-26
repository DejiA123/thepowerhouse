import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";
import { broadcast, onBroadcast, uniqueTopic } from "@/lib/realtime";

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

export interface ChatSummary extends GroupChat {
    last_message: { content: string; created_at: string; user_id: string; sender_name?: string } | null;
    unread: number;
    last_read_at: string | null;
}

export interface ChatUser {
    id: string;
    email?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    user_metadata?: {
        full_name?: string;
        avatar_url?: string;
    };
}

export interface ChatMessage {
    id: string;
    chat_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    user?: ChatUser;
    /** Client-only: message is still being sent / failed to send */
    pending?: boolean;
    failed?: boolean;
    client_id?: string;
}

export interface ChatParticipant {
    id: string;
    chat_id: string;
    user_id: string;
    joined_at: string;
    last_read_at: string;
    user?: {
        full_name: string | null;
        avatar_url: string | null;
        email: string | null;
    };
}

export interface UserPresence {
    user_id: string;
    is_online: boolean;
    last_seen: string;
    status_message: string | null;
    updated_at: string;
}

export interface CallSession {
    id: string;
    chat_id: string;
    initiated_by: string;
    call_type: 'audio' | 'video';
    status: 'ringing' | 'active' | 'ended' | 'missed';
    created_at?: string;
    started_at?: string;
    ended_at?: string | null;
}

const MESSAGE_SELECT = `*, user:user_id ( id, email, full_name, avatar_url, user_metadata )`;

const normalizeMessage = (msg: any): ChatMessage => ({
    ...msg,
    user: msg.user
        ? {
            id: msg.user.id,
            email: msg.user.email,
            full_name: msg.user.full_name,
            avatar_url: msg.user.avatar_url,
            user_metadata: msg.user.user_metadata || undefined,
        }
        : undefined,
});

/** Display name for a message author. */
export const senderName = (message: Pick<ChatMessage, 'user'>) =>
    message.user?.full_name ||
    message.user?.user_metadata?.full_name ||
    message.user?.email?.split('@')[0] ||
    'Member';

export const senderAvatar = (message: Pick<ChatMessage, 'user'>) =>
    message.user?.avatar_url || message.user?.user_metadata?.avatar_url || null;

export const signalsTopic = (chatId: string) => `chat-signals:${chatId}`;

const currentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
};

/** Tell other parts of the app (calls, banners) that my chat list changed. */
const chatsChanged = () => window.dispatchEvent(new CustomEvent('chats:changed'));

export class GroupChatService {
    // ── Chat lists ─────────────────────────────────────────────────────

    /** All active chats (community + custom) visible to this user. */
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
        return (data || []) as GroupChat[];
    }

    /**
     * Chats I'm a member of, with last message and unread count, most recent first.
     */
    static async getMyChats(): Promise<ChatSummary[]> {
        const user = await currentUser();
        if (!user) return [];

        const { data: memberships, error } = await supabase
            .from('chat_participants')
            .select('chat_id, last_read_at, joined_at, chat:chat_id ( * )')
            .eq('user_id', user.id);
        if (error) throw error;

        const rows = (memberships || []).filter((m: any) => m.chat && m.chat.is_active !== false);

        const summaries = await Promise.all(rows.map(async (m: any) => {
            const [{ data: last }, { count }] = await Promise.all([
                supabase
                    .from('chat_messages')
                    .select('content, created_at, user_id, user:user_id ( full_name )')
                    .eq('chat_id', m.chat_id)
                    .eq('is_deleted', false)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from('chat_messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('chat_id', m.chat_id)
                    .eq('is_deleted', false)
                    .neq('user_id', user.id)
                    .gt('created_at', m.last_read_at || m.joined_at || '1970-01-01'),
            ]);

            return {
                ...(m.chat as GroupChat),
                last_read_at: m.last_read_at,
                unread: count || 0,
                last_message: last
                    ? {
                        content: (last as any).content,
                        created_at: (last as any).created_at,
                        user_id: (last as any).user_id,
                        sender_name: (last as any).user?.full_name || undefined,
                    }
                    : null,
            } as ChatSummary;
        }));

        return summaries.sort((a, b) => {
            const ta = new Date(a.last_message?.created_at || a.created_at || 0).getTime();
            const tb = new Date(b.last_message?.created_at || b.created_at || 0).getTime();
            return tb - ta;
        });
    }

    /** Community groups anyone can join that I'm not in yet. */
    static async getDiscoverableChats(myChatIds: string[]): Promise<GroupChat[]> {
        const { data, error } = await supabase
            .from('group_chats')
            .select('*')
            .eq('is_active', true)
            .or('is_custom.is.null,is_custom.eq.false')
            .order('name', { ascending: true });
        if (error) {
            console.error('Error fetching community chats:', error);
            return [];
        }
        const mine = new Set(myChatIds);
        return ((data || []) as GroupChat[]).filter((c) => !mine.has(c.id));
    }

    // ── Group management ───────────────────────────────────────────────

    static async createCustomGroup(name: string, description: string, memberIds: string[]): Promise<GroupChat> {
        const user = await currentUser();
        if (!user) throw new Error('User must be authenticated');

        const { data: group, error: groupError } = await supabase
            .from('group_chats')
            .insert({
                name: name.trim(),
                description: description.trim(),
                is_custom: true,
                created_by_user: user.id,
                created_by: user.id,
            })
            .select()
            .single();
        if (groupError) throw groupError;

        await supabase.from('group_admins').insert({
            chat_id: group.id,
            user_id: user.id,
            can_add_members: true,
            can_remove_members: true,
            can_edit_info: true,
        });

        const participants = Array.from(new Set([user.id, ...memberIds])).map((userId) => ({
            chat_id: group.id,
            user_id: userId,
        }));
        const { error: membersError } = await supabase.from('chat_participants').insert(participants);
        if (membersError) console.error('Error adding members:', membersError);

        chatsChanged();
        return group as GroupChat;
    }

    /** Archive a group for everyone (creator / admins only). */
    static async deleteGroup(chatId: string): Promise<void> {
        const { error } = await supabase.from('group_chats').update({ is_active: false }).eq('id', chatId);
        if (error) throw error;
        chatsChanged();
    }

    /** Leave a group myself; the group carries on for everyone else. */
    static async leaveChat(chatId: string): Promise<void> {
        const user = await currentUser();
        if (!user) return;
        const { error } = await supabase
            .from('chat_participants')
            .delete()
            .eq('chat_id', chatId)
            .eq('user_id', user.id);
        if (error) throw error;
        chatsChanged();
    }

    static async searchUsers(query: string): Promise<{ id: string; email: string; full_name: string; avatar_url: string }[]> {
        const q = query.trim().replace(/[%,()]/g, '');
        if (!q) return [];
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
            .limit(15);
        if (error) throw error;
        return (data || []) as any;
    }

    static async updateGroupInfo(chatId: string, updates: { name?: string; description?: string; avatar_url?: string | null }): Promise<void> {
        const { error } = await supabase.from('group_chats').update(updates).eq('id', chatId);
        if (error) throw error;
        chatsChanged();
    }

    static async addMembers(chatId: string, userIds: string[]): Promise<void> {
        const { data: existing } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chatId)
            .in('user_id', userIds);
        const already = new Set((existing || []).map((r) => r.user_id));
        const rows = userIds.filter((id) => !already.has(id)).map((user_id) => ({ chat_id: chatId, user_id }));
        if (rows.length === 0) return;
        const { error } = await supabase.from('chat_participants').insert(rows);
        if (error) throw error;
    }

    static async removeMember(chatId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('chat_participants')
            .delete()
            .eq('chat_id', chatId)
            .eq('user_id', userId);
        if (error) throw error;
    }

    static async isAdmin(chatId: string): Promise<boolean> {
        const user = await currentUser();
        if (!user) return false;
        const { data } = await supabase
            .from('group_admins')
            .select('id')
            .eq('chat_id', chatId)
            .eq('user_id', user.id)
            .maybeSingle();
        return !!data;
    }

    // ── Messages ───────────────────────────────────────────────────────

    /** Newest `limit` messages (oldest first), optionally older than `before`. */
    static async getChatMessages(chatId: string, limit: number = 50, before?: string): Promise<ChatMessage[]> {
        let query = supabase
            .from('chat_messages')
            .select(MESSAGE_SELECT)
            .eq('chat_id', chatId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (before) query = query.lt('created_at', before);

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(normalizeMessage).reverse();
    }

    /** Messages newer than `after` (oldest first): fills the gap after the phone was asleep or offline. */
    static async getMessagesAfter(chatId: string, after: string, limit: number = 200): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select(MESSAGE_SELECT)
            .eq('chat_id', chatId)
            .eq('is_deleted', false)
            .gt('created_at', after)
            .order('created_at', { ascending: true })
            .limit(limit);
        if (error) throw error;
        return (data || []).map(normalizeMessage);
    }

    static async sendMessage(chatId: string, content: string, retried = false): Promise<ChatMessage | null> {
        const user = await currentUser();
        if (!user) throw new Error('User must be authenticated to send messages');

        const { data, error } = await supabase
            .from('chat_messages')
            .insert({ chat_id: chatId, user_id: user.id, content: content.trim() })
            .select(MESSAGE_SELECT)
            .single();

        if (error) {
            // Not a member yet (e.g. first message in a community group): join and retry once
            if (error.code === '42501' && !retried) {
                await this.joinChat(chatId);
                return this.sendMessage(chatId, content, true);
            }
            throw error;
        }
        if (!data) return null;

        const message = normalizeMessage(data);
        // Instant delivery to people with the chat open, then push to everyone else
        broadcast(signalsTopic(chatId), 'signal', { type: 'new-message', from: user.id, payload: message }).catch(() => undefined);
        sendPush({ type: 'chat-message', messageId: message.id });
        return message;
    }

    static async deleteMessage(messageId: string): Promise<void> {
        const user = await currentUser();
        if (!user) throw new Error('User must be authenticated to delete messages');
        const { error } = await supabase
            .from('chat_messages')
            .update({ is_deleted: true })
            .eq('id', messageId)
            .eq('user_id', user.id);
        if (error) throw error;
    }

    static async joinChat(chatId: string): Promise<void> {
        const user = await currentUser();
        if (!user) throw new Error('User must be authenticated to join chats');

        const { data: existing } = await supabase
            .from('chat_participants')
            .select('id')
            .eq('chat_id', chatId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (existing) return;

        const { error } = await supabase.from('chat_participants').insert({ chat_id: chatId, user_id: user.id });
        if (error) throw error;
        chatsChanged();
    }

    static async markAsRead(chatId: string, timestamp?: string): Promise<void> {
        const user = await currentUser();
        if (!user) return;
        const { error } = await supabase
            .from('chat_participants')
            .update({ last_read_at: timestamp || new Date().toISOString() })
            .eq('chat_id', chatId)
            .eq('user_id', user.id);
        if (error) console.error('Error marking as read:', error);
        // Badges (Group Chats, the bell, the app icon) catch up
        else window.dispatchEvent(new CustomEvent('chats:read', { detail: { chatId } }));
    }

    /** How many of my chats have messages I haven't read. */
    static async getUnreadChatCount(): Promise<number> {
        const user = await currentUser();
        if (!user) return 0;
        const { data: memberships } = await supabase
            .from('chat_participants')
            .select('chat_id, last_read_at, joined_at, chat:chat_id ( is_active )')
            .eq('user_id', user.id);
        const rows = (memberships || []).filter((m: any) => m.chat && m.chat.is_active !== false);
        const counts = await Promise.all(rows.map(async (m: any) => {
            const { count } = await supabase
                .from('chat_messages')
                .select('id', { count: 'exact', head: true })
                .eq('chat_id', m.chat_id)
                .eq('is_deleted', false)
                .neq('user_id', user.id)
                .gt('created_at', m.last_read_at || m.joined_at || '1970-01-01');
            return count || 0;
        }));
        return counts.filter((c) => c > 0).length;
    }

    static async getUnreadCount(chatId: string): Promise<number> {
        const user = await currentUser();
        if (!user) return 0;
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('last_read_at')
            .eq('chat_id', chatId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (!participant) return 0;
        const { count } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', chatId)
            .eq('is_deleted', false)
            .gt('created_at', participant.last_read_at || '1970-01-01')
            .neq('user_id', user.id);
        return count || 0;
    }

    static async getAllUnreadCounts(): Promise<Record<string, number>> {
        const chats = await this.getMyChats();
        return Object.fromEntries(chats.map((c) => [c.id, c.unread]));
    }

    static async getParticipants(chatId: string): Promise<(ChatParticipant & { presence?: UserPresence; is_admin?: boolean })[]> {
        const { data, error } = await supabase
            .from('chat_participants')
            .select(`*, user:user_id ( full_name, avatar_url, email )`)
            .eq('chat_id', chatId)
            .order('joined_at', { ascending: true });
        if (error) throw error;

        const participants = (data || []) as any[];
        const ids = participants.map((p) => p.user_id);
        const [{ data: presence }, { data: admins }] = await Promise.all([
            supabase.from('user_presence').select('*').in('user_id', ids),
            supabase.from('group_admins').select('user_id').eq('chat_id', chatId),
        ]);
        const presenceMap = new Map((presence || []).map((p: any) => [p.user_id, p]));
        const adminSet = new Set((admins || []).map((a: any) => a.user_id));

        return participants.map((p) => ({
            ...p,
            presence: presenceMap.get(p.user_id) as UserPresence | undefined,
            is_admin: adminSet.has(p.user_id),
        }));
    }

    static async setUserPresence(isOnline: boolean, statusMessage?: string): Promise<void> {
        const user = await currentUser();
        if (!user) return;
        await supabase.from('user_presence').upsert({
            user_id: user.id,
            is_online: isOnline,
            last_seen: new Date().toISOString(),
            status_message: statusMessage || null,
        });
    }

    // ── Realtime ───────────────────────────────────────────────────────

    /** New rows in one chat (database path; reliable but slightly slower). */
    static subscribeToMessages(chatId: string, callback: (message: ChatMessage) => void): RealtimeChannel {
        return supabase
            .channel(uniqueTopic(`chat-messages:${chatId}`))
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
                async (payload) => {
                    const { data } = await supabase
                        .from('profiles')
                        .select('id, email, full_name, avatar_url, user_metadata')
                        .eq('id', (payload.new as any).user_id)
                        .maybeSingle();
                    callback(normalizeMessage({ ...(payload.new as any), user: data }));
                },
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
                (payload) => {
                    // Soft deletes arrive as updates
                    if ((payload.new as any).is_deleted) callback({ ...(payload.new as any), is_deleted: true });
                },
            )
            .subscribe();
    }

    static subscribeToAllMessages(callback: (message: ChatMessage) => void): RealtimeChannel {
        return supabase
            .channel(uniqueTopic('global-chat-messages'))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                callback(payload.new as ChatMessage);
            })
            .subscribe();
    }

    static subscribeToReadStatus(callback: (payload: { chat_id: string; last_read_at: string; user_id: string }) => void): RealtimeChannel {
        return supabase
            .channel(uniqueTopic('global-read-status'))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_participants' }, (payload) => {
                callback({
                    chat_id: (payload.new as any).chat_id,
                    last_read_at: (payload.new as any).last_read_at,
                    user_id: (payload.new as any).user_id,
                });
            })
            .subscribe();
    }

    /**
     * Fast-path events for an open chat: new messages, typing, deletions.
     * Returns an unsubscribe function.
     */
    static onChatSignals(chatId: string, handler: (signal: { type: string; from?: string; payload: any }) => void): () => void {
        return onBroadcast(signalsTopic(chatId), 'signal', handler);
    }

    static sendTyping(chatId: string, userId: string, name: string, isTyping: boolean) {
        return broadcast(signalsTopic(chatId), 'signal', { type: 'typing', from: userId, payload: { name, isTyping } });
    }

    static unsubscribe(channel: RealtimeChannel): void {
        supabase.removeChannel(channel);
    }

    // ── Reactions ──────────────────────────────────────────────────────

    static async getReactions(messageIds: string[]): Promise<Record<string, { emoji: string; user_id: string; id: string }[]>> {
        if (!messageIds.length) return {};
        const { data, error } = await supabase
            .from('message_reactions' as any)
            .select('id, message_id, user_id, emoji')
            .in('message_id', messageIds);
        if (error) {
            console.error('Error fetching reactions:', error);
            return {};
        }
        const grouped: Record<string, { emoji: string; user_id: string; id: string }[]> = {};
        for (const r of (data || []) as any[]) {
            (grouped[r.message_id] ||= []).push({ emoji: r.emoji, user_id: r.user_id, id: r.id });
        }
        return grouped;
    }

    static async toggleReaction(messageId: string, emoji: string): Promise<boolean> {
        const user = await currentUser();
        if (!user) throw new Error('Not authenticated');

        const { data: existing } = await supabase
            .from('message_reactions' as any)
            .select('id')
            .eq('message_id', messageId)
            .eq('user_id', user.id)
            .eq('emoji', emoji)
            .maybeSingle();

        if (existing) {
            await supabase.from('message_reactions' as any).delete().eq('id', (existing as any).id);
            return false;
        }
        await supabase.from('message_reactions' as any).insert({ message_id: messageId, user_id: user.id, emoji });
        return true;
    }
}
