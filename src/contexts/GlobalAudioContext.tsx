import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { supabaseAudioService } from '@/services/supabaseAudioService';
import { bibleBooks } from '@/components/bible/BibleBookList';
import { normalizeBookApiName } from '@/components/bible/bookUtils';

// ── Background Audio Persistence Helpers ──
const AUDIO_STATE_KEY = 'powerhouse_audio_state';

interface PersistedAudioState {
  book: string;
  chapter: number;
  version: string;
  autoPlayNext: boolean;
  loopChapter: boolean;
  loopBook: boolean;
  isPlaying: boolean;
  timestamp: number;
}

const persistAudioState = (state: PersistedAudioState) => {
  try {
    localStorage.setItem(AUDIO_STATE_KEY, JSON.stringify(state));
  } catch { /* quota errors are non-fatal */ }
};

const loadPersistedAudioState = (): PersistedAudioState | null => {
  try {
    const raw = localStorage.getItem(AUDIO_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const clearPersistedAudioState = () => {
  try { localStorage.removeItem(AUDIO_STATE_KEY); } catch { /* */ }
};

// Create a single, persistent audio element to be used throughout the app.
// This singleton approach prevents duplicate audio instances when interacting with
// external controls like the iOS lock screen.
let audio: HTMLAudioElement;
if (typeof window !== 'undefined') {
  audio = new Audio();
  audio.preload = 'auto';
  audio.volume = 1.0;
  // Required for audio to play in the background on iOS
  (audio as any).playsInline = true;
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
}

interface GlobalAudioState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentBook: string;
  currentChapter: number;
  currentVersion: string;
  autoPlayNext: boolean;
  loopChapter: boolean;
  loopBook: boolean;
  audioUrl?: string;
  hasAudio: boolean;
  // Generic Track Support
  trackTitle?: string;
  trackArtist?: string;
  trackImage?: string;
  isBibleMode: boolean;
  isMiniPlayerHidden: boolean;
  duration: number;
  currentTime: number;
}

interface GlobalAudioContextType {
  audioState: GlobalAudioState;
  setIsMiniPlayerHidden: (hidden: boolean) => void;
  seek: (time: number) => void;
  playBibleChapterMP3: (book: string, chapter: number, version: string, autoPlayNext?: boolean, loopChapter?: boolean) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  setAutoPlayNext: (enabled: boolean) => void;
  setLoopChapter: (enabled: boolean) => void;
  setLoopBook: (enabled: boolean) => void;
  goToNextChapter: () => void;
  goToPreviousChapter: () => void;
  setChapterChangeCallback: (callback: (chapter: number, isAutoPlay: boolean) => void) => void;
  setBookChangeCallback: (callback: (book: string, chapter: number, isAutoPlay: boolean) => void) => void;
  playTrack: (url: string, title: string, artist: string, image?: string) => Promise<void>;
}

const GlobalAudioContext = createContext<GlobalAudioContextType | undefined>(undefined);

export const useGlobalAudio = () => {
  const context = useContext(GlobalAudioContext);
  if (!context) {
    throw new Error('useGlobalAudio must be used within a GlobalAudioProvider');
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
    currentVersion: 'kjv',
    autoPlayNext: false,
    loopChapter: false,
    loopBook: false,
    audioUrl: undefined,
    hasAudio: false,
    trackTitle: '',
    trackArtist: '',
    trackImage: '',
    isBibleMode: true,
    isMiniPlayerHidden: false,
    duration: 0,
    currentTime: 0,
  });

  // Keep a ref to the latest state for event listeners to avoid re-binding
  const audioStateRef = useRef<GlobalAudioState>(audioState);
  useEffect(() => {
    audioStateRef.current = audioState;
  }, [audioState]);

  const isAutoAdvancingRef = useRef<boolean>(false);
  const chapterChangeCallbackRef = useRef<((chapter: number, isAutoPlay: boolean) => void) | null>(null);
  const bookChangeCallbackRef = useRef<((book: string, chapter: number, isAutoPlay: boolean) => void) | null>(null);
  const nextChapterUrlRef = useRef<{ url: string; book: string; chapter: number } | null>(null);
  const wakeLockRef = useRef<any>(null);
  const autoAdvanceRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Wake Lock helpers ──
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('🔒 Wake Lock acquired');
        wakeLockRef.current.addEventListener('release', () => {
          console.log('🔓 Wake Lock released');
        });
      }
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => { });
      wakeLockRef.current = null;
      console.log('🔓 Wake Lock released manually');
    }
  }, []);

  const prefetchNextChapter = useCallback(async (book: string, chapter: number, version: string) => {
    try {
      const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
      const bookInfo = allBooks.find(b => b.apiName.toLowerCase() === book.toLowerCase());

      let nextBook = book;
      let nextChapter = chapter + 1;

      if (bookInfo && nextChapter > bookInfo.chapters) {
        // Check if loopBook is enabled
        if (audioStateRef.current.loopBook) {
          // Loop Book: prefetch chapter 1 of the same book
          nextChapter = 1;
        } else {
          const currentBookIndex = allBooks.findIndex(b => b.apiName.toLowerCase() === book.toLowerCase());
          if (currentBookIndex < allBooks.length - 1) {
            nextBook = allBooks[currentBookIndex + 1].apiName;
            nextChapter = 1;
          } else {
            nextChapterUrlRef.current = null;
            return;
          }
        }
      }

      console.log(`🎵 Prefetching next chapter URL: ${nextBook} ${nextChapter}`);
      const url = await supabaseAudioService.getAudioUrl(nextBook, nextChapter, version);
      if (url) {
        nextChapterUrlRef.current = { url, book: nextBook, chapter: nextChapter };
      } else {
        nextChapterUrlRef.current = null;
      }
    } catch (error) {
      console.error('Failed to prefetch next chapter:', error);
      nextChapterUrlRef.current = null;
    }
  }, []);

  const playTrack = useCallback(async (url: string, title: string, artist: string, image?: string) => {
    setAudioState(prev => ({ ...prev, isLoading: true }));
    try {
      setAudioState(prev => ({
        ...prev,
        audioUrl: url,
        hasAudio: true,
        isLoading: false,
        trackTitle: title,
        trackArtist: artist,
        trackImage: image,
        isBibleMode: false,
        isPlaying: true,
        isPaused: false,
        currentTime: 0,
        duration: 0
      }));

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title,
          artist: artist,
          artwork: image ? [{ src: image, sizes: '512x512', type: 'image/jpeg' }] : undefined,
        });
      }

      audio.src = url;
      audio.load();
      await audio.play();
    } catch (error) {
      console.error(`Failed to play generic track: ${url}`, error);
      setAudioState(prev => ({ ...prev, isLoading: false, isPlaying: false }));
    }
  }, []);

  const playBibleChapterMP3 = useCallback(async (
    book: string,
    chapter: number,
    version: string,
    autoPlayNext = false,
    loopChapter = false
  ) => {
    // NOTE: loopBook is intentionally NOT a parameter.
    // It is read from audioStateRef.current so setLoopBook() is the single source of truth.
    // This prevents any caller with a stale value from overwriting the user's toggle preference.
    const normalizedBook = normalizeBookApiName(book);
    setAudioState(prev => ({ ...prev, isLoading: true }));


    // Always read loopBook from the live ref — never from a parameter
    const loopBook = audioStateRef.current.loopBook;

    // Immediately sync the ref to reflect the new state (prevents handleEnded from seeing stale metadata)
    audioStateRef.current = {
      ...audioStateRef.current,
      currentBook: normalizedBook,
      currentChapter: chapter,
      currentVersion: version,
      autoPlayNext,
      loopChapter,
      loopBook,
      isLoading: true
    };

    try {
      let audioUrl = null;
      if (nextChapterUrlRef.current &&
        nextChapterUrlRef.current.book === normalizedBook &&
        nextChapterUrlRef.current.chapter === chapter &&
        audioStateRef.current.autoPlayNext &&
        isAutoAdvancingRef.current) {
        console.log('🎵 Using prefetched audio URL for smooth transition');
        audioUrl = nextChapterUrlRef.current.url;
      } else {
        audioUrl = await supabaseAudioService.getAudioUrl(book, chapter, version);
      }

      if (!audioUrl) throw new Error('Audio URL not found.');

      const formatBookName = (apiName: string) => {
        const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
        const foundBook = allBooks.find(b => b.apiName.toLowerCase() === apiName.toLowerCase());
        return foundBook ? foundBook.name : apiName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      };

      const displayBookName = formatBookName(book);

      const newState = {
        ...audioStateRef.current,
        currentBook: normalizedBook,
        currentChapter: chapter,
        currentVersion: version,
        autoPlayNext,
        loopChapter,
        loopBook,   // always from audioStateRef.current — set only via setLoopBook()
        audioUrl,
        hasAudio: true,
        isLoading: false,
        isBibleMode: true,
        trackTitle: `${displayBookName} ${chapter}`,
        trackArtist: `${version.toUpperCase()} Audio Bible`,
        trackImage: '/church-logo.png',
        currentTime: 0,
        duration: 0
      };

      setAudioState(newState);
      audioStateRef.current = newState;

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${displayBookName} ${chapter}`,
          artist: 'Bible Audio',
          album: version.toUpperCase(),
          artwork: [
            { src: '/church-logo.png', sizes: '512x512', type: 'image/png' },
          ],
        });
      }

      audio.src = audioUrl;
      audio.loop = loopChapter;
      audio.load();
      await audio.play();

      // Acquire Wake Lock to keep CPU alive during background playback
      requestWakeLock();

      // Persist state for recovery if the app/tab gets killed
      persistAudioState({
        book, chapter, version, autoPlayNext, loopChapter, loopBook,
        isPlaying: true, timestamp: Date.now()
      });

      const updatePosition = () => {
        if ('mediaSession' in navigator && audio.duration) {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
          });
        }
      };

      if (audio.duration) {
        updatePosition();
      } else {
        audio.addEventListener('loadedmetadata', updatePosition, { once: true });
      }

      prefetchNextChapter(book, chapter, version);

    } catch (error) {
      console.error('Failed to play MP3:', error);
      setAudioState(prev => ({ ...prev, isLoading: false, hasAudio: false, isPlaying: false, isPaused: false }));
    }
  }, [prefetchNextChapter, requestWakeLock]);

  const pause = useCallback(() => {
    console.log('UI or Media Session: Pause requested');
    audio.pause();
  }, []);

  const resume = useCallback(() => {
    console.log('UI or Media Session: Resume requested');
    if (audio.src) {
      audio.play().catch(console.error);
    } else if (audioStateRef.current.currentBook) {
      playBibleChapterMP3(
        audioStateRef.current.currentBook,
        audioStateRef.current.currentChapter,
        audioStateRef.current.currentVersion,
        audioStateRef.current.autoPlayNext,
        audioStateRef.current.loopChapter
      );
    }
  }, [playBibleChapterMP3]);

  const reset = useCallback(() => {
    console.log('UI: Reset requested');
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
    audio.load();
    releaseWakeLock();
    clearPersistedAudioState();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;
    }
    setAudioState({
      isPlaying: false,
      isPaused: false,
      isLoading: false,
      currentBook: '',
      currentChapter: 0,
      currentVersion: 'kjv',
      autoPlayNext: false,
      loopChapter: false,
      loopBook: false,
      audioUrl: undefined,
      hasAudio: false,
      trackTitle: '',
      trackArtist: '',
      trackImage: '',
      isBibleMode: true,
      isMiniPlayerHidden: false,
      duration: 0,
      currentTime: 0,
    });
  }, [releaseWakeLock]);

  const goToNextChapter = useCallback(() => {
    if (isAutoAdvancingRef.current) return;
    isAutoAdvancingRef.current = true;

    const { currentBook, currentChapter, currentVersion, autoPlayNext, loopChapter, loopBook } = audioStateRef.current;
    console.log(`🔁 goToNextChapter: book=${currentBook} ch=${currentChapter} autoPlay=${autoPlayNext} loopChapter=${loopChapter} loopBook=${loopBook}`);
    if (!currentBook) {
      isAutoAdvancingRef.current = false;
      return;
    }

    const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
    const bookInfo = allBooks.find(b => b.apiName.toLowerCase() === currentBook.toLowerCase());

    if (bookInfo && currentChapter < bookInfo.chapters) {
      const nextChapter = currentChapter + 1;
      playBibleChapterMP3(currentBook, nextChapter, currentVersion, autoPlayNext, loopChapter);
      if (chapterChangeCallbackRef.current) {
        chapterChangeCallbackRef.current(nextChapter, true);
      }
    } else if (bookInfo) {
      // Reached the last chapter of the book
      if (loopBook) {
        // Loop Book is ON — go back to chapter 1 of THIS book
        console.log(`🔁 Loop Book: Restarting ${currentBook} from chapter 1`);
        playBibleChapterMP3(currentBook, 1, currentVersion, autoPlayNext, loopChapter);
        if (chapterChangeCallbackRef.current) {
          chapterChangeCallbackRef.current(1, true);
        }
      } else {
        // Normal behaviour — advance to the next book
        const currentBookIndex = allBooks.findIndex(b => b.apiName.toLowerCase() === currentBook.toLowerCase());
        if (currentBookIndex < allBooks.length - 1) {
          const nextBook = allBooks[currentBookIndex + 1];
          playBibleChapterMP3(nextBook.apiName, 1, currentVersion, autoPlayNext, loopChapter);
          if (bookChangeCallbackRef.current) {
            bookChangeCallbackRef.current(nextBook.apiName, 1, true);
          }
        } else {
          console.log('End of Bible');
          reset();
        }
      }
    }

    setTimeout(() => {
      isAutoAdvancingRef.current = false;
    }, 1500);

  }, [playBibleChapterMP3, reset]);

  const goToPreviousChapter = useCallback(() => {
    const { currentBook, currentChapter, currentVersion, autoPlayNext, loopChapter, loopBook } = audioStateRef.current;
    if (!currentBook) return;

    const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
    const bookInfo = allBooks.find(b => b.apiName.toLowerCase() === currentBook.toLowerCase());

    if (bookInfo && currentChapter > 1) {
      const prevChapter = currentChapter - 1;
      playBibleChapterMP3(currentBook, prevChapter, currentVersion, autoPlayNext, loopChapter);
      if (chapterChangeCallbackRef.current) {
        chapterChangeCallbackRef.current(prevChapter, false);
      }
    } else if (bookInfo) {
      const currentBookIndex = allBooks.findIndex(b => b.apiName.toLowerCase() === currentBook.toLowerCase());
      if (currentBookIndex > 0) {
        const prevBook = allBooks[currentBookIndex - 1];
        const lastChapterOfPrevBook = prevBook.chapters;
        playBibleChapterMP3(prevBook.apiName, lastChapterOfPrevBook, currentVersion, autoPlayNext, loopChapter);
        if (bookChangeCallbackRef.current) {
          bookChangeCallbackRef.current(prevBook.apiName, lastChapterOfPrevBook, false);
        }
      }
    }
  }, [playBibleChapterMP3]);

  useEffect(() => {
    const handlePlay = () => {
      setAudioState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const handlePause = () => {
      setAudioState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const handleEnded = () => {
      const { loopChapter, autoPlayNext, currentBook, currentChapter, loopBook } = audioStateRef.current;
      console.log(`🎵 handleEnded fired: book=${currentBook} ch=${currentChapter} autoPlay=${autoPlayNext} loopChapter=${loopChapter} loopBook=${loopBook}`);

      // Clear any pending retry
      if (autoAdvanceRetryRef.current) {
        clearTimeout(autoAdvanceRetryRef.current);
        autoAdvanceRetryRef.current = null;
      }

      if (loopChapter) {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else if (autoPlayNext) {
        // Notify service worker as a backup channel
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'AUDIO_ENDED',
            book: currentBook,
            chapter: currentChapter,
            autoPlayNext
          });
        }
        goToNextChapter();

        // Safety net: if goToNextChapter didn't start new audio within 5s, retry once
        autoAdvanceRetryRef.current = setTimeout(() => {
          if (audio.paused && audioStateRef.current.autoPlayNext && !isAutoAdvancingRef.current) {
            console.warn('🎵 Auto-advance safety retry triggered');
            goToNextChapter();
          }
        }, 5000);
      } else {
        releaseWakeLock();
        clearPersistedAudioState();
        setAudioState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      }
    };

    const startWatchdog = () => {
      const watchdogTimer = setInterval(() => {
        if (!audio.paused && audio.duration > 0) {
          const timeLeft = audio.duration - audio.currentTime;
          if (timeLeft < 1 && audioStateRef.current.autoPlayNext && !isAutoAdvancingRef.current) {
            handleEnded();
          }
        }
      }, 500);
      return watchdogTimer;
    };

    const handleTimeUpdate = () => {
      const now = audio.currentTime;
      setAudioState(prev => {
        if (Math.abs(prev.currentTime - now) > 0.5) {
          return { ...prev, currentTime: now };
        }
        return prev;
      });

      if ('mediaSession' in navigator && audio.duration && Math.floor(audio.currentTime) % 5 === 0) {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: audio.currentTime,
        });
      }
    };

    const handleLoadedMetadata = () => {
      setAudioState(prev => ({ ...prev, duration: audio.duration }));
    };

    const handleError = (e: Event) => {
      console.error('❌ Audio playback error:', e);
      setAudioState(prev => ({ ...prev, isLoading: false, hasAudio: false, isPlaying: false, isPaused: false }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    const watchdogTimer = startWatchdog();

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', resume);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('stop', reset);
      navigator.mediaSession.setActionHandler('nexttrack', goToNextChapter);
      navigator.mediaSession.setActionHandler('previoustrack', goToPreviousChapter);
    }

    // ── Visibility change recovery ──
    // When user returns to the app, check if audio stalled and needs recovery
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🎵 App returned to foreground — checking audio state');
        const state = audioStateRef.current;

        // Re-acquire wake lock (OS releases it when page is hidden)
        if (state.isPlaying || (state.autoPlayNext && audio.src)) {
          requestWakeLock();
        }

        // Case 1: Audio ended while backgrounded but handleEnded never ran
        if (audio.duration > 0 && audio.currentTime >= audio.duration - 0.5 && audio.paused) {
          if (state.autoPlayNext && !isAutoAdvancingRef.current) {
            console.warn('🎵 Visibility recovery: audio ended in background, advancing...');
            goToNextChapter();
            return;
          }
        }

        // Case 2: Audio was paused unexpectedly by the OS (not by user)
        if (audio.paused && state.isPlaying && !state.isPaused && audio.src) {
          console.warn('🎵 Visibility recovery: audio was paused by OS, resuming...');
          audio.play().catch(err => {
            console.error('Failed to resume audio after visibility change:', err);
          });
        }

        // Case 3: Check persisted state for full recovery (tab/app was killed)
        const persisted = loadPersistedAudioState();
        if (persisted && persisted.isPlaying && !audio.src && persisted.autoPlayNext) {
          const staleMs = Date.now() - persisted.timestamp;
          // Only auto-recover if the state is less than 2 hours old
          if (staleMs < 2 * 60 * 60 * 1000) {
            console.warn('🎵 Visibility recovery: restoring persisted session', persisted);
            // Restore the loopBook preference into the ref BEFORE playing
            if (persisted.loopBook) {
              audioStateRef.current = { ...audioStateRef.current, loopBook: true };
            }
            playBibleChapterMP3(
              persisted.book,
              persisted.chapter,
              persisted.version,
              persisted.autoPlayNext,
              persisted.loopChapter
            );
          } else {
            clearPersistedAudioState();
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ── Service Worker message listener ──
    // Handle BACKGROUND_NEXT_CHAPTER / EXECUTE_NEXT_CHAPTER from SW
    const handleSWMessage = (event: MessageEvent) => {
      const { data } = event;
      if (!data || !data.type) return;

      if (data.type === 'BACKGROUND_NEXT_CHAPTER' || data.type === 'EXECUTE_NEXT_CHAPTER') {
        console.log('🎵 Received SW message:', data.type, data);
        if (!isAutoAdvancingRef.current && audioStateRef.current.autoPlayNext) {
          goToNextChapter();
        }
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      clearInterval(watchdogTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    };
  }, [goToNextChapter, goToPreviousChapter, reset, pause, resume, requestWakeLock, playBibleChapterMP3]);

  const stop = useCallback(() => {
    audio.pause();
    audio.currentTime = 0;
    releaseWakeLock();
    clearPersistedAudioState();
    setAudioState(prev => ({ ...prev, isPlaying: false }));
  }, [releaseWakeLock]);

  const setAutoPlayNext = useCallback((enabled: boolean) => {
    // Update the ref immediately so event listeners (handleEnded) see the new value
    audioStateRef.current = { ...audioStateRef.current, autoPlayNext: enabled };
    setAudioState(prev => ({ ...prev, autoPlayNext: enabled }));
  }, []);

  const setLoopChapter = useCallback((enabled: boolean) => {
    setAudioState(prev => ({ ...prev, loopChapter: enabled }));
    if (audio) {
      audio.loop = enabled;
    }
  }, []);

  const setLoopBook = useCallback((enabled: boolean) => {
    // Update the ref immediately so event listeners (handleEnded → goToNextChapter) see the new value
    audioStateRef.current = { ...audioStateRef.current, loopBook: enabled };
    setAudioState(prev => ({ ...prev, loopBook: enabled }));
  }, []);

  const setChapterChangeCallback = useCallback((callback: (chapter: number, isAutoPlay: boolean) => void) => {
    chapterChangeCallbackRef.current = callback;
  }, []);

  const setBookChangeCallback = useCallback((callback: (book: string, chapter: number, isAutoPlay: boolean) => void) => {
    bookChangeCallbackRef.current = callback;
  }, []);

  const setIsMiniPlayerHidden = useCallback((hidden: boolean) => {
    setAudioState(prev => ({ ...prev, isMiniPlayerHidden: hidden }));
  }, []);

  const seek = useCallback((time: number) => {
    if (Number.isFinite(time)) {
      audio.currentTime = time;
      setAudioState(prev => ({ ...prev, currentTime: time }));
    }
  }, []);

  const contextValue: GlobalAudioContextType = {
    audioState,
    setIsMiniPlayerHidden,
    seek,
    playBibleChapterMP3,
    pause,
    resume,
    stop,
    reset,
    setAutoPlayNext,
    setLoopChapter,
    setLoopBook,
    goToNextChapter,
    goToPreviousChapter,
    setChapterChangeCallback,
    setBookChangeCallback,
    playTrack,
  };

  return (
    <GlobalAudioContext.Provider value={contextValue}>
      {children}
    </GlobalAudioContext.Provider>
  );
};

export default GlobalAudioProvider;
