import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Download, Loader2, Music2, PenLine, RotateCcw, Share2, Trash2, Users } from 'lucide-react';
import { Page, PageTitle, SectionLabel, ListGroup } from '@/components/page/PageKit';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import { currentChurchId } from '@/lib/churchSpace';
import { choirName } from '@/lib/choirChat';
import SongSheet, { type ComposedSong } from '@/components/choir/SongSheet';

interface Draft {
  id: string;
  created_by: string;
  location: string | null;
  title: string;
  brief: Brief;
  song: ComposedSong;
  shared: boolean;
  audio_url: string | null;
  audio_status: 'none' | 'making' | 'ready' | 'failed';
  music_requested_at: string | null;
  created_at: string;
}

interface Brief {
  theme: string;
  scripture?: string;
  style?: string;
  feel?: string;
  key?: string;
  language?: string;
  notes?: string;
}

const STYLES = [
  { id: 'gospel_choir', label: 'Gospel choir' },
  { id: 'worship', label: 'Worship' },
  { id: 'afro_gospel', label: 'Afro gospel' },
  { id: 'praise', label: 'Upbeat praise' },
  { id: 'ballad', label: 'Gospel ballad' },
  { id: 'hymn', label: 'Modern hymn' },
];
const FEELS = [
  { id: 'slow', label: 'Slow' },
  { id: 'mid', label: 'Mid' },
  { id: 'fast', label: 'Fast' },
];
const KEYS = ['', 'C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb'];
const WRITING = ['Reading the Scripture…', 'Finding the words…', 'Shaping the chorus…', 'Setting the chords…', 'Writing the choir parts…'];
const MAKING_MAX_MS = 5 * 60_000;

/** The function's own message for an error (it answers JSON with "error") */
async function call(body: Record<string, unknown>): Promise<{ draft?: Draft; refused?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('song-writer', { body });
  if (!error) return data as { draft?: Draft; refused?: string };
  try {
    const ctx = (error as { context?: Response }).context;
    const j = ctx ? await ctx.json() : null;
    return { error: j?.error ?? 'Something went wrong. Please try again.' };
  } catch {
    return { error: 'Check your connection and try again.' };
  }
}

const Chip = ({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={cn('rounded-full px-3.5 py-2 text-[14px] font-semibold transition', on ? 'bg-blue-600 text-white shadow-sm' : 'bg-muted text-foreground')}
  >
    {children}
  </button>
);

/**
 * Choir page → Compose a song. Say what the song is about; the song helper writes a
 * full Christian song (words, chords, choir and band notes) as the writer's draft;
 * then, if wanted, the full song with music. Drafts are the writer's own until shared.
 */
const ComposeSongPage = () => {
  const { locationId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const openId = params.get('song');

  const [brief, setBrief] = useState<Brief>({ theme: '', scripture: '', style: 'gospel_choir', feel: 'mid', key: '', language: '', notes: '' });
  const [writing, setWriting] = useState(false);
  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [current, setCurrent] = useState<Draft | null>(null);
  const poll = useRef<number | null>(null);

  const loadDrafts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('song_drafts' as never).select('*').eq('location', locationId).order('created_at', { ascending: false }).limit(50);
    setDrafts(((data ?? []) as unknown as Draft[]));
  }, [user, locationId]);
  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  // The song open in the address (?song=<id>), so Back returns to the list
  useEffect(() => {
    if (!openId) return setCurrent(null);
    const found = drafts?.find((d) => d.id === openId);
    if (found) setCurrent(found);
    else if (drafts) {
      supabase.from('song_drafts' as never).select('*').eq('id', openId).maybeSingle().then(({ data }) => setCurrent((data as unknown as Draft) ?? null));
    }
  }, [openId, drafts]);

  // While the music is being made, look every few seconds
  useEffect(() => {
    if (poll.current) window.clearInterval(poll.current);
    if (current?.audio_status !== 'making') return;
    poll.current = window.setInterval(async () => {
      const { data } = await supabase.from('song_drafts' as never).select('*').eq('id', current.id).maybeSingle();
      if (data) {
        const d = data as unknown as Draft;
        setCurrent(d);
        setDrafts((list) => list?.map((x) => (x.id === d.id ? d : x)) ?? list);
      }
    }, 5000);
    return () => {
      if (poll.current) window.clearInterval(poll.current);
    };
  }, [current?.id, current?.audio_status]);

  useEffect(() => {
    if (!writing) return;
    const t = window.setInterval(() => setStep((s) => (s + 1) % WRITING.length), 4000);
    return () => window.clearInterval(t);
  }, [writing]);

  const open = (d: Draft) => setParams({ song: d.id });

  const write = async (from?: Brief) => {
    const b = from ?? brief;
    if (b.theme.trim().length < 3) {
      appAlert('What is the song about?', 'Write a few words about the song: a theme, a testimony, a prayer.', 'info');
      return;
    }
    setWriting(true);
    setStep(0);
    const r = await call({ action: 'write', ...b, location: locationId, churchId: currentChurchId });
    setWriting(false);
    if (r.refused) {
      appAlert("That one isn't for the song helper", r.refused, 'info');
      return;
    }
    if (!r.draft) {
      appAlert("Couldn't write the song", r.error ?? 'Please try again.', 'error');
      return;
    }
    setDrafts((list) => [r.draft!, ...(list ?? [])]);
    open(r.draft);
    window.scrollTo({ top: 0 });
  };

  const makeMusic = async () => {
    if (!current) return;
    setCurrent({ ...current, audio_status: 'making', music_requested_at: new Date().toISOString() });
    const r = await call({ action: 'music', draftId: current.id });
    if (!r.draft) {
      appAlert("Couldn't make the music", r.error ?? 'Please try again later.', 'error');
      const { data } = await supabase.from('song_drafts' as never).select('*').eq('id', current.id).maybeSingle();
      if (data) setCurrent(data as unknown as Draft);
      return;
    }
    setCurrent(r.draft);
  };

  const toggleShare = async () => {
    if (!current) return;
    const shared = !current.shared;
    setCurrent({ ...current, shared });
    const { error } = await supabase.from('song_drafts' as never).update({ shared } as never).eq('id', current.id);
    if (error) {
      setCurrent({ ...current, shared: !shared });
      appAlert("Couldn't change that", 'Please try again.', 'error');
      return;
    }
    setDrafts((list) => list?.map((x) => (x.id === current.id ? { ...x, shared } : x)) ?? list);
    appAlert(shared ? 'Shared with the choir' : 'Only you can see it now');
  };

  const remove = async () => {
    if (!current || !window.confirm(`Delete "${current.title}"?`)) return;
    const { error } = await supabase.from('song_drafts' as never).delete().eq('id', current.id);
    if (error) return appAlert("Couldn't delete it", 'Please try again.', 'error');
    setDrafts((list) => list?.filter((x) => x.id !== current.id) ?? list);
    setParams({});
  };

  const back = { label: current ? 'Compose a song' : choirName(locationId), onClick: () => (current ? setParams({}) : navigate(`/groups/choir/${locationId}`)) };

  if (!user) {
    return (
      <Page>
        <PageTitle title="Compose a song" back={back} />
        <p className="text-[15px] text-muted-foreground">Sign in to compose songs for the choir.</p>
        <button onClick={() => navigate(`/auth?next=${encodeURIComponent(`/groups/choir/${locationId}/compose`)}`)} className="mt-4 h-12 w-full rounded-2xl bg-blue-600 text-[15px] font-semibold text-white">
          Sign in
        </button>
      </Page>
    );
  }

  if (current) {
    const mine = current.created_by === user.id;
    const stuck = current.audio_status === 'making' && current.music_requested_at && Date.now() - Date.parse(current.music_requested_at) > MAKING_MAX_MS;
    return (
      <Page>
        <PageTitle title="" back={back} />
        <div className="-mt-4">
          <SongSheet song={current.song} />

          <SectionLabel>The music</SectionLabel>
          <div className="rounded-[22px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800" data-testid="song-music">
            {current.audio_status === 'ready' && current.audio_url ? (
              <>
                <audio controls preload="metadata" src={current.audio_url} className="w-full" />
                <div className="mt-3 flex gap-2">
                  <a href={current.audio_url} download={`${current.title}.mp3`} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-muted py-2.5 text-[14px] font-semibold text-foreground">
                    <Download className="h-4 w-4" /> Save
                  </a>
                  {mine && (
                    <button type="button" onClick={makeMusic} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-muted py-2.5 text-[14px] font-semibold text-foreground">
                      <RotateCcw className="h-4 w-4" /> Make it again
                    </button>
                  )}
                </div>
              </>
            ) : current.audio_status === 'making' && !stuck ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 shrink-0 animate-spin text-blue-600" />
                <div>
                  <p className="text-[15px] font-semibold text-foreground">Making the music…</p>
                  <p className="text-[13px] text-muted-foreground">Voices, choir and band. It takes a minute or two; you can leave this page and come back.</p>
                </div>
              </div>
            ) : mine ? (
              <>
                {(current.audio_status === 'failed' || stuck) && (
                  <p className="mb-3 text-[13.5px] text-red-600 dark:text-red-400">The music couldn't be made last time. Try again in a little while.</p>
                )}
                <button type="button" onClick={makeMusic} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-[15px] font-semibold text-white">
                  <Music2 className="h-5 w-5" /> Make the full song
                </button>
                <p className="mt-2 text-[12.5px] text-muted-foreground">A produced version with a lead voice, the choir and the band, about three minutes long.</p>
              </>
            ) : (
              <p className="text-[14px] text-muted-foreground">No music for this song yet.</p>
            )}
          </div>

          {mine && (
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={toggleShare} className="flex items-center justify-center gap-1.5 rounded-2xl bg-muted py-3 text-[14px] font-semibold text-foreground">
                {current.shared ? <Users className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {current.shared ? 'Shared with choir' : 'Share with choir'}
              </button>
              <button type="button" onClick={() => write(current.brief)} disabled={writing} className="flex items-center justify-center gap-1.5 rounded-2xl bg-muted py-3 text-[14px] font-semibold text-foreground disabled:opacity-50">
                {writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />} Another version
              </button>
              <button type="button" onClick={remove} className="col-span-2 flex items-center justify-center gap-1.5 rounded-2xl py-3 text-[14px] font-semibold text-red-600 dark:text-red-400">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          )}
          <p className="mt-4 px-1 text-[12.5px] leading-snug text-muted-foreground">
            A first draft: pray over it, sing it through, and change anything until it's yours.
          </p>
        </div>
      </Page>
    );
  }

  const mineList = (drafts ?? []).filter((d) => d.created_by === user.id);
  const shared = (drafts ?? []).filter((d) => d.created_by !== user.id);
  const field = 'w-full rounded-2xl border border-border bg-card px-4 py-3 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:border-blue-500';

  return (
    <Page>
      <PageTitle icon={PenLine} tint="bg-gradient-to-br from-indigo-500 to-purple-600" title="Compose a song" subtitle={`For ${choirName(locationId)}: words, chords and music`} back={back} />

      <div className="space-y-4" data-testid="compose-form">
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold text-foreground">What is the song about?</span>
          <textarea
            value={brief.theme}
            onChange={(e) => setBrief({ ...brief, theme: e.target.value.slice(0, 600) })}
            rows={3}
            placeholder="A testimony, a prayer, a theme from Sunday's message…"
            className={`${field} resize-none`}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold text-foreground">Scripture <span className="font-normal text-muted-foreground">(optional)</span></span>
          <input value={brief.scripture} onChange={(e) => setBrief({ ...brief, scripture: e.target.value.slice(0, 200) })} placeholder="e.g. Psalm 23, Isaiah 40:31" className={field} />
        </label>
        <div>
          <span className="mb-1.5 block text-[14px] font-semibold text-foreground">Style</span>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <Chip key={s.id} on={brief.style === s.id} onClick={() => setBrief({ ...brief, style: s.id })}>{s.label}</Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="mb-1.5 block text-[14px] font-semibold text-foreground">Tempo</span>
            <div className="flex gap-2">
              {FEELS.map((f) => (
                <Chip key={f.id} on={brief.feel === f.id} onClick={() => setBrief({ ...brief, feel: f.id })}>{f.label}</Chip>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-semibold text-foreground">Key</span>
            <select value={brief.key} onChange={(e) => setBrief({ ...brief, key: e.target.value })} className="h-10 rounded-full border border-border bg-card px-3 text-[15px] text-foreground">
              {KEYS.map((k) => (
                <option key={k} value={k}>{k || 'Any key'}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold text-foreground">Anything else <span className="font-normal text-muted-foreground">(optional)</span></span>
          <input value={brief.notes} onChange={(e) => setBrief({ ...brief, notes: e.target.value.slice(0, 600) })} placeholder="A line you want in it, a Yoruba chorus, for Easter…" className={field} />
        </label>
        <button type="button" onClick={() => write()} disabled={writing} className="flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-[16px] font-semibold text-white shadow-sm disabled:opacity-80">
          {writing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> {WRITING[step]}
            </>
          ) : (
            <>
              <PenLine className="h-5 w-5" /> Write the song
            </>
          )}
        </button>
        <p className="px-1 text-[12.5px] leading-snug text-muted-foreground">A first draft to pray over, sing through and make your own. Only Christian worship and gospel songs.</p>
      </div>

      {!!mineList.length && (
        <>
          <SectionLabel>My songs</SectionLabel>
          <ListGroup>
            {mineList.map((d) => (
              <DraftRow key={d.id} d={d} onOpen={() => open(d)} />
            ))}
          </ListGroup>
        </>
      )}
      {!!shared.length && (
        <>
          <SectionLabel>Shared with the choir</SectionLabel>
          <ListGroup>
            {shared.map((d) => (
              <DraftRow key={d.id} d={d} onOpen={() => open(d)} />
            ))}
          </ListGroup>
        </>
      )}
    </Page>
  );
};

const DraftRow = ({ d, onOpen }: { d: Draft; onOpen: () => void }) => (
  <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
      {d.audio_status === 'ready' ? <Music2 className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-semibold text-foreground">{d.title}</span>
      <span className="block truncate text-[12.5px] text-muted-foreground">
        Key {d.song.key} · {d.song.bpm} BPM{d.audio_status === 'ready' ? ' · with music' : d.audio_status === 'making' ? ' · making the music…' : ''}{d.shared ? ' · shared' : ''}
      </span>
    </span>
  </button>
);

export default ComposeSongPage;
