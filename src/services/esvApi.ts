export interface ESVAudioResponse {
  audio: string[];
  query: string;
  canonical: string;
  parsed: number[][];
}

export interface ESVPassageResponse {
  query: string;
  canonical: string;
  parsed: number[][];
  passage_meta: Array<{
    canonical: string;
    chapter_start: number[];
    chapter_end: number[];
    prev_verse: number;
    next_verse: number;
    prev_chapter: number[];
    next_chapter: number[];
  }>;
  passages: string[];
}

class ESVAPI {
  private apiKey: string;
  private baseUrl = 'https://api.esv.org/v3';

  constructor() {
    // Use the provided ESV API key for Max McLean audio
    // Updated to a more recent key that should have audio access
    this.apiKey = '99615d1dcb185d20a0f76c53a9b239106577d164';
    
    // Test the API connection and audio access on initialization
    this.testApiConnection().then(isConnected => {
      console.log('ESV API connection test result:', isConnected);
      if (isConnected) {
        this.testAudioAccess().then(hasAudio => {
          console.log('ESV API audio access test result:', hasAudio);
        });
      }
    });
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('ESV API key not configured.');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    console.log('Making ESV API request to:', url.toString());
    console.log('With params:', params);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('ESV API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ESV API error response:', errorText);
      throw new Error(`ESV API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('ESV API response data:', data);
    return data;
  }

  async getAudioForChapter(book: string, chapter: number): Promise<string | null> {
    try {
      // Format the query for ESV API (e.g., "John 3" or "Genesis 1")
      const query = `${book} ${chapter}`;
      
      console.log('Requesting Max McLean audio for:', query);
      
      const response = await this.makeRequest('/passage/audio/', {
        q: query,
        include_passage_references: 'false'
      });

      console.log('ESV API response:', response);

      if (response.audio && response.audio.length > 0) {
        // Return the first audio URL (Max McLean's narration)
        const audioUrl = response.audio[0];
        console.log('Max McLean audio URL:', audioUrl);
        return audioUrl;
      }

      // Try alternative query formats if the first one fails
      const alternativeQueries = [
        `${book} ${chapter}:1-50`,  // Try with verse range
        `${book} ${chapter}:1-100`, // Try with larger verse range
        `${book} ${chapter}:1`,     // Try with just first verse
      ];

      for (const altQuery of alternativeQueries) {
        try {
          console.log('Trying alternative query:', altQuery);
          const altResponse = await this.makeRequest('/passage/audio/', {
            q: altQuery,
            include_passage_references: 'false'
          });

          if (altResponse.audio && altResponse.audio.length > 0) {
            const audioUrl = altResponse.audio[0];
            console.log('Max McLean audio URL found with alternative query:', audioUrl);
            return audioUrl;
          }
        } catch (altError) {
          console.log('Alternative query failed:', altQuery, altError);
          continue;
        }
      }

      console.log('No Max McLean audio available for:', query);
      return null;
    } catch (error) {
      console.error('Error fetching ESV audio:', error);
      return null;
    }
  }

  async getPassageText(book: string, chapter: number): Promise<string | null> {
    try {
      const query = `${book} ${chapter}`;
      
      const response = await this.makeRequest('/passage/text/', {
        q: query,
        include_passage_references: 'false',
        include_verse_numbers: 'false',
        include_footnotes: 'false'
      });

      if (response.passages && response.passages.length > 0) {
        return response.passages[0];
      }

      return null;
    } catch (error) {
      console.error('Error fetching ESV passage:', error);
      return null;
    }
  }

  // Enhanced method to convert Bible book names to ESV format
  getESVBookName(bookName: string): string {
    const bookMappings: Record<string, string> = {
      // Old Testament
      'Genesis': 'Genesis',
      'Exodus': 'Exodus',
      'Leviticus': 'Leviticus',
      'Numbers': 'Numbers',
      'Deuteronomy': 'Deuteronomy',
      'Joshua': 'Joshua',
      'Judges': 'Judges',
      'Ruth': 'Ruth',
      '1 Samuel': '1 Samuel',
      '2 Samuel': '2 Samuel',
      '1 Kings': '1 Kings',
      '2 Kings': '2 Kings',
      '1 Chronicles': '1 Chronicles',
      '2 Chronicles': '2 Chronicles',
      'Ezra': 'Ezra',
      'Nehemiah': 'Nehemiah',
      'Esther': 'Esther',
      'Job': 'Job',
      'Psalms': 'Psalm',
      'Psalm': 'Psalm',
      'Proverbs': 'Proverbs',
      'Ecclesiastes': 'Ecclesiastes',
      'Song of Solomon': 'Song of Solomon',
      'Song of Songs': 'Song of Solomon',
      'Isaiah': 'Isaiah',
      'Jeremiah': 'Jeremiah',
      'Lamentations': 'Lamentations',
      'Ezekiel': 'Ezekiel',
      'Daniel': 'Daniel',
      'Hosea': 'Hosea',
      'Joel': 'Joel',
      'Amos': 'Amos',
      'Obadiah': 'Obadiah',
      'Jonah': 'Jonah',
      'Micah': 'Micah',
      'Nahum': 'Nahum',
      'Habakkuk': 'Habakkuk',
      'Zephaniah': 'Zephaniah',
      'Haggai': 'Haggai',
      'Zechariah': 'Zechariah',
      'Malachi': 'Malachi',
      
      // New Testament
      'Matthew': 'Matthew',
      'Mark': 'Mark',
      'Luke': 'Luke',
      'John': 'John',
      'Acts': 'Acts',
      'Romans': 'Romans',
      '1 Corinthians': '1 Corinthians',
      '2 Corinthians': '2 Corinthians',
      'Galatians': 'Galatians',
      'Ephesians': 'Ephesians',
      'Philippians': 'Philippians',
      'Colossians': 'Colossians',
      '1 Thessalonians': '1 Thessalonians',
      '2 Thessalonians': '2 Thessalonians',
      '1 Timothy': '1 Timothy',
      '2 Timothy': '2 Timothy',
      'Titus': 'Titus',
      'Philemon': 'Philemon',
      'Hebrews': 'Hebrews',
      'James': 'James',
      '1 Peter': '1 Peter',
      '2 Peter': '2 Peter',
      '1 John': '1 John',
      '2 John': '2 John',
      '3 John': '3 John',
      'Jude': 'Jude',
      'Revelation': 'Revelation'
    };

    const mappedName = bookMappings[bookName];
    console.log(`Mapping book name: "${bookName}" -> "${mappedName}"`);
    return mappedName || bookName;
  }

  // Test method to check if Max McLean audio is available for a chapter
  async testAudioAvailability(book: string, chapter: number): Promise<boolean> {
    try {
      const audioUrl = await this.getAudioForChapter(book, chapter);
      return !!audioUrl;
    } catch (error) {
      console.error('Error testing audio availability:', error);
      return false;
    }
  }

  // Test method to verify API key and connectivity
  async testApiConnection(): Promise<boolean> {
    try {
      console.log('Testing ESV API connection...');
      const response = await this.makeRequest('/passage/text/', {
        q: 'John 3:16',
        include_passage_references: 'false',
        include_verse_numbers: 'false',
        include_footnotes: 'false'
      });
      
      console.log('API connection test successful:', response);
      return true;
    } catch (error) {
      console.error('ESV API connection test failed:', error);
      return false;
    }
  }

  // Test method to check if API key has audio access
  async testAudioAccess(): Promise<boolean> {
    try {
      console.log('Testing ESV API audio access...');
      const response = await this.makeRequest('/passage/audio/', {
        q: 'John 3:16',
        include_passage_references: 'false'
      });
      
      console.log('Audio access test response:', response);
      return !!(response.audio && response.audio.length > 0);
    } catch (error) {
      console.error('ESV API audio access test failed:', error);
      return false;
    }
  }
}

export const esvApi = new ESVAPI(); 