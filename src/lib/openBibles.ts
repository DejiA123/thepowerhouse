import { THE_POWER_HOUSE } from '@/config/church';
import { currentChurchId } from '@/lib/churchSpace';

/**
 * Which Bibles a church's app may show.
 *
 * Church Space is sold to churches, so its churches only get Bibles whose licences allow
 * commercial use: public domain, or open licences (CC BY / CC BY-SA, credited under the
 * chapter). Their text comes from the Free Use Bible API (bible.helloao.org), whose
 * catalogue states each Bible's licence (checked Nov 2026: `license.commercialUse` is
 * "allowed" for every one below). The licensed modern translations (NIV, ESV, NLT, NKJV,
 * NASB, AMP, MSG, CSB) and the narrated recordings need publishers' permission for a paid
 * product, so they stay off until licences are agreed; audio is the app's own reading voice.
 *
 * The Power House isn't sold (it's the church's own app), so it keeps everything as before.
 */
export const openBiblesOnly = currentChurchId !== THE_POWER_HOUSE.dbId;

export interface OpenBible {
  /** The id the app stores as the chosen translation */
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  /** The Free Use Bible API translation */
  source: string;
  /** Shown under the chapter when the licence asks for credit */
  credit?: string;
  /** Other ids that mean this Bible (older saved choices, API.Bible ids) */
  aliases?: RegExp;
}

const BY_SA = 'Licensed CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0), via eBible.org.';

export const OPEN_BIBLES: OpenBible[] = [
  { id: 'BSB', abbreviation: 'BSB', name: 'Berean Standard Bible', language: 'English', source: 'BSB' },
  { id: 'KJV', abbreviation: 'KJV', name: 'King James Version', language: 'English', source: 'eng_kjv', aliases: /^(kjv|de4e12af7f28f599)/i },
  { id: 'WEB', abbreviation: 'WEB', name: 'World English Bible', language: 'English', source: 'ENGWEBP', aliases: /^(web|engwebp)$/i },
  {
    id: 'LSV', abbreviation: 'LSV', name: 'Literal Standard Version', language: 'English', source: 'eng_lsv',
    credit: `Literal Standard Version. ${BY_SA}`,
  },
  { id: 'MSB', abbreviation: 'MSB', name: 'Majority Standard Bible', language: 'English', source: 'eng_msb' },
  { id: 'ASV', abbreviation: 'ASV', name: 'American Standard Version', language: 'English', source: 'eng_asv', aliases: /^(asv|06125adad2d5898a|f421fe261da7624f)/i },
  { id: 'YLT', abbreviation: 'YLT', name: "Young's Literal Translation", language: 'English', source: 'eng_ylt' },
  { id: 'DBY', abbreviation: 'DBY', name: 'Darby Translation', language: 'English', source: 'eng_dby', aliases: /^(dby|darby)$/i },
  { id: 'YOR', abbreviation: 'YOR', name: 'Bibeli Mimọ (Yoruba Bible)', language: 'Yoruba', source: 'yor_bib', credit: `Yoruba Bible. ${BY_SA}` },
  { id: 'IBO', abbreviation: 'IBO', name: 'Baịbụl Nsọ (Igbo Bible)', language: 'Igbo', source: 'ibo_bib', credit: `Igbo Bible. ${BY_SA}` },
  { id: 'HAU', abbreviation: 'HAU', name: 'Hausa Contemporary Bible', language: 'Hausa', source: 'hau_bib', credit: `Hausa Contemporary Bible. ${BY_SA}` },
  { id: 'TWI', abbreviation: 'TWI', name: 'Twi Bible (Akuapem)', language: 'Twi', source: 'twi_aka', credit: `Akuapem Twi Bible. ${BY_SA}` },
  { id: 'ASA', abbreviation: 'ASA', name: 'Twi Bible (Asante)', language: 'Twi', source: 'twi_asa', credit: `Asante Twi Bible. ${BY_SA}` },
  { id: 'IBB', abbreviation: 'IBB', name: 'Ibibio Contemporary Bible', language: 'Ibibio', source: 'ibb_bib', credit: `Ibibio Contemporary Bible. ${BY_SA}` },
  { id: 'EWE', abbreviation: 'EWE', name: 'Éwé Bible', language: 'Ewe', source: 'ewe_bib', credit: `Éwé Bible. ${BY_SA}` },
  { id: 'SWH', abbreviation: 'SWH', name: 'Kiswahili Contemporary Version', language: 'Swahili', source: 'swh_bib', credit: `Kiswahili Contemporary Version. ${BY_SA}` },
  { id: 'LIN', abbreviation: 'LIN', name: 'Lingala Bible', language: 'Lingala', source: 'lin_bib', credit: `Lingala Bible. ${BY_SA}` },
  { id: 'SNA', abbreviation: 'SNA', name: 'Shona Bible', language: 'Shona', source: 'sna_bib', credit: `Shona Bible. ${BY_SA}` },
  { id: 'NYA', abbreviation: 'NYA', name: 'Chichewa Bible', language: 'Chichewa', source: 'nya_bib', credit: `Chichewa Bible. ${BY_SA}` },
  { id: 'LUG', abbreviation: 'LUG', name: 'Luganda Bible', language: 'Luganda', source: 'lug_bib', credit: `Luganda Bible. ${BY_SA}` },
  { id: 'LSG', abbreviation: 'LSG', name: 'Louis Segond 1910 (French)', language: 'French', source: 'fra_lsg' },
  { id: 'R09', abbreviation: 'RV1909', name: 'Reina-Valera 1909 (Spanish)', language: 'Spanish', source: 'spa_r09' },
  {
    id: 'BLJ', abbreviation: 'BLJ', name: 'Bíblia Livre (Portuguese)', language: 'Portuguese', source: 'por_blj',
    credit: 'Bíblia Livre. Credit required by its licence; see ebible.org/Scriptures/details.php?id=porbr2018.',
  },
];

/** The open Bible a saved choice means, if any */
export function openBibleFor(version: string | null | undefined): OpenBible | null {
  const v = (version || '').trim();
  if (!v) return null;
  return OPEN_BIBLES.find((b) => b.id.toLowerCase() === v.toLowerCase() || b.abbreviation.toLowerCase() === v.toLowerCase() || b.aliases?.test(v)) ?? null;
}

/** On Church Space, a choice that isn't an open Bible becomes the Berean Standard Bible */
export const DEFAULT_OPEN_BIBLE = OPEN_BIBLES[0];
export function allowedVersion(version: string | null | undefined): string {
  if (!openBiblesOnly) return version || 'de4e12af7f28f599-02';
  return (openBibleFor(version) ?? DEFAULT_OPEN_BIBLE).id;
}

/** Bolls.life codes for searching the public-domain English Bibles (its search covers them) */
export const OPEN_SEARCH_CODE: Record<string, string> = { KJV: 'KJV', WEB: 'WEB', YLT: 'YLT', BSB: 'BSB', ASV: 'ASV', DBY: 'DARBY' };
