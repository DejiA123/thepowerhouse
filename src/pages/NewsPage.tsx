import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, CalendarPlus, Church, Clock, MoreHorizontal, Pencil, Settings, Share2, Trash2 } from "lucide-react";
import AnnouncementsHub from "@/components/AnnouncementsHub";
import EventsManager from "@/components/EventsManager";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState, ListGroup, ListRow, Page, PageHeader, SectionLabel, Segmented } from "@/components/page/PageKit";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { appAlert } from "@/lib/appAlert";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;
type Tab = "events" | "updates" | "past";

const CACHE_KEY = "news_events_cache";
const FEATURE_IMAGE = "/lovable-uploads/Praise.png";

const readCache = (): Event[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// event_date is a plain "YYYY-MM-DD"; parse it as a local date so it never shifts a day
const eventDay = (e: Event) => {
  const [y, m, d] = e.event_date.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysUntil = (e: Event) => Math.round((eventDay(e).getTime() - startOfToday().getTime()) / 86400000);

const countdown = (e: Event) => {
  const n = daysUntil(e);
  if (n <= 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n < 7) return `In ${n} days`;
  if (n < 14) return "Next week";
  return `In ${n} days`;
};

const formatTime = (time: string | null) =>
  time ? new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

const whenLine = (e: Event) =>
  [eventDay(e).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }), formatTime(e.event_time), e.location]
    .filter(Boolean)
    .join(" · ");

/** A calendar file works on iPhone, Android and desktop without any account. */
const addToCalendar = (e: Event) => {
  const day = eventDay(e);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = `${day.getFullYear()}${pad(day.getMonth() + 1)}${pad(day.getDate())}`;
  let when: string;
  if (e.event_time) {
    const [h, m] = e.event_time.split(":").map(Number);
    const start = new Date(day);
    start.setHours(h || 0, m || 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    when = `DTSTART:${stamp(start)}\r\nDTEND:${stamp(end)}`;
  } else {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    when = `DTSTART;VALUE=DATE:${ymd}\r\nDTEND;VALUE=DATE:${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
  }
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Power House//Events//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@thepowerhouse`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    when,
    `SUMMARY:${esc(e.title)}`,
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    e.location ? `LOCATION:${esc(e.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.title.replace(/[^\w\s-]/g, "").trim() || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const shareEvent = async (e: Event) => {
  const text = `${e.title} — ${whenLine(e)}`;
  try {
    if (navigator.share) await navigator.share({ title: e.title, text, url: `${location.origin}/news` });
    else {
      await navigator.clipboard.writeText(`${text}\n${location.origin}/news`);
      appAlert("Event copied", "Paste it anywhere to share.", "success");
    }
  } catch {
    /* share sheet dismissed */
  }
};

const DateTile = ({ e, muted }: { e: Event; muted?: boolean }) => {
  const d = eventDay(e);
  return (
    <span
      className={cn(
        "flex w-[52px] shrink-0 flex-col items-center rounded-[14px] py-1.5",
        muted ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300",
      )}
    >
      <span className="text-[10.5px] font-bold uppercase tracking-wider">{d.toLocaleDateString([], { month: "short" })}</span>
      <span className="font-outfit text-xl font-bold leading-none">{d.getDate()}</span>
    </span>
  );
};

const NewsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>(readCache);
  const [tab, setTab] = useState<Tab>("events");
  const [isAdmin, setIsAdmin] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
    ["app-layout-root", "app-main-wrapper", "main-content"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.scrollTop = 0;
    });
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("role", ["administrator", "pastor"])
      .then(({ data }) => setIsAdmin(!!data?.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchEvents = async () => {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    if (error) {
      console.error("Error fetching events:", error);
      return;
    }
    setEvents(data || []);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
    } catch {
      /* storage full */
    }
  };

  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) appAlert("Couldn't delete the event", error.message, "error");
    else setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setDeleteConfirmId(null);
  };

  const { upcoming, past } = useMemo(() => {
    const visible = events.filter((e) => e.is_active !== false);
    return {
      upcoming: visible.filter((e) => daysUntil(e) >= 0).sort((a, b) => eventDay(a).getTime() - eventDay(b).getTime()),
      past: visible.filter((e) => daysUntil(e) < 0).sort((a, b) => eventDay(b).getTime() - eventDay(a).getTime()),
    };
  }, [events]);

  // The next featured event, or simply the next one coming up
  const featured = upcoming.find((e) => e.is_featured) ?? upcoming[0];
  const rest = upcoming.filter((e) => e !== featured);

  const openEditor = (id: string | null) => {
    setEditEventId(id);
    setManageOpen(true);
  };

  const adminMenu = (e: Event, light?: boolean) =>
    isAdmin && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(ev) => ev.stopPropagation()}
            className={cn(
              "rounded-full p-1.5",
              light ? "bg-white/20 text-white backdrop-blur hover:bg-white/30" : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
            aria-label="Event options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEditor(e.id)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteConfirmId(e.id)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

  return (
    <Page>
      <PageHeader
        eyebrow={new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
        title="News"
        action={
          isAdmin && (
            <Button onClick={() => openEditor(null)} variant="secondary" className="h-9 rounded-full px-3.5 font-semibold">
              <Settings className="mr-1.5 h-4 w-4" /> Manage
            </Button>
          )
        }
      />

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "events", label: "Events" },
          { value: "updates", label: "Updates" },
          { value: "past", label: "Past" },
        ]}
      />

      {tab === "events" && (
        <div className="animate-in fade-in duration-200">
          {featured ? (
            <div className="relative h-[280px] overflow-hidden rounded-[26px] bg-slate-900 text-white shadow-xl shadow-slate-900/20 md:h-[340px]">
              <img src={FEATURE_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_20%]" />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/5 via-slate-900/30 to-slate-900/90" />
              <div className="absolute inset-x-3.5 top-3.5 flex items-start justify-between">
                <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900">{countdown(featured)}</span>
                {adminMenu(featured, true)}
              </div>
              <div className="absolute inset-x-4 bottom-4 md:inset-x-6 md:bottom-6">
                <p className="text-[12.5px] font-bold uppercase tracking-wider text-white/90">{whenLine(featured)}</p>
                <h2 className="mt-1 font-outfit text-[27px] font-extrabold leading-tight tracking-tight md:text-4xl">{featured.title}</h2>
                {featured.description && <p className="mt-0.5 line-clamp-2 text-sm text-white/85">{featured.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => addToCalendar(featured)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-900 active:scale-95"
                  >
                    <CalendarPlus className="h-4 w-4" /> Add to calendar
                  </button>
                  <button
                    onClick={() => shareEvent(featured)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/20 px-3.5 py-2 text-[13px] font-semibold backdrop-blur active:scale-95"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No upcoming events">
              New events will show up here. Past events are under “Past”.
            </EmptyState>
          )}

          <SectionLabel>Coming up</SectionLabel>
          <ListGroup>
            <ListRow
              leading={
                <span className="flex h-[46px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                  <Church className="h-5 w-5" />
                </span>
              }
              title="Sunday Service"
              subtitle="Every Sunday · 10:00 · Galway · Dublin · Kildare · Athlone"
              onClick={() => navigate("/services")}
            />
            {rest.map((e) => (
              <ListRow
                key={e.id}
                leading={<DateTile e={e} />}
                title={e.title}
                subtitle={[formatTime(e.event_time), e.location, countdown(e)].filter(Boolean).join(" · ")}
                trailing={
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => addToCalendar(e)}
                      className="rounded-full p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                      aria-label={`Add ${e.title} to calendar`}
                    >
                      <CalendarPlus className="h-5 w-5" />
                    </button>
                    {adminMenu(e)}
                  </div>
                }
              />
            ))}
          </ListGroup>

          <SectionLabel>Latest updates</SectionLabel>
          <AnnouncementsHub />
        </div>
      )}

      {tab === "updates" && (
        <div className="animate-in fade-in duration-200">
          <AnnouncementsHub />
        </div>
      )}

      {tab === "past" && (
        <div className="animate-in fade-in duration-200">
          {past.length ? (
            <ListGroup>
              {past.map((e) => (
                <ListRow
                  key={e.id}
                  leading={<DateTile e={e} muted />}
                  title={e.title}
                  subtitle={[eventDay(e).getFullYear(), formatTime(e.event_time), e.location].filter(Boolean).join(" · ")}
                  trailing={adminMenu(e)}
                />
              ))}
            </ListGroup>
          ) : (
            <EmptyState icon={Clock} title="No past events" />
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete this event?</DialogTitle>
            <DialogDescription>It will be removed for everyone. This can't be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1 rounded-full" onClick={() => deleteConfirmId && deleteEvent(deleteConfirmId)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <Dialog
          open={manageOpen}
          onOpenChange={(open) => {
            setManageOpen(open);
            if (!open) {
              setEditEventId(null);
              fetchEvents();
            }
          }}
        >
          <DialogContent className="fixed inset-0 left-0 top-0 z-[200] m-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-none bg-background p-0 [&>button]:right-5 [&>button]:top-[calc(env(safe-area-inset-top)+1.1rem)] [&>button]:z-[310]">
            <div className="border-b px-5 pb-4 pr-16" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
              <DialogHeader className="text-left">
                <DialogTitle className="font-outfit text-2xl font-extrabold">Manage events</DialogTitle>
                <DialogDescription>Create, edit and feature church events</DialogDescription>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-slate-950">
              <div className="mx-auto max-w-5xl p-4 sm:p-8">
                <EventsManager initialEditEventId={editEventId} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Page>
  );
};

export default NewsPage;
