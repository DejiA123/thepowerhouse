import { ArrowDown, ArrowUp, Folder, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { bibleNotesService, type BibleNoteFolder } from '@/services/bibleNotesService';
import { folderColor } from './folderColors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: BibleNoteFolder[];
  counts: Record<string, number>;
  onChanged: (folders: BibleNoteFolder[]) => void;
  /** Rename or recolour (FolderDialog) */
  onEdit: (folder: BibleNoteFolder) => void;
  /** Ask, then delete (the page's confirmation, shared with the folder's own menu) */
  onDelete: (folder: BibleNoteFolder) => void;
  onCreate: () => void;
}

/** "Edit" beside My folders: put the folders in order, rename, recolour or delete them. */
const FolderManager = ({ open, onOpenChange, folders, counts, onChanged, onEdit, onDelete, onCreate }: Props) => {
  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= folders.length) return;
    const next = [...folders];
    [next[index], next[target]] = [next[target], next[index]];
    // A folder keeps its colour when it moves (unsaved colours follow the order)
    const colored = next.map((f) => (f.color ? f : { ...f, color: folderColor(f, folders).id }));
    onChanged(colored);
    try {
      await bibleNotesService.updateFolderOrder(colored.map((f, i) => ({ id: f.id, sort_order: i + 1 })));
    } catch {
      onChanged(folders);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
        <DialogHeader className="px-5 pb-3 pt-5 text-left">
          <DialogTitle>Edit folders</DialogTitle>
          <DialogDescription>Change their order, name or colour. Deleting a folder keeps its notes.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {folders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No folders yet.</p>
          ) : (
            folders.map((folder, i) => {
              const color = folderColor(folder, folders);
              return (
                <div key={folder.id} className="flex items-center gap-1 rounded-xl px-2 py-1.5 hover:bg-muted/60">
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]', color.tile)}>
                    <Folder className={cn('h-[18px] w-[18px] fill-current', color.icon)} />
                  </span>
                  <div className="min-w-0 flex-1 px-2">
                    <p className="truncate font-medium text-foreground">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">{(counts[folder.id] ?? 0) === 1 ? '1 note' : `${counts[folder.id] ?? 0} notes`}</p>
                  </div>
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label={`Move ${folder.name} up`}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === folders.length - 1} className="rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label={`Move ${folder.name} down`}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => onEdit(folder)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label={`Rename or recolour ${folder.name}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(folder)} className="rounded-full p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" aria-label={`Delete ${folder.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border p-4">
          <Button onClick={onCreate} variant="outline" className="h-11 w-full gap-2 rounded-full text-blue-700 dark:text-blue-300">
            <FolderPlus className="h-4 w-4" /> New folder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolderManager;
