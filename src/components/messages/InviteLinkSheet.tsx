import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Loader2, RotateCcw, Share2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { appAlert } from '@/lib/appAlert';
import { church } from '@/config/church';

/** "the Power House app" (not "the The Power House app") */
const appName = church.name.replace(/^the\s+/i, '');
import { GroupChatService } from '@/services/groupChatService';

/**
 * A group's invite link, like WhatsApp's: share it (WhatsApp, text, email), copy
 * it, or let people scan the QR code from your screen (at rehearsal). Reset
 * stops the old link working.
 */
const InviteLinkSheet = ({ chatId, chatName, open, onOpenChange }: { chatId: string; chatName: string; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const isMobile = useIsMobile();
  const [code, setCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const link = code ? `${window.location.origin}/join/${code}` : '';

  const load = async (reset = false) => {
    setBusy(true);
    try {
      setCode(await GroupChatService.inviteCode(chatId, reset));
      if (reset) appAlert('New link made', 'The old link no longer works.');
    } catch (e) {
      appAlert("Couldn't get the link", (e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (open && !code) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { margin: 1, width: 480, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(null));
  }, [link]);

  const message = `Join "${chatName}" on the ${appName} app: ${link}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      appAlert('Link copied');
    } catch {
      appAlert("Couldn't copy", link);
    }
  };
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: chatName, text: message }).catch(() => undefined);
    } else {
      await copy();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:h-full sm:max-w-md sm:rounded-none [&>button]:hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <SheetTitle className="flex-1 text-[17px] font-semibold">Invite via link</SheetTitle>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SheetDescription className="sr-only">Share a link anyone can use to join {chatName}.</SheetDescription>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1.25rem)] pt-4">
          <p className="text-sm text-muted-foreground">
            Anyone with this link can join <span className="font-semibold text-foreground">{chatName}</span>. Share it in your WhatsApp group, by text or email, or let people scan the code.
          </p>
          <div className="flex justify-center">
            <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-border">
              {qr && !busy ? <img src={qr} alt={`QR code to join ${chatName}`} className="h-56 w-56" /> : <div className="flex h-56 w-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
            </div>
          </div>
          <p className="break-all rounded-2xl bg-muted/60 px-4 py-3 text-center font-mono text-[13px] text-foreground" data-testid="invite-link">{link || '…'}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={share} disabled={!link} className="flex h-12 items-center justify-center gap-2 rounded-full bg-blue-600 text-[15px] font-semibold text-white disabled:opacity-50">
              <Share2 className="h-4 w-4" /> Share link
            </button>
            <button onClick={copy} disabled={!link} className="flex h-12 items-center justify-center gap-2 rounded-full bg-muted text-[15px] font-semibold text-foreground disabled:opacity-50">
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          <button onClick={() => void load(true)} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-red-600 dark:text-red-400">
            <RotateCcw className="h-4 w-4" /> Reset link
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InviteLinkSheet;
