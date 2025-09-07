// Supabase Audio Service for Bible MP3 files
import { supabase } from '@/integrations/supabase/client';

const AUDIO_BUCKET = 'audio-bible';

// Book name mappings to match the MP3 file format
const BOOK_MAPPINGS: Record<string, string> = {
  'Genesis': 'B01',
  'Exodus': 'B02', 
  'Leviticus': 'B03',
  'Numbers': 'B04',
  'Deuteronomy': 'B05',
  'Joshua': 'B06',
  'Judges': 'B07',
  'Ruth': 'B08',
  '1 Samuel': 'B09',
  '2 Samuel': 'B10',
  '1 Kings': 'B11',
  '2 Kings': 'B12',
  '1 Chronicles': 'B13',
  '2 Chronicles': 'B14',
  'Ezra': 'B15',
  'Nehemiah': 'B16',
  'Esther': 'B17',
  'Job': 'B18',
  'Psalms': 'B19',
  'Proverbs': 'B20',
  'Ecclesiastes': 'B21',
  'Song of Solomon': 'B22',
  'Isaiah': 'B23',
  'Jeremiah': 'B24',
  'Lamentations': 'B25',
  'Ezekiel': 'B26',
  'Daniel': 'B27',
  'Hosea': 'B28',
  'Joel': 'B29',
  'Amos': 'B30',
  'Obadiah': 'B31',
  'Jonah': 'B32',
  'Micah': 'B33',
  'Nahum': 'B34',
  'Habakkuk': 'B35',
  'Zephaniah': 'B36',
  'Haggai': 'B37',
  'Zechariah': 'B38',
  'Malachi': 'B39',
  'Matthew': 'B40',
  'Mark': 'B41',
  'Luke': 'B42',
  'John': 'B43',
  'Acts': 'B44',
  'Romans': 'B45',
  '1 Corinthians': 'B46',
  '2 Corinthians': 'B47',
  'Galatians': 'B48',
  'Ephesians': 'B49',
  'Philippians': 'B50',
  'Colossians': 'B51',
  '1 Thessalonians': 'B52',
  '2 Thessalonians': 'B53',
  '1 Timothy': 'B54',
  '2 Timothy': 'B55',
  'Titus': 'B56',
  'Philemon': 'B57',
  'Hebrews': 'B58',
  'James': 'B59',
  '1 Peter': 'B60',
  '2 Peter': 'B61',
  '1 John': 'B62',
  '2 John': 'B63',
  '3 John': 'B64',
  'Jude': 'B65',
  'Revelation': 'B66'
};

// Version mappings to match the MP3 file format
const VERSION_MAPPINGS: Record<string, string> = {
  'de4e12af7f28f599-02': 'ENGKJVN1DA', // KJV
  'ENGKJV': 'ENGKJVN1DA', // KJV legacy
  'KJV': 'ENGKJVN1DA', // KJV abbreviation
  '71c6efe4-400e-4a1c-b96b-7cb16a2b3a85': 'ENGNIVN1DA', // NIV
  'ENGNIV': 'ENGNIVN1DA', // NIV legacy
  'NIV': 'ENGNIVN1DA', // NIV abbreviation
  '8d1c8f15-bb26-4b8b-ba2c-1f2f6a5a5c57': 'ENGESVN1DA', // ESV
  'ENGESV': 'ENGESVN1DA', // ESV legacy
  'ESV': 'ENGESVN1DA', // ESV abbreviation
  '7142504b-f34b-4c6b-8c14-7f89d5b4c3a8': 'ENGNLTN1DA', // NLT
  'ENGNLT': 'ENGNLTN1DA', // NLT legacy
  'NLT': 'ENGNLTN1DA', // NLT abbreviation
  '26ff8c70-53a8-4b8b-aa49-8c9e4b8e9c29': 'ENGNASN1DA', // NASB
  'ENGNAS': 'ENGNASN1DA', // NASB legacy
  'NASB': 'ENGNASN1DA', // NASB abbreviation
};

export interface AudioFileInfo {
  fileName: string;
  url: string;
  book: string;
  chapter: number;
  version: string;
}

export const supabaseAudioService = {
  /**
   * Generate the expected MP3 filename based on book, chapter, and version
   */
  generateFileName(book: string, chapter: number, version: string): string {
    const bookCode = BOOK_MAPPINGS[book];
    const versionCode = VERSION_MAPPINGS[version];
    
    if (!bookCode) {
      console.warn(`No book mapping found for: ${book}`);
      return '';
    }
    
    if (!versionCode) {
      console.warn(`No version mapping found for: ${version}`);
      return '';
    }
    
    // Format: B01___01_Matthew_____ENGKJVN1DA
    const chapterStr = chapter.toString().padStart(2, '0');
    const bookName = book.replace(/\s+/g, ''); // Remove spaces
    const fileName = `${bookCode}___${chapterStr}_${bookName}_____${versionCode}.mp3`;
    
    console.log(`Generated filename: ${fileName} for ${book} ${chapter} (${version})`);
    return fileName;
  },

  /**
   * Get the public URL for an MP3 file
   */
  async getAudioUrl(book: string, chapter: number, version: string): Promise<string | null> {
    try {
      const fileName = this.generateFileName(book, chapter, version);
      
      if (!fileName) {
        console.warn(`Could not generate filename for ${book} ${chapter} (${version})`);
        return null;
      }

      // Get the public URL from Supabase storage
      const { data, error } = await supabase.storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(fileName);

      if (error) {
        console.error(`Error getting public URL for ${fileName}:`, error);
        return null;
      }

      console.log(`Audio URL for ${book} ${chapter}:`, data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error(`Error getting audio URL for ${book} ${chapter}:`, error);
      return null;
    }
  },

  /**
   * Check if an audio file exists in the bucket
   */
  async checkAudioExists(book: string, chapter: number, version: string): Promise<boolean> {
    try {
      const fileName = this.generateFileName(book, chapter, version);
      
      if (!fileName) {
        return false;
      }

      const { data, error } = await supabase.storage
        .from(AUDIO_BUCKET)
        .list('', {
          search: fileName
        });

      if (error) {
        console.error(`Error checking if audio exists for ${fileName}:`, error);
        return false;
      }

      const exists = data && data.length > 0;
      console.log(`Audio file ${fileName} exists:`, exists);
      return exists;
    } catch (error) {
      console.error(`Error checking audio existence for ${book} ${chapter}:`, error);
      return false;
    }
  },

  /**
   * Get audio file info for a specific book, chapter, and version
   */
  async getAudioFileInfo(book: string, chapter: number, version: string): Promise<AudioFileInfo | null> {
    try {
      const fileName = this.generateFileName(book, chapter, version);
      
      if (!fileName) {
        return null;
      }

      const url = await this.getAudioUrl(book, chapter, version);
      
      if (!url) {
        return null;
      }

      return {
        fileName,
        url,
        book,
        chapter,
        version
      };
    } catch (error) {
      console.error(`Error getting audio file info for ${book} ${chapter}:`, error);
      return null;
    }
  },

  /**
   * List all available audio files for a specific version
   */
  async listAvailableAudio(version: string): Promise<AudioFileInfo[]> {
    try {
      const versionCode = VERSION_MAPPINGS[version];
      
      if (!versionCode) {
        console.warn(`No version mapping found for: ${version}`);
        return [];
      }

      const { data, error } = await supabase.storage
        .from(AUDIO_BUCKET)
        .list('', {
          search: versionCode
        });

      if (error) {
        console.error(`Error listing audio files for version ${version}:`, error);
        return [];
      }

      if (!data) {
        return [];
      }

      // Parse the filenames to extract book and chapter info
      const audioFiles: AudioFileInfo[] = data
        .filter(file => file.name.endsWith('.mp3'))
        .map(file => {
          // Parse filename: B01___01_Matthew_____ENGKJVN1DA.mp3
          const match = file.name.match(/^B(\d+)___(\d+)_(\w+)_____(\w+)\.mp3$/);
          
          if (match) {
            const [, bookNum, chapterNum, bookName, versionCode] = match;
            
            // Find the book name from the book number
            const book = Object.keys(BOOK_MAPPINGS).find(
              key => BOOK_MAPPINGS[key] === `B${bookNum.padStart(2, '0')}`
            );
            
            if (book) {
              return {
                fileName: file.name,
                url: supabase.storage.from(AUDIO_BUCKET).getPublicUrl(file.name).data.publicUrl,
                book,
                chapter: parseInt(chapterNum),
                version
              };
            }
          }
          
          return null;
        })
        .filter((file): file is AudioFileInfo => file !== null);

      console.log(`Found ${audioFiles.length} audio files for version ${version}`);
      return audioFiles;
    } catch (error) {
      console.error(`Error listing available audio for version ${version}:`, error);
      return [];
    }
  },

  /**
   * Get all available versions from the audio files
   */
  async getAvailableVersions(): Promise<string[]> {
    try {
      const { data, error } = await supabase.storage
        .from(AUDIO_BUCKET)
        .list('');

      if (error) {
        console.error('Error listing audio bucket:', error);
        return [];
      }

      if (!data) {
        return [];
      }

      // Extract unique version codes from filenames
      const versionCodes = new Set<string>();
      
      data
        .filter(file => file.name.endsWith('.mp3'))
        .forEach(file => {
          const match = file.name.match(/_____(\w+)\.mp3$/);
          if (match) {
            versionCodes.add(match[1]);
          }
        });

      // Map version codes back to our internal version IDs
      const availableVersions: string[] = [];
      
      Object.entries(VERSION_MAPPINGS).forEach(([versionId, versionCode]) => {
        if (versionCodes.has(versionCode)) {
          availableVersions.push(versionId);
        }
      });

      console.log('Available audio versions:', availableVersions);
      return availableVersions;
    } catch (error) {
      console.error('Error getting available versions:', error);
      return [];
    }
  }
};
