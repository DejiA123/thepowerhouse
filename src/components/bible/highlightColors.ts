/**
 * Highlight colours, spelled out in full so Tailwind keeps every class.
 * `value` is what's stored in bible_highlights.highlight_color.
 */
export interface HighlightColor {
  value: string;
  name: string;
  /** Round swatch in pickers */
  swatch: string;
  /** Marker behind highlighted verse text */
  mark: string;
  /** Solid colour for dots and edges */
  hex: string;
}

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { value: 'yellow', name: 'Yellow', swatch: 'bg-yellow-300', mark: 'bg-yellow-200 dark:bg-yellow-300/90', hex: '#facc15' },
  { value: 'green', name: 'Green', swatch: 'bg-green-300', mark: 'bg-green-200 dark:bg-green-300/90', hex: '#4ade80' },
  { value: 'blue', name: 'Blue', swatch: 'bg-sky-300', mark: 'bg-sky-200 dark:bg-sky-300/90', hex: '#38bdf8' },
  { value: 'pink', name: 'Pink', swatch: 'bg-pink-300', mark: 'bg-pink-200 dark:bg-pink-300/90', hex: '#f472b6' },
  { value: 'purple', name: 'Purple', swatch: 'bg-violet-300', mark: 'bg-violet-200 dark:bg-violet-300/90', hex: '#a78bfa' },
  { value: 'orange', name: 'Orange', swatch: 'bg-orange-300', mark: 'bg-orange-200 dark:bg-orange-300/90', hex: '#fb923c' },
];

export const highlightColor = (value?: string | null): HighlightColor =>
  HIGHLIGHT_COLORS.find((c) => c.value === value) ?? HIGHLIGHT_COLORS[0];

/** Fired after highlights change anywhere, so the reader and lists stay in step. */
export const HIGHLIGHTS_CHANGED = 'bible-highlights-changed';
/** Fired after a Bible note is created, edited or deleted. */
export const NOTES_CHANGED = 'bible-notes-changed';
