import { useState } from 'react';
import { ChevronDown, Folder } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { BibleNoteFolder } from '@/services/bibleNotesService';

/**
 * "Move to folder" for a note's menu. The folders open inside the same menu
 * rather than in a side menu, so on a phone they never run off the screen.
 */
const FolderMenuSection = ({
  folders,
  value,
  onChange,
}: {
  folders: BibleNoteFolder[];
  value: string | null | undefined;
  onChange: (folderId: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const current = folders.find((f) => f.id === value);

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
      >
        <Folder className="mr-2 h-4 w-4 shrink-0" />
        <span className="flex-1">Move to folder</span>
        <span className="ml-2 max-w-[6.5rem] truncate text-xs text-muted-foreground">{current?.name ?? 'None'}</span>
        <ChevronDown className={cn('ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </DropdownMenuItem>
      {open && (
        <div className="mx-1 mb-1 max-h-56 overflow-y-auto overscroll-contain rounded-lg bg-muted/60 py-1">
          <DropdownMenuRadioGroup value={value ?? 'none'} onValueChange={(v) => onChange(v === 'none' ? null : v)}>
            <DropdownMenuRadioItem value="none">No folder</DropdownMenuRadioItem>
            {folders.map((f) => (
              <DropdownMenuRadioItem key={f.id} value={f.id} className="[overflow-wrap:anywhere]">
                {f.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </div>
      )}
    </>
  );
};

export default FolderMenuSection;
