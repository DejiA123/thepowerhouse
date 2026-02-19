import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, User, QrCode, Bell, BookOpen, Settings as SettingsIcon, Shield, MessageCircle, HelpCircle, Users, Share2, Palette, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";

// Import new components
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { UnifiedThemeSettings } from "@/components/UnifiedThemeSettings";
import { AccountSettings } from "@/components/AccountSettings";
import { BibleSettingsPanel } from "@/components/BibleSettingsPanel";
import { PrivacySettings } from "@/components/PrivacySettings";
import { ChatSupport } from "@/components/ChatSupport";
import { HelpCenter } from "@/components/HelpCenter";
import { InviteFriend } from "@/components/InviteFriend";
import { NotificationCenter } from "@/components/NotificationCenter";

type ViewType = 'main' | 'theme' | 'account' | 'bible' | 'privacy' | 'chat' | 'help' | 'invite' | 'notifications';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  bio: string;
  phone: string;
  avatar_url?: string;
  updated_at: string;
}

const UserSettingsPage = () => {
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    full_name: 'Loading...',
    email: '',
    bio: 'Jesus is Lord 🙏',
    phone: '+234 123 456 7890',
    updated_at: new Date().toISOString()
  });

  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'about' | 'phone' | 'links' | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch user profile data
  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First, try to get existing profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      if (!profileData) {
        // Profile doesn't exist, create one
        const newProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'New User',
          email: user.email || '',
          // bio: 'Jesus is Lord 🙏', // Skip bio if column doesn't exist
          phone: '+234 123 456 7890',
          avatar_url: null,
          updated_at: new Date().toISOString()
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }

        profileData = createdProfile;
      }

      // Update local state with fetched profile
      setProfile({
        id: profileData.id,
        full_name: profileData.full_name || 'New User',
        email: profileData.email || user.email || '',
        bio: profileData.bio || 'Jesus is Lord 🙏', // Use default if bio column doesn't exist
        phone: profileData.phone || '+234 123 456 7890',
        avatar_url: profileData.avatar_url,
        updated_at: profileData.updated_at
      });

    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile. Please try again.",
        variant: "destructive"
      });

      // Set fallback profile data
      setProfile(prev => ({
        ...prev,
        full_name: user.user_metadata?.full_name || 'User',
        email: user.email || '',
        bio: 'Jesus is Lord 🙏',
        phone: '+234 123 456 7890'
      }));
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const handleSettingClick = (settingName: string) => {
    switch (settingName) {
      case 'Profile':
        setShowProfile(true);
        break;
      case 'Theme & Appearance':
        setCurrentView('theme');
        break;
      case 'Social Circle':
        navigate('/social');
        break;
      case 'Account':
        setCurrentView('account');
        break;
      case 'Bible Settings':
        setCurrentView('bible');
        break;
      case 'Privacy':
        setCurrentView('privacy');
        break;
      case 'Chat':
        setCurrentView('chat');
        break;
      case 'Help':
        setCurrentView('help');
        break;
      case 'Invite Friends':
        setCurrentView('invite');
        break;
      case 'Notifications':
        setCurrentView('notifications');
        break;
      default:
        toast({
          title: `${settingName} clicked`,
          description: `This would navigate to ${settingName} settings`,
        });
    }
  };

  const handleProfileFieldClick = (fieldName: string) => {
    const fieldMap: { [key: string]: 'name' | 'about' | 'links' } = {
      'Name': 'name',
      'About': 'about',
      'Links': 'links'
    };

    const field = fieldMap[fieldName];
    if (field) {
      setEditingField(field);
    }
  };

  const handleBack = () => {
    if (currentView !== 'main') {
      setCurrentView('main');
    } else {
      setShowProfile(false);
      setEditingField(null);
    }
  };

  const handleProfileSave = async (field: 'name' | 'about' | 'phone' | 'links', value: string) => {
    if (!user) return;

    try {
      // Update local state immediately for better UX
      setProfile(prev => {
        switch (field) {
          case 'name':
            return { ...prev, full_name: value };
          case 'about':
            return { ...prev, bio: value };
          case 'phone':
            return { ...prev, phone: value };
          default:
            return prev;
        }
      });

      // Update database
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      switch (field) {
        case 'name':
          updateData.full_name = value;
          break;
        case 'about':
          updateData.bio = value;
          break;
        case 'phone':
          updateData.phone = value;
          break;
        case 'links':
          updateData.links = value;
          break;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updateData
        }, {
          onConflict: 'id'
        });

      if (error) {
        throw error;
      }



    } catch (error: any) {
      console.error('Error updating profile:', error);

      // Handle specific bio column error
      if (field === 'about' && error?.message?.includes("Could not find the 'bio' column")) {
        // Update local state only since database column doesn't exist
        setProfile(prev => ({ ...prev, bio: value }));
        toast({
          title: "Bio Updated Locally",
          description: "Bio updated in the app. Database migration needed for permanent storage.",
        });
        return;
      }

      // Revert local state on other errors
      fetchUserProfile();

      toast({
        title: "Error",
        description: `Failed to update ${field === 'name' ? 'name' : field === 'about' ? 'bio' : field === 'phone' ? 'phone' : 'links'}. Please try again.`,
        variant: "destructive"
      });
    }
  };

  // Handle different views
  if (editingField) {
    const currentValue = editingField === 'name' ? profile.full_name
      : editingField === 'about' ? profile.bio
        : editingField === 'phone' ? profile.phone
          : '';

    return (
      <ProfileEditForm
        field={editingField}
        currentValue={currentValue}
        onBack={() => setEditingField(null)}
        onSave={(value) => handleProfileSave(editingField, value)}
      />
    );
  }

  // Navigation components
  if (currentView === 'theme') {
    return <UnifiedThemeSettings onBack={handleBack} />;
  }

  if (currentView === 'account') {
    return <AccountSettings onBack={handleBack} />;
  }

  if (currentView === 'bible') {
    return <BibleSettingsPanel onBack={handleBack} />;
  }

  if (currentView === 'privacy') {
    return <PrivacySettings onBack={handleBack} />;
  }

  if (currentView === 'chat') {
    return <ChatSupport onBack={handleBack} />;
  }

  if (currentView === 'help') {
    return <HelpCenter onBack={handleBack} onChatSupport={() => setCurrentView('chat')} />;
  }

  if (currentView === 'invite') {
    return <InviteFriend onBack={handleBack} />;
  }

  if (currentView === 'notifications') {
    return <NotificationCenter onBack={handleBack} />;
  }

  // Profile view
  if (showProfile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={handleBack} className="p-2">
            <span className="sr-only">Back</span>
            ←
          </button>
          <h1 className="text-lg font-semibold text-foreground">Profile</h1>
          <div className="w-10"></div>
        </div>

        <div className="p-4 space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-semibold text-2xl">
                {profile.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <Button onClick={() => handleProfileFieldClick('Profile Picture')}>
              Edit
            </Button>
          </div>

          {/* Profile Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <button
                className="w-full flex items-center justify-between p-3 bg-muted rounded-lg text-left"
                onClick={() => handleProfileFieldClick('Name')}
              >
                <span className="text-foreground">{profile.full_name}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">About</label>
              <button
                className="w-full flex items-center justify-between p-3 bg-muted rounded-lg text-left"
                onClick={() => handleProfileFieldClick('About')}
              >
                <span className="text-foreground">{profile.bio}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main settings view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Section */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold">
                    {loading ? '...' : profile.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">
                    {loading ? 'Loading...' : profile.full_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {loading ? 'Loading profile...' : profile.bio}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="border-t border-border">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              onClick={() => handleSettingClick('Profile')}
            >
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Profile</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Quick Settings */}
        <div className="space-y-3">
          <button
            className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => handleSettingClick('Notifications')}
          >
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Notifications</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => handleSettingClick('Bible Settings')}
          >
            <div className="flex items-center space-x-3">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Bible Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => handleSettingClick('Theme & Appearance')}
          >
            <div className="flex items-center space-x-3">
              <Palette className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Theme & Appearance</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => handleSettingClick('Social Circle')}
          >
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Social Circle</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Account & Support */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Account & Support</h3>
          <div className="space-y-1">
            <button
              className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => handleSettingClick('Account')}
            >
              <div className="flex items-center space-x-3">
                <SettingsIcon className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Account</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => handleSettingClick('Privacy')}
            >
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Privacy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => handleSettingClick('Chat')}
            >
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Chat Support</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => handleSettingClick('Help')}
            >
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Help Center</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => handleSettingClick('Invite Friends')}
            >
              <div className="flex items-center space-x-3">
                <Share2 className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground">Invite Friends</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsPage;