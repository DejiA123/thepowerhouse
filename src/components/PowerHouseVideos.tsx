import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const PowerHouseVideos = () => {
  const channelId = "UC35azCG6jqVkR2G8aH91v4A";
  // Convert Channel ID (UC...) to Uploads Playlist ID (UU...)
  const playlistId = "UU" + channelId.substring(2);
  const playlistUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
  const channelUrl = `https://www.youtube.com/channel/${channelId}`;

  return (
    <div className="glass rounded-[2rem] p-6 md:p-8 transition-all duration-300 hover:shadow-2xl border-0 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 relative z-10">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Latest Sermon</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(channelUrl, '_blank')}
            className="text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full"
          >
            <span>Visit Channel</span>
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 relative z-10 bg-black">
        <iframe
          className="w-full h-full"
          src={playlistUrl}
          title="The Power House International Latest Videos"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        ></iframe>
      </div>

      <div className="text-center mt-8 relative z-10">
        <Button
          onClick={() => window.open(channelUrl, '_blank')}
          className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 shadow-lg shadow-primary/20 text-lg font-medium transition-transform hover:scale-105 active:scale-95"
        >
          Watch More on YouTube
          <ExternalLink className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default PowerHouseVideos;