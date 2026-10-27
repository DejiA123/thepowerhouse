import { useEffect, useState } from "react";
import { ExternalLink, Play, Loader2, Video, Radio } from "lucide-react";
import LiveChat from "@/components/LiveChat";
import {
  CHANNEL_URL,
  cachedVideos,
  embedUrl,
  latestVideos,
  relativeDate,
  useLiveStatus,
  type YouTubeVideo,
} from "@/services/youtube";
import { church } from "@/config/church";

type Playable = YouTubeVideo & { isLive?: boolean };

/** Latest sermons from the church's YouTube channel, played in the app (and the live service, with its chat, while it's on). */
const ChurchVideos = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>(cachedVideos);
  const [isLoading, setIsLoading] = useState(() => cachedVideos().length === 0);
  // A video picked from "Up next" (otherwise the live service, or the newest video)
  const [picked, setPicked] = useState<Playable | null>(null);
  // The YouTube player is only loaded once someone taps play (it's large, and on
  // iPhone it would run alongside the app while it's opening)
  const [playing, setPlaying] = useState(false);
  const live = useLiveStatus();

  useEffect(() => {
    latestVideos()
      .then((v) => v.length && setVideos(v))
      .finally(() => setIsLoading(false));
  }, []);

  const liveVideo: Playable | null =
    live.live && live.videoId
      ? { id: live.videoId, title: live.title || "Live service", thumbnail: "", publishedAt: "", isLive: true }
      : null;
  const activeVideo: Playable | null = picked ?? liveVideo ?? videos[0] ?? null;

  // The newest video or live service changed: show it from its picture again
  useEffect(() => {
    if (!picked) setPlaying(false);
  }, [liveVideo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const poster = (video: Playable) => `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

  return (
    <section className="rounded-[26px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {liveVideo ? <Radio className="h-5 w-5 animate-pulse" /> : <Video className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="font-outfit text-xl font-bold leading-tight text-foreground md:text-2xl">
              {liveVideo ? "Live now" : "Latest sermons"}
            </h2>
            <p className="text-xs text-muted-foreground">From {church.name} on YouTube</p>
          </div>
        </div>
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-foreground hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          All <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {isLoading && !activeVideo ? (
        <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/60">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !activeVideo ? (
        <a
          href={CHANNEL_URL}
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
              {playing ? (
                <iframe
                  key={activeVideo.id}
                  className="h-full w-full"
                  src={embedUrl(activeVideo.id)}
                  title={activeVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label={`Play ${activeVideo.title}`}
                  className="group absolute inset-0 h-full w-full"
                >
                  <img src={poster(activeVideo)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                    <span className="flex h-14 w-20 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg transition group-active:scale-95">
                      <Play className="h-7 w-7 fill-current" />
                    </span>
                  </span>
                </button>
              )}
            </div>
            <div className="mt-3 px-1">
              {activeVideo.isLive ? (
                <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                  <Radio className="h-3 w-3" /> Live now
                </span>
              ) : (
                <p className="text-xs font-semibold text-muted-foreground">{relativeDate(activeVideo.publishedAt)}</p>
              )}
              <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-foreground">{activeVideo.title}</h3>
            </div>
            {activeVideo.isLive && <LiveChat videoId={activeVideo.id} />}
          </div>

          {(videos.length > 1 || (liveVideo && videos.length > 0) || (picked && liveVideo)) && (
            <div className="lg:col-span-4">
              <p className="mb-2 px-1 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                {liveVideo ? "Also watch" : "Up next"}
              </p>
              <div className="-mx-1 max-h-[440px] space-y-1 overflow-y-auto px-1">
                {/* Back to the live service after watching something else */}
                {picked && liveVideo && picked.id !== liveVideo.id && (
                  <button
                    onClick={() => {
                      setPicked(null);
                      setPlaying(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl bg-red-50 p-2.5 text-left dark:bg-red-950/40"
                  >
                    <Radio className="h-5 w-5 shrink-0 animate-pulse text-red-600" />
                    <span className="text-[13.5px] font-semibold text-red-700 dark:text-red-300">Back to the live service</span>
                  </button>
                )}
                {videos
                  .filter((v) => v.id !== activeVideo.id)
                  .slice(0, 8)
                  .map((video) => (
                    <button
                      key={video.id}
                      onClick={() => {
                        setPicked(video);
                        setPlaying(true);
                      }}
                      className="flex w-full gap-3 rounded-2xl p-1.5 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/60"
                    >
                      <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
                        <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 py-0.5">
                        <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-foreground">{video.title}</span>
                        <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">{relativeDate(video.publishedAt)}</span>
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

export default ChurchVideos;
