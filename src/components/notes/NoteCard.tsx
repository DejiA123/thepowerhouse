import { memo } from 'react';
import { Folder, MoreHorizontal, Pin, PinOff, Star, Trash2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { BibleNoteFolder } from '@/services/bibleNotesService';
import { notePreview, noteTitle, relativeDate, type NoteRecord } from './noteUtils';

interface Props {
  note: NoteRecord;
  folders: BibleNoteFolder[];
  query: string;
  onOpen: (note: NoteRecord) => void;
  onToggleFavorite: (note: NoteRecord) => void;
  onTogglePin: (note: NoteRecord) => void;
  onMove: (note: NoteRecord, folderId: string | null) => void;
  onDelete: (note: NoteRecord) => void;
}

/** Highlights search matches without using innerHTML. */
const Highlighted = ({ text, query }: { text: string; query: string }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-700/60">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
};

const NoteCard = ({ note, folders, query, onOpen, onToggleFavorite, onTogglePin, onMove, onDelete }: Props) => {
  const title = noteTitle(note);
  const preview = notePreview(note);
  const folder = folders.find((f) => f.id === note.folder_id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(note)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(note)}
      className="group relative flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-card p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md active:scale-[0.99] dark:hover:border-blue-800"
    >
      <div className="flex items-start gap-2">
        <h3 className="line-clamp-2 flex-1 text-[16px] font-semibold leading-snug text-foreground">
          <Highlighted text={title} query={query} />
        </h3>
        <div className="-mr-2 -mt-1 flex shrink-0 items-center">
          {note.is_pinned && <Pin className="mx-1 h-3.5 w-3.5 text-muted-foreground" />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(note);
            }}
            className={cn('rounded-full p-1.5 transition hover:bg-muted', note.is_favorite ? 'text-amber-500' : 'text-muted-foreground/50 hover:text-muted-foreground')}
            aria-label={note.is_favorite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Star className={cn('h-4 w-4', note.is_favorite && 'fill-current')} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Note options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onTogglePin(note)}>
                {note.is_pinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                {note.is_pinned ? 'Unpin' : 'Pin to top'}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Folder className="mr-2 h-4 w-4" /> Move to folder
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Folder</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={note.folder_id ?? 'none'} onValueChange={(v) => onMove(note, v === 'none' ? null : v)}>
                    <DropdownMenuRadioItem value="none">No folder</DropdownMenuRadioItem>
                    {folders.map((f) => (
                      <DropdownMenuRadioItem key={f.id} value={f.id}>{f.name}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(note)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {preview ? (
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          <Highlighted text={preview} query={query} />
        </p>
      ) : (
        <p className="mt-1.5 text-sm italic text-muted-foreground/60">No additional text</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span>{relativeDate(note.updated_at || note.created_at)}</span>
        {folder && (
          <span className="inline-flex items-center gap-1">
            <Folder className="h-3.5 w-3.5" /> {folder.name}
          </span>
        )}
      </div>
    </div>
  );
};

export default memo(NoteCard);
