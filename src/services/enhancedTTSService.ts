// Enhanced TTS Service for better quality browser speech synthesis
export interface EnhancedVoiceSettings {
  pitch?: number;
  rate?: number;
  voice?: SpeechSynthesisVoice;
  volume?: number;
}

export interface TextChunk {
  text: string;
  type: 'verse' | 'intro' | 'transition';
  verseNumber?: number;
  emphasis?: 'low' | 'medium' | 'high';
  rate?: number;
}

export class EnhancedTTSService {
  private static instance: EnhancedTTSService;
  private voices: SpeechSynthesisVoice[] = [];
  private isVoicesLoaded = false;

  private constructor() {
    this.loadVoices();
  }

  public static getInstance(): EnhancedTTSService {
    if (!EnhancedTTSService.instance) {
      EnhancedTTSService.instance = new EnhancedTTSService();
    }
    return EnhancedTTSService.instance;
  }

  private loadVoices(): void {
    const loadVoices = () => {
      this.voices = window.speechSynthesis.getVoices();
      this.isVoicesLoaded = true;
      console.log('🎤 Enhanced TTS: Loaded', this.voices.length, 'voices');
    };

    // Load voices immediately if available
    loadVoices();

    // Set up voices changed handler
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Get the best available voice for natural speech
  public getBestVoice(): SpeechSynthesisVoice | null {
    if (!this.isVoicesLoaded) {
      this.loadVoices();
    }

    const voices = this.voices;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;

    // Priority list for high-quality voices - Daniel prioritized for iOS
    const voicePriorities = [
      // Premium voices (if available)
      { name: 'Google UK English Female', lang: 'en-GB' },
      { name: 'Google UK English Male', lang: 'en-GB' },
      { name: 'Google US English Female', lang: 'en-US' },
      { name: 'Google US English Male', lang: 'en-US' },
      
      // Apple voices (iOS/macOS) - Daniel first, then others
      { name: 'Daniel', lang: 'en-GB' },
      { name: 'Samantha', lang: 'en-US' },
      { name: 'Alex', lang: 'en-US' },
      { name: 'Victoria', lang: 'en-GB' },
      
      // Microsoft voices (Windows)
      { name: 'Microsoft David Online (Natural)', lang: 'en-US' },
      { name: 'Microsoft Zira Online', lang: 'en-US' },
      { name: 'Microsoft Mark Online (Natural)', lang: 'en-US' },
      
      // Generic high-quality voices
      { name: 'en-US-Neural2-F', lang: 'en-US' },
      { name: 'en-US-Neural2-M', lang: 'en-US' },
      { name: 'en-GB-Neural2-F', lang: 'en-GB' },
      { name: 'en-GB-Neural2-M', lang: 'en-GB' },
    ];

    // For iOS devices, prioritize Daniel even more
    if (isIOS) {
      console.log('🎤 Enhanced TTS: iOS device detected, looking for Daniel voice');
      const danielVoice = voices.find(v => 
        v.name.includes('Daniel') && 
        v.lang.startsWith('en-') &&
        v.localService === true
      );
      if (danielVoice) {
        console.log('🎤 Enhanced TTS: Using Daniel voice for iOS:', danielVoice.name);
        return danielVoice;
      } else {
        console.log('🎤 Enhanced TTS: Daniel voice not found on iOS, available voices:', voices.map(v => v.name));
      }
    }

    // Try to find voices in priority order
    for (const priority of voicePriorities) {
      const voice = voices.find(v => 
        v.name.includes(priority.name) && 
        v.lang.startsWith(priority.lang) &&
        v.localService === true
      );
      if (voice) {
        console.log('🎤 Enhanced TTS: Using priority voice:', voice.name);
        return voice;
      }
    }

    // Fallback: Find any high-quality English voice
    const fallbackVoices = voices.filter(v => 
      v.lang.startsWith('en-') && 
      v.localService === true &&
      (v.name.includes('Neural') || 
       v.name.includes('Natural') || 
       v.name.includes('Premium') ||
       v.name.includes('Enhanced'))
    );

    if (fallbackVoices.length > 0) {
      console.log('🎤 Enhanced TTS: Using fallback voice:', fallbackVoices[0].name);
      return fallbackVoices[0];
    }

    // Last resort: Any English voice
    const anyEnglishVoice = voices.find(v => 
      v.lang.startsWith('en-') && 
      v.localService === true
    );

    if (anyEnglishVoice) {
      console.log('🎤 Enhanced TTS: Using basic English voice:', anyEnglishVoice.name);
      return anyEnglishVoice;
    }

    console.warn('🎤 Enhanced TTS: No suitable voice found');
    return null;
  }

  // Enhanced text preprocessing with contextual analysis
  private preprocessText(text: string): string {
    let processed = text;

    // Remove extra whitespace and normalize
    processed = processed.replace(/\s+/g, ' ').trim();

    // Add breathing patterns for more natural speech
    processed = processed
      // Add subtle breathing pauses at natural breaks
      .replace(/([.!?])\s+([A-Z])/g, '$1 <break time="600ms"/> $2')
      // Add shorter pauses for commas with breathing
      .replace(/,/g, ', <break time="250ms"/>')
      // Add pauses for colons and semicolons
      .replace(/:/g, ': <break time="400ms"/>')
      .replace(/;/g, '; <break time="400ms"/>')
      // Add pauses for parentheses
      .replace(/\(/g, '<break time="150ms"/> (')
      .replace(/\)/g, ') <break time="150ms"/>')
      // Add emphasis for divine names and titles
      .replace(/\b(LORD|God|Jesus|Christ|Holy Spirit|Savior|Messiah|King|Lord)\b/gi, '<emphasis level="strong">$1</emphasis>')
      // Add emphasis for verse numbers
      .replace(/(\d+\.)/g, '<emphasis level="moderate">$1</emphasis>')
      // Add emphasis for important biblical concepts
      .replace(/\b(grace|mercy|love|faith|hope|salvation|redemption|forgiveness|eternal|heaven|hell|sin|righteousness)\b/gi, '<emphasis level="moderate">$1</emphasis>')
      // Improve pronunciation of Hebrew/Greek names and terms
      .replace(/\bJehovah\b/gi, 'Jehovah')
      .replace(/\bYahweh\b/gi, 'Yahweh')
      .replace(/\bElohim\b/gi, 'Elohim')
      .replace(/\bAdonai\b/gi, 'Adonai')
      .replace(/\bYeshua\b/gi, 'Yeshua')
      .replace(/\bMessiah\b/gi, 'Messiah')
      // Add prosody for better rhythm and natural flow
      .replace(/([.!?])\s*$/g, '$1 <prosody rate="slow" pitch="low">.</prosody>')
      // Add breathing pauses at verse boundaries
      .replace(/(\d+\.)\s+/g, '<break time="300ms"/> $1 <break time="200ms"/>')
      // Add emphasis for direct quotes
      .replace(/"([^"]+)"/g, '<emphasis level="moderate">"$1"</emphasis>')
      // Add pauses for lists and enumerations
      .replace(/(\d+\))\s+/g, '<break time="200ms"/> $1 <break time="100ms"/>');

    return processed;
  }

  // Create enhanced SSML markup with dynamic adjustments
  private createSSML(text: string, settings: EnhancedVoiceSettings): string {
    const processedText = this.preprocessText(text);
    
    // Get voice name for SSML
    const voiceName = settings.voice?.name || this.getBestVoice()?.name || '';
    
    // Dynamic rate adjustment based on content
    const baseRate = settings.rate || 0.85;
    const dynamicRate = this.calculateDynamicRate(text, baseRate);
    
    // Create SSML with enhanced settings
    const ssml = `
      <speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voiceName}">
          <prosody 
            rate="${dynamicRate}" 
            pitch="${settings.pitch || 1.0}" 
            volume="${settings.volume || 1.0}"
          >
            ${processedText}
          </prosody>
        </voice>
      </speak>
    `.trim();

    return ssml;
  }

  // Calculate dynamic rate based on content analysis
  private calculateDynamicRate(text: string, baseRate: number): number {
    // Slow down for important content
    if (text.includes('LORD') || text.includes('God') || text.includes('Jesus')) {
      return baseRate * 0.9; // 10% slower for divine names
    }
    
    // Slow down for verse numbers and transitions
    if (/\d+\./.test(text)) {
      return baseRate * 0.95; // 5% slower for verse numbers
    }
    
    // Speed up slightly for longer passages
    if (text.length > 200) {
      return baseRate * 1.05; // 5% faster for longer content
    }
    
    return baseRate;
  }

  // Enhanced text chunking with contextual analysis
  public chunkText(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    
    // Split by verse boundaries first
    const verses = text.split(/(?=\d+\.)/);
    
    for (let i = 0; i < verses.length; i++) {
      const verse = verses[i].trim();
      if (!verse) continue;
      
      // Extract verse number
      const verseMatch = verse.match(/^(\d+)\./);
      const verseNumber = verseMatch ? parseInt(verseMatch[1]) : i;
      
      // Determine emphasis level based on content
      let emphasis: 'low' | 'medium' | 'high' = 'medium';
      if (verse.includes('LORD') || verse.includes('God') || verse.includes('Jesus')) {
        emphasis = 'high';
      } else if (verse.includes('grace') || verse.includes('mercy') || verse.includes('love')) {
        emphasis = 'medium';
      } else {
        emphasis = 'low';
      }
      
      // Determine rate based on content length and type
      let rate = 0.85;
      if (verse.length > 150) {
        rate = 0.9; // Slightly faster for longer verses
      } else if (verse.includes('LORD') || verse.includes('God')) {
        rate = 0.8; // Slower for divine names
      }
      
      // Split long verses into smaller chunks
      if (verse.length > 300) {
        const sentences = verse.split(/(?<=[.!?])\s+/);
        let currentChunk = '';
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > 200) {
            if (currentChunk.trim()) {
              chunks.push({
                text: currentChunk.trim(),
                type: 'verse',
                verseNumber: verseNumber,
                emphasis: emphasis,
                rate: rate
              });
            }
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
        
        if (currentChunk.trim()) {
          chunks.push({
            text: currentChunk.trim(),
            type: 'verse',
            verseNumber: verseNumber,
            emphasis: emphasis,
            rate: rate
          });
        }
      } else {
        chunks.push({
          text: verse,
          type: 'verse',
          verseNumber: verseNumber,
          emphasis: emphasis,
          rate: rate
        });
      }
    }
    
    return chunks;
  }

  // Enhanced speech synthesis with better quality
  public speak(text: string, settings: EnhancedVoiceSettings = {}): SpeechSynthesisUtterance {
    // Cancel any existing speech
    window.speechSynthesis.cancel();
    
    // Get the best available voice
    const voice = settings.voice || this.getBestVoice();
    if (!voice) {
      throw new Error('No suitable voice available');
    }

    // Create utterance with enhanced settings
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply enhanced settings
    utterance.voice = voice;
    utterance.rate = settings.rate || 0.85; // Slightly slower for better clarity
    utterance.pitch = settings.pitch || 1.0; // Natural pitch
    utterance.volume = settings.volume || 1.0;
    utterance.lang = voice.lang || 'en-US';
    
    // Enhanced event handlers
    utterance.onstart = () => {
      console.log('🎤 Enhanced TTS: Started speaking with voice:', voice.name);
    };
    
    utterance.onend = () => {
      console.log('🎤 Enhanced TTS: Finished speaking');
    };
    
    utterance.onerror = (event) => {
      console.error('🎤 Enhanced TTS: Error:', event);
    };
    
    return utterance;
  }

  // Speak with SSML for maximum quality
  public speakWithSSML(text: string, settings: EnhancedVoiceSettings = {}): SpeechSynthesisUtterance {
    // Cancel any existing speech
    window.speechSynthesis.cancel();
    
    // Create SSML markup
    const ssml = this.createSSML(text, settings);
    
    // Create utterance with SSML
    const utterance = new SpeechSynthesisUtterance(ssml);
    
    // Get the best available voice
    const voice = settings.voice || this.getBestVoice();
    if (voice) {
      utterance.voice = voice;
    }
    
    // Apply basic settings (SSML will override some)
    utterance.rate = settings.rate || 0.85;
    utterance.pitch = settings.pitch || 1.0;
    utterance.volume = settings.volume || 1.0;
    utterance.lang = voice?.lang || 'en-US';
    
    // Enhanced event handlers
    utterance.onstart = () => {
      console.log('🎤 Enhanced TTS: Started SSML speech with voice:', voice?.name);
    };
    
    utterance.onend = () => {
      console.log('🎤 Enhanced TTS: Finished SSML speech');
    };
    
    utterance.onerror = (event) => {
      console.error('🎤 Enhanced TTS: SSML Error:', event);
    };
    
    return utterance;
  }

  // Get available voices for selection
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isVoicesLoaded) {
      this.loadVoices();
    }
    return this.voices.filter(v => v.lang.startsWith('en-'));
  }

  // Check if SSML is supported
  public isSSMLSupported(): boolean {
    // Most modern browsers support basic SSML
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  // Check if enhanced TTS is supported
  public get isSupported(): boolean {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  // Cancel current speech
  public cancel(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Pause current speech
  public pause(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  // Resume current speech
  public resume(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  // Stop current speech
  public stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const enhancedTTSService = EnhancedTTSService.getInstance(); 