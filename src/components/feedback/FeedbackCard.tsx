import { useState } from 'react';
import { Check, Loader2, MessageSquarePlus } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { areaForPath, deviceLabel, pageBefore, track } from '@/lib/activity';

type Rating = 'up' | 'down' | null;
type Kind = 'problem' | 'suggestion' | 'other';

const KINDS: { id: Kind; label: string }[] = [
  { id: 'problem', label: "Something didn't work" },
  { id: 'suggestion', label: 'Suggestion' },
  { id: 'other', label: 'Other' },
];

/** Where they were before Help, in plain words ("Messages") */
const fromPage = () => {
  const before = pageBefore();
  if (!before) return 'Help';
  const url = new URL(before, location.origin);
  return areaForPath(url.pathname, url.search);
};

/**
 * "Is the app helping you?" on the Help page: a thumb, then (optionally) what
 * didn't work or what they'd like. Read by admins in Me → Admin → Feedback.
 */
const FeedbackCard = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<Rating>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [message, setMessage] = useState('');
  const [canContact, setCanContact] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const start = (r: Rating, k: Kind | null = null) => {
    setRating(r);
    setKind(k ?? (r === 'down' ? 'problem' : null));
    setMessage('');
    setOpen(true);
  };

  const send = async () => {
    setSending(true);
    const { error } = await supabase.from('app_feedback' as never).insert({
      user_id: user?.id ?? null,
      rating,
      kind,
      message: message.trim() || null,
      can_contact: !!user && canContact,
      page: fromPage(),
      device: deviceLabel(),
    } as never);
    setSending(false);
    if (error) {
      appAlert("Your feedback didn't send", 'Check your connection and try again.', 'error');
      return;
    }
    track('feedback', { rating, kind });
    setOpen(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-emerald-200/70 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-5 w-5" />
        </span>
        <div>
          <p className="font-outfit text-[17px] font-bold text-foreground">Thank you!</p>
          <p className="text-[13.5px] text-muted-foreground">Every message is read by the church team.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 rounded-[22px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800">
        <p className="font-outfit text-[18px] font-bold text-foreground">Is the app helping you?</p>
        <p className="mt-0.5 text-[13.5px] text-muted-foreground">Tell us what works, what doesn't, and what you'd like.</p>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => start('up')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-3.5 text-[15px] font-semibold text-emerald-700 transition active:scale-[0.98] dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <span className="text-[22px] leading-none">👍</span> Yes
          </button>
          <button
            onClick={() => start('down')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-rose-50 py-3.5 text-[15px] font-semibold text-rose-700 transition active:scale-[0.98] dark:bg-rose-950/40 dark:text-rose-300"
          >
            <span className="text-[22px] leading-none">👎</span> Not really
          </button>
        </div>
        <button
          onClick={() => start(null, 'suggestion')}
          className="mx-auto mt-2.5 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-blue-600 dark:text-blue-400"
        >
          <MessageSquarePlus className="h-4 w-4" /> Or send a suggestion
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] gap-0 overflow-y-auto rounded-t-[28px] px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 sm:mx-auto sm:max-w-md [&>button]:right-5 [&>button]:top-5"
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
          <SheetTitle className="pr-10 font-outfit text-[21px] font-bold">
            {rating === 'up' ? '👍 Glad to hear it' : rating === 'down' ? '👎 Sorry about that' : 'Your suggestion'}
          </SheetTitle>
          <SheetDescription className="text-[13.5px]">
            {rating === 'up' ? 'Anything we could make even better? (optional)' : 'What should we fix or add?'}
          </SheetDescription>

          <div className="mt-4 flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(kind === k.id ? null : k.id)}
                className={cn(
                  'rounded-full px-3.5 py-2 text-[14px] outline-none transition',
                  kind === k.id
                    ? 'border-2 border-blue-600 bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border border-border text-foreground',
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
            placeholder={kind === 'problem' ? 'What happened, and where?' : 'Tell us more (optional)'}
            rows={4}
            className="mt-3 w-full resize-none rounded-2xl border border-border bg-muted/40 p-3 text-[16px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-blue-500/40"
          />

          {user && (
            <label className="mt-3 flex items-center gap-2.5 text-[14px] text-foreground">
              <input type="checkbox" checked={canContact} onChange={(e) => setCanContact(e.target.checked)} className="h-5 w-5 rounded accent-blue-600" />
              You can contact me about this
            </label>
          )}

          <button
            onClick={send}
            disabled={sending || (!rating && !message.trim())}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-[16px] font-semibold text-white shadow-md shadow-blue-600/25 disabled:opacity-50"
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />} Send
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FeedbackCard;
