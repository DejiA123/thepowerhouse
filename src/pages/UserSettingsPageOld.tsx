import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, User, QrCode, List, Megaphone, Star, Monitor, Key, Lock, MessageCircle, Bell, ArrowUpDown, HelpCircle, Users, ChevronLeft, Phone, Link, Moon, Sun, Monitor as MonitorIcon, Settings as SettingsIcon, BookOpen, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { NotificationSettings } from "@/components/NotificationSettings";
import { LanguageSettings } from "@/components/LanguageSettings";
import { ThemeSettings } from "@/components/ThemeSettings";
import { AccountSettings } from "@/components/AccountSettings";

const UserSettingsPage = () => {
  const [profile, setProfile] = useState({
    full_name: 'Deji',
    email: '',
    bio: 'Jesus is Lord 🙏',
    phone: '+234 123 456 7890'
  });
  const [showProfile, setShowProfile] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'about' | 'phone' | 'links' | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'notifications' | 'language' | 'theme' | 'account'>('main');
  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences: biblePreferences, setAutoPlayNext } = useBiblePreferences();
  
  const [settings, setSettings] = useState({
    // Notification settings
    notifications: true,
    
    // General settings
    language: 'English',
    downloadingImages: 'Auto Detect',
    lowLight: 'Match Device Setting',
    
    // Bible reading settings
    myVersions: 10,
    fontSize: '16pt',
    redLetters: true,
    footnotes: true,
    showVersePicker: false,
    showAudioTrackingBar: true,
    autoPlayNext: biblePreferences.autoPlayNext,
    
    // Plans settings
    completionNotices: true,
    
    // Theme settings
    theme: 'light'
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      loadSettings();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (data) {
      setProfile({
        full_name: data.full_name || 'Deji',
        email: data.email || '',
        bio: (data as any).bio || 'Jesus is Lord 🙏',
        phone: (data as any).phone || '+234 123 456 7890'
      });
    }
  };

  const loadSettings = async () => {
    // Load from localStorage first
    try {
      const storedSettings = localStorage.getItem('app_settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error('Error loading settings from localStorage:', e);
    }

    // Load from database if available
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      setSettings(prev => ({
        ...prev,
        theme: data.theme || 'light',
        notifications: data.notifications_enabled !== false
      }));
    }
  };

  const saveSettings = async (newSettings: Partial<typeof settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // Save to localStorage
    try {
      localStorage.setItem('app_settings', JSON.stringify(updatedSettings));
    } catch (e) {
      console.error('Error saving settings to localStorage:', e);
    }

    // Save to database
    if (user) {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme: updatedSettings.theme,
          notifications_enabled: updatedSettings.notifications,
          updated_at: new Date().toISOString()
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save settings",
          variant: "destructive"
        });
      }
    }
  };

  const handleSettingClick = (settingName: string) => {
    if (settingName === 'Profile') {
      setShowProfile(true);
    } else if (settingName === 'Notification settings') {
      setCurrentView('notifications');
    } else if (settingName === 'Language') {
      setCurrentView('language');
    } else if (settingName === 'Theme') {
      setCurrentView('theme');
    } else if (settingName === 'Account') {
      setCurrentView('account');
    } else if (settingName === 'My versions') {
      toast({
        title: "Bible Versions",
        description: "This would open Bible version selection",
      });
    } else if (settingName === 'Font size') {
      toast({
        title: "Font Size",
        description: "This would open font size adjustment",
      });
    } else {
      toast({
        title: `${settingName} clicked`,
        description: `This would navigate to ${settingName} settings`,
      });
    }
  };

  const handleProfileFieldClick = (fieldName: string) => {
    const fieldMap: { [key: string]: 'name' | 'about' | 'phone' | 'links' } = {
      'Name': 'name',
      'About': 'about',
      'Phone number': 'phone',
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

  const handleProfileSave = (field: 'name' | 'about' | 'phone' | 'links', value: string) => {
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
  };

  const getThemeIcon = () => {
    switch (settings.theme) {
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'system':
        return <MonitorIcon className="w-4 h-4" />;
      default:
        return <Sun className="w-4 h-4" />;
    }
  };

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

  if (currentView === 'notifications') {
    return <NotificationSettings onBack={handleBack} />;
  }

  if (currentView === 'language') {
    return <LanguageSettings onBack={handleBack} />;
  }

  if (currentView === 'theme') {
    return <ThemeSettings onBack={handleBack} />;
  }

  if (currentView === 'account') {
    return <AccountSettings onBack={handleBack} />;
  }

  if (showProfile) {
    return (
      <div className="profile-page">
        {/* Header */}
        <div className="profile-header">
          <button onClick={handleBack} className="p-2">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="profile-title">Profile</h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        <div className="p-4 space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="profile-picture-large">
              <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-2xl">
                  {profile.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <Button 
              className="profile-edit-button"
              onClick={() => handleProfileFieldClick('Profile Picture')}
            >
              Edit
            </Button>
          </div>

          {/* Profile Fields */}
          <div className="space-y-4">
            {/* Name Field */}
            <div className="profile-field-group">
              <label className="profile-field-label">Name</label>
              <button 
                className="profile-field-input"
                onClick={() => handleProfileFieldClick('Name')}
              >
                <span className="profile-field-text">{profile.full_name}</span>
                <ChevronRight className="profile-field-arrow" />
              </button>
            </div>

            {/* About Field */}
            <div className="profile-field-group">
              <label className="profile-field-label">About</label>
              <button 
                className="profile-field-input"
                onClick={() => handleProfileFieldClick('About')}
              >
                <span className="profile-field-text">{profile.bio}</span>
                <ChevronRight className="profile-field-arrow" />
              </button>
            </div>

            {/* Phone Number Field */}
            <div className="profile-field-group">
              <label className="profile-field-label">Phone number</label>
              <button 
                className="profile-field-input"
                onClick={() => handleProfileFieldClick('Phone number')}
              >
                <span className="profile-field-text-masked">••••••••••••</span>
                <ChevronRight className="profile-field-arrow" />
              </button>
            </div>

            {/* Links Field */}
            <div className="profile-field-group">
              <label className="profile-field-label">Links</label>
              <button 
                className="profile-field-input"
                onClick={() => handleProfileFieldClick('Links')}
              >
                <span className="profile-field-text-green">Add links</span>
                <ChevronRight className="profile-field-arrow" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile Section */}
        <div className="settings-section">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="profile-avatar">
                  <span className="text-white font-semibold text-lg">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="profile-name">{profile.full_name}</h2>
                  <p className="profile-bio">{profile.bio}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="p-2">
                <QrCode className="settings-icon" />
              </Button>
            </div>
          </div>
          
          <div className="border-t border-gray-100">
            <button 
              className="settings-item"
              onClick={() => handleSettingClick('Profile')}
            >
              <div className="flex items-center space-x-3">
                <User className="settings-icon" />
                <span className="settings-text">Profile</span>
              </div>
              <ChevronRight className="settings-arrow" />
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <button 
            className="settings-item"
            onClick={() => handleSettingClick('Notification settings')}
          >
            <div className="flex items-center space-x-3">
              <Bell className="settings-icon" />
              <span className="settings-text">Notification settings</span>
            </div>
            <ChevronRight className="settings-arrow" />
          </button>
        </div>

        {/* General Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">General</h3>
          
          <button 
            className="settings-item settings-item-border"
            onClick={() => handleSettingClick('Language')}
          >
            <div className="flex items-center space-x-3">
              <span className="settings-text">Language</span>
            </div>
            <ChevronRight className="settings-arrow" />
          </button>
          
          
          <button 
            className="settings-item"
            onClick={() => handleSettingClick('Theme')}
          >
            <div className="flex items-center space-x-3">
              <span className="settings-text">Theme</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="settings-value">{settings.theme}</span>
              <ChevronRight className="settings-arrow" />
            </div>
          </button>
        </div>

        {/* Bible Reading Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">Bible reading</h3>
          
          <button 
            className="settings-item settings-item-border"
            onClick={() => handleSettingClick('My versions')}
          >
            <div className="flex items-center space-x-3">
              <BookOpen className="settings-icon" />
              <span className="settings-text">My versions</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="settings-value">{settings.myVersions}</span>
              <ChevronRight className="settings-arrow" />
            </div>
          </button>
          
          <button 
            className="settings-item settings-item-border"
            onClick={() => handleSettingClick('Font size')}
          >
            <div className="flex items-center space-x-3">
              <span className="settings-text">Font size</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="settings-value">{settings.fontSize}</span>
              <ChevronRight className="settings-arrow" />
            </div>
          </button>
          
          <div className="settings-item settings-item-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="settings-text">Red letters</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="settings-subtitle">When available</span>
                <Switch
                  checked={settings.redLetters}
                  onCheckedChange={(checked) => saveSettings({ redLetters: checked })}
                />
              </div>
            </div>
          </div>
          
          <div className="settings-item settings-item-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="settings-text">Footnotes</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="settings-subtitle">When available</span>
                <Switch
                  checked={settings.footnotes}
                  onCheckedChange={(checked) => saveSettings({ footnotes: checked })}
                />
              </div>
            </div>
          </div>
          
          <div className="settings-item settings-item-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="settings-text">Show verse picker</span>
              </div>
              <Switch
                checked={settings.showVersePicker}
                onCheckedChange={(checked) => saveSettings({ showVersePicker: checked })}
              />
            </div>
          </div>
          
          <div className="settings-item settings-item-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="settings-text">Show Audio Tracking Bar</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="settings-subtitle">When available</span>
                <Switch
                  checked={settings.showAudioTrackingBar}
                  onCheckedChange={(checked) => saveSettings({ showAudioTrackingBar: checked })}
                />
              </div>
            </div>
          </div>
          
          <div className="settings-item">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="settings-text">Auto-play next chapter</span>
              </div>
              <Switch
                checked={settings.autoPlayNext}
                onCheckedChange={(checked) => {
                  saveSettings({ autoPlayNext: checked });
                  setAutoPlayNext(checked);
                }}
              />
            </div>
          </div>
        </div>

        {/* Plans Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">Plans</h3>
          
          <div className="settings-item">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="settings-icon" />
                <span className="settings-text">Completion notices</span>
              </div>
              <Switch
                checked={settings.completionNotices}
                onCheckedChange={(checked) => saveSettings({ completionNotices: checked })}
              />
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">Appearance</h3>
          
          <div className="settings-item">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SettingsIcon className="settings-icon" />
                <span className="settings-text">Theme</span>
              </div>
              <Select
                value={settings.theme}
                onValueChange={(value) => {
                  saveSettings({ theme: value });
                  // Apply theme immediately
                  try {
                    const userPrefs = localStorage.getItem('user_preferences');
                    const parsed = userPrefs ? JSON.parse(userPrefs) : {};
                    localStorage.setItem('user_preferences', JSON.stringify({ ...parsed, theme: value }));
                    window.dispatchEvent(new Event('themechange'));
                  } catch (e) {}
                }}
              >
                <SelectTrigger className="w-32">
                  <div className="flex items-center space-x-2">
                    {getThemeIcon()}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center space-x-2">
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center space-x-2">
                      <Moon className="w-4 h-4" />
                      <span>Dark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center space-x-2">
                      <MonitorIcon className="w-4 h-4" />
                      <span>System</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <button 
            className="settings-item settings-item-border"
            onClick={() => handleSettingClick('Account')}
          >
            <div className="flex items-center space-x-3">
              <Key className="settings-icon" />
              <span className="settings-text">Account</span>
            </div>
            <ChevronRight className="settings-arrow" />
          </button>
          
          <button 
            className="settings-item settings-item-border"
            onClick={() => handleSettingClick('Privacy')}
          >
            <div className="flex items-center space-x-3">
              <Lock className="settings-icon" />
              <span className="settings-text">Privacy</span>
            </div>
            <ChevronRight className="settings-arrow" />
          </button>
          
          <button 
            className="settings-item"
            onClick={() => handleSettingClick('Chats')}
          >
            <div className="flex items-center space-x-3">
              <MessageCircle className="settings-icon" />
              <span className="settings-text">Chats</span>
            </div>
            <ChevronRight className="settings-arrow" />
          </button>
        </div>

        <div className="settings-section">
          <button 
            className="settings-item settings-item-border"
            onClick={() => handleSettingClick('Help')}
          >
            <div className="flex items-center space-x-3">
              <HelpCircle className="settings-icon" />
              <span className="settings-text">Help</span>
            </div>
            <ChevronRight className="settings-arrow" />
          </button>
          
          <button 
            className="settings-item"
            onClick={() => handleSettingClick('Invite a friend')}
          >
            <div className="flex items-center space-x-3">
              <Users className="settings-icon" />
              <span className="settings-text">Invite a friend</span>
            </div>
            <ChevronRight className="settings-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsPage;