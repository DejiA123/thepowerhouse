/**
 * Which church the app is showing. Imported first (main.tsx), before anything
 * reads `church`.
 *
 * - The Power House's own address (and any other address that isn't Church
 *   Space's): always The Power House, exactly as before.
 * - The Church Space address (PLATFORM.hosts): the church chosen on this phone
 *   (kept in localStorage), or none yet, in which case Home is "Find your church".
 *
 * Every request to the database names the church (x-church-id), so it answers
 * with that church's records; it ignores a church you aren't a member of.
 */
import { church, PLATFORM, platformProfile, profileFromRow, type ChurchRow } from '@/config/church';
import { PALETTES } from '@/config/palettes';
import { supabase } from '@/integrations/supabase/client';

const SAVED_KEY = 'church_space_v1';

/** The church someone is joining while they sign up (AuthPage passes it on; ChurchLandingPage finishes) */
export const JOINING_KEY = 'church_space_joining';

/** Opened on the Church Space address */
export const onPlatform = PLATFORM.hosts.includes(location.hostname);

const readSaved = (): ChurchRow | null => {
  try {
    const row = JSON.parse(localStorage.getItem(SAVED_KEY) || 'null');
    return row && typeof row.id === 'string' && typeof row.slug === 'string' ? row : null;
  } catch {
    return null;
  }
};

/** The church chosen on this phone (Church Space address only) */
export const chosenChurch: ChurchRow | null = onPlatform ? readSaved() : null;

/** The church every request is for, or null (Church Space, none chosen yet) */
export const currentChurchId: string | null = onPlatform ? chosenChurch?.id ?? null : PLATFORM.defaultChurchId;

/** Use this church from now on (the app restarts in it) */
export const chooseChurch = (row: ChurchRow, path = '/') => {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(row));
  } catch {
    /* private mode: chosen for this visit only */
  }
  location.replace(path);
};

/** Back to "Find your church" */
export const forgetChurch = () => {
  try {
    localStorage.removeItem(SAVED_KEY);
  } catch {
    /* nothing saved */
  }
  location.replace('/');
};

/** "#16a34a" → shades from very light (50) to very dark (950), as "r g b" */
const shadesFromHex = (hex: string): Record<string, string> => {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const mix = (to: number, amount: number) => rgb.map((c) => Math.round(c + (to - c) * amount)).join(' ');
  return {
    '50': mix(255, 0.94), '100': mix(255, 0.86), '200': mix(255, 0.72), '300': mix(255, 0.52), '400': mix(255, 0.26),
    '500': mix(255, 0.1), '600': rgb.join(' '), '700': mix(0, 0.18), '800': mix(0, 0.34), '900': mix(0, 0.48), '950': mix(0, 0.64),
  };
};

/** The shades for a church's colour (a named set, or its own "#rrggbb") */
export const paletteFor = (colour: string) =>
  /^#[0-9a-f]{6}$/i.test(colour) ? shadesFromHex(colour) : PALETTES[colour] ?? PALETTES.blue;

/** "r g b" → "#rrggbb" */
export const rgbToHex = (rgb: string) => '#' + rgb.split(' ').map((c) => Number(c).toString(16).padStart(2, '0')).join('');

/** "r g b" → "h s% l%" (how the stylesheet writes --primary) */
const rgbToHsl = (rgb: string) => {
  const [r, g, b] = rgb.split(' ').map((c) => Number(c) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return `${Math.round(((h * 60) + 360) % 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

/** Recolour the app's accents (Tailwind "blue" points at these: tailwind.config.ts; tabs and header use --primary) */
export const applyColour = (colour: string, el: HTMLElement = document.documentElement) => {
  if (colour === 'blue' && el === document.documentElement) return; // the stylesheet's own
  const palette = paletteFor(colour);
  for (const [shade, rgb] of Object.entries(palette)) el.style.setProperty(`--brand-${shade}`, rgb);
  el.style.setProperty('--primary', rgbToHsl(palette['500']));
  el.style.setProperty('--ring', rgbToHsl(palette['500']));
};

const setMeta = (selector: string, attr: string, value: string) => {
  document.querySelectorAll(selector).forEach((el) => el.setAttribute(attr, value));
};

// ---- Start-up -------------------------------------------------------------

if (onPlatform) {
  Object.assign(church, chosenChurch ? profileFromRow(chosenChurch) : platformProfile());
  applyColour(church.colour);
  // The page's name and icons (index.html has The Power House's): what the phone
  // uses when this church's app is added to the Home Screen
  document.title = church.name;
  setMeta('meta[name="apple-mobile-web-app-title"]', 'content', church.name);
  setMeta('meta[name="description"]', 'content', church.description);
  setMeta('link[rel="apple-touch-icon"]', 'href', church.brand.icon192);
  setMeta('link[rel="icon"]', 'href', church.brand.icon192);
  setMeta('link[rel="manifest"]', 'href', `/api/manifest${chosenChurch ? `?church=${encodeURIComponent(chosenChurch.slug)}` : ''}`);
  document.querySelectorAll('link[rel="apple-touch-startup-image"]').forEach((el) => el.remove());
}

if (currentChurchId) {
  // supabase-js copies this into every database request. Not server functions: their
  // browser rules (CORS) refuse headers they don't list, so the request would fail
  (supabase as unknown as { rest: { headers: Headers } }).rest.headers.set('x-church-id', currentChurchId);
}

/** Look up a church (by link or id) */
export const findChurch = async (by: { slug?: string; id?: string }): Promise<ChurchRow | null> => {
  const { data } = await supabase.rpc('church_directory' as never, { find_slug: by.slug ?? null, find_id: by.id ?? null } as never);
  return ((data as ChurchRow[] | null) ?? [])[0] ?? null;
};

// Keep the saved copy up to date (name, logo, colour changes show from the next start)
if (chosenChurch) {
  setTimeout(() => {
    findChurch({ id: chosenChurch.id })
      .then((row) => {
        if (row && JSON.stringify(row) !== JSON.stringify(chosenChurch)) localStorage.setItem(SAVED_KEY, JSON.stringify(row));
      })
      .catch(() => undefined);
  }, 8000);
}
