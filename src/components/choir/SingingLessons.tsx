import { ChevronRight, Mic, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { TILE } from "@/data/appDirectory";

interface Module {
  title: string;
  description?: string;
}

/**
 * Singing lessons in two simple steps: pick your voice (opens the exercises
 * for men or women), then work through the basics one lesson at a time.
 */
const SingingLessons = ({
  modules,
  onVoice,
  onModule,
  onHarmony,
}: {
  modules: Module[];
  onVoice: (voice: "male" | "female") => void;
  onModule: (index: number) => void;
  onHarmony: () => void;
}) => (
  <div className="mx-auto max-w-3xl">
    <div className="flex items-center gap-3">
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm", TILE.blue)}>
        <Mic className="h-6 w-6" />
      </span>
      <h2 className="font-outfit text-[28px] font-extrabold tracking-tight text-foreground">Singing lessons</h2>
    </div>

    <p className="mb-3 mt-5 px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Step 1 · Pick your voice</p>
    <div className="grid grid-cols-2 gap-3">
      {(
        [
          { voice: "male", title: "Men's voice", subtitle: "Exercises for men", tint: TILE.blue },
          { voice: "female", title: "Women's voice", subtitle: "Exercises for women", tint: TILE.pink },
        ] as const
      ).map((v) => (
        <button
          key={v.voice}
          onClick={() => onVoice(v.voice)}
          className={cn(
            "relative flex min-h-[168px] flex-col justify-between overflow-hidden rounded-[24px] p-4 text-left text-white shadow-lg transition active:scale-[0.97]",
            v.tint,
          )}
        >
          <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15" />
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <UserRound className="h-8 w-8" />
          </span>
          <span>
            <span className="block font-outfit text-[21px] font-bold leading-tight">{v.title}</span>
            <span className="block text-[13.5px] text-white/90">{v.subtitle}</span>
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-white/25 px-2.5 py-1 text-[12px] font-bold">Tap</span>
        </button>
      ))}
    </div>

    <p className="mb-3 mt-7 px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Step 2 · Learn the basics</p>
    <div className="divide-y divide-slate-100 overflow-hidden rounded-[22px] border border-slate-200/70 bg-card shadow-sm dark:divide-slate-800 dark:border-slate-800">
      {modules.map((m, i) => (
        <button key={m.title} onClick={() => onModule(i)} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/60">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[15px] font-bold text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-foreground">{m.title}</span>
            {m.description && <span className="line-clamp-1 block text-[13px] text-muted-foreground">{m.description}</span>}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
        </button>
      ))}
    </div>

    <p className="mb-3 mt-7 px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Step 3 · Sing together</p>
    <button
      onClick={onHarmony}
      className="flex w-full items-center gap-3.5 rounded-[22px] border border-slate-200/70 bg-card p-4 text-left shadow-sm transition active:scale-[0.99] dark:border-slate-800"
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-white", TILE.violet)}>
        <Users className="h-[22px] w-[22px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">Harmony and blending</span>
        <span className="block text-[13px] text-muted-foreground">Singing parts together as one choir</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
    </button>
  </div>
);

export default SingingLessons;
