// Supabase Audio Service for Bible MP3 files
import { supabase } from '@/integrations/supabase/client';

const AUDIO_BUCKET = 'audio-bible';

// Book name mappings to match the MP3 file format
const BOOK_MAPPINGS: Record<string, string> = {
  'Genesis': 'B02',
  'Exodus': 'B03', 
  'Leviticus': 'B04',
  'Numbers': 'B05',
  'Deuteronomy': 'B06',
  'Joshua': 'B07',
  'Judges': 'B08',
  'Ruth': 'B09',
  '1 Samuel': 'B10',
  '2 Samuel': 'B11',
  '1 Kings': 'B12',
  '2 Kings': 'B13',
  '1 Chronicles': 'B14',
  '2 Chronicles': 'B15',
  'Ezra': 'B16',
  'Nehemiah': 'B17',
  'Esther': 'B18',
  'Job': 'B19',
  'Psalms': 'B20',
  'Proverbs': 'B21',
  'Ecclesiastes': 'B22',
  'Song of Solomon': 'B23',
  'Isaiah': 'B24',
  'Jeremiah': 'B25',
  'Lamentations': 'B26',
  'Ezekiel': 'B27',
  'Daniel': 'B28',
  'Hosea': 'B29',
  'Joel': 'B30',
  'Amos': 'B31',
  'Obadiah': 'B32',
  'Jonah': 'B33',
  'Micah': 'B34',
  'Nahum': 'B35',
  'Habakkuk': 'B36',
  'Zephaniah': 'B37',
  'Zechariah': 'B38',
  'Malachi': 'B39',
  'Matthew': 'B01',
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

// Version mappings to match the MP3 file format (API.Bible version IDs)
const VERSION_MAPPINGS: Record<string, string> = {
  // API.Bible KJV versions
  'de4e12af7f28f599-02': 'ENGKJVN1DA', // KJV (current)
  '06125adad2d5898a-01': 'ENGKJVN1DA', // KJV alternate
  
  // API.Bible NIV versions  
  '71c6efe4-400e-4a1c-b96b-7cb16a2b3a85': 'ENGNIVN1DA', // NIV (2011)
  'f72b840c855f362c-04': 'ENGNIVN1DA', // NIV alternate
  
  // API.Bible ESV versions
  '8d1c8f15-bb26-4b8b-ba2c-1f2f6a5a5c57': 'ENGESVN1DA', // ESV 
  'f421fe250b890304-02': 'ENGESVN1DA', // ESV alternate
  
  // API.Bible NLT versions
  '7142504b-f34b-4c6b-8c14-7f89d5b4c3a8': 'ENGNLTN1DA', // NLT
  '1b2d0b9a65f8c2a5-01': 'ENGNLTN1DA', // NLT alternate
  
  // API.Bible NASB versions
  '26ff8c70-53a8-4b8b-aa49-8c9e4b8e9c29': 'ENGNASN1DA', // NASB
  '4a3a6e2b5f8c2a5b-01': 'ENGNASN1DA', // NASB alternate
  
  // Legacy support for old version IDs
  'ENGKJV': 'ENGKJVN1DA',
  'KJV': 'ENGKJVN1DA',
  'ENGNIV': 'ENGNIVN1DA',
  'NIV': 'ENGNIVN1DA',
  'ENGESV': 'ENGESVN1DA',
  'ESV': 'ENGESVN1DA',
  'ENGNLT': 'ENGNLTN1DA',
  'NLT': 'ENGNLTN1DA',
  'ENGNAS': 'ENGNASN1DA',
  'NASB': 'ENGNASN1DA'
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
    // Normalize book name to match our mappings (case-insensitive)
    const normalizedBook = this.normalizeBookName(book);
    const bookCode = BOOK_MAPPINGS[normalizedBook];
    const versionCode = VERSION_MAPPINGS[version];
    
    if (!bookCode) {
      console.warn(`No book mapping found for: ${book} (normalized: ${normalizedBook})`);
      console.warn('Available books:', Object.keys(BOOK_MAPPINGS));
      
      // Show what the correct book code should be for popular books
      if (normalizedBook.toLowerCase() === 'matthew') {
        console.warn(`❌ For Matthew, the correct book code should be B40, not B01`);
        console.warn(`❌ Your file should be named: B40___01_Matthew_____ENGKJVN1DA.mp3`);
      }
      
      return '';
    }
    
    if (!versionCode) {
      console.warn(`No version mapping found for: ${version}`);
      console.warn('Available versions:', Object.keys(VERSION_MAPPINGS));
      return '';
    }
    
    // Format: B40___01_Matthew_____ENGKJVN1DA.mp3
    const chapterStr = chapter.toString().padStart(2, '0');
    const bookName = normalizedBook.replace(/\s+/g, ''); // Remove spaces
    const fileName = `${bookCode}___${chapterStr}_${bookName}_____${versionCode}.mp3`;
    
    console.log(`✅ Generated filename: ${fileName} for ${book} ${chapter} (${version})`);
    console.log(`✅ Book: ${normalizedBook} → Code: ${bookCode}`);
    console.log(`✅ Chapter: ${chapter} → Padded: ${chapterStr}`);
    console.log(`✅ Version: ${version} → Code: ${versionCode}`);
    
    return fileName;
  },

  /**
   * Normalize book name to match our mapping keys (proper case)
   */
  normalizeBookName(book: string): string {
    // Convert to lowercase for comparison
    const lowerBook = book.toLowerCase().trim();
    
    // Find the correct case version from our mappings
    const correctCase = Object.keys(BOOK_MAPPINGS).find(
      key => key.toLowerCase() === lowerBook
    );
    
    if (correctCase) {
      return correctCase;
    }
    
    // If not found, try to handle common variations
    const variations: Record<string, string> = {
      '1samuel': '1 Samuel',
      '2samuel': '2 Samuel', 
      '1kings': '1 Kings',
      '2kings': '2 Kings',
      '1chronicles': '1 Chronicles',
      '2chronicles': '2 Chronicles',
      '1corinthians': '1 Corinthians',
      '2corinthians': '2 Corinthians',
      '1thessalonians': '1 Thessalonians',
      '2thessalonians': '2 Thessalonians',
      '1timothy': '1 Timothy',
      '2timothy': '2 Timothy',
      '1peter': '1 Peter',
      '2peter': '2 Peter',
      '1john': '1 John',
      '2john': '2 John',
      '3john': '3 John',
      'songofsolomon': 'Song of Solomon'
    };
    
    if (variations[lowerBook]) {
      return variations[lowerBook];
    }
    
    // Fallback: capitalize first letter of each word
    return book.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  },

  /**
   * Get the public URL for an MP3 file
   */
  async getAudioUrl(book: string, chapter: number, version: string): Promise<string | null> {
    try {
      console.log(`🔍 getAudioUrl called with: book="${book}", chapter=${chapter}, version="${version}"`);
      
      const fileName = this.generateFileName(book, chapter, version);
      console.log(`🔍 Generated fileName: "${fileName}"`);
      
      if (!fileName) {
        console.warn(`Could not generate filename for ${book} ${chapter} (${version})`);
        return null;
      }

      // Check if file exists first
      console.log(`🔍 Checking if file exists: ${fileName}`);
      const exists = await this.checkAudioExists(book, chapter, version);
      console.log(`🔍 File exists: ${exists}`);
      
      if (!exists) {
        console.warn(`🔍 File does not exist in bucket: ${fileName}`);
        return null;
      }

      // Get the public URL from Supabase storage
      console.log(`🔍 Getting public URL for: ${fileName}`);
      const { data } = await supabase.storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(fileName);

      if (!data?.publicUrl) {
        console.error(`Error getting public URL for ${fileName}: No URL returned`);
        return null;
      }

      console.log(`🎵 Audio URL for ${book} ${chapter}:`, data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error(`❌ Error getting audio URL for ${book} ${chapter}:`, error);
      return null;
    }
  },

  /**
   * Check if an audio file exists in the bucket
   */
  async checkAudioExists(book: string, chapter: number, version: string): Promise<boolean> {
    try {
      const fileName = this.generateFileName(book, chapter, version);
      console.log(`🔍 checkAudioExists for fileName: "${fileName}"`);
      
      if (!fileName) {
        console.log(`🔍 No fileName generated, returning false`);
        return false;
      }

      console.log(`🔍 Searching bucket for: "${fileName}"`);
      const { data, error } = await supabase.storage
        .from(AUDIO_BUCKET)
        .list('', {
          limit: 100
        });

      if (error) {
        console.error(`❌ Error checking if audio exists for ${fileName}:`, error);
        return false;
      }

      console.log(`🔍 Search results:`, data);
      
      // Look for exact filename match
      const exists = data && data.some(file => file.name === fileName);
      console.log(`🔍 Audio file ${fileName} exists:`, exists);
      
      if (!exists) {
        console.log(`🔍 Available files:`, data?.map(f => f.name) || []);
      }
      
      return exists;
    } catch (error) {
      console.error(`❌ Error checking audio existence for ${book} ${chapter}:`, error);
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
