
import { supabase } from "@/integrations/supabase/client";

export type SearchResult = {
    id: string;
    title: string;
    description?: string;
    type: 'folder' | 'song' | 'event' | 'resource' | 'page';
    url: string;
    metadata?: any;
};

export const searchService = {
    async searchApp(query: string): Promise<SearchResult[]> {
        if (!query || query.length < 2) return [];

        const searchQuery = `%${query}%`;
        const results: SearchResult[] = [];

        try {
            // Parallel queries to different tables
            const [folders, songs, events, setlistSongs] = await Promise.all([
                supabase
                    .from('choir_folders' as any)
                    .select('id, name')
                    .ilike('name', searchQuery)
                    .limit(5),

                supabase
                    .from('choir_songs' as any)
                    .select('id, title, folder_id, artist')
                    .ilike('title', searchQuery)
                    .limit(5),

                supabase
                    .from('choir_calendar_events' as any)
                    .select('id, title, event_date')
                    .ilike('title', searchQuery)
                    .limit(5),

                supabase
                    .from('choir_weekly_set_songs' as any)
                    .select('id, title, set_type, artist')
                    .ilike('title', searchQuery)
                    .limit(5)
            ]);

            // Process Folders
            folders.data?.forEach((f: any) => {
                results.push({
                    id: `folder-${f.id}`,
                    title: f.name,
                    description: "Choir Folder",
                    type: 'folder',
                    url: `/groups/choir?folderId=${f.id}`
                });
            });

            // Process Folder Songs
            songs.data?.forEach((s: any) => {
                results.push({
                    id: `song-${s.id}`,
                    title: s.title,
                    description: s.artist ? `Song by ${s.artist}` : "Choir Song",
                    type: 'song',
                    url: `/groups/choir?folderId=${s.folder_id}&songId=${s.id}`
                });
            });

            // Process Setlist Songs
            setlistSongs.data?.forEach((s: any) => {
                // Deduplicate if already found (optional, but good practice if IDs matched, though they are different tables)
                results.push({
                    id: `set-song-${s.id}`,
                    title: s.title,
                    description: `${s.set_type === 'praise' ? 'Praise' : 'Worship'} Set • ${s.artist || 'Choir'}`,
                    type: 'song',
                    url: `/groups/choir` // Opens main page where setlist is visible
                });
            });

            // Process Events
            events.data?.forEach((e: any) => {
                results.push({
                    id: `event-${e.id}`,
                    title: e.title,
                    description: e.event_date ? new Date(e.event_date).toLocaleDateString() : "Event",
                    type: 'event',
                    url: `/groups/choir?tab=schedule`
                });
            });

        } catch (error) {
            console.error("Search API Error:", error);
        }

        return results;
    }
};
