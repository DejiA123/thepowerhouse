import { useEffect, useRef, useState } from 'react';
import { AudioLines, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiVoice } from '@/services/aiVoice/engine';
import { AI_VOICES } from '@/services/aiVoice/voices';

/** Plays a voice's short sample */
export function useVoiceSample() {
  const player = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => player.current?.pause(), []);
  const toggle = (id: string) => {
    if (!player.current) {
      player.current = new Audio();
      player.current.onended = () => setPlaying(null);
      player.current.onpause = () => setPlaying(null);
    }
    const p = player.current;
    if (playing === id) {
      p.pause();
      return;
    }
    p.src = `/audio/voices/${id}.mp3`;
    p.play().then(() => setPlaying(id)).catch(() => setPlaying(null));
  };
  return { playing, toggle };
}

/** Which translations have a narrator, and which are read aloud in the voice chosen here */
const VOICE_SUMMARY = [
  { label: 'KJV, NIV, ESV, NLT', how: 'Narrated' },
  { label: 'NKJV', how: 'New Testament narrated, Old Testament non-narrated' },
  { label: 'NASB, AMP, MSG, ASV', how: 'Non-narrated' },
];

/** "Audio Bible voices": which translations are narrated, and the voice that reads the rest. */
const AiVoiceSettings = () => {
  const ai = useAiVoice();
  const sample = useVoiceSample();

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start gap-2">
        <AudioLines className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <span className="block font-medium text-slate-800 dark:text-slate-200">Audio Bible voices</span>
          <span className="block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Translations without a narrator are read aloud in the voice you choose below. Chapters you listen to are kept on
            this phone for offline listening.
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-100 rounded-lg bg-slate-50 text-[13px] dark:divide-slate-700 dark:bg-slate-900/40">
        {VOICE_SUMMARY.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 px-3 py-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{row.label}</span>
            <span className="text-right text-slate-500 dark:text-slate-400">{row.how}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Reading voice</p>
        <div className="grid grid-cols-2 gap-2">
          {AI_VOICES.map((voice) => {
            const chosen = ai.voice === voice.id;
            return (
              <div
                key={voice.id}
                className={cn(
                  'flex items-center rounded-xl transition',
                  chosen ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
                )}
              >
                <button
                  onClick={() => ai.setVoice(voice.id)}
                  aria-pressed={chosen}
                  className="min-w-0 flex-1 px-3 py-2 text-left active:scale-[0.98]"
                >
                  <span className="block text-[13.5px] font-semibold leading-tight">{voice.name}</span>
                  <span className={cn('block text-[11.5px]', chosen ? 'text-primary-foreground/80' : 'text-slate-500 dark:text-slate-400')}>
                    {voice.gender === 'male' ? 'Man' : 'Woman'}
                  </span>
                </button>
                <button
                  onClick={() => sample.toggle(voice.id)}
                  className={cn('mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', chosen ? 'bg-white/20' : 'bg-white dark:bg-slate-600')}
                  aria-label={sample.playing === voice.id ? `Stop ${voice.name}'s sample` : `Hear ${voice.name}`}
                >
                  {sample.playing === voice.id ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        Narrated audio by Faith Comes By Hearing, and The Listener's Bible (NIV, read by Max McLean).
      </p>
    </div>
  );
};

export default AiVoiceSettings;
