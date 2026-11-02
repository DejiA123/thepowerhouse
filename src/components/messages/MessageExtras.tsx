import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isEncryptedFile, openEncryptedFile } from '@/lib/chatCrypto';
import { formatBytes, formatSeconds, MENTION, type ChatFile, type LinkPreview, type VoiceNote } from './chatUtils';

/** Only one voice message plays at a time */
const PLAYING = 'voice:playing';

/** A voice message: play/pause, the waveform (tap to jump), the time, and speed (1×, 1.5×, 2×) */
export const VoicePlayer = ({ id, voice, isOwn }: { id: string; voice: VoiceNote; isOwn: boolean }) => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const bars = voice.bars.length ? voice.bars : Array.from({ length: 32 }, (_, i) => 3 + ((i * 7) % 5));
  const progress = voice.seconds ? Math.min(1, position / voice.seconds) : 0;

  useEffect(() => {
    const onOther = (e: Event) => (e as CustomEvent).detail !== id && audio.current?.pause();
    window.addEventListener(PLAYING, onOther);
    return () => {
      window.removeEventListener(PLAYING, onOther);
      audio.current?.pause();
    };
  }, [id]);

  const ensure = async () => {
    if (audio.current) return audio.current;
    setLoading(true);
    try {
      const src = isEncryptedFile(voice.url) ? await openEncryptedFile(voice.url) : voice.url;
      const el = new Audio(src);
      el.preload = 'auto';
      el.playbackRate = rate;
      el.ontimeupdate = () => setPosition(el.currentTime);
      el.onplay = () => setPlaying(true);
      el.onpause = () => setPlaying(false);
      el.onended = () => {
        setPlaying(false);
        setPosition(0);
      };
      audio.current = el;
      return el;
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const el = await ensure();
      if (el.paused) {
        window.dispatchEvent(new CustomEvent(PLAYING, { detail: id }));
        await el.play();
      } else el.pause();
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };

  const seek = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const box = e.currentTarget.getBoundingClientRect();
    const at = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * voice.seconds;
    const el = await ensure().catch(() => null);
    if (!el) return;
    el.currentTime = at;
    setPosition(at);
  };

  const cycleRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audio.current) audio.current.playbackRate = next;
  };

  return (
    <div className="flex min-w-[220px] max-w-[280px] items-center gap-2.5 py-0.5">
      <button
        type="button"
        onClick={toggle}
        className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', isOwn ? 'bg-white/20 text-white' : 'bg-blue-600 text-white')}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-8 cursor-pointer items-center gap-[2px]" onClick={seek} role="slider" aria-label="Voice message position" aria-valuemin={0} aria-valuemax={Math.round(voice.seconds)} aria-valuenow={Math.round(position)}>
          {bars.map((b, i) => {
            const done = (i + 0.5) / bars.length <= progress;
            return (
              <span
                key={i}
                className={cn('w-[3px] shrink-0 rounded-full', isOwn ? (done ? 'bg-white' : 'bg-white/45') : done ? 'bg-blue-600 dark:bg-blue-400' : 'bg-muted-foreground/35')}
                style={{ height: `${4 + b * 2.6}px` }}
              />
            );
          })}
        </div>
        <div className={cn('flex items-center gap-2 text-[11px] tabular-nums', isOwn ? 'text-white/75' : 'text-muted-foreground')}>
          <span>{failed ? "Couldn't play" : formatSeconds(playing || position ? position : voice.seconds)}</span>
          {(playing || rate !== 1) && (
            <button type="button" onClick={cycleRate} className={cn('rounded-full px-1.5 font-semibold', isOwn ? 'bg-white/20' : 'bg-muted')}>
              {rate}×
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** A document: its name, size and type; tap to open (it's opened on the phone if encrypted) */
export const FileCard = ({ file, isOwn }: { file: ChatFile; isOwn: boolean }) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const ext = (file.name.split('.').pop() || '').toUpperCase().slice(0, 4);
  const Icon = /^(XLS|XLSX|CSV|NUMB)$/.test(ext) ? FileSpreadsheet : FileText;
  const tint = ext === 'PDF' ? 'bg-red-500' : /^(DOC|DOCX|PAGE)$/.test(ext) ? 'bg-blue-600' : /^(XLS|XLSX|CSV|NUMB)$/.test(ext) ? 'bg-emerald-600' : /^(PPT|PPTX|KEY)$/.test(ext) ? 'bg-orange-500' : 'bg-slate-500';

  const open = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    setFailed(false);
    try {
      const href = isEncryptedFile(file.url) ? await openEncryptedFile(file.url) : file.url;
      // PDFs and pictures open to read; everything else downloads under its own name
      if (/^(PDF|JPG|JPEG|PNG|GIF|TXT)$/.test(ext)) {
        const w = window.open(href, '_blank', 'noopener');
        if (w) return;
      }
      const a = document.createElement('a');
      a.href = href;
      a.download = file.name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      className={cn('flex w-full min-w-[220px] max-w-[280px] items-center gap-3 rounded-xl p-2 text-left', isOwn ? 'bg-white/15' : 'bg-muted/70')}
      aria-label={`Open ${file.name}`}
    >
      <span className={cn('flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-white', tint)}>
        <Icon className="h-5 w-5" />
        {ext && <span className="mt-0.5 text-[8px] font-bold leading-none">{ext}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('line-clamp-2 break-all text-[14px] font-medium leading-snug', isOwn ? 'text-white' : 'text-foreground')}>{file.name}</span>
        <span className={cn('mt-0.5 block text-[12px]', isOwn ? 'text-white/70' : 'text-muted-foreground')}>
          {failed ? "Couldn't open it. Tap to try again" : `${formatBytes(file.size)}${ext ? ` · ${ext}` : ''}`}
        </span>
      </span>
      <span className={cn('shrink-0', isOwn ? 'text-white/80' : 'text-muted-foreground')}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
      </span>
    </button>
  );
};

/** The preview of a link, made on the sender's phone */
export const PreviewCard = ({ preview, isOwn }: { preview: LinkPreview; isOwn: boolean }) => {
  const [imageOk, setImageOk] = useState(true);
  let site = preview.site;
  try {
    site ||= new URL(preview.url).hostname.replace(/^www\./, '');
  } catch {
    /* keep */
  }
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn('mb-1.5 block overflow-hidden rounded-xl', isOwn ? 'bg-white/15' : 'bg-muted/80')}
    >
      {preview.image && imageOk && (
        <img src={preview.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageOk(false)} className="max-h-40 w-full object-cover" />
      )}
      <span className="block px-3 py-2">
        <span className={cn('line-clamp-2 text-[14px] font-semibold leading-snug', isOwn ? 'text-white' : 'text-foreground')}>{preview.title}</span>
        {preview.description && <span className={cn('mt-0.5 line-clamp-2 text-[12.5px]', isOwn ? 'text-white/80' : 'text-muted-foreground')}>{preview.description}</span>}
        {site && <span className={cn('mt-1 block truncate text-[11.5px] uppercase tracking-wide', isOwn ? 'text-white/65' : 'text-muted-foreground')}>{site}</span>}
      </span>
    </a>
  );
};

/** Text with @mentions picked out (mine highlighted) */
export function withMentionSpans(text: string, myId: string | undefined, isOwn: boolean, key: string | number): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(MENTION)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const me = m[2] === myId;
    out.push(
      <span
        key={`${key}-m${i++}`}
        className={cn('font-semibold', isOwn ? 'text-white' : 'text-blue-600 dark:text-blue-400', me && !isOwn && 'rounded bg-blue-100 px-0.5 dark:bg-blue-900/50')}
      >
        @{m[1]}
      </span>,
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
