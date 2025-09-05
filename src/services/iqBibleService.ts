import { supabase } from "@/integrations/supabase/client";

const IQ_BIBLE_BOOK_ABBREVIATIONS: Record<string, string> = {
  genesis: "GEN", exodus: "EXO", leviticus: "LEV", numbers: "NUM", deuteronomy: "DEU", joshua: "JOS", judges: "JDG", ruth: "RUT", "1-samuel": "1SA", "2-samuel": "2SA", "1-kings": "1KI", "2-kings": "2KI", "1-chronicles": "1CH", "2-chronicles": "2CH", ezra: "EZR", nehemiah: "NEH", esther: "EST", job: "JOB", psalms: "PSA", proverbs: "PRO", ecclesiastes: "ECC", "song-of-solomon": "SNG", isaiah: "ISA", jeremiah: "JER", lamentations: "LAM", ezekiel: "EZK", daniel: "DAN", hosea: "HOS", joel: "JOL", amos: "AMO", obadiah: "OBA", jonah: "JON", micah: "MIC", nahum: "NAM", habakkuk: "HAB", zephaniah: "ZEP", haggai: "HAG", zechariah: "ZEC", malachi: "MAL", matthew: "MAT", mark: "MRK", luke: "LUK", john: "JHN", acts: "ACT", romans: "ROM", "1-corinthians": "1CO", "2-corinthians": "2CO", galatians: "GAL", ephesians: "EPH", philippians: "PHP", colossians: "COL", "1-thessalonians": "1TH", "2-thessalonians": "2TH", "1-timothy": "1TI", "2-timothy": "2TI", titus: "TIT", philemon: "PHM", hebrews: "HEB", james: "JAS", "1-peter": "1PE", "2-peter": "2PE", "1-john": "1JN", "2-john": "2JN", "3-john": "3JN", jude: "JUD", revelation: "REV"
};

export class IQBibleService {
  async getAudioForChapter(book: string, chapter: number, version: string = 'KJV'): Promise<string | {error: string}> {
    try {
      // Map book to IQ abbreviation
      const abbr = IQ_BIBLE_BOOK_ABBREVIATIONS[book.toLowerCase()];
      if (!abbr) {
        const msg = `IQ Bible abbreviation not found for book: ${book}`;
        console.error(msg);
        return { error: msg };
      }
      
      // Call our secure edge function instead of direct API call
      const { data, error } = await supabase.functions.invoke('bible-api-proxy', {
        body: { book: abbr, chapter, version }
      });
      
      if (error) {
        console.error('Error calling bible-api-proxy:', error);
        return { error: error.message || 'Failed to fetch audio' };
      }
      
      if (data?.audioUrl) {
        return data.audioUrl;
      }
      
      if (data?.error) {
        return { error: data.error };
      }
      
      return { error: 'No audio URL found in response' };
    } catch (error) {
      console.error('Error fetching IQ Bible audio:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
}

export const iqBibleService = new IQBibleService(); 