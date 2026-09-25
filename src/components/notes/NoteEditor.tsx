import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import {
  AlertCircle, Check, ChevronLeft, Cloud, FileDown, FileText, Folder, Loader2, MoreHorizontal, Pin, PinOff, Star, Trash2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import type { BibleNoteFolder } from '@/services/bibleNotesService';
import { useIsMobile } from '@/hooks/use-mobile';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import FolderMenuSection from './FolderMenuSection';
import NoteRichEditor from './NoteRichEditor';
import NoteToolbar from './NoteToolbar';
import { exportNotePdf, exportNoteWord, isBlankHtml, relativeDate, type NoteRecord } from './noteUtils';

export interface NoteDraftDefaults {
  book?: string;
  chapter?: number;
  verse?: number | null;
  folder_id?: string | null;
  title?: string;
  /** Starting HTML for a new note, e.g. the verses being written about */
  body?: string;
}

interface Props {
  open: boolean;
  userId: string;
  /** Existing note to edit; null to write a new one */
  note: NoteRecord | null;
  defaults?: NoteDraftDefaults;
  folders: BibleNoteFolder[];
  onClose: () => void;
  onSaved: (note: NoteRecord) => void;
  onDeleted: (id: string) => void;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 700;
const draftKey = (userId: string, id: string | null) => `note_draft_${userId}_${id ?? 'new'}`;

/** Size the editor to the visible area so the toolbar sits right above the iPhone keyboard. */
function useVisualViewport(active: boolean) {
  const [box, setBox] = useState<{ height: number; top: number; keyboard: boolean } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const update = () =>
      setBox({ height: vv.height, top: vv.offsetTop, keyboard: window.innerHeight - vv.height > 150 });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [active]);
  return box;
}

const NoteEditor = ({ open, userId, note, defaults, folders, onClose, onSaved, onDeleted }: Props) => {
  const isMobile = useIsMobile();
  const [session, setSession] = useState(0);
  const [initialHtml, setInitialHtml] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);

  const html = useRef('');
  const latest = useRef({ title, folderId, favorite, pinned });
  latest.current = { title, folderId, favorite, pinned };
  const noteIdRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const saving = useRef<Promise<void> | null>(null);
  const dirty = useRef(false);
  /** Set only by genuine user input — nothing is ever saved without it. */
  const userEdited = useRef(false);
  /** The person has touched/typed in this note since it opened. */
  const interacted = useRef(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const passage = useRef({ book: 'genesis', chapter: 1, verse: null as number | null });
  const box = useVisualViewport(open);

  // Load the note (or a blank draft) each time the editor opens
  useEffect(() => {
    if (!open) return;
    let body = note?.note_text ?? defaults?.body ?? '';
    let startTitle = note?.title ?? defaults?.title ?? '';
    let recovered = false;
    try {
      const saved = localStorage.getItem(draftKey(userId, note?.id ?? null));
      if (saved) {
        const draft = JSON.parse(saved);
        const newer = !note || new Date(draft.at) > new Date(note.updated_at);
        if (typeof draft.html === 'string' && newer && (draft.html !== body || draft.title !== startTitle)) {
          body = draft.html;
          if (typeof draft.title === 'string') startTitle = draft.title;
          recovered = true;
        }
      }
    } catch {
      /* ignore bad drafts */
    }

    passage.current = {
      book: note?.book ?? defaults?.book ?? 'genesis',
      chapter: note?.chapter ?? defaults?.chapter ?? 1,
      verse: note?.verse ?? defaults?.verse ?? null,
    };
    html.current = body;
    noteIdRef.current = note?.id ?? null;
    setNoteId(note?.id ?? null);
    setInitialHtml(body);
    setTitle(startTitle);
    setFolderId(note?.folder_id ?? defaults?.folder_id ?? null);
    setFavorite(!!note?.is_favorite);
    setPinned(!!note?.is_pinned);
    setUpdatedAt(note?.updated_at ?? null);
    setEditor(null);
    // A recovered offline draft counts as the user's edit and needs saving
    userEdited.current = recovered;
    interacted.current = false;
    dirty.current = recovered;
    setSaveState(recovered ? 'dirty' : 'idle');
    setSession((s) => s + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, note?.id]);

  // New notes start with the cursor in the title
  useEffect(() => {
    if (open && !note) setTimeout(() => titleRef.current?.focus(), 200);
  }, [open, note, session]);

  const persist = useCallback(async () => {
    if (!dirty.current || !userEdited.current) return;
    const snapshot = { ...latest.current, html: html.current };
    const id = noteIdRef.current;

    // A brand-new note with nothing in it is simply not created
    if (!id && isBlankHtml(snapshot.html) && !snapshot.title.trim()) {
      dirty.current = false;
      setSaveState('idle');
      return;
    }

    dirty.current = false;
    setSaveState('saving');
    const now = new Date().toISOString();
    const fields = {
      title: snapshot.title.trim() || null,
      note_text: snapshot.html,
      folder_id: snapshot.folderId,
      is_favorite: snapshot.favorite,
      is_pinned: snapshot.pinned,
      updated_at: now,
    };

    try {
      const { data, error } = id
        ? await supabase.from('bible_notes').update(fields).eq('id', id).eq('user_id', userId).select().single()
        : await supabase
          .from('bible_notes')
          .insert({
            ...fields,
            user_id: userId,
            book: passage.current.book,
            chapter: passage.current.chapter,
            verse: passage.current.verse,
            category: 'insight',
            is_private: false,
          })
          .select()
          .single();
      if (error) throw error;
      const saved = data as unknown as NoteRecord;
      if (!id) {
        localStorage.removeItem(draftKey(userId, null));
        noteIdRef.current = saved.id;
        setNoteId(saved.id);
      }
      localStorage.removeItem(draftKey(userId, saved.id));
      setUpdatedAt(saved.updated_at);
      setSaveState(dirty.current ? 'dirty' : 'saved');
      onSaved(saved);
    } catch (error) {
      console.error('Note save failed', error);
      dirty.current = true;
      setSaveState('error');
      try {
        localStorage.setItem(draftKey(userId, id), JSON.stringify({ html: snapshot.html, title: snapshot.title, at: now }));
      } catch {
        /* storage full */
      }
    }
  }, [userId, onSaved]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current) await saving.current;
    saving.current = persist();
    await saving.current;
    saving.current = null;
  }, [persist]);

  const markEdited = useCallback(() => {
    userEdited.current = true;
    dirty.current = true;
    setSaveState('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      flush();
    }, AUTOSAVE_MS);
  }, [flush]);

  // Save when the app is backgrounded or closed
  useEffect(() => {
    if (!open) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [open, flush]);

  const close = useCallback(async () => {
    editor?.commands.blur();
    await flush();
    onClose();
  }, [editor, flush, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flush();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, flush]);

  const doDelete = async () => {
    setConfirmDelete(false);
    clearTimeout(timer.current);
    dirty.current = false;
    const id = noteIdRef.current;
    if (id) {
      const { error } = await supabase.from('bible_notes').delete().eq('id', id).eq('user_id', userId);
      if (error) {
        appAlert('Could not delete the note', 'Please try again.', 'error');
        return;
      }
      localStorage.removeItem(draftKey(userId, id));
      onDeleted(id);
      appAlert('Note deleted', '', 'success');
    }
    localStorage.removeItem(draftKey(userId, null));
    onClose();
  };

  const record = (): NoteRecord => ({
    id: noteId ?? 'draft',
    user_id: userId,
    book: passage.current.book,
    chapter: passage.current.chapter,
    verse: passage.current.verse,
    title,
    note_text: html.current,
    folder_id: folderId,
    is_favorite: favorite,
    is_pinned: pinned,
    created_at: note?.created_at ?? new Date().toISOString(),
    updated_at: updatedAt ?? new Date().toISOString(),
  });

  if (!open) return null;

  const folderName = folders.find((f) => f.id === folderId)?.name;
  const status =
    saveState === 'saving' ? { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: 'Saving…' }
      : saveState === 'saved' ? { icon: <Check className="h-3.5 w-3.5" />, text: 'Saved' }
        : saveState === 'error' ? { icon: <AlertCircle className="h-3.5 w-3.5" />, text: 'Not saved · tap to retry' }
          : saveState === 'dirty' ? { icon: <Cloud className="h-3.5 w-3.5" />, text: 'Editing…' }
            : updatedAt ? { icon: null, text: `Edited ${relativeDate(updatedAt)}` } : { icon: null, text: 'New note' };

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[9990] flex flex-col bg-background animate-in fade-in duration-150"
      style={{ height: box ? `${box.height}px` : '100dvh', transform: box?.top ? `translateY(${box.top}px)` : undefined }}
      role="dialog"
      aria-label={noteId ? 'Edit note' : 'New note'}
      onPointerDownCapture={() => (interacted.current = true)}
      onKeyDownCapture={() => (interacted.current = true)}
      onPasteCapture={() => (interacted.current = true)}
      onDropCapture={() => (interacted.current = true)}
    >
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-1 border-b border-border/60 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <button onClick={close} className="flex h-10 items-center gap-0.5 rounded-full pl-1 pr-3 font-medium text-blue-600 hover:bg-muted dark:text-blue-400">
          <ChevronLeft className="h-6 w-6" /> Notes
        </button>
        <button
          onClick={() => saveState === 'error' && flush()}
          className={cn(
            'mx-auto flex min-w-0 items-center gap-1.5 truncate rounded-full px-2 py-1 text-xs',
            saveState === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'text-muted-foreground',
          )}
        >
          {status.icon}
          {status.text}
        </button>
        <button
          onClick={() => {
            setFavorite((v) => !v);
            markEdited();
          }}
          className={cn('flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted', favorite ? 'text-amber-500' : 'text-muted-foreground')}
          aria-label={favorite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Star className={cn('h-5 w-5', favorite && 'fill-current')} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label="More options">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[9999] w-60 rounded-xl">
            <DropdownMenuItem onClick={() => { setPinned((v) => !v); markEdited(); }}>
              {pinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
              {pinned ? 'Unpin from top' : 'Pin to top'}
            </DropdownMenuItem>
            <FolderMenuSection
              folders={folders}
              value={folderId}
              onChange={(id) => {
                setFolderId(id);
                markEdited();
              }}
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportNotePdf(record())}>
              <FileDown className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportNoteWord(record())}>
              <FileText className="mr-2 h-4 w-4" /> Download Word
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button onClick={close} className="ml-1 h-9 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
          Done
        </button>
      </header>

      {!isMobile && <NoteToolbar editor={editor} placement="top" />}

      {/* Title + body scroll together, like Apple Notes */}
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        onClick={(e) => {
          // Tapping the empty space below the text puts the cursor at the end
          if (e.target === e.currentTarget) editor?.chain().focus('end').run();
        }}
      >
        <div className="mx-auto w-full max-w-3xl px-5 pt-4" onClick={(e) => e.stopPropagation()}>
          <textarea
            ref={titleRef}
            value={title}
            rows={1}
            onChange={(e) => {
              setTitle(e.target.value.replace(/\n/g, ' '));
              markEdited();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                editor?.chain().focus('start').run();
              }
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
            enterKeyHint="next"
            placeholder="Title"
            className="w-full resize-none bg-transparent text-[26px] font-bold leading-tight text-foreground outline-none placeholder:text-muted-foreground/50"
          />
          {(folderName || pinned) && (
            <div className="mb-1 mt-1 flex flex-wrap items-center gap-2">
              {folderName && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Folder className="h-3.5 w-3.5" /> {folderName}
                </span>
              )}
              {pinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Pin className="h-3.5 w-3.5" /> Pinned
                </span>
              )}
            </div>
          )}
          <div className="pt-2">
            <NoteRichEditor
              key={session}
              initialContent={initialHtml}
              onEditorReady={setEditor}
              onChange={(value) => {
                // Ignore anything that wasn't caused by the person using the note
                if (!interacted.current) return;
                html.current = value;
                markEdited();
              }}
            />
          </div>
        </div>
      </div>

      {isMobile && <NoteToolbar editor={editor} placement="bottom" keyboardOpen={!!box?.keyboard} />}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="z-[10000] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>“{title.trim() || 'Untitled note'}” will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 hover:bg-red-700" onClick={doDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>,
    document.body,
  );
};

export default NoteEditor;
