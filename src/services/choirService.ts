
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
    created_at?: string;
}

export interface SetlistInfo {
    id: string;
    info_type: string;
    value: string;
    updated_at?: string;
}

export const choirService = {
    // --- Folders ---
    async getFolders() {
        const { data: folders, error: foldersError } = await supabase
            .from('choir_folders' as any)
            .select('*')
            .order('created_at', { ascending: true });

        if (foldersError) throw foldersError;

        // Fetch songs for all folders
        const { data: songs, error: songsError } = await supabase
            .from('choir_songs' as any)
            .select('*')
            .order('created_at', { ascending: true });

        if (songsError) throw songsError;

        // Combine folders and songs
        return folders.map((folder: any) => ({
            ...folder,
            songs: songs.filter((song: any) => song.folder_id === folder.id)
        }));
    },

    async createFolder(name: string) {
        const { data, error } = await supabase
            .from('choir_folders' as any)
            .insert([{ name }])
            .select()
            .single();
        if (error) throw error;
        return { ...data, songs: [] };
    },

    async deleteFolder(id: string) {
        const { error } = await supabase
            .from('choir_folders' as any)
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- Songs in Folders ---
    async addSongToFolder(song: Omit<ChoirSong, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('choir_songs' as any)
            .insert([song])
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
    async getWeeklySetlist(type: 'praise' | 'worship') {
        const { data, error } = await supabase
            .from('choir_weekly_set_songs' as any)
            .select('*')
            .eq('set_type', type)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    },

    async addWeeklySong(song: Omit<WeeklySetSong, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('choir_weekly_set_songs' as any)
            .insert([song])
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

    // --- Setlist Info (Date & Descriptions) ---
    async getSetlistInfo(infoType: string) {
        const { data, error } = await supabase
            .from('choir_setlist_info' as any)
            .select('*')
            .eq('info_type', infoType)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async updateSetlistInfo(infoType: string, value: string) {
        // Upsert mechanism
        const { data, error } = await supabase
            .from('choir_setlist_info' as any)
            .upsert({ info_type: infoType, value }, { onConflict: 'info_type' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Helper to get all info at once
    async getAllSetlistInfo() {
        const { data, error } = await supabase
            .from('choir_setlist_info' as any)
            .select('*');

        if (error) throw error;

        const infoMap: Record<string, string> = {};
        data.forEach((item: any) => {
            infoMap[item.info_type] = item.value;
        });
        return infoMap;
    }
};
