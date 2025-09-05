// Enhanced Bible Brain API with working version IDs
import { bibleBrainServiceFixed } from './bibleBrainServiceFixed';
import { normalizeVersionId, getFallbackVersions, VERSION_DISPLAY_NAMES } from './bibleBrainVersionMapping';
import type { BibleVersion, BibleChapter } from '@/types/bible';

export interface EnhancedBibleVersion extends BibleVersion {
  category?: 'Traditional' | 'Modern' | 'Paraphrase' | 'Study' | 'Regional' | 'Other';
  popularity?: number;
  year?: string;
  publisher?: string;
  description?: string;
  hasAudio?: boolean;
}

// Enhanced Bible Brain API with multiple source support
export const enhancedBibleBrainApiNew = {
  // Get all available versions from Bible Brain
  async getVersions(): Promise<EnhancedBibleVersion[]> {
    try {
      console.log('🔍 Enhanced Bible Brain API: Fetching Bible versions...');
      
      const versions = await bibleBrainServiceFixed.getVersions();
      
      // Transform to enhanced versions with additional metadata
      const enhancedVersions = versions.map(version => this.enhanceVersion(version));
      
      // Sort by popularity and then alphabetically
      enhancedVersions.sort((a, b) => {
        const popularityDiff = (b.popularity || 0) - (a.popularity || 0);
        if (popularityDiff !== 0) return popularityDiff;
        return a.name.localeCompare(b.name);
      });
      
      console.log(`✅ Enhanced Bible Brain API: Returning ${enhancedVersions.length} Bible versions`);
      return enhancedVersions;
    } catch (error) {
      console.error('❌ Enhanced Bible Brain API error:', error);
      return this.getFallbackVersions();
    }
  },

  // Enhance version with additional metadata
  enhanceVersion(version: any): EnhancedBibleVersion {
    const abbr = version.abbreviation.toLowerCase();
    
    // Version categorization
    const categories: Record<string, EnhancedBibleVersion['category']> = {
      'kjv': 'Traditional', 'nkjv': 'Traditional', 'asv': 'Traditional',
      'rsv': 'Traditional', 'dra': 'Traditional', 'ylt': 'Traditional',
      'niv': 'Modern', 'esv': 'Modern', 'nlt': 'Modern', 'nasb': 'Modern',
      'csb': 'Modern', 'hcsb': 'Modern', 'net': 'Modern', 'nrsv': 'Modern',
      'msg': 'Paraphrase', 'cev': 'Paraphrase', 'gnt': 'Paraphrase',
      'amp': 'Study', 'amplified': 'Study'
    };
    
    // Popularity ranking (higher = more popular)
    const popularity: Record<string, number> = {
      'niv': 100, 'kjv': 95, 'esv': 90, 'nlt': 85, 'nasb': 80,
      'nkjv': 75, 'amp': 70, 'rsv': 65, 'csb': 60, 'hcsb': 60,
      'nrsv': 55, 'net': 50, 'msg': 45, 'asv': 40, 'cev': 35
    };
    
    return {
      ...version,
      category: categories[abbr] || 'Other',
      popularity: popularity[abbr] || 1,
      hasAudio: true // Bible Brain typically has audio
    };
  },

  // Get chapter content from Bible Brain
  async getChapter(version: string, book: string, chapter: number): Promise<BibleChapter | null> {
    try {
      console.log(`🔍 Enhanced Bible Brain API: Fetching ${book} chapter ${chapter} (version: ${version})`);
      
      // Normalize version to ensure we use working version IDs
      const normalizedVersion = normalizeVersionId(version);
      if (normalizedVersion !== version) {
        console.log(`🔄 Version normalized from '${version}' to '${normalizedVersion}'`);
      }
      
      const chapterData = await bibleBrainServiceFixed.getChapter(normalizedVersion, book, chapter);
      
      if (!chapterData) {
        console.error('❌ Enhanced Bible Brain API: No chapter data received');
        return null;
      }
      
      // Transform to our standard format
      const standardChapter: BibleChapter = {
        book: chapterData.book,
        chapter: chapterData.chapter,
        verses: chapterData.verses.map(verse => ({
          book: verse.book,
          chapter: verse.chapter,
          verse: verse.verse,
          text: verse.text
        })),
        text: chapterData.verses.map(v => v.text).join(' '),
        reference: `${book} ${chapter}`,
        version: normalizedVersion
      };
      
      console.log(`✅ Enhanced Bible Brain API: Successfully loaded ${standardChapter.verses.length} verses`);
      return standardChapter;
    } catch (error) {
      console.error('❌ Enhanced Bible Brain API chapter error:', error);
      return null;
    }
  },

  // Get audio URL for chapter
  async getAudio(version: string, book: string, chapter: number): Promise<string | null> {
    try {
      console.log(`🎵 Enhanced Bible Brain API: Getting audio for ${book} chapter ${chapter} (version: ${version})`);
      
      // Normalize version for audio as well
      const normalizedVersion = normalizeVersionId(version);
      const audioUrl = await bibleBrainServiceFixed.getAudio(normalizedVersion, book, chapter);
      
      if (audioUrl) {
        console.log(`✅ Enhanced Bible Brain API: Found audio URL`);
        return audioUrl;
      }
      
      console.log(`⚠️ Enhanced Bible Brain API: No audio available`);
      return null;
    } catch (error) {
      console.error('❌ Enhanced Bible Brain API audio error:', error);
      return null;
    }
  },

  // Get fallback versions if API fails
  getFallbackVersions(): EnhancedBibleVersion[] {
    return getFallbackVersions().map(version => ({
      ...version,
      category: VERSION_DISPLAY_NAMES[version.id]?.category as EnhancedBibleVersion['category'] || 'Traditional',
      popularity: version.id === 'KJVPCE' ? 95 : 50,
      hasAudio: true
    }));
  },

  // Search functionality (placeholder)
  async search(version: string, query: string): Promise<any[]> {
    console.log(`🔍 Enhanced Bible Brain API: Search not yet implemented for ${version}: "${query}"`);
    return [];
  }
};