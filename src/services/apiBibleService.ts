const API_BIBLE_KEY = '22d1feb853c8bb04c2f99c8f2badb9bc';
const API_BIBLE_BASE_URL = 'https://api.scripture.api.bible/v1';

const API_BIBLE_VERSION_MAPPINGS: Record<string, string> = {
  'niv': 'de4e12af7f28f599-01',      // New International Version
  'gnt': '61fd76efafe199c0-01',      // Good News Translation
  'amp': '592420522e16049f-01'       // Amplified Bible
};

const API_BIBLE_BOOK_IDS: Record<string, string> = {
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

export class ApiBibleService {
  async getChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 ApiBibleService: Fetching ${book} chapter ${chapter} (version: ${version})`);
      
      const bibleId = API_BIBLE_VERSION_MAPPINGS[version.toLowerCase()];
      if (!bibleId) {
        console.error(`❌ Version not supported: ${version}`);
        return null;
      }
      
      const bookId = API_BIBLE_BOOK_IDS[book.toLowerCase()];
      if (!bookId) {
        console.error(`❌ Book not supported: ${book}`);
        return null;
      }
      
      const url = `${API_BIBLE_BASE_URL}/bibles/${bibleId}/chapters/${bookId}.${chapter}`;
      console.log(`🌐 API.Bible URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'api-key': API_BIBLE_KEY,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`❌ API.Bible error: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      console.log(`✅ API.Bible response received`);
      
      if (data && data.data && data.data.content) {
        const verses = this.parseApiBibleContent(data.data.content, book, chapter);
        
        if (verses.length > 0) {
          console.log(`✅ Successfully loaded ${verses.length} verses from API.Bible`);
          return {
            book,
            chapter,
            verses
          };
        }
      }
      
      console.error(`❌ No content found in API.Bible response`);
      return null;
      
    } catch (error) {
      console.error('❌ Error fetching from API.Bible:', error);
      return null;
    }
  }

  async getVerse(version: string, book: string, chapter: number, verse: number): Promise<BibleVerse | null> {
    try {
      console.log(`🔍 ApiBibleService: Fetching ${book} ${chapter}:${verse} (version: ${version})`);
      
      const chapterData = await this.getChapter(version, book, chapter);
      if (chapterData && chapterData.verses) {
        return chapterData.verses.find(v => v.verse === verse) || null;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting verse from API.Bible:', error);
      return null;
    }
  }

  private parseApiBibleContent(content: string, book: string, chapter: number): BibleVerse[] {
    try {
      const verses: BibleVerse[] = [];
      
      const cleanContent = content.replace(/<[^>]*>/g, '');
      
      const verseMatches = cleanContent.match(/(\d+)\s+([^0-9]+?)(?=\d+\s|$)/g);
      
      if (verseMatches) {
        verseMatches.forEach((match, index) => {
          const verseMatch = match.match(/^(\d+)\s+(.+)$/);
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
        });
      }
      
      if (verses.length === 0) {
        const lines = cleanContent.split('\n');
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
      }
      
      return verses;
    } catch (error) {
      console.error('❌ Error parsing API.Bible content:', error);
      return [];
    }
  }

  async getAvailableTranslations(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BIBLE_BASE_URL}/bibles`, {
        headers: {
          'api-key': API_BIBLE_KEY,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`❌ Error fetching translations: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching available translations:', error);
      return [];
    }
  }
}

export const apiBibleService = new ApiBibleService();
