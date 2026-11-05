import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { appAlert } from '@/lib/appAlert';
import { GroupChatService } from '@/services/groupChatService';
import MemberPicker, { type PickablePerson } from './MemberPicker';

/**
 * "Add members", like WhatsApp: friends first, or search everyone in the church
 * app; tap people to choose them, then Add. The group's admins only (the
 * database checks).
 */
const AddMembersSheet = ({ open, onOpenChange, chatId, chatName, userId, memberIds, onAdded }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  chatName: string;
  userId: string;
  memberIds: string[];
  onAdded: () => void;
}) => {
  const isMobile = useIsMobile();
  const [picked, setPicked] = useState<PickablePerson[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setPicked([]);
  }, [open]);

  const add = async () => {
    if (!picked.length) return;
    setSaving(true);
    try {
      await GroupChatService.addMembers(chatId, picked.map((p) => p.id));
      const first = picked[0].full_name?.split(' ')[0] || 'them';
      appAlert(picked.length === 1 ? `${first} was added` : `${picked.length} people were added`, `They can now see ${chatName} and its messages.`, 'success');
      onOpenChange(false);
      onAdded();
    } catch (e) {
      appAlert("Couldn't add them", (e as Error).message?.includes('admins') ? 'Only the group’s admins can add people.' : 'Check your connection and try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex h-[92dvh] max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-[17px] font-semibold">Add members</SheetTitle>
            <p className="text-[12.5px] text-muted-foreground">{picked.length ? `${picked.length} selected` : `To ${chatName}`}</p>
          </div>
        </div>
        <SheetDescription className="sr-only">Choose people to add to {chatName}.</SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
          <MemberPicker userId={userId} selected={picked} onChange={setPicked} excludeIds={memberIds} fill />
        </div>
        <div className="border-t border-border/60 px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)] pt-3">
          <button
            onClick={add}
            disabled={!picked.length || saving}
            className="flex h-12 w-full items-center justify-center rounded-full bg-blue-600 text-[16px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : picked.length ? `Add ${picked.length} ${picked.length === 1 ? 'person' : 'people'}` : 'Choose people to add'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddMembersSheet;
