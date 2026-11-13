import { useEffect, useMemo, useState } from 'react';
import { Brain } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { dumpLines } from '@/lib/todo/brain';
import { parseQuickAdd, type QuickAdd } from '@/lib/todo/parse';
import { SheetTop, sheetClass } from './parts';

/**
 * Brain dump: a head full of things to do is tiring and makes starting harder. Empty it
 * here, one per line (or paste a list from Notes); each line is read like quick add
 * (dates, times, how long, "!"), and they're all added at once.
 */
const BrainDumpSheet = ({ open, onOpenChange, initial, onAdd }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: string;
  onAdd: (items: QuickAdd[]) => void;
}) => {
  const isMobile = useIsMobile();
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) setText(initial ?? '');
  }, [open, initial]);
  const items = useMemo(() => {
    const now = new Date();
    return dumpLines(text).map((l) => parseQuickAdd(l, now));
  }, [text]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass} data-testid="brain-dump">
        <SheetTop title="Brain dump" sub="Everything on your mind, one per line" onClose={() => onOpenChange(false)} />
        <SheetDescription className="px-4 pt-3 text-[14px] leading-snug text-muted-foreground">
          Carrying it all in your head is tiring. Get it out here; dates and times are picked up as you type.
        </SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            autoFocus
            placeholder={'Call the plumber tomorrow\nBuy a birthday card for Ada by Fri\nFinish slides ~1h !\nRenew passport'}
            className="w-full resize-none rounded-2xl border border-border bg-background px-3.5 py-3 text-[16px] leading-relaxed focus:shadow-none"
            aria-label="Your tasks, one per line"
          />
          {items.length > 0 && (
            <ul className="mt-3 divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/70">
              {items.map((it, i) => (
                <li key={`${i}-${it.title}`} className="px-3 py-2">
                  <span className="block text-[15px] font-medium text-foreground">{it.title}</span>
                  {it.chips.length > 0 && <span className="block text-[12.5px] font-medium text-blue-600 dark:text-blue-400">{it.chips.join(' · ')}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border/60 px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)] pt-3">
          <button
            onClick={() => onAdd(items)}
            disabled={!items.length}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[15.5px] font-semibold text-white shadow-md shadow-blue-600/25 active:scale-[0.99] disabled:opacity-40"
            data-testid="brain-dump-add"
          >
            <Brain className="h-5 w-5" /> {items.length ? `Add ${items.length} ${items.length === 1 ? 'task' : 'tasks'}` : 'Type or paste your list'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BrainDumpSheet;
