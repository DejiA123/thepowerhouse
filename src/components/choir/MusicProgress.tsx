import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * The live progress while a song's music is made: a moving bar with the percentage, what
 * the studio is doing now, the time so far and about how long is left. It's an honest
 * estimate from real timings on the church's music server (Nov 2026): about 2½ minutes
 * when it's awake, about 5 when the first song wakes it (no task yet). The bar never
 * reaches 100% until the song is really there.
 */
const AWAKE_S = 170;
const WAKING_S = 330;

const STAGES: { from: number; text: string }[] = [
  { from: 0, text: 'Sending your song to the studio' },
  { from: 0.06, text: 'Reading the words and planning the arrangement' },
  { from: 0.22, text: 'Laying down the drums and bass' },
  { from: 0.4, text: 'Adding the keys, organ and band' },
  { from: 0.58, text: 'Recording the lead voice' },
  { from: 0.72, text: 'Bringing in the choir' },
  { from: 0.86, text: 'Mixing and mastering' },
  { from: 0.95, text: 'Almost there' },
];

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** How far along it is (0–0.97): steady up to the expected time, then slowing so it never stops moving */
function musicProgress(elapsedS: number, expectedS: number) {
  const steady = 0.9 * Math.min(1, elapsedS / expectedS);
  const over = Math.max(0, elapsedS - expectedS);
  return Math.min(0.97, steady + 0.07 * (1 - Math.exp(-over / 90)));
}

const MusicProgress = ({ startedAt, taskAt, server }: { startedAt: string | null; taskAt: string | null; server: boolean }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  const started = startedAt ? Date.parse(startedAt) : now;
  const elapsed = Math.max(0, (now - started) / 1000);
  // On the music server: the song is handed over at once when it's awake; when the server
  // was asleep, the wait for it to take the song is added to the usual time. Other music
  // services answer within the function's time (about a minute).
  const handedOver = taskAt ? Math.max(0, (Date.parse(taskAt) - started) / 1000) : null;
  const waking = server && (handedOver === null ? elapsed > 12 : handedOver > 12);
  const expected = !server ? 70 : handedOver !== null ? (handedOver > 12 ? handedOver : 0) + AWAKE_S : waking ? WAKING_S : AWAKE_S;
  const p = musicProgress(elapsed, expected);
  const stage = waking && handedOver === null
    ? 'Waking up the music studio (the first song of the day takes a little longer)'
    : [...STAGES].reverse().find((s) => p >= s.from)!.text;
  const left = Math.max(0, expected - elapsed);
  const leftText = left > 90 ? `About ${Math.round(left / 60)} minutes left` : left > 40 ? 'About a minute left' : left > 0 ? 'Less than a minute left' : 'Finishing off, nearly done';

  return (
    <div data-testid="music-progress" aria-live="polite">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="music-eq flex h-5 shrink-0 items-end gap-[3px]" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="w-[3px] rounded-full bg-gradient-to-t from-indigo-600 to-purple-500" style={{ animationDelay: `${i * 0.13}s` }} />
            ))}
          </span>
          <p className="text-[15px] font-semibold text-foreground">Making the music…</p>
        </div>
        <span className="font-outfit text-[22px] font-bold tabular-nums leading-none text-indigo-600 dark:text-indigo-300">{Math.floor(p * 100)}%</span>
      </div>

      <div
        className="relative mt-3 h-3 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950/60"
        role="progressbar"
        aria-label="Making the music"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(p * 100)}
      >
        <div className="music-bar relative h-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-500 transition-[width] duration-500 ease-linear" style={{ width: `${Math.max(3, p * 100)}%` }} />
      </div>

      <p key={stage} className="music-stage mt-2.5 text-[14px] font-medium leading-snug text-foreground">{stage}…</p>
      <div className="mt-1 flex items-center justify-between text-[12.5px] tabular-nums text-muted-foreground">
        <span>{clock(elapsed)} so far</span>
        <span>{leftText}</span>
      </div>
      <p className={cn('mt-3 text-[12.5px] leading-snug text-muted-foreground')}>
        Voices, choir and band. You can leave this page; the song keeps being made and will be here when you come back.
      </p>
    </div>
  );
};

export default MusicProgress;
