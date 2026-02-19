import { supabase } from '@/integrations/supabase/client';

export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface Profile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email?: string | null;
}

export interface Friendship {
    id: string;
    user_id: string;
    friend_id: string;
    status: FriendshipStatus;
    created_at: string;
    updated_at: string;
    profiles?: Profile; // When joined with profiles
}

export class SocialService {
    /**
     * Search for users by name or email
     */
    static async searchUsers(query: string, currentUserId: string) {
        if (!query || query.length < 2) return [];

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
            .neq('id', currentUserId)
            .limit(20);

        if (error) {
            console.error('Error searching users:', error);
            throw error;
        }

        return data as Profile[];
    }

    /**
     * Send a friend request
     */
    static async sendFriendRequest(userId: string, friendId: string) {
        const { data, error } = await supabase
            .from('friendships')
            .insert([
                { user_id: userId, friend_id: friendId, status: 'pending' }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error sending friend request:', error);
            throw error;
        }

        return data as Friendship;
    }

    /**
     * Respond to a friend request (Accept/Decline) or Block
     */
    static async updateFriendshipStatus(friendshipId: string, status: FriendshipStatus) {
        const { data, error } = await supabase
            .from('friendships')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', friendshipId)
            .select()
            .single();

        if (error) {
            console.error('Error updating friendship status:', error);
            throw error;
        }

        return data as Friendship;
    }

    /**
     * Get all friends for a user
     */
    static async getFriends(userId: string) {
        // We need to check both user_id and friend_id since friendships are bidirectional once accepted
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                *,
                sender:profiles!friendships_user_id_fkey(id, full_name, avatar_url),
                receiver:profiles!friendships_friend_id_fkey(id, full_name, avatar_url)
            `)
            .eq('status', 'accepted')
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        if (error) {
            console.error('Error fetching friends:', error);
            throw error;
        }

        // Map the results to show the "other" user as the friend
        return data.map(friendship => {
            const isSender = friendship.user_id === userId;
            return {
                friendshipId: friendship.id,
                friend: isSender ? friendship.receiver : friendship.sender
            };
        });
    }

    /**
     * Get pending friend requests (Incoming)
     */
    static async getIncomingRequests(userId: string) {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                *,
                sender:profiles!friendships_user_id_fkey(id, full_name, avatar_url)
            `)
            .eq('friend_id', userId)
            .eq('status', 'pending');

        if (error) {
            console.error('Error fetching incoming requests:', error);
            throw error;
        }

        return data;
    }

    /**
     * Get pending friend requests (Outgoing)
     */
    static async getOutgoingRequests(userId: string) {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                *,
                receiver:profiles!friendships_friend_id_fkey(id, full_name, avatar_url)
            `)
            .eq('user_id', userId)
            .eq('status', 'pending');

        if (error) {
            console.error('Error fetching outgoing requests:', error);
            throw error;
        }

        return data;
    }

    /**
     * Check friendship status between two users
     */
    static async getFriendshipStatus(userId: string, otherUserId: string) {
        const { data, error } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${userId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${userId})`)
            .maybeSingle();

        if (error) {
            console.error('Error checking friendship status:', error);
            throw error;
        }

        return data as Friendship | null;
    }

    /**
     * Remove a friendship or cancel a request
     */
    static async removeFriendship(friendshipId: string) {
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', friendshipId);

        if (error) {
            console.error('Error removing friendship:', error);
            throw error;
        }
    }
}
