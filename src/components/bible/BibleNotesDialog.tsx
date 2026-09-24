import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, NotebookPen, Plus, Star } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { bibleNotesService, type BibleNoteFolder } from '@/services/bibleNotesService';
import NoteEditor from '@/components/notes/NoteEditor';
import { notePreview, noteTitle, passageLabel, relativeDate, type NoteRecord } from '@/components/notes/noteUtils';
import { normalizeBookApiName } from './bookUtils';

interface BibleNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: string;
  chapter: number;
  verse?: number;
}

/**
 * Notes for the passage being read. Opening or creating a note goes straight
 * into the full-screen editor, which saves automatically.
 */
export const BibleNotesDialog = ({ open, onOpenChange, book, chapter, verse }: BibleNotesDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const apiBook = normalizeBookApiName(book);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [folders, setFolders] = useState<BibleNoteFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<{ note: NoteRecord | null } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data }, folderList] = await Promise.all([
        supabase
          .from('bible_notes')
          .select('*')
          .eq('user_id', user.id)
          // Older notes may have stored the book name un-normalised
          .in('book', Array.from(new Set([apiBook, book])))
          .eq('chapter', chapter)
          .order('updated_at', { ascending: false }),
        bibleNotesService.getFolders(user.id).catch(() => [] as BibleNoteFolder[]),
      ]);
      setNotes((data || []) as unknown as NoteRecord[]);
      setFolders(folderList);
    } finally {
      setLoading(false);
    }
  }, [user, apiBook, chapter]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const passage = passageLabel({ book: apiBook, chapter, verse });
  const chapterLabel = passageLabel({ book: apiBook, chapter });
  // Notes for this verse first, then the rest of the chapter
  const sorted = [...notes].sort((a, b) => {
    if (verse) {
      const av = a.verse === verse ? 0 : 1;
      const bv = b.verse === verse ? 0 : 1;
      if (av !== bv) return av - bv;
    }
    return (b.updated_at || '').localeCompare(a.updated_at || '');
  });

  if (!user) return null;

  return (
    <>
      <Sheet open={open && !editor} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className="flex max-h-[85dvh] w-full flex-col gap-0 rounded-t-3xl p-0 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none"
        >
          <div className="px-5 pb-3 pt-5">
            <SheetTitle className="text-xl">Notes · {chapterLabel}</SheetTitle>
            <SheetDescription>Your reflections on this chapter.</SheetDescription>
          </div>

          <div className="px-5 pb-3">
            <button
              onClick={() => setEditor({ note: null })}
              className="flex w-full items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3.5 text-left text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Plus className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">New note</span>
                <span className="block text-sm text-white/80">on {passage}</span>
              </span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {loading && notes.length === 0 ? (
              <div className="space-y-2 px-2">
                {[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <NotebookPen className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 font-medium text-foreground">No notes on {chapterLabel} yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Tap “New note” to capture what God is showing you.</p>
              </div>
            ) : (
              sorted.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setEditor({ note })}
                  className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-muted/70 active:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold text-foreground">{noteTitle(note)}</p>
                      {note.is_favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    </div>
                    {notePreview(note, 120) && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{notePreview(note, 120)}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {note.verse ? `Verse ${note.verse} · ` : ''}
                      {relativeDate(note.updated_at || note.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}

            <button
              onClick={() => {
                onOpenChange(false);
                navigate('/bible-notes', { state: { returnBook: apiBook, returnChapter: chapter } });
              }}
              className="mx-2 mt-2 flex w-[calc(100%-1rem)] items-center justify-center gap-1 rounded-xl py-3 text-sm font-medium text-blue-600 hover:bg-muted dark:text-blue-400"
            >
              See all notes <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <NoteEditor
        open={!!editor}
        userId={user.id}
        note={editor?.note ?? null}
        defaults={{ book: apiBook, chapter, verse: verse ?? null }}
        folders={folders}
        onClose={() => {
          setEditor(null);
          load();
        }}
        onSaved={(saved) =>
          setNotes((prev) => (prev.some((n) => n.id === saved.id) ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev]))
        }
        onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
      />
    </>
  );
};

export default BibleNotesDialog;
