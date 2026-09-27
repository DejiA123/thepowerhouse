import { supabase } from '@/integrations/supabase/client';

/**
 * Social Circle. Member profiles are private in the database (each person can
 * only read their own), so finding people and managing friendships goes
 * through the `social-circle` edge function, which only hands out names and
 * photos and only touches friendships you're part of.
 */

export interface Person {
    id: string;
    name: string;
    avatar: string | null;
}

/** How someone relates to me. */
export type Relation =
    | { kind: 'none' }
    | { kind: 'friends' | 'sent' | 'received'; friendshipId: string };

export interface CircleEntry {
    friendshipId: string;
    /** When the friendship started, or when the request was sent */
    since: string;
    person: Person;
}

export interface Circle {
    friends: CircleEntry[];
    incoming: CircleEntry[];
    outgoing: CircleEntry[];
}

export interface DiscoverPage {
    people: { person: Person; relation: Relation }[];
    hasMore: boolean;
    nextOffset: number;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.functions.invoke('social-circle', { body });
    if (error) {
        // Prefer the function's own explanation ("You can't add this person")
        let message = navigator.onLine === false ? "You're offline. Connect to the internet and try again." : error.message;
        try {
            const reply = await (error as { context?: Response }).context?.json();
            if (reply?.error) message = reply.error;
        } catch {
            /* not JSON */
        }
        throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data as T;
}

const CIRCLE_KEY = 'social_circle_v1';

export const SocialService = {
    /** My friends and requests, with names and photos. */
    async circle(): Promise<Circle> {
        const circle = await call<Circle>({ action: 'circle' });
        try {
            localStorage.setItem(CIRCLE_KEY, JSON.stringify(circle));
        } catch {
            /* storage full */
        }
        return circle;
    },

    /** The last circle loaded on this device, so the page can show it straight away. */
    savedCircle(): Circle | null {
        try {
            return JSON.parse(localStorage.getItem(CIRCLE_KEY) || 'null');
        } catch {
            return null;
        }
    },

    /** Everyone in the app (A–Z), or the people whose name matches. */
    discover: (query: string, offset = 0) => call<DiscoverPage>({ action: 'discover', query, offset }),

    request: (personId: string) => call<{ relation: Relation }>({ action: 'request', personId }).then((r) => r.relation),
    accept: (friendshipId: string) => call<{ relation: Relation }>({ action: 'accept', friendshipId }).then((r) => r.relation),
    decline: (friendshipId: string) => call({ action: 'decline', friendshipId }),
    /** Unfriend, or cancel a request I sent */
    remove: (friendshipId: string) => call({ action: 'remove', friendshipId }),
    block: (personId: string) => call({ action: 'block', personId }),
    /** The private chat with a friend (made the first time) */
    chatWith: (personId: string) => call<{ chatId: string }>({ action: 'chat', personId }).then((r) => r.chatId),
};
