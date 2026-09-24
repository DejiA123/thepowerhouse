import { useEffect, useState } from "react";
import { BookOpen, Church, Loader2, LocateFixed, Mail, MapPin, MessageCircle, Navigation, Phone, Radio, Sparkles } from "lucide-react";
import VideoModal from "@/components/VideoModal";
import PowerHouseVideos from "@/components/PowerHouseVideos";
import { ListGroup, ListRow, Page, PageHeader, SectionLabel } from "@/components/page/PageKit";
import { supabase } from "@/integrations/supabase/client";
import { appAlert } from "@/lib/appAlert";
import { cn } from "@/lib/utils";
import { CAMPUSES, directionsUrl, nextSundayLabel, telUrl, useCampus } from "@/data/campuses";

interface LiveService {
  id: string;
  title: string;
  description: string;
  youtube_video_id: string;
  is_live: boolean;
  service_type: string;
  scheduled_time: string;
}

const STREAMS_URL = "https://www.youtube.com/@thepowerhouseintl/streams";

const ServicesPage = () => {
  const { campus: savedCampus, setCampusId, findNearest, locating } = useCampus();
  const campus = savedCampus ?? CAMPUSES[0];
  const [liveNow, setLiveNow] = useState<LiveService | null>(null);
  const [serviceTime, setServiceTime] = useState(false);
  const [liveServices, setLiveServices] = useState<LiveService[]>([]);
  const [modalService, setModalService] = useState<LiveService | null>(null);

  useEffect(() => {
    supabase
      .from("live_services")
      .select("*")
      .order("scheduled_time", { ascending: false })
      .then(({ data }) => data && setLiveServices(data as LiveService[]));

    const check = async () => {
      try {
        const { data } = await supabase.from("live_services").select("*").eq("is_live", true).maybeSingle();
        setLiveNow((data as LiveService) ?? null);
      } catch {
        setLiveNow(null);
      }
      // Usual stream times: Sunday 10:00–13:00 and Wednesday 19:00–21:00
      const now = new Date();
      const h = now.getHours();
      setServiceTime((now.getDay() === 0 && h >= 10 && h <= 13) || (now.getDay() === 3 && h >= 19 && h <= 21));
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  const locate = async () => {
    const found = await findNearest();
    if (found) appAlert(`${found.campus.name} is closest`, `About ${Math.round(found.km)} km away`, "success");
    else appAlert("Couldn't find your location", "Pick your campus from the list instead.", "error");
  };

  const actions = [
    { label: "Directions", icon: Navigation, href: directionsUrl(campus), tint: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300" },
    { label: "Call", icon: Phone, href: telUrl(campus), tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300" },
    { label: "WhatsApp", icon: MessageCircle, href: campus.whatsappGroup, tint: "bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-300" },
    { label: "Email", icon: Mail, href: `mailto:${campus.email}`, tint: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300" },
  ];

  const pastStreams = liveServices.filter((s) => !s.is_live && s.youtube_video_id).slice(0, 5);

  return (
    <Page wide>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          eyebrow={savedCampus ? "Your campus" : "Our campuses"}
          title="Services"
          action={
            <button
              onClick={locate}
              disabled={locating}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-foreground hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              Nearest
            </button>
          }
        />

        {/* Campus switcher */}
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {CAMPUSES.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={c.id === campus.id}
              onClick={() => setCampusId(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[14px] font-semibold transition active:scale-95",
                c.id === campus.id
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-card text-foreground dark:border-slate-700",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Campus card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-card shadow-sm dark:border-slate-800">
          <a
            href={directionsUrl(campus)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block h-36 overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-sky-500"
            aria-label={`Directions to ${campus.name}`}
          >
            {/* Street-grid pattern so the header reads as a map */}
            <span
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(35deg, transparent 46%, rgba(255,255,255,.55) 47%, rgba(255,255,255,.55) 51%, transparent 52%)",
                backgroundSize: "28px 28px, 28px 28px, 100% 100%",
              }}
            />
            <span className="absolute right-6 top-7 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <MapPin className="h-7 w-7 text-white" fill="currentColor" fillOpacity={0.25} />
            </span>
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-emerald-700">● In person</span>
            <span className="absolute inset-x-4 bottom-3 text-white">
              <span className="block font-outfit text-[26px] font-extrabold leading-tight">{campus.name}</span>
              <span className="block truncate text-[13px] text-white/90">{campus.street}</span>
            </span>
          </a>
          <p className="px-4 pt-3 text-[13px] leading-snug text-muted-foreground">{campus.address}</p>
          <div className="grid grid-cols-4 gap-1 px-2 pb-3 pt-3">
            {actions.map((a) => (
              <a
                key={a.label}
                href={a.href}
                {...(a.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex flex-col items-center gap-1.5 rounded-2xl py-1 text-[11.5px] font-semibold text-foreground/80 transition active:scale-95"
              >
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", a.tint)}>
                  <a.icon className="h-5 w-5" />
                </span>
                {a.label}
              </a>
            ))}
          </div>
        </div>

        <SectionLabel>Every week</SectionLabel>
        <ListGroup>
          <ListRow
            icon={Church}
            title="Sunday Service"
            subtitle={`Next: ${nextSundayLabel()}`}
            trailing={<span className="font-outfit text-[17px] font-bold text-blue-600 dark:text-blue-400">{campus.times.sunday}</span>}
          />
          <ListRow
            icon={BookOpen}
            iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300"
            title="Bible Study"
            trailing={<span className="font-outfit text-[17px] font-bold text-blue-600 dark:text-blue-400">{campus.times.bibleStudy}</span>}
          />
          <ListRow
            icon={Sparkles}
            iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300"
            title="Prayer Meeting"
            trailing={<span className="font-outfit text-[17px] font-bold text-blue-600 dark:text-blue-400">{campus.times.prayer}</span>}
          />
        </ListGroup>
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          {campus.phone} · {campus.email}
        </p>

        {/* Watch online */}
        <SectionLabel>Can't make it in person?</SectionLabel>
        <button
          onClick={() => (liveNow ? setModalService(liveNow) : window.open(STREAMS_URL, "_blank", "noopener"))}
          className="flex w-full items-center gap-4 rounded-3xl bg-slate-900 p-4 text-left text-white shadow-lg transition active:scale-[0.99] dark:bg-slate-800"
        >
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", liveNow ? "bg-red-600" : "bg-white/10")}>
            <Radio className={cn("h-6 w-6", liveNow && "animate-pulse")} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block text-xs font-bold uppercase tracking-wider", liveNow || serviceTime ? "text-red-400" : "text-white/60")}>
              {liveNow ? "● Live now" : serviceTime ? "● Service time" : "Live stream"}
            </span>
            <span className="block truncate text-[16px] font-bold">{liveNow ? liveNow.title : "Watch services live on YouTube"}</span>
            <span className="block text-[13px] text-white/60">Sundays 10 AM · Wednesdays 7 PM</span>
          </span>
        </button>

        {pastStreams.length > 0 && (
          <>
            <SectionLabel>Recent streams</SectionLabel>
            <ListGroup>
              {pastStreams.map((s) => (
                <ListRow
                  key={s.id}
                  leading={
                    <span className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800">
                      <img src={`https://i.ytimg.com/vi/${s.youtube_video_id}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </span>
                  }
                  title={s.title}
                  subtitle={new Date(s.scheduled_time).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                  onClick={() => setModalService(s)}
                />
              ))}
            </ListGroup>
          </>
        )}
      </div>

      <div className="mt-8">
        <PowerHouseVideos />
      </div>

      <VideoModal
        isOpen={!!modalService}
        onClose={() => setModalService(null)}
        videoId={modalService?.youtube_video_id || ""}
        title={modalService?.title || "Live Stream"}
        isLive={!!modalService?.is_live}
      />
    </Page>
  );
};

export default ServicesPage;
