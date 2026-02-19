import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, User, QrCode, Bell, BookOpen, Settings as SettingsIcon, Shield, MessageCircle, HelpCircle, Users, Share2, Palette, Volume2, Camera, LogOut, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (updateError) {
        throw updateError;
      }

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({
        title: "Success",
        description: "Profile picture updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

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
      <div className="min-h-screen bg-white dark:bg-slate-950">
        {/* Premium Header */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-900 px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </Button>
          <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Profile</h1>
          <div className="w-10"></div>
        </div>

        <div className="max-w-2xl mx-auto p-8 space-y-12">
          {/* Enhanced Profile Picture Section */}
          <div className="flex flex-col items-center space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[42px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-40 h-40 rounded-[40px] bg-slate-100 dark:bg-slate-800 overflow-hidden ring-4 ring-white dark:ring-slate-950 shadow-2xl flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-indigo-500 uppercase">
                    {profile.full_name.charAt(0)}
                  </span>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]"
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-white scale-90 group-hover:scale-100 transition-transform" />
                  )}
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{profile.full_name}</h2>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{profile.email}</p>
            </div>
          </div>

          {/* Premium Profile Form */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Display Information</label>
            <div className="grid gap-3">
              {[
                { label: 'Name', value: profile.full_name, icon: User },
                { label: 'About', value: profile.bio, icon: MessageCircle },
                { label: 'Phone', value: profile.phone, icon: Volume2 }
              ].map((field) => (
                <button
                  key={field.label}
                  onClick={() => handleProfileFieldClick(field.label)}
                  className="group w-full flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[28px] hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl hover:shadow-indigo-500/5 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <field.icon className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{field.label}</p>
                      <p className="text-[15px] font-bold text-slate-700 dark:text-slate-200 truncate pr-4">{field.value}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main settings view
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Modern Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-8 py-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-2xl hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Button>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Settings</h1>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-indigo-600" />
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-8 space-y-10 relative z-10">
        {/* Premium Profile Card */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[34px] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-500/5">
            <div className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-[28px] bg-slate-100 dark:bg-slate-800 overflow-hidden ring-4 ring-slate-50 dark:ring-slate-950 flex items-center justify-center shadow-lg">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black text-indigo-500 uppercase">{profile.full_name.charAt(0)}</span>
                      )}
                    </div>
                    {/* Status Indicator */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-green-500 border-4 border-white dark:border-slate-900 shadow-sm" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">
                      {loading ? '...' : profile.full_name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest whitespace-nowrap">Member</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition-all">
                  <QrCode className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="px-4 pb-4">
              <button
                className="w-full flex items-center justify-between p-5 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-indigo-600 text-slate-700 dark:text-slate-300 hover:text-white rounded-[24px] transition-all group/btn shadow-sm"
                onClick={() => handleSettingClick('Profile')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-950 flex items-center justify-center shadow-sm group-hover/btn:scale-110 transition-transform">
                    <User className="w-5 h-5 text-indigo-500" />
                  </div>
                  <span className="font-bold text-sm tracking-tight">Edit Profile</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-50" />
              </button>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="grid gap-8 pb-12">
          {/* Custom Settings Group */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-4">App Preferences</h3>
            <div className="grid gap-2">
              {[
                { label: 'Notifications', icon: Bell, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                { label: 'Bible Settings', icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                { label: 'Theme & Appearance', icon: Palette, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { label: 'Social Circle', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' }
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 border border-slate-100/50 dark:border-slate-800 rounded-[28px] hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl hover:shadow-indigo-500/5 transition-all text-left group"
                  onClick={() => handleSettingClick(item.label)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm", item.bg)}>
                      <item.icon className={cn("w-5 h-5", item.color)} />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-200 tracking-tight">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Account & Support Group */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 ml-4">Account & Security</h3>
            <div className="grid gap-2">
              {[
                { label: 'Account', icon: SettingsIcon, color: 'text-slate-500' },
                { label: 'Privacy', icon: Shield, color: 'text-green-500' },
                { label: 'Chat', icon: MessageCircle, color: 'text-sky-500' },
                { label: 'Help', icon: HelpCircle, color: 'text-red-500' },
                { label: 'Invite Friends', icon: Share2, color: 'text-pink-500' }
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 border border-slate-100/50 dark:border-slate-800 rounded-[28px] hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl hover:shadow-indigo-500/5 transition-all text-left group"
                  onClick={() => handleSettingClick(item.label)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-110">
                      <item.icon className={cn("w-5 h-5", item.color)} />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-200 tracking-tight">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsPage;
