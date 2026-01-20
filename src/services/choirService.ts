
import { supabase } from "@/integrations/supabase/client";

export interface ChoirSong {
    id: string;
    folder_id: string;
    title: string;
    key: string;
    artist: string;
    url?: string;
    notes?: string;
    created_at?: string;
}

export interface ChoirFolder {
    id: string;
    name: string;
    parent_id?: string | null;
    created_at?: string;
    songs?: ChoirSong[];
}

export interface WeeklySetSong {
    id: string;
    set_type: 'praise' | 'worship';
    title: string;
    key: string;
    artist: string;
    url?: string;
    instrumental_url?: string;
    instrumental_notes?: string;
    library_song_id?: string;
    created_at?: string;
}

export interface InstrumentalResource {
    id: string;
    title: string;
    type: string;
    url?: string;
    created_at?: string;
}

export interface SetlistInfo {
    id: string;
    info_type: string;
    value: string;
    updated_at?: string;
}

export interface ChoirCalendarEvent {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    event_date: string;
    color: string;
    created_at?: string;
}

export const choirService = {
    // --- Instrumental Resources ---
    async getInstrumentalResources(location: string): Promise<InstrumentalResource[]> {
        const { data, error } = await supabase
            .from('choir_instrumental_resources' as any)
            .select('*')
            .eq('location', location)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return (data || []) as unknown as InstrumentalResource[];
    },

    async addInstrumentalResource(resource: Omit<InstrumentalResource, 'id' | 'created_at'>, location: string): Promise<InstrumentalResource> {
        const { data, error } = await supabase
            .from('choir_instrumental_resources' as any)
            .insert([{ ...resource, location }])
            .select()
            .single();

        if (error) throw error;
        return data as unknown as InstrumentalResource;
    },

    async updateInstrumentalResource(id: string, updates: Partial<InstrumentalResource>) {
        const { data, error } = await supabase
            .from('choir_instrumental_resources' as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as unknown as InstrumentalResource;
    },

    async deleteInstrumentalResource(id: string) {
        const { error } = await supabase
            .from('choir_instrumental_resources' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Folders ---
    async getFolders(location: string): Promise<ChoirFolder[]> {
        const { data: folders, error: foldersError } = await supabase
            .from('choir_folders' as any)
            .select('*')
            .eq('location', location)
            .order('created_at', { ascending: true });

        if (foldersError) throw foldersError;

        // Fetch songs for all folders in this location
        const { data: songs, error: songsError } = await supabase
            .from('choir_songs' as any)
            .select('*')
            .eq('location', location)
            .order('created_at', { ascending: true });

        if (songsError) throw songsError;

        // Combine folders and songs
        const typedFolders = (folders || []) as any[];
        const typedSongs = (songs || []) as any[];

        return typedFolders.map((folder: any) => ({
            ...folder,
            songs: typedSongs.filter((song: any) => song.folder_id === folder.id)
        }));
    },

    async createFolder(name: string, location: string, parent_id?: string | null): Promise<ChoirFolder> {
        const { data, error } = await supabase
            .from('choir_folders' as any)
            .insert([{ name, parent_id, location }])
            .select()
            .single();
        if (error) throw error;

        const folderData = data as any;
        return {
            id: folderData.id,
            name: folderData.name,
            parent_id: folderData.parent_id,
            created_at: folderData.created_at,
            songs: []
        };
    },

    async deleteFolder(id: string) {
        const { error } = await supabase
            .from('choir_folders' as any)
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Songs in Folders ---
    async addSongToFolder(song: Omit<ChoirSong, 'id' | 'created_at'>, location: string) {
        const { data, error } = await supabase
            .from('choir_songs' as any)
            .insert([{ ...song, location }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateSong(id: string, updates: Partial<ChoirSong>) {
        const { data, error } = await supabase
            .from('choir_songs' as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteSong(id: string) {
        const { error } = await supabase
            .from('choir_songs' as any)
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Weekly Setlists ---
    async getWeeklySetlist(type: 'praise' | 'worship', location: string) {
        const { data, error } = await supabase
            .from('choir_weekly_set_songs' as any)
            .select('*')
            .eq('set_type', type)
            .eq('location', location)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    },

    async addWeeklySong(song: Omit<WeeklySetSong, 'id' | 'created_at'>, location: string) {
        const { data, error } = await supabase
            .from('choir_weekly_set_songs' as any)
            .insert([{ ...song, location }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateWeeklySong(id: string, updates: Partial<WeeklySetSong>) {
        const { data, error } = await supabase
            .from('choir_weekly_set_songs' as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteWeeklySong(id: string) {
        const { error } = await supabase
            .from('choir_weekly_set_songs' as any)
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async clearWeeklySetlist(location: string) {
        const { error } = await supabase
            .from('choir_weekly_set_songs' as any)
            .delete()
            .eq('location', location);
        if (error) throw error;
    },

    // --- Setlist Info (Date & Descriptions) ---
    async getSetlistInfo(infoType: string, location: string) {
        const { data, error } = await supabase
            .from('choir_setlist_info' as any)
            .select('*')
            .eq('info_type', infoType)
            .eq('location', location)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async updateSetlistInfo(infoType: string, value: string, location: string) {
        // Upsert mechanism with location
        const { data, error } = await supabase
            .from('choir_setlist_info' as any)
            .upsert({ info_type: infoType, value, location }, { onConflict: 'info_type,location' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Helper to get all info at once for a location
    async getAllSetlistInfo(location: string) {
        const { data, error } = await supabase
            .from('choir_setlist_info' as any)
            .select('*')
            .eq('location', location);

        if (error) throw error;

        const infoMap: Record<string, string> = {};
        data.forEach((item: any) => {
            infoMap[item.info_type] = item.value;
        });
        return infoMap;
    },

    // --- Calendar Events ---
    async getCalendarEvents(location: string): Promise<ChoirCalendarEvent[]> {
        const { data, error } = await supabase
            .from('choir_calendar_events' as any)
            .select('*')
            .eq('location', location)
            .order('event_date', { ascending: true });

        if (error) throw error;
        return (data || []) as unknown as ChoirCalendarEvent[];
    },

    async addCalendarEvent(event: Omit<ChoirCalendarEvent, 'id' | 'created_at'>, location: string): Promise<ChoirCalendarEvent> {
        const { data, error } = await supabase
            .from('choir_calendar_events' as any)
            .insert([{ ...event, location }])
            .select()
            .single();

        if (error) throw error;
        return data as unknown as ChoirCalendarEvent;
    },

    async updateCalendarEvent(id: string, updates: Partial<ChoirCalendarEvent>) {
        const { data, error } = await supabase
            .from('choir_calendar_events' as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as unknown as ChoirCalendarEvent;
    },

    async deleteCalendarEvent(id: string) {
        const { error } = await supabase
            .from('choir_calendar_events' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
