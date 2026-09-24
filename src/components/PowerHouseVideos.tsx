import { useState, useEffect } from "react";
import { ExternalLink, Play, Loader2, Video, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [activeVideo, setActiveVideo] = useState<(VideoData & { isLive?: boolean }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveNow, setIsLiveNow] = useState(false);
  const [liveServiceInfo, setLiveServiceInfo] = useState<any>(null);

  const checkLiveStatus = async () => {
    try {
      // 1. Check Supabase for manually marked live services
      const { data: liveData } = await supabase
        .from('live_services')
        .select('*')
        .eq('is_live', true)
        .maybeSingle();

      if (liveData) {
        setIsLiveNow(true);
        setLiveServiceInfo(liveData);
        return { isLive: true, videoId: liveData.youtube_video_id, title: liveData.title };
      }

      // 2. Time-based simulation (fallback)
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();
      const isSundayService = currentDay === 0 && currentHour >= 10 && currentHour <= 13;
      const isWednesdayService = currentDay === 3 && currentHour >= 19 && currentHour <= 21;

      if (isSundayService || isWednesdayService) {
        setIsLiveNow(true);
        return { isLive: true, channelId };
      }

      setIsLiveNow(false);
      return { isLive: false };
    } catch (err) {
      console.error("Error checking live status:", err);
      return { isLive: false };
    }
  };

  const fetchVideos = async () => {
    try {
      const liveStatus = await checkLiveStatus();

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

        // Priority: 1. Active Live Stream, 2. Latest Video
        if (liveStatus.isLive) {
          setActiveVideo({
            id: liveStatus.videoId || "live_stream", // special ID for channel live embed
            title: liveStatus.title || "Live Service",
            thumbnail: formattedVideos[0]?.thumbnail || "",
            pubDate: "LIVE NOW",
            link: channelUrl,
            isLive: true
          });
        } else if (formattedVideos.length > 0) {
          setActiveVideo(formattedVideos[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(checkLiveStatus, 60000); // Check live status every minute
    return () => clearInterval(interval);
  }, []);

  const embedSrc = (video: VideoData & { isLive?: boolean }) =>
    video.id === "live_stream"
      ? `https://www.youtube-nocookie.com/embed/live_stream?channel=${channelId}&autoplay=0`
      : `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=0`;

  return (
    <section className="rounded-[26px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <Video className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-outfit text-xl font-bold leading-tight text-foreground md:text-2xl">Latest sermons</h2>
            <p className="text-xs text-muted-foreground">From The Power House on YouTube</p>
          </div>
        </div>
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-foreground hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          All <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {isLoading ? (
        <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/60">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !activeVideo ? (
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white"
        >
          <Play className="h-10 w-10" />
          <span className="font-semibold">Watch on YouTube</span>
        </a>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
              <iframe
                className="h-full w-full"
                src={embedSrc(activeVideo)}
                title={activeVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
                {...({ fetchpriority: "low" } as any)}
              ></iframe>
            </div>
            <div className="mt-3 px-1">
              {activeVideo.isLive ? (
                <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                  <Radio className="h-3 w-3" /> Live now
                </span>
              ) : (
                <p className="text-xs font-semibold text-muted-foreground">{activeVideo.pubDate}</p>
              )}
              <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-foreground">{activeVideo.title}</h3>
            </div>
          </div>

          {videos.length > 1 && (
            <div className="lg:col-span-4">
              <p className="mb-2 px-1 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Up next</p>
              <div className="-mx-1 max-h-[440px] space-y-1 overflow-y-auto px-1">
                {videos
                  .filter((v) => v.id !== activeVideo.id)
                  .slice(0, 8)
                  .map((video) => (
                    <button
                      key={video.id}
                      onClick={() => setActiveVideo(video)}
                      className="flex w-full gap-3 rounded-2xl p-1.5 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/60"
                    >
                      <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
                        <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 py-0.5">
                        <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-foreground">{video.title}</span>
                        <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">{video.pubDate}</span>
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default PowerHouseVideos;