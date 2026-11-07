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
  languageMode?: 'chorus' | 'all';
  notes?: string;
}

/** The styles the song helper writes in (ids match the song-writer function) */
const STYLE_GROUPS: { name: string; styles: { id: string; label: string }[] }[] = [
  { name: 'Gospel', styles: [
    { id: 'gospel_choir', label: 'Gospel choir' }, { id: 'contemporary_gospel', label: 'Contemporary gospel' }, { id: 'traditional_gospel', label: 'Traditional gospel' },
    { id: 'praise', label: 'Upbeat praise' }, { id: 'ballad', label: 'Gospel ballad' }, { id: 'gospel_rap', label: 'Gospel hip hop' },
  ] },
  { name: 'Worship', styles: [
    { id: 'worship', label: 'Worship' }, { id: 'acoustic_worship', label: 'Acoustic worship' }, { id: 'anthem', label: 'Choir anthem' }, { id: 'celtic_worship', label: 'Celtic worship' },
  ] },
  { name: 'African', styles: [
    { id: 'afro_gospel', label: 'Afro gospel' }, { id: 'highlife', label: 'Highlife praise' }, { id: 'afrobeats_worship', label: 'Afrobeats worship' },
    { id: 'amapiano_gospel', label: 'Amapiano gospel' }, { id: 'naija_praise', label: 'Naija praise' }, { id: 'south_african_choir', label: 'South African choir' },
  ] },
  { name: 'Hymns and more', styles: [
    { id: 'hymn', label: 'Modern hymn' }, { id: 'traditional_hymn', label: 'Traditional hymn' }, { id: 'southern_gospel', label: 'Southern gospel' },
    { id: 'reggae_gospel', label: 'Reggae gospel' }, { id: 'children', label: "Children's praise" }, { id: 'christmas', label: 'Christmas' }, { id: 'easter', label: 'Easter' },
  ] },
];
const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Nigerian Pidgin', 'Hausa', 'Twi', 'Swahili', 'Zulu', 'Lingala', 'Shona', 'French', 'Spanish', 'Portuguese', 'Irish', 'Polish', 'Romanian', 'Tagalog'];
/** Ideas to start from: a theme and the Scripture behind it */
const IDEAS: { theme: string; scripture: string }[] = [
  { theme: 'The Lord is my Shepherd, even in the valley', scripture: 'Psalm 23' },
  { theme: 'Those who wait on the Lord will rise on wings like eagles', scripture: 'Isaiah 40:31' },
  { theme: 'Thanksgiving for a year God carried us through', scripture: 'Psalm 103' },
  { theme: 'The blood of Jesus that washes us clean', scripture: '1 John 1:7' },
  { theme: 'Peace that passes understanding in an anxious season', scripture: 'Philippians 4:6-7' },
  { theme: 'Jesus calms the storm', scripture: 'Mark 4:35-41' },
  { theme: 'The empty tomb: He is risen', scripture: 'Matthew 28' },
  { theme: 'Come, Holy Spirit, fill this house', scripture: 'Acts 2' },
  { theme: 'The prodigal son and the running Father', scripture: 'Luke 15:11-32' },
  { theme: 'Joy comes in the morning', scripture: 'Psalm 30:5' },
  { theme: 'Nothing can separate us from the love of God', scripture: 'Romans 8:38-39' },
  { theme: 'Here I am, Lord, send me', scripture: 'Isaiah 6:8' },
  { theme: 'Healing and hope for the sick', scripture: 'James 5:14-16' },
  { theme: 'The God who makes a way in the wilderness', scripture: 'Isaiah 43:19' },
  { theme: 'Worthy is the Lamb', scripture: 'Revelation 5' },
  { theme: 'A prayer for our families and our children', scripture: 'Joshua 24:15' },
  { theme: 'The Word became flesh: the joy of Christmas', scripture: 'John 1:14' },
  { theme: 'Grace for the one who fell again', scripture: 'Lamentations 3:22-23' },
  { theme: 'Dry bones live: revival in the land', scripture: 'Ezekiel 37' },
  { theme: 'A song for the newly baptised', scripture: 'Romans 6:4' },
  { theme: "Jesus, friend of sinners, at Zacchaeus's door", scripture: 'Luke 19:1-10' },
  { theme: 'Strength for the migrant far from home', scripture: 'Psalm 121' },
  { theme: 'Victory in Jesus over fear', scripture: '2 Timothy 1:7' },
  { theme: 'The wedding feast and the new wine', scripture: 'John 2:1-11' },
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

  const [brief, setBrief] = useState<Brief>({ theme: '', scripture: '', style: 'gospel_choir', feel: 'mid', key: '', language: 'English', languageMode: 'chorus', notes: '' });
  const [count, setCount] = useState(1);
  const [ideas, setIdeas] = useState(() => [...IDEAS].sort(() => Math.random() - 0.5).slice(0, 4));
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

  const write = async (from?: Brief, howMany = 1) => {
    const b = from ?? brief;
    if (b.theme.trim().length < 3) {
      appAlert('What is the song about?', 'Write a few words about the song: a theme, a testimony, a prayer.', 'info');
      return;
    }
    setWriting(true);
    setStep(0);
    // Several songs from one brief: each is written separately, so they all differ
    const results = await Promise.all(
      Array.from({ length: howMany }, () => call({ action: 'write', ...b, language: b.language === 'English' ? '' : b.language, location: locationId, churchId: currentChurchId })),
    );
    setWriting(false);
    const written = results.flatMap((r) => (r.draft ? [r.draft] : []));
    const refused = results.find((r) => r.refused)?.refused;
    if (!written.length) {
      if (refused) appAlert("That one isn't for the song helper", refused, 'info');
      else appAlert("Couldn't write the song", results.find((r) => r.error)?.error ?? 'Please try again.', 'error');
      return;
    }
    setDrafts((list) => [...written, ...(list ?? [])]);
    if (written.length > 1) appAlert(`${written.length} new songs`, 'They are all in My songs. Here is the first.', 'success');
    else if (howMany > 1) appAlert('1 new song', "The others couldn't be written just now.", 'info');
    open(written[0]);
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
                  <a href={current.audio_url} download={`${current.title}.${current.audio_url.split('?')[0].split('.').pop() || 'mp3'}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-muted py-2.5 text-[14px] font-semibold text-foreground">
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
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-muted-foreground">Ideas</span>
            <button type="button" onClick={() => setIdeas([...IDEAS].sort(() => Math.random() - 0.5).slice(0, 4))} className="text-[13px] font-semibold text-blue-600 dark:text-blue-400">More ideas</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ideas.map((i) => (
              <button key={i.theme} type="button" onClick={() => setBrief({ ...brief, theme: i.theme, scripture: i.scripture })} className="rounded-2xl border border-border bg-card px-3 py-2 text-left text-[13px] leading-snug text-foreground active:bg-muted">
                {i.theme} <span className="text-muted-foreground">· {i.scripture}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold text-foreground">Scripture <span className="font-normal text-muted-foreground">(optional)</span></span>
          <input value={brief.scripture} onChange={(e) => setBrief({ ...brief, scripture: e.target.value.slice(0, 200) })} placeholder="e.g. Psalm 23, Isaiah 40:31" className={field} />
        </label>
        <div>
          <span className="mb-1 block text-[14px] font-semibold text-foreground">Style</span>
          <div className="space-y-2.5">
            {STYLE_GROUPS.map((g) => (
              <div key={g.name}>
                <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">{g.name}</span>
                <div className="flex flex-wrap gap-2">
                  {g.styles.map((st) => (
                    <Chip key={st.id} on={brief.style === st.id} onClick={() => setBrief({ ...brief, style: st.id })}>{st.label}</Chip>
                  ))}
                </div>
              </div>
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
        <div>
          <span className="mb-1.5 block text-[14px] font-semibold text-foreground">Language</span>
          <div className="flex flex-wrap items-center gap-2">
            <select value={brief.language} onChange={(e) => setBrief({ ...brief, language: e.target.value })} className="h-10 rounded-full border border-border bg-card px-3 text-[15px] text-foreground" aria-label="Language">
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            {brief.language !== 'English' && (
              <>
                <Chip on={brief.languageMode === 'chorus'} onClick={() => setBrief({ ...brief, languageMode: 'chorus' })}>Chorus only</Chip>
                <Chip on={brief.languageMode === 'all'} onClick={() => setBrief({ ...brief, languageMode: 'all' })}>Whole song</Chip>
              </>
            )}
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold text-foreground">Anything else <span className="font-normal text-muted-foreground">(optional)</span></span>
          <input value={brief.notes} onChange={(e) => setBrief({ ...brief, notes: e.target.value.slice(0, 600) })} placeholder="A line you want in it, a Yoruba chorus, for Easter…" className={field} />
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-foreground">How many songs</span>
          {[1, 2, 3].map((n) => (
            <Chip key={n} on={count === n} onClick={() => setCount(n)}>{n}</Chip>
          ))}
        </div>
        <button type="button" onClick={() => write(undefined, count)} disabled={writing} className="flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-[16px] font-semibold text-white shadow-sm disabled:opacity-80">
          {writing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> {WRITING[step]}
            </>
          ) : (
            <>
              <PenLine className="h-5 w-5" /> {count > 1 ? `Write ${count} songs` : 'Write the song'}
            </>
          )}
        </button>
        <p className="px-1 text-[12.5px] leading-snug text-muted-foreground">A first draft to pray over, sing through and make your own. Only Christian worship and gospel songs. Lines in another language are worth checking with a native speaker.</p>
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
