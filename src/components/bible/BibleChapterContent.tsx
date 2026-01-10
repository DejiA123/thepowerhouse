import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, MoreVertical, Volume2, Play, Pause, ChevronLeft, ChevronRight, FileText, Palette, Pencil, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BibleChapter } from "@/types/bible";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";
import { bibleBooks } from "./BibleBookList";
import { normalizeBookApiName } from "./bookUtils";
import { useToast } from "@/hooks/use-toast";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
// Import BibleNotesDialog for notes functionality
import { BibleNotesDialog } from "./BibleNotesDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AllHighlightsList from "./AllHighlightsList";
import { supabaseAudioService } from "@/services/supabaseAudioService";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
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
    if (shouldAutoPlay && globalAudio && !globalAudio.audioState.isLoading && !globalAudio.audioState.isPlaying) {
      console.log('🎵 BibleChapterContent: Auto-playing MP3 audio via GlobalAudioContext');

      const playAudio = async () => {
        try {
          await globalAudio.playBibleChapterMP3(
            selectedBook,
            selectedChapter,
            selectedVersion!,
            autoPlayNext,
            false
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
      globalAudio.audioState.currentBook === selectedBook &&
      globalAudio.audioState.currentChapter === selectedChapter;

    if (isCurrentChapterPlaying) {
      // Pause the current audio
      globalAudio.pause();
    } else if (globalAudio.audioState.isPaused &&
      globalAudio.audioState.currentBook === selectedBook &&
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
          false // loopChapter
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

  // Get chapter heading based on content
  const getChapterHeading = () => {
    // Remove the hardcoded heading
    return null;
  };

  return (
    <div className="bible-page-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-100/50">
        {/* Left Side: Book/Chapter and Version Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToChapters}
            className="flex items-center justify-center px-4 py-1.5 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all rounded-full"
          >
            <span className="text-sm font-semibold text-gray-900 font-sans">{getBookDisplayName()} {selectedChapter}</span>
          </button>

          <button
            onClick={() => onVersionSelectorOpen?.()}
            className="flex items-center justify-center px-4 py-1.5 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all rounded-full"
          >
            <span className="text-sm font-bold text-gray-900 font-sans">{getVersionDisplayName(selectedVersion)}</span>
          </button>
        </div>

        {/* Right Side: Action Icons */}
        <div className="flex items-center gap-1">
          <button
            className="p-2 text-gray-900 hover:bg-gray-100 rounded-full active:scale-95 transition-all"
            onClick={handlePlayPause}
            disabled={globalAudio?.audioState.isLoading || false}
          >
            {globalAudio?.audioState.isLoading ? (
              <Volume2 className="w-5 h-5 opacity-50" />
            ) : (globalAudio?.audioState.isPlaying &&
              globalAudio?.audioState.currentBook === selectedBook &&
              globalAudio?.audioState.currentChapter === selectedChapter) ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          <button
            className="p-2 text-gray-900 hover:bg-gray-100 rounded-full active:scale-95 transition-all"
            onClick={() => navigate('/bible-notes')}
          >
            <FileText className="w-5 h-5" />
          </button>

          <button
            className="p-2 text-gray-900 hover:bg-gray-100 rounded-full active:scale-95 transition-all"
            onClick={() => onSearchOpen?.()}
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            className="p-2 text-gray-900 hover:bg-gray-100 rounded-full active:scale-95 transition-all"
            onClick={() => onMenuOpen?.()}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}

      <div
        className="bible-main-content-full overscroll-none"
        onTouchStart={(e) => {
          // Only handle swipes if not on an interactive element
          if ((e.target as HTMLElement).closest('button, input, a, [role="button"]')) {
            return;
          }

          const touch = e.touches[0];
          const startX = touch.clientX;
          const startY = touch.clientY;
          const startTime = Date.now();
          let isSwiping = false;

          const handleTouchMove = (moveEvent: TouchEvent) => {
            const moveTouch = moveEvent.touches[0];
            const deltaX = moveTouch.clientX - startX;

            // If horizontal movement is significant, mark as swiping and prevent scrolling
            if (Math.abs(deltaX) > 30) {
              isSwiping = true;
              moveEvent.preventDefault();
            }
          };

          const handleTouchEnd = (endEvent: TouchEvent) => {
            const endTouch = endEvent.changedTouches[0];
            const endX = endTouch.clientX;
            const endY = endTouch.clientY;
            const deltaX = endX - startX;
            const deltaY = Math.abs(endY - startY);
            const deltaTime = Date.now() - startTime;

            // Check if it's a valid swipe (minimum distance and speed, more horizontal than vertical)
            if (Math.abs(deltaX) > 70 && deltaTime < 400 && Math.abs(deltaX) > deltaY * 2) {
              if (deltaX > 0) {
                // Swipe right - go to previous chapter
                handlePreviousChapter();
              } else {
                // Swipe left - go to next chapter
                handleNextChapter();
              }
            }

            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
          };

          document.addEventListener('touchmove', handleTouchMove, { passive: false });
          document.addEventListener('touchend', handleTouchEnd);
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : chapterContent ? (
          <div className="max-w-4xl mx-auto px-4 pt-2 pb-32">
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

                // Debug: Log verse data to help identify duplication issues
                if (index < 5) { // Log first 5 verses to see more examples
                  const hasBracketedNumbers = /\[\d+\]/.test(verse.text || '');
                  const cleanedText = cleanVerseArtifacts(verse.text || '');
                  const bracketMatches = (verse.text || '').match(/\[\d+\]/g) || [];
                  console.log(`🔍 Verse ${index + 1}:`, {
                    verseProperty: verse.verse,
                    calculatedNumber: verseNumber,
                    originalText: verse.text,
                    cleanedText: cleanedText,
                    bracketMatches: bracketMatches,
                    textPreview: verse.text?.substring(0, 150) + '...',
                    textStartsWithNumber: /^\d+/.test(verse.text || ''),
                    hasBracketedNumbers: hasBracketedNumbers,
                    hasNumbersBeforeBrackets: /\d+\s*\[\d+\]/.test(verse.text || ''),
                    willShowUIVerseNumber: !hasBracketedNumbers,
                    hasLineBreaks: cleanedText.includes('\n'),
                    lineBreakCount: (cleanedText.match(/\n/g) || []).length
                  });
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

                  // Add this verse to selected verses and show the Select Verses button
                  setSelectedVerses(prev => {
                    if (prev.includes(verseNumber)) {
                      return prev; // Already selected, keep as is
                    } else {
                      return [...prev, verseNumber].sort((a, b) => a - b);
                    }
                  });

                  try {
                    const reference = `${getBookDisplayName()} ${selectedChapter}:${verseNumber}`;
                    const cleanText = (verse.text || '').replace(/\s+/g, ' ').trim();
                    const copyText = `${reference} - ${cleanText}`;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(copyText);
                    } else {
                      const ta = document.createElement('textarea');
                      ta.value = copyText;
                      ta.style.position = 'fixed';
                      ta.style.left = '-9999px';
                      document.body.appendChild(ta);
                      ta.select();
                      try { document.execCommand('copy'); } catch { }
                      document.body.removeChild(ta);
                    }
                    // Silent copy - no toast notification
                  } catch (e) {
                    console.error('Copy to clipboard failed:', e);
                    // Silent error - no toast notification for copy failures
                  }
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
                console.log(`🔍 Rendering verse ${verseNumber} with fontSize: ${displayFontSize}px, style:`, verseStyle);
                console.log(`🔍 Current font size state: currentFontSize=${currentFontSize}, displayFontSize=${displayFontSize}, preferences.fontSize=${preferences.fontSize}`);

                // Apply highlight background if verse is highlighted
                // Force readable text color in dark mode when highlighted
                const highlightClass = highlight
                  ? `bg-${highlight.highlight_color}-200 rounded px-1 verse-highlight`
                  : '';

                // Always show verse numbers beside each verse
                const shouldShowUIVerseNumber = true;

                // Debug: Log verse processing for problematic verses
                if (verseNumber === 4 || verseNumber === 2 || verseNumber === 1 || verseNumber === 3 || verseNumber === 16) {
                  const originalText = verse.text || '';
                  const cleanedText = cleanVerseArtifacts(originalText);
                  const formattedText = formatText(originalText);

                  console.log(`🔍 Verse ${verseNumber} processing:`, {
                    originalText: originalText,
                    shouldShowUIVerseNumber: shouldShowUIVerseNumber,
                    cleanedText: cleanedText,
                    formattedText: formattedText,
                    hasQuestionMark: originalText.includes('?'),
                    cleanedHasQuestionMark: cleanedText.includes('?'),
                    formattedHasQuestionMark: formattedText.__html?.includes('?')
                  });

                  // Special debug for John 3:16 to identify character before "For"
                  if (verseNumber === 16 && originalText.includes('For')) {
                    const forPosition = originalText.indexOf('For');
                    const charBeforeFor = originalText.charAt(forPosition - 1);
                    const charCodeBeforeFor = originalText.charCodeAt(forPosition - 1);

                    console.log(`🔍 John 3:16 character analysis:`, {
                      originalText: originalText,
                      forPosition: forPosition,
                      charBeforeFor: charBeforeFor,
                      charCodeBeforeFor: charCodeBeforeFor,
                      beforeFor: originalText.substring(0, forPosition),
                      afterFor: originalText.substring(forPosition, forPosition + 20)
                    });
                  }
                }

                const isSelected = isMultiSelectMode && selectedVerses.includes(verseNumber);

                return (
                  <p
                    key={`${settingsKey}-${index}`}
                    className={`text-foreground mb-4 ${highlightClass} cursor-pointer select-none ${isSelected ? 'bg-primary/20 rounded-md px-2 py-1 ring-1 ring-primary' : ''}`}
                    style={verseStyle}
                    onClick={handleVerseClick}
                  >
                    {/* Always show verse numbers beside each verse */}
                    {shouldShowUIVerseNumber && (
                      <sup className="text-sm font-medium text-muted-foreground mr-2 relative top-0.5">
                        {verseNumber}
                      </sup>
                    )}
                    <span dangerouslySetInnerHTML={formatText(verse.text)} />
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

      {/* Floating Action Bar for Verse Selection */}
      <div
        className={cn(
          "fixed left-0 right-0 z-[100] px-4 transition-all duration-500 ease-out",
          selectedVerses.length > 0 || isMultiSelectMode
            ? "bottom-6 opacity-100 translate-y-0"
            : "bottom-0 opacity-0 translate-y-20 pointer-events-none"
        )}
      >
        <div className="max-w-xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-[2rem] shadow-2xl p-4 flex flex-col gap-4">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                {selectedVerses.length} {selectedVerses.length === 1 ? 'Verse' : 'Verses'} Selected
              </div>
              <button
                onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
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
                        toast({ title: `Highlighted in ${color.name}` });
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
                onClick={async () => {
                  try {
                    const highlightsToRemove = selectedVerses.map(verseNum => getHighlightForVerse(verseNum)).filter(Boolean);
                    if (highlightsToRemove.length > 0) {
                      const { error } = await supabase.from('bible_highlights').delete().in('id', highlightsToRemove.map(h => h!.id));
                      if (!error) {
                        await refetchHighlights();
                        toast({ title: "Highlights Removed" });
                      }
                    }
                  } catch (error) { console.error(error); }
                  setSelectedVerses([]);
                  setIsMultiSelectMode(false);
                }}
                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full border-2 border-slate-100 dark:border-slate-600 text-slate-400 hover:text-red-500 transition-all hover:scale-110"
                title="Remove Highlights"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const versesText = selectedVerses.map(verseNum => {
                      const verse = chapterContent?.verses?.find(v => (v.verse && !isNaN(Number(v.verse)) ? Number(v.verse) : 0) === verseNum);
                      return `${getBookDisplayName()} ${selectedChapter}:${verseNum} - ${(verse?.text || '').trim()}`;
                    }).join('\n\n');
                    await navigator.clipboard.writeText(versesText);
                    toast({ title: "Copied to clipboard" });
                    setSelectedVerses([]);
                  } catch (e) { console.error(e); }
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

      {/* Bible Navigation Controls */}
      <div
        className={cn(
          "fixed left-0 right-0 z-40 transition-all duration-500 ease-in-out pointer-events-none",
          selectedVerses.length > 0 || isMultiSelectMode ? "bottom-40" : "bottom-20"
        )}
      >
        <div className="flex items-center justify-between px-8 pointer-events-auto max-w-lg mx-auto">
          <button
            onClick={handlePreviousChapter}
            disabled={selectedChapter <= 1 && allBooks.findIndex(b => b.apiName === selectedBook) <= 0}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 active:scale-95 transition-all disabled:opacity-30"
          >
            <ChevronLeft className="w-6 h-6 text-slate-800 dark:text-slate-200" />
          </button>

          <button
            onClick={handlePlayPause}
            disabled={globalAudio?.audioState.isLoading || false}
            className="w-16 h-16 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {globalAudio?.audioState.isLoading ? (
              <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (globalAudio?.audioState.isPlaying &&
              globalAudio?.audioState.currentBook === selectedBook &&
              globalAudio?.audioState.currentChapter === selectedChapter) ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 ml-1 fill-current" />
            )}
          </button>

          <button
            onClick={handleNextChapter}
            disabled={!book || (selectedChapter >= book.chapters && allBooks.findIndex(b => b.apiName === selectedBook) >= allBooks.length - 1)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 active:scale-95 transition-all disabled:opacity-30"
          >
            <ChevronRight className="w-6 h-6 text-slate-800 dark:text-slate-200" />
          </button>
        </div>
      </div>

      {/* Bible Notes Dialog */}
      <BibleNotesDialog
        open={showNotesDialog}
        onOpenChange={setShowNotesDialog}
        book={selectedBook}
        chapter={selectedChapter}
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
                          toast({ title: `Highlight${selectedVerses.length > 1 ? 's' : ''} Removed` });
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
                        toast({
                          title: `Verse${selectedVerses.length > 1 ? 's' : ''} Highlighted`,
                          description: `${selectedVerses.length} verse${selectedVerses.length > 1 ? 's' : ''} highlighted in ${color.name}`
                        });
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
