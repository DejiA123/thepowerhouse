import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { appAlert } from '@/lib/appAlert';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardSafeHeight } from '@/hooks/useKeyboardSafeHeight';
import { GroupChatService, type GroupChat } from '@/services/groupChatService';
import MemberPicker, { type PickablePerson } from './MemberPicker';

interface Props {
  open: boolean;
  userId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (chat: GroupChat) => void;
}

/**
 * New group. On phones it's a full screen like WhatsApp's: back and Create in
 * the header (always visible, even with the keyboard up), one scrolling page.
 * On larger screens it's a dialog.
 */
const CreateGroupDialog = ({ open, userId, onOpenChange, onCreated }: Props) => {
  const isMobile = useIsMobile();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [people, setPeople] = useState<PickablePerson[]>([]);
  const [creating, setCreating] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);
  useKeyboardSafeHeight(screenRef, open && isMobile);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setPeople([]);
    }
  }, [open]);

  // Full screen: Escape closes it, like the dialog
  useEffect(() => {
    if (!open || !isMobile) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isMobile, onOpenChange]);

  const canCreate = !!name.trim() && !creating;
  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const chat = await GroupChatService.createCustomGroup(name, description, people.map((p) => p.id));
      onOpenChange(false);
      onCreated(chat);
    } catch (error) {
      console.error(error);
      appAlert('Could not create the group', 'Please try again.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const fields = (
    <>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name, e.g. Youth Ministry"
        className="h-12 rounded-xl text-base"
        // On phones the keyboard waits for a tap, so the screen doesn't jump on opening
        autoFocus={!isMobile}
        enterKeyHint="next"
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What's this group about? (optional)"
        className="min-h-[72px] rounded-xl text-base"
      />
      <MemberPicker userId={userId} selected={people} onChange={setPeople} fill={isMobile} />
    </>
  );

  if (isMobile) {
    if (!open) return null;
    return createPortal(
      <div
        ref={screenRef}
        role="dialog"
        aria-modal="true"
        aria-label="New group"
        className="fixed inset-0 z-[200] flex flex-col bg-background animate-in slide-in-from-bottom-6 fade-in duration-200"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border/60 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted"
            aria-label="Cancel"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-semibold leading-tight text-foreground">New group</h2>
            <p className="truncate text-xs text-muted-foreground">
              {people.length ? `${people.length} ${people.length === 1 ? 'person' : 'people'} added` : 'Add a name, then choose people'}
            </p>
          </div>
          <Button onClick={create} disabled={!canCreate} className="h-9 rounded-full px-4 font-semibold">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
          <p className="text-sm text-muted-foreground">You can add more people later.</p>
          {fields}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
        <DialogHeader className="px-5 pb-3 pt-5 text-left">
          <DialogTitle className="text-xl">New group</DialogTitle>
          <DialogDescription>Give it a name and choose who to add. You can add more people later.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">{fields}</div>
        <div className="border-t border-border p-4">
          <Button onClick={create} disabled={!canCreate} className="h-12 w-full rounded-full text-base">
            {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : `Create group${people.length ? ` with ${people.length + 1}` : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
