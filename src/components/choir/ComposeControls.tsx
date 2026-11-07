import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compose a song's form controls (design "A · Tidy sections", Nov 2026): numbered cards,
 * one sliding-switch style for every short choice, style tiles with a one-line description
 * under four family tabs, and a key grid. Every option is at least 40 px tall and the
 * selected one is always marked the same way.
 */

/** A numbered card holding one part of the form */
export const FormCard = ({ step, title, children, testId }: { step: number; title: string; children: ReactNode; testId?: string }) => (
  <section className="space-y-4 rounded-[22px] border border-slate-200/80 bg-card px-4 py-[18px] shadow-sm dark:border-slate-800" data-testid={testId} aria-label={title}>
    <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
      {step} · {title}
    </h2>
    {children}
  </section>
);

/** A field's label, with an optional "(optional)" note */
export const FieldLabel = ({ children, optional, htmlFor }: { children: ReactNode; optional?: boolean; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-2 block text-[15px] font-semibold text-foreground">
    {children} {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
  </label>
);

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  /** A small second line (e.g. "76–96") */
  sub?: string;
}

/** The sliding switch used for every short choice (tempo, lead voice, language part, how many songs) */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  compact,
  className,
  testId,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  compact?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
      className={cn('grid gap-1 rounded-[14px] bg-slate-100 p-1 dark:bg-slate-800/70', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-col items-center justify-center rounded-[10px] px-1 transition-colors',
              o.sub ? 'h-[52px]' : compact ? 'h-10' : 'h-11',
              on ? 'bg-white shadow-[0_1px_3px_rgba(15,23,42,0.14)] dark:bg-slate-950' : 'active:bg-white/60 dark:active:bg-slate-900',
            )}
          >
            <span className={cn('text-[14px] leading-tight', on ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-semibold text-slate-700 dark:text-slate-300')}>{o.label}</span>
            {o.sub && <span className={cn('mt-0.5 text-[11.5px] leading-none', on ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400')}>{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export interface StyleFamily {
  name: string;
  tab: string;
  styles: { id: string; label: string; hint: string }[];
}

/** Style: four family tabs over a two-column grid of tiles, each with what it sounds like */
export const StylePicker = ({ families, value, onChange }: { families: StyleFamily[]; value: string; onChange: (id: string) => void }) => {
  const home = Math.max(0, families.findIndex((f) => f.styles.some((s) => s.id === value)));
  const [tab, setTab] = useState(home);
  const family = families[tab] ?? families[0];
  return (
    <div className="space-y-3" data-testid="style-picker">
      <div role="tablist" aria-label="Style family" className="grid grid-cols-4 gap-1 rounded-[14px] bg-slate-100 p-1 dark:bg-slate-800/70">
        {families.map((f, i) => {
          const on = i === tab;
          const holds = f.styles.some((s) => s.id === value);
          return (
            <button
              key={f.name}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(i)}
              className={cn(
                'relative h-[38px] rounded-[10px] text-[14px] transition-colors',
                on ? 'bg-white font-semibold text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.14)] dark:bg-slate-950' : 'font-medium text-slate-600 dark:text-slate-300',
              )}
            >
              {f.tab}
              {holds && !on && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-600" aria-label="(chosen style is here)" />}
            </button>
          );
        })}
      </div>
      <div role="radiogroup" aria-label={`${family.name} styles`} className="grid grid-cols-2 gap-2">
        {family.styles.map((s) => {
          const on = s.id === value;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(s.id)}
              className={cn(
                'relative flex min-h-[78px] flex-col gap-1 rounded-2xl p-3 text-left transition-colors',
                on ? 'border-2 border-blue-600 bg-blue-50 p-[11px] dark:border-blue-400 dark:bg-blue-950/40' : 'border border-slate-200 bg-card active:bg-muted dark:border-slate-700',
              )}
            >
              <span className="pr-6 text-[15px] font-semibold leading-tight text-foreground">{s.label}</span>
              <span className="text-[12.5px] leading-snug text-slate-600 dark:text-slate-400">{s.hint}</span>
              {on && (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500">
                  <Check className="h-3 w-3 text-white" strokeWidth={3.2} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const KEY_NAME: Record<string, string> = { '': 'Any', Eb: 'E♭', Ab: 'A♭', Bb: 'B♭' };

/** Key: a five-across grid of buttons, "Any" first */
export const KeyGrid = ({ keys, value, onChange }: { keys: string[]; value: string; onChange: (k: string) => void }) => (
  <div role="radiogroup" aria-label="Key" className="grid grid-cols-5 gap-1.5" data-testid="key-grid">
    {keys.map((k) => {
      const on = k === value;
      return (
        <button
          key={k || 'any'}
          type="button"
          role="radio"
          aria-checked={on}
          aria-label={k ? `Key of ${(KEY_NAME[k] ?? k).replace('♭', ' flat')}` : 'Any key'}
          onClick={() => onChange(k)}
          className={cn(
            'h-11 rounded-xl text-[15px] transition-colors',
            on ? 'border-2 border-blue-600 bg-blue-50 font-bold text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300' : 'border border-slate-200 bg-card font-semibold text-foreground active:bg-muted dark:border-slate-700',
          )}
        >
          {KEY_NAME[k] ?? k}
        </button>
      );
    })}
  </div>
);
