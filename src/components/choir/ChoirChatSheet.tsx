import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Check, Globe, Loader2, Lock, MessageCircle, UserPlus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';
import { formatListTime } from '@/components/messages/chatUtils';
import { choirName } from '@/lib/choirChat';
import { cancelChoirChatRequest, chatFacts, joinChoirChat, type ChoirChat } from '@/lib/choirChats';

/**
 * The choir's chat(s), from the choir page: open one I'm in, join a community group,
 * or ask a private group's admins to add me (and see that I've asked, or take it back).
 */
const ChoirChatSheet = ({
  open,
  onOpenChange,
  location,
  chats,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: string;
  chats: ChoirChat[];
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const here = useLocation();
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  const openChat = (id: string) => {
    onOpenChange(false);
    navigate(`/group-chats?chat=${id}`);
  };

  const join = async (c: ChoirChat) => {
    if (!user) return;
    setBusy(c.id);
    try {
      const result = await joinChoirChat(location, user.id, c.id);
      // Asked: the card turns into "Request sent" in place
      if (result !== 'asked') openChat(c.id);
    } catch (e) {
      const why = (e as Error).message || '';
      appAlert(
        'Couldn’t join the chat',
        /row-level security|admins|private/i.test(why) ? 'It’s a private group: ask one of its admins to add you.' : 'Check your connection and try again.',
        'error',
      );
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (c: ChoirChat) => {
    if (!user) return;
    setBusy(c.id);
    try {
      await cancelChoirChatRequest(location, user.id, c.id);
    } catch {
      appAlert('Couldn’t take back the request', 'Check your connection and try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const title = chats.length > 1 ? `${choirName(location)} chats` : `${choirName(location)} chat`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden"
        data-testid="choir-chat-sheet"
        // No focus ring on the close button as it opens
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <SheetTitle className="min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</SheetTitle>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SheetDescription className="sr-only">The choir’s group chat: open it, or join it</SheetDescription>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1.25rem)] pt-4">
          {chats.map((c) => {
            const working = busy === c.id;
            return (
              <div key={c.id} className="rounded-[22px] border border-border/70 bg-card p-4 shadow-sm" data-testid="choir-chat-option">
                <div className="flex items-center gap-3">
                  <span className="relative shrink-0">
                    <UserAvatar name={c.name} src={c.avatar_url} seed={c.id} className="h-14 w-14" />
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-card">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold text-foreground">{c.name}</span>
                    <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      {!c.is_member && (c.is_private ? <Lock className="h-3.5 w-3.5 shrink-0" /> : <Globe className="h-3.5 w-3.5 shrink-0" />)}
                      <span className="truncate">{chatFacts(c)}</span>
                    </span>
                  </span>
                </div>

                {c.is_member ? (
                  <>
                    {c.last && (
                      <p className={cn('mt-3 line-clamp-2 text-[14px]', c.unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {c.last.who ? `${c.last.who}: ` : ''}
                        {c.last.text}
                        <span className="ml-1.5 whitespace-nowrap text-[12px] font-normal text-muted-foreground">· {formatListTime(c.last.at)}</span>
                      </p>
                    )}
                    <button
                      onClick={() => openChat(c.id)}
                      className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[15.5px] font-semibold text-white shadow-sm shadow-emerald-600/20 transition active:scale-[0.99]"
                      data-testid="open-choir-chat"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Open chat
                      {c.unread > 0 && (
                        <span className="ml-1 rounded-full bg-white/25 px-2 py-0.5 text-[12.5px] font-bold tabular-nums">
                          {c.marked_unread ? 'Unread' : `${c.unread > 99 ? '99+' : c.unread} new`}
                        </span>
                      )}
                    </button>
                  </>
                ) : !user ? (
                  <>
                    <p className="mt-3 text-[14px] leading-snug text-muted-foreground">Sign in to join the choir’s chat.</p>
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/auth?next=${encodeURIComponent(here.pathname + here.search)}`);
                      }}
                      className="mt-3 h-12 w-full rounded-2xl bg-blue-600 text-[15.5px] font-semibold text-white transition active:scale-[0.99]"
                    >
                      Sign in to join
                    </button>
                  </>
                ) : c.asked_at ? (
                  <>
                    <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-emerald-50 px-3.5 py-3 text-[14px] leading-snug text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" data-testid="choir-chat-asked">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        <span className="font-semibold">Request sent</span> {formatDistanceToNow(new Date(c.asked_at), { addSuffix: true })}. The group’s admins will add you, and
                        you’ll get a notification when they do.
                      </span>
                    </div>
                    <button
                      onClick={() => cancel(c)}
                      disabled={working}
                      className="mt-2 h-11 w-full rounded-2xl text-[14.5px] font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-60"
                    >
                      {working ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Cancel request'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-[14px] leading-snug text-muted-foreground">
                      {c.is_private
                        ? 'A private group: its admins add people. Ask, and they’ll get your request.'
                        : 'Anyone in the church can join this group.'}
                    </p>
                    <button
                      onClick={() => join(c)}
                      disabled={working}
                      className={cn(
                        'mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15.5px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-70',
                        c.is_private ? 'bg-blue-600' : 'bg-emerald-500',
                      )}
                      data-testid="join-choir-chat"
                    >
                      {working ? <Loader2 className="h-5 w-5 animate-spin" /> : c.is_private ? <UserPlus className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                      {c.is_private ? 'Ask to join' : 'Join the chat'}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ChoirChatSheet;
