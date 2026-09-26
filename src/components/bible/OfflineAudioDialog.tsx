import { useEffect, useState } from 'react';
import { CheckCircle2, CloudDownload, Download, HardDrive, Loader2, Trash2, WifiOff, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import {
  bookInfo, formatBytes, offlineAudioService, offlineAudioSupported, type BookDownloadProgress,
} from '@/services/offlineAudioService';
import { enhancedApiBibleService } from '@/services/enhancedApiBibleService';
import { bibleBooks } from '@/components/bible/BibleBookList';

/* ── Background download manager (keeps going when the dialog is closed) ── */
interface Job extends BookDownloadProgress {
  controller: AbortController;
  running: boolean;
}
const jobs = new Map<string, Job>();
const JOB_EVENT = 'offline-audio:jobs';
const emitJobs = () => {
  syncWakeLock();
  window.dispatchEvent(new CustomEvent(JOB_EVENT));
};

/* Keep the screen on while downloading: a locked phone pauses the app. */
let wakeLock: { release: () => Promise<void> } | null = null;
const downloading = () => !!collectionJob || Array.from(jobs.values()).some((j) => j.running);
async function syncWakeLock() {
  try {
    if (downloading() && !wakeLock && document.visibilityState === 'visible' && 'wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      (wakeLock as any)?.addEventListener?.('release', () => {
        wakeLock = null;
      });
    } else if (!downloading() && wakeLock) {
      const lock = wakeLock;
      wakeLock = null;
      await lock.release();
    }
  } catch {
    wakeLock = null; // not supported, or Low Power Mode
  }
}
if (typeof document !== 'undefined') {
  // The phone drops the lock when the app is hidden; take it again on return
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncWakeLock();
  });
}

function startBookDownload(book: string, version: string, textVersion?: string) {
  if (jobs.get(book)?.running) return;
  const controller = new AbortController();
  const job: Job = { book, done: 0, total: bookInfo(book)?.chapters ?? 0, failed: 0, controller, running: true };
  jobs.set(book, job);
  emitJobs();
  offlineAudioService
    .downloadBook(book, version, (p) => {
      Object.assign(job, p);
      emitJobs();
    }, controller.signal)
    .then(async (result) => {
      job.running = false;
      emitJobs();
      if (controller.signal.aborted) return;
      // Save the chapter text too so the reader works offline
      if (textVersion) {
        for (let c = 1; c <= result.total && !controller.signal.aborted; c++) {
          await enhancedApiBibleService.getChapter(textVersion, book, c).catch(() => null);
        }
      }
      const name = bookInfo(book)?.name ?? book;
      if (result.outOfSpace) appAlert(`${name}: not enough space`, 'Free up space on your phone, then tap Resume.', 'error');
      else if (result.failed) appAlert(`${name}: ${result.failed} chapters didn't download`, 'Check your connection and tap Resume.', 'error');
      else appAlert(`${name} is ready offline`, 'You can now listen without an internet connection.', 'success');
      jobs.delete(book);
      emitJobs();
    });
}

/* ── Whole-testament / whole-Bible downloads (one book after another) ── */
const COLLECTIONS = {
  nt: { label: 'New Testament', books: bibleBooks['New Testament'].map((b) => b.apiName) },
  ot: { label: 'Old Testament', books: bibleBooks['Old Testament'].map((b) => b.apiName) },
  all: {
    label: 'Entire Bible',
    books: [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']].map((b) => b.apiName),
  },
};
type CollectionId = keyof typeof COLLECTIONS;

interface CollectionJob {
  id: CollectionId;
  currentBook: string | null;
  failed: number;
  controller: AbortController;
}
let collectionJob: CollectionJob | null = null;

const AVG_CHAPTER_BYTES = 2.5 * 1024 * 1024;

function collectionStatus(id: CollectionId) {
  let done = 0;
  let total = 0;
  COLLECTIONS[id].books.forEach((b) => {
    const st = offlineAudioService.bookStatus(b);
    done += st.done;
    total += st.total;
  });
  return { done, total, remainingBytes: (total - done) * AVG_CHAPTER_BYTES };
}

async function startCollectionDownload(id: CollectionId, version: string) {
  if (collectionJob) return;
  const controller = new AbortController();
  const job: CollectionJob = { id, currentBook: null, failed: 0, controller };
  collectionJob = job;
  emitJobs();
  let outOfSpace = false;
  try {
    for (const book of COLLECTIONS[id].books) {
      if (controller.signal.aborted) break;
      const st = offlineAudioService.bookStatus(book);
      if (st.done === st.total) continue;
      job.currentBook = book;
      emitJobs();
      const result = await offlineAudioService.downloadBook(book, version, () => emitJobs(), controller.signal);
      job.failed += result.failed;
      if (result.outOfSpace) {
        outOfSpace = true;
        break;
      }
    }
  } catch (error) {
    console.warn('[offline] collection download stopped', error);
    job.failed++;
  } finally {
    // Never leave the Download buttons stuck on "downloading"
    collectionJob = null;
    emitJobs();
  }
  if (controller.signal.aborted) return;
  const label = COLLECTIONS[id].label;
  if (outOfSpace) appAlert(`${label}: not enough space`, 'Free up space on your phone, then tap Resume to carry on.', 'error');
  else if (job.failed) appAlert(`${label}: ${job.failed} chapters didn't download`, 'Check your connection and tap Resume to finish.', 'error');
  else appAlert(`${label} is ready offline`, 'Listen anywhere, no internet needed.', 'success');
}

function useOfflineState() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(offlineAudioService.CHANGE_EVENT, bump);
    window.addEventListener(JOB_EVENT, bump);
    return () => {
      window.removeEventListener(offlineAudioService.CHANGE_EVENT, bump);
      window.removeEventListener(JOB_EVENT, bump);
    };
  }, []);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: string;
  chapter: number;
  version: string;
}

const OfflineAudioDialog = ({ open, onOpenChange, book, chapter, version }: Props) => {
  useOfflineState();
  const [chapterBusy, setChapterBusy] = useState<number | null>(null);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [confirmCollection, setConfirmCollection] = useState<CollectionId | null>(null);

  useEffect(() => {
    if (open) offlineAudioService.storageEstimate().then(setEstimate);
  }, [open]);

  const info = bookInfo(book);
  const status = offlineAudioService.bookStatus(book);
  const job = jobs.get(book);
  const chapterSaved = offlineAudioService.isDownloaded(book, chapter);
  const downloads = offlineAudioService.list();
  const byBook = downloads.reduce<Record<string, { chapters: number; bytes: number }>>((acc, d) => {
    acc[d.book] ||= { chapters: 0, bytes: 0 };
    acc[d.book].chapters++;
    acc[d.book].bytes += d.bytes;
    return acc;
  }, {});
  const totalBytes = offlineAudioService.totalBytes();
  const avgChapter = status.done ? status.bytes / status.done : 2.6 * 1024 * 1024;
  const estimateBook = formatBytes(avgChapter * (status.total - status.done));

  const downloadChapter = async () => {
    setChapterBusy(chapter);
    try {
      await offlineAudioService.downloadChapter(book, chapter, version);
      await enhancedApiBibleService.getChapter(version, book, chapter).catch(() => null);
      appAlert(`${info?.name ?? book} ${chapter} saved`, 'Available offline.', 'success');
    } catch {
      appAlert('Download failed', 'Check your connection and try again.', 'error');
    } finally {
      setChapterBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
        <DialogHeader className="px-5 pb-2 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <WifiOff className="h-5 w-5 text-blue-600" /> Listen offline
          </DialogTitle>
          <DialogDescription>
            Save the audio Bible to this device and listen anywhere — no internet needed.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-2">
          {!offlineAudioSupported() ? (
            <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              This browser can't save audio for offline use. Install the app to your Home Screen, or use Chrome or Safari.
            </p>
          ) : (
            <>
              {/* The whole audio Bible, one tap */}
              <WholeAudioBible onDownload={() => setConfirmCollection('all')} />

              {/* Current book */}
              <div className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{info?.name ?? book}</p>
                    <p className="text-sm text-muted-foreground">
                      {status.done}/{status.total} chapters saved{status.bytes ? ` · ${formatBytes(status.bytes)}` : ''}
                    </p>
                  </div>
                  {status.done === status.total && status.total > 0 && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                </div>
                <Progress value={status.total ? (100 * (job ? job.done : status.done)) / status.total : 0} className="mt-3 h-2" />

                <div className="mt-4 flex flex-col gap-2">
                  {job?.running ? (
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={() => {
                        job.controller.abort();
                        jobs.delete(book);
                        emitJobs();
                      }}
                    >
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {job.done}/{job.total} · Cancel
                    </Button>
                  ) : status.done < status.total ? (
                    <Button className="flex-1 rounded-full" onClick={() => startBookDownload(book, version, version)}>
                      <CloudDownload className="mr-2 h-4 w-4" /> {status.done > 0 ? 'Resume book' : 'Download book'} (~{estimateBook})
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full text-red-600"
                      onClick={() => offlineAudioService.removeBook(book)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Remove book
                    </Button>
                  )}
                  {!chapterSaved && !job?.running && status.total > 1 && (
                    <Button variant="outline" className="flex-1 rounded-full" onClick={downloadChapter} disabled={chapterBusy !== null}>
                      {chapterBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Chapter {chapter} only
                    </Button>
                  )}
                </div>
              </div>

              {/* Download everything */}
              <div>
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Download more</p>
                <div className="divide-y divide-border rounded-2xl border border-border">
                  {(['nt', 'ot'] as CollectionId[]).map((id) => {
                    const st = collectionStatus(id);
                    const running = collectionJob?.id === id;
                    const complete = st.done === st.total;
                    const current = running && collectionJob?.currentBook ? bookInfo(collectionJob.currentBook)?.name : null;
                    return (
                      <div key={id} className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{COLLECTIONS[id].label}</p>
                            <p className="text-xs text-muted-foreground">
                              {complete
                                ? `All ${st.total} chapters saved`
                                : running
                                  ? `Downloading ${current ?? '…'} · ${st.done}/${st.total}`
                                  : `${st.done}/${st.total} chapters · ~${formatBytes(st.remainingBytes)} to download`}
                            </p>
                          </div>
                          {complete ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : running ? (
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => collectionJob?.controller.abort()}>
                              Stop
                            </Button>
                          ) : (
                            <Button size="sm" className="rounded-full" disabled={!!collectionJob} onClick={() => setConfirmCollection(id)}>
                              <CloudDownload className="mr-1.5 h-4 w-4" /> {st.done > 0 ? 'Resume' : 'Download'}
                            </Button>
                          )}
                        </div>
                        {(running || (st.done > 0 && !complete)) && (
                          <Progress value={(100 * st.done) / st.total} className="mt-2 h-1.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {downloading() && (
                <p className="flex items-start gap-2 rounded-2xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                  Keep The Power House open while it downloads. Your phone pauses downloads when it locks or you switch
                  apps, and they carry on when you come back.
                </p>
              )}

              {/* Everything saved */}
              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this device</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <HardDrive className="h-3.5 w-3.5" /> {formatBytes(totalBytes)}
                    {estimate?.quota ? ` of ${formatBytes(estimate.quota)} available` : ''}
                  </p>
                </div>
                {Object.keys(byBook).length === 0 && jobs.size === 0 ? (
                  <p className="rounded-2xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">
                    Nothing saved yet. Download a book to listen offline.
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-2xl border border-border">
                    {Array.from(jobs.values()).filter((j) => j.book !== book && j.running).map((j) => (
                      <div key={`job-${j.book}`} className="flex items-center gap-3 p-3">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <p className="flex-1 text-sm font-medium">{bookInfo(j.book)?.name ?? j.book}</p>
                        <p className="text-xs text-muted-foreground">{j.done}/{j.total}</p>
                      </div>
                    ))}
                    {Object.entries(byBook).map(([b, v]) => {
                      const total = bookInfo(b)?.chapters ?? v.chapters;
                      return (
                        <div key={b} className="flex items-center gap-3 p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{bookInfo(b)?.name ?? b}</p>
                            <p className="text-xs text-muted-foreground">
                              {v.chapters === total ? 'Whole book' : `${v.chapters} of ${total} chapters`} · {formatBytes(v.bytes)}
                            </p>
                          </div>
                          <button
                            onClick={() => offlineAudioService.removeBook(b)}
                            className={cn('rounded-full p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30')}
                            aria-label={`Remove ${bookInfo(b)?.name ?? b}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {totalBytes > 0 && (
                  <button
                    onClick={() => offlineAudioService.removeAll()}
                    className="mt-3 w-full rounded-full py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Remove all downloads
                  </button>
                )}
              </div>

              <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                Audio is the King James Version. Downloads stay on this device until you remove them. On iPhone, open the
                app from your Home Screen so downloads are kept.
              </p>
            </>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={!!confirmCollection} onOpenChange={(o) => !o && setConfirmCollection(null)}>
        <AlertDialogContent className="rounded-2xl">
          {confirmCollection && (
            <ConfirmCollection
              id={confirmCollection}
              estimate={estimate}
              onStart={() => {
                startCollectionDownload(confirmCollection, version);
                setConfirmCollection(null);
              }}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

/** Big "download everything" card at the top of Listen offline */
const WholeAudioBible = ({ onDownload }: { onDownload: () => void }) => {
  const st = collectionStatus('all');
  const running = collectionJob?.id === 'all';
  const complete = st.total > 0 && st.done === st.total;
  const current = running && collectionJob?.currentBook ? bookInfo(collectionJob.currentBook)?.name : null;
  const pct = st.total ? (100 * st.done) / st.total : 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            complete ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
          )}
        >
          {complete ? <CheckCircle2 className="h-6 w-6" /> : <CloudDownload className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold text-foreground">{complete ? 'The whole audio Bible is on this phone' : 'The whole audio Bible'}</p>
          <p className="text-[13px] text-muted-foreground">
            {complete
              ? `All ${st.total.toLocaleString()} chapters`
              : running
                ? `${current ?? 'Starting'} · ${st.done.toLocaleString()} of ${st.total.toLocaleString()} chapters`
                : `${st.total.toLocaleString()} chapters · about ${formatBytes(st.remainingBytes)}${st.done ? ' left' : ''}`}
          </p>
        </div>
      </div>
      {(running || (st.done > 0 && !complete)) && <Progress value={pct} className="mt-3 h-2" />}
      {!complete && (
        running ? (
          <Button variant="outline" className="mt-4 h-11 w-full rounded-2xl" onClick={() => collectionJob?.controller.abort()}>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading · tap to pause
          </Button>
        ) : (
          <Button className="mt-4 h-12 w-full rounded-2xl text-[15px] font-bold" disabled={!!collectionJob} onClick={onDownload}>
            <CloudDownload className="mr-2 h-5 w-5" /> {st.done > 0 ? 'Resume the whole Bible' : 'Download the whole Bible'}
          </Button>
        )
      )}
    </div>
  );
};

const ConfirmCollection = ({
  id, estimate, onStart,
}: { id: CollectionId; estimate: { usage: number; quota: number } | null; onStart: () => void }) => {
  const st = collectionStatus(id);
  const free = estimate ? estimate.quota - estimate.usage : null;
  const tooBig = free !== null && free < st.remainingBytes * 1.1;
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Download the {COLLECTIONS[id].label}?</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              {st.total - st.done} chapters, about <strong>{formatBytes(st.remainingBytes)}</strong>. Use Wi-Fi, as this
              can take a while. It keeps going while you use the rest of the app. Keep the app open: your phone pauses
              downloads when it locks, and they carry on when you come back.
            </p>
            {tooBig && free !== null && (
              <p className="font-medium text-red-600">
                Your device may not have enough free space ({formatBytes(free)} available). Free up space or download
                one testament at a time.
              </p>
            )}
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
        <AlertDialogAction className="rounded-full" onClick={onStart}>Start download</AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
};

export default OfflineAudioDialog;
