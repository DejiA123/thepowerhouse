import { Copy, Download, RotateCcw, Trash2 } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/services/groupChatService';
import { parseMessageContent, previewText } from './chatUtils';

export const QUICK_REACTIONS = ['❤️', '👍', '🙏', '😂', '🔥', '😮', '🙌'];

interface Props {
  message: ChatMessage | null;
  isOwn: boolean;
  myReactions: string[];
  onClose: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onDelete: () => void;
  onRetry: () => void;
}

const Action = ({ icon: Icon, label, onClick, danger }: { icon: typeof Copy; label: string; onClick: () => void; danger?: boolean }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left text-[15px] font-medium transition active:bg-muted',
      danger ? 'text-red-600 dark:text-red-400' : 'text-foreground',
    )}
  >
    <Icon className="h-5 w-5" />
    {label}
  </button>
);

/** Long-press menu for a message: react, copy, save photo, delete. */
const MessageActionsSheet = ({ message, isOwn, myReactions, onClose, onReact, onCopy, onDelete, onRetry }: Props) => {
  const image = message ? parseMessageContent(message.content).imageUrl : null;

  return (
    <Drawer open={!!message} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="z-[70] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <DrawerTitle className="sr-only">Message options</DrawerTitle>
        {message && (
          <div className="mx-auto w-full max-w-md px-3 pt-3">
            <p className="mb-3 line-clamp-2 px-2 text-center text-sm text-muted-foreground">
              {previewText(message.content)}
            </p>
            {!message.pending && !message.failed && (
              <div className="mb-3 flex items-center justify-between rounded-2xl bg-muted/60 p-2">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onReact(emoji)}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-full text-2xl transition active:scale-90',
                      myReactions.includes(emoji) ? 'bg-blue-100 dark:bg-blue-900/60' : 'hover:bg-background',
                    )}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className="rounded-2xl bg-muted/40 p-1">
              {message.failed && <Action icon={RotateCcw} label="Try sending again" onClick={onRetry} />}
              {parseMessageContent(message.content).text && <Action icon={Copy} label="Copy text" onClick={onCopy} />}
              {image && (
                <Action
                  icon={Download}
                  label="Open photo"
                  onClick={() => {
                    window.open(image, '_blank', 'noopener');
                    onClose();
                  }}
                />
              )}
              {isOwn && <Action icon={Trash2} label="Delete for everyone" onClick={onDelete} danger />}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default MessageActionsSheet;
