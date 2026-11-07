import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { BarChart3, Check, ChevronLeft, FileText, Users, ImagePlus, Link2, Loader2, Lock, Mic, Pencil, Plus, Reply, SendHorizontal, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nameColor } from '@/components/common/UserAvatar';
import UserAvatar from '@/components/common/UserAvatar';
import SecureImg from './SecureImg';
import { BOX_TEXT, composerFormatted, hasFormatting } from './whatsappFormat';
import { formatBytes, formatSeconds, isGifFile, isVideoFile, type LinkPreview } from './chatUtils';
import { MAX_VOICE_SECONDS, VoiceRecorder, type VoiceRecording } from '@/lib/voiceRecorder';

/** Documents up to this size (like WhatsApp's 100 MB … within reason for a phone) */
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const URL_IN_TEXT = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/i;

interface Props {
  /** Text, with mentions written as "@[Name](id)", and the link's preview if one was found */
  onSend: (text: string, preview?: LinkPreview | null) => void;
  /** "+" → Poll (groups) */
  onNewPoll?: () => void;
  /** A photo, GIF or video, with an optional caption; reports upload progress (0–100) for videos */
  onSendMedia: (file: File, caption: string, onProgress: (pct: number) => void) => Promise<void>;
  /** A voice message (hold the microphone) */
  onSendVoice?: (recording: VoiceRecording) => Promise<void>;
  /** A document, with an optional caption */
  onSendFile?: (file: File, caption: string, onProgress: (pct: number) => void) => Promise<void>;
  onTyping: (typing: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Editing one of my messages: its text (or caption) is in the box, and Send saves it */
  editing?: { id: string; text: string; caption: boolean } | null;
  onSaveEdit?: (text: string) => void;
  onCancelEdit?: () => void;
  /** Replying to a message (swipe or the menu): shown above the box until sent or cancelled */
  replyTo?: { id: string; name: string; text: string; image?: string | null; userId: string } | null;
  onCancelReply?: () => void;
  /** A group's members, to @mention */
  mentionables?: { id: string; name: string; avatar?: string | null }[];
}

const isTouchDevice = () => window.matchMedia?.('(pointer: coarse)').matches;

const ChatComposer = ({
  onSend, onNewPoll, onSendMedia, onSendVoice, onSendFile, onTyping, disabled, placeholder = '', editing, onSaveEdit, onCancelEdit, replyTo, onCancelReply, mentionables,
}: Props) => {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<{ file: File; url: string; kind: 'photo' | 'gif' | 'video' } | null>(null);
  const [doc, setDoc] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** The formatted copy of the text drawn under the box (WhatsApp's live *bold*, _italic_ …) */
  const mirrorRef = useRef<HTMLDivElement>(null);
  const formatted = useMemo(() => hasFormatting(text), [text]);
  useLayoutEffect(() => {
    if (mirrorRef.current && inputRef.current) mirrorRef.current.scrollTop = inputRef.current.scrollTop;
  }, [text, formatted]);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastTypingSent = useRef(0);
  // What was being typed before an edit began: back in the box when it ends
  const draft = useRef<string | null>(null);
  const editingId = editing?.id ?? null;
  const editingText = editing?.text ?? '';

  // ── @mentions (groups) ─────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const mentioned = useRef(new Map<string, string>()); // name → id
  // Like WhatsApp: "@" lists everyone in the group (Everyone first), narrowing as you type
  const suggestions = useMemo(() => {
    if (mentionQuery === null || !mentionables?.length) return [];
    const q = mentionQuery.toLowerCase();
    const people = mentionables
      .filter((m) => !q || m.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || m.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    const everyone = !q || 'all'.startsWith(q) || 'everyone'.startsWith(q);
    return [...(everyone ? [{ id: 'all', name: 'Everyone', avatar: null, all: true }] : []), ...people.map((p) => ({ ...p, all: false }))];
  }, [mentionQuery, mentionables]);

  const findMention = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const m = before.match(/(^|\s)@([^\s@]{0,30})$/);
    setMentionQuery(m && mentionables?.length ? m[2] : null);
  };

  const pickMention = (person: { id: string; name: string; all?: boolean }) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([^\s@]{0,30})$/, person.all ? '@all ' : `@${person.name} `);
    const next = before + text.slice(caret);
    if (!person.all) mentioned.current.set(person.name, person.id);
    setText(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  };

  /** "@Name" picked from the list → "@[Name](id)" (only names still in the text) */
  const withMentions = (value: string) => {
    let out = value;
    mentioned.current.forEach((id, name) => {
      const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp(`@${safe}(?![\\w])`, 'g'), `@[${name}](${id})`);
    });
    return out;
  };

  // ── Link preview (made here, sent inside the message) ──────────────
  const [preview, setPreview] = useState<{ url: string; data: LinkPreview | null; loading: boolean } | null>(null);
  const dismissed = useRef(new Set<string>());
  const link = !editing && !photo && !doc ? text.match(URL_IN_TEXT)?.[0] ?? null : null;
  useEffect(() => {
    if (!link || dismissed.current.has(link)) {
      setPreview(null);
      return;
    }
    if (preview?.url === link) return;
    let stale = false;
    setPreview({ url: link, data: null, loading: true });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(link)}`);
        const data = res.ok ? await res.json() : null;
        if (!stale) setPreview(data?.title ? { url: link, data: { url: link, title: data.title, description: data.description, image: data.image, site: data.site }, loading: false } : null);
      } catch {
        if (!stale) setPreview(null);
      }
    }, 600);
    return () => {
      stale = true;
      clearTimeout(t);
    };
    // Only when the link changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  useEffect(() => {
    if (editingId) {
      if (draft.current === null) draft.current = text;
      setText(editingText);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    } else if (draft.current !== null) {
      setText(draft.current);
      draft.current = null;
    }
    // Only when an edit starts or ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  // Replying: straight into the box (the keyboard comes up)
  const replyId = replyTo?.id ?? null;
  useEffect(() => {
    if (replyId) requestAnimationFrame(() => inputRef.current?.focus());
  }, [replyId]);

  // Auto-grow up to ~6 lines
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
  }, [text]);

  useEffect(() => () => {
    clearTimeout(typingTimer.current);
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2200);
    return () => clearTimeout(t);
  }, [hint]);

  const signalTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      onTyping(true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      lastTypingSent.current = 0;
      onTyping(false);
    }, 3500);
  };

  const submit = async () => {
    const value = text.trim();
    if (editing) {
      if (value === editing.text.trim()) onCancelEdit?.(); // nothing changed
      else onSaveEdit?.(withMentions(value));
      return;
    }
    if (photo || doc) {
      setUploading(true);
      setProgress(photo?.kind === 'video' || doc ? 0 : null);
      try {
        if (photo) await onSendMedia(photo.file, withMentions(value), setProgress);
        else if (doc) await onSendFile?.(doc, withMentions(value), setProgress);
        if (photo) URL.revokeObjectURL(photo.url);
        setPhoto(null);
        setDoc(null);
        setText('');
        mentioned.current.clear();
      } catch {
        /* the conversation explains what went wrong; keep the file so it can be sent again */
      } finally {
        setUploading(false);
        setProgress(null);
      }
    } else {
      if (!value) return;
      const card = preview?.data && value.includes(preview.url) ? preview.data : null;
      onSend(withMentions(value), card);
      setText('');
      setPreview(null);
      mentioned.current.clear();
    }
    setMentionQuery(null);
    clearTimeout(typingTimer.current);
    lastTypingSent.current = 0;
    onTyping(false);
    // Keep the keyboard open for the next message
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // ── Voice messages: hold the microphone, slide left to cancel, up to lock ──
  const recorder = useRef<VoiceRecorder | null>(null);
  const [recording, setRecording] = useState<'off' | 'hold' | 'locked'>('off');
  const [recSeconds, setRecSeconds] = useState(0);
  const [recLevel, setRecLevel] = useState(0);
  const [slide, setSlide] = useState({ x: 0, y: 0 });
  const [sendingVoice, setSendingVoice] = useState(false);
  const press = useRef<{ x: number; y: number; at: number } | null>(null);

  const finishVoice = async (send: boolean) => {
    const rec = recorder.current;
    recorder.current = null;
    setRecording('off');
    setSlide({ x: 0, y: 0 });
    if (!rec) return;
    if (!send) {
      rec.cancel();
      return;
    }
    const result = await rec.stop().catch(() => null);
    if (!result || result.seconds < 0.8) {
      setHint('Hold to record, release to send');
      return;
    }
    setSendingVoice(true);
    try {
      await onSendVoice?.(result);
    } finally {
      setSendingVoice(false);
    }
  };

  const startVoice = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!onSendVoice || recording !== 'off' || sendingVoice) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    press.current = { x: e.clientX, y: e.clientY, at: Date.now() };
    const rec = new VoiceRecorder();
    recorder.current = rec;
    rec.onTick = (s, level) => {
      setRecSeconds(s);
      setRecLevel(level);
    };
    rec.onLimit = () => finishVoice(true);
    setRecSeconds(0);
    setRecording('hold');
    if ('vibrate' in navigator) navigator.vibrate?.(15);
    rec.start().catch((err) => {
      if (recorder.current !== rec) return;
      recorder.current = null;
      setRecording('off');
      if ((err as Error)?.message !== 'cancelled') setHint(/NotAllowed|Permission/i.test(String((err as Error)?.name || err)) ? 'Allow the microphone to send voice messages' : "Couldn't use the microphone");
    });
  };

  const moveVoice = (e: React.PointerEvent) => {
    if (recording !== 'hold' || !press.current) return;
    const dx = Math.min(0, e.clientX - press.current.x);
    const dy = Math.min(0, e.clientY - press.current.y);
    setSlide({ x: dx, y: dy });
    if (dx < -110) {
      press.current = null;
      if ('vibrate' in navigator) navigator.vibrate?.(10);
      finishVoice(false);
    } else if (dy < -70) {
      press.current = null;
      setSlide({ x: 0, y: 0 });
      setRecording('locked');
      if ('vibrate' in navigator) navigator.vibrate?.(10);
    }
  };

  const endVoice = () => {
    if (recording !== 'hold') return;
    const quick = press.current && Date.now() - press.current.at < 350;
    press.current = null;
    if (quick) {
      finishVoice(false);
      setHint('Hold to record, release to send');
    } else finishVoice(true);
  };

  useEffect(() => () => recorder.current?.cancel(), []);

  const hasContent = text.trim().length > 0 || !!photo || !!doc;
  const canSend = editing
    ? (text.trim().length > 0 || editing.caption) && !disabled
    : hasContent && !uploading && !disabled;
  const showMic = !!onSendVoice && !editing && !hasContent;

  return (
    <div className="relative border-t border-border/60 bg-background/95 px-2 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+0.5rem)] pt-2 backdrop-blur-xl sm:px-4">
      {hint && (
        <div className="pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/90 px-4 py-2 text-sm text-white shadow-lg animate-in fade-in">
          {hint}
        </div>
      )}

      {/* @mention suggestions */}
      {suggestions.length > 0 && (
        <div className="mx-auto mb-2 max-h-[min(16rem,40dvh)] max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card py-1 shadow-lg" role="listbox" aria-label="Mention someone">
          {suggestions.map((m) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickMention(m)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted active:bg-muted"
            >
              {m.all ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"><Users className="h-4 w-4" /></span>
              ) : (
                <UserAvatar name={m.name} src={m.avatar} seed={m.id} className="h-8 w-8" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-foreground">{m.name}</span>
                {m.all && <span className="block text-[12px] text-muted-foreground">@all · notifies everyone in the group</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <div className="mx-auto mb-2 flex max-w-4xl items-center gap-3 rounded-2xl bg-blue-50 px-3 py-2 dark:bg-blue-950/40">
          <Pencil className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          {/* w-0: the one-line text never widens the page */}
          <div className="w-0 min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-blue-700 dark:text-blue-300">{editing.caption ? 'Edit caption' : 'Edit message'}</p>
            <p className="truncate text-[13px] text-muted-foreground">{editing.text || 'No caption'}</p>
          </div>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onCancelEdit?.()} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Cancel editing">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {replyTo && !editing && (
        <div className="mx-auto mb-2 flex max-w-4xl items-stretch gap-2 overflow-hidden rounded-2xl bg-muted/70">
          <span className={cn('w-1 shrink-0 bg-current', nameColor(replyTo.userId))} />
          <Reply className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="w-0 min-w-0 flex-1 py-2">
            <p className={cn('truncate text-[13px] font-semibold', nameColor(replyTo.userId))}>{replyTo.name === 'You' ? 'You' : `Replying to ${replyTo.name}`}</p>
            <p className="truncate text-[13px] text-muted-foreground">{replyTo.text || 'Message'}</p>
          </div>
          {replyTo.image && <SecureImg url={replyTo.image} className="h-14 w-14 shrink-0 object-cover" />}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onCancelReply?.()} className="m-1.5 self-center rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Cancel reply">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {preview && (
        <div className="mx-auto mb-2 flex max-w-4xl items-stretch gap-2 overflow-hidden rounded-2xl bg-muted/70">
          {preview.data?.image ? (
            <img src={preview.data.image} alt="" className="h-16 w-16 shrink-0 object-cover" />
          ) : (
            <span className="flex w-12 shrink-0 items-center justify-center text-muted-foreground">
              {preview.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            </span>
          )}
          <div className="w-0 min-w-0 flex-1 py-2">
            <p className="truncate text-[13px] font-semibold text-foreground">{preview.data?.title ?? 'Getting the link preview…'}</p>
            <p className="truncate text-[12px] text-muted-foreground">{preview.data?.description || preview.data?.site || preview.url}</p>
          </div>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              dismissed.current.add(preview.url);
              setPreview(null);
            }}
            className="m-1.5 self-center rounded-full p-2 text-muted-foreground hover:bg-muted"
            aria-label="Remove link preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {photo && !editing && (
        <div className="mx-1 mb-2 flex items-center gap-3 rounded-2xl bg-muted/60 p-2">
          {photo.kind === 'video' ? (
            <video src={`${photo.url}#t=0.1`} muted playsInline preload="metadata" className="h-16 w-16 rounded-xl bg-black object-cover" />
          ) : (
            <img src={photo.url} alt="Selected" className="h-16 w-16 rounded-xl object-cover" />
          )}
          <p className="flex-1 text-sm text-muted-foreground">
            {uploading
              ? photo.kind === 'video'
                ? `Sending video… ${progress ?? 0}%`
                : `Sending ${photo.kind === 'gif' ? 'GIF' : 'photo'}…`
              : `${photo.kind === 'video' ? 'Video' : photo.kind === 'gif' ? 'GIF' : 'Photo'} ready. Add a caption or tap send`}
          </p>
          <button
            onClick={() => {
              URL.revokeObjectURL(photo.url);
              setPhoto(null);
            }}
            disabled={uploading}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {doc && !editing && (
        <div className="mx-1 mb-2 flex items-center gap-3 rounded-2xl bg-muted/60 p-2">
          <span className="flex h-14 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <FileText className="h-6 w-6" />
          </span>
          <div className="w-0 min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
            <p className="text-xs text-muted-foreground">
              {uploading ? `Sending… ${progress ?? 0}%` : `${formatBytes(doc.size)} · add a caption or tap send`}
            </p>
          </div>
          <button onClick={() => setDoc(null)} disabled={uploading} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Remove document">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative mx-auto flex max-w-4xl items-end gap-2">
        {recording !== 'off' ? (
          // Recording a voice message
          <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-[22px] bg-muted/60 px-4">
            {recording === 'locked' ? (
              <button type="button" onClick={() => finishVoice(false)} className="-ml-2 rounded-full p-2 text-red-500 hover:bg-muted" aria-label="Delete voice message">
                <Trash2 className="h-5 w-5" />
              </button>
            ) : null}
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
            <span className="w-12 shrink-0 font-mono text-[15px] tabular-nums text-foreground">{formatSeconds(recSeconds)}</span>
            {recording === 'hold' ? (
              <span className="flex min-w-0 flex-1 items-center justify-center gap-1 truncate text-sm text-muted-foreground" style={{ transform: `translateX(${slide.x / 2}px)`, opacity: 1 + slide.x / 160 }}>
                <ChevronLeft className="h-4 w-4 shrink-0" /> Slide to cancel
              </span>
            ) : (
              <span className="flex min-w-0 flex-1 items-center gap-[3px]" aria-hidden>
                {Array.from({ length: 18 }, (_, i) => (
                  <span key={i} className="w-[3px] rounded-full bg-muted-foreground/60" style={{ height: `${6 + Math.round(recLevel * 20 * (0.5 + 0.5 * Math.sin((i + recSeconds * 6) * 1.3)))}px` }} />
                ))}
              </span>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => (onSendFile ? setMenuOpen((v) => !v) : fileRef.current?.click())}
              disabled={disabled || uploading || !!editing}
              className={cn(
                'mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-90',
                editing && 'hidden',
              )}
              aria-label={onSendFile ? 'Attach' : 'Send a photo, GIF or video'}
              aria-expanded={onSendFile ? menuOpen : undefined}
            >
              {onSendFile ? <Plus className={cn('h-6 w-6 transition-transform', menuOpen && 'rotate-45')} /> : <ImagePlus className="h-6 w-6" />}
            </button>
            {menuOpen && (
              <div className="absolute bottom-12 left-0 z-20 w-52 overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-xl animate-in fade-in slide-in-from-bottom-2" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    fileRef.current?.click();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-foreground transition hover:bg-muted"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300"><ImagePlus className="h-5 w-5" /></span>
                  Photo or video
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    docRef.current?.click();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-foreground transition hover:bg-muted"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"><FileText className="h-5 w-5" /></span>
                  Document
                </button>
                {onNewPoll && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onNewPoll();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-foreground transition hover:bg-muted"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"><BarChart3 className="h-5 w-5" /></span>
                    Poll
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (photo) URL.revokeObjectURL(photo.url);
                setDoc(null);
                const kind = isVideoFile(file) ? 'video' : isGifFile(file) ? 'gif' : 'photo';
                setPhoto({ file, url: URL.createObjectURL(file), kind });
                inputRef.current?.focus();
              }}
            />
            <input
              ref={docRef}
              type="file"
              className="hidden"
              aria-label="Choose a document"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (file.size > MAX_FILE_BYTES) {
                  setHint('Documents can be up to 100 MB');
                  return;
                }
                if (photo) URL.revokeObjectURL(photo.url);
                setPhoto(null);
                setDoc(file);
                inputRef.current?.focus();
              }}
            />
            <div className="flex min-w-0 flex-1 items-end rounded-[22px] border border-border bg-muted/50 px-4 transition-colors focus-within:bg-background">
              <div className="relative min-w-0 flex-1">
              {/* Live formatting like WhatsApp: the box's own text turns see-through and this
                  copy, with the same letters and widths, shows *bold*, _italic_, ~strike~ and
                  `code` under it; the cursor and selection stay the box's own */}
              {formatted && (
                <div
                  ref={mirrorRef}
                  aria-hidden
                  data-testid="composer-mirror"
                  className={cn('pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap py-2.5 text-[16px] leading-5 text-foreground [overflow-wrap:break-word]', BOX_TEXT)}
                >
                  {composerFormatted(text)}
                  {'\u200b'}
                </div>
              )}
              <textarea
                ref={inputRef}
                data-composer-input
                value={text}
                rows={1}
                enterKeyHint={isTouchDevice() ? 'enter' : 'send'}
                // Blank like WhatsApp; only a photo or document asks for a caption
                placeholder={editing ? (editing.caption ? 'Caption' : '') : photo || doc ? 'Add a caption…' : placeholder}
                aria-label={editing ? (editing.caption ? 'Edit caption' : 'Edit message') : photo || doc ? 'Caption' : 'Message'}
                onChange={(e) => {
                  setText(e.target.value);
                  findMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
                  if (e.target.value && !editing) signalTyping();
                }}
                onSelect={(e) => findMention(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
                onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && editing) {
                    e.preventDefault();
                    onCancelEdit?.();
                    return;
                  }
                  if (e.key === 'Escape' && replyTo) {
                    e.preventDefault();
                    onCancelReply?.();
                    return;
                  }
                  if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice() && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if (suggestions.length) pickMention(suggestions[0]);
                    else if (canSend) submit();
                  }
                }}
                onScroll={(e) => {
                  if (mirrorRef.current) mirrorRef.current.scrollTop = e.currentTarget.scrollTop;
                }}
                className={cn(
                  BOX_TEXT,
                  'relative block max-h-[148px] min-h-[40px] w-full resize-none border-0 bg-transparent py-2.5 text-[16px] leading-5 text-foreground outline-none [overflow-wrap:break-word] [scrollbar-width:none] placeholder:text-muted-foreground focus:border-transparent focus:shadow-none focus:outline-none [-webkit-tap-highlight-color:transparent] [&::-webkit-scrollbar]:hidden',
                  formatted && 'text-transparent caret-foreground [-webkit-text-fill-color:transparent] selection:bg-blue-500/25',
                )}
              />
              </div>
            </div>
          </>
        )}

        {/* Lock: slide up while holding to keep recording hands-free */}
        {recording === 'hold' && (
          <div className="absolute -top-24 right-0 flex w-12 flex-col items-center gap-1 rounded-full bg-card py-3 text-muted-foreground shadow-lg ring-1 ring-border" style={{ transform: `translateY(${Math.max(slide.y, -40) / 2}px)` }} aria-hidden>
            <Lock className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4 rotate-90" />
          </div>
        )}

        {recording === 'locked' ? (
          <button
            type="button"
            onClick={() => finishVoice(true)}
            className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition active:scale-90"
            aria-label="Send voice message"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        ) : showMic || recording === 'hold' ? (
          <button
            type="button"
            onPointerDown={startVoice}
            onPointerMove={moveVoice}
            onPointerUp={endVoice}
            onPointerCancel={() => recording === 'hold' && finishVoice(false)}
            onContextMenu={(e) => e.preventDefault()}
            disabled={disabled || sendingVoice}
            className={cn(
              'mb-0.5 flex shrink-0 touch-none select-none items-center justify-center rounded-full transition [-webkit-touch-callout:none]',
              recording === 'hold' ? 'h-16 w-16 -translate-y-2 bg-blue-600 text-white shadow-xl' : 'h-10 w-10 bg-blue-600 text-white shadow-md shadow-blue-600/25',
            )}
            aria-label="Hold to record a voice message"
          >
            {sendingVoice ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className={recording === 'hold' ? 'h-7 w-7' : 'h-5 w-5'} />}
          </button>
        ) : (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()} // keep focus in the textarea (keyboard stays up)
            onClick={submit}
            disabled={!canSend}
            className={cn(
              'mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-90',
              canSend ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 hover:bg-blue-700' : 'bg-muted text-muted-foreground',
            )}
            aria-label={editing ? 'Save edit' : 'Send'}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : editing ? <Check className="h-5 w-5" /> : <SendHorizontal className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatComposer;
