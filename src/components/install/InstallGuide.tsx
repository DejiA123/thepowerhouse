import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown, ArrowUp, BookOpen, ChevronLeft, ChevronRight, Copy, Download, Ellipsis, EllipsisVertical, Share, SquarePlus,
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import { installContext, type InstallContext } from '@/lib/install';
import { church } from '@/config/church';

/* ── Little drawings of the browser buttons to tap (the one to tap is ringed) ── */

const ring = 'ring-2 ring-blue-600 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800';
const Picture = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('rounded-2xl bg-slate-100 p-2.5 dark:bg-slate-800', className)}>{children}</div>
);
const Row = ({ label, icon: Icon, on }: { label: string; icon?: typeof Share; on?: boolean }) => (
  <div
    className={cn(
      'flex items-center justify-between gap-2 rounded-lg px-2.5',
      on ? cn('whitespace-nowrap bg-white py-1.5 text-[11.5px] font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100', ring) : 'py-0.5 text-[12px] text-slate-400',
    )}
  >
    <span className="min-w-0 truncate">{label}</span>
    {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
  </div>
);
const Circle = ({ children, on }: { children: ReactNode; on?: boolean }) => (
  <span
    className={cn(
      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm dark:bg-slate-700 dark:text-slate-300',
      on && cn('text-slate-800 dark:text-white', ring),
    )}
  >
    {children}
  </span>
);
const AddBar = () => (
  <div className="flex items-center justify-between text-[11.5px] text-slate-400">
    <span>Cancel</span>
    <span className={cn('rounded-md bg-white px-1.5 font-bold text-blue-600 dark:bg-slate-700 dark:text-blue-400', ring)}>Add</span>
  </div>
);

/** iOS 26 Safari: the bar at the bottom, with ••• on the right */
const Safari26Bar = () => (
  <Picture className="flex items-center gap-1.5">
    <Circle><ChevronLeft className="h-3.5 w-3.5" /></Circle>
    <span className="h-7 flex-1 rounded-full bg-white shadow-sm dark:bg-slate-700" />
    <Circle on><Ellipsis className="h-4 w-4" /></Circle>
  </Picture>
);
/** Older Safari: the toolbar with Share in the middle */
const SafariToolbar = () => (
  <Picture className="flex items-center justify-around text-blue-500">
    <ChevronLeft className="h-4 w-4" />
    <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
    <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-slate-700', ring)}><Share className="h-4 w-4" /></span>
    <BookOpen className="h-4 w-4" />
    <Copy className="h-4 w-4" />
  </Picture>
);
/** A browser's address bar with the button to tap at its right-hand end */
const AddressBar = ({ icon }: { icon: ReactNode }) => (
  <Picture className="flex items-center gap-1.5">
    <span className="h-7 flex-1 rounded-full bg-white shadow-sm dark:bg-slate-700" />
    <Circle on>{icon}</Circle>
  </Picture>
);
const AddToHomeScreen = ({ withCopy }: { withCopy?: boolean }) => (
  <Picture className="space-y-1">
    {withCopy && <Row label="Copy" icon={Copy} />}
    <Row label="Add to Home Screen" icon={SquarePlus} on />
  </Picture>
);

interface Step {
  text: ReactNode;
  picture: ReactNode;
  /** A small line under the step */
  hint?: ReactNode;
}
interface Guide {
  title: string;
  subtitle: string;
  steps: Step[];
  /** Where on the screen the first button is: the arrow points there */
  start?: 'bottom' | 'bottom-right' | 'top-right';
  copyLink?: string;
}

function guideFor(context: InstallContext): Guide {
  const title = 'Add it to your Home Screen';
  if (context.kind === 'in-app') {
    const target = context.os === 'ios' ? 'Safari' : 'Chrome';
    return {
      title: `Open in ${target} to get the app`,
      subtitle: `${context.app === 'this app' ? 'This app' : `${context.app}'s`} browser can't add apps to your Home Screen.`,
      steps: [
        {
          text: <>Tap <b>{context.os === 'ios' ? '•••' : '⋮'}</b> at the top right</>,
          picture: <AddressBar icon={context.os === 'ios' ? <Ellipsis className="h-4 w-4" /> : <EllipsisVertical className="h-4 w-4" />} />,
        },
        {
          text: <>Tap <b>Open in {target}</b> or <b>Open in browser</b></>,
          picture: <Picture><Row label={`Open in ${target}`} on /></Picture>,
          hint: <>The app will show you the last few taps from there.</>,
        },
      ],
      start: 'top-right',
      copyLink: target,
    };
  }
  if (context.kind === 'ios') {
    if (context.browser === 'chrome') {
      return {
        title,
        subtitle: '3 taps. Then open it like any other app.',
        steps: [
          { text: <>Tap <b>Share</b> in the address bar</>, picture: <AddressBar icon={<Share className="h-3.5 w-3.5" />} /> },
          { text: <>Tap <b>Add to Home Screen</b></>, picture: <AddToHomeScreen withCopy />, hint: <>Not there? Scroll down and tap <b>More</b>.</> },
          { text: <>Tap <b>Add</b> at the top right</>, picture: <Picture><AddBar /></Picture> },
        ],
        start: 'top-right',
      };
    }
    if (context.browser === 'other') {
      return {
        title,
        subtitle: "It's easiest in Safari, but this browser can do it too.",
        steps: [
          { text: <>Open the browser's menu and tap <b>Share</b></>, picture: <Picture><Row label="Share" icon={Share} on /></Picture> },
          { text: <>Tap <b>Add to Home Screen</b></>, picture: <AddToHomeScreen withCopy /> },
          { text: <>Tap <b>Add</b></>, picture: <Picture><AddBar /></Picture> },
        ],
        copyLink: 'Safari',
      };
    }
    // Safari 26 (iOS 26 and later) keeps Share in the ••• menu; iPads keep it at the top
    if (context.safariVersion >= 26 && !context.ipad) {
      return {
        title,
        subtitle: '4 taps. Then open it like any other app.',
        steps: [
          {
            text: <>Tap <b>•••</b> at the bottom right</>,
            picture: <Safari26Bar />,
            hint: <>No <b>•••</b>? Tap <b>Share</b> <Share className="inline h-3.5 w-3.5 -translate-y-px" /> at the bottom instead.</>,
          },
          { text: <>Tap <b>Share</b></>, picture: <Picture className="space-y-1"><Row label="Share" icon={Share} on /><Row label="Add to Bookmarks" icon={BookOpen} /></Picture> },
          { text: <>Tap <b>Add to Home Screen</b></>, picture: <AddToHomeScreen withCopy />, hint: <>Not there? Scroll down and tap <b>View More</b>.</> },
          {
            text: <>Leave <b>Open as Web App</b> on, tap <b>Add</b></>,
            picture: (
              <Picture className="space-y-1.5">
                <AddBar />
                <div className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 dark:bg-slate-700">
                  <img src={church.brand.icon192} alt="" className="h-5 w-5 rounded-md" />
                  <span className="truncate text-[11.5px] font-medium text-slate-700 dark:text-slate-200">{church.name}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white px-2 py-1 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  Open as Web App
                  <span className="flex h-4 w-7 items-center justify-end rounded-full bg-green-500 p-0.5"><span className="h-3 w-3 rounded-full bg-white" /></span>
                </div>
              </Picture>
            ),
          },
        ],
        start: 'bottom-right',
      };
    }
    return {
      title,
      subtitle: '3 taps. Then open it like any other app.',
      steps: [
        context.ipad
          ? { text: <>Tap <b>Share</b> at the top of the screen</>, picture: <AddressBar icon={<Share className="h-3.5 w-3.5" />} /> }
          : { text: <>Tap <b>Share</b> at the bottom</>, picture: <SafariToolbar /> },
        { text: <>Scroll down, tap <b>Add to Home Screen</b></>, picture: <AddToHomeScreen /> },
        { text: <>Tap <b>Add</b> at the top right</>, picture: <Picture><AddBar /></Picture> },
      ],
      start: context.ipad ? 'top-right' : 'bottom',
    };
  }
  // Android (and computers) when the browser hasn't offered its own Install box
  return {
    title,
    subtitle: '3 taps. Then open it like any other app.',
    steps: [
      { text: <>Tap <b>⋮</b> at the top right</>, picture: <AddressBar icon={<EllipsisVertical className="h-4 w-4" />} /> },
      {
        text: <>Tap <b>Install app</b> or <b>Add to Home screen</b></>,
        picture: <Picture className="space-y-1"><Row label="Install app" icon={Download} on /><Row label="Add to Home screen" /></Picture>,
        hint: <>Opened from WhatsApp or another app? Tap <b>Open in Chrome</b> first.</>,
      },
      { text: <>Tap <b>Install</b></>, picture: <Picture><Row label="Install" on /></Picture> },
    ],
    start: 'top-right',
  };
}

const copyLink = async (browser: string) => {
  try {
    await navigator.clipboard.writeText(`${location.origin}/`);
    appAlert('Link copied', `Open ${browser}, tap the address bar and paste it.`, 'success');
  } catch {
    appAlert('Copy this link', `${location.origin}/`, 'info');
  }
};

/** The arrow toward the first button to tap (outside the page: the browser's own bar). */
const StartHere = ({ at }: { at: NonNullable<Guide['start']> }) => {
  const up = at === 'top-right';
  return (
    <div
      className={cn(
        'pointer-events-none flex animate-bounce flex-col items-center',
        at === 'bottom' && 'mx-auto',
        at === 'bottom-right' && 'ml-auto mr-1 items-end',
      )}
    >
      {up && <ArrowUp className="mr-2 h-7 w-7 text-blue-600 dark:text-blue-400" />}
      <span className="rounded-full bg-blue-600 px-3 py-1 text-[12.5px] font-semibold text-white shadow-md">Start here</span>
      {!up && <ArrowDown className={cn('h-7 w-7 text-blue-600 dark:text-blue-400', at === 'bottom-right' && 'mr-2')} />}
    </div>
  );
};

/** "Show me how": pictures of the taps that add the app to the Home Screen, for this browser. */
const InstallGuide = ({ request }: { request: number }) => {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<InstallContext>(installContext);

  // Each "Show me how" (see openInstallGuide)
  useEffect(() => {
    setContext(installContext());
    setOpen(true);
  }, [request]);

  if (context.kind === 'installed') return null;
  const guide = guideFor(context);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-[28px] p-0 pb-[max(env(safe-area-inset-bottom),12px)] sm:mx-auto sm:max-w-md [&>button]:right-5 [&>button]:top-5"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
        <div className="px-5 pr-14 pt-3">
          <SheetTitle className="font-outfit text-[21px] font-bold leading-tight">{guide.title}</SheetTitle>
          <SheetDescription className="mt-0.5 text-[13.5px]">{guide.subtitle}</SheetDescription>
        </div>
        <ol className="space-y-3 px-5 pt-4">
          {guide.steps.map((step, i) => (
            <li key={i}>
              <div className="flex items-center gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-blue-600 text-[13px] font-bold text-white">
                  {i + 1}
                </span>
                <p className="w-[106px] shrink-0 text-[14px] leading-snug text-foreground">{step.text}</p>
                <div className="min-w-0 flex-1">{step.picture}</div>
              </div>
              {step.hint && <p className="mt-1.5 pl-[38px] text-[12px] leading-snug text-muted-foreground">{step.hint}</p>}
            </li>
          ))}
        </ol>
        {guide.copyLink && (
          <div className="px-5 pt-4">
            <button
              onClick={() => copyLink(guide.copyLink!)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-2.5 text-[14.5px] font-semibold text-foreground active:scale-[0.99]"
            >
              <Copy className="h-4 w-4" /> Or copy the link for {guide.copyLink}
            </button>
          </div>
        )}
        {guide.start && guide.start !== 'top-right' ? (
          <div className="flex px-5 pt-3">
            <StartHere at={guide.start} />
          </div>
        ) : (
          <div className="h-4" />
        )}
        {/* The buttons at the top are outside the page: point at them over the dimmed screen */}
        {open && guide.start === 'top-right' &&
          createPortal(
            <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+20px)] z-[210]">
              <StartHere at="top-right" />
            </div>,
            document.body,
          )}
      </SheetContent>
    </Sheet>
  );
};

export default InstallGuide;
