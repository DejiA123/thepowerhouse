import { useState } from 'react';
import { ExternalLink, MessageSquare } from 'lucide-react';

/**
 * The live service's YouTube chat, inside the app: everyone's comments as
 * they come in. Writing a comment needs a YouTube sign-in, which phones only
 * keep in YouTube itself, so "Comment" opens the chat there.
 */
const LiveChat = ({ videoId }: { videoId: string }) => {
  const [open, setOpen] = useState(true);
  const dark = document.documentElement.classList.contains('dark');
  const src = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${window.location.hostname}${dark ? '&dark_theme=1' : ''}`;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-card dark:border-slate-800">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-[14px] font-semibold text-foreground"
          aria-expanded={open}
        >
          <MessageSquare className="h-4 w-4 text-red-600" />
          Live chat
          <span className="text-[12px] font-normal text-muted-foreground">{open ? 'Hide' : 'Show'}</span>
        </button>
        <a
          href={`https://www.youtube.com/live_chat?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[12.5px] font-semibold text-white"
        >
          Comment <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      {open && <iframe src={src} title="Live chat" className="h-[420px] w-full border-0 bg-white dark:bg-slate-950" />}
    </div>
  );
};

export default LiveChat;
