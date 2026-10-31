import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown, BookOpen, ChevronLeft, ChevronRight, FileText, Folder, FolderPlus, Inbox, MoreHorizontal,
  NotebookPen, Pencil, Plus, Search, Star, Trash2, X,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
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
import FolderDialog from '@/components/notes/FolderDialog';
import { folderColor, nextFolderColor } from '@/components/notes/folderColors';
import { htmlToText, noteTitle, type NoteRecord } from '@/components/notes/noteUtils';

/** What's open: the Notes home (folders), or a list of notes */
type View = 'all' | 'favourites' | 'unfiled' | string; // string = folder id
type Sort = 'edited' | 'created' | 'title';

const cacheKey = (userId: string) => `notes_cache_v2_${userId}`;
const foldersKey = (userId: string) => `notes_folders_v1_${userId}`;
const LISTS = ['all', 'favourites', 'unfiled'];

const readCache = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
};

const scrollToTop = () => {
  window.scrollTo(0, 0);
  document.getElementById('main-content')?.scrollTo(0, 0);
};

/**
 * Notes, like a phone's Notes app: the home shows All notes, Favourites,
 * Not in a folder and your folders (colour, name, how many); tap one to see its
 * notes. The open list is in the address (?view=…) so Back returns home.
 */
const BibleNotesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const [notes, setNotes] = useState<NoteRecord[]>(() => (user ? readCache(cacheKey(user.id), []) : []));
  const [folders, setFolders] = useState<BibleNoteFolder[]>(() => (user ? readCache(foldersKey(user.id), []) : []));
  const [loading, setLoading] = useState(notes.length === 0);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>(() => (localStorage.getItem('notes_sort') as Sort) || 'edited');
  const [editor, setEditor] = useState<{ note: NoteRecord | null; defaults?: NoteDraftDefaults } | null>(null);
  const [manageFolders, setManageFolders] = useState(false);
  // Making a folder (folder: null) or editing one
  const [folderDialog, setFolderDialog] = useState<{ folder: BibleNoteFolder | null } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<BibleNoteFolder | null>(null);
  const [toDelete, setToDelete] = useState<NoteRecord | null>(null);

  const nav = location.state as { returnBook?: string; returnChapter?: number; notesHome?: boolean } | null;
  const returnTo = nav?.returnBook ? nav : null;

  // ── Data ──────────────────────────────────────────────────────────
  const load = useCallback(async (quiet = false) => {
    if (!user) return;
    try {
      const [{ data, error }, folderList] = await Promise.all([
        supabase.from('bible_notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        bibleNotesService.getFolders(user.id).catch(() => null),
      ]);
      if (error) throw error;
      const list = (data || []) as unknown as NoteRecord[];
      setNotes(list);
      if (folderList) setFolders(folderList.map(({ notes: _notes, ...f }) => f));
      try {
        localStorage.setItem(cacheKey(user.id), JSON.stringify(list));
      } catch {
        /* storage full */
      }
    } catch (error) {
      console.error('Failed to load notes', error);
      if (!quiet) appAlert('Could not load your notes', 'Showing the copy saved on this device.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Notes and folders changed on your other phone or computer show here too (quietly)
  useLiveRefresh(
    user ? [{ table: 'bible_notes', filter: `user_id=eq.${user.id}` }, { table: 'bible_note_folders', filter: `user_id=eq.${user.id}` }] : [],
    () => load(true),
    { enabled: !!user },
  );

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(foldersKey(user.id), JSON.stringify(folders));
    } catch {
      /* storage full */
    }
  }, [user, folders]);

  useEffect(() => {
    localStorage.setItem('notes_sort', sort);
  }, [sort]);

  // ── Where we are ──────────────────────────────────────────────────
  const viewParam = params.get('view');
  const currentFolder = viewParam && !LISTS.includes(viewParam) ? folders.find((f) => f.id === viewParam) : undefined;
  // A folder that's gone (deleted on another phone) shows the home
  const view: View | null = viewParam && (LISTS.includes(viewParam) || currentFolder) ? viewParam : null;

  const openView = (next: View) => {
    setQuery('');
    setParams((p) => {
      const out = new URLSearchParams(p);
      out.set('view', next);
      return out;
    }, { state: { ...nav, notesHome: true } });
  };

  const goHome = () => {
    setQuery('');
    if (nav?.notesHome) {
      navigate(-1);
      return;
    }
    setParams((p) => {
      const out = new URLSearchParams(p);
      out.delete('view');
      return out;
    }, { replace: true, state: nav });
  };

  useEffect(scrollToTop, [view]);

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
    setParams(viewParam ? { view: viewParam } : {}, { replace: true, state: location.state });
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
  const favouriteCount = useMemo(() => notes.filter((n) => n.is_favorite).length, [notes]);
  const unfiledCount = useMemo(() => notes.filter((n) => !n.folder_id).length, [notes]);

  const q = query.trim().toLowerCase();
  const sorted = useMemo(() => {
    const matches = (n: NoteRecord) => !q || noteTitle(n).toLowerCase().includes(q) || htmlToText(n.note_text).toLowerCase().includes(q);
    return notes.filter(matches).sort((a, b) => {
      if (sort === 'title') return noteTitle(a).localeCompare(noteTitle(b), undefined, { numeric: true, sensitivity: 'base' });
      if (sort === 'created') return b.created_at.localeCompare(a.created_at);
      return (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at);
    });
  }, [notes, q, sort]);

  const inView = useMemo(() => {
    const list = sorted.filter((n) => {
      if (view === 'favourites') return n.is_favorite;
      if (view === 'unfiled') return !n.folder_id;
      if (currentFolder) return n.folder_id === currentFolder.id;
      return true;
    });
    return { pinned: list.filter((n) => n.is_pinned), others: list.filter((n) => !n.is_pinned) };
  }, [sorted, view, currentFolder]);
  const total = inView.pinned.length + inView.others.length;

  const recent = useMemo(
    () => [...notes].sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at)).slice(0, 3),
    [notes],
  );
  const matchingFolders = q ? folders.filter((f) => f.name.toLowerCase().includes(q)) : [];
  const deleteCount = folderToDelete ? counts[folderToDelete.id] ?? 0 : 0;

  const viewInfo = (() => {
    if (view === 'favourites') return { name: 'Favourites', count: favouriteCount, tile: <ListTile kind="favourites" size="lg" /> };
    if (view === 'unfiled') return { name: 'Not in a folder', count: unfiledCount, tile: <ListTile kind="unfiled" size="lg" /> };
    if (currentFolder) return { name: currentFolder.name, count: counts[currentFolder.id] || 0, tile: <FolderTile folder={currentFolder} folders={folders} size="lg" /> };
    return { name: 'All notes', count: notes.length, tile: <ListTile kind="all" size="lg" /> };
  })();

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

  const saveFolder = async (name: string, color: string) => {
    if (!user || !folderDialog) return;
    const editing = folderDialog.folder;
    if (!editing) {
      try {
        const folder = await bibleNotesService.createFolder(user.id, name, null, color);
        setFolders((prev) => [...prev, { ...folder, color: folder.color ?? color }]);
      } catch (error) {
        appAlert('Could not create the folder', 'Please try again.', 'error');
        throw error;
      }
      return;
    }
    const before = folders;
    setFolders((prev) => prev.map((f) => (f.id === editing.id ? { ...f, name, color } : f)));
    try {
      await bibleNotesService.updateFolder(editing.id, { name, color });
    } catch (error) {
      setFolders(before);
      appAlert('Could not save the folder', 'Please try again.', 'error');
      throw error;
    }
  };

  const deleteFolder = async () => {
    const folder = folderToDelete;
    setFolderToDelete(null);
    if (!folder) return;
    try {
      await bibleNotesService.deleteFolder(folder.id);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      // Its notes are kept, out of any folder
      setNotes((prev) => prev.map((n) => (n.folder_id === folder.id ? { ...n, folder_id: null } : n)));
      if (view === folder.id) goHome();
    } catch {
      appAlert('Could not delete the folder', 'Please try again.', 'error');
    }
  };

  const openNew = () => {
    setEditor({
      note: null,
      defaults: {
        folder_id: currentFolder?.id ?? null,
        book: returnTo?.returnBook,
        chapter: returnTo?.returnChapter,
      },
    });
  };

  // ── UI ────────────────────────────────────────────────────────────
  const sortLabel = sort === 'edited' ? 'Recently edited' : sort === 'created' ? 'Date created' : 'Title';

  const renderGrid = (list: NoteRecord[]) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          folders={folders}
          query={query}
          showFolder={!currentFolder}
          onOpen={(n) => setEditor({ note: n })}
          onToggleFavorite={(n) => patchNote(n, { is_favorite: !n.is_favorite })}
          onTogglePin={(n) => patchNote(n, { is_pinned: !n.is_pinned })}
          onMove={(n, folderId) => patchNote(n, { folder_id: folderId })}
          onDelete={setToDelete}
        />
      ))}
    </div>
  );

  const searchBox = (placeholder: string) => (
    <div className="relative mt-3">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl bg-muted/70 pl-10 pr-10 text-[16px] text-foreground outline-none ring-blue-500/30 placeholder:text-muted-foreground focus:ring-2 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted" aria-label="Clear search">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const newNoteButton = (
    <button
      onClick={openNew}
      className="hidden h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 active:scale-95 sm:flex"
    >
      <Plus className="h-4 w-4" /> New note
    </button>
  );

  const sortMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
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
  );

  const folderRows = (list: BibleNoteFolder[]) => (
    <RowGroup>
      {list.map((folder) => (
        <Row
          key={folder.id}
          tile={<FolderTile folder={folder} folders={folders} />}
          label={folder.name}
          count={counts[folder.id] || 0}
          onClick={() => openView(folder.id)}
        />
      ))}
    </RowGroup>
  );

  const home = (
    <div className="mx-auto max-w-2xl">
      {q ? (
        <div className="space-y-6">
          {matchingFolders.length > 0 && (
            <section>
              <SectionTitle>Folders</SectionTitle>
              {folderRows(matchingFolders)}
            </section>
          )}
          <section>
            <SectionTitle>{sorted.length === 0 ? 'No matching notes' : sorted.length === 1 ? '1 note' : `${sorted.length} notes`}</SectionTitle>
            {sorted.length > 0 ? renderGrid(sorted) : (
              <p className="text-sm text-muted-foreground">Try a different word, verse or folder name.</p>
            )}
          </section>
        </div>
      ) : (
        <>
          <RowGroup>
            <Row tile={<ListTile kind="all" />} label="All notes" count={notes.length} onClick={() => openView('all')} />
            <Row tile={<ListTile kind="favourites" />} label="Favourites" count={favouriteCount} onClick={() => openView('favourites')} />
            <Row tile={<ListTile kind="unfiled" />} label="Not in a folder" count={unfiledCount} onClick={() => openView('unfiled')} />
          </RowGroup>

          <div className="mt-6 flex items-center gap-1">
            <h2 className="flex-1 text-[19px] font-bold tracking-tight text-foreground">My folders</h2>
            {folders.length > 0 && (
              <button onClick={() => setManageFolders(true)} className="h-10 rounded-full px-3 text-[15px] font-semibold text-blue-600 hover:bg-muted dark:text-blue-400">
                Edit
              </button>
            )}
            <button
              onClick={() => setFolderDialog({ folder: null })}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-blue-50 px-3.5 text-[15px] font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95 dark:bg-blue-950/60 dark:text-blue-300"
            >
              <FolderPlus className="h-[18px] w-[18px]" /> New folder
            </button>
          </div>
          <div className="mt-2">
            {folders.length > 0 ? folderRows(folders) : (
              <button
                onClick={() => setFolderDialog({ folder: null })}
                className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-4 text-left transition hover:bg-muted/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <FolderPlus className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">Make your first folder</span>
                  <span className="block text-sm text-muted-foreground">Keep notes together, e.g. Sunday services or Bible study.</span>
                </span>
              </button>
            )}
          </div>

          {recent.length > 0 && (
            <section className="mt-7">
              <div className="mb-2 flex items-center">
                <h2 className="flex-1 text-[19px] font-bold tracking-tight text-foreground">Recent</h2>
                <button onClick={() => openView('all')} className="h-10 rounded-full px-3 text-[15px] font-semibold text-blue-600 hover:bg-muted dark:text-blue-400">
                  See all
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {recent.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    folders={folders}
                    query=""
                    onOpen={(n) => setEditor({ note: n })}
                    onToggleFavorite={(n) => patchNote(n, { is_favorite: !n.is_favorite })}
                    onTogglePin={(n) => patchNote(n, { is_pinned: !n.is_pinned })}
                    onMove={(n, folderId) => patchNote(n, { folder_id: folderId })}
                    onDelete={setToDelete}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );

  const emptyList = (() => {
    if (q) return { icon: <Search className="h-7 w-7" />, title: 'No matching notes', text: 'Try a different word or verse.' };
    if (view === 'favourites') return { icon: <Star className="h-7 w-7" />, title: 'No favourites yet', text: 'Tap the star on a note to keep it here.' };
    if (view === 'unfiled') return { icon: <Inbox className="h-7 w-7" />, title: 'Every note is in a folder', text: 'Notes you haven’t put in a folder show here.' };
    if (currentFolder) return { icon: <Folder className="h-7 w-7" />, title: 'Nothing in this folder yet', text: 'Tap + to write a note here, or move one in from its ⋯ menu.' };
    return { icon: <NotebookPen className="h-7 w-7" />, title: 'Your notes will live here', text: 'Write sermon notes, prayers and reflections. Everything saves automatically as you type.' };
  })();

  const list = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{q ? `${total} found` : ''}</p>
        {sortMenu}
      </div>
      {loading && notes.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">{emptyList.icon}</div>
          <p className="mt-4 text-lg font-semibold text-foreground">{emptyList.title}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{emptyList.text}</p>
          {!q && view !== 'favourites' && view !== 'unfiled' && (
            <button onClick={openNew} className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700">
              <Plus className="h-4 w-4" /> New note
            </button>
          )}
          {!q && view === 'all' && (
            <button onClick={() => navigate('/bible')} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
              <BookOpen className="h-4 w-4" /> Or take notes while reading the Bible
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {inView.pinned.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pinned</p>
              {renderGrid(inView.pinned)}
            </section>
          )}
          {inView.others.length > 0 && (
            <section>
              {inView.pinned.length > 0 && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
              )}
              {renderGrid(inView.others)}
            </section>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className={cn('mx-auto px-4 pb-3', view ? 'max-w-6xl pt-1.5' : 'max-w-2xl pt-4')}>
          {view ? (
            <>
              <div className="flex h-11 items-center gap-2">
                <button
                  onClick={goHome}
                  className="-ml-2 flex h-11 items-center pr-3 text-[16px] font-medium text-blue-600 dark:text-blue-400"
                >
                  <ChevronLeft className="h-6 w-6" /> Notes
                </button>
                <span className="flex-1" />
                {currentFolder && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Folder options">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl">
                      <DropdownMenuItem onClick={() => setFolderDialog({ folder: currentFolder })} className="gap-2 p-2.5">
                        <Pencil className="h-4 w-4" /> Rename or change colour
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFolderToDelete(currentFolder)} className="gap-2 p-2.5 text-red-600 focus:text-red-600">
                        <Trash2 className="h-4 w-4" /> Delete folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {newNoteButton}
              </div>
              <div className="mt-1 flex items-center gap-3">
                {viewInfo.tile}
                <div className="min-w-0">
                  <h1 className="[overflow-wrap:anywhere] text-[26px] font-bold leading-tight tracking-tight text-foreground">{viewInfo.name}</h1>
                  <p className="text-sm text-muted-foreground">{viewInfo.count === 1 ? '1 note' : `${viewInfo.count} notes`}</p>
                </div>
              </div>
              {searchBox(view === 'all' ? 'Search all notes' : `Search in ${viewInfo.name}`)}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {returnTo && (
                  <button
                    onClick={() => navigate(`/bible?book=${returnTo.returnBook}&chapter=${returnTo.returnChapter || 1}`)}
                    className="-ml-2 flex h-9 items-center rounded-full pl-1 pr-3 text-sm font-medium text-blue-600 hover:bg-muted dark:text-blue-400"
                  >
                    <ChevronLeft className="h-5 w-5" /> Bible
                  </button>
                )}
                <h1 className="flex-1 text-[28px] font-bold tracking-tight text-foreground">Notes</h1>
                {newNoteButton}
              </div>
              {searchBox('Search notes and folders')}
            </>
          )}
        </div>
      </div>

      <div className={cn('mx-auto px-4 pb-32 pt-4', view ? 'max-w-6xl' : 'max-w-2xl')}>{view ? list : home}</div>

      {/* Mobile "new note" button */}
      <button
        onClick={openNew}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition active:scale-90 sm:hidden"
        aria-label={currentFolder ? `New note in ${currentFolder.name}` : 'New note'}
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

      <FolderManager
        open={manageFolders}
        onOpenChange={setManageFolders}
        folders={folders}
        counts={counts}
        onChanged={setFolders}
        onEdit={(folder) => setFolderDialog({ folder })}
        onDelete={setFolderToDelete}
        onCreate={() => setFolderDialog({ folder: null })}
      />

      <FolderDialog
        open={!!folderDialog}
        onOpenChange={(open) => !open && setFolderDialog(null)}
        initial={folderDialog?.folder ? { name: folderDialog.folder.name, color: folderColor(folderDialog.folder, folders).id } : undefined}
        defaultColor={nextFolderColor(folders)}
        onSave={saveFolder}
      />

      <AlertDialog open={!!folderToDelete} onOpenChange={(o) => !o && setFolderToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{folderToDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCount === 0
                ? 'The folder is removed. It has no notes.'
                : deleteCount === 1
                  ? 'The folder is removed. Its note is kept and moves to “Not in a folder”.'
                  : `The folder is removed. Its ${deleteCount} notes are kept and move to “Not in a folder”.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 hover:bg-red-700" onClick={deleteFolder}>Delete folder</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

// ── Pieces ──────────────────────────────────────────────────────────

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-2 text-[15px] font-semibold text-muted-foreground">{children}</h2>
);

/** A rounded card of rows, like a phone's settings */
const RowGroup = ({ children }: { children: ReactNode }) => (
  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card [&>*+*]:border-t [&>*+*]:border-border/50">{children}</div>
);

const Row = ({ tile, label, count, onClick }: { tile: ReactNode; label: string; count: number; onClick: () => void }) => (
  <button onClick={onClick} className="flex h-[52px] w-full items-center gap-3 px-3.5 text-left transition hover:bg-muted/50 active:bg-muted">
    {tile}
    <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-foreground">{label}</span>
    <span className="text-[15px] tabular-nums text-muted-foreground">{count}</span>
    <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" />
  </button>
);

const TILE_SIZE = { md: 'h-8 w-8 rounded-[9px]', lg: 'h-12 w-12 rounded-[14px]' };
const ICON_SIZE = { md: 'h-[18px] w-[18px]', lg: 'h-6 w-6' };

const ListTile = ({ kind, size = 'md' }: { kind: 'all' | 'favourites' | 'unfiled'; size?: 'md' | 'lg' }) => {
  const look = {
    all: { tile: 'bg-slate-900 dark:bg-slate-100', icon: <FileText className={cn(ICON_SIZE[size], 'text-white dark:text-slate-900')} /> },
    favourites: { tile: 'bg-amber-100 dark:bg-amber-500/20', icon: <Star className={cn(ICON_SIZE[size], 'fill-current text-amber-500')} /> },
    unfiled: { tile: 'bg-slate-100 dark:bg-slate-500/25', icon: <Inbox className={cn(ICON_SIZE[size], 'text-slate-600 dark:text-slate-300')} /> },
  }[kind];
  return <span className={cn('flex shrink-0 items-center justify-center', TILE_SIZE[size], look.tile)} aria-hidden="true">{look.icon}</span>;
};

const FolderTile = ({ folder, folders, size = 'md' }: { folder: BibleNoteFolder; folders: BibleNoteFolder[]; size?: 'md' | 'lg' }) => {
  const color = folderColor(folder, folders);
  return (
    <span className={cn('flex shrink-0 items-center justify-center', TILE_SIZE[size], color.tile)} aria-hidden="true">
      <Folder className={cn(ICON_SIZE[size], 'fill-current', color.icon)} />
    </span>
  );
};

export default BibleNotesPage;
