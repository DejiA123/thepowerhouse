import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, MoreVertical, Volume2, Play, Pause, ChevronLeft, ChevronRight, ChevronDown, FileText, Palette, Pencil, X, Copy, Trash2, NotebookPen, MoreHorizontal, Headphones, SkipBack, SkipForward, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { BibleChapter } from "@/types/bible";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";
import { bibleBooks } from "./BibleBookList";
import { normalizeBookApiName } from "./bookUtils";
import { estimateVerseTimings, getVerseTimings, verseAt, type VerseTimings } from "@/services/verseTimingService";
import { useToast } from "@/hooks/use-toast";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
// Import BibleNotesDialog for notes functionality
import { BibleNotesDialog } from "./BibleNotesDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AllHighlightsList from "./AllHighlightsList";
import { supabaseAudioService } from "@/services/supabaseAudioService";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
import { offlineAudioService } from "@/services/offlineAudioService";
import { appAlert } from "@/lib/appAlert";
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
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showHighlightDialog, setShowHighlightDialog] = useState(false);
  const [showHighlightsList, setShowHighlightsList] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
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
  const navigate = useNavigate();

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

  // Highlights state
  const [highlights, setHighlights] = useState<any[]>([]);


  // Fetch highlights for current chapter
  useEffect(() => {
    if (user) {
      fetchHighlights();
    }
  }, [user, selectedBook, selectedChapter]);

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

  const [playerBottom, setPlayerBottom] = useState(88);
  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector<HTMLElement>('.bottom-nav-bar, #bottom-nav-bar');
      const rect = nav?.getBoundingClientRect();
      const visible = rect && rect.height > 0 && getComputedStyle(nav!).display !== 'none' && rect.top < window.innerHeight;
      setPlayerBottom(visible ? Math.max(12, window.innerHeight - rect!.top + 10) : 16);
    };
    measure();
    const t = setTimeout(measure, 600);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
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

  const fetchHighlights = async () => {
    try {
      const { data, error } = await supabase
        .from('bible_highlights')
        .select('*')
        .eq('user_id', user.id)
        .eq('book', selectedBook)
        .eq('chapter', selectedChapter);
      if (error) throw error;
      setHighlights(data || []);
    } catch (error) {
      console.error('Error fetching highlights:', error);
    }
  };

  const getHighlightForVerse = (verseNumber: number) => {
    return highlights.find(h => h.verse === verseNumber);
  };

  const refetchHighlights = fetchHighlights;

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
  // Clean common artifacts like inline references (e.g., 6:1 or 6.1) and footnote letters (a)
  const cleanVerseArtifacts = (input: string): string => {
    let cleaned = input;

    // First, aggressively remove numbers before brackets
    cleaned = cleaned
      // Remove verse numbers that appear before bracketed numbers (multiple patterns)
      .replace(/\b\d+\s+(\[\d+\])/g, '$1') // "1 [1]" -> "[1]"
      .replace(/\b\d+\s*(\[\d+\])/g, '$1') // "1[1]" -> "[1]" (no space)
      .replace(/\s+\d+\s+(\[\d+\])/g, ' $1') // " 1 [1]" -> " [1]"
      .replace(/\s+\d+\s*(\[\d+\])/g, ' $1') // " 1[1]" -> " [1]" (no space)
      // Remove any standalone numbers that appear before brackets
      .replace(/(\s|^)\d+(\s*\[\d+\])/g, '$1$2')
      // More aggressive: remove any number followed by brackets
      .replace(/\d+\s*(\[\d+\])/g, '$1')
      // Even more aggressive: remove any number that appears before text that contains brackets
      .replace(/^\s*\d+\s+(?=.*\[\d+\])/g, '') // Remove verse numbers at start if text contains brackets
      .replace(/\s+\d+\s+(?=.*\[\d+\])/g, ' '); // Remove standalone numbers if text contains brackets

    // Add consistent line breaks before verse numbers for better readability
    // Use a more direct approach to ensure ALL verse numbers get the same spacing
    cleaned = cleaned
      // Remove brackets from verse numbers if present
      .replace(/\[(\d+)\]/g, '$1')
      // First, normalize all existing line breaks and whitespace around verse numbers
      .replace(/\s*\n*\s*(\d+)(?=\s)/g, '\n\n$1') // Replace any whitespace/line breaks before verse numbers with exactly two line breaks
      // Clean up any triple or more line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Ensure the first verse number doesn't have line breaks at the start
      .replace(/^\n+(\d+)/g, '$1');

    // Then apply other cleaning rules
    cleaned = cleaned
      // Remove verse numbers at the beginning of text (e.g., "1 In the beginning...")
      .replace(/^\s*\d+\s+/, '')
      // Remove verse numbers anywhere in the text that might be standalone (e.g., "1" at start of line)
      .replace(/\b\d+\s+(?=[A-Z])/g, '')
      // Remove tokens like 6:1 or 6.1 that sometimes appear in Psalms/OT feeds
      .replace(/\b\d+[:.]\d+\b/g, '')
      // Remove single-letter footnote markers like [a] but keep numbered brackets like [1], [2], [3]
      .replace(/\s*\[[a-zA-Z]\]\s*/g, ' ')
      // Remove parenthetical single-letter footnotes like (a) but keep real words like (Selah)
      .replace(/\s*\(\s*[a-zA-Z]\s*\)\s*/g, ' ')
      // Remove paragraph marks (pilcrow) and other formatting characters
      .replace(/¶/g, '') // Remove paragraph mark
      .replace(/[\u00A0\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, ' ') // Replace various Unicode spaces with regular space
      // EXTRA AGGRESSIVE: Remove any standalone numbers that appear before text (for bracketed verses)
      .replace(/^\s*\d+\s+(?=.*\[\d+\])/g, '') // Remove numbers at start if brackets exist
      .replace(/\s+\d+\s+(?=.*\[\d+\])/g, ' ') // Remove standalone numbers if brackets exist
      // Normalize leftover spacing
      .replace(/\s{2,}/g, ' ')
      .trim();

    return cleaned;
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
  const buildVerseCopy = (verseNumbers: number[]) => {
    const nums = [...new Set(verseNumbers)].sort((a, b) => a - b);
    const ranges: string[] = [];
    for (let i = 0; i < nums.length;) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      ranges.push(i === j ? `${nums[i]}` : `${nums[i]}-${nums[j]}`);
      i = j + 1;
    }
    const byNumber = new Map<number, string>();
    (chapterContent?.verses || []).forEach((v, i) => {
      const n = v.verse && !isNaN(Number(v.verse)) ? Number(v.verse) : i + 1;
      if (!byNumber.has(n)) byNumber.set(n, v.text || '');
    });
    const plain = (text: string) => cleanVerseArtifacts(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const body = nums
      .map((n, idx) => (idx === 0 ? plain(byNumber.get(n) || '') : `[${n}] ${plain(byNumber.get(n) || '')}`))
      .join(' ');
    return `${getBookDisplayName()} ${selectedChapter}:${ranges.join(', ')} ${getVersionDisplayName(selectedVersion)}\n${body}`;
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
            className="rounded-full p-2.5 text-foreground transition hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-800"
            onClick={() => onSearchOpen?.()}
            aria-label="Search the Bible"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            className="rounded-full p-2.5 text-foreground transition hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-800"
            onClick={() => navigate('/bible-notes', { state: { returnBook: selectedBook, returnChapter: selectedChapter } })}
            aria-label="Notes"
          >
            <NotebookPen className="h-5 w-5" />
          </button>
          <button
            className="rounded-full p-2.5 text-foreground transition hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-800"
            onClick={() => onMenuOpen?.()}
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
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
                  setSelectedVerse(verseNumber);
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
                // Apply highlight background if verse is highlighted
                // Force readable text color in dark mode when highlighted
                const highlightClass = highlight
                  ? `bg-${highlight.highlight_color}-200 rounded px-1 verse-highlight`
                  : '';

                // Always show verse numbers beside each verse
                const shouldShowUIVerseNumber = true;

                const isSelected = selectedVerses.includes(verseNumber);
                const isReading = readingVerse === verseNumber;

                return (
                  <p
                    key={`${settingsKey}-${index}`}
                    data-verse={verseNumber}
                    className={cn(
                      `mb-3.5 font-serif text-foreground ${highlightClass} cursor-pointer select-none rounded-xl transition-all duration-500`,
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
                        isSelected && "underline decoration-slate-950 dark:decoration-white underline-offset-[6px] decoration-2"
                      )}
                      dangerouslySetInnerHTML={formatText(verse.text)}
                    />
                  </p>
                );
              })}
            </div>

            {/* Previous / next chapter */}
            <nav className="mt-10 grid grid-cols-2 gap-3 font-sans" aria-label="Chapters">
              <button
                onClick={handlePreviousChapter}
                disabled={!prevLabel}
                className="flex items-center gap-2 rounded-2xl border border-border/70 px-3 py-3 text-left transition active:scale-[0.98] disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Previous</span>
                  <span className="block truncate text-[15px] font-semibold text-foreground">{prevLabel || '—'}</span>
                </span>
              </button>
              <button
                onClick={handleNextChapter}
                disabled={!nextLabel}
                className="flex items-center justify-end gap-2 rounded-2xl bg-blue-600 px-3 py-3 text-right text-white shadow-md shadow-blue-600/20 transition active:scale-[0.98] disabled:opacity-40"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/75">Next</span>
                  <span className="block truncate text-[15px] font-semibold">{nextLabel || '—'}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-white/80" />
              </button>
            </nav>
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
          bottom={playerBottom}
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

      {/* Floating Action Bar for Verse Selection */}
      <div
        className={cn(
          "fixed left-0 right-0 z-[100] px-4 transition-all duration-500 ease-out",
          selectedVerses.length > 0 || isMultiSelectMode
            ? "bottom-[calc(env(safe-area-inset-bottom)+var(--bible-selection-bottom-offset))] opacity-100 translate-y-0"
            : "bottom-0 opacity-0 translate-y-20 pointer-events-none"
        )}
      >
        <div className="max-w-xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-[2rem] shadow-2xl p-4 flex flex-col gap-4">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white text-xs font-black px-2 py-1 rounded-full font-sans not-italic">
                {selectedVerses.length} {selectedVerses.length === 1 ? 'Verse' : 'Verses'} Selected
              </div>
              <button
                onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors font-sans not-italic"
              >
                {isMultiSelectMode ? 'Exit Select' : 'Select More'}
              </button>
            </div>
            <button
              onClick={() => {
                setSelectedVerses([]);
                setIsMultiSelectMode(false);
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Color & Actions Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Color Coordinator */}
            <div className="flex items-center gap-2.5 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              {[
                { name: 'Yellow', value: 'yellow', class: 'bg-yellow-300' },
                { name: 'Green', value: 'green', class: 'bg-green-300' },
                { name: 'Blue', value: 'blue', class: 'bg-blue-300' },
                { name: 'Pink', value: 'pink', class: 'bg-pink-300' },
                { name: 'Purple', value: 'purple', class: 'bg-purple-300' },
              ].map((color) => (
                <button
                  key={color.value}
                  onClick={async () => {
                    try {
                      const highlightsData = selectedVerses.map(verseNum => ({
                        user_id: user?.id,
                        book: selectedBook,
                        chapter: selectedChapter,
                        verse: verseNum,
                        highlight_color: color.value,
                      }));
                      const { error } = await supabase.from('bible_highlights').upsert(highlightsData);
                      if (!error) {
                        await refetchHighlights();
                        setSelectedVerses([]);
                        setIsMultiSelectMode(false);
                      }
                    } catch (error) {
                      console.error('Error adding highlights:', error);
                    }
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full transition-transform active:scale-90 border-2 border-white dark:border-slate-700 shadow-sm hover:scale-110",
                    color.class
                  )}
                  title={color.name}
                />
              ))}
              <button
                onClick={() => setShowHighlightDialog(true)}
                className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/40 rounded-full border-2 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all hover:scale-110 ml-1"
                title="More Colors"
              >
                <Palette className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                onClick={async () => {
                  try {
                    const highlightsToRemove = selectedVerses.map(verseNum => getHighlightForVerse(verseNum)).filter(Boolean);
                    if (highlightsToRemove.length > 0) {
                      const { error } = await supabase.from('bible_highlights').delete().in('id', highlightsToRemove.map(h => h!.id));
                      if (!error) {
                        await refetchHighlights();
                      }
                    }
                  } catch (error) { console.error(error); }
                  setSelectedVerses([]);
                  setIsMultiSelectMode(false);
                }}
                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full border-2 border-slate-100 dark:border-slate-600 text-slate-400 hover:text-red-500 transition-all hover:scale-110"
                title="Remove Highlights"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!selectedVerses.length) return;
                  const text = buildVerseCopy(selectedVerses);
                  if (await writeClipboard(text)) {
                    appAlert('Copied', text.split('\n')[0], 'success');
                    setSelectedVerses([]);
                    setIsMultiSelectMode(false);
                  } else {
                    appAlert("Couldn't copy", 'Please try again.', 'error');
                  }
                }}
                className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-colors active:scale-95"
                title="Copy Verses"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowNotesDialog(true)}
                className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-100 transition-colors active:scale-95"
                title="Add Notes"
              >
                <FileText className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bible Notes Dialog */}
      <BibleNotesDialog
        open={showNotesDialog}
        onOpenChange={setShowNotesDialog}
        book={selectedBook}
        chapter={selectedChapter}
        verse={selectedVerses.length > 0 ? selectedVerses[0] : undefined}
      />

      {/* All Highlights Dialog */}
      <Dialog open={showHighlightsList} onOpenChange={setShowHighlightsList}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto mt-24">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Your Highlights
            </DialogTitle>
            <DialogDescription>
              Select any verse to navigate to it
            </DialogDescription>
          </DialogHeader>
          <AllHighlightsList onNavigate={(bookApi, chapterNum) => {
            setShowHighlightsList(false);
            // Prefer parent callbacks if present
            if (onBookChange && normalizeBookApiName(bookApi) !== normalizeBookApiName(selectedBook)) {
              onBookChange(bookApi, chapterNum, false);
            } else if (onChapterChange) {
              onChapterChange(chapterNum, false);
            }
          }} />
        </DialogContent>
      </Dialog>

      {/* Highlight Color Dialog */}
      <Dialog open={showHighlightDialog} onOpenChange={setShowHighlightDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Highlight {selectedVerses.length > 1 ? `${selectedVerses.length} Verses` : `Verse ${selectedVerse}`}
            </DialogTitle>
            <DialogDescription>
              Choose a highlight color for {selectedVerses.length > 1 ? `these ${selectedVerses.length} verses` : 'this Bible verse'} to help with your study and reference.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 py-4">
            {[
              { name: 'Yellow', value: 'yellow', class: 'bg-yellow-200' },
              { name: 'Green', value: 'green', class: 'bg-green-200' },
              { name: 'Blue', value: 'blue', class: 'bg-blue-200' },
              { name: 'Pink', value: 'pink', class: 'bg-pink-200' },
              { name: 'Purple', value: 'purple', class: 'bg-purple-200' },
              { name: 'Remove', value: 'remove', class: 'bg-gray-200' },
            ].map((color) => (
              <Button
                key={color.value}
                variant="outline"
                className={`h-12 ${color.class} hover:opacity-80`}
                onClick={async () => {
                  if (color.value === 'remove') {
                    // Remove highlights from all selected verses
                    try {
                      const highlightsToRemove = selectedVerses
                        .map(verseNum => getHighlightForVerse(verseNum))
                        .filter(Boolean);

                      if (highlightsToRemove.length > 0) {
                        const { error } = await supabase
                          .from('bible_highlights')
                          .delete()
                          .in('id', highlightsToRemove.map(h => h!.id));

                        if (!error) {
                          await refetchHighlights();
                        }
                      }
                    } catch (error) {
                      console.error('Error removing highlights:', error);
                    }
                  } else {
                    // Add/update highlights for all selected verses
                    try {
                      const highlightsData = selectedVerses.map(verseNum => ({
                        user_id: user?.id,
                        book: selectedBook,
                        chapter: selectedChapter,
                        verse: verseNum,
                        highlight_color: color.value,
                      }));

                      const { error } = await supabase
                        .from('bible_highlights')
                        .upsert(highlightsData);

                      if (!error) {
                        await refetchHighlights();
                      }
                    } catch (error) {
                      console.error('Error adding highlights:', error);
                    }
                  }
                  setShowHighlightDialog(false);
                  setSelectedVerses([]);
                }}
              >
                {color.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>


    </div >
  );
};


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
  bottom,
  selectedBook,
  selectedChapter,
  readingVerse,
  onListen,
  onPrevChapter,
  onNextChapter,
  onOfflineOpen,
  onOpenPlaying,
}: {
  bottom: number;
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

  if (!active) {
    // Chapter arrows + Listen in one capsule
    return (
      <div
        style={{ bottom: `calc(${bottom}px)` }}
        className="fixed left-1/2 z-[90] flex -translate-x-1/2 items-center gap-1 rounded-full bg-slate-900 p-1.5 font-sans text-white shadow-xl shadow-slate-900/25 animate-in fade-in dark:bg-slate-800"
      >
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
    );
  }

  const playingHere =
    normalizeBookApiName(a.currentBook || '') === normalizeBookApiName(selectedBook) && a.currentChapter === selectedChapter;
  const saved = offlineAudioService.isDownloaded(normalizeBookApiName(a.currentBook || ''), a.currentChapter);
  const progress = a.duration ? Math.min(100, (100 * a.currentTime) / a.duration) : 0;
  const left = a.duration ? `${formatClock(a.duration - a.currentTime)} left` : a.isLoading ? 'Loading…' : '';
  const detail = [playingHere && readingVerse ? `Verse ${readingVerse}` : null, left].filter(Boolean).join(' · ');

  return (
    <div
      style={{ bottom: `calc(${bottom}px)` }}
      className="fixed inset-x-3 z-[90] mx-auto max-w-xl overflow-hidden rounded-[22px] bg-slate-900 font-sans text-white shadow-2xl shadow-slate-900/30 animate-in fade-in slide-in-from-bottom-3 dark:bg-slate-800"
    >
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
  );
};
