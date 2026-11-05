import { useState } from 'react';
import { Bell, BellOff, CheckSquare, ChevronLeft, Eraser } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { appAlert } from '@/lib/appAlert';
import { GroupChatService, type ChatSummary } from '@/services/groupChatService';

const MUTE_FOR = [
  { label: '8 hours', ms: 8 * 3600_000 },
  { label: '1 week', ms: 7 * 86400_000 },
  { label: 'Always', ms: 100 * 365 * 86400_000 },
];

/** A chat row's "More" (swipe left, like WhatsApp): mute, clear, select */
const ChatMoreSheet = ({ chat, title, onClose, onClear, onSelect }: {
  chat: ChatSummary | null;
  title: string;
  onClose: () => void;
  onClear: (chatId: string) => void;
  onSelect: (chatId: string) => void;
}) => {
  const [muting, setMuting] = useState(false);
  const muted = !!chat?.muted_until && new Date(chat.muted_until).getTime() > Date.now();

  const close = () => {
    setMuting(false);
    onClose();
  };
  const mute = async (ms: number | null) => {
    if (!chat) return;
    close();
    try {
      await GroupChatService.setMuted(chat.id, ms ? new Date(Date.now() + ms) : null);
      appAlert(ms ? 'Notifications muted' : 'Notifications on');
    } catch {
      appAlert("Couldn't change notifications", 'Check your connection and try again.', 'error');
    }
  };

  const row = 'flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[16px] text-foreground transition hover:bg-muted active:bg-muted';
  return (
    <Drawer open={!!chat} onOpenChange={(open) => !open && close()}>
      <DrawerContent className="pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)]">
        <DrawerTitle className="truncate px-5 pb-1 pt-3 text-center text-[15px] font-semibold text-muted-foreground">{title}</DrawerTitle>
        <div className="px-2 pt-1">
          {muting ? (
            <>
              <button onClick={() => setMuting(false)} className={row}>
                <ChevronLeft className="h-5 w-5 text-muted-foreground" /> Mute notifications for…
              </button>
              {MUTE_FOR.map((m) => (
                <button key={m.label} onClick={() => mute(m.ms)} className={`${row} pl-12`}>{m.label}</button>
              ))}
            </>
          ) : (
            <>
              {muted ? (
                <button onClick={() => mute(null)} className={row}><Bell className="h-5 w-5 text-muted-foreground" /> Unmute notifications</button>
              ) : (
                <button onClick={() => setMuting(true)} className={row}><BellOff className="h-5 w-5 text-muted-foreground" /> Mute notifications</button>
              )}
              <button onClick={() => { const id = chat!.id; close(); onSelect(id); }} className={row}>
                <CheckSquare className="h-5 w-5 text-muted-foreground" /> Select chats
              </button>
              <button onClick={() => { const id = chat!.id; close(); onClear(id); }} className={`${row} text-red-600 dark:text-red-400`}>
                <Eraser className="h-5 w-5" /> Clear chat
              </button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ChatMoreSheet;
