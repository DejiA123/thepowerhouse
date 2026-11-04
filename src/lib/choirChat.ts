import { startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { campusName, church, hasFeature } from '@/config/church';
import { timeMs } from '@/components/messages/chatUtils';

/**
 * A group chat can be a choir's chat (chat info → Choir). It then shows a card
 * each time a song is added to that choir's setlist (Play · Lyrics), and this
 * week's setlist pinned under the header. Nothing is stored as a message (the
 * songs live in the choir's tables, open to the choir without accounts), so the
 * chat's end-to-end encryption is untouched.
 */

export interface ChoirLink {
  location: string;
  set_at: string;
}

export interface ChoirSongRow {
  id: string;
  title: string;
  key: string | null;
  artist: string | null;
  url: string | null;
  lyrics: string | null;
  set_type: string;
  week_date: string | null;
  sort_order: number | null;
  created_at: string;
}

/** The national choir keeps one permanent setlist (days 1–3) */
export const NATIONAL = 'national';
const NATIONAL_PERMANENT_DATE = '1900-01-01';

/** Choirs a chat can belong to: the national choir and each branch */
export function choirLocations(): { id: string; name: string }[] {
  if (!hasFeature('choir')) return [];
  return [
    ...(hasFeature('choirNational') ? [{ id: NATIONAL, name: church.labels.nationalChoir }] : []),
    ...church.choir.branches.map((id) => ({ id, name: `${campusName(id)} Choir` })),
  ];
}

export const choirName = (location: string) =>
  location === NATIONAL ? church.labels.nationalChoir : `${campusName(location)} Choir`;

/** The week the choir page shows now (the same sum the choir page does, so it finds the same rows) */
export const currentWeekDate = (location: string) =>
  location === NATIONAL ? NATIONAL_PERMANENT_DATE : startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0];

const SET_NAMES: Record<string, string> = {
  praise: 'Praise Set',
  worship: 'Worship Set',
  special: 'Special Number',
  hymns: 'Hymns',
  thanksgiving: 'Thanksgiving',
  offering: 'Offering',
};
export const SET_ORDER = ['praise', 'worship', 'special', 'hymns', 'thanksgiving', 'offering'];

/** "praise_d2" → { base: 'praise', day: 2 } */
export function splitSetType(setType: string): { base: string; day: number | null } {
  const m = setType.match(/^([a-z]+)(?:_d(\d))?$/);
  return { base: m?.[1] ?? setType, day: m?.[2] ? Number(m[2]) : null };
}

/** "Praise Set", or "Praise Set · Day 2" for the national choir */
export function setLabel(setType: string) {
  const { base, day } = splitSetType(setType);
  const name = SET_NAMES[base] ?? base.charAt(0).toUpperCase() + base.slice(1);
  return day ? `${name} · Day ${day}` : name;
}

/** Lyrics are plain text, or {"text", "imageUrl"} (a screenshot of them) */
export function parseLyrics(lyrics?: string | null): { text: string; imageUrl: string | null } {
  if (!lyrics) return { text: '', imageUrl: null };
  if (lyrics.startsWith('{') && lyrics.endsWith('}')) {
    try {
      const parsed = JSON.parse(lyrics);
      return {
        text: typeof parsed.text === 'string' ? parsed.text : '',
        imageUrl: typeof parsed.imageUrl === 'string' && /^https:\/\//.test(parsed.imageUrl) ? parsed.imageUrl : null,
      };
    } catch {
      return { text: lyrics, imageUrl: null };
    }
  }
  return { text: lyrics, imageUrl: null };
}

export const hasLyrics = (lyrics?: string | null) => {
  const l = parseLyrics(lyrics);
  return !!(l.text.trim() || l.imageUrl);
};

/** A YouTube link's video id */
export function youTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ── The chat's choir ─────────────────────────────────────────────────
const LINK_KEY = (chatId: string) => `choir_chat_${chatId}`;

/** What the phone last knew (so the setlist shows at once) */
export function cachedChoirLink(chatId: string): ChoirLink | null {
  try {
    const raw = localStorage.getItem(LINK_KEY(chatId));
    return raw ? (JSON.parse(raw) as ChoirLink) : null;
  } catch {
    return null;
  }
}

function keepChoirLink(chatId: string, link: ChoirLink | null) {
  try {
    if (link) localStorage.setItem(LINK_KEY(chatId), JSON.stringify(link));
    else localStorage.removeItem(LINK_KEY(chatId));
  } catch {
    /* private window */
  }
}

export async function getChoirLink(chatId: string): Promise<ChoirLink | null> {
  const { data, error } = await supabase
    .from('choir_chat_links' as never)
    .select('location, set_at')
    .eq('chat_id', chatId)
    .maybeSingle();
  // Not there yet (before the migration): no choir
  if (error) return cachedChoirLink(chatId);
  const link = (data as ChoirLink | null) ?? null;
  keepChoirLink(chatId, link);
  return link;
}

/** Link the chat to a choir ('' unlinks). Its admins only (the server checks). */
export async function setChoirLink(chatId: string, location: string) {
  const { error } = await supabase.rpc('link_chat_to_choir' as never, { _chat_id: chatId, _location: location } as never);
  if (error) throw error;
  keepChoirLink(chatId, location ? { location, set_at: new Date().toISOString() } : null);
  window.dispatchEvent(new CustomEvent('choir-chat:changed', { detail: { chatId } }));
}

// ── Songs ────────────────────────────────────────────────────────────
const SONG_COLUMNS = 'id, title, key, artist, url, lyrics, set_type, week_date, sort_order, created_at';

/** Songs added to the choir's setlists since a time (the chat's cards) */
export async function getSongsAddedSince(location: string, sinceIso: string): Promise<ChoirSongRow[]> {
  const { data, error } = await supabase
    .from('choir_weekly_set_songs' as never)
    .select(SONG_COLUMNS)
    .eq('location', location)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data as ChoirSongRow[] | null) ?? [];
}

/** This week's setlist (the national choir: its permanent one, every day) */
export async function getCurrentSetlist(location: string): Promise<ChoirSongRow[]> {
  const { data, error } = await supabase
    .from('choir_weekly_set_songs' as never)
    .select(SONG_COLUMNS)
    .eq('location', location)
    .eq('week_date', currentWeekDate(location))
    .order('sort_order', { ascending: true })
    .limit(300);
  if (error) throw error;
  return ((data as ChoirSongRow[] | null) ?? []).filter((s) => !s.set_type.startsWith('learning'));
}

/** Setlist songs in service order: by day, then set (Praise → … → Offering), then their order */
export function inServiceOrder(rows: ChoirSongRow[]) {
  const rank = (r: ChoirSongRow) => {
    const { base, day } = splitSetType(r.set_type);
    const set = SET_ORDER.indexOf(base);
    return (day ?? 0) * 1000 + (set < 0 ? 99 : set) * 10;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** Setlist sections: "Praise Set · Day 2" → songs */
export function setlistSections(rows: ChoirSongRow[]): { setType: string; label: string; songs: ChoirSongRow[] }[] {
  const out: { setType: string; label: string; songs: ChoirSongRow[] }[] = [];
  for (const row of inServiceOrder(rows)) {
    const last = out[out.length - 1];
    if (last && last.setType === row.set_type) last.songs.push(row);
    else out.push({ setType: row.set_type, label: setLabel(row.set_type), songs: [row] });
  }
  return out;
}

/** Cards for the chat: songs added close together to the same set make one card ("5 songs added") */
export interface SongCardGroup {
  id: string;
  setType: string;
  /** When the last of them was added (where the card sits in the chat) */
  at: string;
  songs: ChoirSongRow[];
}

const GROUP_GAP_MS = 15 * 60_000;

export function groupSongCards(rows: ChoirSongRow[]): SongCardGroup[] {
  const groups: SongCardGroup[] = [];
  const open = new Map<string, SongCardGroup>();
  for (const row of rows) {
    const key = `${row.set_type}|${row.week_date ?? ''}`;
    const g = open.get(key);
    if (g && timeMs(row.created_at) - timeMs(g.at) <= GROUP_GAP_MS) {
      g.songs.push(row);
      g.at = row.created_at;
    } else {
      const fresh = { id: `song-card-${row.id}`, setType: row.set_type, at: row.created_at, songs: [row] };
      groups.push(fresh);
      open.set(key, fresh);
    }
  }
  return groups.sort((a, b) => timeMs(a.at) - timeMs(b.at));
}
