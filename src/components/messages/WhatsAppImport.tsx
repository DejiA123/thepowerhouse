import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Lock, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { e2eReady } from '@/lib/chatCrypto';
import { GroupChatService, type GroupChat } from '@/services/groupChatService';
import { IMAGE_PREFIX, chatTitle, isPrivateChat, uploadChatImage } from './chatUtils';
import { canSwapDates, isImageAttachment, placeholderFor, readWhatsAppExport, swapDates, type WaChat } from '@/lib/whatsappImport';

/** Bigger than this won't open on a phone: export again "Without media" */
const MAX_BYTES = 400 * 1024 * 1024;
const IMPORTS_KEY = 'wa_imports_v1';

type Step = 'pick' | 'reading' | 'review' | 'importing' | 'done';

const fmtDate = (d?: Date) => (d ? d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const first = (name: string) => name.trim().toLowerCase().split(/\s+/)[0] ?? '';

/**
 * Import a WhatsApp chat into this chat: its messages keep their WhatsApp
 * sender and date, show "Imported", and are end-to-end encrypted like the rest.
 */
const WhatsAppImport = ({ open, onOpenChange, chat, me, otherId, onImported }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: GroupChat;
  me: { id: string; name: string };
  /** A private chat: the other person */
  otherId: string | null;
  onImported: (count: number) => void;
}) => {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>('pick');
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<WaChat | null>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [mine, setMine] = useState<string | null>(null);
  const [withPhotos, setWithPhotos] = useState(true);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [progress, setProgress] = useState({ photos: 0, photosTotal: 0, saved: 0, total: 0 });
  const [imported, setImported] = useState(0);
  const [encrypted, setEncrypted] = useState(false);
  const cancel = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const privateChat = isPrivateChat(chat);

  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setError(null);
    setParsed(null);
    setMine(null);
    cancel.current = false;
    e2eReady().then(setEncrypted);
    GroupChatService.getParticipants(chat.id)
      .then((list) => setMembers(list.map((p) => ({ id: p.user_id, name: p.user?.full_name || '' }))))
      .catch(() => setMembers([]));
  }, [open, chat.id]);

  const photoCount = useMemo(
    () => (parsed ? parsed.messages.filter((m) => isImageAttachment(m.attachment) && parsed.media.has(m.attachment!)).length : 0),
    [parsed],
  );
  const alreadyImported = useMemo(() => {
    try {
      return (JSON.parse(localStorage.getItem(IMPORTS_KEY) || '[]') as string[]).includes(fingerprint);
    } catch {
      return false;
    }
  }, [fingerprint]);

  /** Who each WhatsApp name is in this chat (when it can be told) */
  const matchOf = (sender: string): string | null => {
    if (sender === mine) return me.id;
    if (privateChat && parsed && parsed.senders.length === 2) return otherId;
    const exact = members.find((m) => m.name && m.name.trim().toLowerCase() === sender.trim().toLowerCase());
    if (exact) return exact.id;
    const byFirst = members.filter((m) => m.name && first(m.name) === first(sender));
    return byFirst.length === 1 ? byFirst[0].id : null;
  };

  const choose = async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError('This export is too big to open on a phone. In WhatsApp, export the chat again and choose "Without media".');
      return;
    }
    setStep('reading');
    try {
      const chatFile = await readWhatsAppExport(file);
      if (!chatFile.messages.length) throw new Error("No messages found. Make sure it's a chat exported from WhatsApp (a .zip or .txt).");
      setParsed(chatFile);
      setFingerprint(`${chat.id}|${chatFile.messages.length}|${chatFile.first?.getTime()}|${chatFile.last?.getTime()}`);
      // Guess which name is me: my name, else my first name
      const guess =
        chatFile.senders.find((s) => s.name.trim().toLowerCase() === me.name.trim().toLowerCase()) ??
        chatFile.senders.find((s) => first(s.name) === first(me.name));
      setMine(guess?.name ?? null);
      setWithPhotos(true);
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
      setStep('pick');
    }
  };

  const start = async () => {
    if (!parsed) return;
    cancel.current = false;
    setStep('importing');
    const photos = withPhotos ? parsed.messages.filter((m) => isImageAttachment(m.attachment) && parsed.media.has(m.attachment!)) : [];
    setProgress({ photos: 0, photosTotal: photos.length, saved: 0, total: parsed.messages.length });
    try {
      // Photos first (encrypted like any chat photo), a few at a time
      const uploaded = new Map<string, string>();
      let next = 0;
      let doneCount = 0;
      const worker = async () => {
        while (next < photos.length && !cancel.current) {
          const m = photos[next++];
          try {
            const blob = parsed.media.get(m.attachment!)!;
            const url = await uploadChatImage(me.id, new File([blob], m.attachment!, { type: blob.type }), 'chat', encrypted);
            uploaded.set(m.attachment!, url);
          } catch {
            /* that one shows as "Photo (not imported)" */
          }
          doneCount += 1;
          setProgress((p) => ({ ...p, photos: doneCount }));
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      if (cancel.current) {
        setStep('review');
        return;
      }

      const rows = parsed.messages
        .map((m) => {
          const photo = m.attachment ? uploaded.get(m.attachment) : undefined;
          const content = photo ? `${IMAGE_PREFIX}${photo}${m.text ? `\n${m.text}` : ''}` : m.attachment || m.omitted ? placeholderFor(m) : m.text;
          return { at: m.at.toISOString(), sender: m.sender, content, as: matchOf(m.sender) };
        })
        .filter((r) => r.content.trim());
      setProgress((p) => ({ ...p, total: rows.length }));
      const count = await GroupChatService.importMessages(
        chat.id,
        rows,
        (saved) => setProgress((p) => ({ ...p, saved })),
        () => cancel.current,
      );
      try {
        const list = JSON.parse(localStorage.getItem(IMPORTS_KEY) || '[]') as string[];
        localStorage.setItem(IMPORTS_KEY, JSON.stringify([...list, fingerprint].slice(-50)));
      } catch {
        /* private mode */
      }
      setImported(count);
      setStep('done');
      onImported(count);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/imported_from|column/i.test(msg) ? 'Importing needs the latest database update. Ask your church admin.' : "Couldn't finish the import. Check your connection and try again.");
      setStep('review');
    }
  };

  const busy = step === 'reading' || step === 'importing';
  const pct = progress.photosTotal + progress.total ? Math.round(((progress.photos + progress.saved) / (progress.photosTotal + progress.total)) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="flex h-[85dvh] w-full flex-col gap-0 rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <SheetTitle className="flex-1 text-[17px] font-semibold">Import WhatsApp chat</SheetTitle>
          {!busy && (
            <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)]">
          {error && (
            <p className="mb-4 flex gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          {(step === 'pick' || step === 'reading') && (
            <>
              <p className="text-[15px] text-foreground">Bring your WhatsApp conversation with {chatTitle(chat, me.name)} into this chat.</p>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  'In WhatsApp, open the chat and tap its name at the top.',
                  'Scroll down and tap Export chat.',
                  'Choose Attach media (to bring photos too) or Without media.',
                  'Save the file (iPhone: Save to Files), then choose it below.',
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">{i + 1}</span>
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ol>
              <input
                ref={fileRef}
                type="file"
                accept=".zip,.txt,application/zip,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) choose(f);
                }}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={busy} className="mt-6 h-12 w-full gap-2 rounded-full text-[15px] font-semibold">
                {step === 'reading' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
                {step === 'reading' ? 'Reading the chat…' : 'Choose the exported file'}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">A .zip or .txt file from WhatsApp. It's read on this phone.</p>
            </>
          )}

          {step === 'review' && parsed && (
            <>
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-[15px] font-semibold text-foreground">{parsed.messages.length.toLocaleString()} messages</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {fmtDate(parsed.first)} – {fmtDate(parsed.last)}
                  {photoCount > 0 && ` · ${photoCount.toLocaleString()} ${photoCount === 1 ? 'photo' : 'photos'}`}
                </p>
                {canSwapDates(parsed) && (
                  <button
                    onClick={() => {
                      const swapped = swapDates(parsed);
                      setParsed(swapped);
                      setFingerprint(`${chat.id}|${swapped.messages.length}|${swapped.first?.getTime()}|${swapped.last?.getTime()}`);
                    }}
                    className="mt-2 text-sm font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                  >
                    Dates wrong? Swap day and month
                  </button>
                )}
              </div>

              <p className="mb-2 mt-5 text-sm font-semibold text-foreground">Which one is you?</p>
              <div className="space-y-1.5">
                {parsed.senders.slice(0, 30).map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setMine(s.name)}
                    aria-pressed={mine === s.name}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                      mine === s.name ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40' : 'border-border hover:bg-muted/60',
                    )}
                  >
                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', mine === s.name ? 'border-blue-600' : 'border-muted-foreground/40')}>
                      {mine === s.name && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.count.toLocaleString()}</span>
                  </button>
                ))}
              </div>

              {photoCount > 0 && (
                <label className="mt-4 flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3 text-sm text-foreground">
                  <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} className="h-5 w-5 accent-blue-600" />
                  Bring the photos over too
                </label>
              )}

              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <li>• Messages keep their WhatsApp names and dates, and show “Imported”.</li>
                <li>• Videos, voice notes and documents show as a note (they aren't brought over).</li>
                {encrypted && <li className="flex items-center gap-1"><Lock className="h-3 w-3" /> End-to-end encrypted, like the rest of this chat.</li>}
              </ul>

              {alreadyImported && (
                <p className="mt-4 flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> You've imported this chat before. Importing it again adds the messages twice.
                </p>
              )}

              <Button onClick={start} disabled={!mine} className="mt-5 h-12 w-full rounded-full text-[15px] font-semibold">
                {mine ? `Import ${parsed.messages.length.toLocaleString()} messages` : 'Choose which one is you'}
              </Button>
            </>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-4 font-semibold text-foreground">Importing… {pct}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {progress.photosTotal > 0 && progress.photos < progress.photosTotal
                  ? `Photos ${progress.photos.toLocaleString()} of ${progress.photosTotal.toLocaleString()}`
                  : `Messages ${progress.saved.toLocaleString()} of ${progress.total.toLocaleString()}`}
              </p>
              <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Keep the app open until it's finished.</p>
              <Button variant="outline" onClick={() => (cancel.current = true)} className="mt-4 rounded-full">Stop</Button>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="mt-4 text-lg font-semibold text-foreground">{imported.toLocaleString()} messages imported</p>
              <p className="mt-1 text-sm text-muted-foreground">Scroll up in the chat to see them.</p>
              <Button onClick={() => onOpenChange(false)} className="mt-6 rounded-full px-8">Done</Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WhatsAppImport;
