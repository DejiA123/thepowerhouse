/**
 * Which audio each Bible translation is read with.
 *
 *  - KJV: Faith Comes By Hearing's KJV recording, saved on archive.org (unchanged).
 *  - ESV, NLT and the NKJV New Testament: real human narrators, streamed from
 *    Faith Comes By Hearing's Bible Brain (licensed through the app's key).
 *  - Every other translation: an AI voice made on the phone itself (see
 *    src/services/aiVoice). Publishers don't allow audio files of their
 *    translations to be made and handed out, but reading the text aloud on the
 *    reader's own device (like a screen reader) is fine.
 */
import { bibleBooks } from '@/components/bible/BibleBookList';

export interface NarratedBible {
  /** Bible Brain fileset for each testament (missing = not recorded) */
  ot?: string;
  nt?: string;
  /** Downloading for offline listening is allowed by the licence */
  downloadable: boolean;
  narrator: string;
  credit: string;
}

export const NARRATED: Record<string, NarratedBible> = {
  ESV: {
    ot: 'ENGESVO1DA',
    nt: 'ENGESVN1DA',
    downloadable: true,
    narrator: 'Narrated',
    credit: 'ESV® © 2001 Crossway. Audio ℗ 2009 Hosanna, via Faith Comes By Hearing.',
  },
  NLT: {
    ot: 'ENGNLHO1DA',
    nt: 'ENGNLHN1DA',
    downloadable: false,
    narrator: "her.BIBLE women's voices",
    credit: 'NLT © 1996, 2004, 2015 Tyndale House Foundation. her.BIBLE audio © 2020 Cru, via Faith Comes By Hearing.',
  },
  NKJV: {
    nt: 'ENGNKJN1DA',
    downloadable: false,
    narrator: 'Narrated',
    credit: 'NKJV® © 1982 Thomas Nelson. Audio ℗ 1985 Hosanna, via Faith Comes By Hearing.',
  },
};

/** Translations whose text can't be read aloud (the text source no longer has it). */
const NO_AUDIO = new Set(['NIV']);

const OT = new Set(bibleBooks['Old Testament'].map((b) => b.apiName));
export const isOldTestament = (book: string) => OT.has(book.toLowerCase());

/** API.Bible ids of the translations it serves (the others use short codes like "NASB") */
const API_BIBLE_IDS: [RegExp, string][] = [
  [/^de4e12af7f28f599/i, 'KJV'],
  [/^(06125adad2d5898a|f421fe261da7624f)/i, 'ASV'],
  [/^55ec700d9e0d77ea/i, 'EMTV'],
  [/^71c6efe4/i, 'NIV'],
  [/^8d1c8f15/i, 'ESV'],
  [/^7142504b/i, 'NLT'],
  [/^26ff8c70/i, 'NASB'],
];

/** "KJV", "ESV", "NASB"… for any version id the app uses. */
export function translationCode(version: string): string {
  const v = (version || '').trim();
  const known = API_BIBLE_IDS.find(([pattern]) => pattern.test(v));
  if (known) return known[1];
  const code = v.toUpperCase().replace(/^ENG(?=[A-Z]{3})/, '');
  return code === 'NKJ' ? 'NKJV' : code || 'KJV';
}

export type ChapterAudioPlan =
  | { kind: 'recording'; translation: 'KJV' }
  | { kind: 'narrated'; translation: string; fileset: string; bible: NarratedBible }
  | { kind: 'ai'; translation: string }
  | { kind: 'none'; translation: string };

/** How this chapter of this translation is listened to. */
export function audioPlanFor(version: string, book: string): ChapterAudioPlan {
  const translation = translationCode(version);
  if (translation === 'KJV') return { kind: 'recording', translation };
  if (NO_AUDIO.has(translation)) return { kind: 'none', translation };
  const narrated = NARRATED[translation];
  const fileset = narrated && (isOldTestament(book) ? narrated.ot : narrated.nt);
  if (narrated && fileset) return { kind: 'narrated', translation, fileset, bible: narrated };
  return { kind: 'ai', translation };
}

/**
 * Where downloads for this translation are kept apart from the others
 * ("KJV" for the original recordings, the Bible Brain id for narrations),
 * or null when its audio can't be downloaded.
 */
export function downloadSourceFor(version: string, book: string): string | null {
  const plan = audioPlanFor(version, book);
  if (plan.kind === 'recording') return 'KJV';
  if (plan.kind === 'narrated' && plan.bible.downloadable) return plan.fileset.slice(0, 6);
  return null;
}

/** A short line for the player: who is reading. */
export function voiceLabel(plan: ChapterAudioPlan): string {
  if (plan.kind === 'recording') return 'Narrated';
  if (plan.kind === 'narrated') return plan.bible.narrator;
  if (plan.kind === 'ai') return 'AI voice';
  return '';
}
