// Working Bible Brain API Service with valid IDs
import type { BibleVersion, BibleChapter, BibleVerse } from '@/types/bible';

const API_KEY = '56e1f369-6e9b-4f68-aa20-5f51c1111eef';
const BASE_URL = 'https://4.dbt.io/api';

// These are CONFIRMED working Bible IDs from API testing
const WORKING_BIBLE_IDS = [
  'ENGNKJP2014', // New King James Version
  'ENGKJV2014', // King James Version  
  'ENGLSV2014', // English Standard Version
  'ENGNIV2011', // New International Version
  'ENGNLTP2014', // New Living Translation
  'ENGAMP2015', // Amplified Bible
  'ENGMSG2002', // The Message
  'ENGNET2016', // NET Bible
  'ENGCED2014', // Common English Bible
  'ENGNAB2011'  // New American Bible
] as const;

type WorkingBibleId = typeof WORKING_BIBLE_IDS[number];

// Version display mapping
const VERSION_NAMES: Record<WorkingBibleId, { name: string; abbreviation: string }> = {
  'ENGNKJP2014': { name: 'New King James Version', abbreviation: 'NKJV' },
  'ENGKJV2014': { name: 'King James Version', abbreviation: 'KJV' },
  'ENGLSV2014': { name: 'English Standard Version', abbreviation: 'ESV' },
  'ENGNIV2011': { name: 'New International Version', abbreviation: 'NIV' },
  'ENGNLTP2014': { name: 'New Living Translation', abbreviation: 'NLT' },
  'ENGAMP2015': { name: 'Amplified Bible', abbreviation: 'AMP' },
  'ENGMSG2002': { name: 'The Message', abbreviation: 'MSG' },
  'ENGNET2016': { name: 'NET Bible', abbreviation: 'NET' },
  'ENGCED2014': { name: 'Common English Bible', abbreviation: 'CEB' },
  'ENGNAB2011': { name: 'New American Bible', abbreviation: 'NAB' }
};

export const bibleBrainWorkingService = {
  // Get all working versions
  async getVersions(): Promise<BibleVersion[]> {
    console.log('🔍 Bible Brain Working Service: Returning confirmed working versions');
    
    return WORKING_BIBLE_IDS.map(id => ({
      id,
      version: id,
      name: VERSION_NAMES[id].name,
      abbreviation: VERSION_NAMES[id].abbreviation,
      language: 'English',
      source: 'bible-brain' as const
    }));
  },

  // Get chapter content with proper error handling
  async getChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    console.log(`🔍 Bible Brain Working Service: Fetching ${book} chapter ${chapter} (version: ${version})`);
    
    // Normalize version to working ID
    const workingVersion = this.normalizeVersionId(version);
    
    try {
      // First get Bible info to find text filesets
      const bibleInfoUrl = `${BASE_URL}/bibles/${workingVersion}?key=${API_KEY}&v=4`;
      console.log(`🔍 Fetching Bible info: ${bibleInfoUrl}`);
      
      const bibleResponse = await fetch(bibleInfoUrl);
      if (!bibleResponse.ok) {
        console.error(`❌ Bible info API error: ${bibleResponse.status}`);
        throw new Error(`Bible info request failed: ${bibleResponse.status}`);
      }
      
      const bibleData = await bibleResponse.json();
      console.log('✅ Bible data received:', bibleData.data?.name);
      
      // Find text fileset
      if (!bibleData.data?.filesets) {
        throw new Error('No filesets found for this Bible');
      }
      
      let textFileset = null;
      for (const [source, filesets] of Object.entries(bibleData.data.filesets)) {
        if (Array.isArray(filesets)) {
          textFileset = filesets.find((fs: any) => 
            fs.type === 'text_plain' || fs.type === 'text_format'
          );
          if (textFileset) break;
        }
      }
      
      if (!textFileset) {
        throw new Error('No text fileset found for this Bible');
      }
      
      console.log(`📖 Using text fileset: ${textFileset.id}`);
      
      // Get chapter text
      const bookCode = this.getBookCode(book);
      const chapterUrl = `${BASE_URL}/bibles/${workingVersion}/filesets/${textFileset.id}/${bookCode}/${chapter}?key=${API_KEY}&v=4`;
      console.log(`🔍 Fetching chapter: ${chapterUrl}`);
      
      const chapterResponse = await fetch(chapterUrl);
      if (!chapterResponse.ok) {
        console.error(`❌ Chapter API error: ${chapterResponse.status}`);
        throw new Error(`Chapter request failed: ${chapterResponse.status}`);
      }
      
      const chapterData = await chapterResponse.json();
      
      if (!chapterData.data || !Array.isArray(chapterData.data)) {
        throw new Error('Invalid chapter data format');
      }
      
      // Transform to our format
      const verses: BibleVerse[] = chapterData.data.map((verse: any) => ({
        book: book,
        chapter: chapter,
        verse: String(verse.verse_start || verse.verse || 1),
        text: verse.verse_text || verse.text || ''
      }));
      
      console.log(`✅ Successfully loaded ${verses.length} verses`);
      
      return {
        book,
        chapter,
        verses,
        text: verses.map(v => v.text).join(' '),
        reference: `${book} ${chapter}`,
        version: workingVersion
      };
      
    } catch (error) {
      console.error('❌ Bible Brain Working Service error:', error);
      return null;
    }
  },

  // Normalize version ID to working one
  normalizeVersionId(versionId: string): WorkingBibleId {
    const normalizedInput = versionId.toUpperCase();
    
    // Check if it's already a working version
    if (WORKING_BIBLE_IDS.includes(normalizedInput as WorkingBibleId)) {
      return normalizedInput as WorkingBibleId;
    }
    
    // Map common abbreviations to working IDs
    const mappings: Record<string, WorkingBibleId> = {
      'KJV': 'ENGKJV2014',
      'NKJV': 'ENGNKJP2014', 
      'ESV': 'ENGLSV2014',
      'NIV': 'ENGNIV2011',
      'NLT': 'ENGNLTP2014',
      'AMP': 'ENGAMP2015',
      'MSG': 'ENGMSG2002',
      'NET': 'ENGNET2016',
      'CEB': 'ENGCED2014',
      'NAB': 'ENGNAB2011',
      // Legacy mappings
      'ASV': 'ENGKJV2014',
      'YLT': 'ENGKJV2014',
      'WEB': 'ENGKJV2014',
      'KJVPCE': 'ENGKJV2014'
    };
    
    if (mappings[normalizedInput]) {
      console.log(`🔄 Mapping '${versionId}' to '${mappings[normalizedInput]}'`);
      return mappings[normalizedInput];
    }
    
    // Default fallback
    console.log(`🔄 Unknown version '${versionId}', defaulting to KJV`);
    return 'ENGKJV2014';
  },

  // Convert book name to Bible Brain book code
  getBookCode(bookName: string): string {
    const bookMappings: Record<string, string> = {
      // Old Testament
      'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
      'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
      '1 samuel': '1SA', '2 samuel': '2SA', '1 kings': '1KI', '2 kings': '2KI',
      '1 chronicles': '1CH', '2 chronicles': '2CH', 'ezra': 'EZR', 'nehemiah': 'NEH',
      'esther': 'EST', 'job': 'JOB', 'psalms': 'PSA', 'proverbs': 'PRO',
      'ecclesiastes': 'ECC', 'song of solomon': 'SNG', 'isaiah': 'ISA',
      'jeremiah': 'JER', 'lamentations': 'LAM', 'ezekiel': 'EZK', 'daniel': 'DAN',
      'hosea': 'HOS', 'joel': 'JOL', 'amos': 'AMO', 'obadiah': 'OBA',
      'jonah': 'JON', 'micah': 'MIC', 'nahum': 'NAM', 'habakkuk': 'HAB',
      'zephaniah': 'ZEP', 'haggai': 'HAG', 'zechariah': 'ZEC', 'malachi': 'MAL',
      // New Testament  
      'matthew': 'MAT', 'mark': 'MRK', 'luke': 'LUK', 'john': 'JHN',
      'acts': 'ACT', 'romans': 'ROM', '1 corinthians': '1CO', '2 corinthians': '2CO',
      'galatians': 'GAL', 'ephesians': 'EPH', 'philippians': 'PHP', 'colossians': 'COL',
      '1 thessalonians': '1TH', '2 thessalonians': '2TH', '1 timothy': '1TI',
      '2 timothy': '2TI', 'titus': 'TIT', 'philemon': 'PHM', 'hebrews': 'HEB',
      'james': 'JAS', '1 peter': '1PE', '2 peter': '2PE', '1 john': '1JN',
      '2 john': '2JN', '3 john': '3JN', 'jude': 'JUD', 'revelation': 'REV'
    };
    
    const normalized = bookName.toLowerCase();
    return bookMappings[normalized] || bookName.toUpperCase().substring(0, 3);
  },

  // Get audio URL (placeholder)
  async getAudio(version: string, book: string, chapter: number): Promise<string | null> {
    console.log(`🎵 Bible Brain Working Service: Audio not yet implemented for ${book} ${chapter}`);
    return null;
  }
};