import { useEffect, useState } from 'react';
import { Check, Folder, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FOLDER_COLORS } from './folderColors';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing this folder; none: making a new one */
  initial?: { name: string; color: string };
  /** The colour a new folder starts with */
  defaultColor: string;
  onSave: (name: string, color: string) => Promise<void>;
}

/** New folder, or a folder's name and colour. */
const FolderDialog = ({ open, onOpenChange, initial, defaultColor, onSave }: Props) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(defaultColor);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setColor(initial?.color ?? defaultColor);
    // Only when it opens: not as the folder list changes behind it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(name.trim(), color);
      onOpenChange(false);
    } catch {
      /* onSave has said what went wrong: stay open to try again */
    } finally {
      setSaving(false);
    }
  };

  const picked = FOLDER_COLORS.find((c) => c.id === color) ?? FOLDER_COLORS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-3xl p-0 sm:max-w-sm">
        <DialogHeader className="px-5 pb-2 pt-5 text-left">
          <DialogTitle>{initial ? 'Edit folder' : 'New folder'}</DialogTitle>
          <DialogDescription>{initial ? 'Change its name or colour.' : 'Give it a name and a colour.'}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-5 px-5 pb-5 pt-3"
        >
          <div className="flex items-center gap-3">
            <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors', picked.tile)}>
              <Folder className={cn('h-6 w-6 fill-current', picked.icon)} />
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name, e.g. Sunday services"
              aria-label="Folder name"
              maxLength={60}
              autoFocus
              enterKeyHint="done"
              className="h-12 rounded-xl text-base"
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">Colour</legend>
            <div className="flex flex-wrap gap-2.5">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  aria-label={c.name}
                  aria-pressed={c.id === color}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition',
                    c.swatch,
                    c.id === color ? 'ring-2 ring-foreground' : 'hover:scale-105',
                  )}
                >
                  {c.id === color && <Check className="h-5 w-5 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 flex-1 rounded-full">
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || saving} className="h-11 flex-1 rounded-full bg-blue-600 font-semibold text-white hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FolderDialog;
