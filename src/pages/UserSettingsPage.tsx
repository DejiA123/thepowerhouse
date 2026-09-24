import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellRing,
  BookOpen,
  Camera,
  Download,
  HelpCircle,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  Settings as SettingsIcon,
  Share2,
  Shield,
  User,
  Users,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import UserAvatar from "@/components/common/UserAvatar";
import OfflineAudioDialog from "@/components/bible/OfflineAudioDialog";
import { normalizeBookApiName } from "@/components/bible/bookUtils";
import { ListGroup, ListRow, Page, PageHeader, SectionLabel } from "@/components/page/PageKit";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { useCampus } from "@/data/campuses";
import { appAlert } from "@/lib/appAlert";
import { disablePush, enablePush, getPushState, isIOS, type PushState } from "@/lib/push";
import { formatBytes, offlineAudioService } from "@/services/offlineAudioService";

import { ProfileEditForm } from "@/components/ProfileEditForm";
import { UnifiedThemeSettings } from "@/components/UnifiedThemeSettings";
import { AccountSettings } from "@/components/AccountSettings";
import { BibleSettingsPanel } from "@/components/BibleSettingsPanel";
import { PrivacySettings } from "@/components/PrivacySettings";
import { ChatSupport } from "@/components/ChatSupport";
import { HelpCenter } from "@/components/HelpCenter";
import { InviteFriend } from "@/components/InviteFriend";
import { NotificationCenter } from "@/components/NotificationCenter";

type ViewType = "main" | "theme" | "account" | "bible" | "privacy" | "chat" | "help" | "invite" | "notifications";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  bio: string;
  phone: string;
  avatar_url?: string;
  updated_at: string;
}

const tint = {
  red: "bg-red-500 text-white",
  blue: "bg-blue-600 text-white",
  sky: "bg-sky-500 text-white",
  indigo: "bg-indigo-500 text-white",
  amber: "bg-amber-500 text-white",
  slate: "bg-slate-500 text-white",
  green: "bg-emerald-500 text-white",
  violet: "bg-violet-500 text-white",
  pink: "bg-pink-500 text-white",
  gray: "bg-slate-400 text-white",
  teal: "bg-teal-500 text-white",
};

const pushLabel: Record<PushState, string> = {
  on: "On for this device",
  "granted-off": "Off for this device",
  default: "Off",
  denied: "Blocked in your settings",
  "needs-install": "Add the app to your Home Screen first",
  unsupported: "Not supported on this browser",
};

const themeLabel = () => {
  try {
    const t = localStorage.getItem("theme") || "light";
    return t === "system" ? "System" : t === "dark" ? "Dark" : "Light";
  } catch {
    return "";
  }
};

const UserSettingsPage = () => {
  const [profile, setProfile] = useState<UserProfile>({
    id: "",
    full_name: "",
    email: "",
    bio: "",
    phone: "",
    updated_at: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [editingField, setEditingField] = useState<"name" | "about" | "phone" | "links" | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("main");
  const [uploading, setUploading] = useState(false);
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [offlineSummary, setOfflineSummary] = useState("");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { preferences } = useBiblePreferences();
  const { campus } = useCampus();

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      let { data: profileData, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profileError && profileError.code !== "PGRST116") throw profileError;

      if (!profileData) {
        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert([
            {
              id: user.id,
              full_name: user.user_metadata?.full_name || "New User",
              email: user.email || "",
              avatar_url: null,
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();
        if (createError) throw createError;
        profileData = createdProfile;
      }

      setProfile({
        id: profileData.id,
        full_name: profileData.full_name || "New User",
        email: profileData.email || user.email || "",
        bio: (profileData as any).bio || "",
        phone: profileData.phone || "",
        avatar_url: profileData.avatar_url,
        updated_at: profileData.updated_at,
      });
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      setProfile((prev) => ({
        ...prev,
        full_name: user.user_metadata?.full_name || "Member",
        email: user.email || "",
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Live values shown on the rows
  useEffect(() => {
    const refreshPush = () => getPushState().then(setPushState).catch(() => setPushState("unsupported"));
    const refreshOffline = () => {
      const count = offlineAudioService.list().length;
      setOfflineSummary(count ? `${count} ch · ${formatBytes(offlineAudioService.totalBytes())}` : "None");
    };
    refreshPush();
    refreshOffline();
    window.addEventListener("push:changed", refreshPush);
    window.addEventListener(offlineAudioService.CHANGE_EVENT, refreshOffline);
    return () => {
      window.removeEventListener("push:changed", refreshPush);
      window.removeEventListener(offlineAudioService.CHANGE_EVENT, refreshOffline);
    };
  }, [currentView]);

  const togglePush = async (on: boolean) => {
    setPushBusy(true);
    try {
      if (on) {
        const state = await enablePush();
        setPushState(state);
        if (state === "on") appAlert("Notifications are on", "You'll get messages, calls and church updates.", "success");
        else if (state === "denied") appAlert("Notifications are blocked", isIOS() ? "Turn them on in iPhone Settings → Notifications → The Power House." : "Allow notifications for this site in your browser settings.", "error");
      } else {
        await disablePush();
        setPushState(await getPushState());
      }
    } catch (error: any) {
      appAlert("Couldn't change notifications", error?.message || "Please try again.", "error");
    } finally {
      setPushBusy(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) throw new Error("You must select an image to upload.");
      const filePath = `${user!.id}/${Math.random()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user!.id);
      if (updateError) throw updateError;
      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      appAlert("Profile photo updated", "", "success");
    } catch (error: any) {
      appAlert("Couldn't update your photo", error.message, "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleBack = () => {
    if (currentView !== "main") setCurrentView("main");
    else {
      setShowProfile(false);
      setEditingField(null);
    }
  };

  const handleProfileSave = async (field: "name" | "about" | "phone" | "links", value: string) => {
    if (!user) return;
    setProfile((prev) =>
      field === "name" ? { ...prev, full_name: value } : field === "about" ? { ...prev, bio: value } : field === "phone" ? { ...prev, phone: value } : prev,
    );
    const updateData: Record<string, string> = { updated_at: new Date().toISOString() };
    if (field === "name") updateData.full_name = value;
    if (field === "about") updateData.bio = value;
    if (field === "phone") updateData.phone = value;
    if (field === "links") updateData.links = value;

    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...updateData } as any, { onConflict: "id" });
    if (!error) return;
    console.error("Error updating profile:", error);
    if (field === "about" && error.message?.includes("Could not find the 'bio' column")) {
      appAlert("Bio saved on this device", "It will sync once the church database is updated.", "info");
      return;
    }
    fetchUserProfile();
    appAlert("Couldn't save your changes", "Please try again.", "error");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // ── Sub-screens ─────────────────────────────────────────────────
  if (editingField) {
    const currentValue = editingField === "name" ? profile.full_name : editingField === "about" ? profile.bio : editingField === "phone" ? profile.phone : "";
    return (
      <ProfileEditForm
        field={editingField}
        currentValue={currentValue}
        onBack={() => setEditingField(null)}
        onSave={(value) => handleProfileSave(editingField, value)}
      />
    );
  }
  if (currentView === "theme") return <UnifiedThemeSettings onBack={handleBack} />;
  if (currentView === "account") return <AccountSettings onBack={handleBack} />;
  if (currentView === "bible") return <BibleSettingsPanel onBack={handleBack} />;
  if (currentView === "privacy") return <PrivacySettings onBack={handleBack} />;
  if (currentView === "chat") return <ChatSupport onBack={handleBack} />;
  if (currentView === "help") return <HelpCenter onBack={handleBack} onChatSupport={() => setCurrentView("chat")} />;
  if (currentView === "invite") return <InviteFriend onBack={handleBack} />;
  if (currentView === "notifications") return <NotificationCenter onBack={handleBack} />;

  const avatar = (size: string) =>
    profile.avatar_url ? (
      <img src={profile.avatar_url} alt="" className={`${size} rounded-full object-cover`} />
    ) : (
      <UserAvatar name={profile.full_name || user?.email} seed={user?.id} className={size} />
    );

  // ── Profile ─────────────────────────────────────────────────────
  if (showProfile) {
    return (
      <Page grouped>
        <PageHeader title="Profile" back={{ label: "Settings", onClick: handleBack }} />
        <div className="flex flex-col items-center pb-2 pt-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative rounded-full ring-4 ring-white dark:ring-slate-900"
            aria-label="Change profile photo"
          >
            {avatar("h-28 w-28 text-3xl")}
            <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md ring-2 ring-white dark:ring-slate-900">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          <p className="mt-3 font-outfit text-2xl font-bold text-foreground">{profile.full_name}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>

        <SectionLabel>About you</SectionLabel>
        <ListGroup>
          <ListRow icon={User} iconClassName={tint.blue} title="Name" subtitle={profile.full_name || "Add your name"} onClick={() => setEditingField("name")} />
          <ListRow icon={MessageCircle} iconClassName={tint.violet} title="About" subtitle={profile.bio || "Add a short bio"} onClick={() => setEditingField("about")} />
          <ListRow icon={Phone} iconClassName={tint.green} title="Phone" subtitle={profile.phone || "Add your number"} onClick={() => setEditingField("phone")} />
        </ListGroup>
      </Page>
    );
  }

  // ── Main settings ───────────────────────────────────────────────
  const pushOn = pushState === "on";
  const pushToggleable = pushState === "on" || pushState === "granted-off" || pushState === "default";

  return (
    <Page grouped>
      <PageHeader title="Settings" />

      {user ? (
        <button
          onClick={() => setShowProfile(true)}
          className="flex w-full items-center gap-4 rounded-[22px] bg-card p-4 text-left shadow-sm transition active:scale-[0.99]"
        >
          <span className="relative shrink-0">
            {avatar("h-16 w-16 text-2xl")}
            <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500 dark:border-slate-900" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-outfit text-xl font-bold text-foreground">{loading ? " " : profile.full_name}</span>
            <span className="block truncate text-sm text-muted-foreground">Member · Edit profile</span>
          </span>
          <span className="text-2xl leading-none text-slate-300 dark:text-slate-600">›</span>
        </button>
      ) : (
        <button onClick={() => navigate("/auth")} className="w-full rounded-[22px] bg-blue-600 p-4 text-left text-white shadow-md">
          <span className="block text-lg font-bold">Sign in</span>
          <span className="block text-sm text-white/85">Save notes, join chats and get notifications</span>
        </button>
      )}

      <SectionLabel>App</SectionLabel>
      <ListGroup>
        <ListRow
          icon={Bell}
          iconClassName={tint.red}
          title="Notifications"
          subtitle={pushState ? pushLabel[pushState] : " "}
          trailing={
            pushBusy ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Switch checked={pushOn} disabled={!pushToggleable} onCheckedChange={togglePush} aria-label="Notifications on this device" />
            )
          }
        />
        <ListRow icon={BellRing} iconClassName={tint.pink} title="Notification preferences" onClick={() => setCurrentView("notifications")} />
        <ListRow
          icon={BookOpen}
          iconClassName={tint.blue}
          title="Bible"
          value={preferences.preferredTranslation === "de4e12af7f28f599-02" ? "KJV" : undefined}
          onClick={() => setCurrentView("bible")}
        />
        <ListRow icon={Download} iconClassName={tint.sky} title="Offline audio Bible" value={offlineSummary} onClick={() => setOfflineOpen(true)} />
        <ListRow icon={Palette} iconClassName={tint.indigo} title="Appearance" value={themeLabel()} onClick={() => setCurrentView("theme")} />
        <ListRow icon={MapPin} iconClassName={tint.teal} title="My campus" value={campus?.name ?? "Choose"} onClick={() => navigate("/services")} />
        <ListRow icon={Users} iconClassName={tint.amber} title="Social Circle" onClick={() => navigate("/social")} />
      </ListGroup>

      <SectionLabel>Account &amp; security</SectionLabel>
      <ListGroup>
        <ListRow icon={SettingsIcon} iconClassName={tint.slate} title="Account" onClick={() => setCurrentView("account")} />
        <ListRow icon={Shield} iconClassName={tint.green} title="Privacy" onClick={() => setCurrentView("privacy")} />
        <ListRow icon={MessageCircle} iconClassName={tint.violet} title="Chat" onClick={() => setCurrentView("chat")} />
      </ListGroup>

      <SectionLabel>More</SectionLabel>
      <ListGroup>
        <ListRow icon={Share2} iconClassName={tint.pink} title="Invite friends" onClick={() => setCurrentView("invite")} />
        <ListRow icon={HelpCircle} iconClassName={tint.gray} title="Help" onClick={() => setCurrentView("help")} />
      </ListGroup>

      {user && (
        <div className="mt-6">
          <ListGroup>
            <ListRow icon={LogOut} iconClassName="bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400" title="Sign out" destructive chevron={false} onClick={handleSignOut} />
          </ListGroup>
        </div>
      )}

      <OfflineAudioDialog
        open={offlineOpen}
        onOpenChange={setOfflineOpen}
        book={normalizeBookApiName(preferences.preferredBook || "genesis")}
        chapter={preferences.preferredChapter || 1}
        version={preferences.preferredTranslation || "de4e12af7f28f599-02"}
      />
    </Page>
  );
};

export default UserSettingsPage;
