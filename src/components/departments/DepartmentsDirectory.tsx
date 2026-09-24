import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Handshake, Heart, Music, Users, type LucideIcon } from "lucide-react";
import { ListGroup, ListRow, SectionLabel } from "@/components/page/PageKit";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface MinistryTeam {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  meetings: string;
  leader: string;
  route: string;
  /** Icon tile colours and the gradient used when it's "your team". */
  tile: string;
  gradient: string;
}

export const MINISTRY_TEAMS: MinistryTeam[] = [
  {
    id: "choir",
    name: "Choir",
    icon: Music,
    description: "Lead worship through music and song",
    meetings: "Wednesdays 7:00 PM",
    leader: "Min Rekky Chigozie",
    route: "/groups/choir",
    tile: "bg-pink-500 text-white",
    gradient: "from-rose-700 via-pink-600 to-pink-400",
  },
  {
    id: "management",
    name: "Management Team",
    icon: ClipboardList,
    description: "Convention planning & coordination",
    meetings: "As required",
    leader: "NOC",
    route: "/groups/management",
    tile: "bg-slate-800 text-white dark:bg-slate-600",
    gradient: "from-slate-900 via-slate-800 to-slate-600",
  },
  {
    id: "ushering",
    name: "Ushering",
    icon: Handshake,
    description: "Welcome and assist the congregation",
    meetings: "Monthly training sessions",
    leader: "Min Golden Chigozie",
    route: "/groups/ushering",
    tile: "bg-purple-500 text-white",
    gradient: "from-purple-800 via-purple-600 to-fuchsia-500",
  },
  {
    id: "evangelism",
    name: "Evangelism",
    icon: Heart,
    description: "Share the gospel in the community",
    meetings: "Saturdays 2:00 PM",
    leader: "Min Golden Chigozie",
    route: "/groups/evangelism",
    tile: "bg-red-500 text-white",
    gradient: "from-red-700 via-red-600 to-orange-500",
  },
  {
    id: "pastoral",
    name: "Pastoral Care",
    icon: Users,
    description: "Support and care for church members",
    meetings: "Bi-weekly meetings",
    leader: "Pastor David Richman",
    route: "/groups/pastoral",
    tile: "bg-blue-600 text-white",
    gradient: "from-blue-900 via-blue-700 to-blue-500",
  },
];

const RECENT_KEY = "ministry_recent_teams";

const readRecent = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const rememberTeam = (id: string) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 5)));
  } catch {
    /* private mode */
  }
};

/** Teams you belong to (or opened last) first, then every other team with a Join button. */
const DepartmentsDirectory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [recent] = useState<string[]>(readRecent);

  useEffect(() => {
    // @ts-ignore: group_members is not in the generated types
    supabase
      .from("group_members")
      .select("group_name, user_id")
      .then(({ data, error }: any) => {
        if (error || !data) return;
        const counts: Record<string, number> = {};
        const mine = new Set<string>();
        for (const row of data) {
          counts[row.group_name] = (counts[row.group_name] || 0) + 1;
          if (user && row.user_id === user.id) mine.add(row.group_name);
        }
        setMemberCounts(counts);
        setJoined(mine);
      });
  }, [user]);

  const open = (team: MinistryTeam) => {
    rememberTeam(team.id);
    navigate(team.route);
  };

  const mine = MINISTRY_TEAMS.filter((t) => joined.has(t.name));
  const featured = mine[0] ?? MINISTRY_TEAMS.find((t) => t.id === recent[0]);
  const others = MINISTRY_TEAMS.filter((t) => t !== featured);
  const membersLabel = (t: MinistryTeam) => (memberCounts[t.name] ? `${memberCounts[t.name]} members` : t.meetings);

  return (
    <div>
      {featured && (
        <>
          <SectionLabel className="mt-1">{mine.length ? "Your team" : "Jump back in"}</SectionLabel>
          <button
            onClick={() => open(featured)}
            className={cn(
              "relative w-full overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-left text-white shadow-lg transition active:scale-[0.99]",
              featured.gradient,
            )}
          >
            <span className="pointer-events-none absolute -right-9 -top-9 h-36 w-36 rounded-full bg-white/15" />
            <span className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                <featured.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-outfit text-xl font-bold leading-tight">{featured.name}</span>
                <span className="block truncate text-[13px] text-white/85">{featured.description}</span>
              </span>
            </span>
            <span className="relative mt-4 flex items-center justify-between rounded-2xl bg-white/15 px-3 py-2.5 text-[13.5px]">
              <span className="truncate">
                {featured.meetings} · {featured.leader}
              </span>
              <span className="ml-3 shrink-0 rounded-full bg-white px-3 py-1 text-[13px] font-bold text-slate-900">Open</span>
            </span>
          </button>
        </>
      )}

      <SectionLabel className={featured ? undefined : "mt-1"}>{featured ? "Other teams" : "Teams"}</SectionLabel>
      <ListGroup>
        {others.map((team) => (
          <ListRow
            key={team.id}
            icon={team.icon}
            iconClassName={team.tile}
            title={team.name}
            subtitle={`${team.description} · ${membersLabel(team)}`}
            onClick={() => open(team)}
            trailing={
              <span className="shrink-0 rounded-full bg-blue-50 px-3.5 py-1.5 text-[13px] font-bold text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                {joined.has(team.name) ? "Open" : "Join"}
              </span>
            }
          />
        ))}
      </ListGroup>
    </div>
  );
};

export default DepartmentsDirectory;
