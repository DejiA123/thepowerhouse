import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { audioService } from '@/services/audioService';
import { enhancedBibleBrainApiNew } from '@/services/enhancedBibleBrainApiNew';
import { bibleBooks } from '@/components/bible/BibleBookList';
import { enhancedTTSService, EnhancedVoiceSettings } from '@/services/enhancedTTSService';
import { iosAudioService, IOSAudioSettings } from '@/services/iosAudioService';
import { enhancedIPhoneVoiceService, EnhancedIPhoneVoiceSettings } from '@/services/enhancedIPhoneVoiceService';
import { realisticBibleSpeechService, RealisticSpeechSettings } from '@/services/realisticBibleSpeechService';
import { audioBibleService } from '@/services/audioBibleService';

interface GlobalAudioState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentBook: string;
  currentChapter: number;
  currentText: string;
  currentVersion: string;
  autoPlayNext: boolean;
  loopChapter: boolean;
  voiceSettings?: {
    pitch?: number;
    rate?: number;
    voice?: SpeechSynthesisVoice;
  };
}

interface GlobalAudioContextType {
  // State
  audioState: GlobalAudioState;
  
  // Actions
  playBibleChapter: (book: string, chapter: number, text: string, autoPlayNext?: boolean, loopChapter?: boolean, voiceSettings?: { pitch?: number; rate?: number; voice?: SpeechSynthesisVoice }, version?: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  setAutoPlayNext: (enabled: boolean) => void;
  
  // Navigation helpers
  goToNextChapter: () => void;
  goToPreviousChapter: () => void;
  
  // UI update callbacks
  setChapterChangeCallback: (callback: (chapter: number, isAutoPlay: boolean) => void) => void;
  setBookChangeCallback: (callback: (book: string, chapter: number, isAutoPlay: boolean) => void) => void;
}

const GlobalAudioContext = createContext<GlobalAudioContextType | undefined>(undefined);

export const useGlobalAudio = () => {
  const context = useContext(GlobalAudioContext);
  if (!context) {
    console.warn('useGlobalAudio called outside GlobalAudioProvider, returning null');
    return null;
  }
  return context;
};

export const GlobalAudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioState, setAudioState] = useState<GlobalAudioState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentBook: '',
    currentChapter: 0,
    currentText: '',
    currentVersion: 'kjv',
    autoPlayNext: false,
    loopChapter: false,
    voiceSettings: {
      pitch: 1.0,
      rate: 1.0,
    },
  });

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const iosUnlockedRef = useRef<boolean>(false);
  const speechSessionRef = useRef<number>(0);
  
  // Add flag to prevent duplicate auto-advance calls
  const isAutoAdvancingRef = useRef<boolean>(false);
  
  // Callbacks for UI updates
  const chapterChangeCallbackRef = useRef<((chapter: number, isAutoPlay: boolean) => void) | null>(null);
  const bookChangeCallbackRef = useRef<((book: string, chapter: number, isAutoPlay: boolean) => void) | null>(null);

  // Initialize audio context and background audio support
  useEffect(() => {
    // Initialize audio context for background audio
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎵 GlobalAudioContext: Audio context initialized for background playback');
      } catch (error) {
        console.warn('🎵 GlobalAudioContext: Failed to initialize audio context:', error);
      }
    }

    // Create background audio element for better iOS compatibility
    if (!backgroundAudioRef.current) {
      backgroundAudioRef.current = new Audio();
      backgroundAudioRef.current.preload = 'auto';
      backgroundAudioRef.current.volume = 1.0;
      
      try {
        (backgroundAudioRef.current as any).playsInline = true;
        backgroundAudioRef.current.setAttribute?.('playsinline', 'true');
        backgroundAudioRef.current.setAttribute?.('webkit-playsinline', 'true');
      } catch (error) {
        console.warn('🎵 GlobalAudioContext: Failed to set audio attributes:', error);
      }
      
      // Set up media session controls
      if ('mediaSession' in navigator) {
        console.log('🎵 GlobalAudioContext: Setting up media session controls');
        navigator.mediaSession.setActionHandler('play', () => resume());
        navigator.mediaSession.setActionHandler('pause', () => pause());
        navigator.mediaSession.setActionHandler('stop', () => stop());
        navigator.mediaSession.setActionHandler('previoustrack', () => goToPreviousChapter());
        navigator.mediaSession.setActionHandler('nexttrack', () => goToNextChapter());
      }
    }

    // Enhanced page visibility handling for background audio
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🎵 GlobalAudioContext: Page hidden, maintaining audio playback');
      } else {
        console.log('🎵 GlobalAudioContext: Page visible, ensuring audio context is active');
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);

    console.log('🎵 GlobalAudioContext: Background audio session setup complete');

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Helper: Speak via browser TTS
  const speakText = useCallback(async (text: string, voiceSettings?: { pitch?: number; rate?: number; voice?: SpeechSynthesisVoice }) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Stop any existing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        currentUtteranceRef.current = utterance;
        
        // Apply voice settings
        if (voiceSettings) {
          if (voiceSettings.pitch !== undefined) {
            utterance.pitch = Math.max(0.1, Math.min(2.0, voiceSettings.pitch));
          }
          if (voiceSettings.rate !== undefined) {
            utterance.rate = Math.max(0.1, Math.min(3.0, voiceSettings.rate));
          }
          if (voiceSettings.voice) {
            utterance.voice = voiceSettings.voice;
          }
        }
        
        utterance.onstart = () => {
          console.log('🎵 Speech started');
          setAudioState(prev => ({ ...prev, isPlaying: true, isPaused: false, isLoading: false }));
        };
        
        utterance.onend = () => {
          console.log('🎵 Speech ended');
          setAudioState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
          resolve();
        };
        
        utterance.onerror = (error) => {
          console.error('🎵 Speech error:', error);
          setAudioState(prev => ({ ...prev, isPlaying: false, isPaused: false, isLoading: false }));
          reject(error);
        };
        
        // Start speaking
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('🎵 Failed to start speech synthesis:', error);
        setAudioState(prev => ({ ...prev, isPlaying: false, isPaused: false, isLoading: false }));
        reject(error);
      }
    });
  }, []);

  const playBibleChapter = useCallback(async (
    book: string, 
    chapter: number, 
    text: string, 
    autoPlayNext: boolean = false, 
    loopChapter: boolean = false,
    voiceSettings?: { pitch?: number; rate?: number; voice?: SpeechSynthesisVoice },
    version: string = 'kjv'
  ) => {
    try {
      console.log(`🎵 Playing Bible chapter: ${book} ${chapter}`);
      
      setAudioState(prev => ({
        ...prev,
        isLoading: true,
        currentBook: book,
        currentChapter: chapter,
        currentText: text,
        currentVersion: version,
        autoPlayNext,
        loopChapter,
        voiceSettings: voiceSettings ? {
          pitch: voiceSettings.pitch ?? prev.voiceSettings?.pitch ?? 1.0,
          rate: voiceSettings.rate ?? prev.voiceSettings?.rate ?? 1.0,
          voice: voiceSettings.voice ?? prev.voiceSettings?.voice
        } : prev.voiceSettings
      }));

      // Use TTS for now
      await speakText(text, voiceSettings);

      // Handle auto-play next chapter if enabled
      if (autoPlayNext && !isAutoAdvancingRef.current) {
        console.log('🎵 Auto-playing next chapter after TTS completion');
        goToNextChapter();
      }

    } catch (error) {
      console.error('🎵 Error playing Bible chapter:', error);
      setAudioState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isPaused: false, 
        isLoading: false 
      }));
    }
  }, [speakText]);

  const pause = useCallback(() => {
    console.log('🎵 Pausing audio');
    
    // Pause TTS
    if (speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
    
    // Pause HTML5 audio
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      currentAudioRef.current.pause();
    }
    
    setAudioState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    console.log('🎵 Resuming audio');
    
    // Resume TTS
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
    }
    
    // Resume HTML5 audio
    if (currentAudioRef.current && currentAudioRef.current.paused) {
      currentAudioRef.current.play().catch(console.error);
    }
    
    setAudioState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
  }, []);

  const stop = useCallback(() => {
    console.log('🎵 Stopping audio');
    
    // Clear any pending timeouts
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
    
    // Stop TTS
    speechSynthesis.cancel();
    currentUtteranceRef.current = null;
    
    // Stop HTML5 audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    
    setAudioState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      isLoading: false
    }));
  }, []);

  const reset = useCallback(() => {
    console.log('🎵 Resetting audio state');
    stop();
    setAudioState(prev => ({
      ...prev,
      currentBook: '',
      currentChapter: 0,
      currentText: '',
      autoPlayNext: false,
      loopChapter: false
    }));
  }, [stop]);

  const setAutoPlayNext = useCallback((enabled: boolean) => {
    console.log(`🎵 Setting auto-play next: ${enabled}`);
    setAudioState(prev => ({ ...prev, autoPlayNext: enabled }));
  }, []);

  const goToNextChapter = useCallback(() => {
    if (isAutoAdvancingRef.current) return;
    
    const { currentBook, currentChapter } = audioState;
    if (!currentBook) return;
    
    isAutoAdvancingRef.current = true;
    
    // Flatten bible books structure to find the book
    const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
    const bookInfo = allBooks.find(book => 
      book.name.toLowerCase() === currentBook.toLowerCase() || 
      book.apiName.toLowerCase() === currentBook.toLowerCase()
    );
    
    if (bookInfo) {
      const nextChapter = currentChapter + 1;
      
      if (nextChapter <= bookInfo.chapters) {
        console.log(`🎵 Going to next chapter: ${currentBook} ${nextChapter}`);
        if (chapterChangeCallbackRef.current) {
          chapterChangeCallbackRef.current(nextChapter, true);
        }
      } else {
        console.log('🎵 Reached end of book');
      }
    }
    
    // Reset flag after a brief delay
    setTimeout(() => {
      isAutoAdvancingRef.current = false;
    }, 1000);
  }, [audioState]);

  const goToPreviousChapter = useCallback(() => {
    const { currentBook, currentChapter } = audioState;
    if (!currentBook || currentChapter <= 1) return;
    
    const previousChapter = currentChapter - 1;
    console.log(`🎵 Going to previous chapter: ${currentBook} ${previousChapter}`);
    
    if (chapterChangeCallbackRef.current) {
      chapterChangeCallbackRef.current(previousChapter, false);
    }
  }, [audioState]);

  const setChapterChangeCallback = useCallback((callback: (chapter: number, isAutoPlay: boolean) => void) => {
    chapterChangeCallbackRef.current = callback;
  }, []);

  const setBookChangeCallback = useCallback((callback: (book: string, chapter: number, isAutoPlay: boolean) => void) => {
    bookChangeCallbackRef.current = callback;
  }, []);

  const contextValue: GlobalAudioContextType = {
    audioState,
    playBibleChapter,
    pause,
    resume,
    stop,
    reset,
    setAutoPlayNext,
    goToNextChapter,
    goToPreviousChapter,
    setChapterChangeCallback,
    setBookChangeCallback
  };

  return (
    <GlobalAudioContext.Provider value={contextValue}>
      {children}
    </GlobalAudioContext.Provider>
  );
};

export default GlobalAudioProvider;