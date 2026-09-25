import { useNavigate } from "react-router-dom";
import { ChevronRight, Globe, Mic2, Music, Star, Users } from "lucide-react";
import { ListGroup, ListRow, Page, PageHeader, SectionLabel } from "@/components/page/PageKit";

const BRANCHES = [
  { id: "galway", name: "Galway Choir", icon: Star, tile: "bg-blue-600 text-white" },
  { id: "kildare", name: "Kildare Choir", icon: Music, tile: "bg-amber-500 text-white" },
  { id: "athlone", name: "Athlone Choir", icon: Mic2, tile: "bg-emerald-500 text-white" },
  { id: "dublin", name: "Dublin Choir", icon: Users, tile: "bg-rose-500 text-white" },
];

const LAST_KEY = "choir_last_location";

const readLast = () => {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
};

const ChoirPortalPage = () => {
  const navigate = useNavigate();
  const last = BRANCHES.find((b) => b.id === readLast());

  const open = (id: string) => {
    try {
      localStorage.setItem(LAST_KEY, id);
    } catch {
      /* private mode */
    }
    navigate(`/groups/choir/${id}`);
  };

  return (
    <Page>
      <PageHeader title="Choir" back={{ label: "Ministry Hub", onClick: () => navigate("/groups") }} />

      {last && (
        <>
          <SectionLabel className="mt-1">Jump back in</SectionLabel>
          <button
            onClick={() => open(last.id)}
            className="relative mb-1 flex w-full items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 p-4 text-left text-white shadow-lg shadow-blue-900/20 transition active:scale-[0.99]"
          >
            <span className="pointer-events-none absolute -right-9 -top-9 h-36 w-36 rounded-full bg-white/15" />
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <last.icon className="h-6 w-6" />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block font-outfit text-xl font-bold">{last.name}</span>
              <span className="block text-[13px] text-white/85">Setlists, songs and rehearsals</span>
            </span>
            <span className="relative rounded-full bg-white px-3.5 py-1.5 text-[13px] font-bold text-blue-700">Open</span>
          </button>
        </>
      )}

      <SectionLabel className={last ? undefined : "mt-1"}>National</SectionLabel>
      <button
        onClick={() => open("national")}
        className="relative flex w-full items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-blue-900 to-blue-700 p-4 text-left text-white shadow-lg shadow-blue-900/20 transition active:scale-[0.99]"
      >
        <span className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Globe className="h-6 w-6 text-blue-200" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-200">Official portal</span>
          <span className="block font-outfit text-xl font-bold">TPH National Choir</span>
        </span>
        <ChevronRight className="relative h-5 w-5 text-white/70" />
      </button>

      <SectionLabel>Branches</SectionLabel>
      <ListGroup>
        {BRANCHES.map((b) => (
          <ListRow
            key={b.id}
            icon={b.icon}
            iconClassName={b.tile}
            title={b.name}
            subtitle="Setlists, songs and rehearsals"
            onClick={() => open(b.id)}
          />
        ))}
      </ListGroup>
    </Page>
  );
};

export default ChoirPortalPage;
