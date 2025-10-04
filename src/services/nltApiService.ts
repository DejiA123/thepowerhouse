
import { BibleChapter } from '@/types/bible';

const NLT_API_KEY = '4fe3e841-91ac-4b8a-9e84-70a0fe2870c5';
const NLT_API_BASE_URL = 'https://api.nlt.to/api';

interface NltVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

// This function fetches a chapter from the NLT API and transforms it into our standard BibleChapter format.
const getChapter = async (book: string, chapter: number): Promise<BibleChapter> => {
  try {
    const response = await fetch(`${NLT_API_BASE_URL}/passages?ref=${book}+${chapter}&key=${NLT_API_KEY}&format=json`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NLT API request failed:', errorText);
      throw new Error(`Failed to fetch chapter from NLT API: ${response.statusText}`);
    }

    const data: NltVerse[] = await response.json();

    if (!data || data.length === 0) {
      throw new Error('NLT API returned no content for the chapter.');
    }

    // The app expects each verse to be in a specific format, so we map the NLT response to match it.
    const formattedVerses = data.map(verse => ({
      type: 'verse',
      number: verse.verse,
      content: [verse.text],
    }));

    return {
      content: formattedVerses,
      chapter: data[0].chapter.toString(),
      book: data[0].book,
      version: 'nlt',
    };
  } catch (error) {
    console.error('Error in getChapter (NLT API Service):', error);
    throw error;
  }
};

export const nltApiService = {
  getChapter,
};
