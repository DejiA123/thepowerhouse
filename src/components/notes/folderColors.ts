import type { BibleNoteFolder } from '@/services/bibleNotesService';

export interface FolderColor {
  id: string;
  name: string;
  /** The square behind the folder icon */
  tile: string;
  /** The folder icon (filled) */
  icon: string;
  /** The folder's name on a note card */
  chip: string;
  /** A small dot, as in "Move to folder" */
  dot: string;
  /** The swatch to pick it */
  swatch: string;
}

// Real colours, not the church's accent (Tailwind `blue` follows the church's brand)
export const FOLDER_COLORS: FolderColor[] = [
  {
    id: 'blue', name: 'Blue',
    tile: 'bg-sky-100 dark:bg-sky-500/20', icon: 'text-sky-600 dark:text-sky-400',
    chip: 'bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200', dot: 'bg-sky-600', swatch: 'bg-sky-500',
  },
  {
    id: 'purple', name: 'Purple',
    tile: 'bg-violet-100 dark:bg-violet-500/20', icon: 'text-violet-600 dark:text-violet-400',
    chip: 'bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200', dot: 'bg-violet-600', swatch: 'bg-violet-500',
  },
  {
    id: 'teal', name: 'Teal',
    tile: 'bg-teal-100 dark:bg-teal-500/20', icon: 'text-teal-600 dark:text-teal-400',
    chip: 'bg-teal-50 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200', dot: 'bg-teal-600', swatch: 'bg-teal-500',
  },
  {
    id: 'green', name: 'Green',
    tile: 'bg-emerald-100 dark:bg-emerald-500/20', icon: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200', dot: 'bg-emerald-600', swatch: 'bg-emerald-500',
  },
  {
    id: 'gold', name: 'Gold',
    tile: 'bg-amber-100 dark:bg-amber-500/20', icon: 'text-amber-600 dark:text-amber-400',
    chip: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200', dot: 'bg-amber-500', swatch: 'bg-amber-400',
  },
  {
    id: 'red', name: 'Red',
    tile: 'bg-rose-100 dark:bg-rose-500/20', icon: 'text-rose-600 dark:text-rose-400',
    chip: 'bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200', dot: 'bg-rose-600', swatch: 'bg-rose-500',
  },
  {
    id: 'grey', name: 'Grey',
    tile: 'bg-slate-200 dark:bg-slate-500/25', icon: 'text-slate-600 dark:text-slate-300',
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200', dot: 'bg-slate-500', swatch: 'bg-slate-500',
  },
];

/**
 * A folder's colour: the one chosen for it, else the next in the list by its
 * place among the folders (what the colour migration saves for old folders).
 */
export function folderColor(folder: Pick<BibleNoteFolder, 'id' | 'color'>, folders: Pick<BibleNoteFolder, 'id'>[]): FolderColor {
  const chosen = FOLDER_COLORS.find((c) => c.id === folder.color);
  if (chosen) return chosen;
  const index = Math.max(0, folders.findIndex((f) => f.id === folder.id));
  return FOLDER_COLORS[index % FOLDER_COLORS.length];
}

/** The colour a new folder starts with: the next one along, so neighbours differ. */
export const nextFolderColor = (folders: unknown[]) => FOLDER_COLORS[folders.length % FOLDER_COLORS.length].id;
