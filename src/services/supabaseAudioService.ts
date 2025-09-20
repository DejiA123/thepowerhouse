// Supabase Audio Service for Bible MP3 files
import { supabase } from '@/integrations/supabase/client';

const AUDIO_BUCKET = 'audio-bible';

// Book name mappings to match the MP3 file format
const BOOK_MAPPINGS: Record<string, string> = {
  'Genesis': 'A01',
  'Matthew': 'B01', // Fixed: Matthew files use B01 prefix
  'Exodus': 'A02', 
  'Leviticus': 'A03',
  'Numbers': 'A04',
  'Deuteronomy': 'A05',
  'Joshua': 'A06',
  'Judges': 'A07',
  'Ruth': 'A08',
  '1 Samuel': 'A09',
  '2 Samuel': 'A10',
  '1 Kings': 'A11',
  '2 Kings': 'A12',
  '1 Chronicles': 'A13',
  '2 Chronicles': 'A14',
  'Ezra': 'A15',
  'Nehemiah': 'A16',
  'Esther': 'A17',
  'Job': 'A18',
  'Psalms': 'A19',
  'Proverbs': 'A20',
  'Ecclesiastes': 'A21',
  'Song of Solomon': 'A22',
  'Isaiah': 'A23',
  'Jeremiah': 'A24',
  'Lamentations': 'A25',
  'Ezekiel': 'A26',
  'Daniel': 'A27',
  'Hosea': 'A28',
  'Joel': 'A29',
  'Amos': 'A30',
  'Obadiah': 'A31',
  'Jonah': 'A32',
  'Micah': 'A33',
  'Nahum': 'B35',
  'Habakkuk': 'B36',
  'Zephaniah': 'B37',
  'Zechariah': 'B38',
  'Malachi': 'B39',
  'Mark': 'B02', // Fixed: Mark files use B02 prefix
  'Luke': 'B03', // Fixed: Luke files use B03 prefix
  'John': 'B04', // Fixed: John files use B04 prefix
  'Acts': 'B05', // Fixed: Acts files use B05 prefix
  'Romans': 'B06', // Fixed: Romans files use B06 prefix
  '1 Corinthians': 'B07', // Fixed: 1 Corinthians files use B07 prefix
  '2 Corinthians': 'B08', // Fixed: 2 Corinthians files use B08 prefix
  'Galatians': 'B09', // Fixed: Galatians files use B09 prefix
  'Ephesians': 'B10', // Fixed: Ephesians files use B10 prefix
  'Philippians': 'B11', // Fixed: Philippians files use B11 prefix
  'Colossians': 'B12', // Fixed: Colossians files use B12 prefix
  '1 Thessalonians': 'B13', // Fixed: 1 Thessalonians files use B13 prefix
  '2 Thessalonians': 'B14', // Fixed: 2 Thessalonians files use B14 prefix
  '1 Timothy': 'B15', // Fixed: 1 Timothy files use B15 prefix
  '2 Timothy': 'B16', // Fixed: 2 Timothy files use B16 prefix
  'Titus': 'B17', // Fixed: Titus files use B17 prefix
  'Philemon': 'B18', // Fixed: Philemon files use B18 prefix
  'Hebrews': 'B19', // Fixed: Hebrews files use B19 prefix
  'James': 'B20', // Fixed: James files use B20 prefix
  '1 Peter': 'B21', // Fixed: 1 Peter files use B21 prefix
  '2 Peter': 'B22', // Fixed: 2 Peter files use B22 prefix
  '1 John': 'B23', // Fixed: 1 John files use B23 prefix
  '2 John': 'B24', // Fixed: 2 John files use B24 prefix
  '3 John': 'B25', // Fixed: 3 John files use B25 prefix
  'Jude': 'B26', // Fixed: Jude files use B26 prefix
  'Revelation': 'B27' // Fixed: Revelation files use B27 prefix
};

// Version mappings to match the MP3 file format (API.Bible version IDs)
const VERSION_MAPPINGS: Record<string, string> = {
  // API.Bible KJV versions - updated to match your actual files
  'de4e12af7f28f599-02': 'ENGKJVN1DA', // KJV (current) - New Testament uses ENGKJVN1DA
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
    // Use the standard mapping for all books including Matthew
    // The special case logic was causing issues with file lookup

    // For other books, use the existing mapping
    const normalizedBook = this.normalizeBookName(book);
    const bookCode = BOOK_MAPPINGS[normalizedBook];
    
    // Handle different version codes for Old vs New Testament
    let versionCode = VERSION_MAPPINGS[version];
    if (versionCode === 'ENGKJVN1DA') {
      // For KJV, use different version codes based on testament
      if (bookCode && bookCode.startsWith('A')) {
        // Old Testament books (A01, A02, etc.) use ENGKJVO1DA
        versionCode = 'ENGKJVO1DA';
      } else if (bookCode && bookCode.startsWith('B')) {
        // New Testament books (B01, B02, etc.) use ENGKJVN1DA
        versionCode = 'ENGKJVN1DA';
      }
    }
    
    if (!bookCode) {
      console.warn(`No book mapping found for: ${book} (normalized: ${normalizedBook})`);
      console.warn('Available books:', Object.keys(BOOK_MAPPINGS));
      return '';
    }
    
    if (!versionCode) {
      console.warn(`No version mapping found for: ${version}`);
      console.warn('Available versions:', Object.keys(VERSION_MAPPINGS));
      return '';
    }
    
    // Format: A01___01_Genesis_____ENGKJVO1DA.mp3
    // Special case: Psalms uses 3-digit chapter padding instead of 2-digit
    // Special case: Philemon only has 1 chapter, so always use 01
    let chapterStr;
    if (normalizedBook === 'Psalms') {
      chapterStr = chapter.toString().padStart(3, '0');
    } else if (normalizedBook === 'Philemon') {
      chapterStr = '01'; // Philemon only has 1 chapter
    } else {
      chapterStr = chapter.toString().padStart(2, '0');
    }
    let bookName = normalizedBook.replace(/\s+/g, ''); // Remove spaces
    
    // Special handling for abbreviated book names in the bucket
    if (bookName === '1Thessalonians') {
      bookName = '1Thess';
    } else if (bookName === '2Thessalonians') {
      bookName = '2Thess';
    }
    
    // Calculate padding needed to make book name + underscores = 12 characters total
    const paddingNeeded = Math.max(0, 12 - bookName.length);
    const underscores = '_'.repeat(paddingNeeded);
    // Special case: Psalms uses 2 underscores instead of 3 between book code and chapter
    const separator = normalizedBook === 'Psalms' ? '__' : '___';
    const fileName = `${bookCode}${separator}${chapterStr}_${bookName}${underscores}${versionCode}.mp3`;
    
    console.log(`✅ Generated filename: ${fileName} for ${book} ${chapter} (${version})`);
    console.log(`✅ Book: ${normalizedBook} → Code: ${bookCode}`);
    console.log(`✅ Chapter: ${chapter} → Padded: ${chapterStr}`);
    console.log(`✅ Version: ${version} → Code: ${versionCode}`);
    console.log(`✅ BookName: "${bookName}" (length: ${bookName.length})`);
    console.log(`✅ Padding needed: ${paddingNeeded}, Underscores: "${underscores}"`);
    
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
      '1-samuel': '1 Samuel', // Handle hyphenated version
      '2samuel': '2 Samuel',
      '2-samuel': '2 Samuel', // Handle hyphenated version
      '1kings': '1 Kings',
      '1-kings': '1 Kings', // Handle hyphenated version
      '2kings': '2 Kings',
      '2-kings': '2 Kings', // Handle hyphenated version
      '1chronicles': '1 Chronicles',
      '1-chronicles': '1 Chronicles', // Handle hyphenated version
      '2chronicles': '2 Chronicles',
      '2-chronicles': '2 Chronicles', // Handle hyphenated version
      '1corinthians': '1 Corinthians',
      '1-corinthians': '1 Corinthians', // Handle hyphenated version
      '2corinthians': '2 Corinthians',
      '2-corinthians': '2 Corinthians', // Handle hyphenated version
      '1thessalonians': '1 Thessalonians',
      '1-thessalonians': '1 Thessalonians', // Handle hyphenated version
      '2thessalonians': '2 Thessalonians',
      '2-thessalonians': '2 Thessalonians', // Handle hyphenated version
      '1timothy': '1 Timothy',
      '1-timothy': '1 Timothy', // Handle hyphenated version
      '2timothy': '2 Timothy',
      '2-timothy': '2 Timothy', // Handle hyphenated version
      '1peter': '1 Peter',
      '1-peter': '1 Peter', // Handle hyphenated version
      '2peter': '2 Peter',
      '2-peter': '2 Peter', // Handle hyphenated version
      '1john': '1 John',
      '1-john': '1 John', // Handle hyphenated version
      '2john': '2 John',
      '2-john': '2 John', // Handle hyphenated version
      '3john': '3 John',
      '3-john': '3 John', // Handle hyphenated version
      'songofsolomon': 'Song of Solomon',
      'song-of-solomon': 'Song of Solomon' // Handle hyphenated version
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

      // Get the public URL from Supabase storage directly - much faster
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

      console.log(`🔍 Attempting to list files from bucket: ${AUDIO_BUCKET}`);
      
      // Use pagination to get all files
      const getAllFiles = async () => {
        let allFiles: any[] = [];
        
        // Get files by prefix patterns to work around Supabase limitations
        const prefixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        
        for (const prefix of prefixes) {
          try {
            const { data: batch, error: batchError } = await supabase.storage
              .from(AUDIO_BUCKET)
              .list('', { 
                limit: 1000,
                sortBy: { column: 'name', order: 'asc' },
                search: prefix
              });
            
            if (batchError) {
              console.error(`❌ Error fetching files with prefix ${prefix}:`, batchError);
              continue;
            }
            
            if (batch && batch.length > 0) {
              allFiles = [...allFiles, ...batch];
              console.log(`🔍 checkAudioExists - Fetched ${batch.length} files with prefix ${prefix}, total so far: ${allFiles.length}`);
            }
          } catch (error) {
            console.error(`❌ Error processing prefix ${prefix}:`, error);
          }
        }
        
        // Remove duplicates and sort
        const uniqueFiles = allFiles.filter((file, index, self) => 
          index === self.findIndex(f => f.name === file.name)
        ).sort((a, b) => a.name.localeCompare(b.name));
        
        return uniqueFiles;
      };
      
      const listData = await getAllFiles();

      console.log(`✅ Successfully listed bucket. Found ${listData.length} files`);
      console.log(`🔍 Available files:`, listData.map(f => f.name));
      
      // Check if our specific file exists
      const exists = listData.some(file => file.name === fileName);
      console.log(`🔍 Looking for exact match: "${fileName}"`);
      console.log(`🔍 File exists: ${exists}`);
      
      // If Matthew file doesn't exist, suggest what files are available
      if (!exists && book.toLowerCase() === 'matthew') {
        console.log(`❌ Matthew file not found. You need to upload: ${fileName}`);
        console.log(`🔍 Available files in bucket:`);
        listData.forEach(file => console.log(`  - ${file.name}`));
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
