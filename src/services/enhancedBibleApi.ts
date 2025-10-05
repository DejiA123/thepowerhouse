import { esvApi } from './esvApi';
import { apiBibleService } from './apiBibleService';
import { nltApiService } from './nltApiService';

export interface BibleVersion {
  name: string;
  abbreviation: string;
  language: string;
  version: string;
  source: 'bible.helloao.org' | 'esv-api' | 'api-bible' | 'rapidapi' | 'nlt-api';
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

export const enhancedBibleApi = {
  async getVersions(): Promise<BibleVersion[]> {
    const versions: BibleVersion[] = [
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
        source: 'nlt-api'
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
        name: 'English Majority Text Version',
        abbreviation: 'EMTV',
        language: 'English',
        version: 'emtv',
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

  async getChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 enhancedBibleApi: Fetching ${book} chapter ${chapter} (version: ${version})`);
      
      const legacyVersionMap: Record<string, string> = {
        'de4e12af7f28f599-01': 'niv',
        'de4e12af7f28f599-02': 'niv',
        '61fd76efafe199c0-01': 'gnt',
        '592420522e16049f-01': 'amp',
      };
  
      if (legacyVersionMap[version]) {
        version = legacyVersionMap[version];
      }

      const versionInfo = await this.getVersionInfo(version);
      if (!versionInfo) {
        console.error(`❌ Version not found: ${version}`);
        return null;
      }

      console.log(`🔍 Using source: ${versionInfo.source} for version: ${versionInfo.abbreviation}`);

      switch (versionInfo.source) {
        case 'nlt-api':
          return await this.getNLTChapter(book, chapter);
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

  async getVersionInfo(version: string): Promise<BibleVersion | null> {
    const versions = await this.getVersions();
    return versions.find(v => v.version.toLowerCase() === version.toLowerCase()) || null;
  },

  async getNLTChapter(book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Fetching from NLT API: ${book} ${chapter}`);
      
      const nltChapter = await nltApiService.getChapter(book, chapter);
      
      if (nltChapter && Array.isArray(nltChapter.content)) {
        const verses = nltChapter.content.map(item => ({
          book: nltChapter.book,
          chapter: parseInt(nltChapter.chapter, 10),
          verse: item.number,
          text: item.content.join(' '),
        }));

        return { book: nltChapter.book, chapter: parseInt(nltChapter.chapter, 10), verses };
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching from NLT API:', error);
      return null;
    }
  },

  async getESVChapter(book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Fetching from ESV API: ${book} ${chapter}`);
      
      const passageText = await esvApi.getPassageText(book, chapter);
      if (!passageText) {
        console.error('❌ No passage text from ESV API');
        return null;
      }

      const verses = this.parseESVText(passageText, book, chapter);
      
      if (verses.length > 0) {
        console.log(`✅ Successfully loaded ${verses.length} verses from ESV API`);
        return { book, chapter, verses };
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching from ESV API:', error);
      return null;
    }
  },

  async getApiBibleChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Fetching from API.Bible: ${version} ${book} ${chapter}`);
      
      return await apiBibleService.getChapter(version, book, chapter);
    } catch (error) {
      console.error('❌ Error fetching from API.Bible:', error);
      return null;
    }
  },

  async getHelloaoChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Fetching from bible.helloao.org: ${version} ${book} ${chapter}`);
      
      const versionMappings: Record<string, string> = {
        'kjv': 'eng_kjv',
        'asv': 'eng_asv',
        'dra': 'eng_dra',
        'emtv': 'eng_emtv',
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

  parseESVText(text: string, book: string, chapter: number): BibleVerse[] {
    try {
      const verses: BibleVerse[] = [];
      const lines = text.split('\n');
      
      lines.forEach((line, index) => {
        if (line.trim()) {
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

  async search(version: string, query: string): Promise<BibleVerse[]> {
    console.log(`🔍 Search not yet implemented for ${version}: "${query}"`);
    return [];
  }
};
