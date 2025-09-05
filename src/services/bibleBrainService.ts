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

export interface BibleBrainAudioResponse {
  audioUrl: string | null;
  book: string;
  chapter: number;
  version: string;
}

// Use Supabase Edge Function instead of direct API calls
// Use direct Bible Brain API for development (bypass Supabase Edge Function)
const BIBLE_BRAIN_EDGE_FUNCTION_URL = '/functions/v1/bible-brain-api';
const BIBLE_BRAIN_DIRECT_URL = 'https://4.dbt.io/api/bibles';
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

export const bibleBrainService = {
  async getVersions(): Promise<BibleBrainVersion[]> {
    try {
      console.log('🔍 Bible Brain: Fetching available Bible versions...');
      
      // Try Supabase Edge Function first
      try {
        const response = await fetch(`${BIBLE_BRAIN_EDGE_FUNCTION_URL}/versions`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success) {
            console.log(`✅ Bible Brain: Found ${data.data.length} Bible versions via Edge Function`);
            return data.data;
          }
        }
      } catch (edgeError) {
        console.log('⚠️ Edge Function unavailable, trying direct API...');
      }
      
      // Fallback to direct Bible Brain API - search multiple pages for English versions
      let allVersions: any[] = [];
      let page = 1;
      const maxPages = 30; // Search first 30 pages to find English versions
      
      while (page <= maxPages) {
        try {
          const response = await fetch(`${BIBLE_BRAIN_DIRECT_URL}?key=${BIBLE_BRAIN_API_KEY}&v=4&page=${page}`);
          
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
          
          // If we have enough English versions, we can stop
          const englishCount = allVersions.filter(v => {
            const lang = v.language || '';
            const name = v.name || '';
            return (
              lang.toLowerCase().includes('english') ||
              lang.toLowerCase().includes('en:') ||
              name.toLowerCase().includes('king james') ||
              name.toLowerCase().includes('new international') ||
              name.toLowerCase().includes('english standard') ||
              name.toLowerCase().includes('new living') ||
              name.toLowerCase().includes('new king james') ||
              name.toLowerCase().includes('new american standard') ||
              name.toLowerCase().includes('amplified') ||
              name.toLowerCase().includes('kjv') ||
              name.toLowerCase().includes('niv') ||
              name.toLowerCase().includes('esv') ||
              name.toLowerCase().includes('nlt') ||
              name.toLowerCase().includes('nasb') ||
              name.toLowerCase().includes('amp')
            );
          }).length;
          
          if (englishCount >= 15) {
            console.log(`✅ Found ${englishCount} English versions by page ${page}, stopping search`);
            break;
          }
          
          page++;
        } catch (error) {
          console.error(`❌ Error fetching page ${page}:`, error);
          break;
        }
      }
      
      if (allVersions.length === 0) {
        console.error('❌ No versions found from Bible Brain API');
        return [];
      }
      
      const data = { data: allVersions };
      
      // Debug: Log the raw response
      console.log('🔍 Bible Brain API Response:', data);
      console.log('🔍 Available versions:', data.data.map((v: any) => ({ id: v.id, name: v.name, language: v.language?.name })));
      console.log('🔍 First 10 versions:', data.data.slice(0, 10).map((v: any) => ({ id: v.id, name: v.name, language: v.language?.name })));
      console.log('🔍 All version IDs:', data.data.map((v: any) => v.abbr));
      console.log('🔍 First version structure:', JSON.stringify(data.data[0], null, 2));
      console.log('🔍 Available fields:', data.data[0] ? Object.keys(data.data[0]) : 'No data');
      console.log('🔍 Sample version object:', data.data[0]);
      
      // Transform the response to match our interface
      const versions = data.data
        .filter((version: any) => {
          // Look for English versions by language or name patterns
          const lang = version.language || '';
          const name = version.name || '';
          return (
            lang.toLowerCase().includes('english') ||
            lang.toLowerCase().includes('en:') ||
            name.toLowerCase().includes('king james') ||
            name.toLowerCase().includes('new international') ||
            name.toLowerCase().includes('english standard') ||
            name.toLowerCase().includes('new american standard') ||
            name.toLowerCase().includes('new living') ||
            name.toLowerCase().includes('new king james') ||
            name.toLowerCase().includes('amplified') ||
            name.toLowerCase().includes('revised standard') ||
            name.toLowerCase().includes('kjv') ||
            name.toLowerCase().includes('niv') ||
            name.toLowerCase().includes('esv') ||
            name.toLowerCase().includes('nasb') ||
            name.toLowerCase().includes('nlt') ||
            name.toLowerCase().includes('rsv') ||
            name.toLowerCase().includes('amp')
          );
        })
        .map((version: any) => {
          // Use the 'abbr' field as the version ID (this is what Bible Brain API uses)
          const versionId = version.abbr;
          return {
            name: version.name,
            abbreviation: version.abbr,
            language: version.language || 'English',
            version: versionId,
            source: 'bible-brain' as const
          };
        });
      
      console.log(`✅ Bible Brain: Found ${versions.length} English Bible versions via direct API`);
      
      // If no versions found, return fallback versions for development
      if (versions.length === 0) {
        console.log('⚠️ No versions found, using fallback versions for development');
        return [
          { name: 'King James Version', abbreviation: 'KJV', language: 'English', version: 'KJV', source: 'bible-brain' },
          { name: 'New International Version', abbreviation: 'NIV', language: 'English', version: 'NIV', source: 'bible-brain' },
          { name: 'English Standard Version', abbreviation: 'ESV', language: 'English', version: 'ESV', source: 'bible-brain' }
        ];
      }
      
      return versions;
    } catch (error) {
      console.error('❌ Bible Brain versions error:', error);
      
      // Return fallback versions on error
      console.log('⚠️ API error, using fallback versions for development');
      return [
        { name: 'King James Version', abbreviation: 'KJV', language: 'English', version: 'ENGKJV', source: 'bible-brain' },
        { name: 'English Standard Version', abbreviation: 'ESV', language: 'English', version: 'ENGESV', source: 'bible-brain' },
        { name: 'New American Standard Bible', abbreviation: 'NASB', language: 'English', version: 'ENGNAS', source: 'bible-brain' },
        { name: 'American Standard Version', abbreviation: 'ASV', language: 'English', version: 'ENGASV', source: 'bible-brain' },
        { name: 'Revised Version', abbreviation: 'REV', language: 'English', version: 'ENGREV', source: 'bible-brain' },
        { name: 'World English Bible', abbreviation: 'WEB', language: 'English', version: 'ENGWEB', source: 'bible-brain' }
      ];
    }
  },

  async getChapter(version: string, book: string, chapter: number, isFallback: boolean = false): Promise<BibleBrainChapter | null> {
    try {
      console.log(`🔍 Bible Brain: Fetching ${book} chapter ${chapter} (version: ${version})`);
      
      // Try Supabase Edge Function first
      try {
        const response = await fetch(
          `${BIBLE_BRAIN_EDGE_FUNCTION_URL}/chapter?version=${encodeURIComponent(version)}&book=${encodeURIComponent(book)}&chapter=${chapter}`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success) {
            console.log(`✅ Bible Brain: Successfully loaded ${data.data.verses.length} verses via Edge Function`);
            return data.data;
          }
        }
      } catch (edgeError) {
        console.log('⚠️ Edge Function unavailable, trying direct API...');
      }
      
      // Get the correct BibleId and book mapping
      const bibleBrainBook = BIBLE_BRAIN_BOOK_MAP[book.toLowerCase()];
      console.log(`🔍 Book mapping: ${book} -> ${bibleBrainBook}`);
      if (!bibleBrainBook) {
        console.error(`❌ Unknown book: ${book}`);
        return null;
      }
      
      // First, get the Bible information to find available text filesets
      const bibleInfoUrl = `${BIBLE_BRAIN_DIRECT_URL}/${version}?key=${BIBLE_BRAIN_API_KEY}&v=4`;
      console.log(`🔍 Fetching Bible info: ${bibleInfoUrl}`);
      
      const bibleInfoResponse = await fetch(bibleInfoUrl);
      if (!bibleInfoResponse.ok) {
        console.error(`❌ Bible info API error: ${bibleInfoResponse.status}`);
        
        // Try fallback if not already in fallback mode
        if (!isFallback) {
          console.log(`🔄 Attempting fallback to ENGKJV for ${book} chapter ${chapter}`);
          return await this.getChapter('ENGKJV', book, chapter, true);
        }
        return null;
      }
      
      const bibleInfo = await bibleInfoResponse.json();
      console.log(`🔍 Bible info response:`, bibleInfo);
      
      if (!bibleInfo.data || !bibleInfo.data.filesets) {
        console.error(`❌ No filesets found for ${version}`);
        if (!isFallback) {
          return await this.getChapter('ENGKJV', book, chapter, true);
        }
        return null;
      }
      
      // Find text filesets
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
        if (!isFallback) {
          return await this.getChapter('ENGKJV', book, chapter, true);
        }
        return null;
      }
      
      console.log(`🔍 Using text fileset: ${textFileset.id} (${textFileset.type})`);
      
      // Use the correct Bible Brain API endpoint for chapter content
      const chapterUrl = `${BIBLE_BRAIN_DIRECT_URL}/${version}/filesets/${textFileset.id}/${bibleBrainBook}/${chapter}?key=${BIBLE_BRAIN_API_KEY}&v=4`;
      console.log(`🔍 Bible Brain Chapter URL: ${chapterUrl}`);
      
      const response = await fetch(chapterUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Bible Brain chapter API error: ${response.status}`);
        console.error(`❌ Response: ${errorText}`);
        
        // Try fallback if not already in fallback mode
        if (!isFallback) {
          console.log(`🔄 Attempting fallback to ENGKJV for ${book} chapter ${chapter}`);
          return await this.getChapter('ENGKJV', book, chapter, true);
        }
        return null;
      }

      const data = await response.json();
      console.log('🔍 Bible Brain Chapter Response:', data);
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error('❌ Invalid Bible Brain response format');
        console.error('❌ Expected data.data array, got:', data);
        return null;
      }
      
      console.log(`🔍 Found ${data.data.length} verses for ${book} chapter ${chapter}`);
      
      if (data.data.length === 0) {
        console.error(`❌ No verses found for ${book} chapter ${chapter}`);
        if (!isFallback) {
          return await this.getChapter('ENGKJV', book, chapter, true);
        }
        return null;
      }
      
      // Transform the response to match our interface
      const verses = data.data.map((verse: any, index: number) => ({
        book: book,
        chapter: chapter,
        verse: String(verse.verse_start || verse.verse_sequence || index + 1),
        text: verse.verse_text || '',
        reference: `${book} ${chapter}:${verse.verse_start || verse.verse_sequence || index + 1}`,
        version: version
      }));
      
      const chapterData = {
        book: book,
        chapter: chapter,
        verses: verses
      };
      
      console.log(`✅ Bible Brain: Successfully loaded ${verses.length} verses`);
      return chapterData;
    } catch (error) {
      console.error('❌ Bible Brain service error:', error);
      return null;
    }
  },

  async getAudio(version: string, book: string, chapter: number): Promise<string | null> {
    try {
      console.log(`🎵 Bible Brain: Fetching audio for ${book} chapter ${chapter} (version: ${version})`);
      
      const response = await fetch(
        `${BIBLE_BRAIN_EDGE_FUNCTION_URL}/audio?version=${encodeURIComponent(version)}&book=${encodeURIComponent(book)}&chapter=${chapter}`
      );
      
      if (!response.ok) {
        console.error(`❌ Bible Brain Audio API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('❌ Bible Brain audio error:', data.error);
        return null;
      }
      
      if (data.data.audioUrl) {
        console.log(`✅ Bible Brain: Found audio URL: ${data.data.audioUrl}`);
        return data.data.audioUrl;
      }
      
      console.log(`⚠️ Bible Brain: No audio available for ${book} chapter ${chapter}`);
      return null;
    } catch (error) {
      console.error('❌ Bible Brain audio service error:', error);
      return null;
    }
  },

  async getVerse(version: string, book: string, chapter: number, verse: number): Promise<BibleBrainVerse | null> {
    try {
      console.log(`🔍 Bible Brain: Fetching ${book} ${chapter}:${verse} (version: ${version})`);
      
      const response = await fetch(
        `${BIBLE_BRAIN_EDGE_FUNCTION_URL}/verse?version=${encodeURIComponent(version)}&book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`
      );
      
      if (!response.ok) {
        console.error(`❌ Bible Brain API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('❌ Bible Brain verse error:', data.error);
        return null;
      }
      
      console.log(`✅ Bible Brain: Successfully loaded verse ${verse}`);
      return data.data;
    } catch (error) {
      console.error('❌ Bible Brain verse error:', error);
      return null;
    }
  },

  async search(version: string, query: string): Promise<BibleBrainVerse[]> {
    try {
      console.log(`🔍 Bible Brain: Searching for "${query}" (version: ${version})`);
      
      const response = await fetch(
        `${BIBLE_BRAIN_EDGE_FUNCTION_URL}/search?version=${encodeURIComponent(version)}&query=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        console.error(`❌ Bible Brain Search API error: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('❌ Bible Brain search error:', data.error);
        return [];
      }
      
      console.log(`✅ Bible Brain: Found ${data.data.length} search results`);
      return data.data;
    } catch (error) {
      console.error('❌ Bible Brain search error:', error);
      return [];
    }
  }
};