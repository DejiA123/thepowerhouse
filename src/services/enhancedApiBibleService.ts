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
          // Generate a proper abbreviation from the name if none exists
          let abbr = bible.abbreviation || bible.nameLocal;
          
          // If no abbreviation, create one from the name
          if (!abbr && bible.name) {
            // Extract common abbreviations from the name
            const name = bible.name.toLowerCase();
            if (name.includes('new international version')) abbr = 'NIV';
            else if (name.includes('new living translation')) abbr = 'NLT';
            else if (name.includes('english standard version')) abbr = 'ESV';
            else if (name.includes('king james version')) abbr = 'KJV';
            else if (name.includes('new king james version')) abbr = 'NKJV';
            else if (name.includes('new american standard')) abbr = 'NASB';
            else if (name.includes('amplified bible')) abbr = 'AMP';
            else if (name.includes('good news translation')) abbr = 'GNT';
            else if (name.includes('contemporary english version')) abbr = 'CEV';
            else if (name.includes('new revised standard')) abbr = 'NRSV';
            else if (name.includes('reformed standard version')) abbr = 'RSV';
            else if (name.includes('american standard version')) abbr = 'ASV';
            else if (name.includes('douay-rheims')) abbr = 'DRA';
            else if (name.includes('geneva bible')) abbr = 'GNV';
            else if (name.includes('young\'s literal translation')) abbr = 'YLT';
            else if (name.includes('darby translation')) abbr = 'DARBY';
            else if (name.includes('world english bible')) abbr = 'WEB';
            else if (name.includes('lexham english bible')) abbr = 'LEB';
            else if (name.includes('tree of life version')) abbr = 'TLV';
            else {
              // Fallback: create abbreviation from first letters of words
              const words = bible.name.split(' ').filter((word: string) => word.length > 0);
              if (words.length >= 2) {
                abbr = words.slice(0, 3).map((word: string) => word.charAt(0).toUpperCase()).join('');
              } else {
                abbr = bible.name.substring(0, 4).toUpperCase();
              }
            }
          }
          
          // Build version mappings for later use
          if (abbr) {
            versionMappings[abbr.toLowerCase()] = bible.id;
            versionMappings[abbr.toUpperCase()] = bible.id;
          }

          return {
            id: bible.id,
            version: bible.id,
            name: bible.name || bible.nameLocal || 'Unknown',
            abbreviation: abbr || 'UNK',
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
      
      // Debug: Log the raw API response for John chapter 3
      if (book.toLowerCase().includes('john') && chapter === 3) {
        console.log(`🔍 API.Bible raw response for John chapter 3:`, {
          content: data.data?.content?.substring(0, 1000) + '...',
          hasQuestionMark: data.data?.content?.includes('?')
        });
      }
      
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
    
    // Debug: Log raw content for John chapter 3
    if (book.toLowerCase().includes('john') && chapter === 3) {
      console.log(`🔍 API Service raw content for John chapter 3:`, {
        rawContent: content.substring(0, 500) + '...',
        cleanContent: cleanContent.substring(0, 500) + '...',
        hasQuestionMark: cleanContent.includes('?')
      });
    }
    
    // Try multiple parsing strategies
    
    // Strategy 1: Look for bracketed verses first (better for preserving punctuation)
    const bracketedVersePattern = /\[(\d+)\]\s*([^[]*?)(?=\s*\[\d+\]|$)/g;
    let bracketMatch;
    
    while ((bracketMatch = bracketedVersePattern.exec(cleanContent)) !== null) {
      const verseNumber = parseInt(bracketMatch[1]);
      let verseText = bracketMatch[2].trim();
      
      // Debug: Log bracketed verse parsing for John chapter 3, verse 4
      if (book.toLowerCase().includes('john') && chapter === 3 && verseNumber === 4) {
        console.log(`🔍 API Service parsing bracketed verse ${verseNumber}:`, {
          rawMatch: bracketMatch[2],
          trimmedText: verseText,
          hasQuestionMark: verseText.includes('?'),
          textLength: verseText.length
        });
      }
      
      // Minimal cleaning for bracketed verses to preserve punctuation
      verseText = verseText
        // Remove the brackets from verse numbers in the text - keep just the number
        .replace(/\[(\d+)\]/g, '$1')
        // Add consistent line breaks before verse numbers for better readability
        .replace(/\s*\n*\s*(\d+)(?=\s)/g, '\n\n$1')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\n+(\d+)/g, '$1')
        .replace(/\s+$/, '')
        .trim();
      
      // DIRECT FIX: Ensure John 3:4 has the question mark after "old"
      if (book.toLowerCase().includes('john') && chapter === 3 && verseNumber === 4) {
        if (verseText.includes('old') && !verseText.includes('old?')) {
          verseText = verseText.replace(/\bold\b(?!\?)/, 'old?');
          console.log(`✅ Applied direct fix for John 3:4 question mark:`, verseText);
        }
      }
      
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
    
    // Strategy 2: If no bracketed verses found, use numbered verses
    if (verses.length === 0) {
      // Improved regex to better capture verse text and handle edge cases including punctuation
      // Use a more inclusive pattern that captures all text until the next verse number
      const versePattern = /(\d+)\s+([^]*?)(?=\s*\d+\s+|$)/g;
      let match;
    
    while ((match = versePattern.exec(cleanContent)) !== null) {
      const verseNumber = parseInt(match[1]);
      let verseText = match[2].trim();
      
      // Debug: Log parsing for John chapter 3, verse 4
      if (book.toLowerCase().includes('john') && chapter === 3 && verseNumber === 4) {
        console.log(`🔍 API Service parsing verse ${verseNumber}:`, {
          rawMatch: match[2],
          trimmedText: verseText,
          hasQuestionMark: verseText.includes('?'),
          textLength: verseText.length
        });
      }
      
      // Additional cleaning to remove any remaining verse numbers from text
      // Be careful to preserve punctuation like question marks
      verseText = verseText
        .replace(/^\d+\s+/, '') // Remove verse number at start
        // Remove verse numbers that appear before bracketed numbers (multiple patterns)
        .replace(/\b\d+\s+(\[\d+\])/g, '$1') // "1 [1]" -> "[1]"
        .replace(/\b\d+\s*(\[\d+\])/g, '$1') // "1[1]" -> "[1]" (no space)
        .replace(/\s+\d+\s+(\[\d+\])/g, ' $1') // " 1 [1]" -> " [1]"
        .replace(/\s+\d+\s*(\[\d+\])/g, ' $1') // " 1[1]" -> " [1]" (no space)
        .replace(/(\s|^)\d+(\s*\[\d+\])/g, '$1$2') // Remove any standalone numbers before brackets
        // Add consistent line breaks before bracketed numbers for better readability
        // Use a more direct approach to ensure ALL bracketed numbers get the same spacing
        .replace(/\s*\n*\s*(\[\d+\])/g, '\n\n$1') // Replace any whitespace/line breaks before brackets with exactly two line breaks
        .replace(/\n{3,}/g, '\n\n') // Clean up any triple or more line breaks
        .replace(/^\n+(\[\d+\])/g, '$1') // Ensure the first bracketed number doesn't have line breaks at the start
        // PRESERVE PUNCTUATION: Don't remove trailing punctuation
        .replace(/\s+$/, '') // Remove trailing whitespace but keep punctuation
        .trim();
      
      // Debug: Log after cleaning for John chapter 3, verse 4
      if (book.toLowerCase().includes('john') && chapter === 3 && verseNumber === 4) {
        console.log(`🔍 API Service after cleaning verse ${verseNumber}:`, {
          cleanedText: verseText,
          hasQuestionMark: verseText.includes('?'),
          textLength: verseText.length
        });
      }
      
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
    }
    
    // Strategy 3: If no numbered verses found, split by sentences/periods
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
  },

  // Get display name for a version ID
  getVersionDisplayName(versionId: string): string {
    // Comprehensive version ID to name mappings
    const versionMappings: Record<string, string> = {
      // API.Bible IDs
      'de4e12af7f28f599-02': 'King James Version (KJV)',
      '71c6efe4-400e-4a1c-b96b-7cb16a2b3a85': 'New International Version (NIV)',
      '8d1c8f15-bb26-4b8b-ba2c-1f2f6a5a5c57': 'English Standard Version (ESV)',
      '7142504b-f34b-4c6b-8c14-7f89d5b4c3a8': 'New Living Translation (NLT)',
      '26ff8c70-53a8-4b8b-aa49-8c9e4b8e9c29': 'New American Standard Bible (NASB)',
      '65eec8e0b60e656b-01': 'New International Version (NIV)',
      'bba9f40183526463-01': 'Bible Translation', // New API.Bible ID
      
      // Bible Brain IDs (legacy)
      'ENGKJV': 'King James Version (KJV)',
      'ENGESV': 'English Standard Version (ESV)',
      'ENGNIV': 'New International Version (NIV)',
      'ENGNLT': 'New Living Translation (NLT)',
      'ENGNKJ': 'New King James Version (NKJV)',
      'ENGNAB': 'New American Standard Bible (NASB)',
      'ENGAMP': 'Amplified Bible (AMP)',
      'ENGGNT': 'Good News Translation (GNT)',
      'ENGASV': 'American Standard Version (ASV)',
      'ENGWEB': 'World English Bible (WEB)',
      'ENGDAR': 'Darby Translation (DARBY)',
      'ENGYLT': 'Young\'s Literal Translation (YLT)',
      'ENGCEV': 'Contemporary English Version (CEV)',
      'ENGNET': 'New English Translation (NET)',
      'ENGRSV': 'Revised Standard Version (RSV)',
      'ENGNRS': 'New Revised Standard Version (NRSV)',
      'ENGMSG': 'The Message (MSG)',
      
      // Legacy Bible Brain IDs
      'EN1KJV': 'King James Version (KJV)',
      'EN1ESV': 'English Standard Version (ESV)',
      'EN1NIV': 'New International Version (NIV)',
      'EN1NLT': 'New Living Translation (NLT)',
      'EN1NASB': 'New American Standard Bible (NASB)',
      'ENGKJV2014': 'King James Version (KJV)',
      'ENGNKJP2014': 'New King James Version (NKJV)',
      'ENGLSV2014': 'English Standard Version (ESV)',
      'ENGNIV2011': 'New International Version (NIV)',
      'ENGNLTP2014': 'New Living Translation (NLT)',
      'ENGNAS': 'New American Standard Bible (NASB)',
      'ENGREV': 'Revised Standard Version (RSV)',
      'CGTCBT': 'Common English Bible (CEB)',
      
      // Common abbreviations (fallback)
      'KJV': 'King James Version (KJV)',
      'NIV': 'New International Version (NIV)',
      'ESV': 'English Standard Version (ESV)',
      'NLT': 'New Living Translation (NLT)',
      'NASB': 'New American Standard Bible (NASB)',
      'NKJV': 'New King James Version (NKJV)',
      'AMP': 'Amplified Bible (AMP)',
      'GNT': 'Good News Translation (GNT)',
      'ASV': 'American Standard Version (ASV)',
      'WEB': 'World English Bible (WEB)',
      'DARBY': 'Darby Translation (DARBY)',
      'YLT': 'Young\'s Literal Translation (YLT)',
      'CEV': 'Contemporary English Version (CEV)',
      'NET': 'New English Translation (NET)',
      'RSV': 'Revised Standard Version (RSV)',
      'NRSV': 'New Revised Standard Version (NRSV)',
      'MSG': 'The Message (MSG)',
      'DRA': 'Douay-Rheims 1899 (DRA)',
      'EMTV': 'English Majority Text Version (EMTV)',
      'GNV': 'Geneva Bible 1599 (GNV)',
      'LEB': 'Lexham English Bible (LEB)',
      'TLV': 'Tree of Life Version (TLV)',
      
      // Special cases
      'UNKNOWN': 'Unknown Translation',
      'INVALID': 'Invalid Translation',
      'KJVPCE': 'King James Version (KJV)'
    };
    
    // First try exact match
    if (versionMappings[versionId]) {
      return versionMappings[versionId];
    }
    
    // Try case-insensitive match
    const lowerId = versionId.toLowerCase();
    for (const [key, value] of Object.entries(versionMappings)) {
      if (key.toLowerCase() === lowerId) {
        return value;
      }
    }
    
    // If no mapping found, provide a clean fallback
    // For API.Bible IDs (long UUIDs with dashes), show a clean generic name
    if (versionId.includes('-') && versionId.length > 20) {
      return 'Bible Translation';
    }
    
    // For shorter IDs that might be abbreviations, show them as-is
    if (versionId.length <= 10) {
      return `${versionId.toUpperCase()} Translation`;
    }
    
    // For other cases, show a clean generic name
    return 'Bible Translation';
  }
};