// Enhanced Bible API that combines multiple sources to provide NIV, NLT, ESV, GNT, and AMP translations
import { esvApi } from './esvApi';
import { apiBibleService } from './apiBibleService';

export interface BibleVersion {
  name: string;
  abbreviation: string;
  language: string;
  version: string;
  source: 'bible.helloao.org' | 'esv-api' | 'api-bible' | 'rapidapi';
}

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleChapter {
  book: string;
  chapter: number;
  verses: BibleVerse[];
}

// Enhanced Bible API with multiple sources
export const enhancedBibleApi = {
  // Get all available versions including the requested ones
  async getVersions(): Promise<BibleVersion[]> {
    const versions: BibleVersion[] = [
      // Primary requested translations
      {
        name: 'New International Version',
        abbreviation: 'NIV',
        language: 'English',
        version: 'niv',
        source: 'api-bible'
      },
      {
        name: 'New Living Translation',
        abbreviation: 'NLT',
        language: 'English',
        version: 'nlt',
        source: 'api-bible'
      },
      {
        name: 'English Standard Version',
        abbreviation: 'ESV',
        language: 'English',
        version: 'esv',
        source: 'esv-api'
      },
      {
        name: 'Good News Translation',
        abbreviation: 'GNT',
        language: 'English',
        version: 'gnt',
        source: 'api-bible'
      },
      {
        name: 'Amplified Bible',
        abbreviation: 'AMP',
        language: 'English',
        version: 'amp',
        source: 'api-bible'
      },
      // Additional quality translations from bible.helloao.org
      {
        name: 'King James Version',
        abbreviation: 'KJV',
        language: 'English',
        version: 'kjv',
        source: 'bible.helloao.org'
      },
      {
        name: 'American Standard Version (1901)',
        abbreviation: 'ASV',
        language: 'English',
        version: 'asv',
        source: 'bible.helloao.org'
      },
      {
        name: 'Douay-Rheims 1899',
        abbreviation: 'DRA',
        language: 'English',
        version: 'dra',
        source: 'bible.helloao.org'
      },
      {
        name: 'Geneva Bible 1599',
        abbreviation: 'GNV',
        language: 'English',
        version: 'gnv',
        source: 'bible.helloao.org'
      },
      {
        name: 'English LSV',
        abbreviation: 'LSV',
        language: 'English',
        version: 'lsv',
        source: 'bible.helloao.org'
      },
      {
        name: 'Darby Translation',
        abbreviation: 'DBY',
        language: 'English',
        version: 'dby',
        source: 'bible.helloao.org'
      },
      {
        name: 'Bible in Basic English',
        abbreviation: 'BBE',
        language: 'English',
        version: 'bbe',
        source: 'bible.helloao.org'
      }
    ];

    console.log(`✅ enhancedBibleApi: Returning ${versions.length} Bible versions from multiple sources`);
    return versions;
  },

  // Get chapter content from the appropriate source
  async getChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 enhancedBibleApi: Fetching ${book} chapter ${chapter} (version: ${version})`);

      // Determine the source for this version
      const versionInfo = await this.getVersionInfo(version);
      if (!versionInfo) {
        console.error(`❌ Version not found: ${version}`);
        return null;
      }

      console.log(`🔍 Using source: ${versionInfo.source} for version: ${versionInfo.abbreviation}`);

      // Route to appropriate API based on source
      switch (versionInfo.source) {
        case 'esv-api':
          return await this.getESVChapter(book, chapter);
        case 'api-bible':
          return await this.getApiBibleChapter(version, book, chapter);
        case 'bible.helloao.org':
          return await this.getHelloaoChapter(version, book, chapter);
        default:
          console.error(`❌ Unknown source: ${versionInfo.source}`);
          return null;
      }

    } catch (error) {
      console.error('❌ Error in enhancedBibleApi.getChapter:', error);
      return null;
    }
  },

  // Get version information
  async getVersionInfo(version: string): Promise<BibleVersion | null> {
    const versions = await this.getVersions();
    return versions.find(v => v.version.toLowerCase() === version.toLowerCase()) || null;
  },

  // Get chapter from ESV API
  async getESVChapter(book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Fetching from ESV API: ${book} ${chapter}`);

      // Use the existing ESV API service
      const passageText = await esvApi.getPassageText(book, chapter);
      if (!passageText) {
        console.error('❌ No passage text from ESV API');
        return null;
      }

      // Parse the passage text into verses
      // ESV API returns formatted text, so we'll split by verse numbers
      const verses = this.parseESVText(passageText, book, chapter);

      if (verses.length > 0) {
        console.log(`✅ Successfully loaded ${verses.length} verses from ESV API`);
        return {
          book,
          chapter,
          verses
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching from ESV API:', error);
      return null;
    }
  },

  // Get chapter from API.Bible (for NIV, NLT, GNT, AMP)
  async getApiBibleChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Fetching from API.Bible: ${version} ${book} ${chapter}`);

      // Use the updated API.Bible service
      return await apiBibleService.getChapter(version, book, chapter);
    } catch (error) {
      console.error('❌ Error fetching from API.Bible:', error);
      return null;
    }
  },

  // Get chapter from bible.helloao.org
  async getHelloaoChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Fetching from bible.helloao.org: ${version} ${book} ${chapter}`);

      // Map version to bible.helloao.org format
      const versionMappings: Record<string, string> = {
        'kjv': 'eng_kjv',
        'asv': 'eng_asv',
        'dra': 'eng_dra',
        'gnv': 'eng_gnv',
        'lsv': 'eng_lsv',
        'dby': 'eng_dby',
        'bbe': 'eng_bbe'
      };

      const apiVersion = versionMappings[version.toLowerCase()];
      if (!apiVersion) {
        console.error(`❌ Version not supported by bible.helloao.org: ${version}`);
        return null;
      }

      // Map book name to bible.helloao.org format
      const bookMappings: Record<string, string> = {
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

      const apiBookName = bookMappings[book.toLowerCase()];
      if (!apiBookName) {
        console.error(`❌ Book not supported: ${book}`);
        return null;
      }

      const url = `https://bible.helloao.org/api/${apiVersion}/${apiBookName}/${chapter}.json`;
      console.log(`🌐 Fetching from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`❌ HTTP error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Parse the response
      if (data && data.chapter && data.chapter.content && Array.isArray(data.chapter.content)) {
        const verses = data.chapter.content
          .filter((verse: any) => verse.type === 'verse' && verse.content && Array.isArray(verse.content))
          .map((verse: any) => ({
            book,
            chapter,
            verse: parseInt(verse.number) || 1,
            text: Array.isArray(verse.content) ? verse.content.join(' ') : String(verse.content || '')
          }))
          .filter((v: any) => v.text && v.text.trim());

        if (verses.length > 0) {
          console.log(`✅ Successfully loaded ${verses.length} verses from bible.helloao.org`);
          return { book, chapter, verses };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching from bible.helloao.org:', error);
      return null;
    }
  },

  // Parse ESV text into verses
  parseESVText(text: string, book: string, chapter: number): BibleVerse[] {
    try {
      // ESV API returns formatted text with verse numbers
      // This is a simple parser - can be enhanced
      const verses: BibleVerse[] = [];
      const lines = text.split('\n');

      lines.forEach((line, index) => {
        if (line.trim()) {
          // Extract verse number and text
          const verseMatch = line.match(/^(\d+)\s+(.+)$/);
          if (verseMatch) {
            const verseNumber = parseInt(verseMatch[1]);
            const verseText = verseMatch[2].trim();

            if (verseText) {
              verses.push({
                book,
                chapter,
                verse: verseNumber,
                text: verseText
              });
            }
          }
        }
      });

      return verses;
    } catch (error) {
      console.error('❌ Error parsing ESV text:', error);
      return [];
    }
  },

  // Get verse from appropriate source
  async getVerse(version: string, book: string, chapter: number, verse: number): Promise<BibleVerse | null> {
    try {
      const chapterData = await this.getChapter(version, book, chapter);
      if (chapterData && chapterData.verses) {
        return chapterData.verses.find(v => v.verse === verse) || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting verse:', error);
      return null;
    }
  },

  // Search functionality (placeholder)
  async search(version: string, query: string): Promise<BibleVerse[]> {
    console.log(`🔍 Search not yet implemented for ${version}: "${query}"`);
    return [];
  }
};
