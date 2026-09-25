import { Bell, BellOff, BellRing, CheckCircle2, Loader2, PlusSquare, Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface Props {
  className?: string;
  /** Topics to follow when notifications are switched on (e.g. "choir:mayday") */
  topics?: string[];
  compact?: boolean;
  title?: string;
  description?: string;
}

/**
 * One place that explains and controls push notifications on this device,
 * including the "Add to Home Screen" step iPhones need first.
 */
const EnableNotificationsCard = ({ className, topics = [], compact, title, description }: Props) => {
  const { state, busy, error, enable, test } = usePushNotifications();

  if (state === 'loading') return null;

  const shell = (children: React.ReactNode, tone: 'primary' | 'muted' | 'success' = 'primary') => (
    <div
      className={cn(
        'rounded-2xl border p-4 sm:p-5',
        tone === 'primary' && 'border-primary/20 bg-primary/5',
        tone === 'muted' && 'border-border bg-muted/40',
        tone === 'success' && 'border-emerald-500/20 bg-emerald-500/5',
        className,
      )}
    >
      {children}
    </div>
  );

  if (state === 'on') {
    return shell(
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Notifications are on</p>
          {!compact && (
            <p className="text-sm text-muted-foreground">Messages, calls and choir updates will reach this device.</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={test} className="rounded-full">Test</Button>
        </div>
      </div>,
      'success',
    );
  }

  if (state === 'needs-install') {
    return shell(
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Install the app to get notifications</p>
            <p className="text-sm text-muted-foreground">
              On iPhone, notifications work once The Power House is on your Home Screen.
            </p>
          </div>
        </div>
        <ol className="space-y-2 pl-1 text-sm text-foreground">
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold shadow-sm">1</span>
            Tap <Share className="inline h-4 w-4 text-primary" /> <span className="font-medium">Share</span> in Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold shadow-sm">2</span>
            Choose <PlusSquare className="inline h-4 w-4 text-primary" /> <span className="font-medium">Add to Home Screen</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold shadow-sm">3</span>
            Open the app from your Home Screen and turn notifications on
          </li>
        </ol>
      </div>,
    );
  }

  if (state === 'denied') {
    return shell(
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <BellOff className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Notifications are blocked</p>
          <p className="text-sm text-muted-foreground">
            Allow notifications for this app in your phone or browser settings, then come back here.
          </p>
        </div>
      </div>,
      'muted',
    );
  }

  if (state === 'unsupported') {
    return compact ? null : shell(
      <div className="flex items-start gap-3">
        <BellOff className="mt-0.5 h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          This browser can't show notifications. Try Chrome, Edge, or Safari (iOS 16.4 or later).
        </p>
      </div>,
      'muted',
    );
  }

  // 'default' or 'granted-off'
  return shell(
    <div className={cn('flex gap-3', compact ? 'items-center' : 'flex-col sm:flex-row sm:items-center')}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{title ?? 'Turn on notifications'}</p>
          {!compact && (
            <p className="text-sm text-muted-foreground">
              {description ?? 'Get new messages, incoming calls and choir song updates, even when the app is closed.'}
            </p>
          )}
          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        </div>
      </div>
      <Button onClick={() => enable(topics)} disabled={busy} className="shrink-0 rounded-full px-5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
        <span className="ml-2">Turn on</span>
      </Button>
    </div>,
  );
};

export default EnableNotificationsCard;
