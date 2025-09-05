import { supabase } from '@/integrations/supabase/client';

export interface OpenAIVoice {
  id: string;
  name: string;
  description: string;
}

// Available OpenAI voices - all free with API key
export const OPENAI_VOICES: OpenAIVoice[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
  { id: 'echo', name: 'Echo', description: 'Male voice with character' },
  { id: 'fable', name: 'Fable', description: 'British accent, storytelling' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative male voice' },
  { id: 'nova', name: 'Nova', description: 'Young, energetic female voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft, gentle female voice' },
];

export class OpenAITTSService {
  private static instance: OpenAITTSService;
  private cache = new Map<string, string>();

  private constructor() {}

  static getInstance(): OpenAITTSService {
    if (!OpenAITTSService.instance) {
      OpenAITTSService.instance = new OpenAITTSService();
    }
    return OpenAITTSService.instance;
  }

  /**
   * Generate audio URL for text using OpenAI TTS (much cheaper than ElevenLabs)
   */
  async generateAudio(text: string, voice: string = 'onyx'): Promise<string | null> {
    try {
      console.log(`🎵 OpenAI TTS: Generating audio for ${text.length} characters with voice: ${voice}`);
      
      const cacheKey = `${voice}-${this.hashText(text)}`;
      if (this.cache.has(cacheKey)) {
        console.log('🎵 OpenAI TTS: Using cached audio URL');
        return this.cache.get(cacheKey)!;
      }

      // Call our Supabase edge function
      const { data, error } = await supabase.functions.invoke('openai-tts', {
        body: {
          text,
          voice
        }
      });

      if (error) {
        console.error('🎵 OpenAI TTS: Error from edge function:', error);
        return null;
      }

      // The edge function returns audio data directly
      if (data instanceof ArrayBuffer) {
        // Convert ArrayBuffer to blob URL
        const audioBlob = new Blob([data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.cache.set(cacheKey, audioUrl);
        console.log('✅ OpenAI TTS: Audio generated successfully');
        return audioUrl;
      }

      console.error('🎵 OpenAI TTS: Unexpected response format');
      return null;
    } catch (error) {
      console.error('🎵 OpenAI TTS: Error generating audio:', error);
      return null;
    }
  }

  /**
   * Generate audio for Bible chapter with better formatting
   */
  async generateBibleAudio(book: string, chapter: number, text: string, voice?: string): Promise<string | null> {
    try {
      // Format text for better Bible reading
      const formattedText = this.formatBibleText(book, chapter, text);
      
      // Use a deep, authoritative voice for Bible reading
      const selectedVoice = voice || 'onyx'; // Deep, authoritative male voice
      
      return await this.generateAudio(formattedText, selectedVoice);
    } catch (error) {
      console.error('🎵 OpenAI TTS: Error generating Bible audio:', error);
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
    console.log('🎵 OpenAI TTS: Cache cleared');
  }

  /**
   * Get available voices
   */
  getVoices(): OpenAIVoice[] {
    return OPENAI_VOICES;
  }
}

export const openaiTTSService = OpenAITTSService.getInstance();