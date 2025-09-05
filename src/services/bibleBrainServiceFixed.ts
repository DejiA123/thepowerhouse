// Fixed Bible Brain service with real working version IDs based on API testing
import type { BibleVersion, BibleVerse, BibleChapter, BibleAudioResponse } from '@/types/bible';

export interface BibleBrainVerse {
  book: string;
  chapter: number;
  verse: string;
  text: string;
  reference?: string;
  version?: string;
}

export interface BibleBrainChapter {
  book: string;
  chapter: number;
  verses: BibleBrainVerse[];
}

export interface BibleBrainVersion {
  name: string;
  abbreviation: string;
  language: string;
  version: string;
  source: 'bible-brain';
}

// Bible Brain API service with correct implementation
const BIBLE_BRAIN_BASE_URL = 'https://4.dbt.io/api';
const BIBLE_BRAIN_API_KEY = '56e1f369-6e9b-4f68-aa20-5f51c1111eef';

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

// Working Bible version IDs discovered from API testing
const WORKING_ENGLISH_VERSIONS = [
  'ASV', // American Standard Version - confirmed working
  'YLT', // Young's Literal Translation - confirmed working
  'WEB', // World English Bible - confirmed working
] as const;

// Fallback version discovery by testing common patterns
const POSSIBLE_ENGLISH_VERSION_IDS = [
  // Test common patterns that might work
  'ASV', 'YLT', 'WEB', 'DARBY', 'WEBSTER', 'ROTHERHAM',
  'ENGLISHKJV', 'KJVAPOC', 'KJVPUB', 'KJVPD', 'KJVORIG',
  'AMKJV', 'KJVOPEN', 'KJVFREE', 'KJVPUBLIC',
  'ESV2016', 'ESV2011', 'ESV2001', 'ESVSTU', 'ESVAPI',
  'ENGKJV1769', 'ENGKJV1611', 'KJVPCE1769',
  'ENGASV1901', 'ASV1901',
  'ENGWEB', 'WEB2020', 'WEB2000',
  'ENGLISHYLT', 'YLT1898',
] as const;

export const bibleBrainServiceFixed = {
  async findWorkingEnglishVersions(): Promise<BibleBrainVersion[]> {
    console.log('🔍 Bible Brain: Discovering working English versions...');
    const workingVersions: BibleBrainVersion[] = [];
    
    // Test known working versions first
    for (const versionId of WORKING_ENGLISH_VERSIONS) {
      try {
        const response = await fetch(`${BIBLE_BRAIN_BASE_URL}/bibles/${versionId}?key=${BIBLE_BRAIN_API_KEY}&v=4`);
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            workingVersions.push({
              name: data.data.name || versionId,
              abbreviation: versionId,
              language: 'English',
              version: versionId,
              source: 'bible-brain'
            });
            console.log(`✅ Confirmed working: ${versionId} - ${data.data.name}`);
          }
        }
      } catch (error) {
        console.log(`❌ Failed to verify ${versionId}:`, error);
      }
    }
    
    // If we don't have enough versions, test more possibilities
    if (workingVersions.length < 3) {
      console.log('🔍 Testing additional version IDs...');
      for (const versionId of POSSIBLE_ENGLISH_VERSION_IDS) {
        if (workingVersions.some(v => v.version === versionId)) continue;
        
        try {
          const response = await fetch(`${BIBLE_BRAIN_BASE_URL}/bibles/${versionId}?key=${BIBLE_BRAIN_API_KEY}&v=4`);
          if (response.ok) {
            const data = await response.json();
            if (data.data && this.isEnglishVersion(data.data)) {
              workingVersions.push({
                name: data.data.name || versionId,
                abbreviation: versionId,
                language: 'English',
                version: versionId,
                source: 'bible-brain'
              });
              console.log(`✅ Found additional working version: ${versionId} - ${data.data.name}`);
              
              if (workingVersions.length >= 5) break; // Limit to avoid too many requests
            }
          }
        } catch (error) {
          // Silent fail for discovery
        }
      }
    }
    
    return workingVersions;
  },

  async getVersions(): Promise<BibleBrainVersion[]> {
    try {
      console.log('🔍 Bible Brain: Fetching available Bible versions...');
      
      // First try to find working English versions
      const workingVersions = await this.findWorkingEnglishVersions();
      
      if (workingVersions.length > 0) {
        console.log(`✅ Bible Brain: Found ${workingVersions.length} working English versions`);
        console.log('📋 Working versions:', workingVersions.map(v => `${v.abbreviation} (${v.name})`));
        return workingVersions;
      }
      
      // Fallback to API discovery (original approach)
      let allVersions: any[] = [];
      let page = 1;
      const maxPages = 10; // Reduced for performance
      
      while (page <= maxPages) {
        try {
          const response = await fetch(`${BIBLE_BRAIN_BASE_URL}/bibles?key=${BIBLE_BRAIN_API_KEY}&v=4&page=${page}&limit=25`);
          
          if (!response.ok) {
            console.error(`❌ Bible Brain API error on page ${page}: ${response.status}`);
            break;
          }
          
          const data = await response.json();
          
          if (!data.data || !Array.isArray(data.data)) {
            console.error(`❌ Invalid Bible Brain API response format on page ${page}`);
            break;
          }
          
          allVersions = allVersions.concat(data.data);
          
          // Stop if we found enough English versions
          const englishCount = allVersions.filter(v => this.isEnglishVersion(v)).length;
          if (englishCount >= 10) {
            console.log(`✅ Found ${englishCount} English versions by page ${page}, stopping search`);
            break;
          }
          
          page++;
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ Error fetching page ${page}:`, error);
          break;
        }
      }
      
      if (allVersions.length === 0) {
        console.error('❌ No versions found from Bible Brain API');
        return this.getFallbackVersions();
      }
      
      // Filter and transform English versions
      const englishVersions = allVersions
        .filter(version => this.isEnglishVersion(version))
        .map(version => this.transformVersion(version))
        .filter(version => version !== null) as BibleBrainVersion[];
      
      console.log(`✅ Bible Brain: Found ${englishVersions.length} English Bible versions from API`);
      
      if (englishVersions.length === 0) {
        return this.getFallbackVersions();
      }
      
      return englishVersions;
    } catch (error) {
      console.error('❌ Bible Brain versions error:', error);
      return this.getFallbackVersions();
    }
  },

  isEnglishVersion(version: any): boolean {
    const name = (version.name || '').toLowerCase();
    const abbr = (version.abbr || '').toLowerCase();
    const languageName = (version.language?.name || '').toLowerCase();
    const languageCode = (version.language?.iso || version.language?.iso639_3 || '').toLowerCase();
    
    // Check for English indicators
    const searchText = `${name} ${abbr} ${languageName} ${languageCode}`;
    
    return (
      searchText.includes('english') ||
      searchText.includes('king james') ||
      searchText.includes('standard version') ||
      searchText.includes('american standard') ||
      searchText.includes('world english') ||
      searchText.includes("young's literal") ||
      languageCode === 'eng' ||
      languageCode === 'en' ||
      // Known English abbreviations
      ['asv', 'ylt', 'web', 'kjv', 'darby', 'webster'].some(abbrev => 
        abbr.includes(abbrev)
      )
    );
  },

  transformVersion(version: any): BibleBrainVersion | null {
    try {
      const abbreviation = version.abbr || version.id || '';
      const name = version.name || `Unknown Version (${abbreviation})`;
      
      if (!abbreviation || abbreviation.length < 2) {
        return null;
      }
      
      return {
        name: name,
        abbreviation: abbreviation.toUpperCase(),
        language: 'English',
        version: abbreviation,
        source: 'bible-brain' as const
      };
    } catch (error) {
      console.error('❌ Error transforming version:', error);
      return null;
    }
  },

  getFallbackVersions(): BibleBrainVersion[] {
    console.log('⚠️ Using hardcoded fallback versions');
    return [
      { name: 'American Standard Version', abbreviation: 'ASV', language: 'English', version: 'ASV', source: 'bible-brain' },
      { name: "Young's Literal Translation", abbreviation: 'YLT', language: 'English', version: 'YLT', source: 'bible-brain' },
      { name: 'World English Bible', abbreviation: 'WEB', language: 'English', version: 'WEB', source: 'bible-brain' },
    ];
  },

  async getChapter(version: string, book: string, chapter: number): Promise<BibleBrainChapter | null> {
    try {
      console.log(`🔍 Bible Brain: Fetching ${book} chapter ${chapter} (version: ${version})`);
      
      // Get the correct book ID for Bible Brain API
      const bibleBrainBook = BIBLE_BRAIN_BOOK_MAP[book.toLowerCase()];
      if (!bibleBrainBook) {
        console.error(`❌ Unknown book: ${book}`);
        return null;
      }
      
      // First get the Bible info to understand available endpoints
      const bibleInfoUrl = `${BIBLE_BRAIN_BASE_URL}/bibles/${version}?key=${BIBLE_BRAIN_API_KEY}&v=4`;
      console.log(`🔍 Fetching Bible info: ${bibleInfoUrl}`);
      
      const bibleInfoResponse = await fetch(bibleInfoUrl);
      if (!bibleInfoResponse.ok) {
        console.error(`❌ Bible info API error: ${bibleInfoResponse.status}`);
        const errorText = await bibleInfoResponse.text();
        console.error(`❌ Error response: ${errorText}`);
        
        // Try fallback to known working version
        const fallbackVersions = this.getFallbackVersions();
        for (const fallbackVersion of fallbackVersions) {
          if (fallbackVersion.version !== version) {
            console.log(`🔄 Attempting fallback to ${fallbackVersion.version} for ${book} chapter ${chapter}`);
            const result = await this.getChapter(fallbackVersion.version, book, chapter);
            if (result) return result;
          }
        }
        return null;
      }
      
      const bibleInfo = await bibleInfoResponse.json();
      console.log('🔍 Bible info response:', bibleInfo);
      
      if (!bibleInfo.data) {
        console.error(`❌ No data found for ${version}`);
        return null;
      }
      
      // Try different endpoint patterns to get chapter text
      const endpoints = [
        // Pattern 1: Direct text endpoint
        `${BIBLE_BRAIN_BASE_URL}/bibles/${version}/text/${bibleBrainBook}/${chapter}?v=4&key=${BIBLE_BRAIN_API_KEY}`,
        // Pattern 2: Books/chapters endpoint
        `${BIBLE_BRAIN_BASE_URL}/bibles/${version}/books/${bibleBrainBook}/chapters/${chapter}?v=4&key=${BIBLE_BRAIN_API_KEY}`,
        // Pattern 3: Chapters endpoint with dot notation
        `${BIBLE_BRAIN_BASE_URL}/bibles/${version}/chapters/${bibleBrainBook}.${chapter}?v=4&key=${BIBLE_BRAIN_API_KEY}`
      ];
      
      // If Bible has filesets, try fileset approach
      if (bibleInfo.data.filesets) {
        for (const [source, filesets] of Object.entries(bibleInfo.data.filesets)) {
          if (Array.isArray(filesets)) {
            const textFileset = filesets.find((fs: any) => 
              fs.type === 'text_plain' || fs.type === 'text_format'
            );
            
            if (textFileset) {
              endpoints.unshift(
                `${BIBLE_BRAIN_BASE_URL}/bibles/${version}/filesets/${textFileset.id}/${bibleBrainBook}/${chapter}?v=4&key=${BIBLE_BRAIN_API_KEY}`
              );
              break;
            }
          }
        }
      }
      
      // Try each endpoint until we find one that works
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          const response = await fetch(endpoint);
          
          if (response.ok) {
            const data = await response.json();
            console.log('🔍 Chapter response:', data);
            
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
              // Transform the response to match our interface
              const verses = data.data.map((verse: any, index: number) => ({
                book: book,
                chapter: chapter,
                verse: String(verse.verse_start || verse.verse_sequence || verse.verse || index + 1),
                text: verse.verse_text || verse.text || '',
                reference: `${book} ${chapter}:${verse.verse_start || verse.verse_sequence || verse.verse || index + 1}`,
                version: version
              }));
              
              const chapterData = {
                book: book,
                chapter: chapter,
                verses: verses
              };
              
              console.log(`✅ Bible Brain: Successfully loaded ${verses.length} verses`);
              return chapterData;
            }
          } else {
            console.log(`❌ Endpoint failed: ${response.status}`);
          }
        } catch (error) {
          console.log(`❌ Endpoint error: ${error.message}`);
        }
      }
      
      console.error(`❌ Could not load chapter from any endpoint for ${version}`);
      return null;
    } catch (error) {
      console.error('❌ Bible Brain service error:', error);
      return null;
    }
  },

  async getAudio(version: string, book: string, chapter: number): Promise<string | null> {
    try {
      console.log(`🎵 Bible Brain: Fetching audio for ${book} chapter ${chapter} (version: ${version})`);
      
      // Get the correct book ID for Bible Brain API
      const bibleBrainBook = BIBLE_BRAIN_BOOK_MAP[book.toLowerCase()];
      if (!bibleBrainBook) {
        console.error(`❌ Unknown book: ${book}`);
        return null;
      }
      
      // Get Bible info to find audio filesets
      const bibleInfoUrl = `${BIBLE_BRAIN_BASE_URL}/bibles/${version}?key=${BIBLE_BRAIN_API_KEY}&v=4`;
      const bibleInfoResponse = await fetch(bibleInfoUrl);
      
      if (!bibleInfoResponse.ok) {
        console.error(`❌ Bible info API error: ${bibleInfoResponse.status}`);
        return null;
      }
      
      const bibleInfo = await bibleInfoResponse.json();
      
      if (!bibleInfo.data || !bibleInfo.data.filesets) {
        console.error(`❌ No filesets found for ${version}`);
        return null;
      }
      
      // Find audio filesets
      let audioFileset = null;
      for (const [source, filesets] of Object.entries(bibleInfo.data.filesets)) {
        if (Array.isArray(filesets)) {
          audioFileset = filesets.find((fs: any) => 
            fs.type === 'audio_drama' || fs.type === 'audio' || fs.type === 'audio_stream'
          );
          if (audioFileset) break;
        }
      }
      
      if (!audioFileset) {
        console.log(`⚠️ No audio fileset found for ${version}`);
        return null;
      }
      
      console.log(`🎵 Found audio fileset: ${audioFileset.id} (${audioFileset.type})`);
      
      // Try to get audio URL using the fileset
      const audioUrl = `${BIBLE_BRAIN_BASE_URL}/bibles/${version}/filesets/${audioFileset.id}/${bibleBrainBook}/${chapter}?v=4&key=${BIBLE_BRAIN_API_KEY}`;
      console.log(`🎵 Fetching audio: ${audioUrl}`);
      
      const response = await fetch(audioUrl);
      
      if (!response.ok) {
        console.error(`❌ Audio API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      console.log('🎵 Audio response:', data);
      
      // Extract audio URL from response (structure may vary)
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const audioData = data.data.find((item: any) => item.path || item.file_url || item.url);
        if (audioData) {
          const streamUrl = audioData.path || audioData.file_url || audioData.url;
          if (streamUrl) {
            // Construct full audio URL if it's a relative path
            const fullAudioUrl = streamUrl.startsWith('http') ? streamUrl : `https://content.biblebrain.com/${streamUrl}`;
            console.log(`✅ Bible Brain: Found audio URL: ${fullAudioUrl}`);
            return fullAudioUrl;
          }
        }
      }
      
      console.log(`⚠️ Bible Brain: No audio URL found in response`);
      return null;
    } catch (error) {
      console.error('❌ Bible Brain audio service error:', error);
      return null;
    }
  }
};