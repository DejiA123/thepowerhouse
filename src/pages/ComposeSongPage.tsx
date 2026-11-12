import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, Download, KeyRound, Loader2, Music2, PenLine, RotateCcw, Settings2, Share2, Trash2, Undo2, Users } from 'lucide-react';
import { Page, PageTitle, SectionLabel, ListGroup } from '@/components/page/PageKit';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { appAlert } from '@/lib/appAlert';
import { prepareSave, saveToPhone } from '@/lib/saveMedia';
import { cn } from '@/lib/utils';
import { currentChurchId } from '@/lib/churchSpace';
import { choirName, songKey } from '@/lib/choirChat';
import HoldButton from '@/components/common/HoldButton';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import SongSheet, { type ComposedSong } from '@/components/choir/SongSheet';
import MusicProgress from '@/components/choir/MusicProgress';
import SplitProgress from '@/components/choir/SplitProgress';
import SongWordsEditor from '@/components/choir/SongWordsEditor';
import { SongParts } from '@/components/choir/SongParts';
import { partForSections, usePartPlayer, type PartTime } from '@/lib/songParts';
import LiveProgress, { type Stage } from '@/components/choir/LiveProgress';
import { FieldLabel, FormCard, KeyGrid, Segmented, StylePicker, type SegmentOption, type StyleFamily } from '@/components/choir/ComposeControls';

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
  audio_error?: string | null;
  /** The song on the church's music server, while it's made */
  audio_job?: { service: string; task_id?: string; submitted_at: string; studio?: boolean } | null;
  /** Where each section is in the recording (Listen by part) */
  audio_sections?: PartTime[] | null;
  /** The same recording without the voices, and the voices alone (music server, Demucs) */
  instrumental_url?: string | null;
  vocals_url?: string | null;
  /** The backing track: the studio playing the song again with no singer at all */
  backing_url?: string | null;
  backing_status?: 'none' | 'making' | 'ready' | 'failed' | null;
  backing_job?: { requested_at?: string; task_id?: string; studio?: boolean } | null;
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
  /** The lead singer for the music: auto, female, male or a duet */
  voice?: Voice;
  /** Who Auto picked for the last music (it takes turns: female, male) */
  sung?: 'female' | 'male';
  /** Made on the studio server (Advanced settings → Studio quality music) */
  quality?: 'studio';
}

type Voice = 'auto' | 'female' | 'male' | 'duet';
const VOICES: { id: Voice; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'duet', label: 'Duet' },
];

/** The styles the song helper writes in (ids match the song-writer function), by family, each with what it sounds like */
const STYLE_FAMILIES: StyleFamily[] = [
  { name: 'Gospel', tab: 'Gospel', styles: [
    { id: 'gospel_choir', label: 'Gospel choir', hint: 'Mass choir, Hammond, a shouting vamp' },
    { id: 'contemporary_gospel', label: 'Contemporary', hint: 'Modern grooves, lush choir stacks' },
    { id: 'christian_rnb', label: 'Christian R&B', hint: 'Smooth, soulful, Rhodes and runs' },
    { id: 'traditional_gospel', label: 'Traditional', hint: 'Organ, shuffle, call and response' },
    { id: 'praise', label: 'Upbeat praise', hint: 'Fast, brass stabs, the choir shouts back' },
    { id: 'ballad', label: 'Gospel ballad', hint: 'Tender, piano and strings' },
    { id: 'gospel_rap', label: 'Gospel hip hop', hint: 'Sung chorus, rapped verses' },
  ] },
  { name: 'Worship', tab: 'Worship', styles: [
    { id: 'worship', label: 'Worship', hint: 'Pads and guitars, builds to an anthem' },
    { id: 'acoustic_worship', label: 'Acoustic', hint: 'Guitar and piano, close and prayerful' },
    { id: 'anthem', label: 'Choir anthem', hint: 'Orchestra, timpani, a key change' },
    { id: 'celtic_worship', label: 'Celtic worship', hint: 'Whistle, fiddle and bodhrán' },
  ] },
  { name: 'African', tab: 'African', styles: [
    { id: 'afro_gospel', label: 'Afro gospel', hint: 'Talking drums, highlife guitar, horns' },
    { id: 'highlife', label: 'Highlife praise', hint: 'Palm-wine guitar, a church dance' },
    { id: 'afrobeats_worship', label: 'Afrobeats worship', hint: 'Log drums, warm keys, choir on the hook' },
    { id: 'amapiano_gospel', label: 'Amapiano gospel', hint: 'Log-drum bass, a laid-back groove' },
    { id: 'naija_praise', label: 'Naija praise', hint: 'Fast, talking drum, everyone sings' },
    { id: 'south_african_choir', label: 'South African choir', hint: 'A cappella harmony, stomps and claps' },
  ] },
  { name: 'Hymns and more', tab: 'Hymns', styles: [
    { id: 'hymn', label: 'Modern hymn', hint: 'Singable melody, piano and strings' },
    { id: 'traditional_hymn', label: 'Traditional hymn', hint: 'Organ, four-part harmony' },
    { id: 'southern_gospel', label: 'Southern gospel', hint: 'Piano and quartet harmony' },
    { id: 'reggae_gospel', label: 'Reggae gospel', hint: 'One-drop rhythm, joyful and relaxed' },
    { id: 'children', label: "Children's praise", hint: 'Simple words and actions' },
    { id: 'christmas', label: 'Christmas', hint: 'Bells, strings and choir' },
    { id: 'easter', label: 'Easter', hint: 'From the cross to the empty tomb' },
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
const FEELS: SegmentOption<string>[] = [
  { value: 'slow', label: 'Slow', sub: '60–72' },
  { value: 'mid', label: 'Mid', sub: '76–96' },
  { value: 'fast', label: 'Fast', sub: '110–132' },
];
const KEYS = ['', 'C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb'];
/** What the song helper is doing while it writes (a first draft, then an editor's pass: ~10–16 s, measured Nov 2026) */
const WRITING: Stage[] = [
  { from: 0, text: 'Reading the Scripture' },
  { from: 0.1, text: 'Finding the words' },
  { from: 0.26, text: 'Shaping the chorus' },
  { from: 0.42, text: 'Setting the chords' },
  { from: 0.56, text: 'Writing the choir and band parts' },
  { from: 0.68, text: "Editor's pass: tightening every line" },
  { from: 0.86, text: 'Final polish' },
];
const writeSeconds = (n: number) => 15 + 4 * (n - 1);
/** The function gives a song up after 25 minutes (the first song wakes the music server) */
const MAKING_MAX_MS = 26 * 60_000;

/** The church's music service: which one is connected (the key itself never leaves the server) */
interface MusicService {
  services: { service: 'acemusic' | 'huggingface'; hint: string | null; updated_at: string }[];
  canManage: boolean;
  /** The church's choice (Advanced settings, admins only): studio quality music for everyone; on by default */
  studio?: boolean;
  platform: { acestep?: boolean; studio?: boolean; acemusic: boolean; huggingface: boolean; lyria: boolean; elevenlabs: boolean };
}
const SERVICE_NAME = { acemusic: 'ACE Music', huggingface: 'Hugging Face' } as const;
const hasService = (m: MusicService | null) => !!m && (m.services.length > 0 || !!m.platform.acestep || m.platform.acemusic || m.platform.huggingface);

type Answer = { draft?: Draft; refused?: string; error?: string } & Partial<MusicService>;

/** The function's own message for an error (it answers JSON with "error") */
async function call(body: Record<string, unknown>): Promise<Answer> {
  const { data, error } = await supabase.functions.invoke('song-writer', { body });
  if (!error) return data as Answer;
  try {
    const ctx = (error as { context?: Response }).context;
    const j = ctx ? await ctx.json() : null;
    return { error: j?.error ?? 'Something went wrong. Please try again.' };
  } catch {
    return { error: 'Check your connection and try again.' };
  }
}

/**
 * Writes one song, and doesn't give up on a busy moment: if the song helper says it's
 * busy (or the connection drops), it's asked again by itself, up to three times in all,
 * while the progress card keeps going. Only a real answer (a song, or "that one isn't
 * for the song helper") or three failures end it.
 */
async function writeOne(body: Record<string, unknown>): Promise<Answer> {
  let last: Answer = {};
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2500));
    last = await call(body);
    if (last.draft || last.refused) return last;
    if (!/busy|went wrong|connection/i.test(last.error ?? '')) return last;
  }
  return last;
}

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

  const [brief, setBrief] = useState<Brief>({ theme: '', scripture: '', style: 'gospel_choir', feel: 'mid', key: '', language: 'English', languageMode: 'chorus', notes: '', voice: 'auto' });
  const [count, setCount] = useState(1);
  const [ideas, setIdeas] = useState(() => [...IDEAS].sort(() => Math.random() - 0.5).slice(0, 4));
  const [writing, setWriting] = useState(false);
  /** The live progress while writing: when it started, how many songs, finished */
  const [writeRun, setWriteRun] = useState<{ at: number; count: number; done: boolean } | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [current, setCurrent] = useState<Draft | null>(null);
  const poll = useRef<number | null>(null);
  const [service, setService] = useState<MusicService | null>(null);
  /** The lead voice for this song's music (its own saved choice, Auto until changed) */
  const [voice, setVoice] = useState<Voice>('auto');
  // Studio quality music: the church's choice, on by default; only church admins see the
  // switch (Advanced settings), and the song helper follows it for everyone
  const studio = service?.studio !== false;
  const studioReady = !!service?.platform.studio;
  const useStudio = studio && studioReady;
  const setStudio = async (on: boolean) => {
    if (!service) return;
    const before = service;
    setService({ ...service, studio: on });
    const r = await call({ action: 'compose-settings', churchId: currentChurchId, studio: on });
    if (r.error) {
      setService(before);
      appAlert("Couldn't change that", r.error, 'error');
    } else if ((r as unknown as MusicService).services) setService(r as unknown as MusicService);
  };
  /** Editing the words of the open song */
  const [editing, setEditing] = useState(false);
  /** The words before the last save, so it can be undone (this song, this visit) */
  const [undoWords, setUndoWords] = useState<{ id: string; song: ComposedSong } | null>(null);
  useEffect(() => {
    setEditing(false);
    setUndoWords((u) => (u && u.id === current?.id ? u : null));
  }, [current?.id]);
  useEffect(() => setVoice(current?.brief?.voice ?? 'auto'), [current?.id, current?.brief?.voice]);

  // Listen by part: the recording's sections (worked out once by the function for songs
  // made before it did so automatically)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const parts = current?.audio_status === 'ready' && Array.isArray(current.audio_sections) && current.audio_sections.length ? current.audio_sections : null;
  const partPlayer = usePartPlayer(audioEl, parts);
  const [partsLoading, setPartsLoading] = useState(false);
  const askedParts = useRef(new Set<string>());
  useEffect(() => {
    const d = current;
    if (!d || d.audio_status !== 'ready' || !d.audio_url || (Array.isArray(d.audio_sections) && d.audio_sections.length) || askedParts.current.has(`${d.id}:${d.audio_url}`)) return;
    askedParts.current.add(`${d.id}:${d.audio_url}`);
    setPartsLoading(true);
    void call({ action: 'sections', draftId: d.id }).then((r) => {
      setPartsLoading(false);
      const found = (r as { sections?: PartTime[] | null }).sections;
      if (!found?.length) return;
      setCurrent((c) => (c && c.id === d.id ? { ...c, audio_sections: found } : c));
      setDrafts((list) => list?.map((x) => (x.id === d.id ? { ...x, audio_sections: found } : x)) ?? list);
    });
  }, [current]);

  // Full song / Music only / Voices only: the same recording, split by the music server.
  // Songs made before the split get theirs on first open (asked again while it's busy).
  const [version, setVersion] = useState<Version>('full');
  useEffect(() => setVersion('full'), [current?.id, current?.audio_url]);
  // While they're made: a live progress card. When the split began is kept on the phone,
  // so coming back to the page carries on from the right place.
  const [split, setSplit] = useState<{ startedAt: number; done?: boolean } | null>(null);
  const askedStems = useRef(new Set<string>());
  const stemsFor = current?.audio_status === 'ready' && current.audio_url && !current.instrumental_url ? { id: current.id, url: current.audio_url } : null;
  useEffect(() => {
    const d = stemsFor;
    if (!d) return;
    const asked = askedStems.current;
    const key = `${d.id}:${d.url}`;
    if (asked.has(key)) return;
    asked.add(key);
    let stop = false;
    const startedAt = splitStart(d.id, d.url);
    setSplit({ startedAt });
    void (async () => {
      // Each ask waits on the server up to ~2 minutes; keep asking while it's still busy
      while (!stop && Date.now() - startedAt < SPLIT_GIVE_UP_MS) {
        const r = (await call({ action: 'stems', draftId: d.id }).catch(() => ({ state: 'busy' }))) as { state?: string; instrumental_url?: string | null; vocals_url?: string | null };
        if (stop) return;
        if (r.instrumental_url) {
          forgetSplit(d.id);
          setSplit({ startedAt, done: true });
          await new Promise((ok) => setTimeout(ok, 800));
          if (stop) return;
          const patch = { instrumental_url: r.instrumental_url, vocals_url: r.vocals_url ?? null };
          setCurrent((c) => (c && c.id === d.id ? { ...c, ...patch } : c));
          setDrafts((list) => list?.map((x) => (x.id === d.id ? { ...x, ...patch } : x)) ?? list);
          break;
        }
        if (r.state !== 'busy') break;
        await new Promise((ok) => setTimeout(ok, 15_000));
      }
      if (!stop) setSplit(null);
    })();
    return () => {
      stop = true;
      asked.delete(key);
      setSplit(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per song and recording
  }, [stemsFor?.id, stemsFor?.url]);
  const versionUrl = current ? (version === 'music' ? current.instrumental_url : version === 'voices' ? current.vocals_url : current.audio_url) || current.audio_url : null;
  // The backing track: asked for by the writer, then watched until it's there
  const makeBacking = async () => {
    if (!current) return;
    const r = await call({ action: 'backing', draftId: current.id });
    if (r.draft) setCurrent(r.draft);
    else appAlert("Couldn't start the backing track", r.error ?? 'Please try again.', 'error');
  };
  const backingId = current?.backing_status === 'making' ? current.id : null;
  useEffect(() => {
    if (!backingId) return;
    let stop = false;
    const tick = async () => {
      const r = await call({ action: 'backing-check', draftId: backingId });
      if (!stop && r.draft) setCurrent((c) => (c && c.id === backingId ? { ...c, backing_status: r.draft!.backing_status, backing_url: r.draft!.backing_url, backing_job: r.draft!.backing_job } : c));
    };
    const t = window.setInterval(tick, 6000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [backingId]);

  /** Switching version carries on from the same moment (and keeps playing if it was) */
  const resume = useRef<{ t: number; play: boolean } | null>(null);
  const switchVersion = (v: Version) => {
    if (v === version) return;
    if (audioEl) {
      resume.current = { t: audioEl.currentTime, play: !audioEl.paused };
      audioEl.dataset.switching = '1';
    }
    setVersion(v);
  };
  useEffect(() => {
    const el = audioEl;
    const r = resume.current;
    if (!el || !r) return;
    const go = () => {
      el.currentTime = r.t;
      if (r.play) void el.play().catch(() => undefined);
      resume.current = null;
      delete el.dataset.switching;
    };
    if (el.readyState >= 1) go();
    else el.addEventListener('loadedmetadata', go, { once: true });
    return () => el.removeEventListener('loadedmetadata', go);
  }, [audioEl, versionUrl]);
  // The part being heard right now, to light up its words on the sheet
  const [nowPart, setNowPart] = useState<number | null>(null);
  useEffect(() => {
    if (!audioEl || !parts) {
      setNowPart(null);
      return;
    }
    const tick = () => {
      const t = audioEl.currentTime;
      const k = audioEl.paused && t === 0 ? -1 : parts.findIndex((p) => t >= p.start - 0.5 && t < p.end);
      setNowPart(k >= 0 ? k : null);
    };
    audioEl.addEventListener('timeupdate', tick);
    audioEl.addEventListener('seeked', tick);
    return () => {
      audioEl.removeEventListener('timeupdate', tick);
      audioEl.removeEventListener('seeked', tick);
    };
  }, [audioEl, parts]);

  const loadDrafts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('song_drafts' as never).select('*').eq('location', locationId).order('created_at', { ascending: false }).limit(50);
    setDrafts(((data ?? []) as unknown as Draft[]));
  }, [user, locationId]);
  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  // Which music service the church has connected (church admins can connect one here)
  useEffect(() => {
    if (!user) return;
    call({ action: 'music-service', churchId: currentChurchId }).then((r) => {
      if (r.services) setService(r as MusicService);
    });
  }, [user]);

  // My song with no music yet is open: the music studio starts waking (it takes a couple of
  // minutes to load), so "Make the full song" is quicker. At most once every 4 minutes.
  const needsMusic = !!current && !!user && current.created_by === user.id && !current.audio_url && current.audio_status !== 'making';
  useEffect(() => {
    if (!needsMusic) return;
    try {
      const last = Number(sessionStorage.getItem('music_warm_at') || 0);
      if (Date.now() - last < 4 * 60_000) return;
      sessionStorage.setItem('music_warm_at', String(Date.now()));
    } catch {
      /* no storage: just ask */
    }
    void call({ action: 'warm', churchId: currentChurchId });
  }, [needsMusic, current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // The song open in the address (?song=<id>), so Back returns to the list
  useEffect(() => {
    if (!openId) return setCurrent(null);
    const found = drafts?.find((d) => d.id === openId);
    if (found) setCurrent(found);
    else if (drafts) {
      supabase.from('song_drafts' as never).select('*').eq('id', openId).maybeSingle().then(({ data }) => setCurrent((data as unknown as Draft) ?? null));
    }
  }, [openId, drafts]);

  // While the music is being made, ask every few seconds (the function looks at the
  // music server's task and stores the song when it's ready; the draft itself if that fails)
  useEffect(() => {
    if (poll.current) window.clearInterval(poll.current);
    if (current?.audio_status !== 'making') return;
    let busy = false;
    poll.current = window.setInterval(async () => {
      if (busy || document.hidden) return;
      busy = true;
      const r = await call({ action: 'music-check', draftId: current.id });
      let d = r.draft;
      if (!d) {
        const { data } = await supabase.from('song_drafts' as never).select('*').eq('id', current.id).maybeSingle();
        d = (data as unknown as Draft) ?? undefined;
      }
      busy = false;
      if (d?.audio_status === 'ready') appAlert('Your song is ready 🎶', 'Press play to hear it.', 'success');
      else if (d?.audio_status === 'failed') appAlert("The music couldn't be made", 'Please try again in a little while.', 'error');
      if (d) {
        const next = d;
        setCurrent((c) => (c && c.id === next.id ? next : c));
        setDrafts((list) => list?.map((x) => (x.id === next.id ? next : x)) ?? list);
      }
    }, 6000);
    return () => {
      if (poll.current) window.clearInterval(poll.current);
    };
  }, [current?.id, current?.audio_status]);

  const open = (d: Draft) => setParams({ song: d.id });

  const write = async (from?: Brief, howMany = 1) => {
    const b = from ?? brief;
    if (b.theme.trim().length < 3) {
      appAlert('What is the song about?', 'Write a few words about the song: a theme, a testimony, a prayer.', 'info');
      return;
    }
    setWriting(true);
    setWriteRun({ at: Date.now(), count: howMany, done: false });
    // Several songs from one brief: each is written separately, so they all differ
    const results = await Promise.all(
      Array.from({ length: howMany }, () => writeOne({ action: 'write', ...b, language: b.language === 'English' ? '' : b.language, location: locationId, churchId: currentChurchId })),
    );
    const written = results.flatMap((r) => (r.draft ? [r.draft] : []));
    const refused = results.find((r) => r.refused)?.refused;
    // A written song shows 100% for a moment before it opens
    if (written.length) {
      setWriteRun((r) => (r ? { ...r, done: true } : r));
      await new Promise((res) => setTimeout(res, 700));
    }
    setWriting(false);
    setWriteRun(null);
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
    const r = await call({ action: 'music', draftId: current.id, voice });
    if (!r.draft) {
      appAlert("Couldn't make the music", r.error ?? 'Please try again later.', 'error');
      const { data } = await supabase.from('song_drafts' as never).select('*').eq('id', current.id).maybeSingle();
      if (data) setCurrent(data as unknown as Draft);
      return;
    }
    setCurrent(r.draft);
  };

  /** A song's own name (its title, also inside the song so the sheet and copies use it) */
  const rename = async (title: string) => {
    if (!current) return false;
    const name = title.replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!name || name === current.title) return true;
    const before = current;
    const next = { ...current, title: name, song: { ...current.song, title: name } };
    setCurrent(next);
    setDrafts((list) => list?.map((x) => (x.id === next.id ? next : x)) ?? list);
    const { error } = await supabase.from('song_drafts' as never).update({ title: name, song: next.song } as never).eq('id', current.id);
    if (error) {
      setCurrent(before);
      setDrafts((list) => list?.map((x) => (x.id === before.id ? before : x)) ?? list);
      appAlert("Couldn't rename it", 'Please try again.', 'error');
      return false;
    }
    return true;
  };

  /** The writer's own words (after praying over it and singing it through) */
  const saveWords = async (words: ComposedSong, undoing = false) => {
    if (!current) return false;
    const before = current;
    // The song helper's first draft is always kept, even when a save is undone
    const song: ComposedSong = { ...words, first_draft: words.first_draft ?? current.song.first_draft };
    const next = { ...current, song };
    setCurrent(next);
    setDrafts((list) => list?.map((x) => (x.id === next.id ? next : x)) ?? list);
    const { error } = await supabase.from('song_drafts' as never).update({ song } as never).eq('id', current.id);
    if (error) {
      setCurrent(before);
      setDrafts((list) => list?.map((x) => (x.id === before.id ? before : x)) ?? list);
      appAlert("Couldn't save the words", 'Please try again.', 'error');
      return false;
    }
    setEditing(false);
    window.scrollTo({ top: 0 });
    if (undoing) {
      setUndoWords(null);
      appAlert('Change undone', 'The song has its earlier words again.', 'success');
    } else {
      setUndoWords({ id: before.id, song: before.song });
      appAlert('Words saved', current.audio_status === 'ready' ? 'Use Make it again to hear the music with your words.' : 'The song now has your words.', 'success');
    }
    return true;
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

  /** The song waiting for "Delete?" (the song's Delete button, or holding it in My songs) */
  const [toDelete, setToDelete] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState(false);
  // The finger lifting after a hold lands on the prompt (maybe on Delete): ignore taps for a moment
  const [promptReady, setPromptReady] = useState(false);
  useEffect(() => {
    if (!toDelete) return setPromptReady(false);
    const t = setTimeout(() => setPromptReady(true), 700);
    return () => clearTimeout(t);
  }, [toDelete]);
  const remove = () => current && setToDelete(current);
  const deleteSong = async (d: Draft) => {
    setDeleting(true);
    // Through the song helper, which also removes the song's audio; directly if it can't be reached
    const r = (await call({ action: 'delete', draftId: d.id })) as Answer & { deleted?: boolean };
    if (!r.deleted) {
      const { error } = await supabase.from('song_drafts' as never).delete().eq('id', d.id);
      if (error) {
        setDeleting(false);
        return appAlert("Couldn't delete it", 'Please try again.', 'error');
      }
    }
    setDeleting(false);
    setToDelete(null);
    setDrafts((list) => list?.filter((x) => x.id !== d.id) ?? list);
    if (current?.id === d.id) setParams({});
    appAlert('Song deleted');
  };
  const deletePrompt = (
    <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
      <AlertDialogContent className={cn('max-w-[340px] rounded-3xl', !promptReady && 'pointer-events-none')} data-testid="delete-song">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {toDelete?.audio_status === 'ready' ? 'The words, chords and recording will be gone for good.' : 'The words and chords will be gone for good.'}
            {toDelete?.shared ? ' The choir won’t see it any more.' : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={deleting} className="rounded-full">Cancel</AlertDialogCancel>
          <button
            type="button"
            disabled={deleting}
            onClick={() => promptReady && toDelete && deleteSong(toDelete)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-red-600 px-4 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

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
          {editing && mine ? (
            <SongWordsEditor song={current.song} onSave={saveWords} onCancel={() => setEditing(false)} hasMusic={current.audio_status === 'ready'} />
          ) : (
          <>
          {mine && undoWords?.id === current.id && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-2.5 dark:bg-emerald-950/40" data-testid="words-saved">
              <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="min-w-0 flex-1 text-[14px] font-medium text-foreground">Your words are saved</span>
              <button type="button" onClick={() => void saveWords(undoWords.song, true)} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[14px] font-semibold text-foreground shadow-sm dark:bg-slate-900">
                <Undo2 className="h-4 w-4" /> Undo
              </button>
            </div>
          )}
          <SongSheet
            song={current.song}
            onRename={mine ? rename : undefined}
            onEdit={mine ? () => { setEditing(true); window.scrollTo({ top: 0 }); } : undefined}
            partOf={parts ? partForSections(current.song.sections, parts) : undefined}
            onPlayPart={parts ? partPlayer.play : undefined}
            playingPart={partPlayer.playing}
            nowPart={nowPart}
          />

          <SectionLabel>The music</SectionLabel>
          <div className="rounded-[22px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800" data-testid="song-music">
            {current.audio_status === 'ready' && current.audio_url ? (
              <>
                <VersionSwitch
                  value={version}
                  onChange={switchVersion}
                  ready={!!current.instrumental_url && !!current.vocals_url}
                  split={split}
                  songS={parts?.[parts.length - 1]?.end ?? (audioEl && Number.isFinite(audioEl.duration) ? audioEl.duration : null)}
                />
                <audio ref={setAudioEl} controls preload="metadata" src={versionUrl ?? current.audio_url} className="mt-3 w-full" />
                <SongParts parts={parts} loading={partsLoading} player={partPlayer} />
                {current.brief?.voice !== 'female' && current.brief?.voice !== 'male' && current.brief?.voice !== 'duet' && current.brief?.sung && (
                  <p className="mt-1.5 text-[12.5px] text-muted-foreground">Sung by a {current.brief.sung} lead (Auto)</p>
                )}
                {mine && <VoicePicker value={voice} onChange={setVoice} className="mt-3" note="For Make it again" />}
                <div className="mt-3 flex gap-2">
                  <SaveSong url={versionUrl ?? current.audio_url} title={`${current.title}${version === 'music' ? ' (music only)' : version === 'voices' ? ' (voices only)' : ''}`} />
                  {mine && (
                    <button type="button" onClick={makeMusic} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-muted py-2.5 text-[14px] font-semibold text-foreground">
                      <RotateCcw className="h-4 w-4" /> Make it again
                    </button>
                  )}
                </div>
              </>
            ) : current.audio_status === 'making' && !stuck ? (
              <MusicProgress
                startedAt={current.music_requested_at}
                taskAt={current.audio_job?.task_id ? current.audio_job.submitted_at : null}
                server={!!service?.platform.acestep}
                studio={!!current.audio_job?.studio || current.brief?.quality === 'studio'}
              />
            ) : mine ? (
              <>
                {service && !hasService(service) && service.canManage && <MusicConnect onSaved={setService} />}
                {(current.audio_status === 'failed' || stuck) && !(/isn't set up/.test(current.audio_error ?? '') && hasService(service)) && (
                  <p className="mb-3 text-[13.5px] text-red-600 dark:text-red-400">
                    {/isn't set up/.test(current.audio_error ?? '')
                      ? service?.canManage
                        ? 'Connect the music service above first.'
                        : "The church's music service isn't connected yet. Ask a church admin to connect it (it's free)."
                      : "The music couldn't be made last time. Try again in a little while."}
                  </p>
                )}
                <VoicePicker value={voice} onChange={setVoice} className="mb-3" />
                <button type="button" onClick={makeMusic} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-[15px] font-semibold text-white">
                  <Music2 className="h-5 w-5" /> Make the full song
                </button>
                <p className="mt-2 text-[12.5px] text-muted-foreground">
                  A produced version with a lead voice, the choir and the band, about three minutes long.
                  {useStudio && <span className="font-medium text-indigo-600 dark:text-indigo-300" data-testid="studio-on"> Made in studio quality: it takes {STUDIO_MINUTES}.</span>}
                </p>
              </>
            ) : (
              <p className="text-[14px] text-muted-foreground">No music for this song yet.</p>
            )}
          </div>

          {current.audio_status === 'ready' && current.audio_url && (mine || (current.backing_status === 'ready' && current.backing_url)) && (
            <BackingTrack draft={current} mine={mine} onMake={makeBacking} />
          )}

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
          {writeRun && <WritingProgress run={writeRun} className="mt-4 rounded-2xl border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800" />}
          <MakeItYours className="mt-5" />
          </>
          )}
        </div>
      {deletePrompt}
      </Page>
    );
  }

  const mineList = (drafts ?? []).filter((d) => d.created_by === user.id);
  const shared = (drafts ?? []).filter((d) => d.created_by !== user.id);
  const field = 'w-full rounded-2xl border border-border bg-card px-4 py-3 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:border-blue-500';

  return (
    <Page>
      <PageTitle icon={PenLine} tint="bg-gradient-to-br from-indigo-500 to-purple-600" title="Compose a song" subtitle={`For ${choirName(locationId)}: words, chords and music`} back={back} />

      <div className="space-y-3.5" data-testid="compose-form">
        <FormCard step={1} title="The song">
          <div>
            <FieldLabel htmlFor="song-theme">What is the song about?</FieldLabel>
            <textarea
              id="song-theme"
              value={brief.theme}
              onChange={(e) => setBrief({ ...brief, theme: e.target.value.slice(0, 600) })}
              rows={3}
              placeholder="A testimony, a prayer, a theme from Sunday's message…"
              className={`${field} resize-none`}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-muted-foreground">Ideas</span>
              <button type="button" onClick={() => setIdeas([...IDEAS].sort(() => Math.random() - 0.5).slice(0, 4))} className="text-[13px] font-semibold text-blue-600 dark:text-blue-400">More ideas</button>
            </div>
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {ideas.map((i) => (
                <button key={i.theme} type="button" onClick={() => setBrief({ ...brief, theme: i.theme, scripture: i.scripture })} className="w-[168px] shrink-0 snap-start rounded-[14px] border border-slate-200 bg-card px-3 py-2.5 text-left text-[13px] leading-snug text-foreground active:bg-muted dark:border-slate-700">
                  <span className="line-clamp-2 font-medium">{i.theme}</span>
                  <span className="mt-0.5 block text-muted-foreground">{i.scripture}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="song-scripture" optional>Scripture</FieldLabel>
            <input id="song-scripture" value={brief.scripture} onChange={(e) => setBrief({ ...brief, scripture: e.target.value.slice(0, 200) })} placeholder="e.g. Psalm 23, Isaiah 40:31" className={field} />
          </div>
        </FormCard>

        <FormCard step={2} title="Style">
          <StylePicker families={STYLE_FAMILIES} value={brief.style ?? 'gospel_choir'} onChange={(id) => setBrief({ ...brief, style: id })} />
        </FormCard>

        <FormCard step={3} title="Sound">
          <div>
            <FieldLabel>Tempo</FieldLabel>
            <Segmented label="Tempo" options={FEELS} value={brief.feel ?? 'mid'} onChange={(v) => setBrief({ ...brief, feel: v })} testId="tempo" />
          </div>
          <div>
            <FieldLabel>Key</FieldLabel>
            <KeyGrid keys={KEYS} value={brief.key ?? ''} onChange={(k) => setBrief({ ...brief, key: k })} />
          </div>
        </FormCard>

        <FormCard step={4} title="Voice and language">
          <VoicePicker value={brief.voice ?? 'auto'} onChange={(v) => setBrief({ ...brief, voice: v })} />
          <div>
            <FieldLabel htmlFor="song-language">Language</FieldLabel>
            <div className="relative">
              <select
                id="song-language"
                value={brief.language}
                onChange={(e) => setBrief({ ...brief, language: e.target.value })}
                className="h-12 w-full appearance-none rounded-[14px] border border-slate-300 bg-card px-3.5 pr-10 text-[16px] font-medium text-foreground outline-none focus:border-blue-500 dark:border-slate-700"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            </div>
            {brief.language !== 'English' && (
              <Segmented
                className="mt-2"
                label="How much of the song"
                compact
                options={[{ value: 'chorus', label: 'Chorus only' }, { value: 'all', label: 'Whole song' }]}
                value={brief.languageMode ?? 'chorus'}
                onChange={(v) => setBrief({ ...brief, languageMode: v as 'chorus' | 'all' })}
              />
            )}
          </div>
        </FormCard>

        <FormCard step={5} title="Finishing touches">
          <div>
            <FieldLabel htmlFor="song-notes" optional>Anything else</FieldLabel>
            <textarea
              id="song-notes"
              rows={3}
              value={brief.notes}
              onChange={(e) => setBrief({ ...brief, notes: e.target.value.slice(0, 600) })}
              placeholder={'e.g. Use the line "You turned my mourning into dancing". For Easter Sunday, no bridge.'}
              className={cn(field, 'resize-none leading-snug')}
            />
            <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">The song helper follows these first. Put a line in quotes to have it in the song word for word.</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-semibold text-foreground">How many songs</span>
            <Segmented<number>
              className="w-[156px]"
              label="How many songs"
              compact
              options={[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]}
              value={count}
              onChange={setCount}
            />
          </div>
        </FormCard>

        <button type="button" onClick={() => write(undefined, count)} disabled={writing} className="flex h-14 w-full items-center justify-center gap-2.5 rounded-[18px] bg-gradient-to-r from-indigo-600 to-purple-600 text-[17px] font-semibold text-white shadow-[0_6px_18px_rgba(79,70,229,0.28)] disabled:opacity-80">
          {writing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> {writeRun && writeRun.count > 1 ? `Writing ${writeRun.count} songs…` : 'Writing the song…'}
            </>
          ) : (
            <>
              <PenLine className="h-5 w-5" /> {count > 1 ? `Write ${count} songs` : 'Write the song'}
            </>
          )}
        </button>
        {writeRun && <WritingProgress run={writeRun} className="rounded-2xl border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800" />}
        <MakeItYours />
        <p className="px-1 text-[12.5px] leading-snug text-muted-foreground">Only Christian worship and gospel songs. Lines in another language are worth checking with a native speaker.</p>
      </div>

      {/* Nothing to set up while the church's own music server is running (only a key someone added is shown, to remove it) */}
      {service?.canManage && (!service.platform.acestep || service.services.length > 0) && <MusicServiceRow service={service} onChange={setService} />}

      {!!mineList.length && (
        <>
          <SectionLabel>My songs</SectionLabel>
          <ListGroup>
            {mineList.map((d) => (
              <DraftRow key={d.id} d={d} onOpen={() => open(d)} onHold={() => setToDelete(d)} />
            ))}
          </ListGroup>
          <p className="mt-1.5 px-1 text-[12.5px] text-muted-foreground">Hold a song to delete it.</p>
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

      {studioReady && service?.canManage && <AdvancedSettings studio={studio} onStudio={setStudio} />}
      {deletePrompt}
    </Page>
  );
};

/**
 * Church admins connect the music service once: a free ACE Music key (ACE-Step songs, no
 * limits) or a Hugging Face token. The song-writer function checks it with the service and
 * keeps it on the server; phones only ever see its last four characters.
 */
const MusicConnect = ({ onSaved, onCancel }: { onSaved: (m: MusicService) => void; onCancel?: () => void }) => {
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const r = await call({ action: 'connect-music', churchId: currentChurchId, key: key.trim() });
    setSaving(false);
    if (!r.services) return appAlert("Couldn't connect it", r.error ?? 'Please try again.', 'error');
    setKey('');
    onSaved(r as MusicService);
    appAlert('Music service connected', 'Songs can now be made with full music.', 'success');
  };
  return (
    <div className="mb-4 rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/40" data-testid="music-connect">
      <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
        <KeyRound className="h-4 w-4 text-indigo-600 dark:text-indigo-300" /> Connect the free music service
      </p>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">Full songs are produced with ACE-Step, free and with no limits. A church admin connects it once for everyone:</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13.5px] leading-snug text-foreground">
        <li>
          <a href="https://acemusic.ai/account/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline dark:text-blue-400">Open ACE Music</a> and sign up free (Google works).
        </li>
        <li>In your account, find the <span className="font-semibold">API key</span> and copy it.</li>
        <li>Paste it here.</li>
      </ol>
      <div className="mt-3 flex gap-2">
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste the key"
          aria-label="Music service key"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-11 min-w-0 flex-1 rounded-full border border-border bg-card px-4 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:border-blue-500"
        />
        <button type="button" onClick={save} disabled={saving || key.trim().length < 8} className="flex h-11 items-center justify-center rounded-full bg-blue-600 px-4 text-[15px] font-semibold text-white disabled:opacity-50">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Connect'}
        </button>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
        A Hugging Face token (it starts hf_) works too. The key is kept safely on the server, never on anyone's phone.
        {onCancel && (
          <>
            {' '}
            <button type="button" onClick={onCancel} className="font-semibold text-blue-600 dark:text-blue-400">Cancel</button>
          </>
        )}
      </p>
    </div>
  );
};

/** Church admins: which music service is connected, with Change and Remove */
const MusicServiceRow = ({ service, onChange }: { service: MusicService; onChange: (m: MusicService) => void }) => {
  const [changing, setChanging] = useState(false);
  const own = service.services[0];
  if (!hasService(service) || changing) {
    return (
      <>
        <SectionLabel>Music service</SectionLabel>
        <MusicConnect onSaved={(m) => { setChanging(false); onChange(m); }} onCancel={changing ? () => setChanging(false) : undefined} />
      </>
    );
  }
  const remove = async () => {
    if (!own || !window.confirm(`Remove the ${SERVICE_NAME[own.service]} key? Songs can't get music until a service is connected again.`)) return;
    const r = await call({ action: 'disconnect-music', churchId: currentChurchId, service: own.service });
    if (!r.services) return appAlert("Couldn't remove it", r.error ?? 'Please try again.', 'error');
    onChange(r as MusicService);
  };
  return (
    <>
      <SectionLabel>Music service</SectionLabel>
      <div className="flex items-center gap-3 rounded-[22px] border border-slate-200/70 bg-card px-4 py-3 shadow-sm dark:border-slate-800" data-testid="music-service">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Check className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground">{own ? `${SERVICE_NAME[own.service]} connected` : 'Connected for all churches'}</span>
          <span className="block truncate text-[12.5px] text-muted-foreground">{own?.hint ? `Key ending ${own.hint}` : 'Full songs with music are on'}</span>
        </span>
        <button type="button" onClick={() => setChanging(true)} className="text-[14px] font-semibold text-blue-600 dark:text-blue-400">Change</button>
        {own && (
          <button type="button" onClick={remove} className="text-[14px] font-semibold text-red-600 dark:text-red-400">Remove</button>
        )}
      </div>
    </>
  );
};

/** Lead voice for the music: Auto (as before: the music chooses) or a female, male or duet lead */
const VoicePicker = ({ value, onChange, className, note }: { value: Voice; onChange: (v: Voice) => void; className?: string; note?: string }) => (
  <div className={className} data-testid="voice-picker">
    <FieldLabel>
      Lead voice {note && <span className="font-normal text-muted-foreground">({note.toLowerCase()})</span>}
    </FieldLabel>
    <Segmented label="Lead voice" compact options={VOICES.map((v) => ({ value: v.id, label: v.label }))} value={value} onChange={onChange} />
    {value === 'auto' && <p className="mt-1.5 text-[12.5px] text-muted-foreground">Auto takes turns: a female lead, then a male lead.</p>}
  </div>
);

type Version = 'full' | 'music' | 'voices';
const VERSIONS: { value: Version; label: string }[] = [
  { value: 'full', label: 'Full song' },
  { value: 'music', label: 'Music only' },
  { value: 'voices', label: 'Voices only' },
];
const VERSION_NOTE: Record<Version, string> = {
  full: 'The singers with the band and choir.',
  music: 'No singing: sing or read along with the words above.',
  voices: 'Just the singers: good for learning the parts.',
};

/** When each song's split began (on this phone), so the progress carries on after leaving the page */
const SPLIT_KEY = 'song_split_started_v1';
const SPLIT_GIVE_UP_MS = 15 * 60_000;
function readSplits(): Record<string, { url: string; t: number }> {
  try {
    return JSON.parse(localStorage.getItem(SPLIT_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeSplits(all: Record<string, { url: string; t: number }>) {
  try {
    localStorage.setItem(SPLIT_KEY, JSON.stringify(all));
  } catch {
    /* private window */
  }
}
function splitStart(id: string, url: string) {
  const all = readSplits();
  const known = all[id];
  if (known && known.url === url && Date.now() - known.t < SPLIT_GIVE_UP_MS) return known.t;
  // Drop old entries, then note this one
  for (const [k, v] of Object.entries(all)) if (Date.now() - v.t > SPLIT_GIVE_UP_MS) delete all[k];
  all[id] = { url, t: Date.now() };
  writeSplits(all);
  return all[id].t;
}
function forgetSplit(id: string) {
  const all = readSplits();
  delete all[id];
  writeSplits(all);
}

const BACKING_STAGES: Stage[] = [
  { from: 0, text: 'Sending the song to the studio' },
  { from: 0.08, text: 'Getting the studio ready' },
  { from: 0.3, text: 'Planning the arrangement for the band' },
  { from: 0.45, text: 'Laying down the drums and bass' },
  { from: 0.6, text: 'Adding the keys, organ and guitars' },
  { from: 0.78, text: 'Mixing the band' },
  { from: 0.9, text: 'Saving the backing track' },
];

/**
 * The backing track: the studio plays the song's style, key and tempo again with no
 * singer at all, for writing and singing your own song on top. ("Music only" is the sung
 * recording with the voices taken out, which always leaves a trace of them.) It's a fresh
 * performance, so it has its own player; made only when the writer asks.
 */
const BackingTrack = ({ draft, mine, onMake }: { draft: Draft; mine: boolean; onMake: () => Promise<void> }) => {
  const [asking, setAsking] = useState(false);
  const status = draft.backing_status ?? 'none';
  const make = async () => {
    setAsking(true);
    await onMake();
    setAsking(false);
  };
  const started = Date.parse(draft.backing_job?.requested_at ?? '') || Date.now();
  return (
    <div className="mt-3 rounded-[22px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800" data-testid="backing-track">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
          <Music2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground">Backing track</p>
          <p className="text-[12.5px] leading-snug text-muted-foreground">The band only, with no singer at all. For writing and singing your own song on top.</p>
        </div>
      </div>
      {status === 'ready' && draft.backing_url ? (
        <>
          <audio controls preload="metadata" src={draft.backing_url} className="mt-3 w-full" data-testid="backing-audio" />
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            A fresh performance in {draft.song.key}, {draft.song.bpm} BPM: the same style, key and tempo as the song, not note for note.
          </p>
          <div className="mt-3 flex gap-2">
            <SaveSong url={draft.backing_url} title={`${draft.title} (backing track)`} />
            {mine && (
              <button type="button" onClick={make} disabled={asking} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-muted py-2.5 text-[14px] font-semibold text-foreground disabled:opacity-50">
                <RotateCcw className="h-4 w-4" /> Make another
              </button>
            )}
          </div>
        </>
      ) : status === 'making' ? (
        <LiveProgress
          testId="backing-progress"
          className="mt-4"
          title="Making the backing track"
          startedAt={started}
          expectedS={draft.backing_job?.task_id ? 150 : 240}
          stages={BACKING_STAGES}
          note="You can leave this page; the backing track keeps being made and will be here when you come back."
        />
      ) : (
        <>
          {status === 'failed' && <p className="mt-3 text-[13.5px] text-red-600 dark:text-red-400">The backing track couldn't be made last time. Try again in a little while.</p>}
          <button type="button" onClick={make} disabled={asking} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-[15px] font-semibold text-white disabled:opacity-60">
            {asking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Music2 className="h-5 w-5" />} Make the backing track
          </button>
          <p className="mt-2 text-[12.5px] text-muted-foreground">The studio plays the song again in the same style, key and tempo. It takes a few minutes.</p>
        </>
      )}
    </div>
  );
};

/** Full song / Music only / Voices only (the last two once the music server has split it) */
const VersionSwitch = ({ value, onChange, ready, split, songS }: {
  value: Version;
  onChange: (v: Version) => void;
  ready: boolean;
  split: { startedAt: number; done?: boolean } | null;
  songS: number | null;
}) => {
  if (!ready) {
    return split ? (
      <SplitProgress startedAt={split.startedAt} songS={songS} done={split.done} />
    ) : null;
  }
  return (
    <div data-testid="version-switch">
      <Segmented<Version> label="Which version" compact options={VERSIONS} value={value} onChange={onChange} />
      <p className="mt-1.5 text-[12.5px] text-muted-foreground">{VERSION_NOTE[value]}</p>
    </div>
  );
};

/**
 * Save the song's recording to the phone. The file is on another address (the media
 * store), where a plain download link only opens it in a player, so it's fetched first
 * (as soon as the song shows) and then shared (iPhone: Save to Files) or downloaded.
 */
const SaveSong = ({ url, title }: { url: string; title: string }) => {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || 'mp3';
  const name = `${title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Song'}.${/^[a-z0-9]{2,4}$/.test(ext) ? ext : 'mp3'}`;
  const [state, setState] = useState<'idle' | 'getting' | 'failed'>('idle');
  useEffect(() => {
    prepareSave(url, 'voice', name).catch(() => setState('failed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per recording
  }, [url]);
  const save = async () => {
    if (state === 'failed') {
      // Couldn't fetch it here: open it, so the phone's own player can save it
      window.open(url, '_blank', 'noopener');
      return;
    }
    const r = await saveToPhone(url, 'voice', name);
    if (r === 'not-ready') {
      setState('getting');
      prepareSave(url, 'voice', name).then(
        () => {
          setState('idle');
          appAlert('Ready to save', 'Tap Save again.', 'success');
        },
        () => setState('failed'),
      );
    }
  };
  return (
    <button type="button" onClick={() => void save()} disabled={state === 'getting'} data-testid="save-song" className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-muted py-2.5 text-[14px] font-semibold text-foreground disabled:opacity-60">
      {state === 'getting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {state === 'getting' ? 'Getting it ready…' : 'Save'}
    </button>
  );
};

const WritingProgress = ({ run, className }: { run: { at: number; count: number; done: boolean }; className?: string }) => (
  <LiveProgress
    testId="writing-progress"
    className={className}
    title={run.count > 1 ? `Writing ${run.count} songs` : 'Writing the song'}
    startedAt={run.at}
    expectedS={writeSeconds(run.count)}
    stages={WRITING}
    done={run.done}
    note="Words, chords, choir and band notes. Each song gets a second pass, like an editor would give it."
  />
);

/**
 * What the song helper is and isn't: a starting point (words, chords, choir parts, a
 * recording); the songwriters pray, rework and make it theirs. The app never claims a
 * song was given by God.
 */
const MakeItYours = ({ className }: { className?: string }) => (
  <div className={cn('rounded-2xl bg-amber-50/80 px-4 py-3.5 dark:bg-amber-950/30', className)} data-testid="make-it-yours">
    <p className="text-[14px] font-semibold text-foreground">A starting point for songwriters</p>
    <ul className="mt-1.5 space-y-1.5 text-[13px] leading-snug text-muted-foreground">
      <li><span className="font-semibold text-foreground">In seconds:</span> words, chords, choir parts and a full recording to start from.</li>
      <li><span className="font-semibold text-foreground">Then the real ministry:</span> pray over it, change the words (Edit the words), sing it with the choir and make it yours. Then the song you bring to church is truly yours to offer.</li>
    </ul>
  </div>
);

/** Measured through the app's own path (Nov 2026): 131 s with the studio awake, 261 s when it had to wake and load */
const STUDIO_MINUTES = 'about 2 minutes, or about 4½ when the studio has to wake up first';

/**
 * The very bottom of Compose a song, folded away, for church admins only: choices for
 * everyone composing songs at the church (the header says what's on).
 */
const AdvancedSettings = ({ studio, onStudio }: { studio: boolean; onStudio: (on: boolean) => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-8" data-testid="advanced-settings">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-2xl px-1 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Settings2 className="h-4 w-4" /> Advanced settings
          {!open && (
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] normal-case tracking-normal', studio ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'bg-muted text-muted-foreground')}>
              Studio quality {studio ? 'on' : 'off'}
            </span>
          )}
        </span>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 rounded-[22px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800">
          <label className="flex items-start gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-foreground">Studio quality music</span>
              <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">
                A bigger composer plans the melody and arrangement, and the full music model makes it (50 steps instead of 8), on a faster machine. It takes {STUDIO_MINUTES}. Applies to everyone composing songs here, for new music from now on. Only church admins see this setting.
              </span>
            </span>
            <Switch checked={studio} onCheckedChange={onStudio} aria-label="Studio quality music" className="mt-0.5 shrink-0 data-[state=checked]:bg-indigo-600" />
          </label>
        </div>
      )}
    </div>
  );
};

/** A song in the list: tap opens it; my own can be held to delete (like WhatsApp) */
const DraftRow = ({ d, onOpen, onHold }: { d: Draft; onOpen: () => void; onHold?: () => void }) => (
  <HoldButton type="button" onClick={onOpen} onHold={onHold} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted" data-testid="draft-row">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
      {d.audio_status === 'ready' ? <Music2 className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-semibold text-foreground">{d.title}</span>
      <span className="block truncate text-[12.5px] text-muted-foreground">
        {[
          songKey(d.song.key) && `Key ${songKey(d.song.key)}`,
          d.song.bpm && `${d.song.bpm} BPM`,
          d.audio_status === 'ready' ? 'with music' : d.audio_status === 'making' ? 'making the music…' : '',
          d.shared && 'shared',
        ].filter(Boolean).join(' · ')}
      </span>
    </span>
  </HoldButton>
);

export default ComposeSongPage;
