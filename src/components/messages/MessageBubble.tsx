import { memo, useRef } from 'react';
import { AlertCircle, Check, CheckCheck, Clock, SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar, { nameColor } from '@/components/common/UserAvatar';
import { senderAvatar, senderName, type ChatMessage } from '@/services/groupChatService';
import { formatClock, isEmojiOnly, linkify, parseMessageContent } from './chatUtils';

export interface ReactionGroup {
  emoji: string;
  count: number;
  mine: boolean;
}

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  /** first message of a run from the same person */
  isFirst: boolean;
  /** last message of a run from the same person */
  isLast: boolean;
  reactions: ReactionGroup[];
  seen?: boolean;
  onOpenActions: (message: ChatMessage) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenImage: (url: string) => void;
  onRetry?: (message: ChatMessage) => void;
}

const LONG_PRESS_MS = 420;

const MessageBubble = ({
  message, isOwn, isFirst, isLast, reactions, seen, onOpenActions, onToggleReaction, onOpenImage, onRetry,
}: Props) => {
  const { imageUrl, text } = parseMessageContent(message.content);
  const bigEmoji = !imageUrl && isEmojiOnly(text);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const name = senderName(message);

  const cancelPress = () => {
    clearTimeout(timer.current);
    start.current = null;
  };

  const pressHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY };
      fired.current = false;
      timer.current = setTimeout(() => {
        fired.current = true;
        if ('vibrate' in navigator) navigator.vibrate?.(12);
        onOpenActions(message);
        start.current = null;
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) cancelPress();
    },
    onPointerUp: cancelPress,
    onPointerLeave: cancelPress,
    onPointerCancel: cancelPress,
    // A long press should not also count as a tap (e.g. opening a photo)
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current) {
        e.stopPropagation();
        e.preventDefault();
        fired.current = false;
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      cancelPress();
      onOpenActions(message);
    },
  };

  const meta = (
    <span
      className={cn(
        'ml-2 inline-flex translate-y-[3px] items-center gap-1 whitespace-nowrap align-bottom text-[11px] leading-none',
        bigEmoji ? 'text-muted-foreground' : isOwn ? 'text-white/75' : 'text-muted-foreground',
      )}
    >
      {formatClock(message.created_at)}
      {isOwn && (
        message.failed ? <AlertCircle className="h-3.5 w-3.5 text-red-300" />
          : message.pending ? <Clock className="h-3 w-3" />
            : seen ? <CheckCheck className="h-3.5 w-3.5" />
              : <Check className="h-3.5 w-3.5" />
      )}
    </span>
  );

  return (
    <div className={cn('group/msg flex w-full items-end gap-2', isOwn ? 'justify-end' : 'justify-start', isLast ? 'mb-2' : 'mb-0.5')}>
      {!isOwn && (
        <div className="w-8 shrink-0">
          {isLast && <UserAvatar name={name} src={senderAvatar(message)} seed={message.user_id} className="h-8 w-8" />}
        </div>
      )}

      <div className={cn('flex max-w-[82%] flex-col sm:max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && isFirst && (
          <span className={cn('mb-1 ml-3 text-xs font-semibold', nameColor(message.user_id))}>{name}</span>
        )}

        <div className="relative flex items-center gap-1">
          {/* Desktop quick-react button */}
          {isOwn && !message.pending && (
            <button
              onClick={() => onOpenActions(message)}
              className="hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted group-hover/msg:opacity-100 md:flex"
              aria-label="React"
            >
              <SmilePlus className="h-4 w-4" />
            </button>
          )}

          <div
            {...pressHandlers}
            className={cn(
              'select-none [-webkit-touch-callout:none] transition-transform active:scale-[0.985]',
              bigEmoji
                ? 'px-1 text-5xl leading-tight'
                : cn(
                  'overflow-hidden text-[15px] leading-[1.4] shadow-sm',
                  imageUrl ? 'p-1' : 'px-3.5 py-2',
                  isOwn
                    ? 'bg-blue-600 text-white'
                    : 'border border-border/60 bg-card text-card-foreground',
                  'rounded-[20px]',
                  isOwn && isLast && 'rounded-br-md',
                  !isOwn && isLast && 'rounded-bl-md',
                  message.failed && 'opacity-70',
                ),
            )}
          >
            {imageUrl && (
              <button
                type="button"
                onClick={() => onOpenImage(imageUrl)}
                className="block overflow-hidden rounded-2xl"
              >
                <img
                  src={imageUrl}
                  alt="Shared photo"
                  loading="lazy"
                  className="max-h-80 w-full min-w-[160px] max-w-[280px] bg-muted object-cover"
                />
              </button>
            )}
            {(text || !imageUrl) && (
              <div className={cn('whitespace-pre-wrap break-words', imageUrl && 'px-2.5 pb-1.5 pt-1.5')}>
                {linkify(text).map((part, i) =>
                  part.type === 'link' ? (
                    <a
                      key={i}
                      href={part.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={cn('underline underline-offset-2 break-all', isOwn ? 'text-white' : 'text-blue-600 dark:text-blue-400')}
                    >
                      {part.value}
                    </a>
                  ) : (
                    <span key={i}>{part.value}</span>
                  ),
                )}
                {meta}
              </div>
            )}
            {imageUrl && !text && <div className="flex justify-end px-2 pb-1">{meta}</div>}
          </div>

          {!isOwn && (
            <button
              onClick={() => onOpenActions(message)}
              className="hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted group-hover/msg:opacity-100 md:flex"
              aria-label="React"
            >
              <SmilePlus className="h-4 w-4" />
            </button>
          )}
        </div>

        {message.failed && onRetry && (
          <button onClick={() => onRetry(message)} className="mt-1 text-xs font-medium text-red-500">
            Not sent · Tap to retry
          </button>
        )}

        {reactions.length > 0 && (
          <div className={cn('-mt-1.5 flex flex-wrap gap-1', isOwn ? 'mr-2 justify-end' : 'ml-2')}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onToggleReaction(message.id, r.emoji)}
                className={cn(
                  'flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs shadow-sm transition active:scale-90',
                  r.mine
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950'
                    : 'border-border bg-card',
                )}
              >
                <span>{r.emoji}</span>
                {r.count > 1 && <span className="font-medium text-muted-foreground">{r.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MessageBubble);
