import { enhancedApiBibleService } from './enhancedApiBibleService';
import { mapVersionToBibleBrain } from './bibleBrainVersions';

export interface AudioBibleFile {
  book: string;
  chapter: number;
  url: string;
  fileName: string;
}

export class AudioBibleService {
  private static instance: AudioBibleService;
  private cache = new Map<string, AudioBibleFile>();

  private constructor() {}

  static getInstance(): AudioBibleService {
    if (!AudioBibleService.instance) {
      AudioBibleService.instance = new AudioBibleService();
    }
    return AudioBibleService.instance;
  }

  /**
   * Get MP3 URL for a specific book and chapter using Bible Brain API
   */
  async getMp3Url(book: string, chapter: number, version: string = 'ENGESV'): Promise<string | null> {
    try {
      console.log(`🎵 AudioBible: Starting Bible Brain audio search for "${book}" chapter ${chapter} (version: ${version})`);
      
      // Map version to Bible Brain format
      const biblebrainVersion = mapVersionToBibleBrain(version);
      console.log(`🎵 AudioBible: Using Bible Brain version: ${biblebrainVersion}`);
      
      const cacheKey = `${biblebrainVersion}-${book}-${chapter}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        console.log(`🎵 AudioBible: Using cached URL for ${book} ${chapter}: ${cached.url}`);
        return cached.url;
      }

      // Use enhanced API.Bible service to get audio (will return null as API.Bible doesn't provide direct audio)
      const audioUrl = await enhancedApiBibleService.getAudio(biblebrainVersion, book, chapter);
      
      if (audioUrl) {
        const audioFile: AudioBibleFile = {
          book,
          chapter,
          url: audioUrl,
          fileName: `${biblebrainVersion}_${book}_${chapter}.mp3`
        };
        
        this.cache.set(cacheKey, audioFile);
        console.log(`✅ AudioBible: Found Bible Brain audio: ${audioUrl}`);
        return audioUrl;
      }

      console.log(`❌ AudioBible: No MP3 file found for "${book}" chapter ${chapter} in Bible Brain`);
      return null;
    } catch (error) {
      console.error(`🎵 AudioBible: Error fetching MP3 for ${book} ${chapter}:`, error);
      return null;
    }
  }

  /**
   * Check if MP3 exists for a specific book and chapter
   */
  async hasMp3(book: string, chapter: number, version: string = 'ENGESV'): Promise<boolean> {
    const url = await this.getMp3Url(book, chapter, version);
    return url !== null;
  }

  /**
   * Get download URL for MP3 (same as getMp3Url but explicit for downloads)
   */
  async getDownloadUrl(book: string, chapter: number, version: string = 'ENGESV'): Promise<string | null> {
    return await this.getMp3Url(book, chapter, version);
  }

  /**
   * Clear cache (useful for refreshing file list)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🎵 AudioBible: Cache cleared');
  }

  /**
   * Get all available books with MP3 files from Bible Brain
   */
  async getAvailableBooks(version: string = 'ENGESV'): Promise<string[]> {
    try {
      console.log(`🎵 AudioBible: Getting available books from Bible Brain for version ${version}`);
      
      // Bible Brain has standard Bible books, return common book names
      const standardBooks = [
        'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
        'joshua', 'judges', 'ruth', '1-samuel', '2-samuel',
        '1-kings', '2-kings', '1-chronicles', '2-chronicles', 'ezra',
        'nehemiah', 'esther', 'job', 'psalms', 'proverbs',
        'ecclesiastes', 'song-of-solomon', 'isaiah', 'jeremiah', 'lamentations',
        'ezekiel', 'daniel', 'hosea', 'joel', 'amos',
        'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
        'zephaniah', 'haggai', 'zechariah', 'malachi',
        'matthew', 'mark', 'luke', 'john', 'acts',
        'romans', '1-corinthians', '2-corinthians', 'galatians', 'ephesians',
        'philippians', 'colossians', '1-thessalonians', '2-thessalonians', '1-timothy',
        '2-timothy', 'titus', 'philemon', 'hebrews', 'james',
        '1-peter', '2-peter', '1-john', '2-john', '3-john',
        'jude', 'revelation'
      ];

      console.log(`✅ AudioBible: Returning ${standardBooks.length} standard Bible books`);
      return standardBooks;
    } catch (error) {
      console.error('🎵 AudioBible: Error getting available books:', error);
      return [];
    }
  }
}

export const audioBibleService = AudioBibleService.getInstance();