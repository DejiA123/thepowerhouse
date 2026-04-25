import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Shield, Eye, Users, Bell, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface PrivacySettingsProps {
  onBack: () => void;
}

interface PrivacyPreferences {
  profileVisible: boolean;
  showOnlineStatus: boolean;
  allowFriendRequests: boolean;
  showReadingActivity: boolean;
  allowNotifications: boolean;
  shareProgress: boolean;
}

export const PrivacySettings = ({ onBack }: PrivacySettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    profileVisible: true,
    showOnlineStatus: false,
    allowFriendRequests: true,
    showReadingActivity: false,
    allowNotifications: true,
    shareProgress: false
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadPrivacySettings();
    }
  }, [user]);

  const loadPrivacySettings = async () => {
    // Load from localStorage
    const localSettings = {
      profileVisible: localStorage.getItem('profileVisible') !== 'false',
      showOnlineStatus: localStorage.getItem('showOnlineStatus') === 'true',
      allowFriendRequests: localStorage.getItem('allowFriendRequests') !== 'false',
      showReadingActivity: localStorage.getItem('showReadingActivity') === 'true',
      allowNotifications: localStorage.getItem('allowNotifications') !== 'false',
      shareProgress: localStorage.getItem('shareProgress') === 'true'
    };
    setPreferences(localSettings);
  };

  const savePrivacySettings = async (newSettings: Partial<PrivacyPreferences>) => {
    if (!user) return;

    const updated = { ...preferences, ...newSettings };
    setPreferences(updated);
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          profile_visible: updated.profileVisible,
          show_online_status: updated.showOnlineStatus,
          allow_friend_requests: updated.allowFriendRequests,
          show_reading_activity: updated.showReadingActivity,
          allow_notifications: updated.allowNotifications,
          share_progress: updated.shareProgress,
        } as any);

      if (error) throw error;

      toast({
        title: "Privacy Settings Updated",
        description: "Your privacy preferences have been saved",
      });
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast({
        title: "Error",
        description: "Failed to save privacy settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof PrivacyPreferences) => (checked: boolean) => {
    savePrivacySettings({ [key]: checked });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Privacy Settings</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Visibility */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Profile Visibility
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Public Profile</p>
                <p className="text-sm text-muted-foreground">Allow others to view your profile</p>
              </div>
              <Switch
                checked={preferences.profileVisible}
                onCheckedChange={handleToggle('profileVisible')}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Show Online Status</p>
                <p className="text-sm text-muted-foreground">Let others see when you're online</p>
              </div>
              <Switch
                checked={preferences.showOnlineStatus}
                onCheckedChange={handleToggle('showOnlineStatus')}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Social Interactions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5" />
            Social Interactions
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Allow Friend Requests</p>
                <p className="text-sm text-muted-foreground">Let others send you friend requests</p>
              </div>
              <Switch
                checked={preferences.allowFriendRequests}
                onCheckedChange={handleToggle('allowFriendRequests')}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Share Reading Activity</p>
                <p className="text-sm text-muted-foreground">Show what you're reading to friends</p>
              </div>
              <Switch
                checked={preferences.showReadingActivity}
                onCheckedChange={handleToggle('showReadingActivity')}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Share Reading Progress</p>
                <p className="text-sm text-muted-foreground">Let others see your reading milestones</p>
              </div>
              <Switch
                checked={preferences.shareProgress}
                onCheckedChange={handleToggle('shareProgress')}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Allow Notifications</p>
                <p className="text-sm text-muted-foreground">Receive app notifications and updates</p>
              </div>
              <Switch
                checked={preferences.allowNotifications}
                onCheckedChange={handleToggle('allowNotifications')}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Privacy Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Your Privacy
          </h2>
          
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Data Collection:</strong> We only collect data necessary to provide our services.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Data Sharing:</strong> We never sell your personal information to third parties.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Data Security:</strong> Your data is encrypted and stored securely.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Account Deletion:</strong> You can delete your account and all associated data at any time.
            </p>
          </div>
        </div>

        {/* Privacy Actions */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full">
            View Privacy Policy
          </Button>
          <Button variant="outline" className="w-full">
            Download My Data
          </Button>
          <Button variant="outline" className="w-full text-destructive">
            Delete All My Data
          </Button>
        </div>
      </div>
    </div>
  );
};