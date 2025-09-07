// Import the enhanced Bible Brain API
import { enhancedApiBibleService } from './enhancedApiBibleService';
import type { BibleVersion, BibleVerse, BibleChapter } from '@/types/bible';

// Re-export types for backward compatibility
export type { BibleVersion, BibleVerse, BibleChapter };

export const bibleApi = {
  // Test API connectivity
  async testAPI(): Promise<boolean> {
    try {
      const versions = await enhancedApiBibleService.getVersions();
      return versions.length > 0;
    } catch {
      return false;
    }
  },

  // Get Bible chapter
  async getChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    return await enhancedApiBibleService.getChapter(version, book, chapter);
  },

  // Get Bible verse (placeholder implementation)
  async getVerse(version: string, book: string, chapter: number, verse: number): Promise<BibleVerse | null> {
    const chapterData = await enhancedApiBibleService.getChapter(version, book, chapter);
    if (chapterData?.verses) {
      return chapterData.verses.find(v => parseInt(v.verse) === verse) || null;
    }
    return null;
  },

  // Get audio URL
  async getAudio(version: string, book: string, chapter: number): Promise<string | null> {
    return await enhancedApiBibleService.getAudio(version, book, chapter);
  },

  // Get available Bible versions
  async getVersions(): Promise<BibleVersion[]> {
    return await enhancedApiBibleService.getVersions();
  },

  // Search functionality (basic implementation)
  async search(version: string, query: string): Promise<BibleVerse[]> {
    try {
      console.log(`🔍 Bible API: Searching for "${query}" in version ${version}`);
      
      // For now, implement a simple search by fetching chapters and filtering
      // In the future, this could be enhanced with the API's search capabilities
      const results: BibleVerse[] = [];
      
      // Search in common books first
      const commonBooks = ['genesis', 'psalms', 'matthew', 'john', 'romans'];
      
      for (const book of commonBooks) {
        try {
          // Search in first few chapters
          for (let chapter = 1; chapter <= 3; chapter++) {
            const chapterData = await this.getChapter(version, book, chapter);
            if (chapterData && chapterData.verses) {
              const matchingVerses = chapterData.verses.filter(verse => 
                verse.text.toLowerCase().includes(query.toLowerCase())
              );
              results.push(...matchingVerses);
            }
          }
        } catch (error) {
          console.warn(`Error searching in ${book}:`, error);
        }
      }
      
      return results.slice(0, 20); // Limit results
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }
};