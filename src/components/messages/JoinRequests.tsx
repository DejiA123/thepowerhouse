import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Loader2, UserPlus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { appAlert } from '@/lib/appAlert';
import UserAvatar from '@/components/common/UserAvatar';
import { GroupChatService } from '@/services/groupChatService';

/**
 * Requests to join a group (from its choir's page), like WhatsApp's "Pending
 * participants": the group's admins see who asked, in a banner under the chat's header
 * and in chat info, and answer with Add or Decline. The database only shows requests to
 * the group's admins (and each asker their own), so nobody else ever sees this.
 */
export type JoinRequest = Awaited<ReturnType<typeof GroupChatService.joinRequests>>[number];

const CHANGED = 'join-requests:changed';

export function useJoinRequests(chatId: string, enabled = true) {
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const load = useCallback(async () => {
    const list = await GroupChatService.joinRequests(chatId).catch(() => null);
    if (list) setRequests(list);
  }, [chatId]);
  useEffect(() => {
    setRequests(null);
    if (!enabled) return;
    void load();
    const onChanged = (e: Event) => (e as CustomEvent).detail?.chatId === chatId && void load();
    window.addEventListener(CHANGED, onChanged);
    return () => window.removeEventListener(CHANGED, onChanged);
  }, [chatId, enabled, load]);
  useLiveRefresh([{ table: 'chat_join_requests', filter: `chat_id=eq.${chatId}` }], load, { enabled, pollMs: 60_000 });
  return { requests, reload: load };
}

const firstName = (name: string) => name.split(' ')[0] || name;

/** "Tessie Lawal asked to join" / "Tessie and 2 others asked to join" */
export const askedLine = (list: JoinRequest[]) =>
  list.length === 1
    ? `${list[0].name} asked to join`
    : `${firstName(list[0].name)} and ${list.length - 1} ${list.length === 2 ? 'other' : 'others'} asked to join`;

export const JoinRequestsSheet = ({
  chatId,
  chatName,
  open,
  onOpenChange,
  requests,
  onAdded,
}: {
  chatId: string;
  chatName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: JoinRequest[] | null;
  onAdded?: () => void;
}) => {
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState<string | null>(null);
  // Answered here: gone from the list at once
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (open) setAnswered(new Set());
  }, [open]);
  const shown = (requests ?? []).filter((r) => !answered.has(r.user_id));

  const answer = async (r: JoinRequest, add: boolean) => {
    setBusy(r.user_id);
    try {
      if (add) await GroupChatService.addMembers(chatId, [r.user_id]);
      else await GroupChatService.declineJoinRequest(chatId, r.user_id);
      setAnswered((prev) => new Set(prev).add(r.user_id));
      window.dispatchEvent(new CustomEvent(CHANGED, { detail: { chatId } }));
      if (add) {
        onAdded?.();
        appAlert(`${firstName(r.name)} was added`, `They’ll get a notification and can open ${chatName} now.`, 'success');
      }
      if (shown.length <= 1) onOpenChange(false);
    } catch (e) {
      appAlert(add ? 'Couldn’t add them' : 'Couldn’t decline', /admins/i.test((e as Error).message) ? 'Only the group’s admins can answer requests.' : 'Check your connection and try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden"
        data-testid="join-requests-sheet"
        // No focus ring on the close button as it opens
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-[17px] font-semibold">Asked to join</SheetTitle>
            <p className="truncate text-[12.5px] text-muted-foreground">{chatName}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SheetDescription className="px-4 pt-3 text-[13.5px] text-muted-foreground">
          They asked on the choir’s page. Add them and they’re in the group, with its messages, like anyone you add.
        </SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)] pt-2">
          {requests === null ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : shown.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No one is waiting. Another admin may have answered already.</p>
          ) : (
            shown.map((r) => (
              <div key={r.user_id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5" data-testid="join-request">
                <UserAvatar name={r.name} src={r.avatar_url} seed={r.user_id} className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">Asked {formatDistanceToNow(new Date(r.requested_at), { addSuffix: true })}</p>
                </div>
                {busy === r.user_id ? (
                  <Loader2 className="mr-3 h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => answer(r, false)}
                      disabled={!!busy}
                      className="h-9 rounded-full px-3 text-[13.5px] font-semibold text-muted-foreground ring-1 ring-border transition hover:bg-muted"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => answer(r, true)}
                      disabled={!!busy}
                      className="h-9 rounded-full bg-emerald-500 px-4 text-[13.5px] font-semibold text-white transition active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

/** Under the chat's header, for the group's admins only (nobody else can see requests) */
export const JoinRequestsBanner = ({ chatId, chatName, enabled }: { chatId: string; chatName: string; enabled: boolean }) => {
  const { requests } = useJoinRequests(chatId, enabled);
  const [open, setOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const fromPush = params.get('requests') === '1';
  const handled = useRef(false);

  // Opened from "Tessie asked to join": straight to the requests
  useEffect(() => {
    if (!fromPush || handled.current || requests === null) return;
    handled.current = true;
    setOpen(true);
    const next = new URLSearchParams(params);
    next.delete('requests');
    setParams(next, { replace: true });
  }, [fromPush, requests, params, setParams]);

  return (
    <>
      {!!requests?.length && (
        <button
          onClick={() => setOpen(true)}
          className="z-10 flex w-full items-center gap-3 border-b border-border/60 bg-background/95 px-3 py-2 text-left backdrop-blur-xl"
          data-testid="join-requests-banner"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
            <UserPlus className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400">Requests to join</span>
            <span className="block truncate text-sm text-foreground">{askedLine(requests)}</span>
          </span>
          <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1 text-[13px] font-semibold text-white">Review</span>
        </button>
      )}
      <JoinRequestsSheet chatId={chatId} chatName={chatName} open={open} onOpenChange={setOpen} requests={requests} />
    </>
  );
};

/** In chat info, above Add members (admins only) */
export const JoinRequestsRow = ({ chatId, chatName, open, onAdded }: { chatId: string; chatName: string; open: boolean; onAdded: () => void }) => {
  const { requests } = useJoinRequests(chatId, open);
  const [sheet, setSheet] = useState(false);
  if (!requests?.length) return null;
  return (
    <>
      <button onClick={() => setSheet(true)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-muted" data-testid="join-requests-row">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white"><UserPlus className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">Asked to join</span>
          <span className="block truncate text-xs text-muted-foreground">{askedLine(requests)}</span>
        </span>
        <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[12px] font-bold text-white tabular-nums">{requests.length}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      <JoinRequestsSheet chatId={chatId} chatName={chatName} open={sheet} onOpenChange={setSheet} requests={requests} onAdded={onAdded} />
    </>
  );
};
