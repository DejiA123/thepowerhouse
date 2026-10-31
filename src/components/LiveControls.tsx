import { useState } from 'react';
import { Loader2, Radio, Square } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/lib/admin';
import { appAlert } from '@/lib/appAlert';
import { recheckLive, type LiveStatus } from '@/services/youtube';

/** "https://youtu.be/ID", "…/watch?v=ID", "…/live/ID" (or the id itself) → the id */
export function videoIdFrom(link: string): string | null {
  const text = link.trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  const m = text.match(/(?:youtu\.be\/|[?&]v=|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

/**
 * For church admins, beside the videos: "We're live" shows the service to
 * everyone at once (whatever YouTube's own status says), and "End live" stops it.
 * A live stream found on YouTube needs nothing.
 */
const LiveControls = ({ live }: { live: LiveStatus }) => {
  const admin = useIsAdmin();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('Live service');
  const [busy, setBusy] = useState(false);

  if (admin !== true || (live.live && !live.manual)) return null;

  const goLive = async () => {
    const id = link.trim() ? videoIdFrom(link) : null;
    if (link.trim() && !id) {
      appAlert("That isn't a YouTube video link", 'Paste the link to the live stream, or leave it empty.', 'error');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('live_services').insert({
      title: title.trim() || 'Live service',
      service_type: 'Live service',
      youtube_video_id: id,
      is_live: true,
      created_by: user?.id ?? null,
      scheduled_time: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      appAlert("Couldn't mark the service live", error.message, 'error');
      return;
    }
    setOpen(false);
    setLink('');
    recheckLive();
  };

  const endLive = async () => {
    setBusy(true);
    const { error } = await supabase.from('live_services').update({ is_live: false, updated_at: new Date().toISOString() }).eq('is_live', true);
    setBusy(false);
    if (error) appAlert("Couldn't end the live service", error.message, 'error');
    else recheckLive();
  };

  return (
    <>
      {live.manual ? (
        <Button variant="outline" size="sm" onClick={endLive} disabled={busy} className="mb-3 h-9 gap-1.5 rounded-full text-[13px] font-semibold">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-3.5 w-3.5 fill-current" />} End live
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="mb-3 h-9 gap-1.5 rounded-full text-[13px] font-semibold text-red-600 dark:text-red-400">
          <Radio className="h-4 w-4" /> We're live
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle>Show the live service</DialogTitle>
            <DialogDescription>
              Everyone with the app open sees it straight away. The app usually finds the stream on YouTube by itself; use this if it hasn't.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goLive();
            }}
            className="space-y-3"
          >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Title" className="h-11 rounded-xl" />
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="YouTube link (optional)"
              aria-label="YouTube link"
              inputMode="url"
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">No link: the app plays whatever the channel is streaming live.</p>
            <Button type="submit" disabled={busy} className="h-11 w-full rounded-full bg-red-600 font-semibold text-white hover:bg-red-700">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "We're live"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LiveControls;
