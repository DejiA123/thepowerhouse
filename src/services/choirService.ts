
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
    set_type: 'praise' | 'worship' | 'special' | 'hymns' | 'thanksgiving' | 'offering' | 
              'praise_d1' | 'worship_d1' | 'special_d1' | 'hymns_d1' | 'thanksgiving_d1' | 'offering_d1' |
              'praise_d2' | 'worship_d2' | 'special_d2' | 'hymns_d2' | 'thanksgiving_d2' | 'offering_d2' |
              'praise_d3' | 'worship_d3' | 'special_d3' | 'hymns_d3' | 'thanksgiving_d3' | 'offering_d3';
    title: string;
    key: string;
    artist: string;
    url?: string;
    instrumental_url?: string;
    instrumental_notes?: string;
    lyrics?: string;
    library_song_id?: string;
    sort_order: number;
    week_date?: string;
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
    week_date?: string;
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

export interface AcademyModule {
    id: string;
    title: string;
    description?: string;
    content?: string;
    video_url?: string;
    category: 'newcomer' | 'core' | 'leadership';
    location: string;
    created_at?: string;
}

export interface AcademyQuiz {
    id: string;
    module_id: string;
    title: string;
    description?: string;
    passing_score: number;
    created_at?: string;
    questions?: QuizQuestion[];
}

export interface QuizQuestion {
    id: string;
    quiz_id: string;
    question_text: string;
    options: string[];
    correct_answer_index: number;
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

    async updateFolder(id: string, name: string) {
        const { data, error } = await supabase
            .from('choir_folders' as any)
            .update({ name })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
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
    async getWeeklySetlist(type: 'praise' | 'worship' | 'special' | 'hymns', location: string, weekDate?: string) {
        let query = supabase
            .from('choir_weekly_set_songs' as any)
            .select('*')
            .eq('set_type', type)
            .eq('location', location);

        if (weekDate) {
            query = query.eq('week_date', weekDate);
        } else {
            // Default to rows without week_date or rows matching current week's Monday
            // For now, let's just make weekDate required in practice from the UI
        }

        const { data, error } = await query.order('sort_order', { ascending: true });
        if (error) throw error;
        return data;
    },

    async addWeeklySong(song: Omit<WeeklySetSong, 'id' | 'created_at'>, location: string) {
        // Sanitize: ensure library_song_id is null (not undefined) to satisfy FK constraint
        const sanitized = {
            set_type: song.set_type,
            title: song.title,
            key: song.key || null,
            artist: song.artist || null,
            url: song.url || null,
            lyrics: song.lyrics || null,
            library_song_id: song.library_song_id || null,
            sort_order: song.sort_order ?? 0,
            week_date: song.week_date,
            location
        };
        console.log('addWeeklySong sanitized payload:', sanitized);
        const { data, error } = await supabase
            .from('choir_weekly_set_songs' as any)
            .insert([sanitized])
            .select()
            .single();
        if (error) {
            console.error('addWeeklySong error:', error);
            throw error;
        }
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

    async reorderWeeklySet(songs: { id: string, sort_order: number }[]) {
        // Since Supabase doesn't have a built-in multiple update for different rows
        // we use a series of updates. For better performance/atomicity, an RPC could be used.
        const updates = songs.map(song =>
            supabase
                .from('choir_weekly_set_songs' as any)
                .update({ sort_order: song.sort_order })
                .eq('id', song.id)
        );

        const results = await Promise.all(updates);
        const error = results.find(r => r.error)?.error;
        if (error) throw error;
    },

    async clearWeeklySetlist(location: string, weekDate?: string) {
        let query = supabase
            .from('choir_weekly_set_songs' as any)
            .delete()
            .eq('location', location);

        if (weekDate) {
            query = query.eq('week_date', weekDate);
        }

        const { error } = await query;
        if (error) throw error;
    },

    // --- Setlist Info (Date & Descriptions) ---
    async getSetlistInfo(infoType: string, location: string, weekDate?: string) {
        let query = supabase
            .from('choir_setlist_info' as any)
            .select('*')
            .eq('info_type', infoType)
            .eq('location', location);

        if (weekDate) {
            query = query.eq('week_date', weekDate);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        return data;
    },

    async updateSetlistInfo(infoType: string, value: string, location: string, weekDate?: string) {
        // Use a fixed date for global records to ensure upsert onConflict works correctly (NULL != NULL in SQL)
        const normalizedDate = weekDate || '1900-01-01';
        const payload: any = { info_type: infoType, value, location, week_date: normalizedDate };

        const { data, error } = await supabase
            .from('choir_setlist_info' as any)
            .upsert(payload, { onConflict: 'info_type,location,week_date' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // --- Learning Focus (JSON Storage) ---
    async getLearningSongs(location: string, weekDate?: string): Promise<WeeklySetSong[]> {
        const record = await this.getSetlistInfo('learning_songs_json', location, weekDate);

        if (!record || !record.value) return [];

        try {
            return JSON.parse(record.value);
        } catch (e) {
            console.error("Failed to parse learning songs JSON", e);
            return [];
        }
    },

    async saveLearningSongs(songs: WeeklySetSong[], location: string, weekDate?: string) {
        return this.updateSetlistInfo('learning_songs_json', JSON.stringify(songs), location, weekDate);
    },

    // Helper to get all info at once for a location
    async getAllSetlistInfo(location: string, weekDate?: string) {
        let query = supabase
            .from('choir_setlist_info' as any)
            .select('*')
            .eq('location', location);

        if (weekDate) {
            query = query.eq('week_date', weekDate);
        }

        const { data, error } = await query;

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
    },

    // --- Academy ---
    async getAcademyModules(location: string, category?: string): Promise<AcademyModule[]> {
        let query = supabase
            .from('choir_academy_modules' as any)
            .select('*')
            .eq('location', location)
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as unknown as AcademyModule[];
    },

    async addAcademyModule(module: Omit<AcademyModule, 'id' | 'created_at'>): Promise<AcademyModule> {
        const { data, error } = await supabase
            .from('choir_academy_modules' as any)
            .insert([module])
            .select()
            .single();

        if (error) throw error;
        return data as unknown as AcademyModule;
    },

    async updateAcademyModule(id: string, updates: Partial<AcademyModule>) {
        const { data, error } = await supabase
            .from('choir_academy_modules' as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as unknown as AcademyModule;
    },

    async deleteAcademyModule(id: string) {
        const { error } = await supabase
            .from('choir_academy_modules' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getAcademyQuiz(moduleId: string): Promise<AcademyQuiz | null> {
        const { data: quizData, error: quizError } = await supabase
            .from('choir_academy_quizzes' as any)
            .select('*')
            .eq('module_id', moduleId)
            .maybeSingle();

        if (quizError) throw quizError;
        if (!quizData) return null;

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
            .from('choir_academy_questions' as any)
            .select('*')
            .eq('quiz_id', (quizData as any).id);

        if (questionsError) throw questionsError;

        return {
            ...(quizData as object),
            questions: questionsData || []
        } as unknown as AcademyQuiz;
    },

    async saveAcademyQuiz(quiz: Omit<AcademyQuiz, 'id' | 'created_at' | 'questions'>, questions: Omit<QuizQuestion, 'id' | 'quiz_id' | 'created_at'>[]) {
        // 1. Create/Update Quiz
        const { data: newQuiz, error: quizError } = await supabase
            .from('choir_academy_quizzes' as any)
            .insert([quiz])
            .select()
            .single();

        if (quizError) throw quizError;

        // 2. Add Questions
        const questionsWithId = questions.map(q => ({
            ...q,
            quiz_id: (newQuiz as any).id
        }));

        const { error: questionsError } = await supabase
            .from('choir_academy_questions' as any)
            .insert(questionsWithId);

        if (questionsError) throw questionsError;

        return newQuiz;
    },

    // --- Contributions Persistence ---
    async getContributions(location: string): Promise<any | null> {
        const { data, error } = await supabase
            .from('choir_setlist_info' as any)
            .select('value')
            .eq('info_type', 'choir_contributions_json')
            .eq('location', location)
            .eq('week_date', '1900-01-01')
            .maybeSingle();

        if (error) {
            // Fallback for transition period: check for NULL if 1900-01-01 not found
            const { data: oldData, error: oldError } = await supabase
                .from('choir_setlist_info' as any)
                .select('value')
                .eq('info_type', 'choir_contributions_json')
                .eq('location', location)
                .is('week_date', null)
                .maybeSingle();

            if (!oldError && oldData) return JSON.parse((oldData as any).value);
            
            console.error("Error fetching contributions", error);
            return null;
        }

        const record = data as unknown as { value: string } | null;
        if (!record || !record.value) return null;

        try {
            return JSON.parse(record.value);
        } catch (e) {
            console.error("Failed to parse contributions JSON", e);
            return null;
        }
    },

    async saveContributions(data: any, location: string) {
        return this.updateSetlistInfo('choir_contributions_json', JSON.stringify(data), location);
    }
};
