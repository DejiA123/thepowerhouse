
import { supabase } from "@/integrations/supabase/client";

export interface BibleNoteFolder {
    id: string;
    user_id: string;
    name: string;
    parent_id?: string | null;
    created_at?: string;
    updated_at?: string;
    notes?: BibleNote[];
    noteCount?: number;
}

export interface BibleNote {
    id: string;
    user_id: string;
    book: string;
    chapter: number;
    verse?: number;
    note_text: string;
    title?: string;
    tags?: string[];
    category?: string;
    is_favorite?: boolean;
    is_private?: boolean;
    is_pinned?: boolean;
    folder_id?: string | null;
    created_at: string;
    updated_at: string;
}

export const bibleNotesService = {
    // --- Folders ---
    async getFolders(userId: string): Promise<BibleNoteFolder[]> {
        const { data: folders, error: foldersError } = await supabase
            .from('bible_note_folders' as any)
            .select('*')
            .eq('user_id', userId)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

        if (foldersError) throw foldersError;

        // Fetch notes for all folders to get counts
        const { data: notes, error: notesError } = await supabase
            .from('bible_notes')
            .select('id, folder_id')
            .eq('user_id', userId);

        if (notesError) throw notesError;

        // Combine folders with note counts
        return (folders || []).map((folder: any) => ({
            ...folder,
            noteCount: (notes || []).filter((note: any) => note.folder_id === folder.id).length,
            notes: []
        }));
    },

    async createFolder(userId: string, name: string, parent_id?: string | null): Promise<BibleNoteFolder> {
        // Get max sort order to append new folder at the end
        const { data: lastFolder } = await supabase
            .from('bible_note_folders' as any)
            .select('sort_order')
            .eq('user_id', userId)
            .order('sort_order', { ascending: false })
            .limit(1);

        const nextOrder = (lastFolder?.[0]?.sort_order ?? 0) + 1;

        const { data, error } = await supabase
            .from('bible_note_folders' as any)
            .insert([{ user_id: userId, name, parent_id, sort_order: nextOrder }])
            .select()
            .single();

        if (error) throw error;

        const folderData = data as any;
        return {
            id: folderData.id,
            user_id: folderData.user_id,
            name: folderData.name,
            parent_id: folderData.parent_id,
            sort_order: folderData.sort_order,
            created_at: folderData.created_at,
            updated_at: folderData.updated_at,
            noteCount: 0,
            notes: []
        };
    },

    async updateFolder(id: string, updates: Partial<BibleNoteFolder>): Promise<BibleNoteFolder> {
        const { data, error } = await supabase
            .from('bible_note_folders' as any)
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        const folderData = data as any;
        return {
            id: folderData.id,
            user_id: folderData.user_id,
            name: folderData.name,
            parent_id: folderData.parent_id,
            sort_order: folderData.sort_order,
            created_at: folderData.created_at,
            updated_at: folderData.updated_at
        };
    },

    async updateFolderOrder(folderOrders: { id: string, sort_order: number }[]): Promise<void> {
        // Process updates in chunks or iterate (Supabase upsert can also work)
        const promises = folderOrders.map(order =>
            supabase
                .from('bible_note_folders' as any)
                .update({ sort_order: order.sort_order })
                .eq('id', order.id)
        );

        const results = await Promise.all(promises);
        const error = results.find(r => r.error)?.error;
        if (error) throw error;
    },

    async deleteFolder(id: string): Promise<void> {
        const { error } = await supabase
            .from('bible_note_folders' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Notes ---
    async getNotes(userId: string, folderId?: string | null): Promise<BibleNote[]> {
        let query = supabase
            .from('bible_notes')
            .select('*')
            .eq('user_id', userId);

        if (folderId === null) {
            // Get notes without a folder
            query = query.is('folder_id', null);
        } else if (folderId) {
            // Get notes in specific folder
            query = query.eq('folder_id', folderId);
        }
        // If folderId is undefined, get all notes

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async moveNoteToFolder(noteId: string, folderId: string | null): Promise<void> {
        const { error } = await supabase
            .from('bible_notes')
            .update({ folder_id: folderId } as any)
            .eq('id', noteId);

        if (error) throw error;
    },

    async createNote(userId: string, note: Omit<BibleNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<BibleNote> {
        const { data, error } = await supabase
            .from('bible_notes')
            .insert([{ ...note, user_id: userId } as any])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateNote(noteId: string, updates: Partial<BibleNote>): Promise<BibleNote> {
        const { data, error } = await supabase
            .from('bible_notes')
            .update(updates as any)
            .eq('id', noteId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteNote(noteId: string): Promise<void> {
        const { error } = await supabase
            .from('bible_notes')
            .delete()
            .eq('id', noteId);

        if (error) throw error;
    },

    // --- Stats ---
    async getStats(userId: string): Promise<{
        total: number;
        favourites: number;
        byFolder: Record<string, number>;
    }> {
        const { data: notes, error } = await supabase
            .from('bible_notes')
            .select('id, is_favorite, folder_id')
            .eq('user_id', userId);

        if (error) throw error;

        const byFolder: Record<string, number> = {};
        let favourites = 0;

        (notes || []).forEach((note: any) => {
            if (note.is_favorite) favourites++;

            const folderId = note.folder_id || 'unfiled';
            byFolder[folderId] = (byFolder[folderId] || 0) + 1;
        });

        return {
            total: notes?.length || 0,
            favourites,
            byFolder
        };
    }
};
