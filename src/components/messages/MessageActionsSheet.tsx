import { Copy, Download, Forward, Info, Pencil, Pin, PinOff, Reply, RotateCcw, Star, StarOff, Trash2 } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/services/groupChatService';
import { parseCall, parseMessageContent, previewText } from './chatUtils';

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
  /** Given while the message can still be edited (the sender, 15 minutes) */
  onEdit?: () => void;
  onReply?: () => void;
  onForward?: () => void;
  starred?: boolean;
  onToggleStar?: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
  /** Who has read it (my messages) */
  onInfo?: () => void;
  onDeleteForMe?: () => void;
}

const Action = ({ icon: Icon, label, onClick, danger }: { icon: typeof Copy; label: string; onClick: () => void; danger?: boolean }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-[15px] font-medium transition active:bg-muted',
      danger ? 'text-red-600 dark:text-red-400' : 'text-foreground',
    )}
  >
    <Icon className="h-5 w-5" />
    {label}
  </button>
);

/** A round button in the top row (the things done most: reply, forward, copy, star, pin) */
const Quick = ({ icon: Icon, label, onClick, active }: { icon: typeof Copy; label: string; onClick: () => void; active?: boolean }) => (
  <button onClick={onClick} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl py-2 transition active:bg-muted">
    <span className={cn('flex h-11 w-11 items-center justify-center rounded-full', active ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-muted text-foreground')}>
      <Icon className={cn('h-5 w-5', active && 'fill-current')} />
    </span>
    <span className="w-full truncate text-center text-xs font-medium text-foreground">{label}</span>
  </button>
);

/** Long-press menu for a message, like WhatsApp: react, reply, forward, copy, star, pin, edit, info, delete. */
const MessageActionsSheet = ({
  message, isOwn, myReactions, onClose, onReact, onCopy, onDelete, onRetry, onEdit, onReply, onForward, starred, onToggleStar, pinned, onTogglePin, onInfo, onDeleteForMe,
}: Props) => {
  const parsed = message ? parseMessageContent(message.content) : null;
  const image = parsed?.imageUrl ?? parsed?.videoUrl ?? null;
  const isVideo = !!parsed?.videoUrl;
  const sent = !!message && !message.pending && !message.failed;
  // Encrypted and not opened on this phone yet: nothing to reply to, copy or forward
  const locked = !!message?.locked;
  const isCall = !!message && !!parseCall(message.content);

  const quick = sent && !locked
    ? [
        onReply && { icon: Reply, label: 'Reply', onClick: onReply },
        onForward && !isCall && { icon: Forward, label: 'Forward', onClick: onForward },
        parsed?.text && { icon: Copy, label: 'Copy', onClick: onCopy },
        onToggleStar && { icon: starred ? StarOff : Star, label: starred ? 'Unstar' : 'Star', onClick: onToggleStar, active: starred },
        onTogglePin && { icon: pinned ? PinOff : Pin, label: pinned ? 'Unpin' : 'Pin', onClick: onTogglePin },
      ].filter(Boolean) as { icon: typeof Copy; label: string; onClick: () => void; active?: boolean }[]
    : [];

  return (
    <Drawer open={!!message} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.75rem)]">
        <DrawerTitle className="sr-only">Message options</DrawerTitle>
        {message && (
          <div className="mx-auto w-full max-w-md overflow-y-auto px-3 pt-3">
            <p className="mb-3 line-clamp-2 px-2 text-center text-sm text-muted-foreground">
              {previewText(message.content, isOwn)}
            </p>
            {sent && !locked && (
              <div className="mb-2 flex items-center justify-between rounded-2xl bg-muted/60 p-2">
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
            {quick.length > 0 && (
              <div className="mb-2 flex gap-1">
                {quick.map((q) => <Quick key={q.label} {...q} />)}
              </div>
            )}
            <div className="rounded-2xl bg-muted/40 p-1">
              {message.failed && <Action icon={RotateCcw} label="Try sending again" onClick={onRetry} />}
              {!sent && parsed?.text && <Action icon={Copy} label="Copy text" onClick={onCopy} />}
              {onEdit && !locked && <Action icon={Pencil} label={parsed?.imageUrl || parsed?.videoUrl ? 'Edit caption' : 'Edit'} onClick={onEdit} />}
              {image && (
                <Action
                  icon={Download}
                  label={isVideo ? 'Open video' : 'Open photo'}
                  onClick={() => {
                    window.open(image, '_blank', 'noopener');
                    onClose();
                  }}
                />
              )}
              {sent && onInfo && !locked && <Action icon={Info} label="Info" onClick={onInfo} />}
              {sent && onDeleteForMe && <Action icon={Trash2} label="Delete for me" onClick={onDeleteForMe} danger />}
              {isOwn && <Action icon={Trash2} label={sent ? 'Delete for everyone' : 'Delete'} onClick={onDelete} danger />}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default MessageActionsSheet;
