// Unified Bible type definitions
export interface BibleVersion {
  id: string;
  version: string;
  name: string;
  abbreviation: string;
  language: string; // Simplified to string for consistency
  source?: 'bible-brain' | 'fallback' | 'api-bible' | 'esv';
}

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: string;
  text: string;
  reference?: string;
  version?: string;
}

export interface BibleChapter {
  book: string;
  chapter: number;
  verses: BibleVerse[];
  text?: string;
  reference?: string;
  version?: string;
}

export interface BibleAudioResponse {
  audioUrl: string | null;
  book: string;
  chapter: number;
  version: string;
}