// Enhanced Bible Brain API - Complete Bible text and audio service
import { enhancedBibleBrainApi } from './enhancedBibleBrainApi';
import { getDefaultVersions, mapVersionToBibleBrain } from './bibleBrainVersions';
import type { BibleVersion, BibleVerse, BibleChapter } from '@/types/bible';

// Re-export types for compatibility
export type { BibleVersion, BibleVerse, BibleChapter };

// Main Bible API using Bible Brain exclusively
export const hybridBibleApi = {
  async getVersions(): Promise<BibleVersion[]> {
    try {
      console.log('🔍 HybridBibleApi: Fetching Bible versions from Enhanced Bible Brain API...');
      
      // Use the enhanced Bible Brain API which includes fallback
      const versions = await enhancedBibleBrainApi.getVersions();
      
      console.log(`✅ HybridBibleApi: Loaded ${versions.length} Bible versions`);
      return versions;
    } catch (error) {
      console.error('❌ HybridBibleApi: Error fetching versions, using defaults:', error);
      return getDefaultVersions();
    }
  },

  async getChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 HybridBibleApi: Fetching ${book} chapter ${chapter} (version: ${version}) from Enhanced Bible Brain API`);
      
      // Map version to Bible Brain format if needed
      const biblebrainVersion = mapVersionToBibleBrain(version);
      const result = await enhancedBibleBrainApi.getChapter(biblebrainVersion, book, chapter);
      
      if (result) {
        console.log(`✅ HybridBibleApi: Successfully loaded chapter from Enhanced Bible Brain API`);
      } else {
        console.log(`⚠️ HybridBibleApi: No chapter data found for ${book} ${chapter}`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ HybridBibleApi: Error fetching chapter:', error);
      return null;
    }
  },

  async getVerse(version: string, book: string, chapter: number, verse: number): Promise<BibleVerse | null> {
    try {
      const biblebrainVersion = mapVersionToBibleBrain(version);
      return await enhancedBibleBrainApi.getVerse(biblebrainVersion, book, chapter, verse);
    } catch (error) {
      console.error('❌ HybridBibleApi: Error fetching verse:', error);
      return null;
    }
  },

  async getVersionInfo(version: string): Promise<BibleVersion | null> {
    try {
      const versions = await this.getVersions();
      return versions.find(v => v.version.toLowerCase() === version.toLowerCase()) || null;
    } catch (error) {
      console.error('❌ HybridBibleApi: Error getting version info:', error);
      return null;
    }
  },

  async getAudio(version: string, book: string, chapter: number): Promise<string | null> {
    try {
      console.log(`🎵 HybridBibleApi: Fetching audio for ${book} chapter ${chapter} (version: ${version})`);
      
      const biblebrainVersion = mapVersionToBibleBrain(version);
      const audioUrl = await enhancedBibleBrainApi.getAudio(biblebrainVersion, book, chapter);
      
      if (audioUrl) {
        console.log(`✅ HybridBibleApi: Found audio URL: ${audioUrl}`);
      } else {
        console.log(`⚠️ HybridBibleApi: No audio available for ${book} chapter ${chapter}`);
      }
      
      return audioUrl;
    } catch (error) {
      console.error('❌ HybridBibleApi: Error fetching audio:', error);
      return null;
    }
  },

  async search(version: string, query: string): Promise<BibleVerse[]> {
    try {
      // Use the enhanced Bible Brain API search functionality
      const biblebrainVersion = mapVersionToBibleBrain(version);
      return await enhancedBibleBrainApi.search(biblebrainVersion, query);
    } catch (error) {
      console.error('❌ HybridBibleApi: Error searching:', error);
      return [];
    }
  }
};