import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
        icon: '/bible-icon.svg',
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
        {/* Permission Status */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Permission
          </h2>
          
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Browser Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Status: {permissionStatus === 'granted' ? 'Enabled' : permissionStatus === 'denied' ? 'Blocked' : 'Not Set'}
                </p>
              </div>
              {permissionStatus === 'granted' ? (
                <BellRing className="w-6 h-6 text-green-500" />
              ) : permissionStatus === 'denied' ? (
                <BellOff className="w-6 h-6 text-red-500" />
              ) : (
                <Bell className="w-6 h-6 text-yellow-500" />
              )}
            </div>
            
            {permissionStatus !== 'granted' && (
              <Button onClick={requestNotificationPermission} className="w-full mt-3">
                Enable Notifications
              </Button>
            )}
            
            {permissionStatus === 'granted' && (
              <Button variant="outline" onClick={testNotification} className="w-full mt-3">
                Test Notification
              </Button>
            )}
          </div>
        </div>

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
                <Select value={settings.dailyVerseTime} onValueChange={handleTimeChange('dailyVerseTime')}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">6:00 AM</SelectItem>
                    <SelectItem value="07:00">7:00 AM</SelectItem>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                    <SelectItem value="19:00">7:00 PM</SelectItem>
                    <SelectItem value="20:00">8:00 PM</SelectItem>
                    <SelectItem value="21:00">9:00 PM</SelectItem>
                  </SelectContent>
                </Select>
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
                <Select value={settings.readingReminderTime} onValueChange={handleTimeChange('readingReminderTime')}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">6:00 AM</SelectItem>
                    <SelectItem value="07:00">7:00 AM</SelectItem>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                    <SelectItem value="19:00">7:00 PM</SelectItem>
                    <SelectItem value="20:00">8:00 PM</SelectItem>
                    <SelectItem value="21:00">9:00 PM</SelectItem>
                    <SelectItem value="22:00">10:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

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