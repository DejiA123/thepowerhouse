import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play, Loader2 } from "lucide-react";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  pubDate: string;
  link: string;
}

const PowerHouseVideos = () => {
  const channelId = "UC35azCG6jqVkR2G8aH91v4A";
  const channelUrl = `https://www.youtube.com/channel/${channelId}`;

  const [videos, setVideos] = useState<Video[]>([]);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch(
          `https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.youtube.com%2Ffeeds%2Fvideos.xml%3Fchannel_id%3D${channelId}`
        );
        const data = await response.json();

        if (data.items) {
          const formattedVideos = data.items.map((item: any) => ({
            id: item.guid.split(":")[2],
            title: item.title,
            thumbnail: `https://i.ytimg.com/vi/${item.guid.split(":")[2]}/mqdefault.jpg`,
            pubDate: new Date(item.pubDate).toLocaleDateString(),
            link: item.link
          }));

          setVideos(formattedVideos);
          if (formattedVideos.length > 0) {
            setActiveVideo(formattedVideos[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="glass rounded-[2rem] p-6 md:p-8 transition-all duration-300 hover:shadow-2xl border-0 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4 relative z-10">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Latest Sermons</h2>
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

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          {/* Main Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black">
              {activeVideo && (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=0`}
                  title={activeVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              )}
            </div>
            {activeVideo && (
              <div className="px-1">
                <h3 className="text-xl font-bold line-clamp-2">{activeVideo.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{activeVideo.pubDate}</p>
              </div>
            )}
          </div>

          {/* Video List */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-lg font-semibold px-1 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">More Videos</h3>
            <div className="space-y-3">
              {videos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setActiveVideo(video)}
                  className={`flex gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 group ${activeVideo?.id === video.id
                      ? "bg-primary/10 border-primary/20"
                      : "hover:bg-white/5 border border-transparent hover:border-white/10"
                    }`}
                >
                  <div className="relative w-32 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-black/10">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/20 ${activeVideo?.id === video.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      <Play className="w-6 h-6 text-white fill-white/80 drop-shadow-lg" />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <h4 className={`text-sm font-medium line-clamp-2 leading-snug ${activeVideo?.id === video.id ? 'text-primary' : 'text-foreground/90'}`}>
                      {video.title}
                    </h4>
                    <span className="text-xs text-muted-foreground mt-1">{video.pubDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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