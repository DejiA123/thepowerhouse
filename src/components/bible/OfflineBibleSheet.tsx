import { useEffect, useState } from 'react';
import { BookDown, Check, ChevronRight, CloudOff, Headphones, Layers, Loader2, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import { OFFLINE_TEXT_EVENT, TOTAL_CHAPTERS, offlineBibleService } from '@/services/offlineBibleService';
import { bibleBooks } from './BibleBookList';

interface Translation {
  id?: string;
  abbreviation?: string;
  name?: string;
}

interface OfflineBibleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Translation id as the reader uses it, plus its short and full names */
  version: string;
  versionLabel: string;
  versionName: string;
  /** Every translation the app offers */
  versions: Translation[];
  onOpenAudio?: () => void;
}

const FULL_NAMES: Record<string, string> = {
  KJV: 'King James Version', ASV: 'American Standard Version', WEB: 'World English Bible', BSB: 'Berean Standard Bible',
  NIV: 'New International Version', NKJV: 'New King James Version', NLT: 'New Living Translation', ESV: 'English Standard Version',
  NASB: 'New American Standard Bible', AMP: 'Amplified Bible', MSG: 'The Message',
};

/** Download Bible text to read with no internet connection. */
const OfflineBibleSheet = ({ open, onOpenChange, version, versionLabel, versionName, versions, onOpenAudio }: OfflineBibleSheetProps) => {
  const isMobile = useIsMobile();
  const [, setTick] = useState(0);
  const [confirmAll, setConfirmAll] = useState(false);

  // Re-render as downloads progress (they carry on when the sheet is closed)
  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    window.addEventListener(OFFLINE_TEXT_EVENT, update);
    return () => window.removeEventListener(OFFLINE_TEXT_EVENT, update);
  }, []);

  const source = offlineBibleService.wholeBibleSource(version);
  const downloaded = offlineBibleService.downloadedBooks(version);
  const everything = offlineBibleService.isWhole(version);
  const wholeJob = offlineBibleService.job(version, 'all');
  const batch = offlineBibleService.batch();

  // Every other translation that can come down in one tap (one row per download file)
  const sourceKey = (id: string) => {
    const s = offlineBibleService.wholeBibleSource(id);
    return s ? (s.kind === 'bolls' ? `bolls:${s.code}` : `free:${s.id}`) : null;
  };
  const seen = new Set([sourceKey(version)]);
  const others = versions
    .map((v) => ({
      id: v.id || v.abbreviation || '',
      label: (v.abbreviation || '').toUpperCase().replace(/^ENG(?=[A-Z]{2,})/, ''),
      name: v.name || v.abbreviation || '',
    }))
    .filter((v) => {
      const key = v.id ? sourceKey(v.id) : null;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const all = [
    ...(source ? [{ id: version, label: versionLabel }] : []),
    ...others.map((v) => ({ id: v.id, label: v.label })),
  ];
  const remaining = all.filter((v) => !offlineBibleService.isWhole(v.id));

  const downloadWhole = async (id = version, label = versionLabel) => {
    const result = await offlineBibleService.downloadWholeBible(id);
    if (result.ok) appAlert(`${label} is on your phone`, 'The whole Bible now opens with no internet connection.', 'success');
    else if (result.message) appAlert(`Couldn't download ${label}`, result.message, 'error');
  };

  const downloadAll = async () => {
    setConfirmAll(false);
    const result = await offlineBibleService.downloadMany(remaining);
    if (result.failed.length) appAlert(`${result.failed.length} translations didn't download`, `${result.failed.join(', ')} · check your connection and try again.`, 'error');
    else if (result.done) appAlert('Every translation is on your phone', 'Read any of them with no internet connection.', 'success');
  };

  const downloadBook = async (book: string, name: string) => {
    const result = await offlineBibleService.downloadBook(version, book);
    if (result.ok) appAlert(`${name} is ready offline`, `${versionLabel} · reads with no internet connection`, 'success');
    else if (result.failed) appAlert(`${name}: ${result.failed} chapters didn't download`, 'Check your connection and try again.', 'error');
  };

  const remove = async (id = version, book?: string) => {
    await offlineBibleService.remove(id, book);
    appAlert(book ? 'Book removed from this phone' : 'Removed from this phone', '', 'info');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="flex h-[88dvh] w-full flex-col gap-0 rounded-t-[28px] p-0 data-[state=open]:duration-300 sm:h-full sm:max-w-md sm:rounded-none [&>button]:right-5 [&>button]:top-5"
      >
        <div className="shrink-0 px-5 pb-3 pt-6">
          <p className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-[0.08em] text-blue-600 dark:text-blue-400">
            <CloudOff className="h-4 w-4" /> Read offline
          </p>
          <SheetTitle className="mt-0.5 font-outfit text-[26px] font-extrabold leading-tight tracking-tight">
            {versionName !== versionLabel ? versionName : FULL_NAMES[versionLabel.toUpperCase()] ?? versionLabel}
          </SheetTitle>
          <SheetDescription className="text-[13.5px]">Download once, then read with no internet connection.</SheetDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-1">
          {source ? (
            <div className="rounded-[22px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                    everything ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
                  )}
                >
                  {everything ? <Check className="h-6 w-6" strokeWidth={3} /> : <BookDown className="h-6 w-6" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-bold text-foreground">{everything ? 'The whole Bible is on this phone' : 'The whole Bible'}</p>
                  <p className="text-[13px] text-muted-foreground">
                    66 books · {TOTAL_CHAPTERS.toLocaleString()} chapters{everything ? '' : ' · about 2 MB'}
                  </p>
                </div>
              </div>

              {wholeJob ? (
                <JobProgress job={wholeJob} onCancel={() => offlineBibleService.cancel(version, 'all')} />
              ) : everything ? (
                <button
                  onClick={() => remove()}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-muted text-[14px] font-semibold text-red-600 transition active:scale-[0.98] dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" /> Remove from this phone
                </button>
              ) : (
                <button
                  onClick={() => downloadWhole()}
                  disabled={!!batch}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98] disabled:opacity-60"
                >
                  <BookDown className="h-5 w-5" /> Download the whole Bible
                </button>
              )}
            </div>
          ) : (
            <p className="rounded-2xl bg-muted/70 px-4 py-3 text-[13.5px] leading-relaxed text-muted-foreground">
              {versionLabel} downloads a book at a time. Tap a book to keep it on this phone.
            </p>
          )}

          {/* Every translation */}
          {others.length > 0 && (
            <section>
              <div className="mb-2 mt-6 flex items-baseline justify-between gap-3 px-1">
                <p className="text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">All translations</p>
                {batch ? (
                  <button onClick={() => offlineBibleService.cancelMany()} className="text-[13.5px] font-semibold text-red-600 dark:text-red-400">
                    Stop
                  </button>
                ) : remaining.length > 0 ? (
                  <button onClick={() => setConfirmAll(true)} className="flex items-center gap-1 text-[13.5px] font-semibold text-blue-600 dark:text-blue-400">
                    <Layers className="h-4 w-4" /> Download all {remaining.length}
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-4 w-4" strokeWidth={3} /> All on this phone
                  </span>
                )}
              </div>
              {batch && (
                <p className="mb-2 flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-2.5 text-[13px] text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  Downloading {Math.min(batch.index + 1, batch.versions.length)} of {batch.versions.length} · keep the app open
                </p>
              )}
              <div className="divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-200/70 bg-card dark:divide-slate-800 dark:border-slate-800">
                {others.map((v) => {
                  const job = offlineBibleService.job(v.id, 'all');
                  const whole = offlineBibleService.isWhole(v.id);
                  const queued = !!batch && !job && !whole && batch.versions.some((q, i) => q.id === v.id && i > batch.index);
                  return (
                    <div key={v.id} className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
                      <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-extrabold tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {v.label.slice(0, 5)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-foreground">{v.name}</span>
                        <span className="block text-[12px] text-muted-foreground">
                          {job
                            ? job.phase === 'downloading'
                              ? 'Downloading…'
                              : `Saving ${job.done} of ${job.total}`
                            : whole
                              ? 'On this phone'
                              : queued
                                ? 'Waiting…'
                                : 'Whole Bible · about 2 MB'}
                        </span>
                      </span>
                      {job ? (
                        <button onClick={() => offlineBibleService.cancel(v.id, 'all')} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label={`Stop downloading ${v.label}`}>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </button>
                      ) : whole ? (
                        <button onClick={() => remove(v.id)} className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-[12.5px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" aria-label={`Remove ${v.label} from this phone`}>
                          <Check className="h-3.5 w-3.5" strokeWidth={3} /> Saved
                        </button>
                      ) : (
                        <button
                          onClick={() => downloadWhole(v.id, v.label)}
                          disabled={!!batch}
                          className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[12.5px] font-semibold text-blue-700 disabled:opacity-50 dark:bg-blue-950/50 dark:text-blue-300"
                        >
                          <BookDown className="h-3.5 w-3.5" /> Download
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Book by book, for translations without a whole-Bible file */}
          {!source &&
            (['Old Testament', 'New Testament'] as const).map((testament) => (
              <section key={testament}>
                <p className="mb-2 mt-5 px-1 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">{testament}</p>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-200/70 bg-card dark:divide-slate-800 dark:border-slate-800">
                  {bibleBooks[testament].map((b) => {
                    const job = offlineBibleService.job(version, b.apiName);
                    const has = downloaded.has(b.apiName);
                    return (
                      <div key={b.apiName} className="flex min-h-[52px] items-center gap-3 px-4 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-foreground">{b.name}</span>
                          <span className="block text-[12px] text-muted-foreground">
                            {job ? `${job.done} of ${job.total} chapters` : `${b.chapters} ${b.chapters === 1 ? 'chapter' : 'chapters'}`}
                          </span>
                        </span>
                        {job ? (
                          <button onClick={() => offlineBibleService.cancel(version, b.apiName)} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[12.5px] font-semibold text-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cancel
                          </button>
                        ) : has ? (
                          <button onClick={() => remove(version, b.apiName)} className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-[12.5px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" aria-label={`Remove ${b.name} from this phone`}>
                            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Saved
                          </button>
                        ) : (
                          <button onClick={() => downloadBook(b.apiName, b.name)} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[12.5px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                            <BookDown className="h-3.5 w-3.5" /> Download
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

          {onOpenAudio && (
            <button
              onClick={() => {
                onOpenChange(false);
                onOpenAudio();
              }}
              className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left transition hover:bg-muted"
            >
              <Headphones className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-foreground">Listen offline too</span>
                <span className="block text-[12.5px] text-muted-foreground">Download the audio Bible separately</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </SheetContent>

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Download all {remaining.length} translations?</AlertDialogTitle>
            <AlertDialogDescription>
              About {remaining.length * 2} MB to download, and roughly {remaining.length * 7} MB on your phone. Use Wi-Fi and keep the app open until
              it finishes. It carries on while you use the rest of the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={downloadAll}>
              Download all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};

const JobProgress = ({ job, onCancel }: { job: { phase: string; done: number; total: number }; onCancel: () => void }) => (
  <div className="mt-4">
    <div className="mb-1.5 flex items-center justify-between text-[13px]">
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {job.phase === 'saving' ? `Saving ${job.done.toLocaleString()} of ${job.total.toLocaleString()} chapters` : 'Downloading…'}
      </span>
      <button onClick={onCancel} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Cancel download">
        <X className="h-4 w-4" />
      </button>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={cn('h-full rounded-full bg-blue-600 transition-[width] duration-300 dark:bg-blue-400', job.phase !== 'saving' && 'w-1/3 animate-pulse')}
        style={job.phase === 'saving' ? { width: `${(100 * job.done) / job.total}%` } : undefined}
      />
    </div>
  </div>
);

export default OfflineBibleSheet;
