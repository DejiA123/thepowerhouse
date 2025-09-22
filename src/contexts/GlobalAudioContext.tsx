import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { supabaseAudioService } from '@/services/supabaseAudioService';
import { bibleBooks } from '@/components/bible/BibleBookList';

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAutoAdvancingRef = useRef<boolean>(false);
  const chapterChangeCallbackRef = useRef<((chapter: number, isAutoPlay: boolean) => void) | null>(null);
  const bookChangeCallbackRef = useRef<((book: string, chapter: number, isAutoPlay: boolean) => void) | null>(null);

  const reset = useCallback(() => {
    console.log('UI: Reset requested');
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
        audioRef.current.load();
    }
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

    setAudioState(prev => {
      const { currentBook, currentChapter } = prev;
      if (!currentBook) {
        isAutoAdvancingRef.current = false;
        return prev;
      }

      const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
      const bookInfo = allBooks.find(b => b.apiName.toLowerCase() === currentBook.toLowerCase());

      if (bookInfo && currentChapter < bookInfo.chapters) {
        const nextChapter = currentChapter + 1;
        if (chapterChangeCallbackRef.current) {
          chapterChangeCallbackRef.current(nextChapter, true);
        }
      } else if (bookInfo) {
        const currentBookIndex = allBooks.findIndex(b => b.apiName.toLowerCase() === currentBook.toLowerCase());
        if (currentBookIndex < allBooks.length - 1) {
          const nextBook = allBooks[currentBookIndex + 1];
          if (bookChangeCallbackRef.current) {
            bookChangeCallbackRef.current(nextBook.apiName, 1, true);
          }
        } else {
          console.log('End of Bible');
        }
      }

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

      const prevChapter = currentChapter - 1;
      if (chapterChangeCallbackRef.current) {
        chapterChangeCallbackRef.current(prevChapter, false);
      }

      return prev;
    });
  }, []);

  const pause = useCallback(() => {
    console.log('UI: Pause requested');
    audioRef.current?.pause();
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 1.0;
      if (typeof window !== 'undefined') {
        (audioRef.current as any).playsInline = true;
        audioRef.current.setAttribute('playsinline', 'true');
        audioRef.current.setAttribute('webkit-playsinline', 'true');
      }
    }
    const audio = audioRef.current;

    const handlePlay = () => {
      console.log('Audio element event: play');
      setAudioState(prev => ({ ...prev, isPlaying: true }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const handlePause = () => {
      console.log('Audio element event: pause');
      setAudioState(prev => ({ ...prev, isPlaying: false }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const handleEnded = () => {
      console.log('Audio element event: ended');
      setAudioState(prev => {
        if (prev.loopChapter) {
          audio?.play();
        } else if (prev.autoPlayNext) {
          goToNextChapter();
        } else if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
        }
        return prev;
      });
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
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
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('Media Session: Play triggered');
        audio.play().catch(e => console.error('Error playing from media session:', e));
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('Media Session: Pause triggered for iOS. Calling pause() on audio element.');
        pause();
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        console.log('Media Session: Stop triggered, resetting audio.');
        reset();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('Media Session: Next track triggered');
        goToNextChapter();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('Media Session: Previous track triggered');
        goToPreviousChapter();
      });
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
  }, [goToNextChapter, goToPreviousChapter, reset, pause]);

  const playBibleChapterMP3 = useCallback(async (
    book: string,
    chapter: number,
    version: string,
    autoPlayNext = false,
    loopChapter = false
  ) => {
    if (!audioRef.current) {
      console.error("Audio element not initialized. Cannot play.");
      return;
    }

    setAudioState(prev => ({ ...prev, isLoading: true }));

    try {
      const audioUrl = await supabaseAudioService.getAudioUrl(book, chapter, version);
      if (!audioUrl) throw new Error('Audio URL not found.');

      setAudioState(prev => ({
        ...prev,
        currentBook: book,
        currentChapter: chapter,
        currentVersion: version,
        autoPlayNext,
        loopChapter,
        audioUrl,
        hasAudio: true,
        isLoading: false,
      }));

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

      audioRef.current.src = audioUrl;
      await audioRef.current.play();

    } catch (error) {
      console.error('Failed to play MP3:', error);
      setAudioState(prev => ({ ...prev, isLoading: false, hasAudio: false, isPlaying: false }));
    }
  }, []);

  const resume = useCallback(() => {
    console.log('UI: Resume requested');
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play().catch(console.error);
    } else if (audioRef.current) {
      console.log('UI: Resume requested, but src is empty. Re-fetching...');
      playBibleChapterMP3(
        audioState.currentBook,
        audioState.currentChapter,
        audioState.currentVersion,
        audioState.autoPlayNext,
        audioState.loopChapter
      );
    }
  }, [audioState, playBibleChapterMP3]);

  const stop = useCallback(() => {
    console.log('UI: Stop requested');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
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
