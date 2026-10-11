import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardList, DoorOpen, HeartHandshake, Megaphone, Music, type LucideIcon } from "lucide-react";
import { PictureTile, SectionLabel } from "@/components/page/PageKit";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TILE, choirPath, rememberedChoir, type TileColor } from "@/data/appDirectory";

export interface MinistryTeam {
  id: string;
  name: string;
  icon: LucideIcon;
  /** One line saying what the team does */
  description: string;
  route: string | (() => string);
  color: TileColor;
}

export const MINISTRY_TEAMS: MinistryTeam[] = [
  { id: "choir", name: "Choir", icon: Music, description: "Songs, rehearsals and lessons", route: () => choirPath(), color: "blue" },
  { id: "ushering", name: "Ushering", icon: DoorOpen, description: "Welcome and help people", route: "/groups/ushering", color: "orange" },
  { id: "evangelism", name: "Evangelism", icon: Megaphone, description: "Share the good news", route: "/groups/evangelism", color: "red" },
  { id: "pastoral", name: "Pastoral Care", icon: HeartHandshake, description: "Care for one another", route: "/groups/pastoral", color: "pink" },
  { id: "management", name: "Management Team", icon: ClipboardList, description: "Planning and coordination", route: "/groups/management", color: "slate" },
];

const BRANCH_NAMES: Record<string, string> = {
  galway: "Galway",
  kildare: "Kildare",
  athlone: "Athlone",
  dublin: "Dublin",
  national: "National",
};

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

const routeOf = (t: MinistryTeam) => (typeof t.route === "function" ? t.route() : t.route);

/** Your team first (the one you belong to, or opened last), then every team as a big picture. */
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
    navigate(routeOf(team));
  };

  const mine = MINISTRY_TEAMS.filter((t) => joined.has(t.name));
  const featured = mine[0] ?? MINISTRY_TEAMS.find((t) => t.id === recent[0]);
  const branch = featured?.id === "choir" ? BRANCH_NAMES[rememberedChoir() ?? ""] : undefined;

  return (
    <div>
      {featured && (
        <button
          onClick={() => open(featured)}
          className="relative block w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 p-5 text-left text-white shadow-lg shadow-blue-900/20 transition active:scale-[0.99]"
        >
          <span className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10" />
          <span className="relative block text-[12.5px] font-bold uppercase tracking-[0.08em] text-white/85">
            {mine.length ? "Your team" : "Carry on"}
          </span>
          <span className="relative mt-1 flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <featured.icon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block font-outfit text-[24px] font-bold leading-tight">
                {featured.name}
                {branch && ` · ${branch}`}
              </span>
              <span className="block text-[14.5px] text-white/90">{featured.description}</span>
            </span>
          </span>
          <span className="relative mt-4 inline-flex h-11 items-center gap-1 rounded-full bg-white px-5 text-[15px] font-bold text-blue-700">
            Open my team <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      )}

      <SectionLabel className={featured ? undefined : "mt-1"}>All teams</SectionLabel>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {MINISTRY_TEAMS.map((team) => (
          <PictureTile
            key={team.id}
            icon={team.icon}
            tint={TILE[team.color]}
            title={team.name}
            subtitle={memberCounts[team.name] ? `${team.description} · ${memberCounts[team.name]} people` : team.description}
            onClick={() => open(team)}
            badge={
              joined.has(team.name) ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Yours</span>
              ) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

export default DepartmentsDirectory;
