/**
 * Human-narrated chapters: Faith Comes By Hearing's Bible Brain (ESV, NLT,
 * NKJV) and the church's API.Bible account (the NIV, The Listener's Bible).
 *
 * Both hand out short-lived signed links, so each chapter is known in the
 * app by a fixed address on this site (see narratedKey). That address is
 * what downloads are saved under (the offline player in public/audio-sw.js
 * serves them), and it is swapped for a fresh signed link to stream.
 * API.Bible recordings have ids starting "ABS-".
 */
import { API_BIBLE_BASE_URL, API_BIBLE_KEY, reportListen } from '@/services/apiBible';

export const BIBLE_BRAIN_KEY = '56e1f369-6e9b-4f68-aa20-5f51c1111eef'; // public Bible Brain key already used by the app
const API = 'https://4.dbt.io/api';

export const BOOK_CODES: Record<string, string> = {
  genesis: 'GEN', exodus: 'EXO', leviticus: 'LEV', numbers: 'NUM', deuteronomy: 'DEU', joshua: 'JOS',
  judges: 'JDG', ruth: 'RUT', '1-samuel': '1SA', '2-samuel': '2SA', '1-kings': '1KI', '2-kings': '2KI',
  '1-chronicles': '1CH', '2-chronicles': '2CH', ezra: 'EZR', nehemiah: 'NEH', esther: 'EST', job: 'JOB',
  psalms: 'PSA', proverbs: 'PRO', ecclesiastes: 'ECC', 'song-of-solomon': 'SNG', isaiah: 'ISA',
  jeremiah: 'JER', lamentations: 'LAM', ezekiel: 'EZK', daniel: 'DAN', hosea: 'HOS', joel: 'JOL',
  amos: 'AMO', obadiah: 'OBA', jonah: 'JON', micah: 'MIC', nahum: 'NAM', habakkuk: 'HAB',
  zephaniah: 'ZEP', haggai: 'HAG', zechariah: 'ZEC', malachi: 'MAL', matthew: 'MAT', mark: 'MRK',
  luke: 'LUK', john: 'JHN', acts: 'ACT', romans: 'ROM', '1-corinthians': '1CO', '2-corinthians': '2CO',
  galatians: 'GAL', ephesians: 'EPH', philippians: 'PHP', colossians: 'COL', '1-thessalonians': '1TH',
  '2-thessalonians': '2TH', '1-timothy': '1TI', '2-timothy': '2TI', titus: 'TIT', philemon: 'PHM',
  hebrews: 'HEB', james: 'JAS', '1-peter': '1PE', '2-peter': '2PE', '1-john': '1JN', '2-john': '2JN',
  '3-john': '3JN', jude: 'JUD', revelation: 'REV',
};

const KEY_PATH = /\/audio-bible\/fcbh\/([A-Za-z0-9-]+)\/([0-9A-Z]{3})\/(\d+)\.mp3$/;

/** The fixed address of a narrated chapter (never fetched from the network itself). */
export function narratedKey(fileset: string, book: string, chapter: number): string | null {
  const code = BOOK_CODES[book.toLowerCase()];
  if (!code) return null;
  return `${self.location.origin}/audio-bible/fcbh/${fileset}/${code}/${chapter}.mp3`;
}

export const isNarratedKey = (url: string) => KEY_PATH.test(url);

/** A recording on the church's API.Bible account (not Bible Brain) */
export const isApiBibleRecording = (fileset: string) => fileset.startsWith('ABS-');

/** Signed links are kept until shortly before they run out */
const signed = new Map<string, { url: string; until: number; fums?: string }>();
const inflight = new Map<string, Promise<string>>();

async function signedLink(fileset: string, code: string, chapter: string) {
  if (isApiBibleRecording(fileset)) {
    const res = await fetch(`${API_BIBLE_BASE_URL}/audio-bibles/${fileset.slice(4)}/chapters/${code}.${chapter}?fums-version=3`, {
      headers: { 'api-key': API_BIBLE_KEY },
    });
    if (!res.ok) throw new Error(`API.Bible ${res.status}`);
    const json = await res.json();
    const url: string | undefined = json?.data?.resourceUrl;
    if (!url) throw new Error('No audio for this chapter');
    const expires = Number(json?.data?.expiresAt) * 1000 || Date.now() + 50 * 60 * 1000;
    return { url, until: expires - 5 * 60 * 1000, fums: json?.meta?.fumsToken as string | undefined };
  }
  const res = await fetch(`${API}/bibles/filesets/${fileset}/${code}/${chapter}?key=${BIBLE_BRAIN_KEY}&v=4`);
  if (!res.ok) throw new Error(`Bible Brain ${res.status}`);
  const json = await res.json();
  const url: string | undefined = json?.data?.[0]?.path;
  if (!url) throw new Error('No audio for this chapter');
  // Bible Brain links last about a day
  return { url, until: Date.now() + 60 * 60 * 1000 };
}

/** A playable link for a narrated chapter address (needs a connection). `fresh` skips the kept one. */
export async function streamUrlFor(key: string, fresh = false): Promise<string> {
  const m = KEY_PATH.exec(key);
  if (!m) return key;
  const hit = signed.get(key);
  if (hit && !fresh && Date.now() < hit.until) return hit.url;
  if (inflight.has(key)) return inflight.get(key)!;
  const [, fileset, code, chapter] = m;
  const load = (async () => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const link = await signedLink(fileset, code, chapter);
        signed.set(key, link);
        return link.url;
      } catch (error) {
        lastError = error;
        if (navigator.onLine === false) break;
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
    throw lastError;
  })();
  inflight.set(key, load);
  try {
    return await load;
  } finally {
    inflight.delete(key);
  }
}

/** The narrated chapter at this address started playing: report it where the licence asks. */
export function narratedStarted(key: string) {
  const link = signed.get(key);
  if (link?.fums) reportListen(link.fums);
}
