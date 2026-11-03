import { useEffect, useRef, useState } from 'react';
import { Ban, BellOff, CheckCheck, Loader2, MessageCircle, MessageSquareDot } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import UserAvatar from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { readCachedMessages, writeCachedMessages } from '@/lib/chatCache';
import { GroupChatService, senderName, type ChatMessage } from '@/services/groupChatService';
import { formatClock, formatDayLabel, parseMessageContent, plainMentions, previewText } from './chatUtils';

export interface PeekTarget {
  chatId: string;
  title: string;
  avatar?: string | null;
  seed?: string;
  isPrivate: boolean;
  unread: number;
  muted?: boolean;
}

/**
 * Hold a chat to look inside without opening it, like WhatsApp: the latest
 * messages, read-only. Looking doesn't mark anything as read (nobody gets blue
 * ticks). Open chat / Mark as read or unread underneath.
 */
const ChatPeek = ({ target, onClose, onOpen }: { target: PeekTarget | null; onClose: () => void; onOpen: (chatId: string) => void }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatId = target?.chatId;
  // The finger that held the chat lifts just after this opens: that isn't a tap outside
  const openedAt = useRef(0);
  useEffect(() => {
    if (target) openedAt.current = Date.now();
  }, [target]);
  const justOpened = (e: Event) => {
    if (Date.now() - openedAt.current < 900) e.preventDefault();
  };

  useEffect(() => {
    if (!chatId || !user) return;
    let stale = false;
    setMessages(null);
    // What's on the phone shows at once; then the latest from the server
    readCachedMessages(user.id, chatId).then((list) => {
      if (!stale && list?.length) setMessages((prev) => prev ?? list);
    });
    GroupChatService.getChatMessages(chatId, 30)
      .then((list) => {
        if (stale) return;
        setMessages(list);
        writeCachedMessages(user.id, chatId, list);
      })
      .catch(() => !stale && setMessages((prev) => prev ?? []));
    return () => {
      stale = true;
    };
  }, [chatId, user]);

  // Newest at the bottom, like the chat
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const toggleRead = async () => {
    if (!target) return;
    onClose();
    if (target.unread > 0) await GroupChatService.markAsRead(target.chatId).catch(() => undefined);
    else await GroupChatService.setMarkedUnread(target.chatId, true).catch(() => undefined);
    window.dispatchEvent(new CustomEvent('chat:settings', { detail: { chatId: target.chatId } }));
  };

  let lastDay = '';
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-md gap-0 overflow-hidden rounded-3xl p-0 [&>button]:hidden"
        aria-describedby={undefined}
        onInteractOutside={justOpened}
        onPointerDownOutside={justOpened}
        onFocusOutside={justOpened}
        // The lifting finger's tap can land on a button in here: ignore it
        onClickCapture={(e) => {
          if (Date.now() - openedAt.current < 900) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <DialogTitle className="sr-only">{target ? `Preview of ${target.title}` : 'Chat preview'}</DialogTitle>
        {target && (
          <>
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
              <UserAvatar name={target.title} src={target.avatar} seed={target.seed ?? target.chatId} className="h-10 w-10" />
              <p className="min-w-0 flex-1 truncate text-[16px] font-semibold text-foreground">{target.title}</p>
              {target.muted && <BellOff className="h-4 w-4 text-muted-foreground" aria-label="Muted" />}
            </div>
            <div ref={scrollRef} className="max-h-[min(52dvh,26rem)] min-h-[10rem] space-y-1.5 overflow-y-auto bg-[#E8EEF6] px-3 py-3 dark:bg-slate-900" data-testid="chat-peek">
              {messages === null ? (
                <div className="flex h-36 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No messages yet</p>
              ) : (
                messages.map((m) => {
                  const mine = m.user_id === user?.id;
                  const day = formatDayLabel(m.created_at);
                  const showDay = day !== lastDay;
                  lastDay = day;
                  const { imageUrl, videoUrl, text } = parseMessageContent(m.content);
                  const plain = !imageUrl && !videoUrl && !m.content.startsWith('::');
                  return (
                    <div key={m.id}>
                      {showDay && (
                        <p className="my-1.5 text-center"><span className="rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{day}</span></p>
                      )}
                      <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          'max-w-[85%] rounded-2xl px-3 py-1.5 text-[14px] leading-snug shadow-sm [overflow-wrap:anywhere] [word-break:break-word]',
                          mine ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md bg-card text-card-foreground',
                        )}>
                          {!mine && !target.isPrivate && !m.is_deleted && (
                            <p className="text-[11.5px] font-semibold text-blue-700 dark:text-blue-300">{senderName(m)}</p>
                          )}
                          {m.is_deleted ? (
                            <span className={cn('italic', mine ? 'text-white/85' : 'text-muted-foreground')}>
                              <Ban className="-mt-0.5 mr-1 inline h-3.5 w-3.5" aria-hidden />
                              {mine ? 'You deleted this message.' : 'This message was deleted.'}
                            </span>
                          ) : (
                            <span className="whitespace-pre-wrap">{plain ? plainMentions(text) : previewText(m.content, mine)}</span>
                          )}
                          <span className={cn('ml-2 whitespace-nowrap align-bottom text-[10.5px]', mine ? 'text-white/75' : 'text-muted-foreground')}>
                            {formatClock(m.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-1.5">
              <button
                onClick={() => {
                  onClose();
                  onOpen(target.chatId);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15px] font-medium text-foreground hover:bg-muted"
              >
                <MessageCircle className="h-5 w-5 text-blue-600" /> Open chat
              </button>
              <button onClick={toggleRead} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15px] font-medium text-foreground hover:bg-muted">
                {target.unread > 0 ? <><CheckCheck className="h-5 w-5 text-muted-foreground" /> Mark as read</> : <><MessageSquareDot className="h-5 w-5 text-muted-foreground" /> Mark as unread</>}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatPeek;
