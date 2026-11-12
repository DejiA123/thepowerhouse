import { useEffect, useState } from 'react';

/**
 * A live progress card (Compose a song: writing the song, making the music): a moving bar
 * with the percentage, what's happening now, the time so far and about how long is left.
 * An honest estimate from measured timings (`expectedS`): steady up to the expected time,
 * then slowing so it never stops moving, and never 100% until `done`.
 */
export interface Stage { from: number; text: string }

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Never still: steady to 88% at the expected time, then it keeps creeping towards 99%
 * for as long as it takes (a bar parked at 96% made people think it was stuck).
 */
function progressAt(elapsedS: number, expectedS: number) {
  const steady = 0.88 * Math.min(1, elapsedS / expectedS);
  const over = Math.max(0, elapsedS - expectedS);
  return Math.min(0.995, steady + 0.11 * (over / (over + expectedS * 1.5)));
}

/** Past the usual time: say so plainly, with a line that changes every few seconds */
const OVERTIME = ['Taking longer than usual, still working', 'Still going, please keep this page open', 'Nearly there, thank you for waiting'];

function leftText(leftS: number) {
  if (leftS > 90) return `About ${Math.round(leftS / 60)} minutes left`;
  if (leftS > 40) return 'About a minute left';
  if (leftS > 6) return `About ${Math.max(5, Math.round(leftS / 5) * 5)} seconds left`;
  if (leftS > 0) return 'A few seconds left';
  if (leftS < -12) return OVERTIME[Math.floor(-leftS / 8) % OVERTIME.length];
  return 'Finishing off, nearly done';
}

interface Props {
  title: string;
  /** When it started (ms) */
  startedAt: number;
  expectedS: number;
  stages: Stage[];
  /** Shown instead of the stage while true (e.g. the music server waking up) */
  stageOverride?: string | null;
  done?: boolean;
  note?: string;
  testId?: string;
  className?: string;
}

const LiveProgress = ({ title, startedAt, expectedS, stages, stageOverride, done, note, testId, className }: Props) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (done) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [done]);
  const elapsed = Math.max(0, (now - startedAt) / 1000);
  const p = done ? 1 : progressAt(elapsed, expectedS);
  const stage = done ? 'Done' : stageOverride || [...stages].reverse().find((s) => p >= s.from)?.text || stages[0]?.text;
  // Past the expected time the number shows tenths, so it's seen to keep moving
  const overtime = !done && elapsed > expectedS;
  const pct = overtime ? (Math.floor(p * 1000) / 10).toFixed(1) : Math.floor(p * 100);

  return (
    <div className={className} data-testid={testId} aria-live="polite">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="music-eq flex h-5 shrink-0 items-end gap-[3px]" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="w-[3px] rounded-full bg-gradient-to-t from-indigo-600 to-purple-500" style={{ animationDelay: `${i * 0.13}s` }} />
            ))}
          </span>
          <p className="truncate text-[15px] font-semibold text-foreground">{title}</p>
        </div>
        <span className="font-outfit text-[22px] font-bold tabular-nums leading-none text-indigo-600 dark:text-indigo-300">{pct}%</span>
      </div>

      <div
        className="relative mt-3 h-3 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950/60"
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(p * 100)}
      >
        <div
          className="music-bar relative h-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-500 transition-[width] duration-300 ease-linear"
          style={{ width: `${Math.max(3, p * 100)}%` }}
        />
      </div>

      <p key={stage} className="music-stage mt-2.5 text-[14px] font-medium leading-snug text-foreground">{done ? 'Done!' : `${stage}…`}</p>
      <div className="mt-1 flex items-center justify-between text-[12.5px] tabular-nums text-muted-foreground">
        <span>{clock(elapsed)} so far</span>
        <span>{done ? '' : leftText(expectedS - elapsed)}</span>
      </div>
      {note && <p className="mt-3 text-[12.5px] leading-snug text-muted-foreground">{note}</p>}
    </div>
  );
};

export default LiveProgress;
