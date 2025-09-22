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

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isAutoAdvancingRef = useRef<boolean>(false);
  const chapterChangeCallbackRef = useRef<((chapter: number, isAutoPlay: boolean) => void) | null>(null);
  const bookChangeCallbackRef = useRef<((book: string, chapter: number, isAutoPlay: boolean) => void) | null>(null);

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

  const pause = useCallback(() => {
    currentAudioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    currentAudioRef.current?.play().catch(console.error);
  }, []);

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    setAudioState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  useEffect(() => {
    const audio = currentAudioRef.current;
    if (audio) {
      const handlePlay = () => setAudioState(prev => ({ ...prev, isPlaying: true }));
      const handlePause = () => setAudioState(prev => ({ ...prev, isPlaying: false }));

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);

      return () => {
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
      };
    }
  }, [currentAudioRef.current]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => resume());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('stop', () => stop());
      navigator.mediaSession.setActionHandler('nexttrack', () => goToNextChapter());
    }
  }, [resume, pause, stop, goToNextChapter]);

  const playBibleChapterMP3 = useCallback(async (
    book: string,
    chapter: number,
    version: string,
    autoPlayNext = false,
    loopChapter = false
  ) => {
    setAudioState(prev => ({ ...prev, isLoading: true }));

    try {
      const audioUrl = await supabaseAudioService.getAudioUrl(book, chapter, version);
      if (!audioUrl) throw new Error('Audio URL not found.');

      if (!currentAudioRef.current) {
        currentAudioRef.current = new Audio();

        currentAudioRef.current.addEventListener('ended', () => {
          setAudioState(prev => {
            if (prev.loopChapter) {
              currentAudioRef.current?.play();
            } else if (prev.autoPlayNext) {
              goToNextChapter();
            }
            return { ...prev, isPlaying: false };
          });
        });

        currentAudioRef.current.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          setAudioState(prev => ({ ...prev, isLoading: false, hasAudio: false }));
        });
      }

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

      currentAudioRef.current.src = audioUrl;
      await currentAudioRef.current.play();

      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${book} ${chapter}`,
          artist: 'Bible Audio',
          album: version.toUpperCase(),
          artwork: [
            { src: '/public/bible-icon.svg', sizes: '512x512', type: 'image/svg+xml' },
          ],
        });
      }

    } catch (error) {
      console.error('Failed to play MP3:', error);
      setAudioState(prev => ({ ...prev, isLoading: false, hasAudio: false }));
    }
  }, [goToNextChapter]);

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

  const reset = useCallback(() => {
    stop();
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
  }, [stop]);

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
