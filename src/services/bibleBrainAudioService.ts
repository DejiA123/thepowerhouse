import type { BibleVersion } from '@/types/bible';

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

export interface AudioFileSet {
  id: string;
  type: string;
  size: string;
  bitrate?: string;
  codec?: string;
  container?: string;
  volume?: string;
}

export interface AudioChapterInfo {
  book_id: string;
  chapter_start: number;
  chapter_end: number;
  verse_start: number;
  verse_end: number;
  path: string;
  duration?: number;
}

export const bibleBrainAudioService = {
  // Get available audio versions for a Bible translation
  async getAudioVersions(version: string): Promise<AudioFileSet[]> {
    try {
      console.log(`🎵 Bible Brain Audio: Fetching audio filesets for ${version}`);
      
      const response = await fetch(`${BIBLE_BRAIN_DIRECT_URL}/${version}?key=${BIBLE_BRAIN_API_KEY}&v=4`);
      
      if (!response.ok) {
        console.error(`❌ Bible Brain Audio API error: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.data || !data.data.filesets) {
        console.log(`⚠️ No audio filesets found for ${version}`);
        return [];
      }
      
      // Extract audio filesets (audio or audio_drama types)
      const audioFilesets: AudioFileSet[] = [];
      
      for (const [source, filesets] of Object.entries(data.data.filesets)) {
        if (Array.isArray(filesets)) {
          filesets.forEach((fileset: any) => {
            if (fileset.type === 'audio' || fileset.type === 'audio_drama' || fileset.type === 'audio_stream') {
              audioFilesets.push({
                id: fileset.id,
                type: fileset.type,
                size: fileset.size,
                bitrate: fileset.bitrate,
                codec: fileset.codec,
                container: fileset.container,
                volume: fileset.volume
              });
            }
          });
        }
      }
      
      console.log(`✅ Found ${audioFilesets.length} audio filesets for ${version}`);
      return audioFilesets;
    } catch (error) {
      console.error('❌ Bible Brain Audio error:', error);
      return [];
    }
  },

  // Get audio URL for a specific chapter
  async getChapterAudio(version: string, book: string, chapter: number): Promise<string | null> {
    try {
      console.log(`🎵 Bible Brain Audio: Fetching audio for ${book} chapter ${chapter} (${version})`);
      
      // Get available audio filesets
      const audioFilesets = await this.getAudioVersions(version);
      if (audioFilesets.length === 0) {
        console.log(`⚠️ No audio filesets available for ${version}`);
        return null;
      }
      
      // Use the first available high-quality audio fileset
      const preferredFileset = audioFilesets.find(f => 
        f.type === 'audio' && (f.bitrate === '64kbps' || !f.bitrate)
      ) || audioFilesets.find(f => f.type === 'audio_drama') || audioFilesets[0];
      
      console.log(`🎵 Using audio fileset: ${preferredFileset.id} (${preferredFileset.type})`);
      
      // Get the Bible Brain book code
      const bibleBrainBook = BIBLE_BRAIN_BOOK_MAP[book.toLowerCase()];
      if (!bibleBrainBook) {
        console.error(`❌ Unknown book: ${book}`);
        return null;
      }
      
      // Fetch chapter audio information
      const audioResponse = await fetch(
        `${BIBLE_BRAIN_DIRECT_URL}/${version}/filesets/${preferredFileset.id}/${bibleBrainBook}/${chapter}?key=${BIBLE_BRAIN_API_KEY}&v=4`
      );
      
      if (!audioResponse.ok) {
        console.error(`❌ Bible Brain Audio chapter API error: ${audioResponse.status}`);
        return null;
      }
      
      const audioData = await audioResponse.json();
      
      if (!audioData.data || !Array.isArray(audioData.data) || audioData.data.length === 0) {
        console.log(`⚠️ No audio data found for ${book} chapter ${chapter}`);
        return null;
      }
      
      // Get the audio file path
      const chapterAudio = audioData.data[0];
      if (!chapterAudio.path) {
        console.log(`⚠️ No audio path found for ${book} chapter ${chapter}`);
        return null;
      }
      
      // Construct the full audio URL
      const audioUrl = `https://cdn.4.dbt.io/dbp-prod/${preferredFileset.id}/${chapterAudio.path}`;
      
      console.log(`✅ Found audio URL: ${audioUrl}`);
      return audioUrl;
    } catch (error) {
      console.error('❌ Bible Brain Audio chapter error:', error);
      return null;
    }
  },

  // Check if a version has audio available
  async hasAudio(version: string): Promise<boolean> {
    try {
      const audioFilesets = await this.getAudioVersions(version);
      return audioFilesets.length > 0;
    } catch (error) {
      console.error('❌ Bible Brain Audio check error:', error);
      return false;
    }
  },

  // Get all audio information for a version
  async getVersionAudioInfo(version: string): Promise<{
    hasAudio: boolean;
    filesets: AudioFileSet[];
    preferredFileset?: AudioFileSet;
  }> {
    try {
      const filesets = await this.getAudioVersions(version);
      const hasAudio = filesets.length > 0;
      
      let preferredFileset: AudioFileSet | undefined;
      if (hasAudio) {
        preferredFileset = filesets.find(f => 
          f.type === 'audio' && (f.bitrate === '64kbps' || !f.bitrate)
        ) || filesets.find(f => f.type === 'audio_drama') || filesets[0];
      }
      
      return {
        hasAudio,
        filesets,
        preferredFileset
      };
    } catch (error) {
      console.error('❌ Bible Brain Audio info error:', error);
      return {
        hasAudio: false,
        filesets: []
      };
    }
  }
};