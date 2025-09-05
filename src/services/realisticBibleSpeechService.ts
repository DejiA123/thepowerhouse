import { enhancedIPhoneVoiceService, EnhancedIPhoneVoiceSettings } from './enhancedIPhoneVoiceService';

export interface RealisticSpeechSettings extends EnhancedIPhoneVoiceSettings {
  emotionalIntonation: boolean;
  breathSimulation: boolean;
  contextAwareEmphasis: boolean;
  naturalRhythm: boolean;
  prosodyPatterns: boolean;
  verseByVerseBreathing: boolean;
}

export interface BibleContext {
  book: string;
  chapter: number;
  textType: 'narrative' | 'dialogue' | 'poetry' | 'law' | 'prophecy' | 'prayer' | 'parable';
  isQuote: boolean;
  isQuestion: boolean;
  isExclamation: boolean;
  isEmphatic: boolean;
}

export class RealisticBibleSpeechService {
  private static instance: RealisticBibleSpeechService;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isIOS: boolean;
  private enhancedService: typeof enhancedIPhoneVoiceService;
  // iOS queue playback state
  private utteranceQueue: Array<{ text: string; pauseMs: number }> = [];
  private currentQueueIndex: number = 0;
  private pauseTimer: number | null = null;
  private isPaused: boolean = false;
  private currentSettings: RealisticSpeechSettings | null = null;
  private currentBook: string = '';
  private currentChapter: number = 0;
  private currentOnEnd?: () => void;
  private currentOnError?: (error: any) => void;

  // Biblical text patterns for context recognition
  private readonly QUESTION_PATTERNS = [
    /\bwho\s+/i, /\bwhat\s+/i, /\bwhere\s+/i, /\bwhen\s+/i, /\bwhy\s+/i, /\bhow\s+/i,
    /\bshall\s+/i, /\bwill\s+/i, /\bcan\s+/i, /\bcould\s+/i, /\bshould\s+/i,
    /\bdo\s+you/i, /\bdoes\s+/i, /\bdid\s+/i, /\bis\s+it/i, /\bare\s+you/i
  ];

  private readonly EMPHATIC_PATTERNS = [
    /\bbehold\b/i, /\bverily\b/i, /\btruly\b/i, /\bamen\b/i, /\bhallelujah\b/i,
    /\bglory\b/i, /\bholy\b/i, /\bmighty\b/i, /\beternal\b/i, /\balmighty\b/i,
    /\bsalvation\b/i, /\bredemption\b/i, /\bresurrection\b/i
  ];

  private readonly DIALOGUE_PATTERNS = [
    /said\s+/i, /spoke\s+/i, /cried\s+/i, /called\s+/i, /answered\s+/i,
    /replied\s+/i, /declared\s+/i, /proclaimed\s+/i
  ];

  private readonly POETRY_BOOKS = [
    'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Songs', 'Job'
  ];

  private readonly PROPHETIC_BOOKS = [
    'Isaiah', 'Jeremiah', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
    'Haggai', 'Zechariah', 'Malachi'
  ];

  constructor() {
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.enhancedService = enhancedIPhoneVoiceService;
  }

  static getInstance(): RealisticBibleSpeechService {
    if (!RealisticBibleSpeechService.instance) {
      RealisticBibleSpeechService.instance = new RealisticBibleSpeechService();
    }
    return RealisticBibleSpeechService.instance;
  }

  /**
   * Analyze text to determine biblical context and reading style
   */
  private analyzeBibleContext(text: string, book: string, chapter: number): BibleContext {
    const isPoetry = this.POETRY_BOOKS.includes(book);
    const isProphecy = this.PROPHETIC_BOOKS.includes(book);
    
    let textType: BibleContext['textType'] = 'narrative';
    
    if (isPoetry) textType = 'poetry';
    else if (isProphecy) textType = 'prophecy';
    else if (this.DIALOGUE_PATTERNS.some(pattern => pattern.test(text))) textType = 'dialogue';
    else if (book === 'Leviticus' || book === 'Deuteronomy') textType = 'law';
    else if (text.toLowerCase().includes('parable')) textType = 'parable';
    else if (text.toLowerCase().includes('pray') || book === 'Psalms') textType = 'prayer';

    const isQuote = /["']/g.test(text);
    const isQuestion = /\?/.test(text) || this.QUESTION_PATTERNS.some(pattern => pattern.test(text));
    const isExclamation = /!/.test(text);
    const isEmphatic = this.EMPHATIC_PATTERNS.some(pattern => pattern.test(text));

    return {
      book,
      chapter,
      textType,
      isQuote,
      isQuestion,
      isExclamation,
      isEmphatic
    };
  }

  /**
   * Process text with realistic speech patterns including natural punctuation pauses
   */
  public processForRealisticSpeech(text: string, book: string, chapter: number, settings: RealisticSpeechSettings): string {
    console.log('🎭 Processing text for realistic speech with natural pauses:', { book, chapter });
    
    let processedText = text;

    // Use punctuation processing to add natural pauses that work well with TTS
    if (settings.punctuationPauses) {
      if (this.isIOS) {
        // iPhone: preserve punctuation and only normalize whitespace
        processedText = processedText.replace(/\s+/g, ' ').trim();
      } else {
        // Non-iOS: gentle ellipsis-based pauses
        processedText = processedText
          // Add natural pauses after sentence endings (periods, exclamation, question marks)
          .replace(/([.!?])\s*/g, '$1... ')
          // Add medium pauses after semicolons and colons
          .replace(/([;:])\s*/g, '$1.. ')
          // Add short pauses after commas for natural flow
          .replace(/([,])\s*/g, '$1. ')
          // Add pauses after dashes for better rhythm
          .replace(/([-–—])\s*/g, '$1. ')
          // Add gentle pauses around parentheses and quotes
          .replace(/\(\s*/g, '. (')
          .replace(/\s*\)/g, ') .')
          .replace(/"\s*/g, '. "')
          .replace(/\s*"/g, '" .')
          // Clean up excessive dots and normalize spacing
          .replace(/\.{4,}/g, '...') // Limit to max 3 dots
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    console.log('🎭 Speech processing with natural pauses complete:', {
      originalLength: text.length,
      processedLength: processedText.length,
      punctuationPausesEnabled: settings.punctuationPauses
    });

    return processedText;
  }

  /**
   * Add breathing patterns between verses (verse numbers indicate new verses)
   */
  private addVerseBreathing(text: string): string {
    // Add gentle breath before verse numbers
    return text.replace(/(\d+)\s+/g, (match, verseNum) => {
      if (parseInt(verseNum) > 1) {
        return ` <breath/> ${verseNum} `;
      }
      return match;
    });
  }

  /**
   * Add emotional intonation based on biblical context
   */
  private addEmotionalIntonation(text: string, context: BibleContext): string {
    let processedText = text;

    // Reverent tone for prayers and worship
    if (context.textType === 'prayer' || context.book === 'Psalms') {
      processedText = processedText.replace(/\b(lord|god|father|almighty|holy)\b/gi, '<reverent>$1</reverent>');
    }

    // Joyful tone for praise passages
    const joyPatterns = /\b(hallelujah|praise|rejoice|celebrate|glory|blessed)\b/gi;
    processedText = processedText.replace(joyPatterns, '<joyful>$1</joyful>');

    // Solemn tone for serious warnings or judgments
    const solemnPatterns = /\b(woe|judgment|condemnation|wrath|punishment|curse)\b/gi;
    processedText = processedText.replace(solemnPatterns, '<solemn>$1</solemn>');

    // Gentle tone for comfort passages
    const comfortPatterns = /\b(comfort|peace|rest|gentle|merciful|compassion|love)\b/gi;
    processedText = processedText.replace(comfortPatterns, '<gentle>$1</gentle>');

    return processedText;
  }

  /**
   * Add contextual emphasis for different types of biblical text
   */
  private addContextualEmphasis(text: string, context: BibleContext): string {
    let processedText = text;

    // Emphasize divine names and titles
    const divineNames = /\b(lord|god|jesus|christ|holy spirit|almighty|creator|savior|redeemer)\b/gi;
    processedText = processedText.replace(divineNames, '<emphasis level="strong">$1</emphasis>');

    // Emphasize key theological terms
    const theologicalTerms = /\b(salvation|redemption|forgiveness|eternal life|kingdom of heaven|resurrection)\b/gi;
    processedText = processedText.replace(theologicalTerms, '<emphasis level="moderate">$1</emphasis>');

    // Special emphasis for "verily" and "behold"
    processedText = processedText.replace(/\b(verily|truly|behold)\b/gi, '<emphasis level="strong">$1</emphasis>');

    // Gentle emphasis for direct quotes from Jesus
    if (context.isQuote && (context.book.includes('Matthew') || context.book.includes('Mark') || 
                           context.book.includes('Luke') || context.book.includes('John'))) {
      processedText = `<gentle_authority>${processedText}</gentle_authority>`;
    }

    return processedText;
  }

  /**
   * Add natural rhythm variations based on text type
   */
  private addNaturalRhythm(text: string, context: BibleContext): string {
    let processedText = text;

    switch (context.textType) {
      case 'poetry':
        // Add rhythm breaks for poetic structure
        processedText = processedText.replace(/,\s*/g, ', <rhythm_pause/> ');
        processedText = processedText.replace(/;\s*/g, '; <rhythm_pause_long/> ');
        break;

      case 'narrative':
        // Flowing rhythm for storytelling
        processedText = processedText.replace(/\.\s+And\s+/gi, '. <flow_pause/> And ');
        processedText = processedText.replace(/\.\s+Then\s+/gi, '. <flow_pause/> Then ');
        break;

      case 'dialogue':
        // Conversational rhythm
        processedText = processedText.replace(/said\s+/gi, 'said <speech_pause/> ');
        processedText = processedText.replace(/replied\s+/gi, 'replied <speech_pause/> ');
        break;

      case 'prophecy':
        // Authoritative, measured rhythm
        processedText = processedText.replace(/thus saith/gi, '<authority_pause/>thus saith<authority_pause/>');
        processedText = processedText.replace(/declares the lord/gi, '<authority_pause/>declares the Lord<authority_pause/>');
        break;
    }

    return processedText;
  }

  /**
   * Add prosody patterns for questions, exclamations, and special passages
   */
  private addProsodyPatterns(text: string, context: BibleContext): string {
    let processedText = text;

    // Rising intonation for questions
    if (context.isQuestion) {
      processedText = processedText.replace(/\?/g, '<rising_intonation>?</rising_intonation>');
    }

    // Strong intonation for exclamations
    if (context.isExclamation) {
      processedText = processedText.replace(/!/g, '<strong_intonation>!</strong_intonation>');
    }

    // Special prosody for lists (often found in genealogies, laws)
    processedText = processedText.replace(/,\s+and\s+/gi, ', <list_pause/> and ');

    // Dramatic pauses before important revelations
    processedText = processedText.replace(/\b(and lo|and behold|suddenly)\b/gi, '<dramatic_pause/>$1<dramatic_pause/>');

    return processedText;
  }

  /**
   * Add realistic breath simulation at natural breaking points
   */
  private addBreathSimulation(text: string, context: BibleContext): string {
    let processedText = text;

    // Long passages need breath breaks
    const sentences = processedText.split(/[.!?]/);
    if (sentences.length > 3) {
      // Add breath after every 2-3 sentences
      processedText = processedText.replace(/([.!?])\s*([A-Z])/g, (match, punct, nextChar, offset) => {
        const sentenceCount = text.substring(0, offset).split(/[.!?]/).length;
        if (sentenceCount % 3 === 0) {
          return `${punct} <natural_breath/> ${nextChar}`;
        }
        return match;
      });
    }

    // Breath before important transitions
    processedText = processedText.replace(/\b(but|however|therefore|moreover|furthermore)\b/gi, '<transition_breath/>$1');

    // Breath before direct speech
    processedText = processedText.replace(/:\s*"/g, ': <speech_breath/> "');

    return processedText;
  }

  /**
   * Convert markup to clean iOS-compatible speech patterns
   */
  private convertMarkupToiOSSpeech(text: string): string {
    let processedText = text;

    // Remove all markup tags completely - no extra sounds or characters
    const markupToRemove = [
      '<breath/>', '<natural_breath/>', '<speech_breath/>', '<transition_breath/>',
      '<rhythm_pause/>', '<rhythm_pause_long/>', '<flow_pause/>', '<speech_pause/>',
      '<authority_pause/>', '<dramatic_pause/>', '<list_pause/>',
      '<rising_intonation>', '</rising_intonation>',
      '<strong_intonation>', '</strong_intonation>',
      '<reverent>', '</reverent>',
      '<joyful>', '</joyful>',
      '<solemn>', '</solemn>',
      '<gentle>', '</gentle>',
      '<emphasis level="strong">', '<emphasis level="moderate">', '</emphasis>',
      '<gentle_authority>', '</gentle_authority>'
    ];

    // Remove all markup tags completely
    markupToRemove.forEach(markup => {
      const escapedMarkup = markup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processedText = processedText.replace(new RegExp(escapedMarkup, 'g'), '');
    });

    // Remove any remaining markup-like patterns
    processedText = processedText.replace(/<[^>]*>/g, '');

    // Preserve original punctuation; don't remove periods entirely here

    // Clean up extra spaces and normalize
    processedText = processedText.replace(/\s+/g, ' ').trim();

    console.log('🧹 Cleaned text for speech:', {
      originalLength: text.length,
      cleanedLength: processedText.length,
      removedCharacters: text.length - processedText.length
    });

    return processedText;
  }

  /**
   * Play Bible text with realistic speech patterns
   */
  public async playRealisticBibleSpeech(
    text: string,
    book: string,
    chapter: number,
    settings: RealisticSpeechSettings,
    onEnd?: () => void,
    onError?: (error: any) => void
  ): Promise<void> {
    try {
      console.log('🎭 Starting realistic Bible speech:', { book, chapter, settings });

      // Process text for maximum realism
      const processedText = this.processForRealisticSpeech(text, book, chapter, settings);
      const iOSCompatibleText = this.convertMarkupToiOSSpeech(processedText);

      if (this.isIOS) {
        // Queue-based iOS playback for better punctuation pauses
        this.currentSettings = settings;
        this.currentBook = book;
        this.currentChapter = chapter;
        this.currentOnEnd = onEnd;
        this.currentOnError = onError;
        this.utteranceQueue = this.splitTextIntoPunctuatedChunks(iOSCompatibleText);
        this.currentQueueIndex = 0;
        this.isPaused = false;
        this.speakNextChunk();
      } else {
        // Non-iOS single-utterance playback
        const bestVoice = this.enhancedService.getBestQualityVoice();
        const utterance = new SpeechSynthesisUtterance(iOSCompatibleText);
        if (bestVoice) {
          utterance.voice = bestVoice;
          console.log(`🎭 Using realistic voice: ${bestVoice.name}`);
        }
        const adjustedRateNonIOS = Math.min(1.2, Math.max(0.85, this.getContextualRate(settings.rate, book, chapter)));
        const adjustedPitchNonIOS = Math.min(1.7, Math.max(0.9, this.getContextualPitch(settings.pitch, book, chapter)));
        utterance.pitch = adjustedPitchNonIOS;
        utterance.rate = adjustedRateNonIOS;
        utterance.volume = settings.volume;
        utterance.lang = 'en-US';
        utterance.onstart = () => {
          console.log('🎭 Realistic Bible speech started');
        };
        utterance.onend = () => {
          console.log('🎭 Realistic Bible speech ended');
          this.currentUtterance = null;
          onEnd?.();
        };
        utterance.onerror = (event) => {
          console.error('🎭 Realistic Bible speech error:', event);
          this.currentUtterance = null;
          onError?.(event);
        };
        this.currentUtterance = utterance;
        speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error('🎭 Realistic Bible Speech Service error:', error);
      onError?.(error);
    }
  }

  private speakNextChunk(): void {
    if (this.isPaused) return;
    if (this.currentQueueIndex >= this.utteranceQueue.length) {
      this.currentUtterance = null;
      this.currentOnEnd?.();
      return;
    }

    const bestVoice = this.enhancedService.getBestQualityVoice();
    const settings = this.currentSettings!;
    const { text, pauseMs } = this.utteranceQueue[this.currentQueueIndex];
    const utter = new SpeechSynthesisUtterance(text);
    if (bestVoice) utter.voice = bestVoice;
    const adjustedRate = Math.min(1.2, Math.max(0.85, this.getContextualRate(settings.rate, this.currentBook, this.currentChapter)));
    const adjustedPitch = Math.min(1.7, Math.max(0.9, this.getContextualPitch(settings.pitch, this.currentBook, this.currentChapter)));
    utter.pitch = adjustedPitch;
    utter.rate = adjustedRate;
    utter.volume = settings.volume;
    utter.lang = 'en-US';

    utter.onend = () => {
      this.currentUtterance = null;
      if (this.isPaused) return;
      this.currentQueueIndex += 1;
      this.pauseTimer = window.setTimeout(() => {
        this.pauseTimer = null;
        this.speakNextChunk();
      }, pauseMs);
    };

    utter.onerror = (event) => {
      this.currentUtterance = null;
      this.currentOnError?.(event);
    };

    this.currentUtterance = utter;
    speechSynthesis.speak(utter);
  }

  private splitTextIntoPunctuatedChunks(text: string): Array<{ text: string; pauseMs: number }> {
    const pauseMap: Record<string, number> = {
      '.': 650,
      '!': 700,
      '?': 700,
      ';': 500,
      ':': 500,
      ',': 280,
      '-': 380,
      '—': 380,
      '–': 380
    };

    const segments: Array<{ text: string; pauseMs: number }> = [];
    const regex = /[^.,;:!?—–-]+[.,;:!?—–-]?\s*/g;
    const matches = text.match(regex) || [text];
    for (const segment of matches) {
      const trimmed = segment.trim();
      if (!trimmed) continue;
      const lastChar = trimmed.charAt(trimmed.length - 1);
      const pauseMs = pauseMap[lastChar] ?? 80;
      segments.push({ text: trimmed, pauseMs });
    }
    return segments;
  }

  /**
   * Get contextual pitch based on book and chapter content
   */
  private getContextualPitch(basePitch: number, book: string, chapter: number): number {
    let contextualPitch = basePitch;

    // Slightly higher pitch for joyful books
    if (['Psalms'].includes(book) && [100, 150, 98, 103].includes(chapter)) {
      contextualPitch += 0.1;
    }

    // Slightly lower pitch for solemn passages
    if (['Ecclesiastes', 'Lamentations'].includes(book)) {
      contextualPitch -= 0.1;
    }

    // Moderate pitch for narrative books
    if (['Genesis', 'Exodus', 'Acts'].includes(book)) {
      contextualPitch += 0.05;
    }

    return Math.max(0.1, Math.min(2.0, contextualPitch));
  }

  /**
   * Get contextual rate based on book and chapter content
   */
  private getContextualRate(baseRate: number, book: string, chapter: number): number {
    let contextualRate = baseRate;

    // Slightly slower for complex theological passages
    if (['Romans', 'Hebrews', 'Ephesians'].includes(book)) {
      contextualRate -= 0.05;
    }

    // Slightly faster for genealogies and lists
    if ((book === 'Genesis' && [5, 10].includes(chapter)) ||
        (book === 'Numbers' && [1, 26].includes(chapter))) {
      contextualRate += 0.1;
    }

    // Measured pace for prophecies
    if (this.PROPHETIC_BOOKS.includes(book)) {
      contextualRate -= 0.02;
    }

    return Math.max(0.1, Math.min(10.0, contextualRate));
  }

  /**
   * Stop current realistic speech
   */
  public stop(): void {
    if (this.pauseTimer !== null) {
      window.clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    this.isPaused = false;
    this.utteranceQueue = [];
    this.currentQueueIndex = 0;
    this.currentSettings = null;
    this.currentBook = '';
    this.currentChapter = 0;
    if (speechSynthesis.speaking || speechSynthesis.paused) {
      speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    console.log('🎭 Realistic Bible speech stopped');
  }

  /**
   * Pause current realistic speech
   */
  public pause(): void {
    this.isPaused = true;
    if (this.pauseTimer !== null) {
      window.clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
    }
    console.log('🎭 Realistic Bible speech paused');
  }

  /**
   * Resume paused realistic speech
   */
  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      console.log('🎭 Realistic Bible speech resumed');
      return;
    }
    if (!speechSynthesis.speaking && this.pauseTimer === null && this.utteranceQueue.length > 0) {
      this.speakNextChunk();
    }
  }

  /**
   * Check if service is available
   */
  public isSupported(): boolean {
    return this.isIOS && 'speechSynthesis' in window;
  }
}

// Export singleton instance
export const realisticBibleSpeechService = RealisticBibleSpeechService.getInstance();
