import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";
import LiveChat from "@/components/LiveChat";
import { CHANNEL_ID, embedUrl } from "@/services/youtube";
import { church } from '@/config/church';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** A video's id (or, for "whatever the channel is streaming", the channel's id) */
  videoId: string;
  title: string;
  isLive?: boolean;
}

const isChannelId = (id: string) => /^UC[\w-]{22}$/.test(id);

const VideoModal = ({ isOpen, onClose, videoId, title, isLive = false }: VideoModalProps) => {
  const channelStream = isLive && (!videoId || isChannelId(videoId));
  const src = channelStream
    ? `https://www.youtube-nocookie.com/embed/live_stream?channel=${videoId || CHANNEL_ID}&autoplay=1&playsinline=1`
    : embedUrl(videoId);

  const handleExternalOpen = () => {
    const url = channelStream ? `https://www.youtube.com/${church.youtube.handle}/streams` : `https://www.youtube.com/watch?v=${videoId}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto bg-black p-0">
        <DialogHeader className="p-4 bg-background">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground line-clamp-1">{title}</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExternalOpen}
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in YouTube
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="aspect-video w-full">
          {isOpen && (
            <iframe
              src={src}
              title={title}
              className="w-full h-full border-0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            />
          )}
        </div>
        {/* The live service's chat (it needs the broadcast's own video id) */}
        {isOpen && isLive && !channelStream && (
          <div className="bg-background px-3 pb-3">
            <LiveChat videoId={videoId} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;
