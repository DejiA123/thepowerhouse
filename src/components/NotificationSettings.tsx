import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Bell, MessageCircle, Calendar, BookOpen, Users, Volume2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface NotificationSettingsProps {
  onBack: () => void;
}

export const NotificationSettings = ({ onBack }: NotificationSettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    // General notifications
    generalNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    
    // Bible reading notifications
    dailyScripture: true,
    readingReminders: true,
    readingPlanUpdates: true,
    verseOfTheDay: true,
    
    // Social notifications
    newMessages: true,
    groupUpdates: true,
    friendRequests: true,
    mentions: true,
    
    // Event notifications
    upcomingEvents: true,
    eventReminders: true,
    eventUpdates: true,
    
    // Content notifications
    newContent: true,
    contentUpdates: true,
    announcements: true,
    
    // Reminder settings
    reminderTime: '09:00',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });

  useEffect(() => {
    loadNotificationSettings();
  }, [user]);

  const loadNotificationSettings = async () => {
    try {
      // Load from localStorage first
      const stored = localStorage.getItem('notification_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      }

      // Load from database if available - only load basic notification settings
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('notifications_enabled')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setSettings(prev => ({
            ...prev,
            generalNotifications: data.notifications_enabled !== false
          }));
        }
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async (newSettings: Partial<typeof settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      // Save to localStorage
      localStorage.setItem('notification_settings', JSON.stringify(updatedSettings));
      
      // Save to database - only save basic notification settings that exist in the schema
      if (user) {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            notifications_enabled: updatedSettings.generalNotifications,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Database error:', error);
          toast({
            title: "Error",
            description: "Failed to save notification settings",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Success",
            description: "Notification settings saved",
          });
        }
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    }
  };

  const handleToggle = (setting: keyof typeof settings, value: boolean) => {
    saveNotificationSettings({ [setting]: value });
  };

  const handleQuietHoursToggle = (enabled: boolean) => {
    saveNotificationSettings({
      quietHours: { ...settings.quietHours, enabled }
    });
  };

  const handleTimeChange = (type: 'reminder' | 'quietStart' | 'quietEnd', time: string) => {
    if (type === 'reminder') {
      saveNotificationSettings({ reminderTime: time });
    } else if (type === 'quietStart') {
      saveNotificationSettings({
        quietHours: { ...settings.quietHours, start: time }
      });
    } else if (type === 'quietEnd') {
      saveNotificationSettings({
        quietHours: { ...settings.quietHours, end: time }
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Notification Settings</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* General Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            General Notifications
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Enable Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications from the app</p>
              </div>
              <Switch
                checked={settings.generalNotifications}
                onCheckedChange={(checked) => handleToggle('generalNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Sound</p>
                <p className="text-sm text-gray-500">Play sound for notifications</p>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => handleToggle('soundEnabled', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Vibration</p>
                <p className="text-sm text-gray-500">Vibrate for notifications</p>
              </div>
              <Switch
                checked={settings.vibrationEnabled}
                onCheckedChange={(checked) => handleToggle('vibrationEnabled', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>
          </div>
        </div>

        {/* Bible Reading Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Bible Reading
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Daily Scripture</p>
                <p className="text-sm text-gray-500">Get daily Bible verses</p>
              </div>
              <Switch
                checked={settings.dailyScripture}
                onCheckedChange={(checked) => handleToggle('dailyScripture', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Reading Reminders</p>
                <p className="text-sm text-gray-500">Reminders to read your Bible</p>
              </div>
              <Switch
                checked={settings.readingReminders}
                onCheckedChange={(checked) => handleToggle('readingReminders', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Reading Plan Updates</p>
                <p className="text-sm text-gray-500">Updates on your reading progress</p>
              </div>
              <Switch
                checked={settings.readingPlanUpdates}
                onCheckedChange={(checked) => handleToggle('readingPlanUpdates', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Verse of the Day</p>
                <p className="text-sm text-gray-500">Daily inspirational verses</p>
              </div>
              <Switch
                checked={settings.verseOfTheDay}
                onCheckedChange={(checked) => handleToggle('verseOfTheDay', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>
          </div>
        </div>

        {/* Social Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Social
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">New Messages</p>
                <p className="text-sm text-gray-500">When someone sends you a message</p>
              </div>
              <Switch
                checked={settings.newMessages}
                onCheckedChange={(checked) => handleToggle('newMessages', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Group Updates</p>
                <p className="text-sm text-gray-500">Updates from your groups</p>
              </div>
              <Switch
                checked={settings.groupUpdates}
                onCheckedChange={(checked) => handleToggle('groupUpdates', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Friend Requests</p>
                <p className="text-sm text-gray-500">When someone wants to connect</p>
              </div>
              <Switch
                checked={settings.friendRequests}
                onCheckedChange={(checked) => handleToggle('friendRequests', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Mentions</p>
                <p className="text-sm text-gray-500">When someone mentions you</p>
              </div>
              <Switch
                checked={settings.mentions}
                onCheckedChange={(checked) => handleToggle('mentions', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>
          </div>
        </div>

        {/* Event Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Events
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Upcoming Events</p>
                <p className="text-sm text-gray-500">New events in your area</p>
              </div>
              <Switch
                checked={settings.upcomingEvents}
                onCheckedChange={(checked) => handleToggle('upcomingEvents', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Event Reminders</p>
                <p className="text-sm text-gray-500">Reminders before events</p>
              </div>
              <Switch
                checked={settings.eventReminders}
                onCheckedChange={(checked) => handleToggle('eventReminders', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Event Updates</p>
                <p className="text-sm text-gray-500">Changes to events you're attending</p>
              </div>
              <Switch
                checked={settings.eventUpdates}
                onCheckedChange={(checked) => handleToggle('eventUpdates', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>
          </div>
        </div>

        {/* Content Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Content
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">New Content</p>
                <p className="text-sm text-gray-500">New sermons, articles, and resources</p>
              </div>
              <Switch
                checked={settings.newContent}
                onCheckedChange={(checked) => handleToggle('newContent', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Content Updates</p>
                <p className="text-sm text-gray-500">Updates to existing content</p>
              </div>
              <Switch
                checked={settings.contentUpdates}
                onCheckedChange={(checked) => handleToggle('contentUpdates', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Announcements</p>
                <p className="text-sm text-gray-500">Important church announcements</p>
              </div>
              <Switch
                checked={settings.announcements}
                onCheckedChange={(checked) => handleToggle('announcements', checked)}
                disabled={!settings.generalNotifications}
              />
            </div>
          </div>
        </div>

        {/* Reminder Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Reminder Settings
          </h2>
          
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">Daily Reminder Time</p>
                  <p className="text-sm text-gray-500">When to send daily reminders</p>
                </div>
              </div>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => handleTimeChange('reminder', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={!settings.generalNotifications}
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">Quiet Hours</p>
                  <p className="text-sm text-gray-500">Don't send notifications during these hours</p>
                </div>
                <Switch
                  checked={settings.quietHours.enabled}
                  onCheckedChange={handleQuietHoursToggle}
                  disabled={!settings.generalNotifications}
                />
              </div>
              
              {settings.quietHours.enabled && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">From:</span>
                    <input
                      type="time"
                      value={settings.quietHours.start}
                      onChange={(e) => handleTimeChange('quietStart', e.target.value)}
                      className="p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">To:</span>
                    <input
                      type="time"
                      value={settings.quietHours.end}
                      onChange={(e) => handleTimeChange('quietEnd', e.target.value)}
                      className="p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};