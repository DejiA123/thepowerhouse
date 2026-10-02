import { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { BACKGROUND_MUSIC_EVENT, MUSIC_CREDIT, WORSHIP_TRACKS, backgroundMusic } from '@/services/backgroundMusic';

/** Current background-music settings, kept in step with changes made anywhere. */
export function useWorshipMusic() {
  const [settings, setSettings] = useState(() => backgroundMusic.get());
  useEffect(() => {
    const update = () => setSettings({ ...backgroundMusic.get() });
    window.addEventListener(BACKGROUND_MUSIC_EVENT, update);
    return () => window.removeEventListener(BACKGROUND_MUSIC_EVENT, update);
  }, []);
  return settings;
}

/** "Piano worship in the background" with its track and volume, for Bible settings. */
const WorshipMusicSettings = () => {
  const music = useWorshipMusic();

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <span className="block font-medium text-slate-800 dark:text-slate-200">Piano worship in the background</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">Hymns and soft piano under the audio Bible</span>
          </div>
        </div>
        <Switch
          id="worship-music"
          checked={music.enabled}
          onCheckedChange={(enabled) => backgroundMusic.update({ enabled })}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {music.enabled && (
        <div className="space-y-4 pt-1">
          {(
            [
              ['hymns', 'Hymns'],
              ['ambient', 'Piano & pads'],
            ] as const
          ).map(([group, label]) => (
            <div key={group}>
              <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</p>
              <div className="grid grid-cols-2 gap-2">
                {WORSHIP_TRACKS.filter((t) => t.group === group).map((track) => (
                  <button
                    key={track.id}
                    onClick={() => backgroundMusic.update({ trackId: track.id })}
                    aria-pressed={music.trackId === track.id}
                    className={cn(
                      'rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold leading-snug transition active:scale-[0.98]',
                      music.trackId === track.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200',
                    )}
                  >
                    {track.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Music volume</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{Math.round(music.volume * 100)}%</span>
            </div>
            <Slider
              value={[Math.round(music.volume * 100)]}
              onValueChange={([v]) => backgroundMusic.update({ volume: v / 100 })}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="mt-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Quiet</span>
              <span>Loud</span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">{MUSIC_CREDIT}</p>
        </div>
      )}
    </div>
  );
};

export default WorshipMusicSettings;
