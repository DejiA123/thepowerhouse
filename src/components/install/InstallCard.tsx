import { useEffect, useState } from 'react';
import { Copy, Download, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import { TOUR_DONE_EVENT, TOUR_DONE_KEY } from '@/lib/appEvents';
import { installedBefore, openInstallGuide, promptInstall, useInstallContext } from '@/lib/install';
import { church } from '@/config/church';

const DISMISS_KEY = 'install_card_dismissed_at';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const dismissedRecently = () => Date.now() - Number(read(DISMISS_KEY) || 0) < SNOOZE_MS;

/**
 * "Get <church> app" at the top of Home, for phones that haven't
 * installed it: one-tap Install where the browser allows it (Android), the
 * step-by-step pictures on iPhone, and how to reach Safari/Chrome from inside
 * Instagram, Facebook and the like. Waits until the welcome tour is over.
 */
const InstallCard = () => {
  const context = useInstallContext();
  const [hidden, setHidden] = useState(dismissedRecently);
  const [tourDone, setTourDone] = useState(() => read(TOUR_DONE_KEY) === '1');

  useEffect(() => {
    if (tourDone) return;
    const done = () => setTourDone(true);
    window.addEventListener(TOUR_DONE_EVENT, done);
    return () => window.removeEventListener(TOUR_DONE_EVENT, done);
  }, [tourDone]);

  const show =
    context.kind === 'ios' ||
    context.kind === 'in-app' ||
    // Android only when it can install in one tap (otherwise it may already be installed)
    (context.kind === 'android' && context.canPrompt && !installedBefore());
  if (!show || hidden || !tourDone) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setHidden(true);
  };

  const inApp = context.kind === 'in-app' ? context : null;
  const target = inApp?.os === 'android' ? 'Chrome' : 'Safari';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/`);
      appAlert('Link copied', `Open ${target}, tap the address bar and paste it.`, 'success');
    } catch {
      appAlert('Copy this link', `${location.origin}/`, 'info');
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-[22px] border bg-gradient-to-br via-white to-white p-4 shadow-sm dark:via-slate-900 dark:to-slate-900',
        inApp
          ? 'border-amber-200 from-amber-50 dark:border-amber-900/60 dark:from-amber-950/40'
          : 'border-blue-100 from-blue-50 dark:border-blue-900/60 dark:from-blue-950/40',
      )}
    >
      <button onClick={dismiss} className="absolute right-2 top-2 rounded-full p-2 text-slate-400 hover:bg-muted" aria-label="Not now">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <img
          src={church.brand.icon192}
          alt=""
          className="h-14 w-14 shrink-0 rounded-[14px] bg-white shadow-md ring-1 ring-black/5"
        />
        <div className="min-w-0">
          <p className="font-outfit text-[18px] font-bold leading-tight text-foreground">
            {inApp ? `Open in ${target} to get the app` : `Get ${church.name} app`}
          </p>
          <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">
            {inApp
              ? `${inApp.app === 'this app' ? 'This app' : `${inApp.app}'s`} browser can't add apps to your Home Screen.`
              : 'Free. Opens full screen from your Home Screen, works offline and brings church notifications.'}
          </p>
        </div>
      </div>

      {inApp ? (
        <>
          <ol className="mt-3 space-y-2 text-[14px] text-foreground">
            <li className="flex items-center gap-2.5">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-blue-600 text-[12px] font-bold text-white">1</span>
              <span>Tap <b>{inApp.os === 'ios' ? '•••' : '⋮'}</b> at the top right</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-blue-600 text-[12px] font-bold text-white">2</span>
              <span>Tap <b>Open in {target}</b> or <b>Open in browser</b></span>
            </li>
          </ol>
          <button
            onClick={copyLink}
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-2.5 text-[14.5px] font-semibold text-foreground active:scale-[0.99]"
          >
            <Copy className="h-4 w-4" /> Or copy the link for {target}
          </button>
        </>
      ) : (
        <div className="mt-3.5 flex items-center gap-3">
          <button
            onClick={() => (context.kind === 'android' ? promptInstall() : openInstallGuide())}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 py-3 text-[15px] font-semibold text-white shadow-md shadow-blue-600/25 active:scale-[0.99]"
          >
            {context.kind === 'android' ? <Download className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
            {context.kind === 'android' ? 'Install' : 'Show me how'}
          </button>
          <span className="shrink-0 text-[12.5px] text-muted-foreground">{context.kind === 'android' ? 'One tap' : '20 seconds'}</span>
        </div>
      )}
    </div>
  );
};

export default InstallCard;
