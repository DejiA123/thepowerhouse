import { CheckSquare, Copy, Download, Loader2, Forward, Info, Pencil, Pin, PinOff, Reply, RotateCcw, Star, StarOff, Trash2 } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/services/groupChatService';
import { useEffect, useState } from 'react';
import { parseCall, parseFile, parseMessageContent, parseVoice, previewText } from './chatUtils';
import { prepareSave, saveToPhone } from '@/lib/saveMedia';
import { appAlert } from '@/lib/appAlert';

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
  /** "Delete for everyone" is offered (mine, and within 2 days, like WhatsApp) */
  canDeleteForEveryone?: boolean;
  /** Choose several messages */
  onSelect?: () => void;
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
  canDeleteForEveryone = isOwn, onSelect,
}: Props) => {
  const parsed = message ? parseMessageContent(message.content) : null;
  // Something to save to the phone (photo, video, voice message, document)
  const voice = message ? parseVoice(message.content) : null;
  const file = message ? parseFile(message.content) : null;
  // Deleted for everyone: only its note is left, which can be deleted for me
  const gone = !!message?.is_deleted;
  const media = gone ? null : parsed?.imageUrl
    ? { url: parsed.imageUrl, kind: 'photo' as const, label: 'Save photo' }
    : parsed?.videoUrl
    ? { url: parsed.videoUrl, kind: 'video' as const, label: 'Save video' }
    : voice
    ? { url: voice.url, kind: 'voice' as const, label: 'Save voice message' }
    : file
    ? { url: file.url, kind: 'document' as const, label: 'Save document', name: file.name }
    : null;
  const [saving, setSaving] = useState<'preparing' | 'ready' | 'error'>('preparing');
  const mediaUrl = media?.url ?? null;
  // Get it ready as the menu opens: iPhone only shows the share sheet straight from a tap
  useEffect(() => {
    if (!mediaUrl || !media) return;
    let stale = false;
    setSaving('preparing');
    prepareSave(mediaUrl, media.kind, media.kind === 'document' ? media.name : undefined)
      .then(() => !stale && setSaving('ready'))
      .catch(() => !stale && setSaving('error'));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaUrl]);
  const sent = !!message && !message.pending && !message.failed;
  // Encrypted and not opened on this phone yet: nothing to reply to, copy or forward
  const locked = !!message?.locked || gone;
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
              {gone ? (isOwn ? 'You deleted this message.' : 'This message was deleted.') : previewText(message.content, isOwn)}
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
              {media && sent && !locked && (
                <Action
                  icon={saving === 'preparing' ? Loader2 : Download}
                  label={saving === 'error' ? `${media.label} (try again)` : media.label}
                  onClick={async () => {
                    const result = await saveToPhone(media.url, media.kind, media.kind === 'document' ? media.name : undefined).catch(() => 'error' as const);
                    if (result === 'not-ready') {
                      appAlert('Getting it ready…', 'Tap Save again in a moment.');
                      return;
                    }
                    if (result === 'error') {
                      setSaving('error');
                      appAlert("Couldn't save it", 'Check your connection and try again.', 'error');
                      return;
                    }
                    if (result === 'downloaded') appAlert('Saved to your phone');
                    onClose();
                  }}
                />
              )}
              {sent && onInfo && !locked && <Action icon={Info} label="Info" onClick={onInfo} />}
              {sent && onSelect && !gone && <Action icon={CheckSquare} label="Select" onClick={onSelect} />}
              {sent && onDeleteForMe && <Action icon={Trash2} label="Delete for me" onClick={onDeleteForMe} danger />}
              {isOwn && !gone && (!sent || canDeleteForEveryone) && <Action icon={Trash2} label={sent ? 'Delete for everyone' : 'Delete'} onClick={onDelete} danger />}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default MessageActionsSheet;
