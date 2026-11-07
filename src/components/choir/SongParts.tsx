import { Loader2, Pause, Play, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clock, partLabels, type PartTime, type usePartPlayer } from '@/lib/songParts';

/** Compose a song → "Listen by part": a row per part of the recording, and Repeat part */
export const SongParts = ({
  parts,
  loading,
  player,
}: {
  parts: PartTime[] | null;
  loading: boolean;
  player: ReturnType<typeof usePartPlayer>;
}) => {
  if (!parts?.length) {
    return loading ? (
      <p className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground" data-testid="parts-loading">
        <Loader2 className="h-4 w-4 animate-spin" /> Finding where each part starts…
      </p>
    ) : null;
  }
  const labels = partLabels(parts);
  return (
    <div className="mt-4" data-testid="song-parts">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-foreground">Listen by part</h3>
        <button
          type="button"
          onClick={() => player.setLoop(!player.loop)}
          aria-pressed={player.loop}
          className={cn(
            'flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors',
            player.loop ? 'bg-blue-600 text-white' : 'bg-muted text-foreground',
          )}
        >
          <Repeat className="h-4 w-4" /> Repeat part
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800">
        {parts.map((p, i) => {
          const on = player.playing === i;
          const done = on ? Math.min(1, Math.max(0, (player.at - p.start) / (p.end - p.start))) : 0;
          return (
            <button
              key={`${p.name}-${p.start}`}
              type="button"
              onClick={() => player.play(i)}
              aria-label={`${on ? 'Pause' : 'Play'} ${labels[i]}`}
              className={cn('relative flex min-h-[52px] w-full items-center gap-3 border-b border-slate-100 px-3.5 text-left last:border-b-0 dark:border-slate-800', on ? 'bg-blue-50 dark:bg-blue-950/40' : 'active:bg-muted')}
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', on ? 'bg-blue-600 text-white' : 'bg-slate-100 text-foreground dark:bg-slate-800')}>
                {on ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold text-foreground">{labels[i]}</span>
              <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                {clock(p.start)} – {clock(p.end)}
              </span>
              {on && <span className="absolute bottom-0 left-0 h-[3px] bg-blue-600 transition-[width] duration-300" style={{ width: `${done * 100}%` }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
