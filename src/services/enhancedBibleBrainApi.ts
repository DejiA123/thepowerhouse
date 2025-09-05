import { bibleBrainService, BibleBrainVersion, BibleBrainChapter, BibleBrainVerse } from './bibleBrainService';
import { enhancedBibleBrainService } from './enhancedBibleBrainService';
import { mapVersionToBibleBrain } from './bibleBrainVersions';
import type { BibleVersion, BibleVerse, BibleChapter } from '@/types/bible';


export const enhancedBibleBrainApi = {
  // Get available Bible versions (Enhanced Bible Brain with comprehensive English translations)
  async getVersions(): Promise<BibleVersion[]> {
    try {
      console.log('🔍 Enhanced Bible API: Fetching comprehensive English versions from Bible Brain...');
      
      // Use the enhanced service to get ALL English translations
      const enhancedVersions = await enhancedBibleBrainService.getAllEnglishVersions();
      
      if (enhancedVersions.length > 0) {
        console.log(`✅ Enhanced Bible API: Found ${enhancedVersions.length} English versions from Enhanced Bible Brain`);
        
        // Convert enhanced versions to standard BibleVersion format
        return enhancedVersions.map((version) => ({
          id: version.id,
          version: version.version,
          name: version.name,
          abbreviation: version.abbreviation,
          language: version.language,
          source: version.source
        }));
      }
      
      console.log('⚠️ Enhanced Bible API: No enhanced versions found, falling back to basic service');
      
      // Fallback to basic Bible Brain service
      const bibleBrainVersions = await bibleBrainService.getVersions();
      
      if (bibleBrainVersions.length > 0) {
        console.log(`✅ Enhanced Bible API: Found ${bibleBrainVersions.length} versions from basic Bible Brain`);
        
        return bibleBrainVersions.map((version: any) => ({
          id: version.version,
          version: version.name,
          name: version.name,
          abbreviation: version.abbreviation,
          language: version.language,
          source: 'bible-brain' as const
        }));
      }
      
      console.log('❌ Enhanced Bible API: No versions found from any service');
      return [];
    } catch (error) {
      console.error('❌ Enhanced Bible API: Error fetching versions:', error);
      // Return fallback versions on error
      return enhancedBibleBrainService.getFallbackVersions().map(version => ({
        id: version.id,
        version: version.version,
        name: version.name,
        abbreviation: version.abbreviation,
        language: version.language,
        source: version.source
      }));
    }
  },

  // Get Bible chapter (Bible Brain only)
  async getChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Enhanced Bible API: Fetching ${book} chapter ${chapter} (version: ${version}) from Bible Brain`);
      
              // Use Bible Brain only
        const bibleBrainChapter = await bibleBrainService.getChapter(version, book, chapter, false);
      
      if (bibleBrainChapter) {
        console.log(`✅ Enhanced Bible API: Successfully loaded from Bible Brain`);
        return {
          book: bibleBrainChapter.book,
          chapter: bibleBrainChapter.chapter,
          verses: bibleBrainChapter.verses.map(verse => ({
            book: verse.book,
            chapter: verse.chapter,
            verse: verse.verse,
            text: verse.text,
            reference: verse.reference,
            version: verse.version
          })),
          version: version
        };
      }
      
      console.log('❌ Enhanced Bible API: Bible Brain failed, no fallback available');
      return null;
      
    } catch (error) {
      console.error('❌ Enhanced Bible API: Error fetching chapter:', error);
      return null;
    }
  },

  // Get Bible verse (Bible Brain only)
  async getVerse(version: string, book: string, chapter: number, verse: number): Promise<BibleVerse | null> {
    try {
      console.log(`🔍 Enhanced Bible API: Fetching ${book} ${chapter}:${verse} (version: ${version}) from Bible Brain`);
      
      // Use Bible Brain only
      const bibleBrainVerse = await bibleBrainService.getVerse(version, book, chapter, verse);
      
      if (bibleBrainVerse) {
        console.log(`✅ Enhanced Bible API: Successfully loaded verse from Bible Brain`);
        return {
          book: bibleBrainVerse.book,
          chapter: bibleBrainVerse.chapter,
          verse: bibleBrainVerse.verse,
          text: bibleBrainVerse.text,
          reference: bibleBrainVerse.reference,
          version: bibleBrainVerse.version
        };
      }
      
      console.log('❌ Enhanced Bible API: Bible Brain failed, no fallback available');
      return null;
      
    } catch (error) {
      console.error('❌ Enhanced Bible API: Error fetching verse:', error);
      return null;
    }
  },

  // Get audio URL (Bible Brain only - fallback doesn't have audio)
  async getAudio(version: string, book: string, chapter: number): Promise<string | null> {
    try {
      console.log(`🎵 Enhanced Bible API: Fetching audio for ${book} chapter ${chapter} (version: ${version})`);
      
      const audioUrl = await bibleBrainService.getAudio(version, book, chapter);
      
      if (audioUrl) {
        console.log(`✅ Enhanced Bible API: Found audio URL: ${audioUrl}`);
        return audioUrl;
      }
      
      console.log(`⚠️ Enhanced Bible API: No audio available for ${book} chapter ${chapter}`);
      return null;
    } catch (error) {
      console.error('❌ Enhanced Bible API: Error fetching audio:', error);
      return null;
    }
  },


  // Search functionality (Bible Brain only)
  async search(version: string, query: string): Promise<BibleVerse[]> {
    try {
      console.log(`🔍 Enhanced Bible API: Searching for "${query}" in ${version} using Bible Brain`);
      
      // Use Bible Brain only
      const biblebrainVersion = mapVersionToBibleBrain(version);
      const searchResults = await bibleBrainService.search(biblebrainVersion, query);
      
      if (searchResults && searchResults.length > 0) {
        console.log(`✅ Enhanced Bible API: Found ${searchResults.length} results from Bible Brain`);
        return searchResults.map(verse => ({
          book: verse.book,
          chapter: verse.chapter,
          verse: verse.verse,
          text: verse.text,
          reference: verse.reference,
          version: verse.version
        }));
      }
      
      console.log('❌ Enhanced Bible API: Bible Brain search failed, no fallback available');
      return [];
      
    } catch (error) {
      console.error('❌ Enhanced Bible API: Search error:', error);
      return [];
    }
  },

  // Test API connectivity
  async testAPI(): Promise<boolean> {
    try {
      console.log('🧪 Enhanced Bible API: Testing Bible Brain connectivity...');
      
      // Test Bible Brain only
      const versions = await bibleBrainService.getVersions();
      if (versions.length > 0) {
        console.log('✅ Enhanced Bible API: Bible Brain is working');
        return true;
      }
      
      console.log('❌ Enhanced Bible API: Bible Brain failed');
      return false;
    } catch (error) {
      console.error('❌ Enhanced Bible API: Test failed:', error);
      return false;
    }
  }
};