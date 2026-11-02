import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";
import { broadcast, emitLocal, onBroadcast, uniqueTopic } from "@/lib/realtime";

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
    /** When the sender last changed what it says (they can for 15 minutes): shows "Edited" */
    edited_at?: string | null;
    /** The message this one answers (swipe to reply): shown quoted above it */
    reply_to_id?: string | null;
    /** Forwarded from another chat */
    forwarded?: boolean;
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

// Answered calls kept in a chat ("::call::ended:…", see chatUtils) aren't unread: you were on the call
const ANSWERED_CALLS = '::call::ended:%';

const MESSAGE_SELECT = `*, user:user_id ( id, email, full_name, avatar_url, user_metadata )`;

export interface SendExtras {
    /** Answering this message (swipe to reply) */
    replyTo?: string | null;
    /** Forwarded from another chat */
    forwarded?: boolean;
}

export interface ChatPin {
    chat_id: string;
    message_id: string;
    pinned_by: string;
    pinned_at: string;
}

/** The database doesn't have reply_to_id / forwarded yet (its migration isn't applied) */
let noReplyColumns = false;
const isMissingColumn = (error: { code?: string; message?: string }) =>
    error.code === 'PGRST204' || error.code === '42703' || /column .* (does not exist|of 'chat_messages')/i.test(error.message || '');

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
     * Chats I'm a member of (or just these ones), with last message and unread count, most recent first.
     */
    static async getMyChats(onlyChatIds?: string[]): Promise<ChatSummary[]> {
        const user = await currentUser();
        if (!user || onlyChatIds?.length === 0) return [];

        let query = supabase
            .from('chat_participants')
            .select('chat_id, last_read_at, joined_at, chat:chat_id ( * )')
            .eq('user_id', user.id);
        if (onlyChatIds) query = query.in('chat_id', onlyChatIds);
        const { data: memberships, error } = await query;
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
                    .not('content', 'like', ANSWERED_CALLS)
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

    /** Messages edited in the last few minutes (only those can still change): an asleep phone catches up */
    static async getRecentEdits(chatId: string): Promise<{ id: string; content: string; edited_at: string }[]> {
        const since = new Date(Date.now() - 16 * 60_000).toISOString();
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chatId)
            .eq('is_deleted', false)
            .gt('created_at', since)
            .not('edited_at', 'is', null);
        if (error) return []; // before the editing migration there's nothing to catch up on
        return (data || []) as unknown as { id: string; content: string; edited_at: string }[];
    }

    static async sendMessage(chatId: string, content: string, retried = false, extra: SendExtras = {}): Promise<ChatMessage | null> {
        const user = await currentUser();
        if (!user) throw new Error('User must be authenticated to send messages');

        const row = {
            chat_id: chatId,
            user_id: user.id,
            content: content.trim(),
            ...(extra.replyTo && !noReplyColumns && { reply_to_id: extra.replyTo }),
            ...(extra.forwarded && !noReplyColumns && { forwarded: true }),
        };
        const { data, error } = await supabase
            .from('chat_messages')
            .insert(row as never)
            .select(MESSAGE_SELECT)
            .single();

        if (error) {
            // Before the reply/forward migration: send it as a plain message
            if (isMissingColumn(error) && ('reply_to_id' in row || 'forwarded' in row)) {
                noReplyColumns = true;
                return this.sendMessage(chatId, content, retried);
            }
            // Not a member yet (e.g. first message in a community group): join and retry once
            if (error.code === '42501' && !retried) {
                await this.joinChat(chatId);
                return this.sendMessage(chatId, content, true, extra);
            }
            throw error;
        }
        if (!data) return null;

        const message = normalizeMessage(data);
        // Instant delivery to people with the chat open, then push to everyone else
        broadcast(signalsTopic(chatId), 'signal', { type: 'new-message', from: user.id, payload: message }).catch(() => undefined);
        // Forwarded from another chat: this phone's lists show it there too
        if (extra.forwarded) emitLocal(signalsTopic(chatId), 'signal', { type: 'new-message', from: user.id, payload: message });
        sendPush({ type: 'chat-message', messageId: message.id });
        return message;
    }

    /** A call kept in the chat (e.g. "Missed voice call"). No push: the missed-call notification covers it. */
    static async addCallRecord(chatId: string, content: string): Promise<void> {
        const user = await currentUser();
        if (!user) return;
        const { data, error } = await supabase
            .from('chat_messages')
            .insert({ chat_id: chatId, user_id: user.id, content })
            .select(MESSAGE_SELECT)
            .single();
        if (error) throw error;
        if (!data) return;
        const signal = { type: 'new-message', from: user.id, payload: normalizeMessage(data) };
        broadcast(signalsTopic(chatId), 'signal', signal).catch(() => undefined);
        // This phone's open chat and lists see it straight away too
        emitLocal(signalsTopic(chatId), 'signal', signal);
    }

    static async deleteMessage(messageId: string, chatId?: string): Promise<void> {
        const user = await currentUser();
        if (!user) throw new Error('User must be authenticated to delete messages');
        const { error } = await supabase
            .from('chat_messages')
            .update({ is_deleted: true })
            .eq('id', messageId)
            .eq('user_id', user.id);
        if (error) throw error;
        // Deleted rows are hidden from everyone (is_deleted = false in the read rule), so the
        // database feed never tells the others: say it on the chat's signals topic
        if (chatId) broadcast(signalsTopic(chatId), 'signal', { type: 'message-deleted', from: user.id, payload: { messageId } }).catch(() => undefined);
    }

    /** Messages by id (a quoted message that isn't loaded). Deleted ones don't come back. */
    static async getMessagesByIds(ids: string[]): Promise<ChatMessage[]> {
        if (!ids.length) return [];
        const { data, error } = await supabase.from('chat_messages').select(MESSAGE_SELECT).in('id', ids).eq('is_deleted', false);
        if (error) throw error;
        return (data || []).map(normalizeMessage);
    }

    /** Everything from one message up to (not including) `before`, oldest first: jumping back to a quoted message */
    static async getMessagesBetween(chatId: string, from: string, before: string, limit = 500): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select(MESSAGE_SELECT)
            .eq('chat_id', chatId)
            .eq('is_deleted', false)
            .gte('created_at', from)
            .lt('created_at', before)
            .order('created_at', { ascending: true })
            .limit(limit);
        if (error) throw error;
        return (data || []).map(normalizeMessage);
    }

    /** Search one chat's messages (text and captions), newest first */
    static async searchMessages(chatId: string, query: string, limit = 60): Promise<ChatMessage[]> {
        const words = query.trim().replace(/[%_\\,()]/g, ' ').trim();
        if (!words) return [];
        const { data, error } = await supabase
            .from('chat_messages')
            .select(MESSAGE_SELECT)
            .eq('chat_id', chatId)
            .eq('is_deleted', false)
            .not('content', 'like', '::call::%')
            .ilike('content', `%${words}%`)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return (data || []).map(normalizeMessage);
    }

    // ── Star, pin, delete for me ───────────────────────────────────────

    /** My starred messages in a chat (ids) */
    static async starredIds(chatId: string): Promise<Set<string>> {
        const user = await currentUser();
        if (!user) return new Set();
        const { data, error } = await supabase.from('chat_starred_messages' as never).select('message_id').eq('user_id', user.id).eq('chat_id', chatId);
        if (error) return new Set(); // before the migration
        return new Set(((data || []) as { message_id: string }[]).map((r) => r.message_id));
    }

    /** My starred messages in a chat, newest starred first */
    static async starredMessages(chatId: string): Promise<ChatMessage[]> {
        const user = await currentUser();
        if (!user) return [];
        const { data, error } = await supabase
            .from('chat_starred_messages' as never)
            .select(`created_at, message:message_id ( ${MESSAGE_SELECT} )`)
            .eq('user_id', user.id)
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return ((data || []) as { message: unknown }[])
            .map((r) => r.message)
            .filter((m): m is Record<string, unknown> => !!m && !(m as { is_deleted?: boolean }).is_deleted)
            .map(normalizeMessage);
    }

    static async setStarred(messageId: string, chatId: string, starred: boolean): Promise<void> {
        const user = await currentUser();
        if (!user) throw new Error('Not signed in');
        const table = supabase.from('chat_starred_messages' as never);
        const { error } = starred
            ? await table.upsert({ user_id: user.id, message_id: messageId, chat_id: chatId } as never, { onConflict: 'user_id,message_id', ignoreDuplicates: true })
            : await table.delete().eq('user_id', user.id).eq('message_id', messageId);
        if (error) throw error;
    }

    /** Messages I deleted just for me in a chat (ids) */
    static async hiddenIds(chatId: string): Promise<Set<string>> {
        const user = await currentUser();
        if (!user) return new Set();
        const { data, error } = await supabase.from('chat_hidden_messages' as never).select('message_id').eq('user_id', user.id).eq('chat_id', chatId);
        if (error) return new Set();
        return new Set(((data || []) as { message_id: string }[]).map((r) => r.message_id));
    }

    static async deleteForMe(messageId: string, chatId: string): Promise<void> {
        const user = await currentUser();
        if (!user) throw new Error('Not signed in');
        const { error } = await supabase
            .from('chat_hidden_messages' as never)
            .upsert({ user_id: user.id, message_id: messageId, chat_id: chatId } as never, { onConflict: 'user_id,message_id', ignoreDuplicates: true });
        if (error) throw error;
    }

    /** The chat's pinned message, if any */
    static async getPin(chatId: string): Promise<ChatPin | null> {
        const { data, error } = await supabase.from('chat_pins' as never).select('chat_id, message_id, pinned_by, pinned_at').eq('chat_id', chatId).maybeSingle();
        if (error) return null;
        return (data as ChatPin | null) ?? null;
    }

    /** Pin a message for everyone in the chat (null unpins) */
    static async setPin(chatId: string, messageId: string | null): Promise<void> {
        const user = await currentUser();
        if (!user) throw new Error('Not signed in');
        const table = supabase.from('chat_pins' as never);
        const { error } = messageId
            ? await table.upsert({ chat_id: chatId, message_id: messageId, pinned_by: user.id, pinned_at: new Date().toISOString() } as never, { onConflict: 'chat_id' })
            : await table.delete().eq('chat_id', chatId);
        if (error) throw error;
        broadcast(signalsTopic(chatId), 'signal', { type: 'pin', from: user.id, payload: { messageId } }).catch(() => undefined);
    }

    /** Pins changing in a chat (any member) */
    static watchPin(chatId: string, onChange: () => void): () => void {
        const channel = supabase
            .channel(uniqueTopic(`chat-pins:${chatId}`))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_pins', filter: `chat_id=eq.${chatId}` }, onChange)
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }

    /**
     * Change what a message says (the sender, for 15 minutes after sending: the
     * database checks). Everyone with the chat open sees it straight away.
     */
    static async editMessage(messageId: string, chatId: string, content: string): Promise<ChatMessage> {
        const user = await currentUser();
        if (!user) throw new Error('User must be authenticated to edit messages');
        const { data, error } = await supabase
            .from('chat_messages')
            .update({ content })
            .eq('id', messageId)
            .eq('user_id', user.id)
            .select(MESSAGE_SELECT)
            .single();
        if (error) throw error;
        const message = normalizeMessage(data);
        const signal = { type: 'message-edited', from: user.id, payload: { messageId, content: message.content, edited_at: message.edited_at ?? new Date().toISOString() } };
        broadcast(signalsTopic(chatId), 'signal', signal).catch(() => undefined);
        // This phone's chat lists see it too
        emitLocal(signalsTopic(chatId), 'signal', signal);
        return message;
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
        const at = timestamp || new Date().toISOString();
        const { error } = await supabase
            .from('chat_participants')
            .update({ last_read_at: at })
            .eq('chat_id', chatId)
            .eq('user_id', user.id);
        if (error) {
            console.error('Error marking as read:', error);
            return;
        }
        // Badges (Group Chats, the bell, the app icon) catch up
        window.dispatchEvent(new CustomEvent('chats:read', { detail: { chatId } }));
        // The others' ✓✓ turn to "seen" straight away
        broadcast(signalsTopic(chatId), 'signal', { type: 'read', from: user.id, payload: { at } }).catch(() => undefined);
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
                .not('content', 'like', ANSWERED_CALLS)
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
            .neq('user_id', user.id)
            .not('content', 'like', ANSWERED_CALLS);
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
    static subscribeToMessages(chatId: string, callback: (message: ChatMessage) => void, onEdited?: (message: ChatMessage) => void): RealtimeChannel {
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
                    // Soft deletes arrive as updates, and so do edits
                    if ((payload.new as any).is_deleted) callback({ ...(payload.new as any), is_deleted: true });
                    else if ((payload.new as any).edited_at) onEdited?.(payload.new as ChatMessage);
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

    /**
     * Live activity in my chats, as soon as either path brings it: the sender's
     * broadcast on each chat's signals topic (instant, and how this phone hears
     * about its own call records) or the database feed. Each new message is
     * handed over once. The database only sends messages from chats I'm in, so
     * one from a chat that isn't in `chatIds` means I've just been added to it.
     * Returns a function that stops listening.
     */
    static watchChats(chatIds: string[], on: {
        message: (message: ChatMessage) => void;
        deleted?: (chatId: string, messageId: string) => void;
        edited?: (chatId: string, messageId: string) => void;
    }): () => void {
        const seen = new Set<string>();
        const deliver = (message: ChatMessage) => {
            if (!message?.id || seen.has(message.id)) return;
            if (seen.size > 1000) seen.clear();
            seen.add(message.id);
            on.message(message);
        };
        const offs = chatIds.map((chatId) =>
            this.onChatSignals(chatId, (signal) => {
                if (signal?.type === 'new-message' && signal.payload?.id) deliver(signal.payload as ChatMessage);
                else if (signal?.type === 'message-deleted' && signal.payload?.messageId) on.deleted?.(chatId, signal.payload.messageId);
                else if (signal?.type === 'message-edited' && signal.payload?.messageId) on.edited?.(chatId, signal.payload.messageId);
            }),
        );
        const channel = this.subscribeToAllMessages(deliver);
        return () => {
            offs.forEach((off) => off());
            this.unsubscribe(channel);
        };
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
