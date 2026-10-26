import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, LogOut, Smartphone, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/common/UserAvatar";
import { ListGroup, ListRow, Page, PageTitle, SectionLabel } from "@/components/page/PageKit";
import { PlaceRow, RowPicture } from "@/components/nav/Places";
import { TILE } from "@/data/appDirectory";
import { startTour } from "@/lib/appEvents";
import { installedBefore, openInstallGuide, useInstallContext } from "@/lib/install";

const SidebarCustomizer = lazy(() => import("@/components/SidebarCustomizer"));

/** Me: your messages, friends, notes, settings, help and the tour. */
const MePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [shortcuts, setShortcuts] = useState(false);
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
  // Phones not yet installed; computers only when the browser can install it in one tap
  const install = useInstallContext();
  const canInstall =
    install.kind !== 'installed' &&
    (install.kind !== 'desktop' || install.canPrompt) &&
    (install.kind !== 'android' || install.canPrompt || !installedBefore());

  return (
    <Page>
      <PageTitle icon={UserRound} tint={TILE.blue} title="Me" subtitle="Your messages, notes and settings" />

      {/* Who you are */}
      {user ? (
        <button
          onClick={() => navigate("/settings")}
          className="flex w-full items-center gap-4 rounded-[22px] border border-slate-200/70 bg-card p-4 text-left shadow-sm transition active:scale-[0.99] dark:border-slate-800"
        >
          <UserAvatar name={meta.full_name || user.email} src={meta.avatar_url} seed={user.id} className="h-14 w-14" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-outfit text-[19px] font-semibold">{meta.full_name || "Your profile"}</span>
            <span className="block truncate text-[13.5px] text-muted-foreground">{user.email}</span>
          </span>
          <span className="shrink-0 rounded-full bg-blue-50 px-3.5 py-1.5 text-[13.5px] font-bold text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">Edit</span>
        </button>
      ) : (
        <div className="rounded-[22px] border border-slate-200/70 bg-card p-5 shadow-sm dark:border-slate-800">
          <p className="font-outfit text-[19px] font-semibold">Sign in to get the most out of the app</p>
          <p className="mt-1 text-[14.5px] text-muted-foreground">Message friends, save notes and join a team.</p>
          <button onClick={() => navigate("/auth")} className="mt-4 h-12 w-full rounded-full bg-blue-600 text-[16px] font-semibold text-white shadow-md shadow-blue-600/25">
            Sign in or create an account
          </button>
        </div>
      )}

      <SectionLabel>Yours</SectionLabel>
      <ListGroup>
        <PlaceRow id="messages" />
        <PlaceRow id="friends" />
        <PlaceRow id="notes" />
        <PlaceRow id="learn" />
      </ListGroup>

      <SectionLabel>Help</SectionLabel>
      <ListGroup>
        {canInstall && (
          <ListRow
            leading={<RowPicture icon={Smartphone} color="blue" />}
            title="Install the app"
            subtitle="Put The Power House on your Home Screen"
            onClick={openInstallGuide}
            chevron
            className="min-h-[68px] py-3"
          />
        )}
        <ListRow
          leading={<RowPicture icon={Sparkles} color="violet" />}
          title="Show me around"
          subtitle="Watch the 1-minute welcome tour again"
          onClick={startTour}
          chevron
          className="min-h-[68px] py-3"
        />
        <PlaceRow id="help" />
      </ListGroup>

      <SectionLabel>Settings</SectionLabel>
      <ListGroup>
        <PlaceRow id="settings" />
        <PlaceRow id="everything" />
        <div className="hidden md:block">
          <ListRow
            leading={<RowPicture icon={Bookmark} color="slate" />}
            title="Sidebar shortcuts"
            subtitle="Add your favourite places to the sidebar"
            onClick={() => setShortcuts(true)}
            chevron
            className="min-h-[68px] py-3"
          />
        </div>
      </ListGroup>

      <SectionLabel>About</SectionLabel>
      <ListGroup>
        <PlaceRow id="terms" />
        <PlaceRow id="privacy" />
      </ListGroup>

      {user && (
        <ListGroup className="mt-6">
          <ListRow
            leading={<RowPicture icon={LogOut} color="red" />}
            title="Sign out"
            destructive
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="min-h-[60px]"
          />
        </ListGroup>
      )}

      {shortcuts && (
        <Suspense fallback={null}>
          <SidebarCustomizer isOpen={shortcuts} onClose={() => setShortcuts(false)} />
        </Suspense>
      )}
    </Page>
  );
};

export default MePage;
