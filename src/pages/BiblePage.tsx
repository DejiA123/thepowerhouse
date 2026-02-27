import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";
import type { BibleChapter } from "@/types/bible";
import { useToast } from "@/hooks/use-toast";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
import { BibleNavigation } from "@/components/bible/BibleNavigation";
import { BibleVersionSelector } from "@/components/bible/BibleVersionSelector";
import { BibleBookList, bibleBooks } from "@/components/bible/BibleBookList";
import { normalizeBookApiName } from "@/components/bible/bookUtils";
import { BibleChapterList } from "@/components/bible/BibleChapterList";
import { BibleChapterContent } from "@/components/bible/BibleChapterContent";
// BibleHighlights component removed - functionality moved to BibleChapterContent
import { BibleSearch } from "@/components/bible/BibleSearch";
import { BibleHistory, addToBibleHistory } from "@/components/bible/BibleHistory";
import { BibleMenuDialog } from "@/components/bible/BibleMenuDialog";
import BibleNotes from "@/components/bible/BibleNotes";
import AllHighlightsList from "@/components/bible/AllHighlightsList";
import { Pencil } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { FileText, Volume2, Smartphone, X } from "lucide-react";

const BiblePage = () => {
  console.log('🔍 BiblePage: Component rendering...');

  // Helper to scroll to top of all potential scroll containers
  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.getElementById('main-content')?.scrollTo(0, 0);
    document.body.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
  };

  const {
    preferences,
    isLoaded,
    setPreferredTranslation,
    setPreferredBook,
    setPreferredChapter,
    setReadingPosition,
    setAutoPlayNext,
  } = useBiblePreferences();

  const { setChapterChangeCallback, setBookChangeCallback } = useGlobalAudio();

  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [chapterContent, setChapterContent] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showHighlightsList, setShowHighlightsList] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [menuSettingsVersion, setMenuSettingsVersion] = useState(0);
  const [currentVerse, setCurrentVerse] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  // Use preferences for version selection
  const selectedVersion = preferences.preferredTranslation;

  // Debug: Log shouldAutoPlay changes
  useEffect(() => {
    console.log(`🔍 BiblePage: shouldAutoPlay changed to ${shouldAutoPlay}`);
  }, [shouldAutoPlay]);

  // Debug: Log preferences changes
  useEffect(() => {
    console.log(`🔍 BiblePage: preferences changed:`, preferences);
  }, [preferences]);

  useEffect(() => {
    const loadVersions = async () => {
      const bibleVersions = await enhancedApiBibleService.getVersions();
      const validVersions = bibleVersions
        .filter(version => version && version.abbreviation && version.name)
        .map(version => {
          let name = version.name;
          if (name === "The Holy Bible, American Standard Version") name = "American Standard Version";
          if (name === "King James (Authorised) Version") name = "King James Version";
          return { ...version, name };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      setVersions(validVersions);
    };
    loadVersions();
  }, []);

  const loadChapter = useCallback(async (bookApiName: string, chapterNum: number) => {
    console.log(`📖 BiblePage: Loading ${bookApiName} chapter ${chapterNum}`);
    setLoading(true);
    setCurrentVerse(0);
    setLoadError(null);

    try {
      const normalizedBook = normalizeBookApiName(bookApiName);
      const chapter = await enhancedApiBibleService.getChapter(selectedVersion, normalizedBook, chapterNum);
      console.log(`📖 BiblePage: Received chapter data:`, chapter);

      if (chapter && chapter.verses && chapter.verses.length > 0) {
        setChapterContent(chapter);
        console.log(`✅ BiblePage: Successfully loaded ${chapter.verses.length} verses`);
      } else {
        console.warn(`⚠️ BiblePage: No valid chapter content received`);
        setChapterContent(null);
        setLoadError("Could not load chapter content. Please try again.");
        toast({
          title: "Error",
          description: "Could not load chapter content.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ BiblePage: Error loading chapter:', error);
      setChapterContent(null);
      setLoadError("Failed to load Bible chapter. Please check your connection and try again.");
      toast({
        title: "Error",
        description: "Failed to load Bible chapter.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedVersion, toast]);



  const handleBookSelect = (bookApiName: string) => {
    scrollToTop();
    const normalized = normalizeBookApiName(bookApiName);
    setSelectedBook(normalized);
    // Explicitly update preferences if we have a chapter
    if (selectedChapter) {
      setReadingPosition(normalized, selectedChapter);
    }
  };

  const handleChapterSelect = (chapter: number) => {
    scrollToTop();
    setSelectedChapter(chapter);
    if (selectedBook) {
      setReadingPosition(selectedBook, chapter);
    }
    setShouldAutoPlay(false); // Don't auto-play on manual chapter select
    loadChapter(selectedBook!, chapter);
    // Add to reading history
    if (selectedBook) {
      addToBibleHistory(selectedBook, chapter);
    }
  };

  const handleChapterChange = useCallback(async (chapter: number, isAutoPlay = false) => {
    console.log(`🔄 BiblePage: handleChapterChange called with chapter=${chapter}, isAutoPlay=${isAutoPlay}`);
    console.log(`🔄 BiblePage: Current preferences.fontSize before change:`, preferences.fontSize);
    if (!isAutoPlay) {
      scrollToTop();
    }
    setSelectedChapter(chapter);
    // Enable auto-play if this is an auto-play transition
    // When a chapter change is triggered by auto-play, ensure the next chapter will also auto-play
    if (isAutoPlay) {
      console.log(`✅ BiblePage: Setting shouldAutoPlay to true for auto-play transition`);
      setShouldAutoPlay(true);
    } else {
      console.log(`❌ BiblePage: Setting shouldAutoPlay to false for manual chapter change`);
      setShouldAutoPlay(false);
    }
    // Use the current selectedBook for chapter changes
    if (selectedBook) {
      setReadingPosition(selectedBook, chapter);
      await loadChapter(normalizeBookApiName(selectedBook), chapter);
    } else {
      console.error('❌ BiblePage: No selectedBook available for chapter change');
    }
  }, [selectedBook, loadChapter]);

  const handleBookChange = useCallback(async (bookApiName: string, chapter: number, isAutoPlay = false) => {
    console.log(`📚 BiblePage: handleBookChange called with book=${bookApiName}, chapter=${chapter}, isAutoPlay=${isAutoPlay}`);
    const normalized = normalizeBookApiName(bookApiName);
    setSelectedBook(normalized);
    setSelectedChapter(chapter);
    setReadingPosition(normalized, chapter);
    // Enable auto-play if this is an auto-play transition
    if (isAutoPlay) {
      console.log(`✅ BiblePage: Setting shouldAutoPlay to true for auto-play book transition`);
      setShouldAutoPlay(true);
      // Show toast notification for book transition
      const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
      const nextBook = allBooks.find(b => b.apiName === bookApiName);

    } else {
      console.log(`❌ BiblePage: Setting shouldAutoPlay to false for manual book change`);
      setShouldAutoPlay(false);
    }
    // Use the new bookApiName parameter for book changes
    await loadChapter(normalized, chapter);
  }, [loadChapter, toast]);

  // Set up GlobalAudioContext callbacks for auto-advancement - moved after function definitions
  useEffect(() => {
    console.log('🔧 BiblePage: Setting up audio context callbacks');
    setChapterChangeCallback((chapter: number, isAutoPlay: boolean) => {
      console.log(`🎵 BiblePage: Chapter change callback triggered - chapter: ${chapter}, isAutoPlay: ${isAutoPlay}`);
      handleChapterChange(chapter, isAutoPlay);
    });

    setBookChangeCallback((book: string, chapter: number, isAutoPlay: boolean) => {
      console.log(`🎵 BiblePage: Book change callback triggered - book: ${book}, chapter: ${chapter}, isAutoPlay: ${isAutoPlay}`);
      handleBookChange(book, chapter, isAutoPlay);
    });
  }, [setChapterChangeCallback, setBookChangeCallback, selectedBook, selectedVersion]);

  // Initialize shouldAutoPlay based on preferences when component loads
  useEffect(() => {
    if (isLoaded && preferences.autoPlayNext) {
      console.log(`🎯 BiblePage: Initializing shouldAutoPlay to false for initial navigation (preferences show ${preferences.autoPlayNext})`);
      setShouldAutoPlay(false); // Disable auto-play for initial navigation
    }
  }, [isLoaded, preferences.autoPlayNext]);

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Flag to track if we've already done the initial data load for this mount
  const hasInitialized = useRef(false);

  // Sync selection to URL and Preferences whenever it changes
  useEffect(() => {
    if (isLoaded && selectedBook && selectedChapter) {
      // 1. Sync to URL
      const currentBookInUrl = searchParams.get('book');
      const currentChapterInUrl = searchParams.get('chapter');

      if (currentBookInUrl !== selectedBook || currentChapterInUrl !== selectedChapter.toString()) {
        console.log(`🔗 BiblePage: Syncing URL search params to ${selectedBook} ${selectedChapter}`);
        setSearchParams({ book: selectedBook, chapter: selectedChapter.toString() }, { replace: true });
      }

      // 2. Sync to Preferences (Persistence) - Use atomic update
      // We normalize both for a fair comparison
      const prefBook = normalizeBookApiName(preferences.preferredBook);
      const prefChapter = preferences.preferredChapter;

      if (prefBook !== selectedBook || prefChapter !== selectedChapter) {
        console.log(`💾 BiblePage: Syncing preferences: ${prefBook}:${prefChapter} -> ${selectedBook}:${selectedChapter}`);
        setReadingPosition(selectedBook, selectedChapter);
      }
    }
  }, [selectedBook, selectedChapter, isLoaded, preferences.preferredBook, preferences.preferredChapter, setSearchParams, searchParams, setReadingPosition]);

  // Set selectedBook and selectedChapter from URL query params (highest priority), location state, or preferences
  useEffect(() => {
    console.log('🔄 BiblePage: Initialization effect running', {
      isLoaded,
      hasInitialized: hasInitialized.current,
      searchParams: Object.fromEntries(searchParams.entries()),
      locationState: location.state,
      prefBook: preferences.preferredBook,
      prefChapter: preferences.preferredChapter
    });

    // Priority 1: URL query parameters (highest priority, always respect)
    const queryBook = searchParams.get('book');
    const queryChapter = searchParams.get('chapter');

    if (queryBook && queryChapter) {
      const normalizedBook = normalizeBookApiName(queryBook.toLowerCase().replace(/\s+/g, '-'));
      const chapterNum = parseInt(queryChapter);

      // Only update state if it differs from URL (initial load or browser navigation)
      // AND we haven't manually changed it yet in this mount (unless browser nav)
      if (!hasInitialized.current) {
        console.log(`🎯 Initializing from URL: ${normalizedBook} ${chapterNum}`);
        setSelectedBook(normalizedBook);
        setSelectedChapter(chapterNum);
        setPreferredBook(normalizedBook);
        setPreferredChapter(chapterNum);
        loadChapter(normalizedBook, chapterNum);
        hasInitialized.current = true;
        return;
      }
    }

    // Priority 2: Navigation state (from internal app links)
    if (location.state && location.state.book && location.state.chapter && !hasInitialized.current) {
      const normalizedBook = normalizeBookApiName(location.state.book);
      const chapterNum = location.state.chapter;

      console.log(`🎯 Initializing from navigation state: ${normalizedBook} chapter ${chapterNum}`);
      setSelectedBook(normalizedBook);
      setSelectedChapter(chapterNum);
      setPreferredBook(normalizedBook);
      setPreferredChapter(chapterNum);
      loadChapter(normalizedBook, chapterNum);
      hasInitialized.current = true;
      return;
    }

    // Priority 3: User preferences (Sync with last saved location)
    if (isLoaded && preferences.preferredBook && preferences.preferredChapter && !hasInitialized.current) {
      const prefBook = normalizeBookApiName(preferences.preferredBook);
      const prefChapter = preferences.preferredChapter;

      console.log(`🎯 Initializing from preferred: ${prefBook} chapter ${prefChapter}`);
      setSelectedBook(prefBook);
      setSelectedChapter(prefChapter);
      loadChapter(prefBook, prefChapter);
      hasInitialized.current = true;
      return;
    }

    // Priority 4: Defaults (Final fallback)
    if (isLoaded && !hasInitialized.current && !selectedBook && !selectedChapter) {
      console.log(`🎯 Initializing from defaults: Genesis chapter 1`);
      setSelectedBook('genesis');
      setSelectedChapter(1);
      setPreferredBook('genesis');
      setPreferredChapter(1);
      loadChapter('genesis', 1);
      hasInitialized.current = true;
    }
  }, [
    isLoaded,
    loadChapter,
    setPreferredBook,
    setPreferredChapter,
    preferences.preferredBook,
    preferences.preferredChapter
    // searchParams and location.state are still excluded to prevent loops, 
    // but preferences are included to ensure we catch the correct initial values.
  ]);

  // Reload chapter when selected version changes
  useEffect(() => {
    if (selectedBook && selectedChapter && isLoaded) {
      console.log(`🔄 BiblePage: Translation changed to ${selectedVersion}, reloading ${selectedBook} ${selectedChapter}`);
      loadChapter(selectedBook, selectedChapter);
    }
  }, [selectedVersion]);

  const handleVerseHighlight = (verseNumber: number) => {
    console.log(`BiblePage: handleVerseHighlight called with verse ${verseNumber}, previous currentVerse: ${currentVerse}`);
    setCurrentVerse(verseNumber);
  };

  const handleBackToBooks = () => {
    scrollToTop();
    setSelectedBook(null);
    setSelectedChapter(null);
    setChapterContent(null);
    setShowHighlights(false);
    setShowNotes(false);
    setCurrentVerse(0);
  };

  const handleBackToChapters = () => {
    scrollToTop();
    setSelectedChapter(null);
    setChapterContent(null);
    setCurrentVerse(0);
  };

  const handleVersionChange = (versionId: string) => {
    console.log('BiblePage: Setting preferred translation to:', versionId);
    setPreferredTranslation(versionId);
    const selectedVersion = versions.find(v => (v.id || v.abbreviation) === versionId);


    // If we're currently viewing a chapter, reload it with the new version
    if (selectedBook && selectedChapter) {
      loadChapter(selectedBook, selectedChapter);
    }
    setShowVersionSelector(false);
  };

  const handleSearchNavigate = (book: string, chapter: number, verse?: number) => {
    const normalized = normalizeBookApiName(book);
    setSelectedBook(normalized);
    setSelectedChapter(chapter);
    setReadingPosition(normalized, chapter);
    loadChapter(normalized, chapter);
    setShowSearch(false);
    // Add to reading history
    addToBibleHistory(book, chapter);

    if (verse) {
      // Highlight the specific verse
      setTimeout(() => {
        setCurrentVerse(verse);
      }, 500);
    }
  };

  // Removed "reasonable" guard so we always return to the user's last exact location

  // Function to reset preferences to reasonable defaults
  const resetToReasonableDefaults = () => {
    console.log('🔄 Resetting Bible preferences to reasonable defaults');
    setSelectedBook('genesis');
    setSelectedChapter(1);
    setPreferredBook('genesis');
    setPreferredChapter(1);
    loadChapter('genesis', 1);
  };

  const handleHistoryNavigate = (book: string, chapter: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setReadingPosition(book, chapter);
    loadChapter(book, chapter);
    setShowHistory(false);
    // Add to reading history (move to top)
    addToBibleHistory(book, chapter);
  };

  // Don't render until preferences are loaded
  if (!isLoaded) {
    console.log('🔍 BiblePage: Preferences not loaded yet, showing loading spinner');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your Bible preferences...</p>
        </div>
      </div>
    );
  }

  console.log('🔍 BiblePage: Preferences loaded, rendering content');



  const renderContent = () => {
    console.log('🔍 BiblePage: renderContent called with:', {
      loadError,
      showHighlights,
      showNotes,
      selectedChapter,
      selectedBook
    });

    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <p className="text-destructive mb-4">{loadError}</p>
          <div className="flex gap-2">
            <Button onClick={() => {
              if (selectedBook && selectedChapter) loadChapter(selectedBook, selectedChapter);
            }}>
              Retry
            </Button>
            <Button variant="outline" onClick={resetToReasonableDefaults}>
              Reset to Genesis 1
            </Button>
          </div>
        </div>
      );
    }


    if (showHighlights) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Bible Highlights</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHighlights(false)}
            >
              Back to Bible
            </Button>
          </div>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Highlighting is now available directly in the Bible text. Long press or click on any verse to highlight it.</p>
          </div>
        </div>
      );
    }

    if (showNotes) {
      return (
        <BibleNotes
          book={selectedBook || ""}
          chapter={selectedChapter || 1}
          onBackToChapters={() => setShowNotes(false)}
        />
      );
    }

    if (selectedChapter) {
      console.log(`🔍 BiblePage: Rendering BibleChapterContent with fontSize=${preferences.fontSize}, selectedBook=${selectedBook}, selectedChapter=${selectedChapter}`);
      return (
        <BibleChapterContent
          key={`bible-chapter-${selectedBook}`}
          selectedBook={selectedBook!}
          selectedChapter={selectedChapter}
          chapterContent={chapterContent}
          loading={loading}
          onBackToChapters={handleBackToChapters}
          onBackToBooks={handleBackToBooks}
          onChapterChange={handleChapterChange}
          onBookChange={handleBookChange}
          autoPlayNext={preferences.autoPlayNext}
          onAutoPlayChange={setAutoPlayNext}
          currentVerse={currentVerse}
          shouldAutoPlay={shouldAutoPlay}
          onAutoPlayTriggered={() => setShouldAutoPlay(false)}
          onVerseHighlight={handleVerseHighlight}
          onVersionSelectorOpen={() => setShowVersionSelector(true)}
          onSearchOpen={() => setShowSearch(true)}
          onMenuOpen={() => setShowMenu(true)}
          selectedVersion={selectedVersion}
          versions={versions}
          fontSize={preferences.fontSize}
          pitch={preferences.pitch}
          rate={preferences.rate}
          redLetters={preferences.redLetters}
          menuSettingsVersion={menuSettingsVersion}
        />
      );
    }

    if (selectedBook) {
      console.log('BiblePage: Rendering BibleChapterList for book:', selectedBook);
      return (
        <BibleChapterList
          selectedBook={selectedBook}
          onChapterSelect={handleChapterSelect}
          onBackToBooks={handleBackToBooks}
        />
      );
    }

    return (
      <BibleBookList
        onBookSelect={handleBookSelect}
        onCancel={() => {
          console.log('Cancel book selection - returning to current chapter');
          scrollToTop();
          // If user has a preferred book and chapter, return to that
          if (preferences.preferredBook && preferences.preferredChapter) {
            setSelectedBook(preferences.preferredBook);
            setSelectedChapter(preferences.preferredChapter);
            loadChapter(preferences.preferredBook, preferences.preferredChapter);
          } else {
            // Fallback to default if no preferences
            setSelectedBook('genesis');
            setSelectedChapter(1);
            loadChapter('genesis', 1);
          }
        }}
        onHistory={() => setShowHistory(true)}
      />
    );
  };



  // Render with proper layout based on content type
  if (selectedChapter && !showHighlights && !showNotes) {
    // Full Bible reading layout
    return (
      <div className="min-h-screen bg-background pb-[72px] pt-0">
        {renderContent()}

        {/* Version Selector Drawer */}
        <Drawer open={showVersionSelector} onOpenChange={setShowVersionSelector}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Bible Translations</DrawerTitle>
              <DrawerDescription>
                Choose from different Bible translations to customize your reading experience.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 overflow-y-auto">
              <BibleVersionSelector
                versions={versions}
                selectedVersion={selectedVersion}
                onVersionChange={handleVersionChange}
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Bible Search Dialog */}
        <BibleSearch
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onNavigate={handleSearchNavigate}
          selectedVersion={selectedVersion}
        />

        {/* Bible History Dialog */}
        <BibleHistory
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          onNavigate={handleHistoryNavigate}
        />

        {/* Bible Menu Dialog */}
        <BibleMenuDialog
          isOpen={showMenu}
          onClose={() => {
            console.log('Menu dialog closed - forcing re-render');
            setShowMenu(false);
            setMenuSettingsVersion(prev => prev + 1);
          }}
          onSettingsChange={() => {
            console.log('Settings changed - forcing re-render');
            setMenuSettingsVersion(prev => prev + 1);
            // Force a small delay to ensure preferences are updated
            setTimeout(() => {
              console.log('Settings change timeout - preferences should be updated now');
            }, 100);
          }}
          onResetToGenesis={() => {
            resetToReasonableDefaults();
            setShowMenu(false);
          }}
          onViewHighlights={() => setShowHighlightsList(true)}
          onViewNotes={() => {
            setShowNotes(true);
          }}
        />

        {/* Highlights List Dialog (Lifted from BibleChapterContent) */}
        <Dialog open={showHighlightsList} onOpenChange={setShowHighlightsList}>
          <DialogContent className="fixed !top-0 w-screen h-[100dvh] max-w-none m-0 p-0 overflow-hidden bg-white dark:bg-gray-950 border-none rounded-none flex flex-col pt-[calc(4.5rem + env(safe-area-inset-top, 0px))] [&>button]:top-[calc(3rem + env(safe-area-inset-top, 0px))]">
            <DialogHeader className="p-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-10 pt-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <Pencil className="w-5 h-5 text-blue-600" />
                  Your Highlights
                </DialogTitle>
                <Button
                  onClick={() => setShowHighlightsList(false)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <DialogDescription className="hidden">
                Select any verse to navigate to it
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4 pb-24">
              <AllHighlightsList onNavigate={(bookApi, chapterNum) => {
                setShowHighlightsList(false);
                if (bookApi && chapterNum) {
                  handleBookChange(bookApi, chapterNum, false);
                }
              }} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Book selection or other layouts
  return (
    <div className="flex flex-col h-[100dvh] bg-background overscroll-none pt-[env(safe-area-inset-top,0px)] overflow-hidden">
      {renderContent()}

      {/* Bible History Dialog */}
      <BibleHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onNavigate={handleHistoryNavigate}
      />
    </div>
  );
};

export default BiblePage;
