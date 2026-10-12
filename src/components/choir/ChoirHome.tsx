import { ArrowLeftRight, Clock, GraduationCap, Guitar, ListMusic, Mic, Music2, PenTool, UsersRound, Wallet } from "lucide-react";
import { PictureTile } from "@/components/page/PageKit";
import { TILE } from "@/data/appDirectory";

export type ChoirSection = "songs" | "band" | "singing" | "instruments" | "basics" | "lessons";

/**
 * The choir's front door: one big picture for each thing people come here
 * for, so nobody has to know where "Academy" or "Instrumentalists" were.
 */
const ChoirHome = ({
  locationId,
  onOpen,
  onRehearsals,
  onTeam,
  onSongwriting,
  onContributions,
  onSwitch,
}: {
  locationId?: string;
  onOpen: (section: ChoirSection) => void;
  onRehearsals: () => void;
  onTeam: () => void;
  onSongwriting: () => void;
  onContributions: () => void;
  /** Go to the list of every choir (National and the branches) */
  onSwitch: () => void;
}) => (
  <div className="mx-auto max-w-4xl">
    <h2 className="mb-3 px-1 font-outfit text-[22px] font-bold tracking-tight text-foreground">What do you need?</h2>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <PictureTile icon={ListMusic} tint={TILE.indigo} title="Songs" subtitle="Setlists, lyrics and the song library" onClick={() => onOpen("songs")} />
      <PictureTile icon={Clock} tint={TILE.orange} title="Rehearsals" subtitle="Times and schedule" onClick={onRehearsals} />
      <PictureTile icon={Mic} tint={TILE.blue} title="Singing lessons" subtitle="For men's and women's voices" onClick={() => onOpen("singing")} />
      <PictureTile icon={Guitar} tint={TILE.violet} title="Band" subtitle="Tracks and charts for players" onClick={() => onOpen("band")} />
      <PictureTile icon={Music2} tint={TILE.sky} title="Instrument lessons" subtitle="Piano, drums, guitar, bass, sax" onClick={() => onOpen("instruments")} />
      <PictureTile icon={GraduationCap} tint={TILE.teal} title="Music basics" subtitle="Notes, chords and rhythm" onClick={() => onOpen("basics")} />
      <PictureTile icon={UsersRound} tint={TILE.green} title="Team" subtitle="Who's in the choir" onClick={onTeam} />
      {locationId === "galway" && (
        <PictureTile icon={PenTool} tint={TILE.pink} title="Songwriting" subtitle="Write songs together" onClick={onSongwriting} />
      )}
      {locationId === "national" && (
        <PictureTile icon={Wallet} tint={TILE.amber} title="Contributions" subtitle="Monthly contributions" onClick={onContributions} />
      )}
    </div>
    <button
      onClick={() => onOpen("lessons")}
      className="mt-4 w-full rounded-[18px] border border-dashed border-slate-300 py-3.5 text-[15px] font-semibold text-blue-600 dark:border-slate-700 dark:text-blue-400"
    >
      See every choir lesson
    </button>
    <button
      onClick={onSwitch}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] bg-slate-100 py-3.5 text-[15px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
    >
      <ArrowLeftRight className="h-5 w-5" /> Switch to another choir
    </button>
  </div>
);

export default ChoirHome;
