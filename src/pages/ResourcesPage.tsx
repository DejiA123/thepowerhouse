import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Compass,
  HandHeart,
  Handshake,
  Lightbulb,
  MapPin,
  MessageCircle,
  NotebookPen,
  Search,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyState, ListGroup, ListRow, Page, PageHeader, SectionLabel } from "@/components/page/PageKit";
import { useNotifications } from "@/contexts/NotificationContext";
import { useCampus } from "@/data/campuses";
import { ResourceService } from "@/services/resourceService";

const SESSIONS = [
  { name: "Prayer", description: "Deepening your conversation with God" },
  { name: "Humility", description: "The path to spiritual greatness" },
  { name: "Giving", description: "The heart of generosity" },
  { name: "Faith", description: "Trusting God in all seasons" },
  { name: "Word of God", description: "The lamp to our feet" },
];

type Row = ComponentProps<typeof ListRow> & { key: string; keywords?: string };

const tint = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
  pink: "bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300",
  teal: "bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const ResourcesPage = () => {
  const navigate = useNavigate();
  const { campus } = useCampus();
  const { unreadCount } = useNotifications();
  const [query, setQuery] = useState("");
  const [views, setViews] = useState<Record<string, number>>({});
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    ResourceService.getResourceDownloadCounts()
      .then((counts) => setViews(counts["Interactive Session"] || {}))
      .catch(() => undefined);
  }, []);

  const openSession = (name: string) => {
    setViewing(name);
    setViews((prev) => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
    ResourceService.recordDownload(name, "Interactive Session", ResourceService.getClientIP(), ResourceService.getUserAgent()).catch(() => undefined);
  };

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Grow",
      rows: [
        { key: "plans", icon: BookOpen, iconClassName: tint.blue, title: "Bible Plans", subtitle: "Daily reading plans", onClick: () => navigate("/bible-reading-plans") },
        { key: "notes", icon: NotebookPen, iconClassName: tint.violet, title: "My Notes", subtitle: "Sermon and study notes", onClick: () => navigate("/bible-notes") },
      ],
    },
    {
      title: "Connect",
      rows: [
        {
          key: "chats",
          icon: MessageCircle,
          iconClassName: tint.indigo,
          title: "Group Chats",
          subtitle: "Messages, voice and video calls",
          trailing: unreadCount > 0 ? <span className="min-w-[22px] rounded-full bg-red-500 px-1.5 text-center text-xs font-bold leading-[22px] text-white">{unreadCount}</span> : undefined,
          chevron: true,
          onClick: () => navigate("/group-chats"),
        },
        { key: "prayer", icon: HandHeart, iconClassName: tint.pink, title: "Prayer Wall", subtitle: "Share requests and pray for others", keywords: "prayer request", onClick: () => navigate("/prayer") },
        { key: "events", icon: CalendarDays, iconClassName: tint.rose, title: "Events & News", onClick: () => navigate("/news") },
        { key: "fellowships", icon: UsersRound, iconClassName: tint.green, title: "Campus Fellowships", subtitle: "Student fellowships near you", onClick: () => navigate("/campus-fellowships") },
        { key: "social", icon: Users, iconClassName: tint.amber, title: "Social Circle", onClick: () => navigate("/social") },
        { key: "new", icon: Compass, iconClassName: tint.teal, title: "New here?", subtitle: "Start your journey with us", keywords: "new to faith", onClick: () => navigate("/new-here") },
      ],
    },
    {
      title: "Serve",
      rows: [
        { key: "hub", icon: Handshake, iconClassName: tint.pink, title: "Ministry Hub", subtitle: "Choir, Ushering, Evangelism…", keywords: "life group groups teams departments choir", onClick: () => navigate("/groups") },
        { key: "serve", icon: Sparkles, iconClassName: tint.orange, title: "Serve", subtitle: "Find your place on a team", onClick: () => navigate("/serve") },
        { key: "follow", icon: ClipboardCheck, iconClassName: tint.teal, title: "Follow Up", onClick: () => navigate("/follow-up") },
        { key: "team-follow", icon: ClipboardList, iconClassName: tint.indigo, title: "Team Follow Up", onClick: () => navigate("/follow-up-team") },
        { key: "building", icon: Building2, iconClassName: tint.slate, title: "Building Campaign", onClick: () => navigate("/building-campaign") },
      ],
    },
    {
      title: "Interactive sessions",
      rows: SESSIONS.map((s) => ({
        key: `session-${s.name}`,
        icon: Lightbulb,
        iconClassName: tint.amber,
        title: s.name,
        subtitle: s.description,
        value: views[s.name] ? `${views[s.name]} views` : undefined,
        keywords: "interactive session study",
        onClick: () => openSession(s.name),
      })),
    },
  ];

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q
        ? sections
            .map((s) => ({
              ...s,
              rows: s.rows.filter((r) => `${r.title} ${r.subtitle ?? ""} ${r.keywords ?? ""} ${s.title}`.toLowerCase().includes(q)),
            }))
            .filter((s) => s.rows.length)
        : sections,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, views, unreadCount],
  );

  return (
    <Page grouped>
      <PageHeader title="Resources" />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plans, groups, teams…"
          className="h-11 w-full rounded-[13px] bg-slate-200/70 pl-10 pr-3 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500/40 dark:bg-slate-800"
          type="search"
          enterKeyHint="search"
        />
      </div>

      {!q && (
        <div className="mt-4">
          <ListGroup>
            <ListRow
              icon={MapPin}
              iconClassName="bg-blue-600 text-white"
              title={campus ? `Your church: ${campus.name}` : "Find your church"}
              subtitle={campus ? `Sunday ${campus.times.sunday} · ${campus.street}` : "Galway · Dublin · Kildare · Athlone"}
              onClick={() => navigate("/services")}
            />
          </ListGroup>
        </div>
      )}

      {filtered.map((section) => (
        <div key={section.title}>
          <SectionLabel>{section.title}</SectionLabel>
          <ListGroup>
            {section.rows.map(({ key, keywords: _k, ...row }) => (
              <ListRow key={key} {...row} />
            ))}
          </ListGroup>
        </div>
      ))}

      {q && filtered.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={Search} title={`Nothing found for “${query.trim()}”`}>
            Try “prayer”, “choir” or “Bible”.
          </EmptyState>
        </div>
      )}

      {/* Interactive session reader */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col rounded-none border-none p-0 sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-3xl">
          <DialogHeader className="border-b px-5 pb-4 text-left" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Interactive session</p>
            <DialogTitle className="font-outfit text-2xl font-extrabold">{viewing}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap p-5 text-lg leading-relaxed text-slate-700 dark:text-slate-300">
            {`Interactive Session: ${viewing}\n\nThis is a sample interactive session document from The Power House International Church.\n\nHere you would find the full content of the session, including scripture references, prayer points, and discussion questions.`}
          </div>
          <div className="border-t p-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
            <Button onClick={() => setViewing(null)} className="h-11 w-full rounded-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

export default ResourcesPage;
