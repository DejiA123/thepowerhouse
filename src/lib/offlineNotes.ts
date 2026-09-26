import { supabase } from '@/integrations/supabase/client';
import { NOTES_CHANGED } from '@/components/bible/highlightColors';

/**
 * Notes written or edited with no connection are kept on the device as drafts
 * (`note_draft_<user>_<note id | "new">`). When the connection returns they are
 * saved to the account, even if the note isn't open any more.
 */

export const noteDraftKey = (userId: string, id: string | null) => `note_draft_${userId}_${id ?? 'new'}`;

export interface NoteDraft {
  html: string;
  title?: string;
  at: string;
  /** Kept for notes that were never saved, so they can be created later */
  book?: string;
  chapter?: number;
  verse?: number | null;
  folder_id?: string | null;
  is_favorite?: boolean;
  is_pinned?: boolean;
}

/** Drafts the open editor is looking after itself */
export const openDrafts = new Set<string>();

let syncing = false;

export async function syncNoteDrafts(userId: string) {
  if (syncing || navigator.onLine === false) return;
  syncing = true;
  let changed = false;
  try {
    const prefix = `note_draft_${userId}_`;
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix) && !openDrafts.has(k));
    for (const key of keys) {
      let draft: NoteDraft;
      try {
        draft = JSON.parse(localStorage.getItem(key) || 'null');
      } catch {
        continue;
      }
      if (!draft || typeof draft.html !== 'string') continue;
      const id = key.slice(prefix.length);
      const fields = { title: draft.title?.trim() || null, note_text: draft.html, updated_at: draft.at };

      if (id === 'new') {
        if (!draft.book) continue; // an old-style draft: the editor recovers it next time
        const { error } = await supabase.from('bible_notes').insert({
          ...fields,
          user_id: userId,
          book: draft.book,
          chapter: draft.chapter ?? 1,
          verse: draft.verse ?? null,
          folder_id: draft.folder_id ?? null,
          is_favorite: !!draft.is_favorite,
          is_pinned: !!draft.is_pinned,
          category: 'insight',
          is_private: false,
        });
        if (error) break;
      } else {
        // Don't overwrite a newer version saved from another device
        const { data: current, error: readError } = await supabase.from('bible_notes').select('updated_at').eq('id', id).maybeSingle();
        if (readError) break;
        if (current && current.updated_at && current.updated_at > draft.at) {
          localStorage.removeItem(key);
          continue;
        }
        if (current) {
          const { error } = await supabase.from('bible_notes').update(fields).eq('id', id).eq('user_id', userId);
          if (error) break;
        }
      }
      localStorage.removeItem(key);
      changed = true;
    }
  } finally {
    syncing = false;
    if (changed) window.dispatchEvent(new CustomEvent(NOTES_CHANGED));
  }
}
