import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { supabaseAudioService } from '@/services/supabaseAudioService';
import { bibleBooks } from '@/components/bible/BibleBookList';

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
  isLoading: boolean;
  currentBook: string;
  currentChapter: number;
  currentVersion: string;
  autoPlayNext: boolean;
  loopChapter: boolean;
  audioUrl?: string;
  hasAudio: boolean;
}

interface GlobalAudioContextType {
  audioState: GlobalAudioState;
  playBibleChapterMP3: (book: string, chapter: number, version: string, autoPlayNext?: boolean, loopChapter?: boolean) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  setAutoPlayNext: (enabled: boolean) => void;
  goToNextChapter: () => void;
  goToPreviousChapter: () => void;
  setChapterChangeCallback: (callback: (chapter: number, isAutoPlay: boolean) => void) => void;
  setBookChangeCallback: (callback: (book: string, chapter: number, isAutoPlay: boolean) => void) => void;
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
    isLoading: false,
    currentBook: '',
    currentChapter: 0,
    currentVersion: 'kjv',
    autoPlayNext: false,
    loopChapter: false,
    audioUrl: undefined,
    hasAudio: false,
  });

  const isAutoAdvancingRef = useRef<boolean>(false);
  const chapterChangeCallbackRef = useRef<((chapter: number, isAutoPlay: boolean) => void) | null>(null);
  const bookChangeCallbackRef = useRef<((book: string, chapter: number, isAutoPlay: boolean) => void) | null>(null);

  const playBibleChapterMP3 = useCallback(async (
    book: string,
    chapter: number,
    version: string,
    autoPlayNext = false,
    loopChapter = false
  ) => {
    // Set loading state and keep playing state during auto-advance
    setAudioState(prev => ({ ...prev, isLoading: true, isPlaying: isAutoAdvancingRef.current }));
    if ('mediaSession' in navigator && !isAutoAdvancingRef.current) {
      navigator.mediaSession.playbackState = 'paused';
    }

    try {
      const audioUrl = await supabaseAudioService.getAudioUrl(book, chapter, version);
      if (!audioUrl) throw new Error('Audio URL not found.');

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${book} ${chapter}`,
          artist: 'Bible Audio',
          album: version.toUpperCase(),
          artwork: [
            { src: '/public/bible-icon.svg', sizes: '512x512', type: 'image/svg+xml' },
          ],
        });
      }

      audio.src = audioUrl;
      audio.load();
      await audio.play();

      setAudioState(prev => ({
        ...prev,
        currentBook: book,
        currentChapter: chapter,
        currentVersion: version,
        autoPlayNext,
        loopChapter,
        audioUrl,
        hasAudio: true,
      }));

    } catch (error) {
      console.error('Failed to play MP3:', error);
      setAudioState(prev => ({ ...prev, isLoading: false, hasAudio: false, isPlaying: false }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    }
  }, []);


  const pause = useCallback(() => {
    console.log('UI or Media Session: Pause requested');
    isAutoAdvancingRef.current = false; // User-initiated pause should stop auto-advance
    audio.pause();
  }, []);

  const resume = useCallback(() => {
    console.log('UI or Media Session: Resume requested');
    if (audio.src) {
      audio.play().catch(console.error);
    } else if (audioState.currentBook) {
      console.log('Resume requested, but src is empty. Re-fetching...');
      playBibleChapterMP3(
        audioState.currentBook,
        audioState.currentChapter,
        audioState.currentVersion,
        audioState.autoPlayNext,
        audioState.loopChapter
      );
    }
  }, [audioState, playBibleChapterMP3]);

  const reset = useCallback(() => {
    console.log('UI: Reset requested');
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
    audio.load();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;
    }
    setAudioState({
      isPlaying: false,
      isLoading: false,
      currentBook: '',
      currentChapter: 0,
      currentVersion: 'kjv',
      autoPlayNext: false,
      loopChapter: false,
      audioUrl: undefined,
      hasAudio: false,
    });
  }, []);

  const goToNextChapter = useCallback(() => {
    if (isAutoAdvancingRef.current) return;
    isAutoAdvancingRef.current = true;

    const { currentBook, currentChapter, currentVersion, autoPlayNext, loopChapter } = audioState;
    if (!currentBook) {
      isAutoAdvancingRef.current = false;
      return;
    }

    const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
    const bookInfo = allBooks.find(b => b.apiName.toLowerCase() === currentBook.toLowerCase());

    if (bookInfo && currentChapter < bookInfo.chapters) {
      const nextChapter = currentChapter + 1;
      playBibleChapterMP3(currentBook, nextChapter, currentVersion, autoPlayNext, loopChapter).finally(() => {
        if (chapterChangeCallbackRef.current) {
          chapterChangeCallbackRef.current(nextChapter, true);
        }
      });
    } else if (bookInfo) {
      const currentBookIndex = allBooks.findIndex(b => b.apiName.toLowerCase() === currentBook.toLowerCase());
      if (currentBookIndex < allBooks.length - 1) {
        const nextBook = allBooks[currentBookIndex + 1];
        playBibleChapterMP3(nextBook.apiName, 1, currentVersion, autoPlayNext, loopChapter).finally(() => {
          if (bookChangeCallbackRef.current) {
            bookChangeCallbackRef.current(nextBook.apiName, 1, true);
          }
        });
      } else {
        console.log('End of Bible');
        reset();
      }
    }

    // Reset the ref after a delay to allow the new track to load and play
    setTimeout(() => {
      isAutoAdvancingRef.current = false;
    }, 1500); // Increased delay to be safe

  }, [audioState, playBibleChapterMP3, reset]);

  const goToPreviousChapter = useCallback(() => {
    isAutoAdvancingRef.current = false; // Previous is always a manual action
    const { currentBook, currentChapter, currentVersion, autoPlayNext, loopChapter } = audioState;
    if (!currentBook || (currentChapter <= 1 && bibleBooks['Old Testament'].findIndex(b => b.apiName.toLowerCase() === currentBook.toLowerCase()) === 0)) {
      return; // At the beginning of the Bible
    }

    const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
    const bookInfo = allBooks.find(b => b.apiName.toLowerCase() === currentBook.toLowerCase());

    if (bookInfo && currentChapter > 1) {
      const prevChapter = currentChapter - 1;
      playBibleChapterMP3(currentBook, prevChapter, currentVersion, autoPlayNext, loopChapter).finally(() => {
        if (chapterChangeCallbackRef.current) {
          chapterChangeCallbackRef.current(prevChapter, false);
        }
      });
    } else if (bookInfo) {
      const currentBookIndex = allBooks.findIndex(b => b.apiName.toLowerCase() === currentBook.toLowerCase());
      if (currentBookIndex > 0) {
        const prevBook = allBooks[currentBookIndex - 1];
        const lastChapterOfPrevBook = prevBook.chapters;
        playBibleChapterMP3(prevBook.apiName, lastChapterOfPrevBook, currentVersion, autoPlayNext, loopChapter).finally(() => {
          if (bookChangeCallbackRef.current) {
            bookChangeCallbackRef.current(prevBook.apiName, lastChapterOfPrevBook, false);
          }
        });
      }
    }
  }, [audioState, playBibleChapterMP3]);

  useEffect(() => {
    const handlePlay = () => {
      console.log('Audio element event: play');
      setAudioState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const handlePause = () => {
      console.log(`Audio element event: pause (isAutoAdvancing: ${isAutoAdvancingRef.current})`);
      if (isAutoAdvancingRef.current) {
        // This is a temporary pause during chapter transition, so we don't update the UI state.
        // The 'play' event for the next chapter will set the correct state.
        return;
      }
      setAudioState(prev => ({ ...prev, isPlaying: false }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const handleEnded = () => {
      console.log('Audio element event: ended');
      if (audioState.loopChapter) {
        audio.currentTime = 0;
        audio.play();
      } else if (audioState.autoPlayNext) {
        goToNextChapter();
      } else {
        setAudioState(prev => ({ ...prev, isPlaying: false }));
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      }
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      isAutoAdvancingRef.current = false;
      setAudioState(prev => ({ ...prev, isLoading: false, hasAudio: false, isPlaying: false }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    if ('mediaSession' in navigator) {
      console.log('Setting Media Session action handlers.');
      navigator.mediaSession.setActionHandler('play', resume);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('stop', reset);
      navigator.mediaSession.setActionHandler('nexttrack', goToNextChapter);
      navigator.mediaSession.setActionHandler('previoustrack', goToPreviousChapter);
    }

    return () => {
      console.log('Cleaning up GlobalAudioProvider effect.');
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);

      if ('mediaSession' in navigator) {
        console.log('Clearing Media Session action handlers.');
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    };
  }, [goToNextChapter, goToPreviousChapter, reset, pause, resume, audioState.loopChapter, audioState.autoPlayNext]);

  const stop = useCallback(() => {
    console.log('UI: Stop requested');
    isAutoAdvancingRef.current = false;
    audio.pause();
    audio.currentTime = 0;
    setAudioState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const setAutoPlayNext = useCallback((enabled: boolean) => {
    setAudioState(prev => ({ ...prev, autoPlayNext: enabled }));
  }, []);

  const setChapterChangeCallback = useCallback((callback: (chapter: number, isAutoPlay: boolean) => void) => {
    chapterChangeCallbackRef.current = callback;
  }, []);

  const setBookChangeCallback = useCallback((callback: (book: string, chapter: number, isAutoPlay: boolean) => void) => {
    bookChangeCallbackRef.current = callback;
  }, []);

  const contextValue: GlobalAudioContextType = {
    audioState,
    playBibleChapterMP3,
    pause,
    resume,
    stop,
    reset,
    setAutoPlayNext,
    goToNextChapter,
    goToPreviousChapter,
    setChapterChangeCallback,
    setBookChangeCallback,
  };

  return (
    <GlobalAudioContext.Provider value={contextValue}>
      {children}
    </GlobalAudioContext.Provider>
  );
};

export default GlobalAudioProvider;
