import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, LogOut, MoreVertical, Pencil, Phone, Trash2, UserPlus, Video } from 'lucide-react';
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
import { GroupChatService, type GroupChat } from '@/services/groupChatService';
import MemberPicker, { type PickablePerson } from './MemberPicker';
import { uploadChatImage } from './chatUtils';

interface Props {
  chat: GroupChat;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatUpdated: (patch: Partial<GroupChat>) => void;
  onLeft: () => void;
  onCall: (type: 'audio' | 'video') => void;
  onlineIds: Set<string>;
}

type Member = Awaited<ReturnType<typeof GroupChatService.getParticipants>>[number];

const GroupInfoSheet = ({ chat, userId, open, onOpenChange, onChatUpdated, onLeft, onCall, onlineIds }: Props) => {
  const isMobile = useIsMobile();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(chat.name);
  const [description, setDescription] = useState(chat.description || '');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<PickablePerson[]>([]);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isCreator = chat.created_by === userId || chat.created_by_user === userId;
  const canManage = isAdmin || isCreator;

  const load = async () => {
    setLoading(true);
    try {
      const [list, admin] = await Promise.all([GroupChatService.getParticipants(chat.id), GroupChatService.isAdmin(chat.id)]);
      setMembers(list);
      setIsAdmin(admin);
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
    setPicked([]);
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
    } catch {
      appAlert('Could not save changes', 'Only group admins can edit group info.', 'error');
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
    } catch {
      appAlert('Could not update the group photo', '', 'error');
    } finally {
      setUploading(false);
    }
  };

  const addPeople = async () => {
    if (picked.length === 0) return;
    setSaving(true);
    try {
      await GroupChatService.addMembers(chat.id, picked.map((p) => p.id));
      appAlert(`Added ${picked.length} ${picked.length === 1 ? 'person' : 'people'}`, '', 'success');
      setAdding(false);
      setPicked([]);
      load();
    } catch {
      appAlert('Could not add members', 'Only group admins can add people.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (member: Member) => {
    try {
      await GroupChatService.removeMember(chat.id, member.user_id);
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
    } catch {
      appAlert('Could not remove member', '', 'error');
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
                <UserAvatar name={chat.name} src={chat.avatar_url} seed={chat.id} className="h-24 w-24 text-3xl" />
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
                <div className="mt-5 grid w-full max-w-xs grid-cols-3 gap-2">
                  {[
                    { icon: Phone, label: 'Voice', onClick: () => onCall('audio') },
                    { icon: Video, label: 'Video', onClick: () => onCall('video') },
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
            </div>

            {/* Add members */}
            {adding && (
              <div className="mx-4 mb-4 rounded-2xl border border-border p-4">
                <p className="mb-3 font-semibold text-foreground">Add people</p>
                <MemberPicker userId={userId} selected={picked} onChange={setPicked} excludeIds={members.map((m) => m.user_id)} />
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-full" onClick={() => setAdding(false)}>Cancel</Button>
                  <Button className="flex-1 rounded-full" onClick={addPeople} disabled={saving || picked.length === 0}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${picked.length || ''}`}
                  </Button>
                </div>
              </div>
            )}

            {/* Members */}
            <div className="px-4 pb-4">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
              {loading && members.length === 0 ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="space-y-0.5">
                  {members.map((m) => {
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
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Admin
                          </span>
                        )}
                        {canManage && m.user_id !== userId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Member options">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[80]">
                              <DropdownMenuItem className="text-red-600" onClick={() => removeMember(m)}>
                                Remove from group
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
            <div className="space-y-1 border-t border-border px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
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
