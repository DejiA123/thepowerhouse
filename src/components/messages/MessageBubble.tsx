import { memo, useRef, useState } from 'react';
import { AlertCircle, Ban, Check, CheckCheck, Clock, Forward, ImageOff, Loader2, PhoneIncoming, PhoneMissed, PhoneOutgoing, Reply, SmilePlus, Star, Video } from 'lucide-react';
import SecureImg, { useOpenedImage } from './SecureImg';
import { isEncryptedFile } from '@/lib/chatCrypto';
import { cn } from '@/lib/utils';
import UserAvatar, { nameColor } from '@/components/common/UserAvatar';
import { senderAvatar, senderName, type ChatMessage } from '@/services/groupChatService';
import { describeCall, formatClock, isEmojiOnly, linkify, parseCall, parseFile, parseMessageContent, parsePreview, parseVoice } from './chatUtils';
import { FileCard, PreviewCard, VoicePlayer, withMentionSpans } from './MessageExtras';

/**
 * A photo or GIF in a chat. If it doesn't load it tries again by itself, then
 * offers "Tap to retry" instead of showing a broken picture.
 */
const ChatPhoto = ({ url, onOpen }: { url: string; onOpen: (url: string) => void }) => {
  const [attempt, setAttempt] = useState(0);
  const [loadFailed, setFailed] = useState(false);
  // End-to-end encrypted photos are opened on the phone first
  const encrypted = isEncryptedFile(url);
  const opened = useOpenedImage(url, attempt);
  // A fresh address skips any failed copy kept by the phone or the network
  const src = encrypted ? opened.src : attempt ? `${url}${url.includes('?') ? '&' : '?'}r=${attempt}` : url;
  // App storage allows cross-site reads, so the phone only keeps copies that loaded properly
  const fromStorage = !encrypted && /\.supabase\.co\/storage\//.test(url);
  const failed = loadFailed || opened.failed;

  if (encrypted && !src && !failed) {
    return (
      <div className="flex h-40 w-[240px] max-w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (failed || !src) {
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
        onError={() => (encrypted ? setFailed(true) : attempt === 0 ? setAttempt(1) : setFailed(true))}
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

/** The message a reply answers, shown quoted at the top of the reply */
export interface Quote {
  id: string;
  userId: string;
  /** "You" for my own */
  name: string;
  text: string;
  image?: string | null;
  /** Deleted, or not reachable any more */
  missing?: boolean;
}

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  quote?: Quote | null;
  /** My id: @mentions of me are highlighted */
  myId?: string;
  /** Choosing several messages: tap to pick */
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: (message: ChatMessage) => void;
  /** Tapping the quote goes to the original */
  onQuoteTap?: (messageId: string) => void;
  /** Swipe right (or the menu) to reply */
  onReply?: (message: ChatMessage) => void;
  starred?: boolean;
  /** Just jumped to: flashes */
  highlighted?: boolean;
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
/** How far to swipe a message to reply, and the most it moves */
const SWIPE_REPLY_PX = 56;
const SWIPE_MAX_PX = 84;

const MessageBubble = ({
  message, isOwn, isFirst, isLast, reactions, seen, onOpenActions, onToggleReaction, onOpenImage, onRetry, onCall,
  quote, onQuoteTap, onReply, starred, highlighted, myId, selecting, selected, onToggleSelect,
}: Props) => {
  const { imageUrl, videoUrl, text } = parseMessageContent(message.content);
  const call = parseCall(message.content);
  const voice = parseVoice(message.content);
  const file = parseFile(message.content);
  const linkPreview = parsePreview(message.content);
  const media = !!(imageUrl || videoUrl);
  // Deleted for everyone: only a note stays ("You deleted this message", like WhatsApp)
  const gone = !!message.is_deleted;
  // A reply or a forward keeps its bubble (the quote and label sit in it)
  const bigEmoji = !media && !message.reply_to_id && !message.forwarded && isEmojiOnly(text);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const name = senderName(message);
  // Who to show it from (an imported message: the WhatsApp sender)
  const who = message.user?.id || message.user_id;
  // Swipe right to reply, like WhatsApp: the message follows the finger and a reply arrow appears
  const slideRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; dx: number; active: boolean; armed: boolean } | null>(null);
  const canSwipe = !!onReply && !message.pending && !message.failed && !gone;

  const cancelPress = () => {
    clearTimeout(timer.current);
    start.current = null;
  };

  const place = (dx: number, animate: boolean) => {
    const slide = slideRef.current;
    const arrow = arrowRef.current;
    if (slide) {
      slide.style.transition = animate ? 'transform 200ms ease-out' : 'none';
      slide.style.transform = dx ? `translateX(${dx}px)` : '';
    }
    if (arrow) {
      arrow.style.opacity = String(Math.min(1, dx / SWIPE_REPLY_PX));
      arrow.style.transform = `scale(${0.6 + 0.4 * Math.min(1, dx / SWIPE_REPLY_PX)})`;
    }
  };

  const endSwipe = (reply: boolean) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s?.active) return;
    fired.current = true; // not a tap
    place(0, true);
    if (reply && s.dx >= SWIPE_REPLY_PX) onReply?.(message);
  };

  const pressHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (selecting || (e.pointerType === 'mouse' && e.button !== 0)) return;
      start.current = { x: e.clientX, y: e.clientY };
      fired.current = false;
      swipe.current = canSwipe && e.pointerType !== 'mouse' ? { x: e.clientX, y: e.clientY, dx: 0, active: false, armed: false } : null;
      timer.current = setTimeout(() => {
        fired.current = true;
        swipe.current = null;
        if ('vibrate' in navigator) navigator.vibrate?.(12);
        onOpenActions(message);
        start.current = null;
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) cancelPress();
      const s = swipe.current;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!s.active) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          swipe.current = null; // scrolling the chat
          return;
        }
        if (dx > 10 && dx > Math.abs(dy) * 1.5) {
          s.active = true;
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        } else return;
      }
      s.dx = Math.max(0, Math.min(dx - 10, SWIPE_MAX_PX));
      if (s.dx >= SWIPE_REPLY_PX && !s.armed) {
        s.armed = true;
        if ('vibrate' in navigator) navigator.vibrate?.(10);
      } else if (s.dx < SWIPE_REPLY_PX) s.armed = false;
      place(s.dx, false);
    },
    onPointerUp: () => {
      cancelPress();
      endSwipe(true);
    },
    onPointerLeave: () => {
      cancelPress();
      if (!swipe.current?.active) swipe.current = null;
    },
    onPointerCancel: () => {
      cancelPress();
      endSwipe(false);
    },
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
      if (!selecting) onOpenActions(message);
    },
  };

  const meta = (
    <span
      className={cn(
        'ml-2 inline-flex translate-y-[3px] items-center gap-1 whitespace-nowrap align-bottom text-[11px] leading-none',
        bigEmoji ? 'text-muted-foreground' : isOwn ? 'text-white/75' : 'text-muted-foreground',
      )}
    >
      {starred && !gone && <Star className="h-3 w-3 fill-current" aria-label="Starred" />}
      {message.imported_from && !gone && <span>Imported</span>}
      {message.edited_at && !call && !gone && <span>Edited</span>}
      {formatClock(message.created_at)}
      {isOwn && !call && !message.imported_from && !gone && (
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
      onClickCapture={selecting ? (e) => {
        // Choosing several: a tap picks it (and doesn't open photos or links)
        e.preventDefault();
        e.stopPropagation();
        // A deleted message's note can't be copied, starred or forwarded
        if (!gone) onToggleSelect?.(message);
      } : undefined}
      aria-selected={selecting ? !!selected : undefined}
      className={cn(
        'group/msg relative flex w-full items-end gap-2 rounded-xl transition-colors duration-700',
        isOwn ? 'justify-end' : 'justify-start',
        isLast ? 'mb-2' : 'mb-0.5',
        highlighted && 'bg-amber-300/30 dark:bg-amber-400/20',
        selecting && 'cursor-pointer pl-9 duration-150',
        selected && 'bg-blue-500/15',
      )}
    >
      {selecting && (
        <span
          className={cn(
            'absolute left-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2',
            selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-muted-foreground/50 bg-background',
          )}
          aria-hidden
        >
          {selected && <Check className="h-4 w-4" />}
        </span>
      )}
      {canSwipe && (
        <div ref={arrowRef} aria-hidden className="pointer-events-none absolute left-1 top-1/2 -mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-0">
          <Reply className="h-4 w-4" />
        </div>
      )}
      {!isOwn && (
        <div className="w-8 shrink-0">
          {isLast && <UserAvatar name={name} src={senderAvatar(message)} seed={who} className="h-8 w-8" />}
        </div>
      )}

      <div ref={slideRef} className={cn('flex min-w-0 max-w-[82%] flex-col sm:max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && isFirst && (
          <span className={cn('mb-1 ml-1 w-fit max-w-full truncate rounded-full bg-background/85 px-2 py-px text-xs font-semibold', nameColor(who))}>{name}</span>
        )}

        <div className="relative flex min-w-0 max-w-full items-center gap-1">
          {/* Desktop quick-react button */}
          {isOwn && !message.pending && !gone && (
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
              'min-w-0 max-w-full select-none touch-pan-y [-webkit-touch-callout:none] transition-transform active:scale-[0.985]',
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
            {gone ? (
              <p className={isOwn ? 'text-white/85' : 'text-muted-foreground'}>
                <Ban className="-mt-0.5 mr-1.5 inline h-4 w-4 align-middle" aria-hidden />
                <span className="italic">{isOwn ? 'You deleted this message.' : 'This message was deleted.'}</span>
                {meta}
              </p>
            ) : (<>
            {message.forwarded && (
              <p className={cn('mb-0.5 flex items-center gap-1 text-[12px] italic', media && 'px-2 pt-1', bigEmoji ? 'text-muted-foreground' : isOwn ? 'text-white/75' : 'text-muted-foreground')}>
                <Forward className="h-3 w-3" /> Forwarded
              </p>
            )}
            {quote && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuoteTap?.(quote.id);
                }}
                className={cn(
                  'mb-1 flex w-full min-w-[180px] items-stretch overflow-hidden rounded-xl text-left text-[13px] leading-snug',
                  isOwn ? 'bg-white/15' : 'bg-muted/80',
                  bigEmoji && 'text-base',
                )}
                aria-label={`Go to the message from ${quote.name}`}
              >
                <span className={cn('w-1 shrink-0 bg-current', isOwn ? 'text-white/70' : nameColor(quote.userId))} />
                <span className="min-w-0 flex-1 px-2 py-1.5">
                  <span className={cn('block truncate font-semibold', isOwn ? 'text-white' : nameColor(quote.userId))}>{quote.name}</span>
                  <span className={cn('line-clamp-2 break-words [word-break:break-word] [overflow-wrap:anywhere]', isOwn ? 'text-white/80' : 'text-muted-foreground')}>
                    {quote.missing ? 'This message isn’t available' : quote.text || 'Message'}
                  </span>
                </span>
                {quote.image && !quote.missing && <SecureImg url={quote.image} className="h-14 w-14 shrink-0 object-cover" />}
              </button>
            )}
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
            {voice && (
              <div className="flex items-end gap-1">
                <VoicePlayer id={message.id} voice={voice} isOwn={isOwn} />
                <span className="-mr-1 pb-0.5">{meta}</span>
              </div>
            )}
            {file && <FileCard file={file} isOwn={isOwn} />}
            {linkPreview && <PreviewCard preview={linkPreview} isOwn={isOwn} />}
            {file && !text && <div className="flex justify-end pt-1">{meta}</div>}
            {!call && !voice && (text || (!media && !file)) && (
              <div className={cn('whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:anywhere]', (media || file) && 'px-2.5 pb-1.5 pt-1.5', file && 'px-1', message.locked && 'italic opacity-80')}>
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
                    <span key={i}>{withMentionSpans(part.value, myId, isOwn, i)}</span>
                  ),
                )}
                {meta}
              </div>
            )}
            {media && !text && <div className="flex justify-end px-2 pb-1">{meta}</div>}
            </>)}
          </div>

          {!isOwn && !gone && (
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
        {reactions.length > 0 && !gone && (
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
