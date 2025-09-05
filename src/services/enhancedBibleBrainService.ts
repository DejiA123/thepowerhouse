// Enhanced Bible Brain Service with comprehensive English translations support
import type { BibleVersion, BibleVerse, BibleChapter } from '@/types/bible';

// Book mapping for Bible Brain API
const BIBLE_BRAIN_BOOK_MAP: Record<string, string> = {
  'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
  'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
  '1-samuel': '1SA', '2-samuel': '2SA', '1-kings': '1KI', '2-kings': '2KI',
  '1-chronicles': '1CH', '2-chronicles': '2CH', 'ezra': 'EZR', 'nehemiah': 'NEH',
  'esther': 'EST', 'job': 'JOB', 'psalms': 'PSA', 'proverbs': 'PRO',
  'ecclesiastes': 'ECC', 'song-of-solomon': 'SNG', 'isaiah': 'ISA', 'jeremiah': 'JER',
  'lamentations': 'LAM', 'ezekiel': 'EZK', 'daniel': 'DAN', 'hosea': 'HOS',
  'joel': 'JOL', 'amos': 'AMO', 'obadiah': 'OBA', 'jonah': 'JON',
  'micah': 'MIC', 'nahum': 'NAM', 'habakkuk': 'HAB', 'zephaniah': 'ZEP',
  'haggai': 'HAG', 'zechariah': 'ZEC', 'malachi': 'MAL', 'matthew': 'MAT',
  'mark': 'MRK', 'luke': 'LUK', 'john': 'JHN', 'acts': 'ACT', 'romans': 'ROM',
  '1-corinthians': '1CO', '2-corinthians': '2CO', 'galatians': 'GAL', 'ephesians': 'EPH',
  'philippians': 'PHP', 'colossians': 'COL', '1-thessalonians': '1TH', '2-thessalonians': '2TH',
  '1-timothy': '1TI', '2-timothy': '2TI', 'titus': 'TIT', 'philemon': 'PHM',
  'hebrews': 'HEB', 'james': 'JAS', '1-peter': '1PE', '2-peter': '2PE',
  '1-john': '1JN', '2-john': '2JN', '3-john': '3JN', 'jude': 'JUD', 'revelation': 'REV'
};

export interface EnhancedBibleVersion extends BibleVersion {
  category?: 'Traditional' | 'Modern' | 'Paraphrase' | 'Study' | 'Regional' | 'Other';
  popularity?: number;
  year?: string;
  publisher?: string;
  description?: string;
  hasAudio?: boolean;
}

export interface BibleBrainApiResponse {
  data: any[];
  meta?: {
    pagination?: {
      total?: number;
      count?: number;
      per_page?: number;
      current_page?: number;
      total_pages?: number;
    };
  };
}

const BIBLE_BRAIN_DIRECT_URL = 'https://4.dbt.io/api/bibles';
const BIBLE_BRAIN_API_KEY = '56e1f369-6e9b-4f68-aa20-5f51c1111eef';

// Enhanced language detection patterns for comprehensive English identification
const ENGLISH_LANGUAGE_PATTERNS = [
  // Direct language matches
  'english', 'eng', 'en:', 'en-',
  // Common English Bible names
  'king james', 'new international', 'english standard', 'new living',
  'new american standard', 'new king james', 'amplified', 'revised standard',
  'american standard', 'contemporary english', 'good news', 'new revised standard',
  'holman christian standard', 'christian standard', 'new english translation',
  'english standard version', 'new international version', 'king james version',
  'new living translation', 'new american standard bible', 'amplified bible',
  'the message', 'new century version', 'god\'s word translation', 'world english bible',
  'young\'s literal translation', 'darby translation', 'webster\'s bible',
  'douay-rheims', 'lexham english bible', 'tree of life version',
  // Version abbreviations
  'kjv', 'niv', 'esv', 'nlt', 'nasb', 'nkjv', 'amp', 'rsv', 'asv', 'cev',
  'gnt', 'nrsv', 'hcsb', 'csb', 'net', 'msg', 'ncv', 'gwt', 'web', 'ylt',
  'darby', 'dby', 'webster', 'dra', 'leb', 'tlv'
];

// Version categorization mapping
const VERSION_CATEGORIES: Record<string, EnhancedBibleVersion['category']> = {
  // Traditional
  'kjv': 'Traditional', 'nkjv': 'Traditional', 'asv': 'Traditional',
  'rsv': 'Traditional', 'dra': 'Traditional', 'ylt': 'Traditional',
  'darby': 'Traditional', 'dby': 'Traditional', 'webster': 'Traditional',
  
  // Modern
  'niv': 'Modern', 'esv': 'Modern', 'nlt': 'Modern', 'nasb': 'Modern',
  'hcsb': 'Modern', 'csb': 'Modern', 'net': 'Modern', 'leb': 'Modern',
  'tlv': 'Modern', 'nrsv': 'Modern',
  
  // Paraphrase
  'msg': 'Paraphrase', 'cev': 'Paraphrase', 'gnt': 'Paraphrase',
  'ncv': 'Paraphrase', 'gwt': 'Paraphrase',
  
  // Study
  'amp': 'Study',
  
  // Regional
  'web': 'Regional'
};

// Popularity ranking (higher = more popular)
const VERSION_POPULARITY: Record<string, number> = {
  'niv': 100, 'kjv': 95, 'esv': 90, 'nlt': 85, 'nasb': 80,
  'nkjv': 75, 'amp': 70, 'rsv': 65, 'csb': 60, 'hcsb': 60,
  'nrsv': 55, 'net': 50, 'msg': 45, 'asv': 40, 'cev': 35,
  'gnt': 30, 'ncv': 25, 'gwt': 20, 'web': 15, 'ylt': 10,
  'darby': 10, 'dby': 10, 'dra': 8, 'leb': 8, 'tlv': 5
};

export const enhancedBibleBrainService = {
  // Comprehensive method to fetch ALL English Bible versions
  async getAllEnglishVersions(maxPages: number = 50): Promise<EnhancedBibleVersion[]> {
    try {
      console.log('🔍 Enhanced Bible Brain: Fetching ALL English Bible versions...');
      
      let allVersions: any[] = [];
      let page = 1;
      let totalPages = maxPages;
      
      // Fetch all pages to get comprehensive version list
      while (page <= totalPages) {
        try {
          console.log(`📄 Fetching page ${page}...`);
          const response = await fetch(`${BIBLE_BRAIN_DIRECT_URL}?key=${BIBLE_BRAIN_API_KEY}&v=4&page=${page}&limit=25`);
          
          if (!response.ok) {
            console.error(`❌ Bible Brain API error on page ${page}: ${response.status}`);
            break;
          }
          
          const data: BibleBrainApiResponse = await response.json();
          
          if (!data.data || !Array.isArray(data.data)) {
            console.error(`❌ Invalid response format on page ${page}`);
            break;
          }
          
          allVersions = allVersions.concat(data.data);
          
          // Update total pages based on API response
          if (data.meta?.pagination?.total_pages) {
            totalPages = Math.min(data.meta.pagination.total_pages, maxPages);
            console.log(`📊 Total pages available: ${data.meta.pagination.total_pages}, fetching up to: ${totalPages}`);
          }
          
          page++;
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ Error fetching page ${page}:`, error);
          break;
        }
      }
      
      console.log(`📚 Fetched ${allVersions.length} total Bible versions from ${page - 1} pages`);
      
      // Enhanced filtering for English versions
      const englishVersions = allVersions.filter(version => {
        return this.isEnglishVersion(version);
      });
      
      console.log(`🏴󠁧󠁢󠁥󠁮󠁧󠁿 Found ${englishVersions.length} English versions before transformation`);
      
      // Transform and enhance the versions
      const enhancedVersions = englishVersions
        .map(version => this.transformToEnhancedVersion(version))
        .filter(version => version !== null) as EnhancedBibleVersion[];
      
      // Sort by popularity and then alphabetically
      enhancedVersions.sort((a, b) => {
        const popularityDiff = (b.popularity || 0) - (a.popularity || 0);
        if (popularityDiff !== 0) return popularityDiff;
        return a.name.localeCompare(b.name);
      });
      
      console.log(`✅ Enhanced Bible Brain: Found ${enhancedVersions.length} English Bible versions`);
      console.log('📋 Top 10 versions:', enhancedVersions.slice(0, 10).map(v => `${v.abbreviation} (${v.name})`));
      
      return enhancedVersions;
      
    } catch (error) {
      console.error('❌ Enhanced Bible Brain service error:', error);
      return this.getFallbackVersions();
    }
  },

  // Enhanced English version detection
  isEnglishVersion(version: any): boolean {
    const name = (version.name || '').toLowerCase();
    const abbr = (version.abbr || '').toLowerCase();
    const languageName = (version.language?.name || '').toLowerCase();
    const languageCode = (version.language?.iso || version.language?.code || '').toLowerCase();
    
    // Check all fields for English indicators
    const searchText = `${name} ${abbr} ${languageName} ${languageCode}`.toLowerCase();
    
    return ENGLISH_LANGUAGE_PATTERNS.some(pattern => 
      searchText.includes(pattern.toLowerCase())
    );
  },

  // Transform Bible Brain version to enhanced version
  transformToEnhancedVersion(version: any): EnhancedBibleVersion | null {
    try {
      const abbreviation = version.abbr || version.id || '';
      const name = version.name || version.vernacular_title || `Unknown Version (${abbreviation})`;
      
      // Skip if no meaningful identifier
      if (!abbreviation || abbreviation.length < 2) {
        return null;
      }
      
      const abbr = abbreviation.toLowerCase();
      
      return {
        id: version.id || abbreviation,
        version: abbreviation,
        name: name,
        abbreviation: abbreviation.toUpperCase(),
        language: 'English',
        source: 'bible-brain' as const,
        category: VERSION_CATEGORIES[abbr] || 'Other',
        popularity: VERSION_POPULARITY[abbr] || 1,
        year: version.date || undefined,
        publisher: version.publisher || undefined,
        description: version.description || undefined,
        hasAudio: version.audio || false
      };
    } catch (error) {
      console.error('❌ Error transforming version:', error);
      return null;
    }
  },

  // Get fallback versions if API fails
  getFallbackVersions(): EnhancedBibleVersion[] {
    return [
      {
        id: 'ENGKJV',
        version: 'ENGKJV',
        name: 'King James Version',
        abbreviation: 'KJV',
        language: 'English',
        source: 'bible-brain',
        category: 'Traditional',
        popularity: 95,
        description: 'The classic 1769 King James Version'
      },
      {
        id: 'ENGESV',
        version: 'ENGESV',
        name: 'English Standard Version',
        abbreviation: 'ESV',
        language: 'English',
        source: 'bible-brain',
        category: 'Modern',
        popularity: 90,
        description: 'A modern translation emphasizing word-for-word accuracy'
      },
      {
        id: 'ENGNAS',
        version: 'ENGNAS',
        name: 'New American Standard Bible',
        abbreviation: 'NASB',
        language: 'English',
        source: 'bible-brain',
        category: 'Modern',
        popularity: 80,
        description: 'A literal translation widely used for study'
      },
      {
        id: 'ENGNIV',
        version: 'ENGNIV',
        name: 'New International Version',
        abbreviation: 'NIV',
        language: 'English',
        source: 'bible-brain',
        category: 'Modern',
        popularity: 100,
        description: 'The most popular modern English translation'
      },
      {
        id: 'ENGNLT',
        version: 'ENGNLT',
        name: 'New Living Translation',
        abbreviation: 'NLT',
        language: 'English',
        source: 'bible-brain',
        category: 'Modern',
        popularity: 85,
        description: 'A clear, contemporary English translation'
      }
    ];
  },

  // Get versions with search functionality
  async searchVersions(query: string): Promise<EnhancedBibleVersion[]> {
    const allVersions = await this.getAllEnglishVersions();
    
    if (!query.trim()) {
      return allVersions;
    }
    
    const searchLower = query.toLowerCase();
    
    return allVersions.filter(version => 
      version.name.toLowerCase().includes(searchLower) ||
      version.abbreviation.toLowerCase().includes(searchLower) ||
      (version.description?.toLowerCase().includes(searchLower))
    );
  },

  // Get versions by category
  async getVersionsByCategory(category: EnhancedBibleVersion['category']): Promise<EnhancedBibleVersion[]> {
    const allVersions = await this.getAllEnglishVersions();
    return allVersions.filter(version => version.category === category);
  },

  // Get most popular versions
  async getPopularVersions(limit: number = 10): Promise<EnhancedBibleVersion[]> {
    const allVersions = await this.getAllEnglishVersions();
    return allVersions
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  },

  // Get chapter content with verse text
  async getChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Enhanced Bible Brain: Fetching ${book} chapter ${chapter} (version: ${version})`);
      
      // Get the correct book ID for Bible Brain API
      const bibleBrainBook = BIBLE_BRAIN_BOOK_MAP[book.toLowerCase()];
      if (!bibleBrainBook) {
        console.error(`❌ Unknown book: ${book}`);
        return null;
      }
      
      // First get the Bible info to find available text filesets
      const bibleInfoUrl = `${BIBLE_BRAIN_DIRECT_URL}/${version}?key=${BIBLE_BRAIN_API_KEY}&v=4`;
      console.log(`🔍 Fetching Bible info: ${bibleInfoUrl}`);
      
      const bibleInfoResponse = await fetch(bibleInfoUrl);
      if (!bibleInfoResponse.ok) {
        console.error(`❌ Bible info API error: ${bibleInfoResponse.status}`);
        const errorText = await bibleInfoResponse.text();
        console.error(`❌ Error response: ${errorText}`);
        
        // Try fallback to KJV if this is not already KJV
        if (version !== 'ENGKJV') {
          console.log(`🔄 Attempting fallback to ENGKJV for ${book} chapter ${chapter}`);
          return await this.getChapter('ENGKJV', book, chapter);
        }
        return null;
      }
      
      const bibleInfo = await bibleInfoResponse.json();
      
      if (!bibleInfo.data || !bibleInfo.data.filesets) {
        console.error(`❌ No filesets found for ${version}`);
        // Try fallback to KJV if this is not already KJV
        if (version !== 'ENGKJV') {
          console.log(`🔄 Attempting fallback to ENGKJV for ${book} chapter ${chapter}`);
          return await this.getChapter('ENGKJV', book, chapter);
        }
        return null;
      }
      
      // Find text filesets (prefer text_plain, fallback to text_format)
      let textFileset = null;
      for (const [source, filesets] of Object.entries(bibleInfo.data.filesets)) {
        if (Array.isArray(filesets)) {
          textFileset = filesets.find((fs: any) => 
            fs.type === 'text_plain' || fs.type === 'text_format'
          );
          if (textFileset) break;
        }
      }
      
      if (!textFileset) {
        console.error(`❌ No text fileset found for ${version}`);
        // Try fallback to KJV if this is not already KJV
        if (version !== 'ENGKJV') {
          console.log(`🔄 Attempting fallback to ENGKJV for ${book} chapter ${chapter}`);
          return await this.getChapter('ENGKJV', book, chapter);
        }
        return null;
      }
      
      console.log(`🔍 Using text fileset: ${textFileset.id} (${textFileset.type})`);
      
      // Get chapter content using the correct fileset
      const chapterUrl = `${BIBLE_BRAIN_DIRECT_URL}/${version}/filesets/${textFileset.id}/${bibleBrainBook}/${chapter}?key=${BIBLE_BRAIN_API_KEY}&v=4`;
      console.log(`🔍 Fetching chapter: ${chapterUrl}`);
      
      const response = await fetch(chapterUrl);
      
      if (!response.ok) {
        console.error(`❌ Chapter API error: ${response.status}`);
        const errorText = await response.text();
        console.error(`❌ Error response: ${errorText}`);
        
        // Try fallback to KJV if this is not already KJV
        if (version !== 'ENGKJV') {
          console.log(`🔄 Attempting fallback to ENGKJV for ${book} chapter ${chapter}`);
          return await this.getChapter('ENGKJV', book, chapter);
        }
        return null;
      }
      
      const data = await response.json();
      console.log(`🔍 Chapter response:`, data);
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error(`❌ Invalid chapter response format`);
        // Try fallback to KJV if this is not already KJV
        if (version !== 'ENGKJV') {
          console.log(`🔄 Attempting fallback to ENGKJV for ${book} chapter ${chapter}`);
          return await this.getChapter('ENGKJV', book, chapter);
        }
        return null;
      }
      
      // Transform verses to match our interface
      const verses: BibleVerse[] = data.data.map((verse: any, index: number) => ({
        book: book,
        chapter: chapter,
        verse: String(verse.verse_start || verse.verse_sequence || index + 1),
        text: verse.verse_text || '',
        reference: `${book} ${chapter}:${verse.verse_start || verse.verse_sequence || index + 1}`,
        version: version
      }));
      
      const chapterData: BibleChapter = {
        book: book,
        chapter: chapter,
        verses: verses,
        text: verses.map(v => v.text).join(' '),
        reference: `${book} ${chapter}`,
        version: version
      };
      
      console.log(`✅ Enhanced Bible Brain: Successfully loaded ${verses.length} verses`);
      return chapterData;
    } catch (error) {
      console.error('❌ Enhanced Bible Brain chapter error:', error);
      // Try fallback to KJV if this is not already KJV
      if (version !== 'ENGKJV') {
        console.log(`🔄 Attempting fallback to ENGKJV for ${book} chapter ${chapter}`);
        return await this.getChapter('ENGKJV', book, chapter);
      }
      return null;
    }
  }
};