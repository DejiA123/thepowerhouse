import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  title: string;
  isLive?: boolean;
}

const VideoModal = ({ isOpen, onClose, videoId, title, isLive = false }: VideoModalProps) => {
  const embedUrl = isLive
    ? `https://www.youtube-nocookie.com/embed/live_stream?channel=${videoId}&autoplay=1&mute=1`
    : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

  const handleExternalOpen = () => {
    const url = isLive
      ? `https://www.youtube.com/@thepowerhouseintl/streams`
      : `https://www.youtube.com/watch?v=${videoId}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black">
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
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;