import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { audioService } from '@/services/audioService';
import { enhancedApiBibleService } from '@/services/enhancedApiBibleService';
import { bibleBooks } from '@/components/bible/BibleBookList';
import { enhancedTTSService, EnhancedVoiceSettings } from '@/services/enhancedTTSService';
import { iosAudioService, IOSAudioSettings } from '@/services/iosAudioService';
import { enhancedIPhoneVoiceService, EnhancedIPhoneVoiceSettings } from '@/services/enhancedIPhoneVoiceService';
import { realisticBibleSpeechService, RealisticSpeechSettings } from '@/services/realisticBibleSpeechService';
import { audioBibleService } from '@/services/audioBibleService';
import { supabaseAudioService } from '@/services/supabaseAudioService';

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
  audioUrl?: string;
  hasAudio: boolean;
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
  playBibleChapterMP3: (book: string, chapter: number, version: string, autoPlayNext?: boolean, loopChapter?: boolean) => Promise<void>;
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
    audioUrl: undefined,
    hasAudio: false,
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
      
      // Set up media session controls for background audio
      if ('mediaSession' in navigator) {
        console.log('🎵 GlobalAudioContext: Setting up enhanced media session controls for background audio');
        navigator.mediaSession.setActionHandler('play', () => {
          console.log('🎵 Media Session: Play from background');
          resume();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          console.log('🎵 Media Session: Pause from background');
          pause();
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          console.log('🎵 Media Session: Stop from background');
          stop();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          console.log('🎵 Media Session: Previous track from background');
          goToPreviousChapter();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          console.log('🎵 Media Session: Next track from background');
          goToNextChapter();
        });
        
        // Enable background audio features
        try {
          navigator.mediaSession.setPositionState({
            duration: 0,
            playbackRate: 1,
            position: 0
          });
        } catch (error) {
          console.warn('🎵 Failed to set position state:', error);
        }
      }
    }

    // Enhanced page visibility handling for background audio
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🎵 GlobalAudioContext: Page hidden, enabling background audio mode');
        
        // Ensure audio continues in background
        if (currentAudioRef.current && !currentAudioRef.current.paused) {
          console.log('🎵 Audio playing in background, maintaining playback');
          
          // Update media session for background mode
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        }
      } else {
        console.log('🎵 GlobalAudioContext: Page visible, resuming foreground audio mode');
        
        // Resume audio context if suspended
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(console.error);
        }
        
        // Check for any pending chapter changes from service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'PENDING_CHAPTER_CHANGE') {
              console.log('🎵 Found pending chapter change from background:', event.data.data);
              const { book, chapter, isAutoPlay } = event.data.data;
              
              // Apply the pending chapter change
              if (chapterChangeCallbackRef.current) {
                chapterChangeCallbackRef.current(chapter, isAutoPlay);
              } else if (bookChangeCallbackRef.current) {
                bookChangeCallbackRef.current(book, chapter, isAutoPlay);
              }
            }
          };
          
          navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_PENDING_CHAPTER_CHANGE'
          }, [messageChannel.port2]);
        }
      }
    };

    // Add event listeners for background audio support
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Enhanced service worker message handling for background audio
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('🎵 GlobalAudioContext: Service worker message:', event.data);
      
      if (event.data.type === 'BACKGROUND_NEXT_CHAPTER' || event.data.type === 'EXECUTE_NEXT_CHAPTER') {
        const { book, chapter, isAutoPlay } = event.data;
        console.log(`🎵 Background next chapter triggered: ${book} ${chapter}`);
        
        // Execute the chapter change
        if (chapterChangeCallbackRef.current) {
          chapterChangeCallbackRef.current(chapter, isAutoPlay || true);
        } else if (bookChangeCallbackRef.current) {
          bookChangeCallbackRef.current(book, chapter, isAutoPlay || true);
        }
      }
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      
      // Register this audio context with service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REGISTER_AUDIO_CONTEXT'
        });
      }
    }

    console.log('🎵 GlobalAudioContext: Enhanced background audio session setup complete');

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
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

  const playBibleChapterMP3 = useCallback(async (
    book: string, 
    chapter: number, 
    version: string, 
    autoPlayNext: boolean = false, 
    loopChapter: boolean = false
  ) => {
    try {
      console.log(`🎵 Playing Bible chapter MP3: ${book} ${chapter} (${version})`);
      
      setAudioState(prev => ({
        ...prev,
        isLoading: true,
        currentBook: book,
        currentChapter: chapter,
        currentVersion: version,
        autoPlayNext,
        loopChapter,
        audioUrl: undefined,
        hasAudio: false
      }));

      // Load MP3 audio from Supabase
      const audioUrl = await supabaseAudioService.getAudioUrl(book, chapter, version);
      
      if (!audioUrl) {
        throw new Error(`No MP3 audio available for ${book} ${chapter} (${version})`);
      }

      // Create or update audio element
      if (!currentAudioRef.current) {
        currentAudioRef.current = new Audio();
        currentAudioRef.current.preload = 'auto';
        currentAudioRef.current.volume = 1.0;
        
        // Enhanced event listeners for background audio support
        currentAudioRef.current.addEventListener('ended', () => {
          console.log(`🎵 MP3 audio ended for ${book} ${chapter}, document.hidden: ${document.hidden}`);
          
          // Notify service worker about audio end for background processing
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'AUDIO_ENDED',
              book,
              chapter,
              autoPlayNext: audioState.autoPlayNext
            });
          }
          
          setAudioState(prev => {
            // Enhanced auto-play logic for background scenarios
            if (prev.autoPlayNext && !isAutoAdvancingRef.current) {
              console.log('🎵 Auto-playing next chapter after MP3 completion (background-aware)');
              
              // Multiple strategies for background execution
              const executeNextChapter = () => {
                console.log('🎵 Executing next chapter transition');
                goToNextChapter();
              };
              
              if (document.hidden) {
                // Background execution - use service worker
                console.log('🎵 App in background, using service worker for next chapter');
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.controller.postMessage({
                    type: 'SCHEDULE_NEXT_CHAPTER',
                    book,
                    chapter
                  });
                }
                // Also schedule locally as fallback
                setTimeout(executeNextChapter, 100);
              } else {
                // Foreground execution
                if (window.requestIdleCallback) {
                  window.requestIdleCallback(executeNextChapter, { timeout: 1000 });
                } else {
                  setTimeout(executeNextChapter, 100);
                }
              }
            }
            
            return { ...prev, isPlaying: false, isPaused: false };
          });
        });

        currentAudioRef.current.addEventListener('pause', () => {
          setAudioState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
        });

        currentAudioRef.current.addEventListener('play', () => {
          setAudioState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
        });

        currentAudioRef.current.addEventListener('error', (error) => {
          console.error('🎵 MP3 audio error:', error);
          setAudioState(prev => ({ 
            ...prev, 
            isPlaying: false, 
            isPaused: false, 
            isLoading: false,
            hasAudio: false
          }));
        });
      }

      // Set audio source and play
      currentAudioRef.current.src = audioUrl;
      currentAudioRef.current.load();
      
      await currentAudioRef.current.play();
      
      setAudioState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: true,
        isPaused: false,
        audioUrl,
        hasAudio: true
      }));

      // Update media session with enhanced metadata for background audio
      if ('mediaSession' in navigator) {
        const metadata = new MediaMetadata({
          title: `${book} ${chapter}`,
          artist: 'Bible Audio',
          album: version.toUpperCase(),
          artwork: [
            { src: '/bible-icon.svg', sizes: '96x96', type: 'image/svg+xml' },
            { src: '/bible-icon.svg', sizes: '128x128', type: 'image/svg+xml' },
            { src: '/bible-icon.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/bible-icon.svg', sizes: '256x256', type: 'image/svg+xml' },
            { src: '/bible-icon.svg', sizes: '384x384', type: 'image/svg+xml' },
            { src: '/bible-icon.svg', sizes: '512x512', type: 'image/svg+xml' }
          ]
        });
        navigator.mediaSession.metadata = metadata;
        navigator.mediaSession.playbackState = 'playing';
        
        // Update position state for background audio tracking
        try {
          if (currentAudioRef.current) {
            navigator.mediaSession.setPositionState({
              duration: currentAudioRef.current.duration || 0,
              playbackRate: currentAudioRef.current.playbackRate || 1,
              position: currentAudioRef.current.currentTime || 0
            });
          }
        } catch (error) {
          console.warn('🎵 Failed to update position state:', error);
        }
        
        console.log('🎵 Media session updated for background audio:', {
          title: `${book} ${chapter}`,
          artist: 'Bible Audio',
          album: version.toUpperCase()
        });
      }

      // Notify service worker about current audio state
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'AUDIO_STATE_UPDATE',
          book,
          chapter,
          version,
          autoPlayNext,
          loopChapter,
          audioUrl
        });
      }

    } catch (error) {
      console.error('🎵 Error playing Bible chapter MP3:', error);
      setAudioState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isPaused: false, 
        isLoading: false,
        hasAudio: false
      }));
    }
  }, []);

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
      isLoading: false,
      hasAudio: false,
      audioUrl: undefined
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
    
    console.log('🎵 goToNextChapter called, document.hidden:', document.hidden);
    
    setAudioState(prev => {
      const { currentBook, currentChapter } = prev;
      if (!currentBook) return prev;
      
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
          
          // Use a more robust callback mechanism for background scenarios
          const triggerChapterChange = () => {
            if (chapterChangeCallbackRef.current) {
              try {
                chapterChangeCallbackRef.current(nextChapter, true);
              } catch (error) {
                console.error('🎵 Error in chapter change callback:', error);
              }
            }
          };
          
          // For background scenarios, use multiple fallback mechanisms
          if (document.hidden) {
            // When in background, try multiple approaches
            triggerChapterChange();
            
            // Also try with a delay as backup
            setTimeout(triggerChapterChange, 200);
            
            // Send message to service worker as additional backup
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'AUDIO_CHAPTER_CHANGE',
                book: currentBook,
                chapter: nextChapter,
                isAutoPlay: true
              });
            }
          } else {
            triggerChapterChange();
          }
        } else {
          // Move to next book
          const currentBookIndex = allBooks.findIndex(book => 
            book.name.toLowerCase() === currentBook.toLowerCase() || 
            book.apiName.toLowerCase() === currentBook.toLowerCase()
          );
          
          if (currentBookIndex < allBooks.length - 1) {
            const nextBook = allBooks[currentBookIndex + 1];
            console.log(`🎵 Moving to next book: ${nextBook.name} chapter 1`);
            
            const triggerBookChange = () => {
              if (bookChangeCallbackRef.current) {
                try {
                  bookChangeCallbackRef.current(nextBook.apiName, 1, true);
                } catch (error) {
                  console.error('🎵 Error in book change callback:', error);
                }
              }
            };
            
            if (document.hidden) {
              triggerBookChange();
              setTimeout(triggerBookChange, 200);
            } else {
              triggerBookChange();
            }
          } else {
            console.log('🎵 Reached end of Bible - no more books');
          }
        }
      }
      
      // Reset flag after a brief delay
      setTimeout(() => {
        isAutoAdvancingRef.current = false;
      }, 1000);
      
      return prev;
    });
  }, []);

  const goToPreviousChapter = useCallback(() => {
    setAudioState(prev => {
      const { currentBook, currentChapter } = prev;
      if (!currentBook || currentChapter <= 1) return prev;
      
      const previousChapter = currentChapter - 1;
      console.log(`🎵 Going to previous chapter: ${currentBook} ${previousChapter}`);
      
      if (chapterChangeCallbackRef.current) {
        chapterChangeCallbackRef.current(previousChapter, false);
      }
      
      return prev;
    });
  }, []);

  const setChapterChangeCallback = useCallback((callback: (chapter: number, isAutoPlay: boolean) => void) => {
    chapterChangeCallbackRef.current = callback;
  }, []);

  const setBookChangeCallback = useCallback((callback: (book: string, chapter: number, isAutoPlay: boolean) => void) => {
    bookChangeCallbackRef.current = callback;
  }, []);

  const contextValue: GlobalAudioContextType = {
    audioState,
    playBibleChapter,
    playBibleChapterMP3,
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