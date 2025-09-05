import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BibleNavigation } from "./bible/BibleNavigation";
import { BibleChapterContent } from "./bible/BibleChapterContent";
import { BibleBookList } from "./bible/BibleBookList";
import { BibleChapterList } from "./bible/BibleChapterList";
import { BibleNotesDialog } from "./bible/BibleNotesDialog";
import BibleNotesPage from "../pages/BibleNotesPage";
import { BibleMenuDialog } from "./bible/BibleMenuDialog";
import { BibleSearch } from "./bible/BibleSearch";
import { EnhancedBibleVersionSelector } from "./bible/EnhancedBibleVersionSelector";
// BibleHighlights component removed - functionality moved to BibleChapterContent

import BibleAudioPlayer from "./bible/BibleAudioPlayer";
import { BibleBrainAudioPlayer } from "./bible/BibleBrainAudioPlayer";
import { BiblePreferencesPanel } from "./bible/BiblePreferencesPanel";
import { BibleChapter } from "@/services/hybridBibleApi";
import { enhancedBibleBrainApiNew } from "@/services/enhancedBibleBrainApiNew";
import { testBibleBrainApi } from "@/services/bibleBrainApiTest";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { useToast } from "@/hooks/use-toast";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";

const BibleReader = () => {
  const {
    preferences,
    isLoaded,
    setPreferredTranslation,
    setPreferredBook,
    setPreferredChapter,
    setAutoPlayNext,
  } = useBiblePreferences();
  
  const [currentChapter, setCurrentChapter] = useState<BibleChapter | null>(null);
  const [activeTab, setActiveTab] = useState("read");
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(0);
  const { toast } = useToast();
  const [shouldAutoPlay, setShouldAutoPlay] = useState(true);
  const { setChapterChangeCallback, setBookChangeCallback } = useGlobalAudio();

  // Use preferences once loaded - these are the source of truth
  const selectedVersion = preferences.preferredTranslation;
  const selectedBook = preferences.preferredBook;
  const selectedChapter = preferences.preferredChapter;

  useEffect(() => {
    const loadVersions = async () => {
      // Test the API to understand its structure
      await testBibleBrainApi();
      
      const bibleVersions = await enhancedBibleBrainApiNew.getVersions();
      setVersions(bibleVersions);
    };
    loadVersions();
  }, []);

  // Load chapter content when preferences change
  useEffect(() => {
    if (isLoaded && selectedBook && selectedChapter && selectedVersion) {
      loadChapterContent();
    }
  }, [isLoaded, selectedBook, selectedChapter, selectedVersion]);

  const handleBookChange = useCallback((book: string) => {
    setPreferredBook(book);
    setPreferredChapter(1); // Reset to chapter 1 when changing books
    toast({
      title: "Book Changed",
      description: `Switched to ${book}`,
    });
  }, [setPreferredBook, setPreferredChapter, toast]);

  const handleChapterChange = useCallback((chapter: number, isAutoPlay = false) => {
    setPreferredChapter(chapter);
    // Only enable auto-play if this is an auto-play transition
    setShouldAutoPlay(isAutoPlay);
  }, [setPreferredChapter, setShouldAutoPlay]);

  // Set up callbacks for GlobalAudioContext auto-play functionality
  useEffect(() => {
    setChapterChangeCallback(handleChapterChange);
    setBookChangeCallback(handleBookChange);
  }, [setChapterChangeCallback, setBookChangeCallback, handleChapterChange, handleBookChange]);

  const loadChapterContent = async () => {
    setLoading(true);
    try {
      console.log(`🔍 Loading chapter: ${selectedBook} ${selectedChapter} (${selectedVersion})`);
      const chapter = await enhancedBibleBrainApiNew.getChapter(selectedVersion, selectedBook, selectedChapter);
      if (!chapter) {
        throw new Error('Chapter content not found');
      }
      setCurrentChapter(chapter);
    } catch (error) {
      console.error('Error loading chapter:', error);
      toast({
        title: "Error",
        description: "Could not load chapter content. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVersionChange = (version: string) => {
    console.log('BibleReader: Setting preferred translation to:', version);
    setPreferredTranslation(version);
    toast({
      title: "Translation Changed",
      description: `Switched to ${version.toUpperCase()} translation`,
    });
  };

  const handleNextChapter = () => {
    const nextChapter = selectedChapter + 1;
    console.log('BibleReader: Moving to next chapter:', nextChapter);
    setPreferredChapter(nextChapter);
    // Enable auto-play for the next chapter
    setShouldAutoPlay(true);
  };

  const handleVerseHighlight = (verseNumber: number) => {
    console.log('BibleReader: Highlighting verse:', verseNumber);
    setCurrentVerse(verseNumber);
  };

  const handleBackToChapters = () => {
    // Implementation for going back to chapters
  };

  const handleBackToBooks = () => {
    // Implementation for going back to books
  };

  const getChapterText = () => {
    if (!currentChapter) return "";
    return currentChapter.verses.map(verse => verse.text).join(" ");
  };

  // When switching tabs, disable auto-play unless it's an auto-play transition
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "audio") {
      setShouldAutoPlay(false);
    }
  };

  // Don't render until preferences are loaded
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your Bible preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <EnhancedBibleVersionSelector 
          selectedVersion={selectedVersion}
          onVersionChange={handleVersionChange}
        />
        <BibleNavigation
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          onBookChange={handleBookChange}
          onChapterChange={handleChapterChange}
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="read">Read</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="highlights">Highlights</TabsTrigger>
          <TabsTrigger value="preferences">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="read">
          <BibleChapterContent
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            chapterContent={currentChapter}
            loading={loading}
            onBackToChapters={handleBackToChapters}
            onBackToBooks={handleBackToBooks}
            onChapterChange={handleChapterChange}
            autoPlayNext={preferences.autoPlayNext}
            currentVerse={currentVerse}
            fontSize={preferences.fontSize}
            pitch={preferences.pitch}
            rate={preferences.rate}
            redLetters={preferences.redLetters}
          />
        </TabsContent>

        <TabsContent value="audio">
          <div className="space-y-4">
            {/* Bible Brain Streaming Audio Player */}
            <BibleBrainAudioPlayer
              version={selectedVersion}
              book={selectedBook}
              chapter={selectedChapter}
              onChapterChange={handleChapterChange}
              autoPlay={shouldAutoPlay}
            />
            
            {/* Fallback TTS Audio Player */}
            <BibleAudioPlayer
              book={selectedBook}
              chapter={selectedChapter}
              text={getChapterText()}
            />
            
            <BibleChapterContent
              selectedBook={selectedBook}
              selectedChapter={selectedChapter}
              chapterContent={currentChapter}
              loading={loading}
              onBackToChapters={handleBackToChapters}
              onBackToBooks={handleBackToBooks}
              onChapterChange={handleChapterChange}
              autoPlayNext={preferences.autoPlayNext}
              currentVerse={currentVerse}
              shouldAutoPlay={shouldAutoPlay}
              fontSize={preferences.fontSize}
              pitch={preferences.pitch}
              rate={preferences.rate}
              redLetters={preferences.redLetters}
            />
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <div className="space-y-4">
            <BibleNotesPage />
            <BibleChapterContent
              selectedBook={selectedBook}
              selectedChapter={selectedChapter}
              chapterContent={currentChapter}
              loading={loading}
              onBackToChapters={handleBackToChapters}
              onBackToBooks={handleBackToBooks}
              onChapterChange={handleChapterChange}
              autoPlayNext={preferences.autoPlayNext}
              currentVerse={currentVerse}
              fontSize={preferences.fontSize}
              pitch={preferences.pitch}
              rate={preferences.rate}
              redLetters={preferences.redLetters}
            />
          </div>
        </TabsContent>

        <TabsContent value="highlights">
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Highlighting is now available directly in the Bible text. Long press or click on any verse to highlight it.</p>
            </div>
            <BibleChapterContent
              selectedBook={selectedBook}
              selectedChapter={selectedChapter}
              chapterContent={currentChapter}
              loading={loading}
              onBackToChapters={handleBackToChapters}
              onBackToBooks={handleBackToBooks}
              onChapterChange={handleChapterChange}
              autoPlayNext={preferences.autoPlayNext}
              currentVerse={currentVerse}
              fontSize={preferences.fontSize}
              pitch={preferences.pitch}
              rate={preferences.rate}
              redLetters={preferences.redLetters}
            />
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <div className="space-y-4">
            <BiblePreferencesPanel />
            <BibleChapterContent
              selectedBook={selectedBook}
              selectedChapter={selectedChapter}
              chapterContent={currentChapter}
              loading={loading}
              onBackToChapters={handleBackToChapters}
              onBackToBooks={handleBackToBooks}
              onChapterChange={handleChapterChange}
              autoPlayNext={preferences.autoPlayNext}
              currentVerse={currentVerse}
              fontSize={preferences.fontSize}
              pitch={preferences.pitch}
              rate={preferences.rate}
              redLetters={preferences.redLetters}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BibleReader;
