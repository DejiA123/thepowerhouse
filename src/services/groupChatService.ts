import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";
import { broadcast, emitLocal, onBroadcast, uniqueTopic } from "@/lib/realtime";
import { previewText } from "@/components/messages/chatUtils";
import { WAITING_TEXT, decryptMessage, e2eReady, encryptMany, encryptMessage, isEncrypted, membersChanged, shareKeys } from "@/lib/chatCrypto";

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
    /** Muted by me until then (far in the future = always) */
    muted_until?: string | null;
    /** Archived by me */
    archived_at?: string | null;
    /** I marked it unread (nothing new in it): shows a dot until I open it */
    marked_unread?: boolean;
}

/** My muted chats (chat id → until), kept up to date by the chat list and the mute switch */
const mutedUntil = new Map<string, number>();
export const isChatMuted = (chatId: string) => (mutedUntil.get(chatId) ?? 0) > Date.now();
/** Window event: a chat was muted, unmuted, archived, unarchived or cleared on this phone */
export const CHAT_SETTINGS_CHANGED = 'chat:settings';

/**
 * "Clear chat" (each member's own): messages up to then are hidden from me,
 * except starred ones I kept. Saved on my chat_participants row (cleared_at),
 * and on this phone too so it works before that database update.
 */
const clearedTimes = new Map<string, number>();
const clearedKey = (userId: string, chatId: string) => `chat_cleared_${userId}_${chatId}`;
function localCleared(userId: string, chatId: string) {
    try {
        return Number(localStorage.getItem(clearedKey(userId, chatId))) || 0;
    } catch {
        return 0;
    }
}
/** A database time in ms (it writes microseconds, which not every Safari reads) */
const msOf = (iso?: string | null) => (iso ? Date.parse(iso.replace(/(\.\d{3})\d+/, '$1')) || 0 : 0);
function noteCleared(userId: string, chatId: string, serverIso?: string | null) {
    const at = Math.max(msOf(serverIso), localCleared(userId, chatId));
    clearedTimes.set(chatId, at);
    return at;
}
/** "After the clear" as a time to compare with: a millisecond on, so the last cleared message (microseconds) stays hidden */
const afterClear = (ms: number) => new Date(ms + 1).toISOString();

/** "Mark as unread" (like WhatsApp): kept on the phone too, so it works before the database has the column */
const unreadMarkKey = (userId: string, chatId: string) => `chat_marked_unread_${userId}_${chatId}`;
const markedUnread = new Set<string>();
function isMarkedUnread(userId: string, chatId: string, server?: boolean | null) {
    let local = false;
    try {
        local = localStorage.getItem(unreadMarkKey(userId, chatId)) === '1';
    } catch {
        /* private window */
    }
    const on = !!server || local;
    if (on) markedUnread.add(chatId);
    else markedUnread.delete(chatId);
    return on;
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
    /** Imported from WhatsApp: the sender's name there (the row is saved by whoever imported it) */
    imported_from?: string | null;
    /** The member that WhatsApp sender is, when matched */
    imported_as?: string | null;
    /** Client-only: sent end-to-end encrypted (this phone opened it) */
    encrypted?: boolean;
    /** Client-only: encrypted, and this phone doesn't have its key yet ("Waiting for this message") */
    locked?: boolean;
    /** Client-only: the scrambled original of a locked message, to open once its key arrives */
    cipher?: string;
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
    // Imported from WhatsApp: shown under the name it had there
    user: msg.imported_from
        ? { id: msg.imported_as || `wa:${msg.imported_from}`, full_name: msg.imported_from, avatar_url: null }
        : msg.user
        ? {
            id: msg.user.id,
            email: msg.user.email,
            full_name: msg.user.full_name,
            avatar_url: msg.user.avatar_url,
            user_metadata: msg.user.user_metadata || undefined,
        }
        : undefined,
});

/** Open one encrypted message on this phone (or mark it "waiting" until its key arrives) */
async function openMessage(message: ChatMessage, userId?: string | null): Promise<ChatMessage> {
    const content = message.locked && message.cipher ? message.cipher : message.content;
    if (!isEncrypted(content)) return message;
    const text = userId ? await decryptMessage(userId, message.chat_id, content).catch(() => null) : null;
    return text === null
        ? { ...message, content: WAITING_TEXT, cipher: content, locked: true, encrypted: true }
        : { ...message, content: text, cipher: undefined, locked: false, encrypted: true };
}

/** Messages as they arrive from the server, readable on this phone */
export async function readable(messages: ChatMessage[]): Promise<ChatMessage[]> {
    if (!messages.some((m) => isEncrypted(m.content) || (m.locked && m.cipher))) return messages;
    const user = await currentUser();
    return Promise.all(messages.map((m) => openMessage(m, user?.id)));
}

/** Is deleted_chat_messages() there yet? (migration 20261103130000) */
let noDeletedNotes = false;

/**
 * Where deleted messages were ("This message was deleted", like WhatsApp): only the id,
 * sender and time come back (the read rule keeps their text in the database). Newest 500.
 */
async function deletedNotes(chatId: string, from?: string | null, to?: string | null): Promise<ChatMessage[]> {
    if (noDeletedNotes) return [];
    const { data, error } = await supabase.rpc('deleted_chat_messages' as never, { _chat_id: chatId, _from: from ?? null, _to: to ?? null } as never);
    if (error) {
        if (error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message)) noDeletedNotes = true;
        return [];
    }
    type Row = { id: string; chat_id: string; user_id: string; created_at: string; imported_from: string | null; imported_as: string | null; full_name: string | null; avatar_url: string | null };
    return ((data || []) as unknown as Row[]).map((r) =>
        normalizeMessage({
            id: r.id,
            chat_id: r.chat_id,
            user_id: r.user_id,
            content: '',
            created_at: r.created_at,
            updated_at: r.created_at,
            is_deleted: true,
            imported_from: r.imported_from,
            imported_as: r.imported_as,
            user: { id: r.user_id, full_name: r.full_name, avatar_url: r.avatar_url },
        }),
    );
}

/** Messages and deleted-message notes together, oldest first (a message never appears twice) */
function withDeletedNotes(messages: ChatMessage[], notes: ChatMessage[]): ChatMessage[] {
    if (!notes.length) return messages;
    const seen = new Set(messages.map((m) => m.id));
    return [...messages, ...notes.filter((n) => !seen.has(n.id))].sort((a, b) => msOf(a.created_at) - msOf(b.created_at));
}

/** A message deleted for everyone, as its note: no text, no file, nothing to reply to */
export const asDeletedNote = (m: ChatMessage): ChatMessage => ({
    ...m,
    content: '',
    is_deleted: true,
    locked: false,
    cipher: undefined,
    encrypted: false,
    reply_to_id: null,
    forwarded: false,
    edited_at: null,
    pending: false,
    failed: false,
});

/** Is the imported_from column there? (unread counts leave imported history out) */
let importColumns: Promise<boolean> | null = null;
/** A new message's notification line, encrypted like the message (null if that fails: the server then uses the message) */
async function notificationPreview(userId: string, chatId: string, text: string): Promise<string | null> {
    try {
        const line = previewText(text);
        return await encryptMessage(userId, chatId, line.length > 160 ? `${line.slice(0, 159)}…` : line);
    } catch {
        return null;
    }
}

const hasImportColumns = () => {
    if (!importColumns) {
        importColumns = Promise.resolve(supabase.from('chat_messages').select('imported_from' as never).limit(1))
            .then(({ error }) => !error)
            .catch(() => false);
    }
    return importColumns;
};

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

/** The latest messages of a chat, opened on the phone, for searching (kept a minute) */
const searchCache = new Map<string, { at: number; list: Promise<ChatMessage[]> }>();
function recentForSearch(chatId: string): Promise<ChatMessage[]> {
    const hit = searchCache.get(chatId);
    if (hit && Date.now() - hit.at < 60_000) return hit.list;
    const list = (async () => {
        const out: ChatMessage[] = [];
        let before: string | undefined;
        for (let page = 0; page < 2; page++) {
            let q = supabase.from('chat_messages').select(MESSAGE_SELECT).eq('chat_id', chatId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(1000);
            if (before) q = q.lt('created_at', before);
            const { data, error } = await q;
            if (error || !data?.length) break;
            out.push(...(await readable(data.map(normalizeMessage))));
            if (data.length < 1000) break;
            before = (data[data.length - 1] as { created_at: string }).created_at;
        }
        return out;
    })();
    list.catch(() => searchCache.delete(chatId));
    searchCache.set(chatId, { at: Date.now(), list });
    return list;
}

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
            .select('*, chat:chat_id ( * )')
            .eq('user_id', user.id);
        if (onlyChatIds) query = query.in('chat_id', onlyChatIds);
        const { data: memberships, error } = await query;
        if (error) throw error;

        const rows = (memberships || []).filter((m: any) => m.chat && m.chat.is_active !== false);

        const leaveOutImported = await hasImportColumns();
        const summaries = await Promise.all(rows.map(async (m: any) => {
            // Cleared by me: the list shows nothing from before
            const clearedMs = noteCleared(user.id, m.chat_id, m.cleared_at);
            let unreadQuery = supabase
                .from('chat_messages')
                .select('id', { count: 'exact', head: true })
                .eq('chat_id', m.chat_id)
                .eq('is_deleted', false)
                .neq('user_id', user.id)
                .not('content', 'like', ANSWERED_CALLS)
                .gt('created_at', m.last_read_at || m.joined_at || '1970-01-01');
            if (leaveOutImported) unreadQuery = unreadQuery.is('imported_from' as never, null);
            // Cleared messages aren't unread any more
            if (clearedMs) unreadQuery = unreadQuery.gt('created_at', afterClear(clearedMs));
            const [{ data: lastRow }, { count }] = await Promise.all([
                supabase
                    .from('chat_messages')
                    .select('content, created_at, user_id, user:user_id ( full_name )')
                    .eq('chat_id', m.chat_id)
                    .eq('is_deleted', false)
                    .gt('created_at', clearedMs ? afterClear(clearedMs) : '1970-01-01T00:00:00Z')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                unreadQuery,
            ]);
            // An encrypted last message is opened on the phone for the list
            const last = lastRow
                ? { ...(lastRow as any), content: (await openMessage({ ...(lastRow as any), chat_id: m.chat_id } as ChatMessage, user.id)).content }
                : null;

            if (m.muted_until) mutedUntil.set(m.chat_id, new Date(m.muted_until).getTime());
            else mutedUntil.delete(m.chat_id);
            // Marked unread with nothing new: counts as one unread chat, shown as a dot
            const marked = !count && isMarkedUnread(user.id, m.chat_id, m.marked_unread);
            return {
                ...(m.chat as GroupChat),
                last_read_at: m.last_read_at,
                muted_until: m.muted_until ?? null,
                archived_at: m.archived_at ?? null,
                marked_unread: marked,
                unread: count || (marked ? 1 : 0),
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
        // New members get the chat's keys from this phone straight away (their devices, if they have any yet)
        membersChanged(chatId);
        const user = await currentUser();
        if (user) shareKeys(user.id, chatId).catch(() => undefined);
    }

    static async removeMember(chatId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('chat_participants')
            .delete()
            .eq('chat_id', chatId)
            .eq('user_id', userId);
        if (error) throw error;
        // The next message uses a new key the person who left doesn't get
        membersChanged(chatId);
    }

    /** When I cleared this chat (null if never) */
    static async clearedAt(chatId: string): Promise<string | null> {
        let at = clearedTimes.get(chatId);
        if (at === undefined) {
            const user = await currentUser();
            if (!user) return null;
            const { data } = await supabase.from('chat_participants').select('*').eq('chat_id', chatId).eq('user_id', user.id).maybeSingle();
            at = noteCleared(user.id, chatId, (data as { cleared_at?: string | null } | null)?.cleared_at);
        }
        return at ? afterClear(at) : null;
    }

    /**
     * Clear a chat for me, like WhatsApp: everything up to its latest message is
     * hidden from me (nobody else). Starred messages stay unless `keepStarred` is off.
     */
    static async clearChat(chatId: string, keepStarred: boolean): Promise<void> {
        const user = await currentUser();
        if (!user) throw new Error('Not signed in');
        // The latest message's own time (the server's clock, not this phone's)
        const { data: latest } = await supabase
            .from('chat_messages')
            .select('created_at')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        const at = (latest as { created_at?: string } | null)?.created_at ?? new Date().toISOString();
        if (!keepStarred) {
            await supabase.from('chat_starred_messages' as never).delete().eq('user_id', user.id).eq('chat_id', chatId);
        }
        try {
            localStorage.setItem(clearedKey(user.id, chatId), String(msOf(at)));
        } catch {
            /* private mode: the database copy still works */
        }
        const { error } = await supabase.from('chat_participants').update({ cleared_at: at } as never).eq('chat_id', chatId).eq('user_id', user.id);
        if (error && !isMissingColumn(error)) throw error;
        noteCleared(user.id, chatId, at);
        window.dispatchEvent(new CustomEvent(CHAT_SETTINGS_CHANGED, { detail: { chatId } }));
    }

    /** My own settings for a chat (mute, archive) */
    static async mySettings(chatId: string): Promise<{ muted_until: string | null; archived_at: string | null } | null> {
        const user = await currentUser();
        if (!user) return null;
        const { data, error } = await supabase.from('chat_participants').select('*').eq('chat_id', chatId).eq('user_id', user.id).maybeSingle();
        if (error || !data || !('muted_until' in (data as object))) return null; // before the mute/archive update
        const row = data as unknown as { muted_until: string | null; archived_at: string | null };
        if (row.muted_until) mutedUntil.set(chatId, new Date(row.muted_until).getTime());
        return { muted_until: row.muted_until ?? null, archived_at: row.archived_at ?? null };
    }

    /** Mute a chat's notifications until then (null unmutes) */
    static async setMuted(chatId: string, until: Date | null): Promise<void> {
        const user = await currentUser();
        if (!user) throw new Error('Not signed in');
        const { error } = await supabase
            .from('chat_participants')
            .update({ muted_until: until ? until.toISOString() : null } as never)
            .eq('chat_id', chatId)
            .eq('user_id', user.id);
        if (error) throw error;
        if (until) mutedUntil.set(chatId, until.getTime());
        else mutedUntil.delete(chatId);
        window.dispatchEvent(new CustomEvent(CHAT_SETTINGS_CHANGED, { detail: { chatId } }));
    }

    static async setArchived(chatId: string, archived: boolean): Promise<void> {
        const user = await currentUser();
        if (!user) throw new Error('Not signed in');
        const { error } = await supabase
            .from('chat_participants')
            .update({ archived_at: archived ? new Date().toISOString() : null } as never)
            .eq('chat_id', chatId)
            .eq('user_id', user.id);
        if (error) throw error;
        window.dispatchEvent(new CustomEvent(CHAT_SETTINGS_CHANGED, { detail: { chatId } }));
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
        // Cleared by me: only what came after, plus starred messages I kept
        const cleared = await this.clearedAt(chatId);
        if (cleared) {
            const kept = [...(await this.starredIds(chatId))].filter((id) => /^[0-9a-f-]{36}$/i.test(id));
            query = kept.length
                ? query.or(`created_at.gt."${cleared}",id.in.(${kept.join(',')})`)
                : query.gt('created_at', cleared);
        }

        const { data, error } = await query;
        if (error) throw error;
        const messages = await readable((data || []).map(normalizeMessage).reverse());
        // Notes where messages were deleted, over the same stretch of the chat: from the oldest
        // message loaded (or the start, or where I cleared it) up to `before`
        const full = (data || []).length >= limit;
        const from = full ? messages[0]?.created_at : cleared;
        const notes = (await deletedNotes(chatId, from, before)).filter((n) => !before || msOf(n.created_at) < msOf(before));
        return withDeletedNotes(messages, notes);
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
        return readable((data || []).map(normalizeMessage));
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
        return (await readable((data || []).map(normalizeMessage))) as unknown as { id: string; content: string; edited_at: string }[];
    }

    static async sendMessage(chatId: string, content: string, retried = false, extra: SendExtras = {}): Promise<ChatMessage | null> {
        const user = await currentUser();
        if (!user) throw new Error('User must be authenticated to send messages');

        // End-to-end encrypted (calls stay as they are: they're not messages anyone writes)
        const text = content.trim();
        let stored = text;
        let encrypted = false;
        if (!text.startsWith('::call::') && (await e2eReady())) {
            try {
                stored = await encryptMessage(user.id, chatId, text);
                encrypted = true;
            } catch (e) {
                // Not a member yet (first message in a community group): join, then encrypt
                if ((e as { code?: string })?.code === '42501' && !retried) {
                    await this.joinChat(chatId);
                    membersChanged(chatId);
                    return this.sendMessage(chatId, content, true, extra);
                }
                throw e;
            }
        }
        const row = {
            chat_id: chatId,
            user_id: user.id,
            content: stored,
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

        const saved = normalizeMessage(data);
        // Instant delivery to people with the chat open (still scrambled: they open it), then push to everyone else
        broadcast(signalsTopic(chatId), 'signal', { type: 'new-message', from: user.id, payload: saved }).catch(() => undefined);
        // Forwarded from another chat: this phone's lists show it there too
        if (extra.forwarded) emitLocal(signalsTopic(chatId), 'signal', { type: 'new-message', from: user.id, payload: saved });
        // This phone knows what it says
        const message: ChatMessage = { ...saved, content: text, encrypted };
        if (encrypted) {
            // The notification's line ("📷 Photo", the text…), encrypted with the same key, so
            // the other phones can show what it says however long the message is
            void notificationPreview(user.id, chatId, text)
                .then((e2ePreview) => sendPush({ type: 'chat-message', messageId: message.id, ...(e2ePreview && { e2ePreview }) }));
        } else {
            sendPush({ type: 'chat-message', messageId: message.id });
        }
        return message;
    }

    /** Can a WhatsApp chat be imported? (the database has the import columns) */
    static canImport(): Promise<boolean> {
        return hasImportColumns();
    }

    /**
     * Bring a WhatsApp chat's history in: saved by me, with each message's
     * WhatsApp sender and original time, end-to-end encrypted like any other
     * message. No notifications; everyone's chat reloads once at the end.
     */
    static async importMessages(
        chatId: string,
        rows: { at: string; sender: string; content: string; as: string | null }[],
        onProgress?: (done: number) => void,
        cancelled?: () => boolean,
    ): Promise<number> {
        const user = await currentUser();
        if (!user) throw new Error('Not signed in');
        const encrypt = await e2eReady();
        let done = 0;
        try {
            for (let i = 0; i < rows.length; i += 200) {
                if (cancelled?.()) break;
                const batch = rows.slice(i, i + 200);
                const contents = encrypt ? await encryptMany(user.id, chatId, batch.map((r) => r.content)) : batch.map((r) => r.content);
                const { error } = await supabase.from('chat_messages').insert(
                    batch.map((r, j) => ({
                        chat_id: chatId,
                        user_id: user.id,
                        content: contents[j],
                        created_at: r.at,
                        imported_from: r.sender,
                        imported_as: r.as,
                    })) as never,
                );
                if (error) throw error;
                done += batch.length;
                onProgress?.(done);
            }
        } finally {
            if (done) {
                const signal = { type: 'imported', from: user.id, payload: { count: done } };
                broadcast(signalsTopic(chatId), 'signal', signal).catch(() => undefined);
                emitLocal(signalsTopic(chatId), 'signal', signal);
            }
        }
        return done;
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
        // Through the database function: a plain update is refused, because the read rule hides
        // deleted messages and the update returns the changed row (migration 20261103120000)
        const { error: rpcError } = await supabase.rpc('delete_chat_message' as never, { _message_id: messageId } as never);
        if (rpcError) {
            const missing = rpcError.code === 'PGRST202' || rpcError.code === '42883' || /could not find the function/i.test(rpcError.message);
            if (!missing) throw rpcError;
            // Before the migration: the old way
            const { error } = await supabase
                .from('chat_messages')
                .update({ is_deleted: true })
                .eq('id', messageId)
                .eq('user_id', user.id);
            if (error) throw error;
        }
        // Deleted rows are hidden from everyone (is_deleted = false in the read rule), so the
        // database feed never tells the others: say it on the chat's signals topic
        if (chatId) broadcast(signalsTopic(chatId), 'signal', { type: 'message-deleted', from: user.id, payload: { messageId } }).catch(() => undefined);
    }

    /** Messages by id (a quoted message that isn't loaded). Deleted ones don't come back. */
    static async getMessagesByIds(ids: string[]): Promise<ChatMessage[]> {
        if (!ids.length) return [];
        const { data, error } = await supabase.from('chat_messages').select(MESSAGE_SELECT).in('id', ids).eq('is_deleted', false);
        if (error) throw error;
        return readable((data || []).map(normalizeMessage));
    }

    /** Everything from one message up to (not including) `before`, oldest first: jumping back to a quoted message */
    static async getMessagesBetween(chatId: string, from: string, before: string, limit = 500): Promise<ChatMessage[]> {
        const cleared = await this.clearedAt(chatId);
        if (cleared && msOf(from) < msOf(cleared)) from = cleared;
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
        return readable((data || []).map(normalizeMessage));
    }

    /**
     * Search one chat's messages (text and captions), newest first. Encrypted
     * messages can only be searched on the phone: the latest 2,000 are opened
     * here; older, unencrypted ones are searched on the server.
     */
    static async searchMessages(chatId: string, query: string, limit = 60): Promise<ChatMessage[]> {
        const words = query.trim().replace(/[%_\\,()]/g, ' ').trim();
        if (!words) return [];
        const [server, recent] = await Promise.all([
            supabase
                .from('chat_messages')
                .select(MESSAGE_SELECT)
                .eq('chat_id', chatId)
                .eq('is_deleted', false)
                .not('content', 'like', '::call::%')
                .ilike('content', `%${words}%`)
                .order('created_at', { ascending: false })
                .limit(limit),
            recentForSearch(chatId),
        ]);
        if (server.error) throw server.error;
        const needle = words.toLowerCase();
        const found = new Map<string, ChatMessage>();
        for (const m of recent) {
            if (!m.locked && !m.content.startsWith('::call::') && m.content.toLowerCase().includes(needle)) found.set(m.id, m);
        }
        for (const m of (server.data || []).map(normalizeMessage)) if (!isEncrypted(m.content)) found.set(m.id, m);
        const cleared = await this.clearedAt(chatId);
        return [...found.values()]
            .filter((m) => !cleared || msOf(m.created_at) >= msOf(cleared))
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, limit);
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
        return readable(((data || []) as { message: unknown }[])
            .map((r) => r.message)
            .filter((m): m is Record<string, unknown> => !!m && !(m as { is_deleted?: boolean }).is_deleted)
            .map(normalizeMessage));
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
        const encrypted = await e2eReady();
        const stored = encrypted ? await encryptMessage(user.id, chatId, content) : content;
        const { data, error } = await supabase
            .from('chat_messages')
            .update({ content: stored })
            .eq('id', messageId)
            .eq('user_id', user.id)
            .select(MESSAGE_SELECT)
            .single();
        if (error) throw error;
        const saved = normalizeMessage(data);
        const message: ChatMessage = { ...saved, content, encrypted };
        // Others (and this phone's lists) get it scrambled and open it themselves
        const signal = { type: 'message-edited', from: user.id, payload: { messageId, chatId, content: saved.content, edited_at: saved.edited_at ?? new Date().toISOString() } };
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
        membersChanged(chatId);
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
        // Opening it clears "Mark as unread"
        if (markedUnread.has(chatId) || isMarkedUnread(user.id, chatId)) await this.setMarkedUnread(chatId, false, true).catch(() => undefined);
        // Badges (Group Chats, the bell, the app icon) catch up
        window.dispatchEvent(new CustomEvent('chats:read', { detail: { chatId } }));
        // The others' ✓✓ turn to "seen" straight away
        broadcast(signalsTopic(chatId), 'signal', { type: 'read', from: user.id, payload: { at } }).catch(() => undefined);
    }

    /**
     * "Mark as unread" / "Mark as read" for me only, like WhatsApp: the chat shows a dot
     * until I open it. The others' read ticks don't change.
     */
    static async setMarkedUnread(chatId: string, on: boolean, quiet = false): Promise<void> {
        const user = await currentUser();
        if (!user) throw new Error('Not signed in');
        try {
            if (on) localStorage.setItem(unreadMarkKey(user.id, chatId), '1');
            else localStorage.removeItem(unreadMarkKey(user.id, chatId));
        } catch {
            /* private window: the database still has it */
        }
        if (on) markedUnread.add(chatId);
        else markedUnread.delete(chatId);
        const { error } = await supabase
            .from('chat_participants')
            .update({ marked_unread: on } as never)
            .eq('chat_id', chatId)
            .eq('user_id', user.id);
        // Before the update the phone's own copy does it
        if (error && !isMissingColumn(error)) console.warn('[chat] could not save "mark as unread"', error.message);
        if (!quiet) {
            window.dispatchEvent(new CustomEvent(CHAT_SETTINGS_CHANGED, { detail: { chatId } }));
            window.dispatchEvent(new CustomEvent('chats:read', { detail: { chatId } }));
        }
    }

    /** How many of my chats have messages I haven't read. */
    static async getUnreadChatCount(): Promise<number> {
        const user = await currentUser();
        if (!user) return 0;
        const { data: memberships } = await supabase
            .from('chat_participants')
            .select('*, chat:chat_id ( is_active )')
            .eq('user_id', user.id);
        const rows = (memberships || []).filter((m: any) => m.chat && m.chat.is_active !== false);
        const leaveOutImported = await hasImportColumns();
        const counts = await Promise.all(rows.map(async (m: any) => {
            const clearedMs = noteCleared(user.id, m.chat_id, m.cleared_at);
            let q = supabase
                .from('chat_messages')
                .select('id', { count: 'exact', head: true })
                .eq('chat_id', m.chat_id)
                .eq('is_deleted', false)
                .neq('user_id', user.id)
                .not('content', 'like', ANSWERED_CALLS)
                .gt('created_at', m.last_read_at || m.joined_at || '1970-01-01');
            if (leaveOutImported) q = q.is('imported_from' as never, null);
            if (clearedMs) q = q.gt('created_at', afterClear(clearedMs));
            const { count } = await q;
            return count || (isMarkedUnread(user.id, m.chat_id, m.marked_unread) ? 1 : 0);
        }));
        return counts.filter((c) => c > 0).length;
    }

    static async getUnreadCount(chatId: string): Promise<number> {
        const user = await currentUser();
        if (!user) return 0;
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('*')
            .eq('chat_id', chatId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (!participant) return 0;
        const clearedMs = noteCleared(user.id, chatId, (participant as { cleared_at?: string | null }).cleared_at);
        let q = supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', chatId)
            .eq('is_deleted', false)
            .gt('created_at', participant.last_read_at || '1970-01-01')
            .neq('user_id', user.id)
            .not('content', 'like', ANSWERED_CALLS);
        if (await hasImportColumns()) q = q.is('imported_from' as never, null);
        if (clearedMs) q = q.gt('created_at', afterClear(clearedMs));
        const { count } = await q;
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
                    // Imported history arrives all at once: the chat reloads when the import is done
                    if ((payload.new as any).imported_from) return;
                    const { data } = await supabase
                        .from('profiles')
                        .select('id, email, full_name, avatar_url, user_metadata')
                        .eq('id', (payload.new as any).user_id)
                        .maybeSingle();
                    const [message] = await readable([normalizeMessage({ ...(payload.new as any), user: data })]);
                    callback(message);
                },
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
                (payload) => {
                    // Soft deletes arrive as updates, and so do edits
                    if ((payload.new as any).is_deleted) callback({ ...(payload.new as any), is_deleted: true });
                    else if ((payload.new as any).edited_at) {
                        readable([payload.new as ChatMessage]).then(([message]) => onEdited?.(message)).catch(() => undefined);
                    }
                },
            )
            .subscribe();
    }

    static subscribeToAllMessages(callback: (message: ChatMessage) => void): RealtimeChannel {
        return supabase
            .channel(uniqueTopic('global-chat-messages'))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                if ((payload.new as any).imported_from) return;
                readable([payload.new as ChatMessage]).then(([message]) => callback(message)).catch(() => undefined);
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
                if (signal?.type === 'new-message' && signal.payload?.id && !signal.payload.imported_from) deliver(signal.payload as ChatMessage);
                else if (signal?.type === 'message-deleted' && signal.payload?.messageId) on.deleted?.(chatId, signal.payload.messageId);
                else if (signal?.type === 'message-edited' && signal.payload?.messageId) on.edited?.(chatId, signal.payload.messageId);
                // A WhatsApp chat was imported: the latest line may have changed
                else if (signal?.type === 'imported') on.edited?.(chatId, '');
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
        return onBroadcast(signalsTopic(chatId), 'signal', (signal: { type: string; from?: string; payload: any }) => {
            // New and edited messages travel scrambled: open them on this phone first
            if (signal?.type === 'new-message' && signal.payload?.id && isEncrypted(signal.payload.content)) {
                readable([signal.payload as ChatMessage]).then(([payload]) => handler({ ...signal, payload })).catch(() => undefined);
            } else if (signal?.type === 'message-edited' && isEncrypted(signal.payload?.content)) {
                readable([{ id: signal.payload.messageId, chat_id: chatId, content: signal.payload.content } as ChatMessage])
                    .then(([m]) => !m.locked && handler({ ...signal, payload: { ...signal.payload, content: m.content } }))
                    .catch(() => undefined);
            } else handler(signal);
        });
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
