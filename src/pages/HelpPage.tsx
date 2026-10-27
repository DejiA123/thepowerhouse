import { useNavigate } from "react-router-dom";
import { CircleHelp, Home, Search, Sparkles, Undo2 } from "lucide-react";
import { ListGroup, Page, PageTitle, SectionLabel } from "@/components/page/PageKit";
import { PlaceRow } from "@/components/nav/Places";
import { HOW_DO_I, TILE, destination } from "@/data/appDirectory";
import { openSearch, startTour } from "@/lib/appEvents";
import { cn } from "@/lib/utils";
import { hasFeature } from "@/config/church";

const TIPS = [
  { icon: Home, text: "Lost? Tap Home at the bottom of the screen to start again." },
  { icon: Undo2, text: "The Back button at the top of a page takes you to where you were." },
  { icon: Search, text: `Search finds anything, even inside pages. Try “${hasFeature("choir") ? "choir lessons" : "Psalm 23"}”.` },
];

/** Help: the tour, common questions (each one takes you there) and a few tips. */
const HelpPage = () => {
  const navigate = useNavigate();

  return (
    <Page>
      <PageTitle
        icon={CircleHelp}
        tint={TILE.blue}
        title="Help"
        subtitle="Tap a question and we'll take you there"
        back={{ label: "Back", onClick: () => (window.history.length > 1 ? navigate(-1) : navigate("/")) }}
      />

      {/* The tour */}
      <button
        onClick={startTour}
        className="flex w-full items-center gap-4 rounded-[22px] bg-gradient-to-br from-violet-600 to-indigo-600 p-4 text-left text-white shadow-lg shadow-indigo-600/25 transition active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <Sparkles className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-outfit text-[19px] font-bold">Show me around</span>
          <span className="block text-[14px] text-white/85">A 1-minute tour of the app</span>
        </span>
        <span className="shrink-0 rounded-full bg-white px-4 py-2 text-[15px] font-bold text-indigo-600">Start</span>
      </button>

      <SectionLabel>How do I…</SectionLabel>
      <ListGroup>
        {HOW_DO_I.map((q) => (
          <PlaceRow key={q.question} id={q.to} title={q.question} subtitle={destination(q.to)?.crumb} />
        ))}
      </ListGroup>

      <SectionLabel>Good to know</SectionLabel>
      <div className="space-y-2">
        {TIPS.map((tip) => (
          <div key={tip.text} className="flex items-center gap-3 rounded-[18px] bg-blue-50/70 px-4 py-3 text-[15px] text-slate-700 dark:bg-blue-950/30 dark:text-slate-200">
            <tip.icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            {tip.text}
          </div>
        ))}
      </div>

      <button
        onClick={() => openSearch()}
        className={cn("mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold text-white shadow-md shadow-blue-600/25", TILE.blue)}
      >
        <Search className="h-5 w-5" /> Still can't find it? Search
      </button>
    </Page>
  );
};

export default HelpPage;
