import { useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
import type { ComposedSong } from '@/components/choir/SongSheet';

/**
 * Compose a song → Edit the words: the writer changes any line, chord or section after
 * praying over the draft and singing it through. Each section is its name and its lines,
 * one per line, chords in square brackets just before the word they fall on
 * ("[G]Holy is the [D]Lamb"), the choir's answers in round brackets.
 */
interface Part { key: number; name: string; text: string }

let nextKey = 1;
const toParts = (song: ComposedSong): Part[] => song.sections.map((s) => ({ key: nextKey++, name: s.name, text: s.lines.join('\n') }));

const SongWordsEditor = ({ song, onSave, onCancel, hasMusic }: { song: ComposedSong; onSave: (song: ComposedSong) => Promise<boolean>; onCancel: () => void; hasMusic: boolean }) => {
  const [parts, setParts] = useState<Part[]>(() => toParts(song));
  const [saving, setSaving] = useState(false);

  const change = (key: number, patch: Partial<Part>) => setParts((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const move = (i: number, by: number) =>
    setParts((ps) => {
      const next = [...ps];
      const [p] = next.splice(i, 1);
      next.splice(Math.max(0, Math.min(next.length, i + by)), 0, p);
      return next;
    });
  const remove = (key: number) => setParts((ps) => ps.filter((p) => p.key !== key));
  const add = () => setParts((ps) => [...ps, { key: nextKey++, name: 'Verse', text: '' }]);

  const sections = parts
    .map((p) => ({ name: p.name.replace(/\s+/g, ' ').trim().slice(0, 40) || 'Section', lines: p.text.split('\n').map((l) => l.replace(/\s+$/, '').slice(0, 300)).filter((l) => l.trim()).slice(0, 40) }))
    .filter((s) => s.lines.length);

  const save = async () => {
    if (!sections.length) return;
    setSaving(true);
    const ok = await onSave({ ...song, sections });
    setSaving(false);
    if (!ok) return;
  };

  const field = 'w-full rounded-2xl border border-slate-300 bg-card px-3.5 py-3 text-[16px] text-foreground outline-none focus:border-blue-500 dark:border-slate-700';

  return (
    <div data-testid="words-editor">
      <h2 className="font-outfit text-[24px] font-bold leading-tight text-foreground">Edit the words</h2>
      <p className="mt-1 text-[14px] leading-snug text-muted-foreground">Change any line, chord or section until the song is yours.</p>
      <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-[13.5px] leading-snug text-slate-700 dark:bg-blue-950/40 dark:text-slate-300">
        Chords go in square brackets just before the word they fall on: <span className="font-mono text-[13px] font-semibold text-blue-700 dark:text-blue-300">[G]Holy is the [D]Lamb</span>. The choir’s answers go in round brackets: <span className="font-mono text-[13px]">(Amen!)</span>
      </div>
      {hasMusic && (
        <p className="mt-2 text-[13px] leading-snug text-muted-foreground">The music was made with the earlier words. After saving, use Make it again to hear your changes.</p>
      )}

      <div className="mt-4 space-y-3">
        {parts.map((p, i) => (
          <section key={p.key} className="rounded-[22px] border border-slate-200/80 bg-card p-3.5 shadow-sm dark:border-slate-800" aria-label={p.name || 'Section'}>
            <div className="mb-2 flex items-center gap-1.5">
              <input
                value={p.name}
                onChange={(e) => change(p.key, { name: e.target.value })}
                aria-label="Section name"
                className="h-10 min-w-0 flex-1 rounded-xl border border-transparent bg-slate-100 px-3 text-[14px] font-bold uppercase tracking-[0.06em] text-foreground outline-none focus:border-blue-500 dark:bg-slate-800"
              />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move this section up" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-muted disabled:opacity-30">
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === parts.length - 1} aria-label="Move this section down" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-muted disabled:opacity-30">
                <ArrowDown className="h-[18px] w-[18px]" />
              </button>
              <button type="button" onClick={() => remove(p.key)} aria-label="Remove this section" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-600 active:bg-red-50 dark:text-red-400 dark:active:bg-red-950/40">
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            </div>
            <textarea
              value={p.text}
              onChange={(e) => change(p.key, { text: e.target.value })}
              rows={Math.max(3, p.text.split('\n').length + 1)}
              aria-label={`${p.name || 'Section'} words`}
              spellCheck
              className={`${field} resize-none font-serif text-[16px] leading-relaxed`}
            />
          </section>
        ))}
      </div>

      <button type="button" onClick={add} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-[15px] font-semibold text-foreground active:bg-muted dark:border-slate-700">
        <Plus className="h-5 w-5" /> Add a section
      </button>

      <div className="sticky bottom-[calc(var(--bottom-nav-h,0px)+8px)] z-10 mt-4 grid grid-cols-[1fr_2fr] gap-2 rounded-2xl bg-background/90 py-2 backdrop-blur">
        <button type="button" onClick={onCancel} disabled={saving} className="h-12 rounded-2xl border border-slate-300 bg-card text-[15px] font-semibold text-foreground dark:border-slate-700">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving || !sections.length} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[15px] font-semibold text-white disabled:opacity-50">
          {saving && <Loader2 className="h-5 w-5 animate-spin" />} Save the words
        </button>
      </div>
    </div>
  );
};

export default SongWordsEditor;
