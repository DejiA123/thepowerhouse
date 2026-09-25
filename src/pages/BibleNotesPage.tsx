import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpDown, BookOpen, ChevronLeft, FolderCog, NotebookPen, Plus, Search, Star, X } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { bibleNotesService, type BibleNoteFolder } from '@/services/bibleNotesService';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import NoteCard from '@/components/notes/NoteCard';
import NoteEditor, { type NoteDraftDefaults } from '@/components/notes/NoteEditor';
import FolderManager from '@/components/notes/FolderManager';
import { htmlToText, noteTitle, type NoteRecord } from '@/components/notes/noteUtils';

type Filter = 'all' | 'favourites' | 'unfiled' | string; // string = folder id
type Sort = 'edited' | 'created' | 'title';

const cacheKey = (userId: string) => `notes_cache_v2_${userId}`;

const BibleNotesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const [notes, setNotes] = useState<NoteRecord[]>(() => {
    if (!user) return [];
    try {
      return JSON.parse(localStorage.getItem(cacheKey(user.id)) || '[]');
    } catch {
      return [];
    }
  });
  const [folders, setFolders] = useState<BibleNoteFolder[]>([]);
  const [loading, setLoading] = useState(notes.length === 0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(() => localStorage.getItem('notes_filter') || 'all');
  const [sort, setSort] = useState<Sort>(() => (localStorage.getItem('notes_sort') as Sort) || 'edited');
  const [editor, setEditor] = useState<{ note: NoteRecord | null; defaults?: NoteDraftDefaults } | null>(null);
  const [manageFolders, setManageFolders] = useState(false);
  const [toDelete, setToDelete] = useState<NoteRecord | null>(null);

  const returnTo = location.state as { returnBook?: string; returnChapter?: number } | null;

  // ── Data ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data, error }, folderList] = await Promise.all([
        supabase.from('bible_notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        bibleNotesService.getFolders(user.id).catch(() => [] as BibleNoteFolder[]),
      ]);
      if (error) throw error;
      const list = (data || []) as unknown as NoteRecord[];
      setNotes(list);
      setFolders(folderList);
      try {
        localStorage.setItem(cacheKey(user.id), JSON.stringify(list));
      } catch {
        /* storage full */
      }
    } catch (error) {
      console.error('Failed to load notes', error);
      appAlert('Could not load your notes', 'Showing the copy saved on this device.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    localStorage.setItem('notes_filter', filter);
  }, [filter]);
  useEffect(() => {
    localStorage.setItem('notes_sort', sort);
  }, [sort]);

  // Deep links: ?note=<id> opens a note; ?new=1&book=&chapter=&verse= starts one on a passage
  useEffect(() => {
    const noteId = params.get('note');
    const isNew = params.get('new') === '1';
    if (!noteId && !isNew) return;
    if (noteId) {
      const found = notes.find((n) => n.id === noteId);
      if (!found && loading) return;
      if (found) setEditor({ note: found });
    } else {
      setEditor({
        note: null,
        defaults: {
          book: params.get('book') || undefined,
          chapter: params.get('chapter') ? Number(params.get('chapter')) : undefined,
          verse: params.get('verse') ? Number(params.get('verse')) : null,
        },
      });
    }
    setParams({}, { replace: true, state: location.state });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, notes, loading]);

  // ── Derived ───────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    notes.forEach((n) => {
      if (n.folder_id) c[n.folder_id] = (c[n.folder_id] || 0) + 1;
    });
    return c;
  }, [notes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = notes.filter((n) => {
      if (filter === 'favourites' && !n.is_favorite) return false;
      if (filter === 'unfiled' && n.folder_id) return false;
      if (filter !== 'all' && filter !== 'favourites' && filter !== 'unfiled' && n.folder_id !== filter) return false;
      if (!q) return true;
      return noteTitle(n).toLowerCase().includes(q) || htmlToText(n.note_text).toLowerCase().includes(q);
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'title') return noteTitle(a).localeCompare(noteTitle(b), undefined, { numeric: true, sensitivity: 'base' });
      if (sort === 'created') return b.created_at.localeCompare(a.created_at);
      return (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at);
    });
    return {
      pinned: sorted.filter((n) => n.is_pinned),
      others: sorted.filter((n) => !n.is_pinned),
    };
  }, [notes, filter, query, sort]);

  const total = visible.pinned.length + visible.others.length;

  // ── Mutations (optimistic) ────────────────────────────────────────
  const upsertLocal = useCallback((note: NoteRecord) => {
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === note.id);
      const next = exists ? prev.map((n) => (n.id === note.id ? note : n)) : [note, ...prev];
      if (user) {
        try {
          localStorage.setItem(cacheKey(user.id), JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, [user]);

  const patchNote = async (note: NoteRecord, patch: Partial<NoteRecord>) => {
    const updated = { ...note, ...patch };
    upsertLocal(updated);
    const { error } = await supabase.from('bible_notes').update(patch as any).eq('id', note.id);
    if (error) {
      upsertLocal(note);
      appAlert('Could not update the note', 'Please try again.', 'error');
    }
  };

  const deleteNote = async (note: NoteRecord) => {
    setToDelete(null);
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    const { error } = await supabase.from('bible_notes').delete().eq('id', note.id).eq('user_id', note.user_id);
    if (error) {
      upsertLocal(note);
      appAlert('Could not delete the note', 'Please try again.', 'error');
    } else {
      appAlert('Note deleted', '', 'success');
    }
  };

  const openNew = () => {
    setEditor({
      note: null,
      defaults: {
        folder_id: filter !== 'all' && filter !== 'favourites' && filter !== 'unfiled' ? filter : null,
        book: returnTo?.returnBook,
        chapter: returnTo?.returnChapter,
      },
    });
  };

  // ── UI ────────────────────────────────────────────────────────────
  const chips: { id: Filter; label: string; count: number; icon?: JSX.Element }[] = [
    { id: 'all', label: 'All', count: notes.length },
    { id: 'favourites', label: 'Favourites', count: notes.filter((n) => n.is_favorite).length, icon: <Star className="h-3.5 w-3.5" /> },
    ...folders.map((f) => ({ id: f.id, label: f.name, count: counts[f.id] || 0 })),
    { id: 'unfiled', label: 'No folder', count: notes.filter((n) => !n.folder_id).length },
  ];

  const sortLabel = sort === 'edited' ? 'Recently edited' : sort === 'created' ? 'Date created' : 'Title';

  const renderGrid = (list: NoteRecord[]) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          folders={folders}
          query={query}
          onOpen={(n) => setEditor({ note: n })}
          onToggleFavorite={(n) => patchNote(n, { is_favorite: !n.is_favorite })}
          onTogglePin={(n) => patchNote(n, { is_pinned: !n.is_pinned })}
          onMove={(n, folderId) => patchNote(n, { folder_id: folderId })}
          onDelete={setToDelete}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            {returnTo?.returnBook && (
              <button
                onClick={() => navigate(`/bible?book=${returnTo.returnBook}&chapter=${returnTo.returnChapter || 1}`)}
                className="-ml-2 flex h-9 items-center rounded-full pl-1 pr-3 text-sm font-medium text-blue-600 hover:bg-muted dark:text-blue-400"
              >
                <ChevronLeft className="h-5 w-5" /> Bible
              </button>
            )}
            <h1 className="flex-1 text-[28px] font-bold tracking-tight text-foreground">Notes</h1>
            <button
              onClick={openNew}
              className="hidden h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 active:scale-95 sm:flex"
            >
              <Plus className="h-4 w-4" /> New note
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes"
              className="h-11 w-full rounded-xl bg-muted/70 pl-10 pr-10 text-[16px] text-foreground outline-none ring-blue-500/30 placeholder:text-muted-foreground focus:ring-2"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setFilter(chip.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                  filter === chip.id ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {chip.icon}
                {chip.label}
                <span className={cn('text-xs', filter === chip.id ? 'opacity-70' : 'opacity-60')}>{chip.count}</span>
              </button>
            ))}
            <button
              onClick={() => setManageFolders(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <FolderCog className="h-4 w-4" /> Folders
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading && notes.length === 0 ? 'Loading…' : `${total} ${total === 1 ? 'note' : 'notes'}`}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                <ArrowUpDown className="h-4 w-4" /> {sortLabel}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <DropdownMenuRadioItem value="edited">Recently edited</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="created">Date created</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="title">Title (A–Z)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {loading && notes.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              {query ? <Search className="h-7 w-7" /> : <NotebookPen className="h-7 w-7" />}
            </div>
            <p className="mt-4 text-lg font-semibold text-foreground">
              {query ? 'No matching notes' : filter === 'all' ? 'Your notes will live here' : 'Nothing here yet'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {query
                ? 'Try a different word, verse or folder name.'
                : 'Write sermon notes, prayers and reflections. Everything saves automatically as you type.'}
            </p>
            {!query && (
              <button onClick={openNew} className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700">
                <Plus className="h-4 w-4" /> New note
              </button>
            )}
            {!query && filter === 'all' && (
              <button onClick={() => navigate('/bible')} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
                <BookOpen className="h-4 w-4" /> Or take notes while reading the Bible
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {visible.pinned.length > 0 && (
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pinned</p>
                {renderGrid(visible.pinned)}
              </section>
            )}
            {visible.others.length > 0 && (
              <section>
                {visible.pinned.length > 0 && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                )}
                {renderGrid(visible.others)}
              </section>
            )}
          </div>
        )}
      </div>

      {/* Mobile "new note" button */}
      <button
        onClick={openNew}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition active:scale-90 sm:hidden"
        aria-label="New note"
      >
        <Plus className="h-6 w-6" />
      </button>

      {user && (
        <NoteEditor
          open={!!editor}
          userId={user.id}
          note={editor?.note ?? null}
          defaults={editor?.defaults}
          folders={folders}
          onClose={() => setEditor(null)}
          onSaved={upsertLocal}
          onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
        />
      )}

      {user && (
        <FolderManager
          open={manageFolders}
          onOpenChange={setManageFolders}
          userId={user.id}
          folders={folders}
          counts={counts}
          onChanged={setFolders}
          onDeleted={(folderId) => {
            setNotes((prev) => prev.map((n) => (n.folder_id === folderId ? { ...n, folder_id: null } : n)));
            if (filter === folderId) setFilter('all');
          }}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>“{toDelete ? noteTitle(toDelete) : ''}” will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 hover:bg-red-700" onClick={() => toDelete && deleteNote(toDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BibleNotesPage;
