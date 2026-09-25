import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, Play, Pause, ChevronLeft, ChevronRight, ChevronDown, X, Copy, NotebookPen, Headphones, SkipBack, SkipForward, Loader2, WifiOff, Highlighter, GraduationCap, Settings, Share2, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BibleChapter } from "@/types/bible";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";
import { bibleBooks } from "./BibleBookList";
import { normalizeBookApiName } from "./bookUtils";
import { estimateVerseTimings, getVerseTimings, verseAt, type VerseTimings } from "@/services/verseTimingService";
import { useToast } from "@/hooks/use-toast";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
import { offlineAudioService } from "@/services/offlineAudioService";
import { appAlert } from "@/lib/appAlert";
import { bibleHighlightsService, type HighlightRow } from "@/services/bibleHighlightsService";
import { bibleNotesService, type BibleNoteFolder } from "@/services/bibleNotesService";
import { studyNotesService } from "@/services/studyNotesService";
import NoteEditor, { type NoteDraftDefaults } from "@/components/notes/NoteEditor";
import type { NoteRecord } from "@/components/notes/noteUtils";
import { HIGHLIGHT_COLORS, HIGHLIGHTS_CHANGED, NOTES_CHANGED, highlightColor } from "./highlightColors";
import { cleanVerseArtifacts, escapeHtml, plainVerseText, verseRanges } from "./verseText";
import type { LibraryTab } from "./BibleLibrarySheet";
import DOMPurify from 'dompurify';


interface BibleChapterContentProps {
  selectedBook: string;
  selectedChapter: number;
  chapterContent: BibleChapter | null;
  loading: boolean;
  onBackToChapters: () => void;
  onBackToBooks: () => void;
  onChapterChange?: (chapter: number, isAutoPlay: boolean) => void;
  onBookChange?: (bookApiName: string, chapter: number, isAutoPlay: boolean) => void;
  autoPlayNext?: boolean;
  onAutoPlayChange?: (autoPlay: boolean) => void;
  currentVerse?: number;
  shouldAutoPlay?: boolean;
  onAutoPlayTriggered?: () => void;
  onVerseHighlight?: (verseNumber: number) => void;
  onVersionSelectorOpen?: () => void;
  onSearchOpen?: () => void;
  onMenuOpen?: () => void;
  /** Opens "My Bible" (highlights and notes) on the given tab. */
  onLibraryOpen?: (tab: LibraryTab) => void;
  /** Opens the study notes for this chapter, scrolled to a verse. */
  onStudyOpen?: (verse?: number) => void;
  /** Opens the "Listen offline" downloads sheet. */
  onOfflineOpen?: () => void;
  selectedVersion?: string;
  versions?: any[];
  fontSize?: number;
  pitch?: number;
  rate?: number;
  redLetters?: boolean;
  menuSettingsVersion?: number;
  onFontSizeChange?: (fontSize: number) => void;
}

export const BibleChapterContent = ({
  selectedBook,
  selectedChapter,
  chapterContent,
  loading,
  onBackToChapters,
  onBackToBooks,
  onChapterChange,
  onBookChange,
  autoPlayNext = true,
  onAutoPlayChange,
  currentVerse = 0,
  shouldAutoPlay = false,
  onAutoPlayTriggered,
  onVerseHighlight,
  onVersionSelectorOpen,
  onSearchOpen,
  onMenuOpen,
  onLibraryOpen,
  onStudyOpen,
  onOfflineOpen,
  selectedVersion,
  versions = [],
  fontSize = 16,
  pitch = 1.44,
  rate = 0.75,
  redLetters = true,
  menuSettingsVersion = 0,
  onFontSizeChange
}: BibleChapterContentProps) => {
  console.log(`🔍 BibleChapterContent: Rendering with ${selectedBook} chapter ${selectedChapter}, verses: ${chapterContent?.verses?.length || 0}`);

  // Use live preferences so font-size updates apply immediately without navigating
  const { preferences, isLoaded } = useBiblePreferences();

  // Don't use preferences.fontSize for font size management - it's handled independently
  // const effectiveFontSize = isLoaded ? preferences.fontSize : fontSize;

  console.log('🔍 BibleChapterContent: Font size source of truth:', {
    preferencesFontSize: preferences?.fontSize,
    propFontSize: fontSize,
    isLoaded: isLoaded
  });

  // Debug: Log font size initialization and changes
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

  console.log('🔍 BibleChapterContent: Device Config:', { isMobile, isIOS, isStandalone });
  console.log('🔍 BibleChapterContent: Font size state:', {
    preferencesFontSize: preferences?.fontSize,
    propFontSize: fontSize,
    selectedBook: selectedBook,
    selectedChapter: selectedChapter,
    isMobile: isMobile,
    isIOS: isIOS,
    userAgent: navigator.userAgent
  });

  // State variables
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Swipe handlers state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 120;

  // Scroll header state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  // Use currentFontSize as the single source of truth for font size
  const [currentFontSize, setCurrentFontSize] = useState(() => {
    // Initialize with saved font size from separate localStorage key
    try {
      const savedFontSize = localStorage.getItem('bible-font-size');
      return savedFontSize ? parseInt(savedFontSize) : 15;
    } catch {
      return 15;
    }
  });

  // Initialize currentFontSize when component first loads with saved preferences
  useEffect(() => {
    if (isLoaded) {
      console.log('🔍 BibleChapterContent: Preferences loaded, but not using preferences.fontSize for font size management');
      // Don't sync with preferences.fontSize - we manage font size independently
    }
  }, [isLoaded]); // Only when preferences are first loaded

  // Use currentFontSize as the primary source of truth
  const displayFontSize = currentFontSize;

  // Force re-render when menu settings change (but don't override currentFontSize)
  useEffect(() => {
    console.log('🔍 BibleChapterContent: Menu settings changed, forcing re-render');
    setForceUpdate(prev => prev + 1);
  }, [menuSettingsVersion, selectedBook, selectedChapter]);

  // Scroll to top when chapter or book changes
  useEffect(() => {
    const mainContent = document.getElementById('bible-content-scroll');
    if (mainContent) {
      console.log('📜 BibleChapterContent: Scrolling to top of bible-content-scroll due to chapter/book change');
      mainContent.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [selectedBook, selectedChapter]);

  // Update CSS custom property for immediate font size changes
  useEffect(() => {
    document.documentElement.style.setProperty('--bible-font-size', `${displayFontSize}px`);
    console.log('🔍 BibleChapterContent: Set CSS custom property --bible-font-size to:', `${displayFontSize}px`);
  }, [displayFontSize]);

  // Save font size to separate localStorage key whenever currentFontSize changes
  useEffect(() => {
    try {
      localStorage.setItem('bible-font-size', currentFontSize.toString());
      console.log('🔍 BibleChapterContent: Saved currentFontSize to separate localStorage key:', currentFontSize);
    } catch (error) {
      console.warn('🔍 BibleChapterContent: Failed to save currentFontSize to localStorage:', error);
    }
  }, [currentFontSize]);

  // Force re-render when preferences change (but not for font size)
  useEffect(() => {
    console.log('🔍 BibleChapterContent: Preferences changed, forcing re-render');
    console.log('🔍 BibleChapterContent: New preferences.fontSize:', preferences.fontSize, '(not using for font size management)');
    setForceUpdate(prev => prev + 1);
  }, [preferences]);

  // Listen for custom font size change events from the modal
  useEffect(() => {
    const handleFontSizeChange = (event: CustomEvent) => {
      const newFontSize = event.detail.fontSize;
      console.log('🔍 BibleChapterContent: Received font size change event:', {
        newFontSize: newFontSize,
        currentPreferencesFontSize: preferences.fontSize,
        currentFontSize: currentFontSize,
        selectedBook: selectedBook,
        selectedChapter: selectedChapter
      });

      // Update current font size immediately
      console.log('🔍 BibleChapterContent: Setting currentFontSize to:', newFontSize);
      setCurrentFontSize(newFontSize);

      // Force a re-render to apply the new font size immediately
      setForceUpdate(prev => prev + 1);

      // Also try to reload preferences from localStorage to ensure they're up to date
      try {
        const savedPrefs = JSON.parse(localStorage.getItem('bible-preferences') || '{}');
        console.log('🔍 BibleChapterContent: Reloaded preferences from localStorage:', savedPrefs);
        if (savedPrefs.fontSize && savedPrefs.fontSize !== preferences.fontSize) {
          console.log('🔍 BibleChapterContent: Found updated fontSize in localStorage:', savedPrefs.fontSize);
        }
      } catch (error) {
        console.warn('🔍 BibleChapterContent: Failed to reload preferences from localStorage:', error);
      }

      // Also update CSS property immediately
      document.documentElement.style.setProperty('--bible-font-size', `${newFontSize}px`);
      console.log('🔍 BibleChapterContent: Set CSS custom property to:', `${newFontSize}px`);

      // Force multiple re-renders to ensure the change is applied
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 10);
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 50);
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 100);
    };

    // Listen for custom events
    window.addEventListener('fontSizeChanged', handleFontSizeChange as EventListener);
    console.log('🔍 BibleChapterContent: Added fontSizeChanged event listener');

    // Listen for preference changes from other components
    const handlePreferenceChange = (event: CustomEvent) => {
      const newPreferences = event.detail.preferences;
      console.log('🔍 BibleChapterContent: Received biblePreferencesChanged event:', newPreferences);
      if (newPreferences.fontSize && newPreferences.fontSize !== preferences.fontSize) {
        console.log('🔍 BibleChapterContent: Font size changed in preferences:', newPreferences.fontSize);
        // Force a re-render to pick up the new preferences
        setForceUpdate(prev => prev + 1);
      }
    };

    window.addEventListener('biblePreferencesChanged', handlePreferenceChange as EventListener);
    console.log('🔍 BibleChapterContent: Added biblePreferencesChanged event listener');

    return () => {
      window.removeEventListener('fontSizeChanged', handleFontSizeChange as EventListener);
      window.removeEventListener('biblePreferencesChanged', handlePreferenceChange as EventListener);
      console.log('🔍 BibleChapterContent: Removed event listeners');
    };
  }, [selectedBook, selectedChapter]);

  // Handle scroll events for header and bottom nav transition
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let lastScrollTop = 0;
    const body = document.body;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;

      // Header transition logic
      setIsScrolled(scrollTop > 20);

      // Bottom Navigation visibility logic
      // Hide bottom nav when scrolling down and past 50px
      // Show when scrolling up
      if (scrollTop > lastScrollTop && scrollTop > 50) {
        body.classList.add('bible-reading-mode');
      } else {
        body.classList.remove('bible-reading-mode');
      }

      lastScrollTop = scrollTop;
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      // Cleanup class on unmount
      body.classList.remove('bible-reading-mode');
    };
  }, []);



  // Create a key that changes when any setting changes to force re-render
  const settingsKey = `fontSize-${currentFontSize}-pitch-${pitch}-rate-${rate}-redLetters-${redLetters}-menu${menuSettingsVersion}-force${forceUpdate}`;

  // Global audio context for persistent audio across pages
  const globalAudio = useGlobalAudio();

  // Use GlobalAudioContext state for playing status
  const isPlaying = globalAudio?.audioState.isPlaying || false;


  const { toast } = useToast();
  const { user } = useAuth();

  // Set up callbacks for global audio context
  useEffect(() => {
    if (globalAudio) {
      globalAudio.setChapterChangeCallback((chapter: number, isAutoPlay: boolean) => {
        console.log('🎵 Global audio: Chapter change callback triggered', { chapter, isAutoPlay });
        onChapterChange?.(chapter, isAutoPlay);
      });

      globalAudio.setBookChangeCallback((book: string, chapter: number, isAutoPlay: boolean) => {
        console.log('🎵 Global audio: Book change callback triggered', { book, chapter, isAutoPlay });
        onBookChange?.(book, chapter, isAutoPlay);
      });
    }
  }, [globalAudio, onChapterChange, onBookChange]);

  // Highlights, notes and study notes for this chapter
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [chapterNotes, setChapterNotes] = useState<NoteRecord[]>([]);
  const [noteFolders, setNoteFolders] = useState<BibleNoteFolder[]>([]);
  const [noteEditor, setNoteEditor] = useState<{ note: NoteRecord | null; defaults?: NoteDraftDefaults } | null>(null);
  const [studyVerses, setStudyVerses] = useState<Set<number>>(new Set());
  const [studyMarkers, setStudyMarkers] = useState(() => {
    try {
      return localStorage.getItem('bible_study_markers') === 'on';
    } catch {
      return false;
    }
  });

  const fetchHighlights = useCallback(async () => {
    if (!user) {
      setHighlights([]);
      return;
    }
    try {
      setHighlights(await bibleHighlightsService.listChapter(user.id, selectedBook, selectedChapter));
    } catch (error) {
      console.error('Error fetching highlights:', error);
    }
  }, [user, selectedBook, selectedChapter]);

  const fetchChapterNotes = useCallback(async () => {
    if (!user) {
      setChapterNotes([]);
      return;
    }
    const apiBook = normalizeBookApiName(selectedBook);
    const { data } = await supabase
      .from('bible_notes')
      .select('*')
      .eq('user_id', user.id)
      .in('book', Array.from(new Set([apiBook, selectedBook])))
      .eq('chapter', selectedChapter)
      .order('updated_at', { ascending: false });
    setChapterNotes((data || []) as unknown as NoteRecord[]);
  }, [user, selectedBook, selectedChapter]);

  useEffect(() => {
    fetchHighlights();
    fetchChapterNotes();
  }, [fetchHighlights, fetchChapterNotes]);

  // Changes made in "My Bible" (or another tab of the reader) show up here straight away
  useEffect(() => {
    window.addEventListener(HIGHLIGHTS_CHANGED, fetchHighlights);
    window.addEventListener(NOTES_CHANGED, fetchChapterNotes);
    return () => {
      window.removeEventListener(HIGHLIGHTS_CHANGED, fetchHighlights);
      window.removeEventListener(NOTES_CHANGED, fetchChapterNotes);
    };
  }, [fetchHighlights, fetchChapterNotes]);

  useEffect(() => {
    if (!user) return;
    bibleNotesService.getFolders(user.id).then(setNoteFolders).catch(() => undefined);
  }, [user]);

  // Which verses have a study note (for the markers and the "Study" action)
  useEffect(() => {
    let cancelled = false;
    setStudyVerses(new Set());
    studyNotesService.versesWithNotes(selectedBook, selectedChapter).then((verses) => {
      if (!cancelled) setStudyVerses(verses);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBook, selectedChapter]);

  useEffect(() => {
    const sync = () => {
      try {
        setStudyMarkers(localStorage.getItem('bible_study_markers') === 'on');
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('bible-study-markers-changed', sync);
    return () => window.removeEventListener('bible-study-markers-changed', sync);
  }, []);

  const notesByVerse = useMemo(() => {
    const map = new Map<number, NoteRecord[]>();
    chapterNotes.forEach((n) => {
      if (!n.verse) return;
      map.set(n.verse, [...(map.get(n.verse) || []), n]);
    });
    return map;
  }, [chapterNotes]);

  // Auto-play MP3 audio when shouldAutoPlay is true
  useEffect(() => {
    if (!shouldAutoPlay || !globalAudio) return;
    const { currentBook, currentChapter, isPlaying, isPaused, isLoading } = globalAudio.audioState;
    const sameChapter =
      normalizeBookApiName(currentBook || '') === normalizeBookApiName(selectedBook) && currentChapter === selectedChapter;
    // Already playing (or deliberately paused) this chapter: just clear the request
    if (sameChapter && (isPlaying || isPaused || isLoading)) {
      onAutoPlayTriggered?.();
      return;
    }
    if (!isLoading && !isPlaying) {
      console.log('🎵 BibleChapterContent: Auto-playing MP3 audio via GlobalAudioContext');

      const playAudio = async () => {
        try {
          await globalAudio.playBibleChapterMP3(
            selectedBook,
            selectedChapter,
            selectedVersion!,
            autoPlayNext,
            false // loopChapter — loopBook is managed by setLoopBook() in GlobalAudioContext
          );
          onAutoPlayTriggered?.();
        } catch (error) {
          console.error('❌ Error auto-playing:', error);
          onAutoPlayTriggered?.();
        }
      };

      const playTimeout = setTimeout(playAudio, 100);
      return () => clearTimeout(playTimeout);
    }
  }, [shouldAutoPlay, globalAudio, onAutoPlayTriggered, selectedBook, selectedChapter, selectedVersion, autoPlayNext]);

  // ── Follow along: highlight and centre the verse being read ──────────
  const [followAudio, setFollowAudio] = useState(() => {
    try {
      return localStorage.getItem('bible_follow_audio') !== 'off';
    } catch {
      return true;
    }
  });
  const [timings, setTimings] = useState<VerseTimings | null>(null);
  const [followPaused, setFollowPaused] = useState(false);
  const programmaticScrollUntil = useRef(0);
  const followResumeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const sync = () => {
      try {
        setFollowAudio(localStorage.getItem('bible_follow_audio') !== 'off');
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('bible-follow-audio-changed', sync);
    return () => window.removeEventListener('bible-follow-audio-changed', sync);
  }, []);

  const audioOnThisChapter =
    !!globalAudio?.audioState.hasAudio &&
    normalizeBookApiName(globalAudio.audioState.currentBook || '') === normalizeBookApiName(selectedBook) &&
    globalAudio.audioState.currentChapter === selectedChapter;

  // Load exact verse timings for this chapter once audio for it is loaded
  useEffect(() => {
    setTimings(null);
    if (!audioOnThisChapter) return;
    let cancelled = false;
    getVerseTimings(normalizeBookApiName(selectedBook), selectedChapter).then((t) => {
      if (!cancelled) setTimings(t);
    });
    return () => {
      cancelled = true;
    };
  }, [audioOnThisChapter, selectedBook, selectedChapter]);

  const effectiveTimings = useMemo(() => {
    if (timings) return timings;
    const duration = globalAudio?.audioState.duration || 0;
    if (!audioOnThisChapter || !duration || !chapterContent?.verses?.length) return null;
    return estimateVerseTimings(
      chapterContent.verses.map((v, i) => ({ verse: Number(v.verse) || i + 1, length: (v.text || '').length })),
      duration,
    );
  }, [timings, audioOnThisChapter, globalAudio?.audioState.duration, chapterContent]);

  const currentAudioTime = globalAudio?.audioState.currentTime || 0;
  const readingVerse =
    followAudio && audioOnThisChapter && effectiveTimings && (globalAudio?.audioState.isPlaying || globalAudio?.audioState.isPaused)
      ? verseAt(effectiveTimings, currentAudioTime)
      : null;

  // Keep the verse being read in the middle of the screen
  useEffect(() => {
    if (!readingVerse || followPaused || !globalAudio?.audioState.isPlaying) return;
    const container = scrollContainerRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-verse="${readingVerse}"]`);
    if (!container || !el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const target = container.scrollTop + (elRect.top - containerRect.top) - container.clientHeight * 0.38;
    if (Math.abs(container.scrollTop - target) < 24) return;
    programmaticScrollUntil.current = Date.now() + 900;
    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [readingVerse, followPaused, globalAudio?.audioState.isPlaying]);

  const [playerBox, setPlayerBox] = useState({ bottom: 88, left: 0, right: 0 });
  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector<HTMLElement>('.bottom-nav-bar, #bottom-nav-bar');
      const rect = nav?.getBoundingClientRect();
      const visible = rect && rect.height > 0 && getComputedStyle(nav!).display !== 'none' && rect.top < window.innerHeight;
      const column = scrollContainerRef.current?.getBoundingClientRect();
      const next = {
        bottom: visible ? Math.max(12, Math.round(window.innerHeight - rect!.top + 10)) : 24,
        left: column ? Math.round(column.left) : 0,
        right: column ? Math.round(window.innerWidth - column.right) : 0,
      };
      setPlayerBox((prev) => (prev.bottom === next.bottom && prev.left === next.left && prev.right === next.right ? prev : next));
    };
    measure();
    const t = setTimeout(measure, 600);
    window.addEventListener('resize', measure);
    // The desktop sidebar can collapse/expand without a window resize
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (scrollContainerRef.current) observer?.observe(scrollContainerRef.current);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, []);

  const readingVerseRef = useRef<number | null>(null);
  readingVerseRef.current = readingVerse;

  // If the reader scrolls by hand, stop following for a moment
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onUserScroll = () => {
      if (Date.now() < programmaticScrollUntil.current || !readingVerseRef.current) return;
      setFollowPaused(true);
      clearTimeout(followResumeTimer.current);
      followResumeTimer.current = setTimeout(() => setFollowPaused(false), 12000);
    };
    container.addEventListener('wheel', onUserScroll, { passive: true });
    container.addEventListener('touchmove', onUserScroll, { passive: true });
    return () => {
      container.removeEventListener('wheel', onUserScroll);
      container.removeEventListener('touchmove', onUserScroll);
      clearTimeout(followResumeTimer.current);
    };
  }, []);

  // Newest first, so a verse always shows its latest colour
  const getHighlightForVerse = (verseNumber: number) => {
    return highlights.find(h => h.verse === verseNumber);
  };

  const applyHighlight = async (color: string) => {
    if (!user) {
      appAlert('Sign in to highlight', 'Your highlights are saved to your account, on every device.', 'info');
      return;
    }
    const verses = [...selectedVerses];
    // Show the colour straight away; the save follows
    const now = new Date().toISOString();
    setHighlights((prev) => [
      ...verses.map((verse) => ({
        id: `pending-${verse}`, user_id: user.id, book: selectedBook, chapter: selectedChapter, verse,
        highlight_color: color, created_at: now, updated_at: now,
      })),
      ...prev.filter((h) => !verses.includes(h.verse ?? -1)),
    ]);
    setSelectedVerses([]);
    setIsMultiSelectMode(false);
    try {
      await bibleHighlightsService.setColor(user.id, selectedBook, selectedChapter, verses, color);
    } catch (error) {
      console.error('Error adding highlights:', error);
      appAlert("Couldn't save the highlight", 'Check your connection and try again.', 'error');
      fetchHighlights();
    }
  };

  const clearHighlights = async () => {
    const verses = [...selectedVerses];
    setSelectedVerses([]);
    setIsMultiSelectMode(false);
    if (!user || !verses.some((v) => getHighlightForVerse(v))) return;
    setHighlights((prev) => prev.filter((h) => !verses.includes(h.verse ?? -1)));
    try {
      await bibleHighlightsService.remove(user.id, selectedBook, selectedChapter, verses);
    } catch (error) {
      console.error('Error removing highlights:', error);
      appAlert("Couldn't remove the highlight", 'Please try again.', 'error');
      fetchHighlights();
    }
  };

  const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
  const normalizedSelectedBook = normalizeBookApiName(selectedBook);
  const book = allBooks.find(b => b.apiName === normalizedSelectedBook);


  // Handle MP3 audio playback using global audio context
  const handlePlayPause = async () => {
    if (!globalAudio) {
      console.error('🎵 Global audio context not available');
      return;
    }

    // Check if we're currently playing the same chapter in global context
    const isCurrentChapterPlaying = globalAudio.audioState.isPlaying &&
      normalizeBookApiName(globalAudio.audioState.currentBook || "") === normalizeBookApiName(selectedBook) &&
      globalAudio.audioState.currentChapter === selectedChapter;

    if (isCurrentChapterPlaying) {
      // Pause the current audio
      globalAudio.pause();
    } else if (globalAudio.audioState.isPaused &&
      normalizeBookApiName(globalAudio.audioState.currentBook || "") === normalizeBookApiName(selectedBook) &&
      globalAudio.audioState.currentChapter === selectedChapter) {
      // Resume the paused audio
      globalAudio.resume();
    } else {
      // Start playing this chapter
      if (!selectedVersion) {
        toast({
          title: "Version Required",
          description: "Please select a Bible version to play audio",
          variant: "destructive"
        });
        return;
      }

      try {
        await globalAudio.playBibleChapterMP3(
          selectedBook,
          selectedChapter,
          selectedVersion,
          autoPlayNext,
          false // loopChapter — loopBook is managed by setLoopBook() in GlobalAudioContext
        );
      } catch (error) {
        console.error('🎵 Error playing audio via global context:', error);
        toast({
          title: "Audio Error",
          description: "Failed to play audio. Please try again.",
          variant: "destructive"
        });
      }
    }
  };


  // Get the book display name (e.g., "2 Peter" instead of "2pe")
  const getBookDisplayName = () => {
    if (book) return book.name;

    // Fallback: try to convert API abbreviation to proper name
    const abbreviationMap: Record<string, string> = {
      '1sa': '1 Samuel', '2sa': '2 Samuel', '1ki': '1 Kings', '2ki': '2 Kings',
      '1ch': '1 Chronicles', '2ch': '2 Chronicles', '1co': '1 Corinthians', '2co': '2 Corinthians',
      '1th': '1 Thessalonians', '2th': '2 Thessalonians', '1ti': '1 Timothy', '2ti': '2 Timothy',
      '1pe': '1 Peter', '2pe': '2 Peter', '1jn': '1 John', '2jn': '2 John', '3jn': '3 John',
      'song': 'Song of Solomon', 'sos': 'Song of Solomon', 'eccl': 'Ecclesiastes'
    };

    const normalizedBook = selectedBook.toLowerCase();
    if (abbreviationMap[normalizedBook]) {
      return abbreviationMap[normalizedBook];
    }

    // Last resort: replace underscores and capitalize
    return selectedBook.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get the version display name from the versions array (same as modals)
  const getVersionDisplayName = (selectedVersion?: string) => {
    if (!selectedVersion) return "KJV";

    // Find the version object in the versions array (same approach as modals)
    const currentVersion = versions.find(v => (v.id || v.abbreviation) === selectedVersion);

    // Always use abbreviation if available, otherwise fall back to custom mapping
    if (currentVersion && currentVersion.abbreviation) {
      // Special handling: convert "ENGKJV" to "KJV" for display
      const displayName = currentVersion.abbreviation.toUpperCase();
      return displayName === 'ENGKJV' ? 'KJV' : displayName;
    }

    // Fallback to the enhanced API service if not found in versions array
    return enhancedApiBibleService.getVersionDisplayName(selectedVersion);
  };




  const handlePreviousChapter = () => {
    const currentBookIndex = allBooks.findIndex(b => b.apiName === selectedBook);

    if (selectedChapter <= 1) {
      if (currentBookIndex > 0 && onBookChange) {
        const previousBook = allBooks[currentBookIndex - 1];
        onBookChange(previousBook.apiName, previousBook.chapters, false);
      }
    } else if (onChapterChange) {
      onChapterChange(selectedChapter - 1, false);
    }
  };

  const handleNextChapter = () => {
    const currentBookIndex = allBooks.findIndex(b => b.apiName === selectedBook);

    if (selectedChapter >= (book?.chapters || 0)) {
      if (currentBookIndex < allBooks.length - 1 && onBookChange) {
        const nextBook = allBooks[currentBookIndex + 1];
        onBookChange(nextBook.apiName, 1, false);
      }
    } else if (onChapterChange) {
      onChapterChange(selectedChapter + 1, false);
    }
  };

  /**
   * "Mark 2:1-4 KJV" on the first line, then the verses as one paragraph with
   * [n] before every verse after the first, e.g. "…in the house. [2] And straightway…"
   */
  const verseTextByNumber = () => {
    const byNumber = new Map<number, string>();
    (chapterContent?.verses || []).forEach((v, i) => {
      const n = v.verse && !isNaN(Number(v.verse)) ? Number(v.verse) : i + 1;
      if (!byNumber.has(n)) byNumber.set(n, plainVerseText(v.text || ''));
    });
    return byNumber;
  };

  /** "John 3:16-17" for the given verses */
  const selectionLabel = (verseNumbers: number[]) =>
    `${getBookDisplayName()} ${selectedChapter}:${verseRanges(verseNumbers)}`;

  const buildVerseCopy = (verseNumbers: number[]) => {
    const nums = [...new Set(verseNumbers)].sort((a, b) => a - b);
    const byNumber = verseTextByNumber();
    const body = nums
      .map((n, idx) => (idx === 0 ? byNumber.get(n) || '' : `[${n}] ${byNumber.get(n) || ''}`))
      .join(' ');
    return `${selectionLabel(nums)} ${getVersionDisplayName(selectedVersion)}\n${body}`;
  };

  /** A new note on the selected verses, with them quoted at the top. */
  const writeNoteOnSelection = () => {
    if (!user) {
      appAlert('Sign in to take notes', 'Your notes are saved to your account, on every device.', 'info');
      return;
    }
    const nums = [...selectedVerses].sort((a, b) => a - b);
    const byNumber = verseTextByNumber();
    const quote = nums.map((n) => byNumber.get(n) || '').join(' ').trim();
    setNoteEditor({
      note: null,
      defaults: {
        book: normalizeBookApiName(selectedBook),
        chapter: selectedChapter,
        verse: nums[0] ?? null,
        title: nums.length ? selectionLabel(nums) : `${getBookDisplayName()} ${selectedChapter}`,
        body: quote ? `<blockquote><p>${escapeHtml(quote)}</p></blockquote><p></p>` : '',
      },
    });
    setSelectedVerses([]);
    setIsMultiSelectMode(false);
  };

  const shareSelection = async () => {
    const nums = [...selectedVerses].sort((a, b) => a - b);
    const byNumber = verseTextByNumber();
    const text = nums.map((n) => byNumber.get(n) || '').join(' ').trim();
    try {
      await navigator.share({ title: selectionLabel(nums), text: `“${text}” — ${selectionLabel(nums)} ${getVersionDisplayName(selectedVersion)}` });
      setSelectedVerses([]);
      setIsMultiSelectMode(false);
    } catch {
      /* dismissed */
    }
  };

  const writeClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Older iOS: hidden textarea fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
  };

  const bookIndex = allBooks.findIndex(b => b.apiName === normalizedSelectedBook);
  const prevLabel = selectedChapter > 1
    ? `${getBookDisplayName()} ${selectedChapter - 1}`
    : bookIndex > 0 ? `${allBooks[bookIndex - 1].name} ${allBooks[bookIndex - 1].chapters}` : '';
  const nextLabel = selectedChapter < (book?.chapters || 0)
    ? `${getBookDisplayName()} ${selectedChapter + 1}`
    : bookIndex >= 0 && bookIndex < allBooks.length - 1 ? `${allBooks[bookIndex + 1].name} 1` : '';

  // Get chapter heading based on content
  const getChapterHeading = () => {
    // Remove the hardcoded heading
    return null;
  };

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      console.log('Swipe Left Detected - Next Chapter');
      handleNextChapter();
    } else if (isRightSwipe) {
      console.log('Swipe Right Detected - Previous Chapter');
      handlePreviousChapter();
    }
  };

  return (
    <div
      className="bible-page-full"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header Bar */}
      <div
        className="sticky top-0 z-50 flex items-center gap-2 border-b border-border/60 bg-background/95 px-3 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] font-sans backdrop-blur-xl"
        style={{ touchAction: 'none' }}
      >
        <button
          onClick={onBackToChapters}
          className="flex min-w-0 items-center gap-1 rounded-full bg-slate-100 py-1.5 pl-3.5 pr-2.5 transition active:scale-95 dark:bg-slate-800"
          aria-label="Choose book and chapter"
        >
          <span className="truncate text-[15px] font-semibold text-foreground">{getBookDisplayName()} {selectedChapter}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
        <button
          onClick={() => onVersionSelectorOpen?.()}
          className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-bold text-foreground transition active:scale-95 dark:bg-slate-800"
          aria-label="Change translation"
        >
          {getVersionDisplayName(selectedVersion)}
        </button>

        <div className="ml-auto flex shrink-0 items-center">
          <button
            className="rounded-full p-2 text-foreground transition hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-800 sm:p-2.5"
            onClick={() => onSearchOpen?.()}
            aria-label="Search the Bible"
            title="Search"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            className="rounded-full p-2 text-foreground transition hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-800 sm:p-2.5"
            onClick={() => onStudyOpen?.()}
            aria-label="Study notes"
            title="Study notes"
          >
            <GraduationCap className="h-5 w-5" />
          </button>
          <button
            className="rounded-full p-2 text-foreground transition hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-800 sm:p-2.5"
            onClick={() => onLibraryOpen?.('highlights')}
            aria-label="My highlights and notes"
            title="Highlights & notes"
          >
            <Highlighter className="h-5 w-5" />
          </button>
          <button
            className="rounded-full p-2 text-foreground transition hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-800 sm:p-2.5"
            onClick={() => onMenuOpen?.()}
            aria-label="Bible settings"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}

      <div
        className="bible-main-content-full flex-1 overflow-y-auto min-h-0"
        id="bible-content-scroll"
        ref={scrollContainerRef}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : chapterContent ? (
          <div className="mx-auto max-w-2xl px-5 pb-48 pt-1">
            {/* Chapter heading, like a printed Bible */}
            <header className="select-none pb-3 pt-5 text-center font-sans">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{getBookDisplayName()}</p>
              <p className="mt-1 font-serif text-[52px] font-light leading-none text-foreground">{selectedChapter}</p>
              {(studyVerses.size > 0 || chapterNotes.length > 0) && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {studyVerses.size > 0 && (
                    <button
                      onClick={() => onStudyOpen?.()}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[12.5px] font-semibold text-amber-700 transition active:scale-95 dark:bg-amber-950/50 dark:text-amber-300"
                    >
                      <GraduationCap className="h-3.5 w-3.5" /> Study notes
                    </button>
                  )}
                  {chapterNotes.length > 0 && (
                    <button
                      onClick={() => onLibraryOpen?.('notes')}
                      className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[12.5px] font-semibold text-violet-700 transition active:scale-95 dark:bg-violet-950/50 dark:text-violet-300"
                    >
                      <NotebookPen className="h-3.5 w-3.5" /> {chapterNotes.length} {chapterNotes.length === 1 ? 'note' : 'notes'}
                    </button>
                  )}
                </div>
              )}
            </header>
            {followPaused && readingVerse && globalAudio?.audioState.isPlaying && (
              <button
                onClick={() => setFollowPaused(false)}
                className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+4.5rem)] z-40 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 animate-in fade-in slide-in-from-top-2"
              >
                Follow along · verse {readingVerse}
              </button>
            )}
            {/* Multi-select controls - REMOVED FROM TOP */}
            {/* Bible Text */}
            <div className="space-y-4" key={settingsKey}>
              {(chapterContent.verses || []).filter((v, i, arr) => {
                const vn = Number(v.verse) || i + 1;
                return arr.findIndex(u => (Number(u.verse) || 0) === vn && (u.text || '').trim() === (v.text || '').trim()) === i;
              }).map((verse, index) => {
                // Ensure we get the correct verse number - prefer verse.verse if it's a valid number
                let verseNumber: number;
                if (verse.verse && !isNaN(Number(verse.verse))) {
                  verseNumber = Number(verse.verse);
                } else {
                  verseNumber = index + 1;
                }

                const highlight = getHighlightForVerse(verseNumber);

                // Handle click: copy verse text to clipboard and select the verse
                const handleVerseClick = async () => {
                  if (isMultiSelectMode) {
                    // Toggle verse selection in multi-select mode
                    setSelectedVerses(prev => {
                      if (prev.includes(verseNumber)) {
                        return prev.filter(v => v !== verseNumber);
                      } else {
                        return [...prev, verseNumber].sort((a, b) => a - b);
                      }
                    });
                    return;
                  }

                  // Toggle this verse and keep the clipboard in step with the whole selection
                  const nextSelection = selectedVerses.includes(verseNumber)
                    ? selectedVerses.filter(v => v !== verseNumber)
                    : [...selectedVerses, verseNumber].sort((a, b) => a - b);
                  setSelectedVerses(nextSelection);
                  if (nextSelection.length) await writeClipboard(buildVerseCopy(nextSelection));
                };

                // Format text with Jesus' words in red for Gospels
                const formatText = (text: string) => {
                  // The text is now clean from the wldeh/bible-api - no HTML cleaning needed
                  let cleanText = cleanVerseArtifacts(text);

                  // Convert line breaks to HTML breaks for proper rendering
                  cleanText = cleanText.replace(/\n/g, '<br>');

                  // Only fix any remaining truncated "LORD" text if present
                  if (cleanText.includes('D ')) {
                    cleanText = cleanText
                      .replace(/\bD\b/g, 'LORD') // Replace standalone "D" with "LORD"
                      .replace(/\bD\s+/g, 'LORD ') // Replace "D " with "LORD "
                      .replace(/\s+D\b/g, ' LORD') // Replace " D" with " LORD"
                      .replace(/\s+D\s+/g, ' LORD '); // Replace " D " with " LORD "
                  }

                  // DIRECT FIX: Ensure question marks are preserved
                  // This is a safety net to ensure punctuation is not lost
                  if (text.includes('?') && !cleanText.includes('?')) {
                    console.warn(`⚠️ Question mark lost in processing for verse ${verseNumber}:`, {
                      original: text,
                      processed: cleanText
                    });
                    // Try to restore the question mark
                    cleanText = cleanText.replace(/([^.!?])(\s*<br>\s*$)/, '$1?$2');
                  }

                  const gospels = ['Matthew', 'Mark', 'Luke', 'John'];
                  const bookName = getBookDisplayName();

                  if (redLetters && gospels.includes(bookName)) {
                    // Wrap quoted speech (Jesus' words) in red
                    // Supports straight quotes "..." and curly quotes " … "
                    const formattedText = cleanText
                      .replace(/([""])([^"""]+)([""])/g, '$1<span class="text-red-600 dark:text-red-400">$2</span>$3');
                    return {
                      __html: DOMPurify.sanitize(formattedText, {
                        ALLOWED_TAGS: ['span', 'br'],
                        ALLOWED_ATTR: ['class']
                      })
                    };
                  }
                  return {
                    __html: DOMPurify.sanitize(cleanText, {
                      ALLOWED_TAGS: ['br'],
                      ALLOWED_ATTR: []
                    })
                  };
                };

                const verseStyle = {
                  fontSize: `${displayFontSize}px`,
                  lineHeight: '1.6',
                  '--font-size': `${displayFontSize}px`,
                  '--bible-font-size': `${displayFontSize}px`
                } as React.CSSProperties;
                // Highlights sit behind the words like a marker pen; verse-highlight keeps
                // the text dark enough to read on the colour in dark mode
                const highlightClass = highlight
                  ? cn('verse-highlight rounded-[4px] px-[3px] -mx-[3px] box-decoration-clone', highlightColor(highlight.highlight_color).mark)
                  : '';

                // Always show verse numbers beside each verse
                const shouldShowUIVerseNumber = true;

                const isSelected = selectedVerses.includes(verseNumber);
                const isReading = readingVerse === verseNumber;
                const verseNotes = notesByVerse.get(verseNumber);
                const hasStudyNote = studyMarkers && studyVerses.has(verseNumber);

                return (
                  <p
                    key={`${settingsKey}-${index}`}
                    data-verse={verseNumber}
                    className={cn(
                      `mb-3.5 font-serif text-foreground cursor-pointer select-none rounded-xl transition-all duration-500`,
                      isReading && '-mx-3 bg-blue-50 px-3 py-2 ring-1 ring-blue-200/80 dark:bg-blue-950/50 dark:ring-blue-800/60',
                      readingVerse !== null && !isReading && 'opacity-60'
                    )}
                    style={verseStyle}
                    onClick={handleVerseClick}
                    aria-current={isReading ? 'true' : undefined}
                  >
                    {/* Always show verse numbers beside each verse */}
                    {shouldShowUIVerseNumber && (
                      <sup className="relative top-0.5 mr-1.5 font-sans text-[0.62em] font-semibold text-blue-600/80 dark:text-blue-400/80">
                        {verseNumber}
                      </sup>
                    )}
                    <span
                      className={cn(
                        "transition-all duration-300",
                        highlightClass,
                        isSelected && "underline decoration-slate-950 dark:decoration-white underline-offset-[6px] decoration-2"
                      )}
                      dangerouslySetInnerHTML={formatText(verse.text)}
                    />
                    {verseNotes && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (verseNotes.length === 1) setNoteEditor({ note: verseNotes[0] });
                          else onLibraryOpen?.('notes');
                        }}
                        className="relative -top-[0.1em] ml-1.5 inline-flex h-[1.4em] w-[1.4em] items-center justify-center rounded-full bg-violet-100 align-middle text-violet-700 transition active:scale-90 dark:bg-violet-950 dark:text-violet-300"
                        aria-label={`Your ${verseNotes.length === 1 ? 'note' : 'notes'} on verse ${verseNumber}`}
                      >
                        <NotebookPen className="h-[0.75em] w-[0.75em]" />
                      </button>
                    )}
                    {hasStudyNote && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStudyOpen?.(verseNumber);
                        }}
                        className="relative -top-[0.1em] ml-1 inline-flex h-[1.4em] w-[1.4em] items-center justify-center rounded-full align-middle text-amber-500/80 transition hover:bg-amber-50 active:scale-90 dark:text-amber-400/70 dark:hover:bg-amber-950/50"
                        aria-label={`Study note on verse ${verseNumber}`}
                      >
                        <GraduationCap className="h-[0.8em] w-[0.8em]" />
                      </button>
                    )}
                  </p>
                );
              })}
            </div>

          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Unable to load chapter content.</p>
          </div>
        )}
      </div>

      {/* Now playing (audio Bible) — sits just above the tab bar */}
      {!(selectedVerses.length > 0 || isMultiSelectMode) && (
        <BibleAudioBar
          box={playerBox}
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          readingVerse={readingVerse}
          onListen={handlePlayPause}
          onPrevChapter={prevLabel ? handlePreviousChapter : undefined}
          onNextChapter={nextLabel ? handleNextChapter : undefined}
          onOfflineOpen={onOfflineOpen}
          onOpenPlaying={(bookApi, chapterNum) => onBookChange?.(bookApi, chapterNum, false)}
        />
      )}

      {/* Verse actions: highlight, copy, note, study, share */}
      <div
        className={cn(
          "fixed left-0 right-0 z-[100] px-3 transition-all duration-500 ease-out",
          selectedVerses.length > 0 || isMultiSelectMode
            ? "bottom-[calc(env(safe-area-inset-bottom)+var(--bible-selection-bottom-offset))] opacity-100 translate-y-0"
            : "bottom-0 opacity-0 translate-y-20 pointer-events-none"
        )}
      >
        <div className="mx-auto max-w-xl rounded-[26px] border border-slate-200/70 bg-white/95 p-3 font-sans shadow-2xl shadow-slate-900/15 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center gap-1.5 pl-1.5">
            <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-foreground">
              {selectedVerses.length ? selectionLabel(selectedVerses) : 'Tap verses to select them'}
            </p>
            <button
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              className="shrink-0 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
            >
              {isMultiSelectMode ? 'Done' : 'Select more'}
            </button>
            <button
              onClick={() => {
                setSelectedVerses([]);
                setIsMultiSelectMode(false);
              }}
              className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Colours */}
          <div className="mt-2 flex items-center justify-between gap-1 px-1">
            {HIGHLIGHT_COLORS.map((color) => {
              const current = selectedVerses.length > 0 && selectedVerses.every((v) => getHighlightForVerse(v)?.highlight_color === color.value);
              return (
                <button
                  key={color.value}
                  onClick={() => applyHighlight(color.value)}
                  disabled={!selectedVerses.length}
                  className={cn(
                    "h-9 w-9 rounded-full shadow-inner ring-offset-2 ring-offset-white transition active:scale-90 disabled:opacity-40 dark:ring-offset-slate-900",
                    color.swatch,
                    current && "ring-2 ring-slate-900 dark:ring-white"
                  )}
                  aria-label={`Highlight ${color.name.toLowerCase()}`}
                  title={color.name}
                />
              );
            })}
            <button
              onClick={clearHighlights}
              disabled={!selectedVerses.some((v) => getHighlightForVerse(v))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:text-red-500 active:scale-90 disabled:opacity-30 dark:bg-slate-800 dark:text-slate-400"
              aria-label="Remove highlight"
              title="Remove highlight"
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <VerseAction
              icon={Copy}
              label="Copy"
              disabled={!selectedVerses.length}
              onClick={async () => {
                const text = buildVerseCopy(selectedVerses);
                if (await writeClipboard(text)) {
                  appAlert('Copied', text.split('\n')[0], 'success');
                  setSelectedVerses([]);
                  setIsMultiSelectMode(false);
                } else {
                  appAlert("Couldn't copy", 'Please try again.', 'error');
                }
              }}
            />
            <VerseAction icon={NotebookPen} label="Note" disabled={!selectedVerses.length} onClick={writeNoteOnSelection} />
            {studyVerses.size > 0 && (
              <VerseAction
                icon={GraduationCap}
                label="Study"
                disabled={!selectedVerses.length}
                onClick={() => {
                  const first = Math.min(...selectedVerses);
                  setSelectedVerses([]);
                  setIsMultiSelectMode(false);
                  onStudyOpen?.(first);
                }}
              />
            )}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <VerseAction icon={Share2} label="Share" disabled={!selectedVerses.length} onClick={shareSelection} />
            )}
          </div>
        </div>
      </div>

      {user && (
        <NoteEditor
          open={!!noteEditor}
          userId={user.id}
          note={noteEditor?.note ?? null}
          defaults={noteEditor?.defaults}
          folders={noteFolders}
          onClose={() => {
            setNoteEditor(null);
            window.dispatchEvent(new CustomEvent(NOTES_CHANGED));
          }}
          onSaved={(saved) =>
            setChapterNotes((prev) => (prev.some((n) => n.id === saved.id) ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev]))
          }
          onDeleted={(id) => {
            setChapterNotes((prev) => prev.filter((n) => n.id !== id));
            window.dispatchEvent(new CustomEvent(NOTES_CHANGED));
          }}
        />
      )}
    </div >
  );
};


const VerseAction = ({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-slate-100 py-2.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
  >
    <Icon className="h-5 w-5" />
    {label}
  </button>
);

const formatClock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const bookName = (apiName: string) => {
  const all = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
  const b = all.find(x => x.apiName === normalizeBookApiName(apiName));
  return b?.name ?? apiName;
};

/** Dark "now playing" bar for the audio Bible, or a Listen button when nothing plays. */
const BibleAudioBar = ({
  box,
  selectedBook,
  selectedChapter,
  readingVerse,
  onListen,
  onPrevChapter,
  onNextChapter,
  onOfflineOpen,
  onOpenPlaying,
}: {
  box: { bottom: number; left: number; right: number };
  selectedBook: string;
  selectedChapter: number;
  readingVerse: number | null;
  onListen: () => void;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  onOfflineOpen?: () => void;
  onOpenPlaying: (bookApi: string, chapter: number) => void;
}) => {
  const globalAudio = useGlobalAudio();
  const a = globalAudio?.audioState;
  const active = !!a?.hasAudio && !!a.isBibleMode;
  const frame = { bottom: box.bottom, left: box.left, right: box.right };

  if (!active) {
    // Chapter arrows + Listen in one capsule
    return (
      <div style={frame} className="pointer-events-none fixed z-[90] flex justify-center px-3">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-slate-900 p-1.5 font-sans text-white shadow-xl shadow-slate-900/25 animate-in fade-in dark:bg-slate-800">
        <button
          onClick={onPrevChapter}
          disabled={!onPrevChapter}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 active:scale-90 disabled:opacity-30"
          aria-label="Previous chapter"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={onListen}
          className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[15px] font-semibold text-slate-900 transition active:scale-95"
          aria-label={`Listen to ${bookName(selectedBook)} ${selectedChapter}`}
        >
          <Headphones className="h-[18px] w-[18px]" /> Listen
        </button>
        <button
          onClick={onNextChapter}
          disabled={!onNextChapter}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 active:scale-90 disabled:opacity-30"
          aria-label="Next chapter"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      </div>
    );
  }

  const playingHere =
    normalizeBookApiName(a.currentBook || '') === normalizeBookApiName(selectedBook) && a.currentChapter === selectedChapter;
  const saved = offlineAudioService.isDownloaded(normalizeBookApiName(a.currentBook || ''), a.currentChapter);
  const progress = a.duration ? Math.min(100, (100 * a.currentTime) / a.duration) : 0;
  const left = a.duration ? `${formatClock(a.duration - a.currentTime)} left` : a.isLoading ? 'Loading…' : '';
  const detail = [playingHere && readingVerse ? `Verse ${readingVerse}` : null, left].filter(Boolean).join(' · ');

  return (
    <div style={frame} className="pointer-events-none fixed z-[90] px-3">
    <div className="pointer-events-auto mx-auto max-w-xl overflow-hidden rounded-[22px] bg-slate-900 font-sans text-white shadow-2xl shadow-slate-900/30 animate-in fade-in slide-in-from-bottom-3 dark:bg-slate-800">
      <div className="h-[3px] bg-white/10">
        <div className="h-full bg-blue-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center gap-1.5 py-2 pl-2 pr-1.5">
        <button
          onClick={() => globalAudio.goToPreviousChapter()}
          className="rounded-full p-2 text-white/80 hover:bg-white/10 active:scale-90"
          aria-label="Previous chapter"
        >
          <SkipBack className="h-5 w-5 fill-current" />
        </button>
        <button
          onClick={() => (a.isPlaying ? globalAudio.pause() : globalAudio.resume())}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 transition active:scale-90"
          aria-label={a.isPlaying ? 'Pause' : 'Play'}
        >
          {a.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : a.isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          )}
        </button>
        <button
          onClick={() => globalAudio.goToNextChapter()}
          className="rounded-full p-2 text-white/80 hover:bg-white/10 active:scale-90"
          aria-label="Next chapter"
        >
          <SkipForward className="h-5 w-5 fill-current" />
        </button>
        <button
          onClick={() => !playingHere && onOpenPlaying(normalizeBookApiName(a.currentBook || ''), a.currentChapter)}
          className="min-w-0 flex-1 px-1.5 text-left"
          aria-label={playingHere ? undefined : 'Go to the chapter that is playing'}
        >
          <span className="block truncate text-[14.5px] font-semibold">
            {bookName(a.currentBook || '')} {a.currentChapter}
          </span>
          <span className="block truncate text-[12px] text-white/65">
            {playingHere ? detail : `Playing · tap to open`}
          </span>
        </button>
        {saved ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-emerald-300" title="Saved on this device">
            <WifiOff className="h-3.5 w-3.5" /> Offline
          </span>
        ) : onOfflineOpen ? (
          <button
            onClick={onOfflineOpen}
            className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 hover:bg-white/20"
          >
            Download
          </button>
        ) : null}
        <button onClick={() => globalAudio.reset()} className="shrink-0 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Stop audio">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
    </div>
  );
};
