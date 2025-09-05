import { enhancedTTSService } from './enhancedTTSService';

export interface EnhancedIPhoneVoiceSettings {
  pitch: number;
  rate: number;
  volume: number;
  voice?: SpeechSynthesisVoice;
  useEnhancedProcessing: boolean;
  punctuationPauses: boolean;
}

export class EnhancedIPhoneVoiceService {
  private static instance: EnhancedIPhoneVoiceService;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isIOS: boolean;
  private enhancedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.loadEnhancedVoices();
  }

  static getInstance(): EnhancedIPhoneVoiceService {
    if (!EnhancedIPhoneVoiceService.instance) {
      EnhancedIPhoneVoiceService.instance = new EnhancedIPhoneVoiceService();
    }
    return EnhancedIPhoneVoiceService.instance;
  }

  private async loadEnhancedVoices(): Promise<void> {
    // Wait for voices to be loaded
    return new Promise((resolve) => {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        this.enhancedVoices = voices;
        console.log('🎤 Enhanced iPhone Voice Service: Loaded voices:', voices.length);
        resolve();
      };

      if (speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
      }
    });
  }

  /**
   * Get the highest quality voice available for iPhone
   */
  public getBestQualityVoice(): SpeechSynthesisVoice | null {
    if (!this.isIOS) return null;

    const voices = this.enhancedVoices.filter(v => v.lang.startsWith('en-'));
    
    // Priority order for highest quality iPhone voices
    const highQualityVoicePriority = [
      // Enhanced/Premium voices (highest quality)
      'Daniel (Enhanced)',     // British male - Premium quality
      'Alex (Enhanced)',       // US male - Premium quality
      'Samantha (Enhanced)',   // US female - Premium quality
      'Karen (Enhanced)',      // Australian female - Premium quality
      'Serena (Enhanced)',     // British female - Premium quality
      
      // Neural/High-definition voices
      'Daniel (Premium)',
      'Alex (Premium)',
      'Samantha (Premium)',
      
      // Standard enhanced voices
      'Daniel',               // British male - Good quality
      'Alex',                 // US male - Good quality
      'Samantha',             // US female - Good quality
      'Karen',                // Australian female
      'Serena',               // British female
      
      // Fallback to any available quality voices
      'Aaron',                // US male
      'Fred',                 // US male
      'Thomas',               // French accent but good quality
    ];

    console.log('🎤 Available voices for quality selection:', voices.map(v => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      quality: this.getVoiceQuality(v)
    })));

    // Find the highest quality voice from priority list
    for (const voiceName of highQualityVoicePriority) {
      const voice = voices.find(v => 
        v.name === voiceName || 
        v.name.includes(voiceName) ||
        v.name.toLowerCase().includes(voiceName.toLowerCase())
      );
      
      if (voice) {
        console.log(`🎤 Selected high-quality voice: ${voice.name} (${voice.lang})`);
        console.log(`🎤 Voice quality indicators:`, {
          name: voice.name,
          isLocal: voice.localService,
          hasEnhanced: voice.name.includes('Enhanced') || voice.name.includes('Premium'),
          language: voice.lang
        });
        return voice;
      }
    }

    // If no priority voice found, select the best available based on quality indicators
    const qualityVoice = voices
      .filter(v => v.localService) // Prefer local voices for quality
      .sort((a, b) => this.getVoiceQuality(b) - this.getVoiceQuality(a))[0];

    if (qualityVoice) {
      console.log(`🎤 Selected best available quality voice: ${qualityVoice.name}`);
      return qualityVoice;
    }

    console.warn('🎤 No high-quality voice found, using default');
    return voices[0] || null;
  }

  /**
   * Calculate voice quality score (higher = better)
   */
  private getVoiceQuality(voice: SpeechSynthesisVoice): number {
    let score = 0;
    
    // Enhanced/Premium voices get highest score
    if (voice.name.includes('Enhanced') || voice.name.includes('Premium')) score += 100;
    
    // Local voices are generally higher quality
    if (voice.localService) score += 50;
    
    // Specific high-quality voice names
    if (voice.name.includes('Daniel')) score += 30;
    if (voice.name.includes('Alex')) score += 25;
    if (voice.name.includes('Samantha')) score += 25;
    
    // Language preference (US English typically best supported)
    if (voice.lang === 'en-US') score += 20;
    if (voice.lang === 'en-GB') score += 15;
    if (voice.lang.startsWith('en-')) score += 10;
    
    return score;
  }

  /**
   * Process text to add natural punctuation pauses without speaking punctuation
   */
  public processTextForNaturalSpeech(text: string): string {
    if (!text) return text;

    console.log('🗣️ Processing text for natural speech...');
    
    // Replace punctuation with appropriate pauses using SSML-like breaks
    let processedText = text
      // Replace periods with longer pauses
      .replace(/\./g, ' <break time="0.8s"/> ')
      // Replace commas with medium pauses  
      .replace(/,/g, ' <break time="0.5s"/> ')
      // Replace semicolons with medium-long pauses
      .replace(/;/g, ' <break time="0.7s"/> ')
      // Replace colons with medium pauses
      .replace(/:/g, ' <break time="0.6s"/> ')
      // Replace question marks with longer pauses and slight intonation
      .replace(/\?/g, ' <break time="0.9s"/> ')
      // Replace exclamation marks with pauses
      .replace(/!/g, ' <break time="0.8s"/> ')
      // Replace dashes and em-dashes with pauses
      .replace(/--/g, ' <break time="0.7s"/> ')
      .replace(/—/g, ' <break time="0.7s"/> ')
      // Replace multiple spaces with single spaces
      .replace(/\s+/g, ' ')
      // Clean up leading/trailing spaces
      .trim();

    // For iOS, we need to simulate breaks differently since SSML isn't fully supported
    if (this.isIOS) {
      processedText = this.simulateBreaksForIOS(processedText);
    }

    console.log('🗣️ Text processing complete. Length change:', text.length, '→', processedText.length);
    return processedText;
  }

  /**
   * Simulate SSML breaks for iOS using pause words and timing
   */
  private simulateBreaksForIOS(text: string): string {
    // Replace SSML-like breaks with silent words or extended spaces
    return text
      .replace(/<break time="0\.5s"\/>/g, '... ')
      .replace(/<break time="0\.6s"\/>/g, '.... ')
      .replace(/<break time="0\.7s"\/>/g, '..... ')
      .replace(/<break time="0\.8s"\/>/g, '...... ')
      .replace(/<break time="0\.9s"\/>/g, '....... ')
      // Clean up multiple dots and replace with strategic pauses
      .replace(/\.{3,}/g, (match) => {
        // Convert dots to a brief pause word that's nearly silent
        const pauseLength = Math.min(match.length, 8);
        return ' ' + 'mmm'.substring(0, Math.max(1, pauseLength / 3)) + ' ';
      })
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Play text with enhanced iPhone voice settings
   */
  public async playText(
    text: string, 
    settings: EnhancedIPhoneVoiceSettings,
    onEnd?: () => void,
    onError?: (error: any) => void
  ): Promise<void> {
    try {
      // Stop any current speech
      this.stop();

      // Wait for voices to be loaded
      await this.loadEnhancedVoices();

      // Process text for natural speech if enabled
      const processedText = settings.punctuationPauses 
        ? this.processTextForNaturalSpeech(text)
        : text;

      console.log('🎤 Enhanced iPhone Voice Service: Starting playback', {
        originalLength: text.length,
        processedLength: processedText.length,
        punctuationPauses: settings.punctuationPauses,
        useEnhancedProcessing: settings.useEnhancedProcessing
      });

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(processedText);
      
      // Apply enhanced voice settings
      const bestVoice = settings.voice || this.getBestQualityVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
        console.log(`🎤 Using enhanced voice: ${bestVoice.name}`);
      }

      // Apply optimized settings for iPhone
      utterance.pitch = Math.max(0.1, Math.min(2.0, settings.pitch));
      utterance.rate = Math.max(0.1, Math.min(10.0, settings.rate));
      utterance.volume = Math.max(0.0, Math.min(1.0, settings.volume));
      utterance.lang = 'en-US';

      // Enhanced event handlers
      utterance.onstart = () => {
        console.log('🎤 Enhanced iPhone speech started');
      };

      utterance.onend = () => {
        console.log('🎤 Enhanced iPhone speech ended');
        this.currentUtterance = null;
        onEnd?.();
      };

      utterance.onerror = (event) => {
        console.error('🎤 Enhanced iPhone speech error:', event);
        this.currentUtterance = null;
        onError?.(event);
      };

      // Store current utterance
      this.currentUtterance = utterance;

      // Start speech synthesis
      speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('🎤 Enhanced iPhone Voice Service error:', error);
      onError?.(error);
    }
  }

  /**
   * Stop current speech
   */
  public stop(): void {
    if (this.currentUtterance) {
      speechSynthesis.cancel();
      this.currentUtterance = null;
      console.log('🎤 Enhanced iPhone speech stopped');
    }
  }

  /**
   * Pause current speech
   */
  public pause(): void {
    if (this.currentUtterance && speechSynthesis.speaking) {
      speechSynthesis.pause();
      console.log('🎤 Enhanced iPhone speech paused');
    }
  }

  /**
   * Resume paused speech
   */
  public resume(): void {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
      console.log('🎤 Enhanced iPhone speech resumed');
    }
  }

  /**
   * Check if service is available
   */
  public isSupported(): boolean {
    return this.isIOS && 'speechSynthesis' in window;
  }

  /**
   * Get available voices with quality information
   */
  public getAvailableVoices(): Array<{ voice: SpeechSynthesisVoice; quality: number }> {
    return this.enhancedVoices
      .filter(v => v.lang.startsWith('en-'))
      .map(voice => ({
        voice,
        quality: this.getVoiceQuality(voice)
      }))
      .sort((a, b) => b.quality - a.quality);
  }
}

// Export singleton instance
export const enhancedIPhoneVoiceService = EnhancedIPhoneVoiceService.getInstance();
