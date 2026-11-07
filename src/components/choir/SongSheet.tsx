import { useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, Minus, Pencil, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import { chordSheetText, pieces, prefersFlats, transposeKey, transposeLine } from '@/lib/chordSheet';

export interface ComposedSong {
  title: string;
  key: string;
  bpm: number;
  time_signature: string;
  feel: string;
  scripture: string[];
  summary: string;
  sections: { name: string; lines: string[] }[];
  arrangement: { choir: string; band: string };
  music_style: string;
}

/** A sung line with each chord sitting above the word it falls on */
const ChordLine = ({ line, steps, flats, showChords }: { line: string; steps: number; flats: boolean; showChords: boolean }) => {
  const ps = pieces(transposeLine(line, steps, flats));
  if (!showChords) {
    const words = ps.map((p) => p.text).join('').trim();
    return words ? <p className="leading-relaxed">{words}</p> : null;
  }
  return (
    <p className="flex flex-wrap items-end leading-tight">
      {ps.map((p, i) => (
        <span key={i} className="inline-flex flex-col whitespace-pre">
          <span className="min-h-[1.15em] pr-1.5 font-sans text-[0.82em] font-bold text-blue-600 dark:text-blue-400">{p.chord ?? ''}</span>
          <span>{p.text || (p.chord ? ' ' : '')}</span>
        </span>
      ))}
    </p>
  );
};

/**
 * The song as a chord sheet: title, key and tempo, every section with chords
 * over the words; change key, hide the chords, copy it; the choir's and the
 * band's notes underneath.
 */
const SongSheet = ({ song, onRename }: { song: ComposedSong; onRename?: (title: string) => Promise<boolean> }) => {
  const [steps, setSteps] = useState(0);
  const [naming, setNaming] = useState<string | null>(null);
  const saveName = async () => {
    if (naming === null) return;
    if (!naming.trim()) return setNaming(null);
    if (await onRename?.(naming)) setNaming(null);
  };
  const [showChords, setShowChords] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const key = transposeKey(song.key, steps);
  const flats = prefersFlats(key);
  const text = useMemo(() => chordSheetText(song, steps), [song, steps]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      appAlert('Copied', 'The chord sheet is ready to paste.', 'success');
    } catch {
      appAlert("Couldn't copy", 'Press and hold to select the words instead.', 'error');
    }
  };

  return (
    <div data-testid="song-sheet">
      {naming !== null ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveName();
          }}
        >
          <input
            autoFocus
            value={naming}
            onChange={(e) => setNaming(e.target.value.slice(0, 120))}
            onKeyDown={(e) => e.key === 'Escape' && setNaming(null)}
            aria-label="Song name"
            enterKeyHint="done"
            className="h-12 min-w-0 flex-1 rounded-2xl border border-border bg-card px-3.5 font-outfit text-[20px] font-bold text-foreground outline-none focus:border-blue-500"
          />
          <button type="submit" aria-label="Save the name" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <Check className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setNaming(null)} aria-label="Cancel" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            <X className="h-5 w-5" />
          </button>
        </form>
      ) : (
        <h2 className="font-outfit text-[26px] font-bold leading-tight tracking-tight text-foreground">
          {song.title}
          {onRename && (
            <button type="button" onClick={() => setNaming(song.title)} aria-label="Rename the song" className="ml-2 inline-flex h-8 w-8 translate-y-[-2px] items-center justify-center rounded-full bg-muted align-middle text-muted-foreground active:bg-muted/70">
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </h2>
      )}
      {song.summary && <p className="mt-1 text-[14px] leading-snug text-muted-foreground">{song.summary}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[12.5px] font-semibold">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">Key {key}</span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">{song.bpm} BPM</span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">{song.time_signature}</span>
        {song.feel && <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">{song.feel}</span>}
      </div>
      {!!song.scripture.length && <p className="mt-2 text-[13px] text-muted-foreground">From {song.scripture.join(' · ')}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-full bg-muted p-0.5" aria-label="Change key">
          <button type="button" onClick={() => setSteps((s) => s - 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-foreground active:bg-background" aria-label="Key down">
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[4.5rem] text-center text-[13px] font-semibold text-foreground">{steps === 0 ? 'Key' : `${steps > 0 ? '+' : ''}${steps}`}</span>
          <button type="button" onClick={() => setSteps((s) => s + 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-foreground active:bg-background" aria-label="Key up">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={() => setShowChords((v) => !v)} className="rounded-full bg-muted px-3.5 py-2 text-[13px] font-semibold text-foreground">
          {showChords ? 'Words only' : 'Show chords'}
        </button>
        <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-2 text-[13px] font-semibold text-foreground">
          <Copy className="h-4 w-4" /> Copy
        </button>
      </div>

      <div className="mt-5 space-y-5 font-serif text-[17px] text-foreground">
        {song.sections.map((sec, i) => {
          // The chorus and vamp stand out (a pre-chorus is not a chorus)
          const big = /chorus|vamp/i.test(sec.name) && !/pre/i.test(sec.name);
          return (
          <section key={i}>
            <h3 className={cn('mb-1.5 font-sans text-[12px] font-bold uppercase tracking-[0.08em]', big ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground')}>{sec.name}</h3>
            <div className={cn('space-y-1.5', big && 'border-l-2 border-blue-200 pl-3 dark:border-blue-900')}>
              {sec.lines.map((line, j) => (
                <ChordLine key={j} line={line} steps={steps} flats={flats} showChords={showChords} />
              ))}
            </div>
          </section>
          );
        })}
      </div>

      {(song.arrangement.choir || song.arrangement.band) && (
        <div className="mt-6 rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <button type="button" onClick={() => setNotesOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-[15px] font-semibold text-foreground" aria-expanded={notesOpen}>
            Choir and band notes
            <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition', notesOpen && 'rotate-180')} />
          </button>
          {notesOpen && (
            <div className="space-y-3 border-t border-slate-200/70 px-4 py-3 text-[14px] leading-relaxed text-foreground dark:border-slate-800">
              {song.arrangement.choir && (
                <p><span className="font-semibold">Choir: </span>{song.arrangement.choir}</p>
              )}
              {song.arrangement.band && (
                <p><span className="font-semibold">Band: </span>{song.arrangement.band}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SongSheet;
