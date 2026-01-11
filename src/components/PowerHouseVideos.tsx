
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Play, Loader2, Video } from "lucide-react";

interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  pubDate: string;
  link: string;
}

const PowerHouseVideos = () => {
  const channelId = "UC35azCG6jqVkR2G8aH91v4A";
  const channelUrl = `https://www.youtube.com/channel/${channelId}`;

  const [videos, setVideos] = useState<VideoData[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoData | null>(null);
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
    <div className="relative overflow-hidden rounded-[2.5rem] p-1 shadow-2xl shadow-indigo-100/50">
      {/* Animated border gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 opacity-30 animate-pulse"></div>

      <Card className="relative border-0 shadow-none bg-white/80 backdrop-blur-xl text-gray-800 overflow-hidden rounded-[2.3rem]">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-50"></div>
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-96 h-96 bg-purple-100 rounded-full blur-3xl pointer-events-none opacity-50"></div>

        <CardContent className="relative z-10 p-6 md:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 leading-tight">Latest Sermons</h2>
                <p className="text-sm text-indigo-500 font-semibold tracking-wide uppercase">Watch & Transformed</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(channelUrl, '_blank')}
              className="rounded-full border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 font-bold px-6 h-10 transition-all"
            >
              <span>View All</span>
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-[400px]">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-indigo-400 font-bold animate-pulse">Loading amazing content...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Main Player */}
              <div className="lg:col-span-8 space-y-6">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-25 transition duration-1000 group-hover:opacity-40"></div>
                  <div className="relative aspect-video w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/50 bg-black">
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
                </div>
                {activeVideo && (
                  <div className="px-2">
                    <h3 className="text-2xl font-black text-gray-900 leading-tight line-clamp-2 mb-2">{activeVideo.title}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <p className="text-sm font-bold text-indigo-500">{activeVideo.pubDate}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Video List */}
              <div className="lg:col-span-4 space-y-4">
                <h3 className="text-lg font-black text-gray-900 px-1 border-b border-indigo-50 pb-2">Up Next</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => setActiveVideo(video)}
                      className={`flex gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-300 group border ${activeVideo?.id === video.id
                          ? "bg-indigo-50 border-indigo-200 shadow-sm"
                          : "bg-white border-transparent hover:border-indigo-100 hover:shadow-md"
                        }`}
                    >
                      <div className="relative w-28 flex-shrink-0 aspect-video rounded-xl overflow-hidden shadow-sm group-hover:shadow-indigo-100 transition-all">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className={`absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] ${activeVideo?.id === video.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-indigo-600 shadow-lg">
                            <Play className="w-4 h-4 translate-x-0.5 fill-current" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <h4 className={`text-sm font-bold line-clamp-2 leading-tight mb-1 transition-colors ${activeVideo?.id === video.id ? 'text-indigo-600' : 'text-gray-900 group-hover:text-indigo-500'}`}>
                          {video.title}
                        </h4>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{video.pubDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="text-center mt-12">
            <Button
              onClick={() => window.open(channelUrl, '_blank')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-10 py-7 shadow-xl shadow-indigo-200 text-lg font-black transition-all hover:scale-105 active:scale-95 group"
            >
              Watch More on YouTube
              <ExternalLink className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PowerHouseVideos;