import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlarmClock, Archive, ArchiveRestore, Bell, BellOff, Eraser, Camera, ChevronRight, FileUp, Loader2, Lock, LogOut, MoreVertical, Pencil, Phone, Search, Star, Trash2, UserPlus, Video, Wallpaper, Link2, Music2, ShieldCheck, ShieldOff, UserMinus, Globe, Check } from 'lucide-react';
import { church } from '@/config/church';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { appAlert } from '@/lib/appAlert';
import { useIsMobile } from '@/hooks/use-mobile';
import UserAvatar from '@/components/common/UserAvatar';
import ProfilePhotoViewer from './ProfilePhotoViewer';
import { GroupChatService, type GroupChat } from '@/services/groupChatService';
import { isPrivateChat, uploadChatImage } from './chatUtils';
import { WallpaperSheet } from './ChatWallpaper';
import InviteLinkSheet from './InviteLinkSheet';
import AddMembersSheet from './AddMembersSheet';
import { ChoirPickerSheet } from './ChoirChat';
import { RemindersSheet } from './ChatReminders';
import { listReminders } from '@/lib/chatReminders';
import { cachedChoirLink, choirLocations, choirName, getChoirLink } from '@/lib/choirChat';

interface Props {
  chat: GroupChat;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatUpdated: (patch: Partial<GroupChat>) => void;
  onLeft: () => void;
  onCall: (type: 'audio' | 'video') => void;
  /** Search this chat's messages */
  onSearch?: () => void;
  /** My starred messages in this chat */
  onStarred?: () => void;
  /** Bring a WhatsApp chat in */
  onImport?: () => void;
  /** Messages here are end-to-end encrypted */
  encrypted?: boolean;
  /** My mute / archive settings for this chat (null before that database update) */
  settings?: { muted_until: string | null; archived_at: string | null } | null;
  onMute?: (until: Date | null) => void;
  onArchive?: (archived: boolean) => void;
  /** Clear this chat (for me) */
  onClear?: () => void;
  onlineIds: Set<string>;
  /** A one-to-one chat: the other person's "Online" / "Last seen …" */
  privateStatus?: string;
  /** …and their name, as in the chat's header */
  privateName?: string;
}

type Member = Awaited<ReturnType<typeof GroupChatService.getParticipants>>[number];

/** "Starred messages ›" (WhatsApp keeps it in the chat's info) */
const StarredRow = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="mt-4 flex w-full max-w-sm items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left transition hover:bg-muted">
    <Star className="h-5 w-5 text-amber-500" />
    <span className="flex-1 text-[15px] font-medium text-foreground">Starred messages</span>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
  </button>
);

const ALWAYS = new Date('2999-12-31T00:00:00Z');

/** Mute, archive, import a WhatsApp chat, and what end-to-end encryption means here */
const MoreRows = ({ onImport, encrypted, settings, onMute, onArchive, onClear }: {
  onClear?: () => void;
  onImport?: () => void;
  encrypted?: boolean;
  settings?: { muted_until: string | null; archived_at: string | null } | null;
  onMute?: (until: Date | null) => void;
  onArchive?: (archived: boolean) => void;
}) => {
  const [explain, setExplain] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [wallpaper, setWallpaper] = useState(false);
  const until = settings?.muted_until ? new Date(settings.muted_until) : null;
  const muted = !!until && until.getTime() > Date.now();
  const mutedText = !muted ? 'Off' : until!.getFullYear() > 2900 ? 'Always' : `Until ${until!.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`;
  return (
    <div className="mt-2 w-full max-w-sm space-y-2">
      {settings && onMute && (
        <div className="overflow-hidden rounded-2xl bg-muted/60">
          <button onClick={() => (muted ? onMute(null) : setChoosing((v) => !v))} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted" aria-expanded={choosing}>
            {muted ? <BellOff className="h-5 w-5 text-muted-foreground" /> : <Bell className="h-5 w-5 text-muted-foreground" />}
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-foreground">{muted ? 'Unmute notifications' : 'Mute notifications'}</span>
              <span className="block text-xs text-muted-foreground">{muted ? `Muted · ${mutedText}` : 'Calls still ring when muted'}</span>
            </span>
          </button>
          {choosing && !muted && (
            <div className="flex gap-2 px-4 pb-3">
              {[
                { label: '8 hours', at: () => new Date(Date.now() + 8 * 3600_000) },
                { label: '1 week', at: () => new Date(Date.now() + 7 * 86400_000) },
                { label: 'Always', at: () => ALWAYS },
              ].map((o) => (
                <button
                  key={o.label}
                  onClick={() => {
                    setChoosing(false);
                    onMute(o.at());
                  }}
                  className="flex-1 rounded-full bg-background py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-border"
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {settings && onArchive && (
        <button onClick={() => onArchive(!settings.archived_at)} className="flex w-full items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left transition hover:bg-muted">
          {settings.archived_at ? <ArchiveRestore className="h-5 w-5 text-muted-foreground" /> : <Archive className="h-5 w-5 text-muted-foreground" />}
          <span className="flex-1 text-[15px] font-medium text-foreground">{settings.archived_at ? 'Unarchive chat' : 'Archive chat'}</span>
        </button>
      )}
      <button onClick={() => setWallpaper(true)} className="flex w-full items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left transition hover:bg-muted">
        <Wallpaper className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1 text-[15px] font-medium text-foreground">Wallpaper</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      <WallpaperSheet open={wallpaper} onOpenChange={setWallpaper} />
      {onClear && (
        <button onClick={onClear} className="flex w-full items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left transition hover:bg-muted">
          <Eraser className="h-5 w-5 text-red-500" />
          <span className="flex-1 text-[15px] font-medium text-red-600 dark:text-red-400">Clear chat</span>
        </button>
      )}
      {onImport && (
        <button onClick={onImport} className="flex w-full items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left transition hover:bg-muted">
          <FileUp className="h-5 w-5 text-emerald-600" />
          <span className="flex-1 text-[15px] font-medium text-foreground">Import WhatsApp chat</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {encrypted && (
        <button onClick={() => setExplain((v) => !v)} aria-expanded={explain} className="flex w-full items-start gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left transition hover:bg-muted">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-foreground">Encryption</span>
            <span className="block text-sm text-muted-foreground">
              Messages and calls are end-to-end encrypted. Tap to learn more.
            </span>
            {explain && (
              <span className="mt-2 block text-sm text-muted-foreground">
                Messages, captions and photos are locked on your phone before they're sent, and only the phones of the people in this
                chat have the key. No one else, not even {church.name}, can read them. Calls go straight between phones and are encrypted too.
                A new phone gets the key from another member's phone when they next open the app. Messages sent before encryption
                started, and videos, are protected but not end-to-end encrypted.
              </span>
            )}
          </span>
        </button>
      )}
    </div>
  );
};

const GroupInfoSheet = ({ chat, userId, open, onOpenChange, onChatUpdated, onLeft, onCall, onSearch, onStarred, onImport, encrypted, settings, onMute, onArchive, onClear, onlineIds, privateStatus, privateName }: Props) => {
  const isMobile = useIsMobile();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(chat.name);
  const [description, setDescription] = useState(chat.description || '');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [canInvite, setCanInvite] = useState(false);
  useEffect(() => {
    if (!open || isPrivateChat(chat)) return;
    GroupChatService.canInvite(chat.id).then(setCanInvite).catch(() => setCanInvite(false));
  }, [open, chat]);
  // A choir's chat: its songs and setlist show in the chat
  const [choir, setChoir] = useState<string | null>(() => cachedChoirLink(chat.id)?.location ?? null);
  const [choirOpen, setChoirOpen] = useState(false);
  // Reminders (automations) the app posts into this group
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [reminderCount, setReminderCount] = useState<number | null>(null);
  useEffect(() => {
    if (!open || isPrivateChat(chat)) return;
    let stale = false;
    listReminders(chat.id).then((l) => !stale && setReminderCount(l.length)).catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [open, chat]);
  useEffect(() => {
    if (!open || isPrivateChat(chat) || !choirLocations().length) return;
    let stale = false;
    const load = () => getChoirLink(chat.id).then((l) => !stale && setChoir(l?.location ?? null)).catch(() => undefined);
    load();
    const onChanged = (e: Event) => (e as CustomEvent).detail?.chatId === chat.id && load();
    window.addEventListener('choir-chat:changed', onChanged);
    return () => {
      stale = true;
      window.removeEventListener('choir-chat:changed', onChanged);
    };
  }, [open, chat]);
  // One-to-one: their About, and their number if they chose to show it
  const [contact, setContact] = useState<{ bio: string | null; phone: string | null } | null>(null);
  const contactId = isPrivateChat(chat) ? members.find((m) => m.user_id !== userId)?.user_id ?? null : null;
  useEffect(() => {
    if (!open || !contactId) return;
    let stale = false;
    Promise.all([
      supabase.from('profiles').select('bio').eq('id', contactId).maybeSingle(),
      supabase.rpc('profile_phone' as never, { _user_id: contactId } as never),
    ]).then(([{ data: profile }, { data }]) => {
      const phone = typeof (data as unknown) === 'string' ? (data as unknown as string).trim() : '';
      if (!stale) setContact({ bio: (profile as { bio?: string | null } | null)?.bio?.trim() || null, phone: phone || null });
    }).catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [open, contactId]);
  const [uploading, setUploading] = useState(false);
  /** The profile photo shown full screen (tap the photo at the top) */
  const [photoOpen, setPhotoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isCreator = chat.created_by === userId || chat.created_by_user === userId;
  // A church admin (or anyone the database says may hand out the link) manages too
  const canManage = isAdmin || isCreator || canInvite;
  const [removing, setRemoving] = useState<Member | null>(null);
  // Private (added or with the link) or community (anyone in the church can join)
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privateOverride, setPrivateOverride] = useState<boolean | null>(null);
  const isPrivateGroup = privateOverride ?? (chat.is_private ?? !!chat.is_custom);
  const setPrivacy = async (next: boolean) => {
    setPrivacyOpen(false);
    if (next === isPrivateGroup) return;
    setPrivateOverride(next);
    try {
      await GroupChatService.setPrivate(chat.id, next);
      onChatUpdated({ is_private: next });
      appAlert(next ? 'The group is now private' : 'The group is now a community group', next ? 'Only people you add or who have the invite link can join.' : 'Anyone in the church can find it under Community groups and join.', 'success');
    } catch (e) {
      setPrivateOverride(null);
      appAlert("Couldn't change who can join", (e as Error).message || 'Please try again.', 'error');
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [list, admin] = await Promise.all([GroupChatService.getParticipants(chat.id), GroupChatService.isAdmin(chat.id)]);
      setMembers(list);
      setIsAdmin(admin || list.some((m) => m.user_id === userId && m.is_admin));
    } catch {
      appAlert('Could not load members', 'Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setName(chat.name);
    setDescription(chat.description || '');
    setEditing(false);
    setAdding(false);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chat.id]);

  const saveInfo = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await GroupChatService.updateGroupInfo(chat.id, { name: name.trim(), description: description.trim() });
      onChatUpdated({ name: name.trim(), description: description.trim() });
      setEditing(false);
    } catch (e) {
      appAlert('Could not save changes', (e as Error).message || 'Only group admins can edit group info.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadChatImage(userId, file, 'groups');
      await GroupChatService.updateGroupInfo(chat.id, { avatar_url: url });
      onChatUpdated({ avatar_url: url });
      appAlert('Group photo updated', '', 'success');
    } catch (e) {
      const why = (e as Error)?.message || '';
      appAlert(
        'Could not update the group photo',
        /admins/i.test(why) ? 'Only the group’s admins can change it.' : /decode|image|load/i.test(why) ? 'That photo couldn’t be opened. Try another one.' : 'Check your connection and try again.',
        'error',
      );
    } finally {
      setUploading(false);
    }
  };


  // Like WhatsApp: you first, then the admins, then everyone else by name
  const sortedMembers = [...members].sort((a, b) => {
    const rank = (m: Member) => (m.user_id === userId ? 0 : m.is_admin ? 1 : 2);
    return rank(a) - rank(b) || (a.user?.full_name || a.user?.email || '').localeCompare(b.user?.full_name || b.user?.email || '');
  });
  // The chat's header ("4 members") follows the list when people are added or removed
  useEffect(() => {
    if (!members.length) return;
    window.dispatchEvent(new CustomEvent('chat-members:count', { detail: { chatId: chat.id, count: members.length } }));
  }, [members.length, chat.id]);
  const nameOf = (m: Member) => m.user?.full_name || m.user?.email?.split('@')[0] || 'this member';
  const removeMember = async (member: Member) => {
    setRemoving(null);
    try {
      await GroupChatService.removeMember(chat.id, member.user_id);
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
      appAlert(`${nameOf(member)} was removed`);
    } catch (e) {
      appAlert('Could not remove them', (e as Error).message || 'Please try again.', 'error');
    }
  };
  const toggleAdmin = async (member: Member) => {
    const admin = !member.is_admin;
    setMembers((prev) => prev.map((m) => (m.user_id === member.user_id ? { ...m, is_admin: admin } : m)));
    try {
      await GroupChatService.setAdmin(chat.id, member.user_id, admin);
      appAlert(admin ? `${nameOf(member)} is now a group admin` : `${nameOf(member)} is no longer an admin`);
    } catch (e) {
      setMembers((prev) => prev.map((m) => (m.user_id === member.user_id ? { ...m, is_admin: !admin } : m)));
      appAlert(admin ? 'Could not make them an admin' : 'Could not dismiss them as admin', (e as Error).message || 'Please try again.', 'error');
    }
  };

  const doConfirm = async () => {
    try {
      if (confirm === 'leave') {
        await GroupChatService.leaveChat(chat.id);
        appAlert(`You left ${chat.name}`);
      } else if (confirm === 'delete') {
        await GroupChatService.deleteGroup(chat.id);
        appAlert('Group deleted');
      }
      setConfirm(null);
      onOpenChange(false);
      onLeft();
    } catch {
      appAlert(confirm === 'leave' ? 'Could not leave the group' : 'Could not delete the group', 'Please try again.', 'error');
      setConfirm(null);
    }
  };

  const onlineCount = members.filter((m) => onlineIds.has(m.user_id) || m.user_id === userId).length;

  // One-to-one: just the other person, like a phone contact. No members, admins or group controls.
  if (isPrivateChat(chat)) {
    const other = members.find((m) => m.user_id !== userId);
    const otherName = other?.user?.full_name || privateName || other?.user?.email?.split('@')[0] || '';
    const online = !!other && onlineIds.has(other.user_id);
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className="flex w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none"
        >
          <SheetTitle className="sr-only">Contact info</SheetTitle>
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain px-6 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+2rem)] pt-10 text-center">
            {loading && !other && !privateName ? (
              <Loader2 className="my-10 h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => other?.user?.avatar_url && setPhotoOpen(true)}
                  disabled={!other?.user?.avatar_url}
                  className="rounded-full disabled:cursor-default"
                  aria-label={`See ${otherName}'s photo`}
                >
                  <UserAvatar name={otherName} src={other?.user?.avatar_url} seed={other?.user_id ?? chat.id} online={online} className="h-24 w-24 text-3xl" />
                </button>
                <ProfilePhotoViewer src={photoOpen ? other?.user?.avatar_url ?? null : null} title={otherName} onClose={() => setPhotoOpen(false)} />
                <h2 className="mt-4 text-xl font-semibold text-foreground">{otherName}</h2>
                {(online || privateStatus) && (
                  <p className={online ? 'mt-1 text-sm text-emerald-600 dark:text-emerald-400' : 'mt-1 text-sm text-muted-foreground'}>
                    {online ? 'Online' : privateStatus}
                  </p>
                )}
                {contact?.bio && <p className="mt-2 max-w-[18rem] text-sm text-muted-foreground">{contact.bio}</p>}
                {contact?.phone && (
                  <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                    {contact.phone}
                  </a>
                )}
              </>
            )}
            <div className="mt-6 grid w-full max-w-[20rem] grid-cols-3 gap-2">
              {[
                { icon: Phone, label: 'Voice', onClick: () => onCall('audio') },
                { icon: Video, label: 'Video', onClick: () => onCall('video') },
                { icon: Search, label: 'Search', onClick: () => onSearch?.() },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/60 py-3 text-blue-600 transition hover:bg-muted dark:text-blue-400"
                >
                  <a.icon className="h-5 w-5" />
                  <span className="text-xs font-medium text-foreground">{a.label}</span>
                </button>
              ))}
            </div>
            {onStarred && <StarredRow onClick={onStarred} />}
            <MoreRows onImport={onImport} encrypted={encrypted} settings={settings} onMute={onMute} onArchive={onArchive} onClear={onClear} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className="flex h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none"
        >
          <SheetTitle className="sr-only">Group info</SheetTitle>
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col items-center px-6 pb-5 pt-8 text-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => chat.avatar_url && setPhotoOpen(true)}
                  disabled={!chat.avatar_url}
                  className="rounded-full disabled:cursor-default"
                  aria-label="See the group photo"
                >
                  <UserAvatar name={chat.name} src={chat.avatar_url} seed={chat.id} className="h-24 w-24 text-3xl" />
                </button>
                <ProfilePhotoViewer
                  src={photoOpen ? chat.avatar_url ?? null : null}
                  title={chat.name || 'Group'}
                  onClose={() => setPhotoOpen(false)}
                  onEdit={canManage ? () => fileRef.current?.click() : undefined}
                />
                {canManage && (
                  <>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-background"
                      aria-label="Change group photo"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) changePhoto(f);
                      }}
                    />
                  </>
                )}
              </div>

              {editing ? (
                <div className="mt-5 w-full space-y-3 text-left">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" className="h-11 rounded-xl" />
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this group for?"
                    className="min-h-[88px] rounded-xl"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-full" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button className="flex-1 rounded-full" onClick={saveInfo} disabled={saving || !name.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">{chat.name}</h2>
                    {canManage && (
                      <button onClick={() => setEditing(true)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted" aria-label="Edit group">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Group · {members.length} {members.length === 1 ? 'member' : 'members'}
                    {onlineCount > 1 && ` · ${onlineCount} online`}
                  </p>
                  {chat.description && (
                    <p className="mt-3 max-w-sm whitespace-pre-wrap text-sm text-foreground/80">{chat.description}</p>
                  )}
                </>
              )}

              {!editing && (
                <div className={`mt-5 grid w-full gap-2 ${canManage ? 'max-w-sm grid-cols-4' : 'max-w-xs grid-cols-3'}`}>
                  {[
                    { icon: Phone, label: 'Voice', onClick: () => onCall('audio') },
                    { icon: Video, label: 'Video', onClick: () => onCall('video') },
                    { icon: Search, label: 'Search', onClick: () => onSearch?.() },
                    { icon: UserPlus, label: 'Add', onClick: () => setAdding(true), hidden: !canManage },
                  ].filter((a) => !a.hidden).map((a) => (
                    <button
                      key={a.label}
                      onClick={a.onClick}
                      className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/60 py-3 text-blue-600 transition hover:bg-muted dark:text-blue-400"
                    >
                      <a.icon className="h-5 w-5" />
                      <span className="text-xs font-medium text-foreground">{a.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {!editing && canInvite && (
                <button onClick={() => setInviteOpen(true)} className="mt-2 flex w-full max-w-sm items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3 text-left transition hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60">
                  <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-foreground">Invite via link</span>
                    <span className="block text-xs text-muted-foreground">Share a link or QR code: one tap to join</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {/* Who can join: private (added or the link) or community (anyone in the church) */}
              {!editing && (
                <button
                  onClick={() => canManage && setPrivacyOpen(true)}
                  disabled={!canManage}
                  className="mt-2 flex w-full max-w-sm items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left transition hover:bg-muted disabled:hover:bg-muted/60"
                  data-testid="group-privacy"
                >
                  {isPrivateGroup ? <Lock className="h-5 w-5 text-muted-foreground" /> : <Globe className="h-5 w-5 text-muted-foreground" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-foreground">{isPrivateGroup ? 'Private group' : 'Community group'}</span>
                    <span className="block text-xs text-muted-foreground">
                      {isPrivateGroup ? 'Only people added or with the invite link can join' : 'Anyone in the church can find and join it'}
                    </span>
                  </span>
                  {canManage && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
              )}
              {!editing && choirLocations().length > 0 && (canInvite || choir) && (
                <button onClick={() => setChoirOpen(true)} className="mt-2 flex w-full max-w-sm items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left transition hover:bg-muted">
                  <Music2 className="h-5 w-5 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-foreground">Choir</span>
                    <span className="block truncate text-xs text-muted-foreground">{choir ? `${choirName(choir)}: new songs and the setlist show here` : 'Show a choir’s new songs and setlist here'}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {!editing && !isPrivateChat(chat) && (canManage || (reminderCount ?? 0) > 0) && (
                <button onClick={() => setRemindersOpen(true)} data-testid="reminders-row" className="mt-2 flex w-full max-w-sm items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left transition hover:bg-muted">
                  <AlarmClock className="h-5 w-5 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-foreground">Reminders</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {reminderCount ? `${reminderCount} ${reminderCount === 1 ? 'reminder' : 'reminders'} posted here automatically` : 'Post meeting days and times here automatically'}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {!editing && onStarred && <StarredRow onClick={onStarred} />}
              {!editing && <MoreRows onImport={onImport} encrypted={encrypted} settings={settings} onMute={onMute} onArchive={onArchive} onClear={onClear} />}
            </div>

            {/* Add members */}

            {/* Members */}
            <div className="px-4 pb-4">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {members.length ? `${members.length} ${members.length === 1 ? 'member' : 'members'}` : 'Members'}
              </p>
              {loading && members.length === 0 ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="space-y-0.5">
                  {/* Like WhatsApp: add people, or share the group's link, right above the members */}
                  {canManage && !editing && (
                    <>
                      <button onClick={() => setAdding(true)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-muted">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white"><UserPlus className="h-5 w-5" /></span>
                        <span className="font-medium text-foreground">Add members</span>
                      </button>
                      {canInvite && (
                        <button onClick={() => setInviteOpen(true)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-muted">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"><Link2 className="h-5 w-5" /></span>
                          <span className="font-medium text-foreground">Invite via link</span>
                        </button>
                      )}
                    </>
                  )}
                  {sortedMembers.map((m) => {
                    const displayName = m.user_id === userId ? 'You' : m.user?.full_name || m.user?.email?.split('@')[0] || 'Member';
                    const online = m.user_id === userId || onlineIds.has(m.user_id);
                    return (
                      <div key={m.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                        <UserAvatar name={m.user?.full_name} src={m.user?.avatar_url} seed={m.user_id} online={online} className="h-10 w-10" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{displayName}</p>
                          {online && <p className="text-xs text-emerald-600 dark:text-emerald-400">Online</p>}
                        </div>
                        {m.is_admin && (
                          // Like WhatsApp's "Group admin"
                          <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11.5px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" data-testid="admin-label">
                            Group admin
                          </span>
                        )}
                        {canManage && m.user_id !== userId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Member options">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[300]">
                              {/* Whoever made the group stays its admin */}
                              {!(m.is_admin && m.user_id === chat.created_by) && (
                                <DropdownMenuItem onClick={() => toggleAdmin(m)}>
                                  {m.is_admin ? <><ShieldOff className="mr-2 h-4 w-4" /> Dismiss as admin</> : <><ShieldCheck className="mr-2 h-4 w-4" /> Make group admin</>}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setRemoving(m)}>
                                <UserMinus className="mr-2 h-4 w-4" /> Remove {nameOf(m).split(' ')[0]}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div className="space-y-1 border-t border-border px-4 py-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)]">
              <button
                onClick={() => setConfirm('leave')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <LogOut className="h-5 w-5" /> Leave group
              </button>
              {canManage && chat.is_custom && (
                <button
                  onClick={() => setConfirm('delete')}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-5 w-5" /> Delete group for everyone
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <InviteLinkSheet chatId={chat.id} chatName={chat.name} open={inviteOpen} onOpenChange={setInviteOpen} />
      <Sheet open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none">
          <div className="border-b border-border/60 px-5 py-4">
            <SheetTitle className="text-[17px] font-semibold">Who can join {chat.name}?</SheetTitle>
          </div>
          <div className="space-y-2 px-3 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)] pt-3">
            {[
              { value: true, icon: Lock, title: 'Private', detail: 'Only people the admins add, or who have the invite link. It isn’t listed for others.' },
              { value: false, icon: Globe, title: 'Community', detail: 'Listed under Community groups: anyone in the church can find it and join.' },
            ].map((o) => (
              <button
                key={o.title}
                onClick={() => setPrivacy(o.value)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${isPrivateGroup === o.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-border hover:bg-muted'}`}
                aria-pressed={isPrivateGroup === o.value}
              >
                <o.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15.5px] font-semibold text-foreground">{o.title}</span>
                  <span className="block text-[13px] leading-snug text-muted-foreground">{o.detail}</span>
                </span>
                {isPrivateGroup === o.value && <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <AddMembersSheet
        open={adding}
        onOpenChange={setAdding}
        chatId={chat.id}
        chatName={chat.name}
        userId={userId}
        memberIds={members.map((m) => m.user_id)}
        onAdded={() => void load()}
      />
      <ChoirPickerSheet open={choirOpen} onOpenChange={setChoirOpen} chatId={chat.id} current={choir} canChange={canInvite} />
      <RemindersSheet
        open={remindersOpen}
        onOpenChange={(o) => {
          setRemindersOpen(o);
          if (!o) listReminders(chat.id).then((l) => setReminderCount(l.length)).catch(() => undefined);
        }}
        chatId={chat.id}
        chatName={chat.name}
        canManage={canManage}
      />
      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing ? nameOf(removing) : ''} from “{chat.name}”?</AlertDialogTitle>
            <AlertDialogDescription>They’ll stop getting this group’s messages and won’t be able to read new ones.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 hover:bg-red-700" onClick={() => removing && removeMember(removing)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === 'delete' ? `Delete “${chat.name}”?` : `Leave “${chat.name}”?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'delete'
                ? 'The group and its messages will be removed for all members. This cannot be undone.'
                : "You'll stop getting messages from this group. You can rejoin community groups at any time."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 hover:bg-red-700" onClick={doConfirm}>
              {confirm === 'delete' ? 'Delete group' : 'Leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GroupInfoSheet;
