import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, Loader2, MessageCircle, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import { openInstallGuide } from '@/lib/install';
import { enablePush, getPushState, isIOS, isStandalone, pushErrorMessage, type PushState } from '@/lib/push';
import { church } from '@/config/church';

/** "the Power House app" (not "the The Power House app") */
const appName = church.name.replace(/^the\s+/i, '');

const HIDE_KEY = 'setup_check_hidden_until';

/** Hidden for a few days after "Later" (or for good once everything is done) */
function hiddenNow() {
  try {
    return Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

/**
 * "You're nearly set up": the three things that make the app work like WhatsApp
 * for someone new (a choir member who just joined with a link):
 *  1. On the Home Screen (on iPhone, notifications only work from there)
 *  2. Notifications on (so messages arrive like WhatsApp's)
 *  3. In the group
 * Shown at the top of Messages until done, and straight after joining with a link.
 */
const SetupCheck = ({ groupName, className, always = false }: { groupName?: string | null; className?: string; always?: boolean }) => {
  const [push, setPush] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(() => !always && hiddenNow());
  const onHomeScreen = isStandalone();

  const refresh = useCallback(() => {
    getPushState().then(setPush).catch(() => setPush('unsupported'));
  }, []);
  useEffect(() => {
    refresh();
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  if (push === null || hidden) return null;
  // Desktop browsers without push, or everything done: nothing to ask
  const needsHome = isIOS() && !onHomeScreen;
  const pushOn = push === 'on';
  const pushPossible = push !== 'unsupported';
  if (!needsHome && (pushOn || !pushPossible) && !always) return null;

  const turnOn = async () => {
    setBusy(true);
    try {
      const state = await enablePush();
      setPush(state);
      if (state === 'denied') appAlert('Notifications are blocked', 'Turn them on in your phone’s Settings for this app, then come back.', 'error');
    } catch (e) {
      appAlert("Couldn't turn on notifications", pushErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const later = () => {
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now() + 3 * 86400_000));
    } catch {
      /* private window */
    }
    setHidden(true);
  };

  const steps = [
    {
      key: 'home',
      icon: Smartphone,
      done: !needsHome,
      title: 'Add the app to your Home Screen',
      detail: needsHome
        ? `Then open the ${appName} app from your Home Screen and sign in once more: your chats will be there.`
        : 'Done',
      action: needsHome ? { label: 'Show me', onClick: openInstallGuide } : null,
    },
    {
      key: 'push',
      icon: Bell,
      done: pushOn,
      title: 'Turn on notifications',
      detail: pushOn
        ? 'Done: messages arrive like WhatsApp’s'
        : needsHome
          ? 'After step 1 (iPhone only allows it from the Home Screen)'
          : push === 'denied'
            ? 'Blocked: allow them in your phone’s Settings for this app'
            : 'So you never miss a message',
      action: !pushOn && !needsHome && push !== 'denied' && pushPossible ? { label: busy ? '' : 'Turn on', onClick: turnOn } : null,
    },
    ...(groupName ? [{
      key: 'group',
      icon: MessageCircle,
      done: true,
      title: `You’re in ${groupName}`,
      detail: 'Say hello!',
      action: null,
    }] : []),
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className={cn('rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm dark:border-blue-900/50 dark:from-blue-950/40 dark:to-slate-900', className)} aria-label="Finish setting up">
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold text-foreground">You’re nearly set up</p>
          <p className="text-[13px] text-muted-foreground">{doneCount} of {steps.length} done · takes a minute</p>
        </div>
        <button onClick={later} className="-mr-1 -mt-1 rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Later">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 dark:bg-slate-900/60">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', s.done ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white')}>
              {s.done ? <Check className="h-5 w-5" /> : <s.icon className="h-[18px] w-[18px]" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-[14.5px] font-semibold', s.done ? 'text-muted-foreground line-through decoration-1' : 'text-foreground')}>
                {i + 1}. {s.title}
              </span>
              <span className="block text-[12.5px] leading-snug text-muted-foreground">{s.detail}</span>
            </span>
            {s.action && (
              <button onClick={s.action.onClick} disabled={busy} className="shrink-0 rounded-full bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm active:scale-95 disabled:opacity-60">
                {busy && s.key === 'push' ? <Loader2 className="h-4 w-4 animate-spin" /> : s.action.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};

export default SetupCheck;
