import { useEffect, useState } from 'react';
import { BookDown, Check, ChevronRight, CloudOff, Headphones, Loader2, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import { OFFLINE_TEXT_EVENT, TOTAL_CHAPTERS, offlineBibleService } from '@/services/offlineBibleService';
import { bibleBooks } from './BibleBookList';

interface OfflineBibleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Translation id as the reader uses it, plus its short and full names */
  version: string;
  versionLabel: string;
  versionName: string;
  onOpenAudio?: () => void;
}

const FULL_NAMES: Record<string, string> = {
  KJV: 'King James Version', ASV: 'American Standard Version', WEB: 'World English Bible', BSB: 'Berean Standard Bible',
  NIV: 'New International Version', NKJV: 'New King James Version', NLT: 'New Living Translation', ESV: 'English Standard Version',
  NASB: 'New American Standard Bible', AMP: 'Amplified Bible', MSG: 'The Message',
};

/** Download Bible text to read with no internet connection. */
const OfflineBibleSheet = ({ open, onOpenChange, version, versionLabel, versionName, onOpenAudio }: OfflineBibleSheetProps) => {
  const isMobile = useIsMobile();
  const [, setTick] = useState(0);

  // Re-render as downloads progress (they carry on when the sheet is closed)
  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    window.addEventListener(OFFLINE_TEXT_EVENT, update);
    return () => window.removeEventListener(OFFLINE_TEXT_EVENT, update);
  }, []);

  const file = offlineBibleService.wholeBibleFile(versionLabel);
  const downloaded = offlineBibleService.downloadedBooks(version);
  const wholeJob = offlineBibleService.job(version, 'all');
  const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
  const everything = allBooks.every((b) => downloaded.has(b.apiName));

  const downloadWhole = async () => {
    const result = await offlineBibleService.downloadWholeBible(version, versionLabel);
    if (result.ok) appAlert('The whole Bible is on your phone', `${versionLabel} now opens with no internet connection.`, 'success');
    else if (result.message) appAlert("Couldn't download the Bible", result.message, 'error');
  };

  const downloadBook = async (book: string, name: string) => {
    const result = await offlineBibleService.downloadBook(version, book);
    if (result.ok) appAlert(`${name} is ready offline`, `${versionLabel} · reads with no internet connection`, 'success');
    else if (result.failed) appAlert(`${name}: ${result.failed} chapters didn't download`, 'Check your connection and try again.', 'error');
  };

  const remove = async (book?: string) => {
    await offlineBibleService.remove(version, book);
    appAlert(book ? 'Book removed from this phone' : 'Offline Bible removed', '', 'info');
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
          <SheetTitle className="mt-0.5 font-outfit text-[26px] font-extrabold leading-tight tracking-tight">{versionName !== versionLabel ? versionName : FULL_NAMES[versionLabel.toUpperCase()] ?? versionLabel}</SheetTitle>
          <SheetDescription className="text-[13.5px]">Download once, then read with no internet connection.</SheetDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-1">
          {file && (
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
                    66 books · {TOTAL_CHAPTERS.toLocaleString()} chapters{everything ? '' : ` · about ${file.approxMb} MB`}
                  </p>
                </div>
              </div>

              {wholeJob ? (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {wholeJob.phase === 'downloading' ? 'Downloading…' : `Saving ${wholeJob.done.toLocaleString()} of ${wholeJob.total.toLocaleString()} chapters`}
                    </span>
                    <button onClick={() => offlineBibleService.cancel(version, 'all')} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Cancel download">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn('h-full rounded-full bg-blue-600 transition-[width] duration-300 dark:bg-blue-400', wholeJob.phase === 'downloading' && 'w-1/3 animate-pulse')}
                      style={wholeJob.phase === 'saving' ? { width: `${(100 * wholeJob.done) / wholeJob.total}%` } : undefined}
                    />
                  </div>
                </div>
              ) : everything ? (
                <button
                  onClick={() => remove()}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-muted text-[14px] font-semibold text-red-600 transition active:scale-[0.98] dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" /> Remove from this phone
                </button>
              ) : (
                <button
                  onClick={downloadWhole}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98]"
                >
                  <BookDown className="h-5 w-5" /> Download the whole Bible
                </button>
              )}
            </div>
          )}

          {!file && (
            <p className="rounded-2xl bg-muted/70 px-4 py-3 text-[13.5px] leading-relaxed text-muted-foreground">
              {versionLabel} downloads a book at a time. Tap a book to keep it on this phone. For the whole Bible in one tap, switch to a translation such as KJV.
            </p>
          )}

          {/* Books — shown for book-by-book translations, or as the status of the whole Bible */}
          {(!file || (!everything && downloaded.size > 0)) &&
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
                          <button onClick={() => remove(b.apiName)} className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-[12.5px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" aria-label={`Remove ${b.name} from this phone`}>
                            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Saved
                          </button>
                        ) : !file ? (
                          <button onClick={() => downloadBook(b.apiName, b.name)} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[12.5px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                            <BookDown className="h-3.5 w-3.5" /> Download
                          </button>
                        ) : null}
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
                <span className="block text-[12.5px] text-muted-foreground">Audio downloads separately</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default OfflineBibleSheet;
