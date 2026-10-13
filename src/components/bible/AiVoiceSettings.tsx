import { useEffect, useRef, useState } from 'react';
import { AudioLines, Check, Loader2, Pause, Play, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/services/offlineAudioService';
import { useAiVoice } from '@/services/aiVoice/engine';
import { AI_VOICES, AI_VOICE_CREDIT } from '@/services/aiVoice/model';
import { aiChapterAudio } from '@/services/aiVoice/chapterAudio';

/** Plays a voice's short sample (made in advance, so it can be heard before downloading) */
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

/** Which translations are read by people and which by the AI voice */
export const VOICE_SUMMARY = [
  { label: 'KJV, ESV, NLT', how: 'Narrated by people' },
  { label: 'NKJV', how: 'New Testament narrated, Old Testament AI voice' },
  { label: 'NASB, AMP, MSG, ASV', how: 'AI voice' },
];

/** "Voice for the audio Bible": the AI voice download and the choice of voice, for Bible settings. */
const AiVoiceSettings = () => {
  const ai = useAiVoice();
  const sample = useVoiceSample();

  useEffect(() => {
    ai.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start gap-2">
        <AudioLines className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <span className="block font-medium text-slate-800 dark:text-slate-200">Audio Bible voices</span>
          <span className="block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Translations without a narrator are read by a natural AI voice, made on this device.
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

      {/* The AI voice on this device */}
      {ai.status === 'downloading' ? (
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/40">
          <div className="mb-2 flex items-center justify-between text-[13px] font-medium text-blue-800 dark:text-blue-200">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading the AI voice
            </span>
            <span>{Math.round(ai.progress * 100)}%</span>
          </div>
          <Progress value={ai.progress * 100} className="h-1.5" />
          <p className="mt-2 text-[11.5px] text-blue-700/80 dark:text-blue-300/80">Keep the app open. You can use the rest of the app meanwhile.</p>
        </div>
      ) : ai.status === 'ready' ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/40">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-800 dark:text-emerald-200">
            <Check className="h-4 w-4" /> AI voice ready, also offline
          </span>
          <button
            onClick={async () => {
              await aiChapterAudio.clearSaved();
              await ai.remove();
            }}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium text-slate-500 hover:bg-white hover:text-red-600 dark:hover:bg-slate-800"
            aria-label="Remove the AI voice from this device"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/40">
          {ai.status === 'error' && ai.error && <p className="mb-2 text-[12.5px] font-medium text-red-600">{ai.error}</p>}
          <button
            onClick={() => ai.download().catch(() => undefined)}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-[14px] font-semibold text-primary-foreground transition active:scale-[0.98]"
          >
            {ai.status === 'error' ? 'Try again' : 'Download the AI voice'} · {formatBytes(ai.totalBytes)}
          </button>
          <p className="mt-2 text-center text-[11.5px] text-slate-500 dark:text-slate-400">Once only. Wi-Fi recommended. Then it works offline.</p>
        </div>
      )}

      <div>
        <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">AI voice</p>
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
        {AI_VOICE_CREDIT} Narrated audio by Faith Comes By Hearing.
      </p>
    </div>
  );
};

export default AiVoiceSettings;
