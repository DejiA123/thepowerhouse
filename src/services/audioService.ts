
import { supabase } from "@/integrations/supabase/client";

export interface Voice {
  id: string;
  name: string;
  provider: 'elevenlabs' | 'azure' | 'browser';
  language: string;
  gender?: 'male' | 'female';
  description?: string;
}

export interface AudioSettings {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
  lang?: string;
  disablePunctuationEmphasis?: boolean; // New option to disable punctuation emphasis
}

class AudioService {
  private isPlaying = false;
  private isSpeaking = false;
  private currentAudio: HTMLAudioElement | SpeechSynthesisUtterance | null = null;

  // Premium realistic male voices from ElevenLabs for Bible reading - optimized for mobile
  private readonly ELEVENLABS_VOICES = {
    'daniel': 'onwK4e9ZLuTAKqWW03F9', // Deep, warm male voice - most realistic for Bible
    'liam': 'TX3LPaxmHKxFdv7VOQHJ',    // Young, clear male voice - very natural
    'callum': 'N2lVS1w4EtoT3dr4eOWO',  // British male voice - sophisticated
    'eric': 'cjVigY5qzO86Huf0OWal',   // Mature, authoritative - highly realistic
    'josh': 'TxGEqnHWrfWFTfGW9XjX',    // Deep, resonant male voice - perfect for Bible
    'arnold': 'VR6AewLTigWG4xSOukaG',  // Strong, commanding male voice
    'domi': 'AZnzlk1XvdvUeBnXmlld',    // Deep, warm male voice - excellent clarity
  };

  // Generate speech using ElevenLabs API for high-quality realistic voice
  async generateElevenLabsAudio(text: string, voiceId: string = 'onwK4e9ZLuTAKqWW03F9'): Promise<string | null> {
    try {
      console.log('🎤 Generating high-quality male voice with ElevenLabs...');

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text,
          voice: voiceId,
          model_id: "eleven_multilingual_v2", // Highest quality model for realistic voice
          voice_settings: {
            stability: 0.90,      // Higher stability for more consistent voice
            similarity_boost: 0.98, // Maximum similarity for most realistic sound
            style: 0.10,          // Lower style for more natural speech
            use_speaker_boost: true  // Enhance audio quality
          }
        }
      });

      if (error) throw error;

      if (data?.audioContent) {
        console.log('✅ ElevenLabs audio generated successfully');
        return `data:audio/mp3;base64,${data.audioContent}`;
      }

      return null;
    } catch (error) {
      console.error('❌ ElevenLabs TTS failed:', error);
      return null;
    }
  }

  // Get the best available real human male voices for mobile devices
  private getHighQualityRealHumanVoices(): SpeechSynthesisVoice[] {
    const voices = speechSynthesis.getVoices();
    
    // Daniel British voice - highest priority
    const danielBritishVoices = [
      'Daniel (Enhanced)', 'Daniel'
    ];
    
    // Enhanced male voices (real human recordings) - prioritize these for mobile
    const enhancedMaleVoices = [
      'Aaron (Enhanced)', 'Alex (Enhanced)', 'Thomas (Enhanced)',
      'Nathan (Enhanced)', 'Matthew (Enhanced)', 'David (Enhanced)'
    ];
    
    // High-quality male voices (real human recordings) - mobile optimized
    const highQualityMaleVoices = [
      'Aaron', 'Alex', 'Fred', 'Jorge', 'Luca', 'Thomas', 'Nathan',
      'Matthew', 'James', 'David', 'Mark', 'Paul', 'Arthur', 'Albert', 'Ralph',
      'Tom', 'Victor', 'Bruce', 'Henry', 'Sam', 'Mike', 'John', 'Robert'
    ];

    // Premium voices for highest quality
    const premiumVoices = [
      'Google UK English Male', 'Google UK English Female',
      'Microsoft David - English (United States)', 'Microsoft Mark - English (United States)',
      'Microsoft Zira - English (United States)', 'Microsoft Aria - English (United States)'
    ];

    // Detect platform for voice optimization
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;
    const preferredVoices = [...danielBritishVoices, ...premiumVoices, ...enhancedMaleVoices, ...highQualityMaleVoices];

    // Filter for high-quality native male voices only
    const realHumanVoices = voices.filter(voice => {
      const isEnglish = voice.lang.startsWith('en-');
      const isNative = voice.localService === true;
      const isNotSynthetic = !voice.name.toLowerCase().includes('google') &&
                            !voice.name.toLowerCase().includes('espeak') &&
                            !voice.name.toLowerCase().includes('microsoft') &&
                            !voice.name.toLowerCase().includes('synthetic') &&
                            !voice.name.toLowerCase().includes('robot') &&
                            !voice.name.toLowerCase().includes('samantha') &&
                            !voice.name.toLowerCase().includes('victoria') &&
                            !voice.name.toLowerCase().includes('karen') &&
                            !voice.name.toLowerCase().includes('susan') &&
                            !voice.name.toLowerCase().includes('tessa') &&
                            !voice.name.toLowerCase().includes('monica') &&
                            !voice.name.toLowerCase().includes('zira');
      
      // Check if it's likely a male voice based on name
      const isMaleVoice = preferredVoices.some(pv => 
        voice.name.toLowerCase().includes(pv.toLowerCase().split(' ')[0])
      );

      // Include premium voices even if they don't match male voice pattern
      const isPremiumVoice = premiumVoices.some(pv => 
        voice.name.toLowerCase().includes(pv.toLowerCase().split(' ')[0])
      );

      return isEnglish && (isNative || isPremiumVoice) && (isNotSynthetic || isPremiumVoice) && (isMaleVoice || isPremiumVoice);
    });

    // Sort by preference - prioritize Daniel British voice first, then premium voices
    const sortedVoices = realHumanVoices.sort((a, b) => {
      // Daniel British voices get highest priority
      const aIsDaniel = danielBritishVoices.some(dv => a.name.includes(dv.split(' ')[0]));
      const bIsDaniel = danielBritishVoices.some(dv => b.name.includes(dv.split(' ')[0]));
      if (aIsDaniel && !bIsDaniel) return -1;
      if (!aIsDaniel && bIsDaniel) return 1;

      // Premium voices get second priority
      const aIsPremium = premiumVoices.some(pv => a.name.includes(pv.split(' ')[0]));
      const bIsPremium = premiumVoices.some(pv => b.name.includes(pv.split(' ')[0]));
      if (aIsPremium && !bIsPremium) return -1;
      if (!aIsPremium && bIsPremium) return 1;

      // Enhanced versions get third priority
      const aIsEnhanced = a.name.includes('Enhanced');
      const bIsEnhanced = b.name.includes('Enhanced');
      if (aIsEnhanced && !bIsEnhanced) return -1;
      if (!aIsEnhanced && bIsEnhanced) return 1;

      // Then sort by preferred male voices
      const aIndex = preferredVoices.findIndex(pv => a.name.includes(pv.split(' ')[0]));
      const bIndex = preferredVoices.findIndex(pv => b.name.includes(pv.split(' ')[0]));
      
      if (aIndex !== -1 && bIndex === -1) return -1;
      if (aIndex === -1 && bIndex !== -1) return 1;
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;

      return 0;
    });

    console.log(`Available high-quality voices (${isMobile ? 'Mobile' : 'Desktop'}):`, 
      sortedVoices.map(v => `${v.name} (${v.lang}) [${v.localService ? 'Native' : 'Premium'}]`));
    return sortedVoices;
  }

  /**
   * Preprocess text to add natural pauses after punctuation for browser TTS.
   * Uses strategic spacing and punctuation for more realistic speech timing.
   * Enhanced with maximum dramatic pauses for immersive Bible reading experience.
   * Optimized for highest quality TTS output with ultimate dramatic effect.
   */
  private addPunctuationEmphasis(text: string): string {
    // Add maximum dramatic pauses after punctuation for immersive Bible reading
    // Use strategic spacing that works with Web Speech API
    return text
      // Add ultimate dramatic pauses after sentence endings (periods, exclamation, question marks)
      .replace(/([.!?])\s*/g, '$1... ... ... ... ... ')
      // Add very dramatic pauses after semicolons and colons
      .replace(/([;:])\s*/g, '$1... ... ... ... ')
      // Add ultimate dramatic pauses after commas - maximum emphasis for Bible reading
      .replace(/([,])\s*/g, '$1... ... ... ... ... ')
      // Add dramatic pauses after other punctuation like dashes
      .replace(/([-–—])\s*/g, '$1... ... ... ... ')
      // Add longer pauses after parentheses and quotes for better flow
      .replace(/([()])\s*/g, '$1... ... ... ')
      .replace(/([""])\s*/g, '$1... ... ... ')
      // Add ultimate dramatic pauses after verse numbers for maximum dramatic effect
      .replace(/(\d+\.)\s*/g, '$1... ... ... ... ... ')
      // Add dramatic pauses for better sentence flow and emphasis on conjunctions
      .replace(/(\band\b|\bor\b|\bbut\b|\bfor\b|\bso\b|\byet\b)\s+/gi, '$1... ... ... ... ')
      // Add pauses after important words for emphasis
      .replace(/(\bthe\b|\ba\b|\ban\b)\s+([A-Z][a-z]+)\s+/gi, '$1... ... $2... ... ... ')
      // Add dramatic pauses after "said" and similar words for dramatic effect
      .replace(/(\bsaid\b|\bspoke\b|\bcalled\b|\banswered\b)\s+/gi, '$1... ... ... ... ')
      // Add pauses for better clause separation
      .replace(/(\bwhen\b|\bwhile\b|\bif\b|\bthough\b|\balthough\b)\s+/gi, '$1... ... ... ')
      // Add dramatic pauses for emphasis on important phrases
      .replace(/(\bLord\b|\bGod\b|\bJesus\b|\bChrist\b|\bHoly\s+Spirit\b)/gi, '$1... ... ... ... ')
      // Add pauses for better sentence structure
      .replace(/(\bthat\b|\bwhich\b|\bwho\b|\bwhom\b|\bwhose\b)\s+/gi, '$1... ... ')
      // Add dramatic pauses for emphasis on action words
      .replace(/(\bcame\b|\bwent\b|\bsaw\b|\bheard\b|\bfelt\b|\bthought\b)\s+/gi, '$1... ... ... ')
      // Add pauses for better paragraph flow
      .replace(/(\bNow\b|\bThen\b|\bAfter\b|\bBefore\b|\bDuring\b)\s+/gi, '$1... ... ... ')
      // Add dramatic pauses for emphasis on emotional words
      .replace(/(\blove\b|\bhate\b|\bfear\b|\bjoy\b|\bpeace\b|\bgrace\b|\bmercy\b)/gi, '$1... ... ... ')
      // Clean up multiple dots and spaces
      .replace(/\.{11,}/g, '... ... ... ... ...') // Limit to max 15 dots for dramatic effect
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Helper: Split text into chunks for TTS (prefer sentence boundaries, max 800 chars)
  private chunkText(text: string, maxLen = 800): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks: string[] = [];
    let current = '';
    for (const sentence of sentences) {
      if ((current + sentence).length > maxLen) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks;
  }

  speakWithBrowser(text: string, settings: AudioSettings = {}): SpeechSynthesisUtterance | null {
    if (!('speechSynthesis' in window)) {
      console.log('Speech synthesis not supported');
      return null;
    }
    
    // Cancel any existing speech
    speechSynthesis.cancel();

    // Add emphasis to punctuation for more realistic TTS
    const processedText = settings.disablePunctuationEmphasis ? text : this.addPunctuationEmphasis(text);

    const utterance = new SpeechSynthesisUtterance(processedText);

    // Add event listeners for better punctuation handling
    utterance.onboundary = (event) => {
      // Log when speech reaches punctuation boundaries
      if (event.charIndex !== undefined) {
        const char = processedText[event.charIndex];
        if (char && /[.,;:!?]/.test(char)) {
          console.log(`🎵 Dramatic pause at punctuation: "${char}" at position ${event.charIndex}`);
        }
      }
    };

    // Get the best real human voice available
    const realHumanVoices = this.getHighQualityRealHumanVoices();

    if (realHumanVoices.length > 0) {
      // Select the first available voice (simplified for better iOS compatibility)
      const selectedVoice = realHumanVoices[0];
      utterance.voice = selectedVoice;
      console.log(`🎤 Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
    }

    // Simplified settings for better iOS compatibility
    const isMobile = /iPad|iPhone|iPod|Android/.test(navigator.userAgent);
    
    if (isMobile) {
      // Mobile-optimized settings - user settings take precedence
      utterance.rate = settings.rate !== undefined ? settings.rate : 0.75; // Slower rate for better clarity on mobile
      utterance.pitch = settings.pitch !== undefined ? settings.pitch : 1.70; // Enhanced pitch for quality
      utterance.volume = settings.volume || 1.0; // Full volume
      utterance.lang = 'en-US'; // Ensure US English for mobile
    } else {
      // Desktop settings - user settings take precedence
      utterance.rate = settings.rate !== undefined ? settings.rate : 0.75; // Slower rate for better clarity on desktop
      utterance.pitch = settings.pitch !== undefined ? settings.pitch : 1.70; // Enhanced pitch for quality
      utterance.volume = settings.volume || 1.0; // Full volume
    }

    return utterance;
  }

  async speak(text: string, options: {
    provider?: 'elevenlabs' | 'browser';
    settings?: AudioSettings;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
  } = {}): Promise<void> {
    const {
      provider = 'browser', // Default to browser TTS for better iPhone compatibility
      settings = {},
      onStart,
      onEnd,
      onError
    } = options;
    
    if (this.isSpeaking) {
      return;
    }
    
    try {
      // Use browser TTS for better iPhone compatibility with pitch/rate control
      if (provider === 'browser') {
        console.log('🎤 Using browser TTS for iPhone compatibility with pitch/rate control');

        const utterance = this.speakWithBrowser(text, settings);
        if (!utterance) {
          throw new Error('Browser TTS not supported');
        }

        this.currentAudio = utterance;
        this.isPlaying = true;
        this.isSpeaking = true;

        utterance.onstart = () => {
          console.log('✅ Browser TTS started with settings:', settings);
          onStart?.();
        };

        utterance.onend = () => {
          console.log('✅ Browser TTS finished');
          this.isPlaying = false;
          this.isSpeaking = false;
          this.currentAudio = null;
          onEnd?.();
        };

        utterance.onerror = (event) => {
          console.error('❌ Browser TTS error:', event);
          this.isPlaying = false;
          this.isSpeaking = false;
          this.currentAudio = null;
          onError?.('Browser TTS playback failed');
        };

        // Start speaking
        window.speechSynthesis.speak(utterance);
        return;
      }

      // Fallback to ElevenLabs if specifically requested
      if (provider === 'elevenlabs') {
        console.log('🎤 Using ElevenLabs high-quality male voice for Bible audio');

        // Select the best male voice for Bible reading
        const isMobile = /iPad|iPhone|iPod|Android/.test(navigator.userAgent);
        const bestVoiceId = isMobile ? this.ELEVENLABS_VOICES.josh : this.ELEVENLABS_VOICES.daniel;
        
        console.log(`🎯 Using ${isMobile ? 'mobile-optimized' : 'desktop'} male voice: ${bestVoiceId}`);

        // Create element early and unlock iOS
        const audio = new Audio();
        // Ensure iOS inline playback with sound
        audio.muted = false;
        try { (audio as any).playsInline = true; } catch {}
        try { audio.setAttribute?.('playsinline', 'true'); } catch {}
        try { audio.setAttribute?.('webkit-playsinline', 'true'); } catch {}
        try { document.body.appendChild(audio); } catch {}
        try {
          const silentMp3 = 'data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA';
          audio.src = silentMp3;
          await audio.play();
          audio.pause();
        } catch {}

        // Generate ElevenLabs audio
        const audioDataUrl = await this.generateElevenLabsAudio(text, bestVoiceId);
        if (!audioDataUrl) {
          throw new Error('Failed to generate ElevenLabs audio');
        }
        audio.src = audioDataUrl;
        this.currentAudio = audio;
        this.isPlaying = true;
        this.isSpeaking = true;

        // Mobile-specific audio optimizations
        if (isMobile) {
          audio.preload = 'auto'; // Preload for better mobile performance
          audio.volume = 1.0; // Ensure full volume on mobile
        }

        audio.onloadstart = () => {
          console.log('✅ ElevenLabs audio loading started');
        };

        audio.onplay = () => {
          onStart?.();
        };

        audio.onended = () => {
          console.log('✅ ElevenLabs audio finished');
          this.isPlaying = false;
          this.isSpeaking = false;
          this.currentAudio = null;
          onEnd?.();
        };

        audio.onerror = (event) => {
          console.error('❌ ElevenLabs audio error:', event);
          this.isPlaying = false;
          this.isSpeaking = false;
          this.currentAudio = null;
          onError?.('High-quality audio playback failed');
        };

        await audio.play();
        return;
      }

      throw new Error('Invalid audio provider specified.');
    } catch (error) {
      this.isPlaying = false;
      this.isSpeaking = false;
      this.currentAudio = null;
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  stop(): void {
    console.log('🛑 Stopping audio playback...');
    
    if (this.currentAudio instanceof HTMLAudioElement) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    } else if (this.currentAudio instanceof SpeechSynthesisUtterance) {
      // Cancel speech synthesis with proper cleanup
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        // Wait for speech synthesis to fully stop
        setTimeout(() => {
          this.isSpeaking = false;
        }, 100);
      }
    }
    
    this.isPlaying = false;
    this.currentAudio = null;
    
    // Additional cleanup for any remaining speech synthesis
    if ('speechSynthesis' in window && speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
  }

  pause(): void {
    if (this.currentAudio instanceof HTMLAudioElement) {
      this.currentAudio.pause();
    } else if (this.currentAudio instanceof SpeechSynthesisUtterance) {
      speechSynthesis.pause();
    }
  }

  resume(): void {
    if (this.currentAudio instanceof HTMLAudioElement) {
      this.currentAudio.play();
    } else if (this.currentAudio instanceof SpeechSynthesisUtterance) {
      speechSynthesis.resume();
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioService = new AudioService();
