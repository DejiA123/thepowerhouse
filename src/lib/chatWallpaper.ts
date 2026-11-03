import { useEffect, useState, type CSSProperties } from 'react';

/**
 * The background behind chats, like WhatsApp's wallpaper. Each member picks
 * their own (Me → Settings → Chat wallpaper, chat info → Wallpaper, or the chat
 * list's ⋮; Sky doodles by default). Kept on this phone only, like WhatsApp: the choice in
 * localStorage, their own photo in IndexedDB (never uploaded).
 */

export type WallpaperId = 'cream' | 'sage' | 'sky' | 'plain' | 'white' | 'night' | 'custom';

export interface WallpaperChoice {
  id: WallpaperId;
  /** How much a photo is darkened, 0–60 (%), so messages stay easy to read */
  dim: number;
}

export interface Wallpaper {
  id: Exclude<WallpaperId, 'custom'>;
  name: string;
  bg: string;
  /** The doodles' colour and strength (none for the plain ones) */
  ink?: string;
  opacity?: number;
  /** Dark background: text drawn straight on it is light */
  dark?: boolean;
}

export const WALLPAPERS: Wallpaper[] = [
  { id: 'cream', name: 'Cream doodles', bg: '#F4EFE8', ink: '#9C8A70', opacity: 0.2 },
  { id: 'sage', name: 'Sage doodles', bg: '#E8EFE9', ink: '#7F9A87', opacity: 0.22 },
  { id: 'sky', name: 'Sky doodles', bg: '#E8EEF6', ink: '#7D95B5', opacity: 0.22 },
  { id: 'plain', name: 'Plain cream', bg: '#F4EFE8' },
  { id: 'white', name: 'Plain white', bg: 'hsl(var(--background))' },
  { id: 'night', name: 'Night doodles', bg: '#0B141A', ink: '#7A8A94', opacity: 0.16, dark: true },
];

export const DEFAULT_WALLPAPER: WallpaperChoice = { id: 'sky', dim: 15 };
const KEY = 'chat_wallpaper_v1';
export const WALLPAPER_CHANGED = 'chat-wallpaper:changed';

/** The church doodles (a cross, music, an open Bible, a heart, a dove, a candle, a chat bubble, a crown, stars), one 200 px tile */
const DOODLES = [
  'M24 10v26M15 19h18',
  'M70 38V16l18-5v22',
  'M128 24c8-4 16-4 22 1v24c-6-5-14-5-22-1z M150 25c6-5 14-5 22-1v24c-8-4-16-4-22 1',
  'M30 92c-11-8-15-14-10-20c3-3 8-3 10 1c2-4 7-4 10-1c5 6 1 12-10 20z',
  'M96 66q2 7 9 9q-7 2-9 9q-2-7-9-9q7-2 9-9z',
  'M134 96c6-10 16-13 26-9l8-6c1 5-1 9-4 11c2 8-4 15-14 16c-8 1-14-3-16-12z M146 92c-4-8-1-15 6-19c1 6 0 12-4 17',
  'M25.5 144c-5-4-4-9 0-14c4 5 5 10 0 14z',
  'M80 140h28a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H92l-8 7v-7h-4a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6z',
  'M140 172l-4-20l11 8l8-13l8 13l11-8l-4 20z',
  'M190 10l2 5l5 .5l-4 3.5l1.3 5l-4.3-2.8l-4.3 2.8l1.3-5l-4-3.5l5-.5z',
];
const DOTS = [[56, 64], [186, 64], [60, 118], [110, 112], [186, 132], [56, 190], [118, 190]];

const tiles = new Map<string, string>();
function doodleTile(ink: string, opacity: number) {
  const key = `${ink}:${opacity}`;
  let tile = tiles.get(key);
  if (!tile) {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">` +
      `<g fill="none" stroke="${ink}" stroke-opacity="${opacity}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">` +
      DOODLES.map((d) => `<path d="${d}"/>`).join('') +
      `<rect x="20" y="150" width="11" height="26" rx="2"/>` +
      DOTS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6"/>`).join('') +
      `</g></svg>`;
    tile = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    tiles.set(key, tile);
  }
  return tile;
}

/** The CSS for one of the built-in wallpapers */
export function wallpaperStyle(w: Wallpaper): CSSProperties {
  return w.ink
    ? { backgroundColor: w.bg, backgroundImage: doodleTile(w.ink, w.opacity ?? 0.2), backgroundSize: '200px 200px' }
    : { backgroundColor: w.bg };
}

export const wallpaperById = (id: WallpaperId) => WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];

export function getWallpaperChoice(): WallpaperChoice {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<WallpaperChoice> | null;
    if (saved && typeof saved.id === 'string' && (saved.id === 'custom' || WALLPAPERS.some((w) => w.id === saved.id))) {
      const dim = typeof saved.dim === 'number' ? Math.min(60, Math.max(0, saved.dim)) : DEFAULT_WALLPAPER.dim;
      return { id: saved.id as WallpaperId, dim };
    }
  } catch {
    /* private window, or not saved yet */
  }
  return DEFAULT_WALLPAPER;
}

export function setWallpaperChoice(change: Partial<WallpaperChoice>) {
  const next = { ...getWallpaperChoice(), ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* still changes for now */
  }
  current = next;
  window.dispatchEvent(new CustomEvent(WALLPAPER_CHANGED));
}

// ── The member's own photo (kept on this phone, never uploaded) ──────────
const DB = 'ph-chat-wallpaper';
const STORE = 'files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

let photoUrl: string | null = null;
let photoLoaded: Promise<string | null> | null = null;

function loadPhoto(): Promise<string | null> {
  if (!photoLoaded) {
    photoLoaded = withStore<Blob | undefined>('readonly', (s) => s.get('custom') as IDBRequest<Blob | undefined>)
      .then((blob) => {
        photoUrl = blob ? URL.createObjectURL(blob) : null;
        return photoUrl;
      })
      .catch(() => null);
  }
  return photoLoaded;
}

/** Keep the member's own photo on this phone and use it */
export async function saveWallpaperPhoto(photo: Blob) {
  await withStore('readwrite', (s) => s.put(photo, 'custom'));
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(photo);
  photoLoaded = Promise.resolve(photoUrl);
  setWallpaperChoice({ id: 'custom' });
}

/** Forget the member's own photo (back to the default if it was in use) */
export async function removeWallpaperPhoto() {
  await withStore('readwrite', (s) => s.delete('custom')).catch(() => undefined);
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null;
  photoLoaded = Promise.resolve(null);
  if (getWallpaperChoice().id === 'custom') setWallpaperChoice({ id: DEFAULT_WALLPAPER.id });
  else window.dispatchEvent(new CustomEvent(WALLPAPER_CHANGED));
}

let current: WallpaperChoice | null = null;

/** The wallpaper in use, and the member's own photo (if they've added one) */
export function useChatWallpaper(): { choice: WallpaperChoice; photo: string | null } {
  const [state, setState] = useState(() => ({ choice: current ?? (current = getWallpaperChoice()), photo: photoUrl }));
  useEffect(() => {
    let alive = true;
    const update = () => {
      current = getWallpaperChoice();
      setState({ choice: current, photo: photoUrl });
      loadPhoto().then((photo) => alive && setState({ choice: getWallpaperChoice(), photo }));
    };
    update();
    const onStorage = (e: StorageEvent) => e.key === KEY && update();
    window.addEventListener(WALLPAPER_CHANGED, update);
    window.addEventListener('storage', onStorage);
    return () => {
      alive = false;
      window.removeEventListener(WALLPAPER_CHANGED, update);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return state;
}

/** What the setting shows as the current wallpaper's name */
export function wallpaperName(choice: WallpaperChoice, photo: string | null) {
  return choice.id === 'custom' && photo ? 'My photo' : wallpaperById(choice.id === 'custom' ? DEFAULT_WALLPAPER.id : choice.id).name;
}
