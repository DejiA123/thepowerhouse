import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2, MessageSquare, RotateCw, SendHorizontal, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useIsAdmin } from '@/lib/admin';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';
import { church } from '@/config/church';

interface LiveMessage {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  body: string;
  created_at: string;
  pending?: boolean;
}

const QUICK = ['🙏 Amen', '🙌 Hallelujah', '❤️', '🔥'];
/** A service's comments: the last few hours (a channel's live page has no video id to keep services apart) */
const WINDOW_MS = 6 * 3600_000;
const table = () => supabase.from('live_chat_messages' as never);
const time = (iso: string) => new Date(iso.replace(/(\.\d{3})\d+/, '$1')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * The live service's chat. "Church" (first): members comment with their app
 * account, no YouTube sign-in (iPhones block Google's sign-in inside apps, and
 * the channel's chat can be subscribers-only), and everyone watching sees it
 * live. "YouTube": the channel's own chat to read, and Comment opens YouTube.
 */
const LiveChat = ({ videoId, youtube = true }: { videoId: string; youtube?: boolean }) => {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'church' | 'youtube'>('church');

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
        {open && youtube && (
          <div className="flex rounded-full bg-muted p-0.5 text-[12.5px] font-semibold" role="tablist" aria-label="Which chat">
            {(['church', 'youtube'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn('rounded-full px-3 py-1 transition', tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
              >
                {t === 'church' ? 'Church' : 'YouTube'}
              </button>
            ))}
          </div>
        )}
      </div>
      {open && (tab === 'church' || !youtube ? <ChurchChat videoId={videoId} /> : <YouTubeChat videoId={videoId} />)}
    </div>
  );
};

const ChurchChat = ({ videoId }: { videoId: string }) => {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<LiveMessage[] | null>(null);
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const load = useCallback(async () => {
    const { data, error } = await table()
      .select('id, user_id, author_name, author_avatar, body, created_at')
      .eq('video_id', videoId)
      .gt('created_at', new Date(Date.now() - WINDOW_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(150);
    if (error) {
      setMessages((prev) => prev ?? []);
      return;
    }
    const list = ((data as LiveMessage[] | null) ?? []).reverse();
    // Keep my comments still on their way
    setMessages((prev) => [...list, ...(prev ?? []).filter((m) => m.pending)]);
  }, [videoId]);

  useEffect(() => {
    setMessages(null);
    void load();
  }, [load]);
  useLiveRefresh([{ table: 'live_chat_messages', filter: `video_id=eq.${videoId}` }], load, { pollMs: 15_000 });

  // New comments scroll into view unless you've scrolled up to read
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (body: string) => {
    const clean = body.trim().slice(0, 400);
    if (!clean || !user || sending) return;
    const temp: LiveMessage = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      author_name: (user.user_metadata?.full_name as string) || 'You',
      author_avatar: (user.user_metadata?.avatar_url as string) || null,
      body: clean,
      created_at: new Date().toISOString(),
      pending: true,
    };
    atBottom.current = true;
    setMessages((prev) => [...(prev ?? []), temp]);
    setText('');
    setSending(true);
    const { data, error } = await table().insert({ video_id: videoId, body: clean } as never).select('id, user_id, author_name, author_avatar, body, created_at').single();
    setSending(false);
    if (error) {
      setMessages((prev) => (prev ?? []).filter((m) => m.id !== temp.id));
      if (!body.startsWith('🙏') && !body.startsWith('🙌') && body.length > 2) setText(clean);
      appAlert(/Slow down/.test(error.message) ? 'Slow down a little' : "Couldn't send your comment", /Slow down/.test(error.message) ? 'Wait a moment before your next comment.' : 'Check your connection and try again.', 'error');
      return;
    }
    setMessages((prev) => (prev ?? []).map((m) => (m.id === temp.id ? (data as LiveMessage) : m)));
  };

  const remove = async (m: LiveMessage) => {
    setChosen(null);
    setMessages((prev) => (prev ?? []).filter((x) => x.id !== m.id));
    const { error } = await supabase.rpc('remove_live_chat_message' as never, { _id: m.id } as never);
    if (error) {
      appAlert("Couldn't remove the comment", 'Please try again.', 'error');
      void load();
    }
  };

  return (
    <div className="border-t border-border/60">
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        className="h-[320px] space-y-2.5 overflow-y-auto overscroll-contain px-3 py-3"
        data-testid="church-chat"
      >
        {messages === null ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-[15px] font-semibold text-foreground">Say hello to everyone watching 👋</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Comments here are seen live by everyone at {church.name} watching in the app.</p>
          </div>
        ) : (
          messages.map((m) => {
            const canRemove = !m.pending && !!user && (m.user_id === user.id || !!isAdmin);
            return (
              <div key={m.id} className={cn('flex items-start gap-2.5', m.pending && 'opacity-60')}>
                <UserAvatar name={m.author_name} src={m.author_avatar} seed={m.user_id} className="h-8 w-8 shrink-0" />
                <button
                  type="button"
                  onClick={() => canRemove && setChosen((c) => (c === m.id ? null : m.id))}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="mr-1.5 text-[13px] font-semibold text-muted-foreground">{m.user_id === user?.id ? 'You' : m.author_name}</span>
                  <span className="text-[14.5px] leading-snug text-foreground [overflow-wrap:anywhere]">{m.body}</span>
                  <span className="ml-1.5 whitespace-nowrap text-[11px] text-muted-foreground">{time(m.created_at)}</span>
                </button>
                {chosen === m.id && canRemove && (
                  <button onClick={() => remove(m)} className="flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-semibold text-red-600 dark:bg-red-950/40" aria-label="Remove comment">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      {user ? (
        <div className="border-t border-border/60 px-3 pb-3 pt-2">
          <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-[13px] font-medium text-foreground active:scale-95">
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 400))}
              placeholder="Say something…"
              enterKeyHint="send"
              aria-label="Comment"
              className="h-11 min-w-0 flex-1 rounded-full border border-border bg-muted/50 px-4 text-[16px] text-foreground outline-none focus:border-transparent focus:bg-background focus:shadow-none"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition active:scale-90 disabled:opacity-40"
              aria-label="Send comment"
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </form>
        </div>
      ) : (
        <div className="border-t border-border/60 p-3">
          <button
            onClick={() => navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}`)}
            className="h-11 w-full rounded-full bg-blue-600 text-[15px] font-semibold text-white"
          >
            Sign in to comment
          </button>
        </div>
      )}
    </div>
  );
};

/** YouTube's own chat, to read. Writing there needs YouTube (its Google sign-in doesn't work inside apps on iPhone). */
const YouTubeChat = ({ videoId }: { videoId: string }) => {
  const [reload, setReload] = useState(0);
  const dark = document.documentElement.classList.contains('dark');
  const src = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${window.location.hostname}${dark ? '&dark_theme=1' : ''}`;

  // Coming back from YouTube (or a sign-in page that left the chat blank): load it afresh
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && setReload((r) => r + 1);
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <div className="border-t border-border/60">
      <iframe key={reload} src={src} title="YouTube live chat" className="h-[360px] w-full border-0 bg-white dark:bg-slate-950" />
      <div className="flex items-center gap-2 border-t border-border/60 p-3">
        <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-muted-foreground">To comment on YouTube, open it in the YouTube app.</p>
        <button onClick={() => setReload((r) => r + 1)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Reload YouTube chat">
          <RotateCw className="h-4 w-4" />
        </button>
        <a
          href={`https://www.youtube.com/live_chat?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-600 px-3 py-2 text-[12.5px] font-semibold text-white"
        >
          Comment on YouTube <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};

export default LiveChat;
