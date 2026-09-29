import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { offlineAudioService } from '@/services/offlineAudioService';
import { supabaseAudioService } from '@/services/supabaseAudioService';
import { bibleBooks } from '@/components/bible/BibleBookList';
import { normalizeBookApiName } from '@/components/bible/bookUtils';
import { setAudioSession } from '@/lib/audioSession';
import { backgroundMusic } from '@/services/backgroundMusic';
import { appAlert } from '@/lib/appAlert';
import { isIOS } from '@/lib/push';

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
  /** Where the audio file is and how far in, so Play on the lock screen can pick up at once */
  url?: string;
  position?: number;
  title?: string;
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

/** Update part of the saved state (position, playing) without losing the rest. */
const patchPersistedAudioState = (patch: Partial<PersistedAudioState>) => {
  const current = loadPersistedAudioState();
  if (current) persistAudioState({ ...current, ...patch, timestamp: Date.now() });
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
  // Optional piano worship under the reading follows this element
  backgroundMusic.attach(audio);
}

// ── Next chapter ready in memory (Android, tablets and computers) ──
// With the screen off, Android pulls the media notification a moment after the
// sound stops and then freezes the app, and archive.org often takes several
// seconds to start a file. So while a chapter plays, the whole next chapter is
// fetched into memory: the switch at the end needs no connection and is instant.
// iPhone keeps its own tried-and-tested path (streams, switched just before the end).
const onIOS = typeof window !== 'undefined' && isIOS();
const preloadWholeChapters = typeof window !== 'undefined' && !onIOS;

interface PreloadedChapter {
  remoteUrl: string;
  controller: AbortController;
  localUrl?: string;
}
let preloaded: PreloadedChapter | null = null;
/** The memory copy the player is using right now; let go of once it moves on */
let playingLocalUrl: string | null = null;

const discardPreload = () => {
  if (!preloaded) return;
  preloaded.controller.abort();
  if (preloaded.localUrl) URL.revokeObjectURL(preloaded.localUrl);
  preloaded = null;
};

const hasPreloaded = (remoteUrl: string) => preloaded?.remoteUrl === remoteUrl && !!preloaded.localUrl;

async function preloadChapter(remoteUrl: string) {
  if (preloaded?.remoteUrl === remoteUrl) return;
  discardPreload();
  const entry: PreloadedChapter = { remoteUrl, controller: new AbortController() };
  preloaded = entry;
  const { signal } = entry.controller;
  for (let attempt = 1; attempt <= 3 && !signal.aborted; attempt++) {
    try {
      // A downloaded chapter is read from the device; anything else is fetched once now
      let blob = await offlineAudioService.savedBlob(remoteUrl);
      if (!blob) {
        if (navigator.onLine === false) return;
        const response = await fetch(remoteUrl, { mode: 'cors', signal });
        if (!response.ok) throw new Error(`Preload failed (${response.status})`);
        blob = await response.blob();
      }
      if (signal.aborted) return;
      entry.localUrl = URL.createObjectURL(blob.type.startsWith('audio/') ? blob : new Blob([blob], { type: 'audio/mpeg' }));
      console.log('🎵 Next chapter ready in memory');
      return;
    } catch (error) {
      if (signal.aborted) return;
      console.warn(`Next chapter preload failed (attempt ${attempt})`, error);
      await new Promise((resolve) => setTimeout(resolve, 4000 * attempt));
    }
  }
}

/** The memory copy of this chapter, if it's ready. The player owns it from here. */
function takePreloaded(remoteUrl: string): string | null {
  if (!preloaded || preloaded.remoteUrl !== remoteUrl) return null;
  const local = preloaded.localUrl ?? null;
  if (local) preloaded = null;
  // Still downloading: stream instead, and stop the download competing with it
  else discardPreload();
  return local;
}

/** Point the player at a new file and let go of the previous memory copy. */
function setPlayerSource(src: string, ownedLocalUrl: string | null = null) {
  const previous = playingLocalUrl;
  audio.src = src;
  playingLocalUrl = ownedLocalUrl;
  if (previous && previous !== src) URL.revokeObjectURL(previous);
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
  const preloadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Latest play request; an older one that gets cut off must not touch the state */
  const playRequestRef = useRef(0);
  /** The next chapter couldn't start by itself (phone in the background): start it when possible */
  const pendingPlayRef = useRef(false);
  const errorRetriesRef = useRef(0);

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
        const { autoPlayNext, loopChapter } = audioStateRef.current;
        clearTimeout(preloadTimerRef.current);
        if (preloadWholeChapters && autoPlayNext && !loopChapter) {
          // Give the chapter that's starting the connection to itself for a moment first
          preloadTimerRef.current = setTimeout(() => preloadChapter(url), 3000);
        }
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

      setAudioSession('playback');
      playRequestRef.current++;
      pendingPlayRef.current = false;
      clearTimeout(preloadTimerRef.current);
      discardPreload();
      setPlayerSource(url);
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
    const request = ++playRequestRef.current;
    pendingPlayRef.current = false;
    errorRetriesRef.current = 0;
    clearTimeout(preloadTimerRef.current);
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

      // No connection and not downloaded: say so, rather than silently not playing
      if (navigator.onLine === false && !offlineAudioService.isSavedUrl(audioUrl) && !hasPreloaded(audioUrl)) {
        setAudioState(prev => ({ ...prev, isLoading: false }));
        appAlert(
          `${displayBookName} ${chapter} isn't downloaded`,
          'Connect to the internet to listen, or save chapters for offline listening in Settings → Offline audio Bible.',
          'info',
        );
        return;
      }

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

      // The next chapter already in memory starts at once with no connection
      // (see preloadChapter); otherwise the copy saved on this device, or the stream
      setAudioSession('playback');
      const local = takePreloaded(audioUrl);
      if (local) {
        setPlayerSource(local, local);
      } else {
        const playable = await offlineAudioService.resolvePlayableUrl(audioUrl);
        if (request !== playRequestRef.current) return;
        setPlayerSource(playable);
      }
      audio.loop = loopChapter;
      audio.load();
      try {
        await audio.play();
      } catch (error) {
        // A newer request took over: it's in charge of the player now
        if (request !== playRequestRef.current) return;
        const name = (error as DOMException)?.name;
        if (name === 'NotAllowedError') {
          // The phone wouldn't start sound on its own (app in the background):
          // keep the chapter loaded and start it as soon as it's allowed
          console.warn('🎵 Next chapter is waiting to be allowed to play');
          pendingPlayRef.current = true;
          setAudioState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
        } else if (name !== 'AbortError' && name !== 'NotSupportedError') {
          throw error;
        }
        // AbortError: paused straight away. NotSupportedError: the file didn't load, handleError tries again.
      }

      // Acquire Wake Lock to keep CPU alive during background playback
      requestWakeLock();

      // Persist state for recovery if the app/tab gets killed
      persistAudioState({
        book, chapter, version, autoPlayNext, loopChapter, loopBook,
        isPlaying: true, timestamp: Date.now(),
        url: audioUrl, position: 0, title: `${displayBookName} ${chapter}`,
      });

      const updatePosition = () => {
        try {
          if ('mediaSession' in navigator && audio.duration) {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate,
              position: Math.min(audio.currentTime, audio.duration),
            });
          }
        } catch {
          /* not supported on this device */
        }
      };

      if (audio.duration) {
        updatePosition();
      } else {
        audio.addEventListener('loadedmetadata', updatePosition, { once: true });
      }

      prefetchNextChapter(book, chapter, version);

    } catch (error) {
      if (request !== playRequestRef.current) return;
      console.error('Failed to play MP3:', error);
      setAudioState(prev => ({ ...prev, isLoading: false, hasAudio: false, isPlaying: false, isPaused: false }));
    }
  }, [prefetchNextChapter, requestWakeLock]);

  // Reload the current file at the same spot and play (recovers a silent / stalled resume)
  const reloadAndPlay = useCallback((position: number, src = audio.currentSrc || audio.getAttribute('src')) => {
    if (!src) return;
    console.warn('🎵 Resume stalled — reloading audio at', position.toFixed(1));
    const onReady = () => {
      try {
        audio.currentTime = position;
      } catch {
        /* not seekable yet */
      }
      audio.play().catch(console.error);
    };
    audio.addEventListener('loadedmetadata', onReady, { once: true });
    audio.src = src;
    audio.load();
  }, []);

  const pause = useCallback(() => {
    console.log('UI or Media Session: Pause requested');
    // A pending auto-advance retry must never override the user's pause
    if (autoAdvanceRetryRef.current) {
      clearTimeout(autoAdvanceRetryRef.current);
      autoAdvanceRetryRef.current = null;
    }
    audio.pause();
  }, []);

  const resume = useCallback(() => {
    console.log('UI or Media Session: Resume requested');
    setAudioSession('playback');
    if (audio.getAttribute('src')) {
      const from = audio.currentTime;
      audio.play().catch((error) => {
        console.error(error);
        reloadAndPlay(from);
      });
      // iOS can report "playing" while no sound comes out: if time doesn't move,
      // reload the file at the same position. Only on screen: in the background
      // a reload can't restart the sound and would cut it off instead.
      setTimeout(() => {
        if (document.visibilityState !== 'visible') return;
        if (!audio.paused && !audio.ended && Math.abs(audio.currentTime - from) < 0.25) reloadAndPlay(from);
      }, 2500);
    } else {
      // The phone unloaded the audio (or the app was reopened): start the saved file
      // straight away, inside the tap, then jump back to where it was
      const saved = loadPersistedAudioState();
      if (saved?.url) {
        const position = saved.position || 0;
        setPlayerSource(saved.url);
        audio.load();
        audio.addEventListener('loadedmetadata', () => {
          try {
            if (position > 1 && position < audio.duration - 1) audio.currentTime = position;
          } catch {
            /* not seekable yet */
          }
        }, { once: true });
        audio.play().catch(() => {
          // Offline, or the link expired: go through the normal path (uses downloads)
          playBibleChapterMP3(saved.book, saved.chapter, saved.version, saved.autoPlayNext, saved.loopChapter);
        });
        if (!audioStateRef.current.currentBook) {
          audioStateRef.current = {
            ...audioStateRef.current,
            currentBook: normalizeBookApiName(saved.book),
            currentChapter: saved.chapter,
            currentVersion: saved.version,
            autoPlayNext: saved.autoPlayNext,
            loopChapter: saved.loopChapter,
            loopBook: saved.loopBook,
          };
        }
        prefetchNextChapter(saved.book, saved.chapter, saved.version);
      } else if (audioStateRef.current.currentBook) {
        playBibleChapterMP3(
          audioStateRef.current.currentBook,
          audioStateRef.current.currentChapter,
          audioStateRef.current.currentVersion,
          audioStateRef.current.autoPlayNext,
          audioStateRef.current.loopChapter
        );
      }
    }
  }, [playBibleChapterMP3, reloadAndPlay, prefetchNextChapter]);

  const reset = useCallback(() => {
    console.log('UI: Reset requested');
    playRequestRef.current++;
    pendingPlayRef.current = false;
    clearTimeout(preloadTimerRef.current);
    discardPreload();
    audio.pause();
    audio.currentTime = 0;
    setPlayerSource('');
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
    /** Lock screen / Control Center buttons. Safe to call again at any time. */
    const bindMediaSession = () => {
      if (!('mediaSession' in navigator)) return;
      const ms = navigator.mediaSession;
      const seekBy = (delta: number) => {
        if (!audio.duration) return;
        audio.currentTime = Math.min(Math.max(0, audio.currentTime + delta), Math.max(0, audio.duration - 0.5));
      };
      const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
        // Play and Pause are left to iPhone/Android themselves (no handler = the
        // system plays/pauses the audio directly). That works even while the app
        // is frozen in the background, which a JavaScript handler can't do: it
        // made the lock-screen Play button do nothing after a pause. The app
        // follows along through the audio element's play/pause events.
        ['play', null],
        ['pause', null],
        ['stop', reset],
        ['nexttrack', goToNextChapter],
        ['previoustrack', goToPreviousChapter],
        ['seekbackward', (d) => seekBy(-(d.seekOffset || 10))],
        ['seekforward', (d) => seekBy(d.seekOffset || 10)],
        ['seekto', (d) => {
          if (typeof d.seekTime === 'number') audio.currentTime = d.seekTime;
        }],
      ];
      handlers.forEach(([action, handler]) => {
        try {
          ms.setActionHandler(action, handler);
        } catch {
          /* not supported on this device */
        }
      });
    };

    const handlePlay = () => {
      pendingPlayRef.current = false;
      setAudioState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      // iPhone can drop the lock-screen buttons when a new file starts: attach them again
      bindMediaSession();
      patchPersistedAudioState({ isPlaying: true });
    };

    const handlePause = () => {
      setAudioState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      patchPersistedAudioState({ isPlaying: false, position: audio.currentTime });
    };

    /** The file whose end was last handled, so a missed "ended" is only made up for once */
    let endedSrc: string | null = null;

    const handlePlaying = () => {
      errorRetriesRef.current = 0;
      endedSrc = null;
      bindMediaSession();
    };

    const handleEnded = () => {
      const { loopChapter, autoPlayNext, currentBook, currentChapter, loopBook } = audioStateRef.current;
      console.log(`🎵 handleEnded fired: book=${currentBook} ch=${currentChapter} autoPlay=${autoPlayNext} loopChapter=${loopChapter} loopBook=${loopBook}`);
      endedSrc = audio.currentSrc;

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

        // Safety net: retry once only if the chapter did NOT change within 5s
        // (e.g. a network hiccup). If it changed, the advance worked — and a paused
        // player then means the user paused, which must be respected.
        const endedBook = currentBook;
        const endedChapter = currentChapter;
        autoAdvanceRetryRef.current = setTimeout(() => {
          autoAdvanceRetryRef.current = null;
          const now = audioStateRef.current;
          const stillOnEndedChapter = now.currentBook === endedBook && now.currentChapter === endedChapter;
          if (stillOnEndedChapter && audio.paused && now.autoPlayNext && !isAutoAdvancingRef.current) {
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
      let lastTime = -1;
      let stuckSince = Date.now();
      const watchdogTimer = setInterval(() => {
        const { autoPlayNext } = audioStateRef.current;
        // iPhone: move on just before the end, while the sound is still going
        // (keeps the lock-screen audio alive). Elsewhere the chapter plays to the
        // last word and the next one, already in memory, follows at once.
        if (onIOS && !audio.paused && audio.duration > 0) {
          const timeLeft = audio.duration - audio.currentTime;
          if (timeLeft < 1 && autoPlayNext && !isAutoAdvancingRef.current) {
            handleEnded();
          }
        }

        // The chapter finished but the "ended" signal never arrived
        if (audio.ended && autoPlayNext && !isAutoAdvancingRef.current && endedSrc !== audio.currentSrc) {
          console.warn('🎵 Watchdog: chapter finished without an ended signal, moving on');
          handleEnded();
        }

        // Android: the connection dropped mid-chapter and the sound froze.
        // Pick it up again at the same spot.
        const now = Date.now();
        if (preloadWholeChapters && !audio.paused && !audio.ended && audio.getAttribute('src')) {
          if (audio.currentTime !== lastTime) {
            lastTime = audio.currentTime;
            stuckSince = now;
          } else if (now - stuckSince > 20000 && navigator.onLine !== false) {
            stuckSince = now;
            reloadAndPlay(audio.currentTime);
          }
        } else {
          stuckSince = now;
        }
      }, 500);
      return watchdogTimer;
    };

    let lastSaved = 0;
    let lastPosition = { src: '', time: 0 };
    const handleTimeUpdate = () => {
      const now = audio.currentTime;
      lastPosition = { src: audio.currentSrc, time: now };
      if (Math.abs(now - lastSaved) >= 5) {
        lastSaved = now;
        patchPersistedAudioState({ position: now });
      }
      // Nobody sees the progress while the app is in the background: skip the
      // redraws (saves battery, and Android is less likely to stop the app)
      if (document.visibilityState === 'visible') {
        setAudioState(prev => {
          if (Math.abs(prev.currentTime - now) > 0.5) {
            return { ...prev, currentTime: now };
          }
          return prev;
        });
      }

      if ('mediaSession' in navigator && audio.duration && Math.floor(audio.currentTime) % 5 === 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: Math.min(audio.currentTime, audio.duration),
          });
        } catch {
          /* not supported on this device */
        }
      }
    };

    const handleLoadedMetadata = () => {
      setAudioState(prev => ({ ...prev, duration: audio.duration }));
    };

    const handleError = (e: Event) => {
      const src = audio.getAttribute('src');
      const state = audioStateRef.current;
      // The connection dropped (common on the move, and when Android saves battery
      // in the background): try the same spot again a few times before giving up
      if (src && state.isBibleMode && state.hasAudio && errorRetriesRef.current < 3 && navigator.onLine !== false) {
        const attempt = ++errorRetriesRef.current;
        const position = audio.currentTime || (lastPosition.src === audio.currentSrc ? lastPosition.time : 0);
        console.warn(`🎵 Audio error, trying again (${attempt}/3)`, audio.error);
        setTimeout(() => {
          if (audio.getAttribute('src') === src) reloadAndPlay(position, src);
        }, 1500 * attempt);
        return;
      }
      console.error('❌ Audio playback error:', e);
      pendingPlayRef.current = false;
      setAudioState(prev => ({ ...prev, isLoading: false, hasAudio: false, isPlaying: false, isPaused: false }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    const watchdogTimer = startWatchdog();

    bindMediaSession();

    // ── Visibility change recovery ──
    // When user returns to the app, check if audio stalled and needs recovery
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🎵 App returned to foreground — checking audio state');
        const state = audioStateRef.current;

        // Progress wasn't redrawn in the background: catch up
        setAudioState(prev => ({ ...prev, currentTime: audio.currentTime, duration: audio.duration || prev.duration }));

        // The next chapter was loaded in the background but wasn't allowed to start: start it now
        if (pendingPlayRef.current && audio.paused && audio.getAttribute('src')) {
          console.warn('🎵 Visibility recovery: starting the chapter that was waiting');
          audio.play().catch(err => console.error('Failed to start the waiting chapter:', err));
        }

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
      audio.removeEventListener('playing', handlePlaying);
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
        try {
          navigator.mediaSession.setActionHandler('seekbackward', null);
          navigator.mediaSession.setActionHandler('seekforward', null);
          navigator.mediaSession.setActionHandler('seekto', null);
        } catch {
          /* older browsers */
        }
      }
    };
  }, [goToNextChapter, goToPreviousChapter, reset, pause, resume, requestWakeLock, playBibleChapterMP3, reloadAndPlay]);

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
    // Get the next chapter ready (or let go of it) straight away, not only from the next chapter on
    const { isBibleMode, currentBook, currentChapter, currentVersion } = audioStateRef.current;
    if (enabled && isBibleMode && currentBook) prefetchNextChapter(currentBook, currentChapter, currentVersion);
    else if (!enabled) {
      clearTimeout(preloadTimerRef.current);
      discardPreload();
    }
  }, [prefetchNextChapter]);

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
