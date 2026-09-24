import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, FolderPlus, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { appAlert } from '@/lib/appAlert';
import { bibleNotesService, type BibleNoteFolder } from '@/services/bibleNotesService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  folders: BibleNoteFolder[];
  counts: Record<string, number>;
  onChanged: (folders: BibleNoteFolder[]) => void;
  onDeleted: (folderId: string) => void;
}

const FolderManager = ({ open, onOpenChange, userId, folders, counts, onChanged, onDeleted }: Props) => {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [toDelete, setToDelete] = useState<BibleNoteFolder | null>(null);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const folder = await bibleNotesService.createFolder(userId, name);
      onChanged([...folders, folder]);
      setNewName('');
    } catch {
      appAlert('Could not create the folder', 'Please try again.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const rename = async (folder: BibleNoteFolder) => {
    const name = editName.trim();
    setEditingId(null);
    if (!name || name === folder.name) return;
    onChanged(folders.map((f) => (f.id === folder.id ? { ...f, name } : f)));
    try {
      await bibleNotesService.updateFolder(folder.id, { name });
    } catch {
      onChanged(folders);
      appAlert('Could not rename the folder', '', 'error');
    }
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= folders.length) return;
    const next = [...folders];
    [next[index], next[target]] = [next[target], next[index]];
    onChanged(next);
    try {
      await bibleNotesService.updateFolderOrder(next.map((f, i) => ({ id: f.id, sort_order: i + 1 })));
    } catch {
      onChanged(folders);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    const folder = toDelete;
    setToDelete(null);
    try {
      await bibleNotesService.deleteFolder(folder.id);
      onChanged(folders.filter((f) => f.id !== folder.id));
      onDeleted(folder.id);
    } catch {
      appAlert('Could not delete the folder', '', 'error');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
          <DialogHeader className="px-5 pb-3 pt-5 text-left">
            <DialogTitle>Folders</DialogTitle>
            <DialogDescription>Organise your notes. Deleting a folder keeps its notes.</DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 px-5 pb-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="New folder name"
              className="h-11 rounded-xl"
            />
            <Button onClick={create} disabled={!newName.trim() || creating} className="h-11 rounded-xl px-4">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
            {folders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No folders yet.</p>
            ) : (
              folders.map((folder, i) => (
                <div key={folder.id} className="flex items-center gap-1 rounded-xl px-2 py-1.5 hover:bg-muted/60">
                  {editingId === folder.id ? (
                    <>
                      <Input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') rename(folder);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="h-9 flex-1 rounded-lg"
                      />
                      <button onClick={() => rename(folder)} className="rounded-full p-2 text-blue-600 hover:bg-muted" aria-label="Save name">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Cancel">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1 px-1">
                        <p className="truncate font-medium text-foreground">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">{counts[folder.id] ?? 0} notes</p>
                      </div>
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Move up">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => move(i, 1)} disabled={i === folders.length - 1} className="rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Move down">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(folder.id);
                          setEditName(folder.name);
                        }}
                        className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                        aria-label="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setToDelete(folder)} className="rounded-full p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" aria-label="Delete folder">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The folder is removed. Its {counts[toDelete?.id ?? ''] ?? 0} notes are kept and moved to “No folder”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 hover:bg-red-700" onClick={remove}>Delete folder</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FolderManager;
