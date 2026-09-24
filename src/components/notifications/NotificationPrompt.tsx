import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import EnableNotificationsCard from './EnableNotificationsCard';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'notification_prompt_dismissed_at';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const dismissedRecently = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};

/**
 * Gentle, dismissible invitation to turn on notifications for signed-in users
 * who haven't yet. Never triggers the browser prompt on its own.
 */
const NotificationPrompt = ({ className }: { className?: string }) => {
  const { user } = useAuth();
  const { state } = usePushNotifications();
  const [hidden, setHidden] = useState(dismissedRecently);

  if (!user || hidden) return null;
  if (state !== 'default' && state !== 'granted-off' && state !== 'needs-install') return null;

  return (
    <div className={cn('relative', className)}>
      <EnableNotificationsCard className="pr-10" />
      <button
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
          } catch {
            /* ignore */
          }
          setHidden(true);
        }}
        className="absolute right-2 top-2 rounded-full p-2 text-muted-foreground hover:bg-muted"
        aria-label="Not now"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default NotificationPrompt;
