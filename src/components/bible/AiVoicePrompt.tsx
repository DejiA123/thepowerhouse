import { useEffect, useRef, useState } from 'react';
import { AudioLines, Loader2, Pause, Play } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AI_VOICE_NEEDED_EVENT, useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { formatBytes } from '@/services/offlineAudioService';
import { useAiVoice } from '@/services/aiVoice/engine';
import { AI_VOICES } from '@/services/aiVoice/model';
import { useVoiceSample } from './AiVoiceSettings';

interface Request {
  book: string;
  chapter: number;
  version: string;
  autoPlayNext: boolean;
  translation: string;
}

/**
 * Shown the first time someone listens to a translation read by the AI voice:
 * what it is, a sample to hear, and the one-time download. The chapter they
 * asked for starts by itself once the voice is on the phone.
 */
const AiVoicePrompt = () => {
  const ai = useAiVoice();
  const audio = useGlobalAudio();
  const sample = useVoiceSample();
  const [request, setRequest] = useState<Request | null>(null);
  const [open, setOpen] = useState(false);
  const waiting = useRef<Request | null>(null);

  useEffect(() => {
    const onNeeded = (event: Event) => {
      const detail = (event as CustomEvent<Request>).detail;
      setRequest(detail);
      waiting.current = detail;
      setOpen(true);
    };
    window.addEventListener(AI_VOICE_NEEDED_EVENT, onNeeded);
    return () => window.removeEventListener(AI_VOICE_NEEDED_EVENT, onNeeded);
  }, []);

  // Downloaded: play what was asked for (unless something else has started meanwhile)
  useEffect(() => {
    const r = waiting.current;
    if (ai.status !== 'ready' || !r) return;
    waiting.current = null;
    setOpen(false);
    if (!audio.audioState.isPlaying) audio.playBibleChapterMP3(r.book, r.chapter, r.version, r.autoPlayNext, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.status]);

  const voice = AI_VOICES.find((v) => v.id === ai.voice) ?? AI_VOICES[0];
  const downloading = ai.status === 'downloading';

  return (
    <AlertDialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o && !downloading) waiting.current = null;
    }}>
      <AlertDialogContent className="max-w-md rounded-3xl">
        <AlertDialogHeader>
          <span className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
            <AudioLines className="h-6 w-6" />
          </span>
          <AlertDialogTitle className="text-center">Listen to the {request?.translation ?? 'Bible'} with a natural voice</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-center text-[14.5px] leading-relaxed">
              <p>
                The {request?.translation ?? 'translation'} hasn't been recorded by a narrator, so a lifelike AI voice reads it,
                made right here on your phone. Download the voice once and it works offline too.
              </p>
              <button
                onClick={() => sample.toggle(voice.id)}
                className="mx-auto flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-[14px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
              >
                {sample.playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                Hear {voice.name}
              </button>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {downloading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloading the voice
              </span>
              <span>{Math.round(ai.progress * 100)}%</span>
            </div>
            <Progress value={ai.progress * 100} className="h-2" />
            <p className="text-center text-[12.5px] text-muted-foreground">
              Keep the app open. {request ? 'The chapter starts by itself when it’s ready.' : ''}
            </p>
          </div>
        ) : (
          ai.status === 'error' && ai.error && <p className="text-center text-[13px] font-medium text-red-600">{ai.error}</p>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            {downloading ? 'Hide' : 'Not now'}
          </Button>
          {!downloading && (
            <Button className="rounded-full" onClick={() => ai.download().catch(() => undefined)}>
              {ai.status === 'error' ? 'Try again' : `Download voice · ${formatBytes(ai.totalBytes)}`}
            </Button>
          )}
        </AlertDialogFooter>
        <p className="text-center text-[11.5px] text-muted-foreground">Once only. Wi-Fi recommended. Choose other voices in Bible settings.</p>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AiVoicePrompt;
