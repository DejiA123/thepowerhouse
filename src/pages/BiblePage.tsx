import { useState, useEffect } from "react";
import { enhancedBibleApi } from "@/services/enhancedBibleApi";
import type { BibleChapter, BibleVersion } from "@/types/bible";
import { useToast } from "@/hooks/use-toast";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
import { BibleNavigation } from "@/components/bible/BibleNavigation";
import { EnhancedBibleVersionSelector } from "@/components/bible/EnhancedBibleVersionSelector";
import { BibleBookList, bibleBooks } from "@/components/bible/BibleBookList";
import { normalizeBookApiName } from "@/components/bible/bookUtils";
import { BibleChapterList } from "@/components/bible/BibleChapterList";
import { BibleChapterContent } from "@/components/bible/BibleChapterContent";
import { BibleSearch } from "@/components/bible/BibleSearch";
import { BibleHistory, addToBibleHistory } from "@/components/bible/BibleHistory";
import { BibleMenuDialog } from "@/components/bible/BibleMenuDialog";
import BibleNotes from "@/components/bible/BibleNotes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BottomNavigation from "@/components/BottomNavigation";

const BiblePage = () => {
  const { preferences, isLoaded, setPreferredTranslation, setPreferredBook, setPreferredChapter, setAutoPlayNext } = useBiblePreferences();
  const { setChapterChangeCallback, setBookChangeCallback } = useGlobalAudio();

  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [chapterContent, setChapterContent] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [menuSettingsVersion, setMenuSettingsVersion] = useState(0);
  const [currentVerse, setCurrentVerse] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedVersion = preferences.preferredTranslation;

  useEffect(() => {
    const loadVersions = async () => {
      const bibleVersions = await enhancedBibleApi.getVersions();
      setVersions(bibleVersions);
    };
    loadVersions();
  }, []);

  const loadChapter = async (bookApiName: string, chapterNum: number) => {
    setLoading(true);
    setCurrentVerse(0);
    setLoadError(null);
    try {
      const chapter = await enhancedBibleApi.getChapter(selectedVersion, bookApiName, chapterNum);
      if (chapter) {
        setChapterContent(chapter as any);
      } else {
        setChapterContent(null);
        setLoadError("Could not load chapter content. Please try again.");
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
      setChapterContent(null);
      setLoadError("Failed to load Bible chapter. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBookSelect = (bookApiName: string) => {
    const normalized = normalizeBookApiName(bookApiName);
    setSelectedBook(normalized);
    setPreferredBook(normalized);
  };

  const handleChapterSelect = (chapter: number) => {
    setSelectedChapter(chapter);
    setPreferredChapter(chapter);
    setShouldAutoPlay(false);
    if (selectedBook) {
      loadChapter(selectedBook, chapter);
      addToBibleHistory(selectedBook, chapter);
    }
  };

  const handleChapterChange = async (chapter: number, isAutoPlay = false) => {
    setSelectedChapter(chapter);
    setPreferredChapter(chapter);
    if (isAutoPlay) {
      setShouldAutoPlay(true);
    } else {
      setShouldAutoPlay(false);
    }
    if (selectedBook) {
      await loadChapter(normalizeBookApiName(selectedBook), chapter);
    }
  };

  const handleBookChange = async (bookApiName: string, chapter: number, isAutoPlay = false) => {
    const normalized = normalizeBookApiName(bookApiName);
    setSelectedBook(normalized);
    setSelectedChapter(chapter);
    setPreferredBook(bookApiName);
    setPreferredChapter(chapter);
    if (isAutoPlay) {
      setShouldAutoPlay(true);
      const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
      const nextBook = allBooks.find(b => b.apiName === bookApiName);
      if (nextBook) {
        toast({
          title: "Moving to Next Book",
          description: `Now reading ${nextBook.name} Chapter ${chapter}`,
        });
      }
    } else {
      setShouldAutoPlay(false);
    }
    await loadChapter(normalized, chapter);
  };

  useEffect(() => {
    setChapterChangeCallback((chapter: number, isAutoPlay: boolean) => {
      handleChapterChange(chapter, isAutoPlay);
    });
    setBookChangeCallback((book: string, chapter: number, isAutoPlay: boolean) => {
      handleBookChange(book, chapter, isAutoPlay);
    });
  }, [setChapterChangeCallback, setBookChangeCallback, selectedBook, selectedVersion]);

  useEffect(() => {
    if (isLoaded && preferences.autoPlayNext) {
      setShouldAutoPlay(false);
    }
  }, [isLoaded, preferences.autoPlayNext]);

  useEffect(() => {
    if (isLoaded && preferences.preferredBook && preferences.preferredChapter) {
      const normalizedBook = normalizeBookApiName(preferences.preferredBook);
      setSelectedBook(normalizedBook);
      setSelectedChapter(preferences.preferredChapter);
      loadChapter(normalizedBook, preferences.preferredChapter);
    } else if (isLoaded) {
      setSelectedBook('genesis');
      setSelectedChapter(1);
      loadChapter('genesis', 1);
    }
  }, [isLoaded]);

  const handleVerseHighlight = (verseNumber: number) => {
    setCurrentVerse(verseNumber);
  };

  const handleBackToBooks = () => {
    setSelectedBook(null);
    setSelectedChapter(null);
    setChapterContent(null);
    setShowNotes(false);
    setCurrentVerse(0);
  };

  const handleBackToChapters = () => {
    setSelectedChapter(null);
    setChapterContent(null);
    setCurrentVerse(0);
  };

  const handleVersionChange = (versionId: string) => {
    setPreferredTranslation(versionId);
    const selected = versions.find(v => v.version === versionId);
    toast({
      title: "Translation Changed",
      description: `Switched to ${selected?.name || versionId.toUpperCase()} translation`,
    });
    if (selectedBook && selectedChapter) {
      loadChapter(selectedBook, selectedChapter);
    }
    setShowVersionSelector(false);
  };

  const handleSearchNavigate = (book: string, chapter: number, verse?: number) => {
    const normalizedBook = normalizeBookApiName(book);
    setSelectedBook(normalizedBook);
    setSelectedChapter(chapter);
    setPreferredBook(normalizedBook);
    setPreferredChapter(chapter);
    loadChapter(normalizedBook, chapter);
    setShowSearch(false);
    addToBibleHistory(book, chapter);
    if (verse) {
      setTimeout(() => setCurrentVerse(verse), 500);
    }
  };

  const resetToReasonableDefaults = () => {
    setSelectedBook('genesis');
    setSelectedChapter(1);
    setPreferredBook('genesis');
    setPreferredChapter(1);
    loadChapter('genesis', 1);
  };

  const handleHistoryNavigate = (book: string, chapter: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setPreferredBook(book);
    setPreferredChapter(chapter);
    loadChapter(book, chapter);
    setShowHistory(false);
    addToBibleHistory(book, chapter);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your Bible preferences...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-destructive mb-4">{loadError}</p>
          <Button onClick={() => { if (selectedBook && selectedChapter) loadChapter(selectedBook, selectedChapter); }}>Retry</Button>
        </div>
      );
    }

    if (showNotes) {
      return <BibleNotes book={selectedBook || ""} chapter={selectedChapter || 1} onBackToChapters={() => setShowNotes(false)} />;
    }

    if (selectedChapter) {
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
      return <BibleChapterList selectedBook={selectedBook} onChapterSelect={handleChapterSelect} onBackToBooks={handleBackToBooks} />;
    }

    return (
      <BibleBookList 
        onBookSelect={handleBookSelect} 
        onCancel={() => {
          if (preferences.preferredBook && preferences.preferredChapter) {
            setSelectedBook(preferences.preferredBook);
            setSelectedChapter(preferences.preferredChapter);
            loadChapter(preferences.preferredBook, preferences.preferredChapter);
          } else {
            setSelectedBook('genesis');
            setSelectedChapter(1);
            loadChapter('genesis', 1);
          }
        }}
        onHistory={() => setShowHistory(true)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {renderContent()}
      <BottomNavigation />
      <Dialog open={showVersionSelector} onOpenChange={setShowVersionSelector}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bible Translations</DialogTitle>
            <DialogDescription>Choose from different Bible translations.</DialogDescription>
          </DialogHeader>
          <EnhancedBibleVersionSelector
            selectedVersion={selectedVersion}
            onVersionChange={handleVersionChange}
          />
        </DialogContent>
      </Dialog>
      <BibleSearch isOpen={showSearch} onClose={() => setShowSearch(false)} onNavigate={handleSearchNavigate} selectedVersion={selectedVersion} />
      <BibleHistory isOpen={showHistory} onClose={() => setShowHistory(false)} onNavigate={handleHistoryNavigate} />
      <BibleMenuDialog
        isOpen={showMenu}
        onClose={() => {
          setShowMenu(false);
          setMenuSettingsVersion(prev => prev + 1);
        }}
        onSettingsChange={() => setMenuSettingsVersion(prev => prev + 1)}
        onResetToGenesis={() => {
          resetToReasonableDefaults();
          setShowMenu(false);
        }}
      />
    </div>
  );
};

export default BiblePage;
