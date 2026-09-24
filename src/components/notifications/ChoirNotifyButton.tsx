import { useEffect, useState } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { appAlert } from '@/lib/appAlert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { followTopic, isFollowingTopic, unfollowTopic } from '@/lib/push';
import EnableNotificationsCard from './EnableNotificationsCard';

const optOutKey = (location: string) => `choir_alerts_optout_${location}`;

/**
 * "Song alerts" toggle for a choir location. Members who have notifications on
 * follow their choir automatically; the bell lets anyone opt in or out.
 */
const ChoirNotifyButton = ({ location, className }: { location: string; className?: string }) => {
  const topic = `choir:${location}`;
  const { state, busy, enable } = usePushNotifications();
  const [following, setFollowing] = useState(() => isFollowingTopic(topic));
  const [working, setWorking] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Auto-follow the choir you're viewing once notifications are on (unless you opted out)
  useEffect(() => {
    if (state !== 'on' || following) return;
    if (localStorage.getItem(optOutKey(location))) return;
    followTopic(topic).then((ok) => ok && setFollowing(true));
  }, [state, following, topic, location]);

  const toggle = async () => {
    if (state === 'needs-install' || state === 'unsupported') {
      setShowSetup(true);
      return;
    }
    if (state === 'denied') {
      appAlert('Notifications are blocked', 'Allow them for this app in your phone or browser settings.', 'error');
      return;
    }
    setWorking(true);
    try {
      if (following && state === 'on') {
        await unfollowTopic(topic);
        localStorage.setItem(optOutKey(location), '1');
        setFollowing(false);
        appAlert('Song alerts turned off');
        return;
      }
      localStorage.removeItem(optOutKey(location));
      if (state !== 'on') {
        const result = await enable([topic]);
        if (result !== 'on') return;
      } else {
        await followTopic(topic);
      }
      setFollowing(true);
      appAlert('Song alerts on', "You'll be notified when new songs are added.", 'success');
    } finally {
      setWorking(false);
    }
  };

  const on = following && state === 'on';

  return (
    <>
      <button
        onClick={toggle}
        disabled={working || busy || state === 'loading'}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition active:scale-95',
          on
            ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25 hover:bg-violet-700'
            : 'bg-white/90 text-violet-700 ring-1 ring-violet-200 hover:bg-white dark:bg-slate-800 dark:text-violet-300 dark:ring-violet-800',
          className,
        )}
        aria-pressed={on}
        title={on ? 'Song alerts on — tap to turn off' : 'Get notified when songs are added'}
      >
        {working || busy ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {on ? 'Alerts on' : 'Song alerts'}
      </button>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Get choir song alerts</DialogTitle>
            <DialogDescription>Be the first to know when a song is added to the setlist.</DialogDescription>
          </DialogHeader>
          <EnableNotificationsCard topics={[topic]} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChoirNotifyButton;
