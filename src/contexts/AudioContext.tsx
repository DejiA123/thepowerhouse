import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { audioService } from '@/services/audioService';

interface AudioContextType {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  audioLoading: boolean;
  text: string;
  book: string;
  chapter: number;
  pitch: number;
  rate: number;
  charIndex: number;
  play: (text: string, book: string, chapter: number, pitch?: number, rate?: number, startIndex?: number, voice?: SpeechSynthesisVoice) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  registerAudioEndCallback: (callback: () => void) => void;
  unregisterAudioEndCallback: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode; onAudioEnd?: () => void }> = ({ children, onAudioEnd }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');
  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState(0);
  const [pitch, setPitch] = useState(1.6); // Changed to 1.6 for higher pitch on iPhone
  const [rate, setRate] = useState(0.75); // Adjusted to 0.75 for optimal iPhone speech speed
  const [charIndex, setCharIndex] = useState(0);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const voicesLoadedRef = useRef(false);
  const audioEndCallbackRef = useRef<(() => void) | null>(null);
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Initialize speech synthesis for iOS
  useEffect(() => {
    if (isIOS && 'speechSynthesis' in window) {
      // iOS fix: Initialize speech synthesis properly
      const initSpeechSynthesis = () => {
        try {
          // Get voices to trigger loading
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            voicesLoadedRef.current = true;
            console.log('✅ iOS: Voices loaded on initialization');
          }
        } catch (e) {
          console.log('⚠️ iOS: Error during speech synthesis initialization:', e);
        }
      };

      // Try to load voices immediately
      initSpeechSynthesis();

      // Set up voices changed handler
      const handleVoicesChanged = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          voicesLoadedRef.current = true;
          console.log('✅ iOS: Voices loaded via onvoiceschanged event');
        }
      };

      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [isIOS]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const play = useCallback(async (text: string, book: string, chapter: number, pitch: number = 1.6, rate: number = 0.75, startIndex: number = 0, voice?: SpeechSynthesisVoice) => {
    if (!text) {
      setIsLoading(false);
      return;
    }

    // Ensure the audio always announces the chapter once at the start
    const displayBookName = (book || '').replace(/_/g, ' ').trim();
    const escapedBook = displayBookName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\\/g, '\\');
    const leadingIntroRe = new RegExp('^\\s*' + displayBookName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+chapter\\s+' + chapter + '\\s*[\\.:!?-]?\\s*', 'i');
    const strippedText = (text || '').replace(leadingIntroRe, '');
    const fullText = (displayBookName && chapter ? `${displayBookName} chapter ${chapter}. ${strippedText}` : strippedText).trim();

    // Dramatic punctuation pause: insert ' .......... ' after punctuation
    const dramaticText = fullText.replace(/([.,;:!?])/g, '$1 .......... ');

    // Prevent multiple simultaneous play calls
    if (isLoading) {
      console.log('⚠️ Play call ignored - audio is currently loading');
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsLoading(true);
    setText(fullText);
    setBook(book);
    setChapter(chapter);
    setPitch(pitch);
    setRate(rate);
    setCharIndex(startIndex);

    try {
      // iOS fix: Ensure voices are loaded before starting
      if (isIOS && !voicesLoadedRef.current) {
        console.log('📱 iOS: Waiting for voices to load...');
        
        // Wait for voices to load with a promise
        await new Promise<void>((resolve) => {
          const voicesChangedHandler = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
              voicesLoadedRef.current = true;
              console.log('✅ iOS: Voices loaded successfully');
              window.speechSynthesis.onvoiceschanged = null;
              resolve();
            }
          };
          
          window.speechSynthesis.onvoiceschanged = voicesChangedHandler;
          
          // Fallback: resolve after 3 seconds if voices still not loaded
          setTimeout(() => {
            if (!voicesLoadedRef.current) {
              console.log('⚠️ iOS: Voices still not loaded after 3s, proceeding anyway...');
              window.speechSynthesis.onvoiceschanged = null;
              voicesLoadedRef.current = true;
            }
            resolve();
          }, 3000);
        });
      }

      // Simple cleanup - just cancel once
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      // Create utterance with iOS-optimized settings
      const utterance = new SpeechSynthesisUtterance(dramaticText.slice(startIndex));
      
      // iOS-optimized settings
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1.0;
      utterance.lang = 'en-US'; // Ensure US English for iOS

      // Add event listeners for dramatic punctuation pauses
      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.charIndex !== undefined) {
          const char = fullText.slice(startIndex)[event.charIndex];
          if (char && /[.,;:!?]/.test(char)) {
            console.log(`🎵 Dramatic pause at: "${char}" - position ${event.charIndex}`);
          }
          // Track pauses for important words and phrases
          const currentText = fullText.slice(startIndex, startIndex + event.charIndex + 15);
          const words = currentText.split(/\s+/);
          const lastWord = words[words.length - 1];
          
          // Log dramatic pauses for important words
          if (lastWord && /^(Lord|God|Jesus|Christ|Holy|Spirit|said|spoke|called|answered)$/i.test(lastWord)) {
            console.log(`🎵 Dramatic emphasis on: "${lastWord}"`);
          }
          
          // Log dramatic pauses for action words
          if (lastWord && /^(came|went|saw|heard|felt|thought)$/i.test(lastWord)) {
            console.log(`🎵 Action word emphasis: "${lastWord}"`);
          }
          
          // Log dramatic pauses for emotional words
          if (lastWord && /^(love|hate|fear|joy|peace|grace|mercy)$/i.test(lastWord)) {
            console.log(`🎵 Emotional word emphasis: "${lastWord}"`);
          }
          
          // Log dramatic pauses for time words
          if (lastWord && /^(Now|Then|After|Before|During)$/i.test(lastWord)) {
            console.log(`🎵 Time word emphasis: "${lastWord}"`);
          }
          
          setCharIndex(startIndex + event.charIndex);
        }
      };

      // Set the voice (use provided voice or fallback to default selection)
      if (voice) {
        utterance.voice = voice;
        console.log(`🎤 Using selected voice: ${voice.name}`);
      } else if (isIOS) {
        // Fallback to iOS-specific voice selection
        const voices = window.speechSynthesis.getVoices();
        // Prioritize Daniel British voice
        const danielVoice = voices.find(voice => 
          (voice.name.includes('Daniel') || voice.name.includes('daniel')) && 
          voice.lang.startsWith('en-') && 
          voice.localService === true
        );
        if (danielVoice) {
          utterance.voice = danielVoice;
          console.log(`🎤 iOS: Using Daniel British voice: ${danielVoice.name}`);
        } else {
          // Fallback to any US English voice
          const usVoice = voices.find(voice => 
            voice.lang.startsWith('en-US') && voice.localService === true
          );
          if (usVoice) {
            utterance.voice = usVoice;
            console.log(`🎤 iOS: Using fallback voice: ${usVoice.name}`);
          }
        }
      }

      // Set up event handlers
      utterance.onstart = () => {
        console.log('✅ Speech started successfully');
        setIsPlaying(true);
        setIsLoading(false);
        setIsPaused(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      utterance.onend = () => {
        console.log('✅ Speech ended successfully');
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoading(false);
        setCharIndex(0);
        // Call the callback to trigger auto-play for next chapter
        if (audioEndCallbackRef.current) {
          console.log('🎵 Calling registered audio end callback for auto-play');
          audioEndCallbackRef.current();
        } else if (onAudioEnd) {
          console.log('🎵 Calling default onAudioEnd callback');
          onAudioEnd();
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      utterance.onerror = (event) => {
        console.error('❌ Speech synthesis error:', event);
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoading(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      utterance.onpause = () => {
        setIsPlaying(false);
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      
      // Start speech synthesis
      window.speechSynthesis.speak(utterance);
      
      // iOS fix: Set timeout to prevent infinite loading
      if (isIOS) {
        timeoutRef.current = setTimeout(() => {
          if (isLoading) {
            console.warn('⚠️ iOS: Speech synthesis timeout, clearing loading state');
            setIsLoading(false);
            setIsPlaying(false);
            setIsPaused(false);
            window.speechSynthesis.cancel();
          }
        }, 5000); // 5 second timeout for iOS
      }

    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
      setIsPaused(false);
      setIsLoading(false);
    }
  }, [isIOS, isLoading]);

  const pause = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
      setIsLoading(false);
    }
  }, []);

  const resume = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    console.log('🛑 Stopping audio playback...');
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
    setCharIndex(0);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const registerAudioEndCallback = useCallback((callback: () => void) => {
    audioEndCallbackRef.current = callback;
    console.log('🎵 Audio end callback registered');
  }, []);

  const unregisterAudioEndCallback = useCallback(() => {
    audioEndCallbackRef.current = null;
    console.log('🎵 Audio end callback unregistered');
  }, []);

  return (
    <AudioContext.Provider value={{
      isPlaying,
      isPaused,
      isLoading,
      audioLoading: isLoading,
      text,
      book,
      chapter,
      pitch,
      rate,
      charIndex,
      play,
      pause,
      resume,
      stop,
      registerAudioEndCallback,
      unregisterAudioEndCallback,
    }}>
      {children}
    </AudioContext.Provider>
  );
}; 