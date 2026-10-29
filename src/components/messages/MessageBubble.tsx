import { memo, useRef, useState } from 'react';
import { AlertCircle, Check, CheckCheck, Clock, ImageOff, PhoneIncoming, PhoneMissed, PhoneOutgoing, SmilePlus, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar, { nameColor } from '@/components/common/UserAvatar';
import { senderAvatar, senderName, type ChatMessage } from '@/services/groupChatService';
import { describeCall, formatClock, isEmojiOnly, linkify, parseCall, parseMessageContent } from './chatUtils';

/**
 * A photo or GIF in a chat. If it doesn't load it tries again by itself, then
 * offers "Tap to retry" instead of showing a broken picture.
 */
const ChatPhoto = ({ url, onOpen }: { url: string; onOpen: (url: string) => void }) => {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  // A fresh address skips any failed copy kept by the phone or the network
  const src = attempt ? `${url}${url.includes('?') ? '&' : '?'}r=${attempt}` : url;
  // App storage allows cross-site reads, so the phone only keeps copies that loaded properly
  const fromStorage = /\.supabase\.co\/storage\//.test(url);

  if (failed) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setFailed(false);
          setAttempt((a) => a + 1);
        }}
        className="flex h-40 w-[240px] max-w-full flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-sm font-medium text-muted-foreground"
      >
        <ImageOff className="h-6 w-6" />
        Photo didn't load. Tap to retry
      </button>
    );
  }
  return (
    <button type="button" onClick={() => onOpen(src)} className="block overflow-hidden rounded-2xl">
      <img
        key={src}
        src={src}
        alt="Shared photo"
        loading="lazy"
        decoding="async"
        crossOrigin={fromStorage ? 'anonymous' : undefined}
        onError={() => (attempt === 0 ? setAttempt(1) : setFailed(true))}
        className="max-h-80 w-full min-w-[160px] max-w-[280px] bg-muted object-cover"
      />
    </button>
  );
};

/** A call in the chat, like WhatsApp: "Missed voice call · Tap to call back", "Voice call · 2 min". Tap to call. */
const CallRow = ({ call, isOwn, meta, onCall }: {
  call: NonNullable<ReturnType<typeof parseCall>>;
  isOwn: boolean;
  meta: React.ReactNode;
  onCall?: (type: 'audio' | 'video') => void;
}) => {
  const { title, detail } = describeCall(call, isOwn);
  const missed = call.missed && !isOwn;
  const Icon = call.type === 'video' ? Video : missed ? PhoneMissed : isOwn ? PhoneOutgoing : PhoneIncoming;
  return (
    <button type="button" onClick={() => onCall?.(call.type)} className="flex items-center gap-3 py-0.5 text-left">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          isOwn ? 'bg-white/20' : missed ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-muted',
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-tight">{title}</span>
        <span className={cn('mt-0.5 flex items-center text-xs', isOwn ? 'text-white/75' : 'text-muted-foreground')}>
          {detail}
          {meta}
        </span>
      </span>
    </button>
  );
};

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
  /** Tapping a call in the chat ("Missed voice call") calls back */
  onCall?: (type: 'audio' | 'video') => void;
}

const LONG_PRESS_MS = 420;

const MessageBubble = ({
  message, isOwn, isFirst, isLast, reactions, seen, onOpenActions, onToggleReaction, onOpenImage, onRetry, onCall,
}: Props) => {
  const { imageUrl, videoUrl, text } = parseMessageContent(message.content);
  const call = parseCall(message.content);
  const media = !!(imageUrl || videoUrl);
  const bigEmoji = !media && isEmojiOnly(text);
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
      {isOwn && !call && (
        message.failed ? <AlertCircle className="h-3.5 w-3.5 text-red-300" />
          : message.pending ? <Clock className="h-3 w-3" />
            : seen ? <CheckCheck className="h-3.5 w-3.5" />
              : <Check className="h-3.5 w-3.5" />
      )}
    </span>
  );

  return (
    <div
      data-message-id={message.id}
      className={cn('group/msg flex w-full items-end gap-2 rounded-xl', isOwn ? 'justify-end' : 'justify-start', isLast ? 'mb-2' : 'mb-0.5')}
    >
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
                  media ? 'p-1' : 'px-3.5 py-2',
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
            {imageUrl && <ChatPhoto url={imageUrl} onOpen={onOpenImage} />}
            {videoUrl && (
              // Plays right in the chat (full screen from its controls)
              <video
                src={`${videoUrl}#t=0.1`}
                controls
                playsInline
                preload="metadata"
                onPointerDown={(e) => e.stopPropagation()}
                className="block max-h-80 w-full min-w-[200px] max-w-[280px] rounded-2xl bg-black"
              />
            )}
            {call && <CallRow call={call} isOwn={isOwn} meta={meta} onCall={onCall} />}
            {!call && (text || !media) && (
              <div className={cn('whitespace-pre-wrap break-words', media && 'px-2.5 pb-1.5 pt-1.5')}>
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
            {media && !text && <div className="flex justify-end px-2 pb-1">{meta}</div>}
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

        {/* Reactions sit on the bubble's bottom edge, in front of it (like WhatsApp) */}
        {reactions.length > 0 && (
          <div className={cn('relative z-10 -mt-2 mb-1 flex flex-wrap gap-1', isOwn ? 'mr-2 justify-end' : 'ml-2')}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onToggleReaction(message.id, r.emoji)}
                className={cn(
                  'flex h-7 items-center gap-1 rounded-full border-2 px-1.5 text-[15px] leading-none shadow-md transition active:scale-90',
                  r.mine
                    ? 'border-white bg-blue-50 dark:border-slate-900 dark:bg-blue-950'
                    : 'border-white bg-white dark:border-slate-900 dark:bg-slate-800',
                )}
              >
                <span>{r.emoji}</span>
                {r.count > 1 && <span className="text-xs font-semibold text-muted-foreground">{r.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MessageBubble);
