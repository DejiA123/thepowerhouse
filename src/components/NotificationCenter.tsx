import { useState, useEffect } from "react";
import EnableNotificationsCard from '@/components/notifications/EnableNotificationsCard';
import { pushNotificationService } from '@/services/pushNotificationService';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Bell, BellRing, BellOff, Clock, Users, Book } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface NotificationCenterProps {
  onBack: () => void;
}

interface NotificationSettings {
  dailyVerseEnabled: boolean;
  dailyVerseTime: string;
  readingRemindersEnabled: boolean;
  readingReminderTime: string;
  groupNotificationsEnabled: boolean;
  announcementsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const REMINDER_KEYS: (keyof NotificationSettings)[] = ['dailyVerseEnabled', 'dailyVerseTime', 'readingRemindersEnabled', 'readingReminderTime'];
const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};
const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/**
 * The server sends the reminders (send-daily-reminders, every minute), so the
 * times live on the account together with this device's time zone.
 */
async function saveReminders(userId: string, s: NotificationSettings) {
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: userId,
      daily_verse_enabled: s.dailyVerseEnabled,
      daily_verse_time: s.dailyVerseTime,
      reading_reminder_enabled: s.readingRemindersEnabled,
      reading_reminder_time: s.readingReminderTime,
      timezone: deviceTimeZone(),
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'user_id' },
  );
  return !error;
}

export const NotificationCenter = ({ onBack }: NotificationCenterProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<NotificationSettings>({
    dailyVerseEnabled: true,
    dailyVerseTime: '08:00',
    readingRemindersEnabled: true,
    readingReminderTime: '19:00',
    groupNotificationsEnabled: true,
    announcementsEnabled: true,
    emailNotificationsEnabled: false,
    pushNotificationsEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true
  });

  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');

  useEffect(() => {
    if (user) {
      loadNotificationSettings();
    }
    checkNotificationPermission();
  }, [user]);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive app notifications",
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "You can enable them in your browser settings",
          variant: "destructive"
        });
      }
    }
  };

  const loadNotificationSettings = async () => {
    // Load from localStorage for now
    const localSettings = {
      dailyVerseEnabled: localStorage.getItem('dailyVerseEnabled') === 'true',
      dailyVerseTime: localStorage.getItem('dailyVerseTime') || '08:00',
      readingRemindersEnabled: localStorage.getItem('readingRemindersEnabled') !== 'false',
      readingReminderTime: localStorage.getItem('readingReminderTime') || '19:00',
      groupNotificationsEnabled: localStorage.getItem('groupNotificationsEnabled') !== 'false',
      announcementsEnabled: localStorage.getItem('announcementsEnabled') !== 'false',
      emailNotificationsEnabled: localStorage.getItem('emailNotificationsEnabled') === 'true',
      pushNotificationsEnabled: localStorage.getItem('pushNotificationsEnabled') !== 'false',
      soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
      vibrationEnabled: localStorage.getItem('vibrationEnabled') !== 'false'
    };
    setSettings(localSettings);

    // The account holds the reminder times (so they reach every device)
    if (!user) return;
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('daily_verse_enabled, daily_verse_time, reading_reminder_enabled, reading_reminder_time, timezone')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) return;
    const row = data as {
      daily_verse_enabled?: boolean; daily_verse_time?: string; reading_reminder_enabled?: boolean;
      reading_reminder_time?: string; timezone?: string;
    } | null;
    const syncedKey = `reminders_synced_v1_${user.id}`;
    if (row && localStorage.getItem(syncedKey)) {
      setSettings((prev) => ({
        ...prev,
        dailyVerseEnabled: !!row.daily_verse_enabled,
        dailyVerseTime: row.daily_verse_time || '08:00',
        readingRemindersEnabled: !!row.reading_reminder_enabled,
        readingReminderTime: row.reading_reminder_time || '19:00',
      }));
      // Travelled? Keep reminders on local time
      if (row.timezone !== deviceTimeZone()) {
        await supabase.from('notification_preferences').update({ timezone: deviceTimeZone() } as never).eq('user_id', user.id);
      }
    } else if (await saveReminders(user.id, localSettings)) {
      // First time: this device's choices become the account's
      localStorage.setItem(syncedKey, '1');
    }
  };

  const saveNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    setLoading(true);

    try {
      // Save to localStorage
      Object.entries(updated).forEach(([key, value]) => {
        localStorage.setItem(key, String(value));
      });
      // The server sends daily reminders from what's saved on the account
      if (user && REMINDER_KEYS.some((k) => k in newSettings)) {
        if (!(await saveReminders(user.id, updated))) throw new Error('Could not save reminder times');
        localStorage.setItem(`reminders_synced_v1_${user.id}`, '1');
      }
      // The server checks this before sending group chat / call notifications
      if (user && 'groupNotificationsEnabled' in newSettings) {
        await pushNotificationService.updatePreferences(user.id, {
          group_chat_notifications: !!newSettings.groupNotificationsEnabled,
        });
      }

      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved",
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => (checked: boolean) => {
    saveNotificationSettings({ [key]: checked });
  };

  const handleTimeChange = (key: 'dailyVerseTime' | 'readingReminderTime') => (value: string) => {
    saveNotificationSettings({ [key]: value });
  };

  const testNotification = () => {
    if (permissionStatus === 'granted') {
      new Notification('Bible Reader App', {
        body: 'This is a test notification. Your notifications are working!',
        icon: '/favicon.png',
      });
    } else {
      toast({
        title: "Test Notification",
        description: "Your notifications are working! (Browser notification)",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Push notifications on this device (install + permission + subscription) */}
        <EnableNotificationsCard />

        {/* Daily Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Daily Reminders
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Daily Verse</p>
                <p className="text-sm text-muted-foreground">Receive a daily Bible verse</p>
              </div>
              <Switch
                checked={settings.dailyVerseEnabled}
                onCheckedChange={handleToggle('dailyVerseEnabled')}
                disabled={loading}
              />
            </div>

            {settings.dailyVerseEnabled && (
              <div className="ml-4">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Daily Verse Time
                </label>
                <TimeInput value={settings.dailyVerseTime} onChange={handleTimeChange('dailyVerseTime')} disabled={loading} />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Reading Reminders</p>
                <p className="text-sm text-muted-foreground">Remind you to read daily</p>
              </div>
              <Switch
                checked={settings.readingRemindersEnabled}
                onCheckedChange={handleToggle('readingRemindersEnabled')}
                disabled={loading}
              />
            </div>

            {settings.readingRemindersEnabled && (
              <div className="ml-4">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Reading Reminder Time
                </label>
                <TimeInput value={settings.readingReminderTime} onChange={handleTimeChange('readingReminderTime')} disabled={loading} />
              </div>
            )}
          </div>
        </div>

        {(settings.dailyVerseEnabled || settings.readingRemindersEnabled) && (
          <p className="-mt-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
            {(() => {
              const parts = [
                settings.dailyVerseEnabled && `the verse of the day at ${formatTime(settings.dailyVerseTime)}`,
                settings.readingRemindersEnabled && `a reading reminder at ${formatTime(settings.readingReminderTime)}`,
              ].filter(Boolean);
              return `You'll get ${parts.join(' and ')} every day, on your local time (${deviceTimeZone().replace(/_/g, ' ')}). `;
            })()}
            Notifications need to be on for this device.
          </p>
        )}

        {/* App Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5" />
            App Notifications
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Group Activities</p>
                <p className="text-sm text-muted-foreground">New messages and group updates</p>
              </div>
              <Switch
                checked={settings.groupNotificationsEnabled}
                onCheckedChange={handleToggle('groupNotificationsEnabled')}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Announcements</p>
                <p className="text-sm text-muted-foreground">Church announcements and updates</p>
              </div>
              <Switch
                checked={settings.announcementsEnabled}
                onCheckedChange={handleToggle('announcementsEnabled')}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Notification Methods */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Notification Methods</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Browser/device notifications</p>
              </div>
              <Switch
                checked={settings.pushNotificationsEnabled}
                onCheckedChange={handleToggle('pushNotificationsEnabled')}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                checked={settings.emailNotificationsEnabled}
                onCheckedChange={handleToggle('emailNotificationsEnabled')}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Sound</p>
                <p className="text-sm text-muted-foreground">Play sound with notifications</p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={handleToggle('soundEnabled')}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Vibration</p>
                <p className="text-sm text-muted-foreground">Vibrate for notifications (mobile)</p>
              </div>
              <Switch
                checked={settings.vibrationEnabled}
                onCheckedChange={handleToggle('vibrationEnabled')}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
/** Any time of day, in 5-minute steps (the phone shows its own time wheel) */
const TimeInput = ({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) => (
  <input
    type="time"
    step={300}
    value={value}
    disabled={disabled}
    onChange={(e) => e.target.value && onChange(e.target.value)}
    className="h-11 min-w-[8.5rem] rounded-xl border border-border bg-card px-3 text-[16px] font-semibold text-foreground shadow-sm outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
    aria-label="Reminder time"
  />
);
