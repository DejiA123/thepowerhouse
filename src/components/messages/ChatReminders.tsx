import { useCallback, useEffect, useState } from 'react';
import { AlarmClock, ArrowLeft, Bell, Loader2, Lock, Plus, Send, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import { Segmented } from '@/components/choir/ComposeControls';
import {
  DAY_LETTERS,
  DAY_NAMES,
  MAX_REMINDERS,
  REMINDER_TEMPLATES,
  REMINDER_TIME_ZONE,
  deleteReminder,
  describeSchedule,
  listReminders,
  nextLabel,
  saveReminder,
  sendReminderNow,
  type ChatReminder,
  type ReminderDraft,
  type ReminderSend,
  type Repeat,
} from '@/lib/chatReminders';
import { formatClock, linkify } from './chatUtils';
import { useSeenWhenVisible, type CardSeenSummary } from '@/lib/cardViews';
import { SeenByLine } from './CardInfo';
import { plainFormatting, renderFormatted } from './whatsappFormat';

/**
 * Group reminders (automations): chat info → Reminders. Everyone in the group sees the
 * list; the group's admins add, change, pause, try ("Send now") and remove them, up to 10.
 * Each reminder goes into the chat as a card (ReminderCard) at its time and notifies the
 * members (the chat-reminders function, every minute).
 */
const sheetClass = 'flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden';

/** The reminder's words, formatted like a message (bold, italic, links) */
const Formatted = ({ text }: { text: string }) => (
  <>
    {renderFormatted(text, (stretch, key) =>
      linkify(stretch).map((part, i) =>
        part.type === 'link' ? (
          <a key={`${key}.${i}`} href={part.value} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600 underline underline-offset-2 dark:text-blue-400">
            {part.value}
          </a>
        ) : (
          <span key={`${key}.${i}`}>{part.value}</span>
        ),
      ),
    )}
  </>
);

/**
 * A sent reminder in the chat: its own card, among the messages by time. `onSeen` records
 * it once it has really been on screen; the group's admins also get "Seen by 5 of 8"
 * (`seenBy`), which opens who has seen it.
 */
export const ReminderCard = ({ send, onSeen, seenBy }: {
  send: ReminderSend;
  onSeen?: () => void;
  seenBy?: { summary: CardSeenSummary | null; onOpen: () => void };
}) => {
  const ref = useSeenWhenVisible<HTMLDivElement>(onSeen, send.id);
  return (
    <div className="my-2 flex justify-center px-2" data-reminder-card={send.id}>
      <div ref={ref} className="w-full max-w-[min(85%,26rem)] overflow-hidden rounded-2xl bg-amber-50 shadow-sm ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:ring-amber-800/60">
        <div className="flex items-center gap-2 border-b border-amber-200/70 px-3.5 py-2 dark:border-amber-800/50">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white">
            <AlarmClock className="h-3.5 w-3.5" />
          </span>
          <span className="flex-1 text-[13px] font-semibold text-amber-900 dark:text-amber-200">Reminder</span>
          <span className="text-[11.5px] text-amber-800/80 dark:text-amber-300/80">{formatClock(send.sent_at)}</span>
        </div>
        <div className="whitespace-pre-wrap px-3.5 py-2.5 text-[15px] leading-snug text-foreground [overflow-wrap:anywhere] [word-break:break-word]">
          <Formatted text={send.message} />
        </div>
        <p className="px-3.5 pb-2 text-[11px] text-amber-800/70 dark:text-amber-300/70">Automated reminder from the group’s admins</p>
        {seenBy?.summary && seenBy.summary.total > 0 && (
          <div className="-mt-1 flex justify-end border-t border-amber-200/60 px-2 py-1 dark:border-amber-800/40">
            <SeenByLine summary={seenBy.summary} onOpen={seenBy.onOpen} tone="amber" />
          </div>
        )}
      </div>
    </div>
  );
};

const blank = (): ReminderDraft => ({ message: '', repeat: 'weekly', days: [6], day_of_month: 1, on_date: null, at_time: '09:00', ends_on: null, active: true });
const fromReminder = (r: ChatReminder): ReminderDraft => ({
  message: r.message,
  repeat: r.repeat,
  days: r.days ?? [],
  day_of_month: r.day_of_month ?? 1,
  on_date: r.on_date,
  at_time: r.at_time.slice(0, 5),
  ends_on: r.ends_on,
  active: r.active,
  time_zone: r.time_zone,
});
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const zoneName = (tz: string) => {
  try {
    return new Intl.DateTimeFormat([], { timeZone: tz, timeZoneName: 'long' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch {
    return tz;
  }
};
const phoneZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const RemindersSheet = ({ open, onOpenChange, chatId, chatName, canManage }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  chatName: string;
  canManage: boolean;
}) => {
  const isMobile = useIsMobile();
  const [list, setList] = useState<ChatReminder[] | null>(null);
  const [editing, setEditing] = useState<{ id?: string; draft: ReminderDraft } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    listReminders(chatId).then(setList).catch(() => setList([]));
  }, [chatId]);
  useEffect(() => {
    if (open) load();
    else setEditing(null);
  }, [open, load]);

  const toggle = async (r: ChatReminder, on: boolean) => {
    setList((l) => l?.map((x) => (x.id === r.id ? { ...x, active: on } : x)) ?? l);
    try {
      const saved = await saveReminder(chatId, { ...fromReminder(r), active: on }, r.id);
      setList((l) => l?.map((x) => (x.id === r.id ? saved : x)) ?? l);
    } catch {
      setList((l) => l?.map((x) => (x.id === r.id ? r : x)) ?? l);
      appAlert('Couldn’t change it', 'Check your connection and try again.', 'error');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass} data-testid="reminders-sheet">
        {editing ? (
          <ReminderEditor
            chatId={chatId}
            id={editing.id}
            initial={editing.draft}
            onBack={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
            busy={busy}
            setBusy={setBusy}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate text-[17px] font-semibold">Reminders</SheetTitle>
                <p className="truncate text-[12.5px] text-muted-foreground">{chatName}</p>
              </div>
              <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SheetDescription className="px-4 pt-3 text-[13.5px] leading-snug text-muted-foreground">
              Automatic messages posted in this group at set times, like the day and time you meet. Everyone in the group gets them as a notification too.
            </SheetDescription>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)] pt-3">
              {list === null ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {list.length === 0 && (
                    <div className="rounded-2xl bg-muted/60 px-4 py-6 text-center">
                      <Bell className="mx-auto h-7 w-7 text-muted-foreground" />
                      <p className="mt-2 text-[15px] font-semibold text-foreground">No reminders yet</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">{canManage ? 'Add one for your meeting day and time, and the app will post it here for you.' : 'The group’s admins can set reminders here.'}</p>
                    </div>
                  )}
                  <div className="space-y-2.5" data-testid="reminders-list">
                    {list.map((r) => (
                      <div key={r.id} className={cn('rounded-2xl border border-border bg-card p-3.5', !r.active && 'opacity-70')}>
                        <button
                          type="button"
                          onClick={() => canManage && setEditing({ id: r.id, draft: fromReminder(r) })}
                          disabled={!canManage}
                          className="block w-full text-left disabled:cursor-default"
                          aria-label={canManage ? `Edit reminder: ${plainFormatting(r.message).slice(0, 40)}` : undefined}
                        >
                          <p className="line-clamp-2 whitespace-pre-line text-[15px] font-medium leading-snug text-foreground">{plainFormatting(r.message)}</p>
                          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                            <AlarmClock className="h-3.5 w-3.5 shrink-0" /> {describeSchedule(r)}
                          </p>
                        </button>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className={cn('text-[12.5px] font-medium', r.active && r.next_run_at ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground')}>{nextLabel(r)}</span>
                          {canManage && !(r.repeat === 'once' && r.last_sent_at && !r.active) && (
                            <Switch checked={r.active} onCheckedChange={(on) => void toggle(r, on)} aria-label={r.active ? 'Pause this reminder' : 'Turn this reminder on'} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {canManage && list.length < MAX_REMINDERS && (
                    <button
                      type="button"
                      onClick={() => setEditing({ draft: blank() })}
                      className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[15px] font-semibold text-white active:bg-blue-700"
                    >
                      <Plus className="h-5 w-5" /> Add a reminder
                    </button>
                  )}
                  {canManage && list.length >= MAX_REMINDERS && <p className="mt-3 text-center text-[13px] text-muted-foreground">A group can have up to {MAX_REMINDERS} reminders.</p>}
                  {!canManage && list.length > 0 && <p className="mt-3 text-center text-[13px] text-muted-foreground">Only the group’s admins can add or change reminders.</p>}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const REPEATS: { value: Repeat; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const field = 'w-full rounded-2xl border border-border bg-card px-3.5 text-[16px] text-foreground outline-none focus:border-blue-500 focus:shadow-none';

const ReminderEditor = ({ chatId, id, initial, onBack, onSaved, busy, setBusy }: {
  chatId: string;
  id?: string;
  initial: ReminderDraft;
  onBack: () => void;
  onSaved: () => void;
  busy: string | null;
  setBusy: (b: string | null) => void;
}) => {
  const [d, setD] = useState<ReminderDraft>(initial);
  const set = (patch: Partial<ReminderDraft>) => setD((x) => ({ ...x, ...patch }));
  const tz = d.time_zone ?? REMINDER_TIME_ZONE;
  /** Changed since it was opened: Send now sends the saved reminder, so save first */
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  const problem = !d.message.trim()
    ? 'Write the reminder'
    : d.repeat === 'weekly' && !d.days.length
      ? 'Pick at least one day'
      : d.repeat === 'once' && !d.on_date
        ? 'Pick the date'
        : !/^\d{2}:\d{2}/.test(d.at_time)
          ? 'Pick the time'
          : null;

  const save = async () => {
    if (problem) return;
    setBusy('save');
    try {
      await saveReminder(chatId, d, id);
      appAlert(id ? 'Reminder saved' : 'Reminder added', describeSchedule(d), 'success');
      onSaved();
    } catch (e) {
      const msg = (e as Error).message ?? '';
      appAlert('Couldn’t save it', /up to 10/.test(msg) ? 'A group can have up to 10 reminders.' : /row-level|admins/.test(msg) ? 'Only the group’s admins can set reminders.' : /day|date/i.test(msg) ? msg : 'Check your connection and try again.', 'error');
    } finally {
      setBusy(null);
    }
  };
  const sendNow = async () => {
    if (!id) return;
    setBusy('send');
    try {
      await sendReminderNow(id);
      appAlert('Sent to the group', 'It’s in the chat now, and members are being notified.', 'success');
    } catch {
      appAlert('Couldn’t send it', 'Check your connection and try again.', 'error');
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    if (!id || !window.confirm('Delete this reminder? Reminders already sent stay in the chat.')) return;
    setBusy('delete');
    try {
      await deleteReminder(id);
      onSaved();
    } catch {
      appAlert('Couldn’t delete it', 'Check your connection and try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border/60 px-2 py-2.5">
        <button onClick={onBack} className="rounded-full p-2 text-foreground hover:bg-muted" aria-label="Back to reminders">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <SheetTitle className="min-w-0 flex-1 truncate text-[17px] font-semibold">{id ? 'Edit reminder' : 'New reminder'}</SheetTitle>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 pt-4" data-testid="reminder-editor">
        {!id && (
          <div>
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Start from</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {REMINDER_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => set({ ...t.draft })}
                  className="shrink-0 rounded-full border border-border bg-card px-3.5 py-2 text-[13.5px] font-medium text-foreground active:bg-muted"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="reminder-message" className="mb-2 block text-[15px] font-semibold text-foreground">Message</label>
          <textarea
            id="reminder-message"
            value={d.message}
            onChange={(e) => set({ message: e.target.value.slice(0, 1000) })}
            rows={5}
            placeholder={'e.g. 📣 *Evangelism today* at 10:00 am. Meet at the church.'}
            className={cn(field, 'resize-none py-3 leading-snug')}
          />
          <p className="mt-1 text-[12px] text-muted-foreground">*bold*, _italic_ and links work like in a message.</p>
        </div>

        <div>
          <p className="mb-2 text-[15px] font-semibold text-foreground">Repeats</p>
          <Segmented<Repeat> label="Repeats" compact options={REPEATS} value={d.repeat} onChange={(repeat) => set({ repeat, on_date: repeat === 'once' && !d.on_date ? todayIso() : d.on_date })} />
        </div>

        {d.repeat === 'weekly' && (
          <div>
            <p className="mb-2 text-[15px] font-semibold text-foreground">On</p>
            <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Days of the week">
              {DAY_LETTERS.map((letter, i) => {
                const on = d.days.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    aria-label={DAY_NAMES[i]}
                    onClick={() => set({ days: on ? d.days.filter((x) => x !== i) : [...d.days, i] })}
                    className={cn('flex h-11 items-center justify-center rounded-full text-[15px] font-semibold transition-colors', on ? 'bg-blue-600 text-white' : 'bg-muted text-foreground')}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {d.repeat === 'monthly' && (
          <div>
            <label htmlFor="reminder-dom" className="mb-2 block text-[15px] font-semibold text-foreground">Day of the month</label>
            <select id="reminder-dom" value={d.day_of_month ?? 1} onChange={(e) => set({ day_of_month: Number(e.target.value) })} className={cn(field, 'h-12')}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}{n > 28 ? ' (or the month’s last day)' : ''}</option>
              ))}
            </select>
          </div>
        )}
        {d.repeat === 'once' && (
          <div>
            <label htmlFor="reminder-date" className="mb-2 block text-[15px] font-semibold text-foreground">Date</label>
            <input id="reminder-date" type="date" min={todayIso()} value={d.on_date ?? ''} onChange={(e) => set({ on_date: e.target.value || null })} className={cn(field, 'h-12')} />
          </div>
        )}

        <div>
          <label htmlFor="reminder-time" className="mb-2 block text-[15px] font-semibold text-foreground">Time</label>
          <input id="reminder-time" type="time" value={d.at_time.slice(0, 5)} onChange={(e) => set({ at_time: e.target.value })} className={cn(field, 'h-12')} />
          {tz !== phoneZone() && <p className="mt-1 text-[12px] text-muted-foreground">{zoneName(tz)}, the church’s time</p>}
        </div>

        {d.repeat !== 'once' && (
          <div>
            <label htmlFor="reminder-ends" className="mb-2 block text-[15px] font-semibold text-foreground">
              Ends <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input id="reminder-ends" type="date" min={todayIso()} value={d.ends_on ?? ''} onChange={(e) => set({ ends_on: e.target.value || null })} className={cn(field, 'h-12 flex-1')} />
              {d.ends_on && (
                <button type="button" onClick={() => set({ ends_on: null })} className="h-12 shrink-0 rounded-2xl bg-muted px-4 text-[14px] font-semibold text-foreground">
                  Never
                </button>
              )}
            </div>
          </div>
        )}

        <label className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3">
          <span className="text-[15px] font-medium text-foreground">On</span>
          <Switch checked={d.active} onCheckedChange={(active) => set({ active })} aria-label="Reminder on" />
        </label>

        {d.message.trim() && (
          <div>
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">How it will look</p>
            <div className="rounded-2xl bg-[#e9eef5] py-2 dark:bg-slate-900" data-testid="reminder-preview">
              <ReminderCard send={{ id: 'preview', reminder_id: null, chat_id: chatId, message: d.message.trim(), sent_at: new Date().toISOString(), set_by: null }} />
            </div>
            <p className="mt-2 text-[13px] font-medium text-foreground">{problem ?? describeSchedule(d)}</p>
          </div>
        )}

        <p className="flex gap-2 rounded-2xl bg-amber-50 px-3.5 py-3 text-[12.5px] leading-snug text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Messages in this chat stay end-to-end encrypted. A reminder is posted by the app at its time, so, like the group’s name, its words are kept on the server.
        </p>
      </div>
      <div className="space-y-2 border-t border-border/60 px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)] pt-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!!problem || !!busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {busy === 'save' && <Loader2 className="h-5 w-5 animate-spin" />} {id ? 'Save reminder' : 'Add reminder'}
        </button>
        {id && dirty && <p className="text-center text-[12px] text-muted-foreground">Save your changes to send this version now.</p>}
        {id && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void sendNow()} disabled={!!busy || dirty} title={dirty ? 'Save your changes first' : undefined} className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-muted text-[14px] font-semibold text-foreground disabled:opacity-50">
              {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send now
            </button>
            <button type="button" onClick={() => void remove()} disabled={!!busy} className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-red-50 text-[14px] font-semibold text-red-600 disabled:opacity-50 dark:bg-red-950/40 dark:text-red-400">
              {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </button>
          </div>
        )}
      </div>
    </>
  );
};
