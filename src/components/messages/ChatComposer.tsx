import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, SendHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onSend: (text: string) => void;
  onSendPhoto: (file: File, caption: string) => Promise<void>;
  onTyping: (typing: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

const isTouchDevice = () => window.matchMedia?.('(pointer: coarse)').matches;

const ChatComposer = ({ onSend, onSendPhoto, onTyping, disabled, placeholder = 'Message' }: Props) => {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastTypingSent = useRef(0);

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
    if (photo) {
      setUploading(true);
      try {
        await onSendPhoto(photo.file, value);
        URL.revokeObjectURL(photo.url);
        setPhoto(null);
        setText('');
      } finally {
        setUploading(false);
      }
    } else {
      if (!value) return;
      onSend(value);
      setText('');
    }
    clearTimeout(typingTimer.current);
    lastTypingSent.current = 0;
    onTyping(false);
    // Keep the keyboard open for the next message
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const canSend = (text.trim().length > 0 || !!photo) && !uploading && !disabled;

  return (
    <div className="border-t border-border/60 bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-xl sm:px-4">
      {photo && (
        <div className="mx-1 mb-2 flex items-center gap-3 rounded-2xl bg-muted/60 p-2">
          <img src={photo.url} alt="Selected" className="h-16 w-16 rounded-xl object-cover" />
          <p className="flex-1 text-sm text-muted-foreground">Add a caption or tap send</p>
          <button
            onClick={() => {
              URL.revokeObjectURL(photo.url);
              setPhoto(null);
            }}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            aria-label="Remove photo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="mx-auto flex max-w-4xl items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-90"
          aria-label="Send a photo"
        >
          <ImagePlus className="h-6 w-6" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            if (photo) URL.revokeObjectURL(photo.url);
            setPhoto({ file, url: URL.createObjectURL(file) });
            inputRef.current?.focus();
          }}
        />
        <div className="flex min-w-0 flex-1 items-end rounded-[22px] border border-border bg-muted/50 px-4 transition focus-within:border-blue-500/50 focus-within:bg-background focus-within:ring-2 focus-within:ring-blue-500/15">
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            enterKeyHint={isTouchDevice() ? 'enter' : 'send'}
            placeholder={photo ? 'Add a caption…' : placeholder}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value) signalTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice() && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) submit();
              }
            }}
            className="max-h-[148px] min-h-[40px] w-full resize-none bg-transparent py-2.5 text-[16px] leading-5 text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()} // keep focus in the textarea (keyboard stays up)
          onClick={submit}
          disabled={!canSend}
          className={cn(
            'mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-90',
            canSend ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 hover:bg-blue-700' : 'bg-muted text-muted-foreground',
          )}
          aria-label="Send"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
};

export default ChatComposer;
