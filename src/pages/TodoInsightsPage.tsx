import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Hourglass,
  Lightbulb,
  Lock,
  Sparkles,
  Sprout,
  Sunrise,
  Target,
  ThumbsUp,
  Timer,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Page, PageTitle, SectionLabel } from "@/components/page/PageKit";
import { TILE } from "@/data/appDirectory";
import { appAlert } from "@/lib/appAlert";
import { cn } from "@/lib/utils";
import { durationLabel } from "@/lib/todo/brain";
import { clearEvents, useTodoEvents } from "@/lib/todo/events";
import {
  computeInsights,
  PARTS,
  STUCK_LABELS,
  type Part,
  type Rate,
  type Verdict,
} from "@/lib/todo/insights";
import { useTodos } from "@/lib/todo/store";

const PART_NAMES: Record<Part, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Late at night",
};
const PART_HOURS: Record<Part, string> = {
  morning: "5am–noon",
  afternoon: "noon–5pm",
  evening: "5pm–10pm",
  night: "10pm–5am",
};
const LATER_NAMES = {
  tomorrow: "Tomorrow morning",
  afternoon: "Afternoon",
  tonight: "This evening",
} as const;

const VERDICT: Record<
  Verdict,
  { icon: LucideIcon; card: string; badge: string }
> = {
  early: {
    icon: Sprout,
    card: "bg-slate-50 dark:bg-slate-900/60",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  great: {
    icon: ThumbsUp,
    card: "bg-emerald-50 dark:bg-emerald-950/40",
    badge: "bg-emerald-600 text-white",
  },
  good: {
    icon: TrendingUp,
    card: "bg-blue-50 dark:bg-blue-950/40",
    badge: "bg-blue-600 text-white",
  },
  building: {
    icon: Lightbulb,
    card: "bg-amber-50 dark:bg-amber-950/30",
    badge: "bg-amber-500 text-white",
  },
};

const ofLine = (r: Rate) => (r.of ? `${r.kept} of ${r.of}` : "–");
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
const weekName = (i: number, from: Date) =>
  i === 3
    ? "This week"
    : i === 2
      ? "Last week"
      : `From ${from.toLocaleDateString([], { day: "numeric", month: "short" })}`;

/** A headline number: what it is, the number, one line of context */
const Tile = ({
  icon: Icon,
  label,
  value,
  sub,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  testId: string;
}) => (
  <div
    className="rounded-[20px] border border-slate-200/70 bg-card px-3.5 py-3 shadow-sm dark:border-slate-800"
    data-testid={testId}
  >
    <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />{" "}
      {label}
    </p>
    <p className="mt-1.5 font-outfit text-[24px] font-bold leading-none text-foreground">
      {value}
    </p>
    <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
      {sub}
    </p>
  </div>
);

/** One ratio against the whole: the track is a lighter step of the same blue */
const Meter = ({
  name,
  sub,
  share,
  figure,
  strong,
}: {
  name: string;
  sub?: string;
  share: number;
  figure: string;
  strong?: boolean;
}) => (
  <div className="px-4 py-2.5">
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 text-[14.5px] text-foreground">
        <span className={cn(strong && "font-semibold")}>{name}</span>
        {sub && (
          <span className="text-[12.5px] text-muted-foreground"> · {sub}</span>
        )}
      </span>
      <span className="shrink-0 text-[14px] font-semibold text-foreground">
        {figure}
      </span>
    </div>
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950/70">
      <div
        className="h-full rounded-full bg-blue-600 dark:bg-blue-400"
        style={{
          width: `${Math.max(share > 0 ? 3 : 0, Math.min(100, share * 100))}%`,
        }}
      />
    </div>
  </div>
);

const Card = ({
  children,
  className,
  testId,
}: {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) => (
  <div
    className={cn(
      "overflow-hidden rounded-[20px] border border-slate-200/70 bg-card shadow-sm dark:border-slate-800",
      className,
    )}
    data-testid={testId}
  >
    {children}
  </div>
);

/**
 * To do → "Is it working?": what really happened with your tasks over the last 4 weeks,
 * honestly (lib/todo/insights.ts): planned starts kept, deadlines met, focus, what gets
 * in the way, your best time of day and your real pace, with tips picked from those.
 * Worked out on the phone from your own history; nobody else can see it.
 */
const TodoInsightsPage = () => {
  const navigate = useNavigate();
  const { userId, todos } = useTodos();
  const events = useTodoEvents();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const r = useMemo(
    () => computeInsights(todos, events, now),
    [todos, events, now],
  );
  const [week, setWeek] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const v = VERDICT[r.verdict];
  const maxDone = Math.max(1, ...r.weeks.map((w) => w.done));
  const shownWeek = week ?? 3;
  const wk = r.weeks[shownWeek];
  const partsWithPlans = PARTS.filter((p) => r.byPart[p].of > 0);
  const stuckTop = Math.max(1, ...r.stuck.map((s) => s.count));
  const hasHistory = events.length > 0;

  const clear = async () => {
    setConfirmClear(false);
    if (await clearEvents(userId))
      appAlert(
        "History cleared",
        "Your tasks are untouched. The app starts learning afresh.",
        "success",
      );
    else
      appAlert(
        "Couldn’t clear it",
        "Check the connection and try again.",
        "error",
      );
  };

  return (
    <Page>
      <PageTitle
        icon={Target}
        tint={TILE.green}
        title="Is it working?"
        subtitle="What really happened, the last 4 weeks."
        back={{ label: "To do", onClick: () => navigate("/todo") }}
      />

      {/* The verdict */}
      <section
        className={cn("rounded-[24px] px-5 py-4", v.card)}
        data-testid="insights-verdict"
        data-verdict={r.verdict}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              v.badge,
            )}
          >
            <v.icon className="h-[18px] w-[18px]" />
          </span>
          <h2 className="font-outfit text-[21px] font-bold leading-tight text-foreground">
            {r.headline}
          </h2>
        </div>
        <p className="mt-2 text-[15px] leading-snug text-foreground/85">
          {r.summary}
        </p>
      </section>

      {/* The numbers */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Tile
          icon={Clock}
          label="Planned starts kept"
          value={ofLine(r.plans)}
          sub={
            r.plans.of
              ? [
                  r.plans.late && `${r.plans.late} late`,
                  r.plans.missed && `${r.plans.missed} missed`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Every one 🎉"
              : "Give a task a start time"
          }
          testId="tile-plans"
        />
        <Tile
          icon={Target}
          label="Deadlines met"
          value={
            r.deadlines.of ? `${r.deadlines.onTime} of ${r.deadlines.of}` : "–"
          }
          sub={
            r.deadlines.of
              ? [
                  r.deadlines.late && `${r.deadlines.late} late`,
                  r.deadlines.overdue && `${r.deadlines.overdue} overdue`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "All on time 🎉"
              : "None due yet"
          }
          testId="tile-deadlines"
        />
        <Tile
          icon={Timer}
          label="Focused"
          value={r.focus.minutes ? durationLabel(r.focus.minutes) : "–"}
          sub={
            r.focus.sessions
              ? plural(r.focus.sessions, "session")
              : "Start the timer on a task"
          }
          testId="tile-focus"
        />
        <Tile
          icon={Sparkles}
          label="2-minute starts"
          value={
            r.focus.twoMin.of
              ? `${r.focus.twoMin.kept} of ${r.focus.twoMin.of}`
              : "–"
          }
          sub={
            r.focus.twoMin.of
              ? "kept going (or got it done)"
              : "Starting is the hard part"
          }
          testId="tile-two-min"
        />
      </div>

      {/* Week by week: one series, tap a week to read it */}
      <SectionLabel>Finished each week</SectionLabel>
      {r.weeks.every((w) => !w.done) ? (
        <Card
          className="px-4 py-3.5 text-[14px] leading-snug text-muted-foreground"
          testId="insights-weeks"
        >
          Nothing finished in the last 4 weeks yet. Tick tasks done and each
          week’s count shows here.
        </Card>
      ) : (
        <Card className="px-4 pb-3 pt-3" testId="insights-weeks">
          <p className="text-[14px] text-foreground" aria-live="polite">
            <span className="font-semibold">
              {weekName(shownWeek, wk.from)}
            </span>
            <span className="text-muted-foreground">
              {" · "}
              {plural(wk.done, "task")} finished
              {wk.plans.of
                ? ` · ${wk.plans.kept} of ${wk.plans.of} planned starts kept`
                : ""}
            </span>
          </p>
          <div
            className="mt-3 flex h-28 items-end gap-[2px] border-b border-border"
            role="group"
            aria-label="Tasks finished each week"
          >
            {r.weeks.map((w, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setWeek(i === week ? null : i)}
                aria-label={`${weekName(i, w.from)}: ${plural(w.done, "task")} finished${w.plans.of ? `, ${w.plans.kept} of ${w.plans.of} planned starts kept` : ""}`}
                aria-pressed={i === shownWeek}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              >
                <span className="mb-1 text-[12px] font-semibold text-foreground">
                  {w.done || ""}
                </span>
                <span
                  className={cn(
                    "block w-full max-w-[24px] rounded-t-[4px] transition-colors",
                    i === shownWeek
                      ? "bg-blue-600 dark:bg-blue-400"
                      : "bg-blue-500/45 dark:bg-blue-400/40",
                  )}
                  style={{
                    height: `${w.done ? Math.max(4, (72 * w.done) / maxDone) : 0}%`,
                  }}
                />
              </button>
            ))}
          </div>
          <div className="mt-1 flex gap-[2px] text-[11px] text-muted-foreground">
            {r.weeks.map((w, i) => (
              <span key={i} className="min-w-0 flex-1 truncate text-center">
                {i === 3
                  ? "This week"
                  : w.from.toLocaleDateString([], {
                      day: "numeric",
                      month: "short",
                    })}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Best time of day */}
      <SectionLabel>Your best time of day</SectionLabel>
      <Card testId="insights-best">
        {partsWithPlans.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {partsWithPlans.map((p) => (
              <Meter
                key={p}
                name={PART_NAMES[p]}
                sub={PART_HOURS[p]}
                share={r.byPart[p].rate ?? 0}
                figure={`${ofLine(r.byPart[p])} kept`}
                strong={r.best?.part === p}
              />
            ))}
          </div>
        ) : null}
        <p
          className={cn(
            "px-4 py-3 text-[14px] leading-snug text-muted-foreground",
            partsWithPlans.length &&
              "border-t border-slate-100 dark:border-slate-800",
          )}
        >
          {r.best ? (
            <>
              <Sunrise className="mr-1 inline h-4 w-4 align-[-3px] text-blue-600 dark:text-blue-400" />
              {r.best.from === "plans"
                ? "Your plans happen most in the "
                : "You focus most in the "}
              <span className="font-semibold text-foreground">
                {PART_NAMES[r.best.part].toLowerCase()}
              </span>
              .
              {r.bestLater
                ? ` “Not now” now points out ${LATER_NAMES[r.bestLater].toLowerCase()}.`
                : ""}
            </>
          ) : partsWithPlans.length ? (
            "Not clear yet: 3 or more planned starts in a part of the day show which works best."
          ) : (
            "Give tasks a start time (or tap “Not now” and pick one) and this shows when your plans really happen."
          )}
        </p>
      </Card>

      {/* What gets in the way */}
      <SectionLabel>What gets in the way</SectionLabel>
      <Card testId="insights-stuck">
        {r.stuck.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {r.stuck.map((s) => (
              <Meter
                key={s.reason}
                name={STUCK_LABELS[s.reason]}
                share={s.count / stuckTop}
                figure={plural(s.count, "time")}
              />
            ))}
          </div>
        ) : null}
        <p
          className={cn(
            "px-4 py-3 text-[14px] leading-snug text-muted-foreground",
            r.stuck.length && "border-t border-slate-100 dark:border-slate-800",
          )}
        >
          {r.snoozes
            ? `Put off ${plural(r.snoozes, "time")} with “Not now”.`
            : "Nothing put off. "}
          {r.putOff ? (
            <>
              {" "}
              Most:{" "}
              <span className="font-semibold text-foreground">
                “{r.putOff.title}”
              </span>{" "}
              ({plural(r.putOff.snoozes, "time")}).
            </>
          ) : null}
          {!r.stuck.length &&
            " When you tap “Not now” twice, the app asks what’s stopping you; your answers show here."}
        </p>
      </Card>

      {/* Pace */}
      <SectionLabel>How long things take you</SectionLabel>
      <Card className="flex gap-3 px-4 py-3.5" testId="insights-pace">
        <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <p className="text-[14.5px] leading-snug text-foreground">
          {r.pace.ratio ? (
            <>
              About{" "}
              <span className="font-semibold">{r.pace.ratio.toFixed(1)}×</span>{" "}
              your guess, from {plural(r.pace.samples, "task")} you finished in
              focus.{" "}
              <span className="text-muted-foreground">
                Start-by dates now use your own pace (×
                {r.pace.buffer!.toFixed(1)}) instead of the usual 1.5.
              </span>
            </>
          ) : (
            <>
              Still learning.{" "}
              <span className="text-muted-foreground">
                Give tasks a time guess (“~45m”) and finish them in the focus
                screen: after 3, start-by dates use your real pace. So far:{" "}
                {r.pace.samples}.
              </span>
            </>
          )}
        </p>
      </Card>

      {/* Tips */}
      {r.tips.length > 0 && (
        <>
          <SectionLabel>Tips for you</SectionLabel>
          <div className="space-y-2.5" data-testid="insights-tips">
            {r.tips.map((t) => (
              <Card key={t.id} className="px-4 py-3.5" testId={`tip-${t.id}`}>
                <p className="flex items-start gap-2 text-[15.5px] font-semibold leading-snug text-foreground">
                  <Lightbulb className="mt-0.5 h-[18px] w-[18px] shrink-0 text-amber-500" />
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {t.title}
                  </span>
                </p>
                <p className="mt-1 text-[14px] leading-snug text-muted-foreground">
                  {t.body}
                </p>
                {t.action && (
                  <button
                    onClick={() => navigate(t.action!.to)}
                    className="mt-2.5 inline-flex h-10 max-w-full items-center rounded-full bg-blue-600 px-4 text-[14px] font-semibold text-white transition active:scale-95"
                  >
                    <span className="truncate">{t.action.label}</span>
                  </button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Private */}
      <div className="mt-6 flex gap-2.5 rounded-[20px] bg-muted/60 px-4 py-3.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 text-[13px] leading-snug text-muted-foreground">
          Only you can see this. It’s worked out on your phone from what you do
          in To do, and kept with your account so your other phones learn too.
          {hasHistory &&
            (confirmClear ? (
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">
                  Clear your history? Your tasks stay.
                </span>
                <button
                  onClick={clear}
                  className="h-8 rounded-full bg-red-600 px-3 text-[13px] font-semibold text-white"
                  data-testid="clear-history-yes"
                >
                  Clear
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="h-8 rounded-full bg-card px-3 text-[13px] font-semibold text-foreground"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="mt-1.5 block font-semibold text-blue-600 dark:text-blue-400"
                data-testid="clear-history"
              >
                Clear my history
              </button>
            ))}
        </div>
      </div>
    </Page>
  );
};

export default TodoInsightsPage;
