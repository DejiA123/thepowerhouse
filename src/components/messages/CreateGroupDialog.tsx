import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { appAlert } from '@/lib/appAlert';
import { GroupChatService, type GroupChat } from '@/services/groupChatService';
import MemberPicker, { type PickablePerson } from './MemberPicker';

interface Props {
  open: boolean;
  userId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (chat: GroupChat) => void;
}

const CreateGroupDialog = ({ open, userId, onOpenChange, onCreated }: Props) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [people, setPeople] = useState<PickablePerson[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setPeople([]);
    }
  }, [open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md">
        <DialogHeader className="px-5 pb-3 pt-5 text-left">
          <DialogTitle className="text-xl">New group</DialogTitle>
          <DialogDescription>Give it a name and choose who to add. You can add more people later.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name, e.g. Youth Ministry"
            className="h-12 rounded-xl text-base"
            autoFocus
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group about? (optional)"
            className="min-h-[72px] rounded-xl"
          />
          <MemberPicker userId={userId} selected={people} onChange={setPeople} />
        </div>
        <div className="border-t border-border p-4">
          <Button onClick={create} disabled={!name.trim() || creating} className="h-12 w-full rounded-full text-base">
            {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : `Create group${people.length ? ` with ${people.length + 1}` : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
