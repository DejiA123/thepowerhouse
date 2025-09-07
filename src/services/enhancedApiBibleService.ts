// Enhanced API.Bible service - comprehensive replacement for Bible Brain API
import type { BibleVersion, BibleChapter, BibleVerse } from '@/types/bible';

const API_BIBLE_KEY = '637e6ef15c343223a24a54c1dd11a487';
const API_BIBLE_BASE_URL = 'https://api.scripture.api.bible/v1';

// Cache for API.Bible data to reduce requests
const cache = new Map<string, any>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Popular Bible version mappings - we'll fetch these dynamically but these are common ones
let versionMappings: Record<string, string> = {};

// Book name mappings to API.Bible format
const BOOK_MAPPINGS: Record<string, string> = {
  'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
  'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
  '1 samuel': '1SA', '1-samuel': '1SA', '2 samuel': '2SA', '2-samuel': '2SA',
  '1 kings': '1KI', '1-kings': '1KI', '2 kings': '2KI', '2-kings': '2KI',
  '1 chronicles': '1CH', '1-chronicles': '1CH', '2 chronicles': '2CH', '2-chronicles': '2CH',
  'ezra': 'EZR', 'nehemiah': 'NEH', 'esther': 'EST', 'job': 'JOB',
  'psalms': 'PSA', 'psalm': 'PSA', 'proverbs': 'PRO', 'ecclesiastes': 'ECC',
  'song of solomon': 'SNG', 'song-of-solomon': 'SNG', 'isaiah': 'ISA',
  'jeremiah': 'JER', 'lamentations': 'LAM', 'ezekiel': 'EZK', 'daniel': 'DAN',
  'hosea': 'HOS', 'joel': 'JOL', 'amos': 'AMO', 'obadiah': 'OBA',
  'jonah': 'JON', 'micah': 'MIC', 'nahum': 'NAM', 'habakkuk': 'HAB',
  'zephaniah': 'ZEP', 'haggai': 'HAG', 'zechariah': 'ZEC', 'malachi': 'MAL',
  'matthew': 'MAT', 'mark': 'MRK', 'luke': 'LUK', 'john': 'JHN',
  'acts': 'ACT', 'romans': 'ROM', '1 corinthians': '1CO', '1-corinthians': '1CO',
  '2 corinthians': '2CO', '2-corinthians': '2CO', 'galatians': 'GAL',
  'ephesians': 'EPH', 'philippians': 'PHP', 'colossians': 'COL',
  '1 thessalonians': '1TH', '1-thessalonians': '1TH', '2 thessalonians': '2TH', '2-thessalonians': '2TH',
  '1 timothy': '1TI', '1-timothy': '1TI', '2 timothy': '2TI', '2-timothy': '2TI',
  'titus': 'TIT', 'philemon': 'PHM', 'hebrews': 'HEB', 'james': 'JAS',
  '1 peter': '1PE', '1-peter': '1PE', '2 peter': '2PE', '2-peter': '2PE',
  '1 john': '1JN', '1-john': '1JN', '2 john': '2JN', '2-john': '2JN',
  '3 john': '3JN', '3-john': '3JN', 'jude': 'JUD', 'revelation': 'REV'
};

async function makeApiRequest(endpoint: string): Promise<any> {
  const cacheKey = endpoint;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const response = await fetch(`${API_BIBLE_BASE_URL}${endpoint}`, {
    headers: {
      'api-key': API_BIBLE_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API.Bible error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

function parseHtmlContent(htmlContent: string): string {
  // Remove HTML tags and decode entities
  return htmlContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function normalizeBookName(bookName: string): string {
  const normalized = bookName.toLowerCase().trim();
  return BOOK_MAPPINGS[normalized] || bookName.toUpperCase().substring(0, 3);
}

export const enhancedApiBibleService = {
  // Get all available Bible versions
  async getVersions(): Promise<BibleVersion[]> {
    try {
      console.log('🔍 Enhanced API.Bible Service: Fetching Bible versions...');
      
      const data = await makeApiRequest('/bibles?language=eng');
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from API.Bible');
      }

      // Process and filter English Bibles
      const versions: BibleVersion[] = data.data
        .filter((bible: any) => bible.language?.id === 'eng')
        .map((bible: any) => {
          // Build version mappings for later use
          const abbr = bible.abbreviation || bible.nameLocal || bible.name;
          if (abbr) {
            versionMappings[abbr.toLowerCase()] = bible.id;
            versionMappings[abbr.toUpperCase()] = bible.id;
          }

          return {
            id: bible.id,
            version: bible.id,
            name: bible.name || bible.nameLocal || 'Unknown',
            abbreviation: abbr || bible.id,
            language: 'English',
            source: 'api-bible' as const
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log(`✅ Enhanced API.Bible Service: Loaded ${versions.length} Bible versions`);
      return versions;
    } catch (error) {
      console.error('❌ Enhanced API.Bible Service error:', error);
      return this.getFallbackVersions();
    }
  },

  // Get chapter content
  async getChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Enhanced API.Bible Service: Fetching ${book} chapter ${chapter} (version: ${version})`);
      
      // Normalize inputs
      const bibleId = this.normalizeVersionId(version);
      const bookId = normalizeBookName(book);
      const chapterId = `${bookId}.${chapter}`;
      
      // Fetch chapter data
      const data = await makeApiRequest(`/bibles/${bibleId}/chapters/${chapterId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`);
      
      if (!data.data?.content) {
        throw new Error('No content found in API.Bible response');
      }

      // Parse verses from content
      const verses = this.parseChapterContent(data.data.content, book, chapter);
      
      if (verses.length === 0) {
        throw new Error('No verses could be parsed from content');
      }

      console.log(`✅ Enhanced API.Bible Service: Successfully loaded ${verses.length} verses`);
      
      return {
        book,
        chapter,
        verses,
        text: verses.map(v => v.text).join(' '),
        reference: `${book} ${chapter}`,
        version: bibleId
      };
    } catch (error) {
      console.error('❌ Enhanced API.Bible Service chapter error:', error);
      return null;
    }
  },

  // Parse chapter content into verses
  parseChapterContent(content: string, book: string, chapter: number): BibleVerse[] {
    const verses: BibleVerse[] = [];
    const cleanContent = parseHtmlContent(content);
    
    // Try multiple parsing strategies
    
    // Strategy 1: Look for numbered verses (most common)
    const versePattern = /(\d+)\s+([^0-9]+?)(?=\s*\d+\s+|$)/g;
    let match;
    
    while ((match = versePattern.exec(cleanContent)) !== null) {
      const verseNumber = parseInt(match[1]);
      const verseText = match[2].trim();
      
      if (verseText && verseNumber > 0) {
        verses.push({
          book,
          chapter,
          verse: verseNumber.toString(),
          text: verseText,
          reference: `${book} ${chapter}:${verseNumber}`,
          version: book
        });
      }
    }
    
    // Strategy 2: If no numbered verses found, split by sentences/periods
    if (verses.length === 0) {
      const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
      sentences.forEach((sentence, index) => {
        verses.push({
          book,
          chapter,
          verse: (index + 1).toString(),
          text: sentence.trim(),
          reference: `${book} ${chapter}:${index + 1}`,
          version: book
        });
      });
    }
    
    return verses;
  },

  // Get audio URL (placeholder - API.Bible may not provide audio directly)
  async getAudio(version: string, book: string, chapter: number): Promise<string | null> {
    console.log(`🎵 Enhanced API.Bible Service: Audio not available for ${book} ${chapter}`);
    return null;
  },

  // Search functionality
  async search(version: string, query: string): Promise<BibleVerse[]> {
    try {
      console.log(`🔍 Enhanced API.Bible Service: Searching for "${query}" in ${version}`);
      
      const bibleId = this.normalizeVersionId(version);
      const data = await makeApiRequest(`/bibles/${bibleId}/search?query=${encodeURIComponent(query)}&limit=50`);
      
      if (!data.data?.verses) {
        return [];
      }

      return data.data.verses.map((verse: any) => ({
        book: verse.bookId || 'Unknown',
        chapter: verse.chapterNumber || 1,
        verse: verse.verse?.toString() || '1',
        text: parseHtmlContent(verse.text || ''),
        reference: verse.reference || '',
        version: bibleId
      }));
    } catch (error) {
      console.error('❌ Enhanced API.Bible Service search error:', error);
      return [];
    }
  },

  // Normalize version ID
  normalizeVersionId(versionId: string): string {
    // Check if it's already a valid API.Bible ID (contains dashes and numbers)
    if (versionId.includes('-') && /[0-9]/.test(versionId)) {
      return versionId;
    }

    // Try to find mapping
    const mapped = versionMappings[versionId.toLowerCase()] || versionMappings[versionId.toUpperCase()];
    if (mapped) {
      return mapped;
    }

    // Common fallback mappings
    const commonMappings: Record<string, string> = {
      'kjv': 'de4e12af7f28f599-02',
      'niv': '71c6efe4-400e-4a1c-b96b-7cb16a2b3a85',
      'esv': '8d1c8f15-bb26-4b8b-ba2c-1f2f6a5a5c57',
      'nlt': '7142504b-f34b-4c6b-8c14-7f89d5b4c3a8',
      'nasb': '26ff8c70-53a8-4b8b-aa49-8c9e4b8e9c29'
    };

    const fallback = commonMappings[versionId.toLowerCase()];
    if (fallback) {
      console.log(`🔄 Mapping version '${versionId}' to '${fallback}'`);
      return fallback;
    }

    // Default to KJV
    console.log(`🔄 Unknown version '${versionId}', defaulting to KJV`);
    return 'de4e12af7f28f599-02';
  },

  // Get fallback versions if API fails
  getFallbackVersions(): BibleVersion[] {
    console.log('⚠️ Using fallback versions for API.Bible');
    return [
      {
        id: 'de4e12af7f28f599-02',
        version: 'de4e12af7f28f599-02',
        name: 'King James Version',
        abbreviation: 'KJV',
        language: 'English',
        source: 'api-bible' as const
      },
      {
        id: '71c6efe4-400e-4a1c-b96b-7cb16a2b3a85',
        version: '71c6efe4-400e-4a1c-b96b-7cb16a2b3a85',
        name: 'New International Version',
        abbreviation: 'NIV',
        language: 'English',
        source: 'api-bible' as const
      }
    ];
  }
};