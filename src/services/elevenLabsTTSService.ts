import { supabase } from '@/integrations/supabase/client';

export interface ElevenLabsVoice {
  id: string;
  name: string;
  category: string;
}

// Top quality voices for Bible reading
export const BIBLE_VOICES: ElevenLabsVoice[] = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', category: 'Female' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', category: 'Male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'Female' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'Male' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', category: 'Male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'Male' },
];

export class ElevenLabsTTSService {
  private static instance: ElevenLabsTTSService;
  private cache = new Map<string, string>();

  private constructor() {}

  static getInstance(): ElevenLabsTTSService {
    if (!ElevenLabsTTSService.instance) {
      ElevenLabsTTSService.instance = new ElevenLabsTTSService();
    }
    return ElevenLabsTTSService.instance;
  }

  /**
   * Generate audio URL for text using ElevenLabs
   */
  async generateAudio(text: string, voiceId: string = '9BWtsMINqrJLrRacOk9x'): Promise<string | null> {
    try {
      console.log(`🎵 ElevenLabs: Generating audio for ${text.length} characters`);
      
      const cacheKey = `${voiceId}-${this.hashText(text)}`;
      if (this.cache.has(cacheKey)) {
        console.log('🎵 ElevenLabs: Using cached audio URL');
        return this.cache.get(cacheKey)!;
      }

      // Call our Supabase edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: {
          text,
          voice_id: voiceId
        }
      });

      if (error) {
        console.error('🎵 ElevenLabs: Error from edge function:', error);
        return null;
      }

      // The edge function returns audio data directly
      if (data instanceof ArrayBuffer) {
        // Convert ArrayBuffer to blob URL
        const audioBlob = new Blob([data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.cache.set(cacheKey, audioUrl);
        console.log('✅ ElevenLabs: Audio generated successfully');
        return audioUrl;
      }

      console.error('🎵 ElevenLabs: Unexpected response format');
      return null;
    } catch (error) {
      console.error('🎵 ElevenLabs: Error generating audio:', error);
      return null;
    }
  }

  /**
   * Generate audio for Bible chapter with better formatting
   */
  async generateBibleAudio(book: string, chapter: number, text: string, voiceId?: string): Promise<string | null> {
    try {
      // Format text for better Bible reading
      const formattedText = this.formatBibleText(book, chapter, text);
      
      // Use a male voice for Bible reading if not specified
      const selectedVoiceId = voiceId || 'onwK4e9ZLuTAKqWW03F9'; // Daniel - good for Bible reading
      
      return await this.generateAudio(formattedText, selectedVoiceId);
    } catch (error) {
      console.error('🎵 ElevenLabs: Error generating Bible audio:', error);
      return null;
    }
  }

  /**
   * Format Bible text for better TTS reading
   */
  private formatBibleText(book: string, chapter: number, text: string): string {
    // Start with book and chapter announcement
    const formattedText = `${book.replace(/-/g, ' ')} Chapter ${chapter}. `;
    
    // Add natural pauses and formatting
    const processedText = text
      // Add pauses after verse numbers (if they exist)
      .replace(/(\d+)\s+/g, '$1. ')
      // Add natural pauses after sentence endings
      .replace(/([.!?])\s*/g, '$1... ')
      // Add medium pauses after semicolons and colons
      .replace(/([;:])\s*/g, '$1.. ')
      // Add short pauses after commas
      .replace(/([,])\s*/g, '$1. ')
      // Clean up excessive dots
      .replace(/\.{4,}/g, '...')
      .replace(/\s+/g, ' ')
      .trim();

    return formattedText + processedText;
  }

  /**
   * Simple hash function for caching
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    // Revoke object URLs to prevent memory leaks
    for (const url of this.cache.values()) {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    this.cache.clear();
    console.log('🎵 ElevenLabs: Cache cleared');
  }

  /**
   * Get available Bible voices
   */
  getBibleVoices(): ElevenLabsVoice[] {
    return BIBLE_VOICES;
  }
}

export const elevenLabsTTSService = ElevenLabsTTSService.getInstance();