import { supabase } from '@/integrations/supabase/client';
import { normalizeBookApiName } from '@/components/bible/bookUtils';
import { HIGHLIGHTS_CHANGED } from '@/components/bible/highlightColors';

export interface HighlightRow {
  id: string;
  user_id: string;
  book: string;
  chapter: number;
  verse: number | null;
  highlight_color: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const announce = () => window.dispatchEvent(new CustomEvent(HIGHLIGHTS_CHANGED));

/** Book names as they may have been stored (older rows weren't always normalised). */
const bookKeys = (book: string) => Array.from(new Set([normalizeBookApiName(book), book]));

export const bibleHighlightsService = {
  async listAll(userId: string): Promise<HighlightRow[]> {
    const { data, error } = await supabase
      .from('bible_highlights')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []) as HighlightRow[];
  },

  async listChapter(userId: string, book: string, chapter: number): Promise<HighlightRow[]> {
    const { data, error } = await supabase
      .from('bible_highlights')
      .select('*')
      .eq('user_id', userId)
      .in('book', bookKeys(book))
      .eq('chapter', chapter)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []) as HighlightRow[];
  },

  /**
   * Colour these verses. Any earlier highlight on the same verse is replaced,
   * so a verse never carries two colours.
   */
  async setColor(userId: string, book: string, chapter: number, verses: number[], color: string) {
    if (!verses.length) return;
    const apiBook = normalizeBookApiName(book);
    const { error: clearError } = await supabase
      .from('bible_highlights')
      .delete()
      .eq('user_id', userId)
      .in('book', bookKeys(book))
      .eq('chapter', chapter)
      .in('verse', verses);
    if (clearError) throw clearError;
    const { error } = await supabase
      .from('bible_highlights')
      .insert(verses.map((verse) => ({ user_id: userId, book: apiBook, chapter, verse, highlight_color: color })));
    if (error) throw error;
    announce();
  },

  async remove(userId: string, book: string, chapter: number, verses: number[]) {
    if (!verses.length) return;
    const { error } = await supabase
      .from('bible_highlights')
      .delete()
      .eq('user_id', userId)
      .in('book', bookKeys(book))
      .eq('chapter', chapter)
      .in('verse', verses);
    if (error) throw error;
    announce();
  },
};
