import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, MoreVertical, Volume2, Play, Pause, ChevronLeft, ChevronRight, FileText, Palette, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BibleChapter } from "@/types/bible";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";
import { bibleBooks } from "./BibleBookList";
import { normalizeBookApiName } from "./bookUtils";
import { useToast } from "@/hooks/use-toast";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
// Import BibleNotesDialog for notes functionality
import { BibleNotesDialog } from "./BibleNotesDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AllHighlightsList from "./AllHighlightsList";


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
  menuSettingsVersion = 0
}: BibleChapterContentProps) => {
  console.log(`🔍 BibleChapterContent: Rendering with ${selectedBook} chapter ${selectedChapter}, verses: ${chapterContent?.verses?.length || 0}`);

  // Use live preferences so font-size updates apply immediately without navigating
  const { preferences } = useBiblePreferences();
  const effectiveFontSize = preferences?.fontSize ?? fontSize;

  // Force re-render when font size or menu settings change
  useEffect(() => {
    console.log('Font size changed to:', effectiveFontSize, 'menuSettingsVersion:', menuSettingsVersion);
  }, [effectiveFontSize, menuSettingsVersion]);
  
  // Create a key that changes when any setting changes to force re-render
  const settingsKey = `fontSize-${effectiveFontSize}-pitch-${pitch}-rate-${rate}-redLetters-${redLetters}-menu${menuSettingsVersion}`;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showHighlightDialog, setShowHighlightDialog] = useState(false);
  const [showHighlightsList, setShowHighlightsList] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Highlights state
  const [highlights, setHighlights] = useState<any[]>([]);

  // Move useGlobalAudio hook here to be available for useEffect hooks below
  const { 
    playBibleChapter, 
    pause: globalPause,
    resume: globalResume,
    stop: globalStop,
    audioState: globalAudioState,
  } = useGlobalAudio();

  // Fetch highlights for current chapter
  useEffect(() => {
    if (user) {
      fetchHighlights();
    }
  }, [user, selectedBook, selectedChapter]);

  // Auto-play effect: Start audio when shouldAutoPlay becomes true and chapter content is loaded
  useEffect(() => {
    if (shouldAutoPlay && chapterContent && !loading && !audioLoading) {
      console.log('🎵 BibleChapterContent: shouldAutoPlay triggered, starting audio automatically');
      // Reset shouldAutoPlay flag by calling the callback
      onAutoPlayTriggered?.();
      // Start audio playback
      handleAudioPlay();
    }
  }, [shouldAutoPlay, chapterContent, loading, audioLoading]);

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

  // Derive active state directly from global audio to avoid desync
  const isCurrentChapter = globalAudioState.currentBook === normalizedSelectedBook && 
                           globalAudioState.currentChapter === selectedChapter;
  const isLoadingActive = isCurrentChapter && globalAudioState.isLoading;
  const showPauseButton = isCurrentChapter && (globalAudioState.isPlaying || globalAudioState.isLoading);

  // Sync local audio state with global audio state - this ensures button shows correct state
  useEffect(() => {
    console.log('🔄 BibleChapterContent: AUDIO STATE SYNC', {
      globalBook: globalAudioState.currentBook,
      localBook: normalizedSelectedBook,
      globalChapter: globalAudioState.currentChapter,
      localChapter: selectedChapter,
      globalPlaying: globalAudioState.isPlaying,
      globalLoading: globalAudioState.isLoading,
      localPlaying: isPlaying,
      localLoading: audioLoading
    });
    
    // Check if this chapter is the currently active audio chapter
    const isCurrentChapter = globalAudioState.currentBook === normalizedSelectedBook && 
                             globalAudioState.currentChapter === selectedChapter;
    
    console.log('🔄 BibleChapterContent: Is current chapter?', isCurrentChapter);
    
    if (isCurrentChapter) {
      // This is the active chapter - sync with global state
      console.log('🔄 BibleChapterContent: SYNCING - Setting local isPlaying to', globalAudioState.isPlaying);
      setIsPlaying(globalAudioState.isPlaying);
      setAudioLoading(globalAudioState.isLoading);
    } else {
      // This is not the active chapter - reset local state
      console.log('🔄 BibleChapterContent: RESETTING - Not current chapter, setting local states to false');
      setIsPlaying(false); 
      setAudioLoading(false);
    }
  }, [globalAudioState.isPlaying, globalAudioState.isLoading, globalAudioState.currentBook, globalAudioState.currentChapter, normalizedSelectedBook, selectedChapter]);

  // Get the book display name (e.g., "Luke" instead of "Luke")
  const getBookDisplayName = () => {
    if (!book) return selectedBook.replace(/_/g, ' ');
    return book.name;
  };

  // Get the version display name from the versions array (same as modals)
  const getVersionDisplayName = (selectedVersion?: string) => {
    if (!selectedVersion) return "KJV";
    
    // Find the version object in the versions array (same approach as modals)
    const currentVersion = versions.find(v => (v.id || v.abbreviation) === selectedVersion);
    
    // Always use abbreviation if available, otherwise fall back to custom mapping
    if (currentVersion && currentVersion.abbreviation) {
      return currentVersion.abbreviation.toUpperCase();
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


  const handleAudioPlay = async () => {
    if (!chapterContent?.verses) return;
    if (audioLoading) return;
    
    try {
      setAudioLoading(true);
      // Ensure any previous TTS session is fully stopped before starting a new one (prevents iOS spinner loop)
      try { globalStop(); } catch {}
      await new Promise(res => setTimeout(res, 80));
      
      // Get the full text from unique verses to avoid duplicates
      const uniqueForAudio = (chapterContent.verses || []).filter((v, i, arr) => {
        const vn = Number(v.verse) || i + 1;
        return arr.findIndex(u => (Number(u.verse) || 0) === vn && (u.text || '').trim() === (v.text || '').trim()) === i;
      });
      // Deduplicate verses and normalize whitespace to reduce repetition
      const fullText = uniqueForAudio
        .map(v => cleanVerseArtifacts((v.text || '').replace(/\s+/g, ' ').trim()))
        .join(' ') || '';
      
      // Ensure the text starts with a clean chapter announcement
      // The global audio context will handle adding the intro, so we don't need to prepend it here
      const completeText = fullText;
      
      // Inline iOS unlock in the same user gesture to ensure first tap starts
      try {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          try { (window as any).speechSynthesis?.resume?.(); } catch {}
          try {
            const u = new SpeechSynthesisUtterance(' ');
            u.volume = 0.0;
            u.rate = 1.0;
            u.pitch = 1.0;
            speechSynthesis.speak(u);
            setTimeout(() => { try { speechSynthesis.cancel(); } catch {} }, 0);
          } catch {}
          try {
            const a = new Audio();
            try { (a as any).playsInline = true; } catch {}
            a.muted = true;
            a.src = 'data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA';
            a.play().then(() => a.pause()).catch(() => {});
          } catch {}
        }
      } catch {}

      // Use the global audio context with browser TTS for iPhone compatibility
      console.log('🎵 BibleChapterContent: Playing audio with settings:', { pitch, rate, textLength: completeText.length });
      console.log('🎵 BibleChapterContent: Book and chapter details:', {
        selectedBook,
        normalizedSelectedBook,
        selectedChapter,
        bookName: book?.name,
        bookApiName: book?.apiName
      });
      console.log('🎵 BibleChapterContent: Pitch value being passed:', pitch, 'Type:', typeof pitch);
      console.log('🎵 BibleChapterContent: Rate value being passed:', rate, 'Type:', typeof rate);
      console.log('🎵 BibleChapterContent: User agent:', navigator.userAgent);
      console.log('🎵 BibleChapterContent: Is iPhone:', /iPad|iPhone|iPod/.test(navigator.userAgent));
      
      // Create voice settings object with explicit values
      const voiceSettings = {
        pitch: Number(pitch),
        rate: Number(rate),
        voice: null
      };
      
      console.log('🎵 BibleChapterContent: Voice settings object created:', voiceSettings);
      console.log('🎵 BibleChapterContent: Voice settings validation:', {
        pitchIsNumber: typeof voiceSettings.pitch === 'number',
        rateIsNumber: typeof voiceSettings.rate === 'number',
        pitchValue: voiceSettings.pitch,
        rateValue: voiceSettings.rate,
        pitchIsValid: !isNaN(voiceSettings.pitch) && voiceSettings.pitch > 0,
        rateIsValid: !isNaN(voiceSettings.rate) && voiceSettings.rate > 0
      });
      
      // Kick off playback; do not block UI on long network/iOS unlock
      // Let the global audio context manage the playing state via sync effect
      // Force auto-play of the next chapter while on the Bible page
      playBibleChapter(normalizedSelectedBook, selectedChapter, completeText, true, preferences.loopChapter, voiceSettings)
        .then(() => {
          // No need to manually set isPlaying - global state sync will handle it
          console.log('🎵 BibleChapterContent: Audio play started successfully');
          // Keep loading state true until global state syncs to playing
          // This ensures the button shows the loading spinner until audio actually starts
        })
        .catch((err) => {
          console.error('Audio play failed:', err);
          toast({ title: 'Audio Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
          // Reset loading state on error
          setAudioLoading(false);
        });
      
    } catch (error) {
      console.error('Audio playback error:', error);
      toast({ title: 'Audio Error', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
      setAudioLoading(false);
    }
    // Note: Don't set audioLoading to false here - let the global state sync handle it
    // This ensures the button shows loading until audio actually starts playing
  };

  const handlePlayPause = () => {
    console.log('🎵 BibleChapterContent: handlePlayPause called - Current isPlaying:', isPlaying);
    console.log('🎵 BibleChapterContent: Global audio state:', {
      globalPlaying: globalAudioState.isPlaying,
      globalLoading: globalAudioState.isLoading,
      globalBook: globalAudioState.currentBook,
      globalChapter: globalAudioState.currentChapter,
      localBook: selectedBook,
      normalizedLocalBook: normalizedSelectedBook
    });
    
    if (isPlaying) {
      console.log('🎵 BibleChapterContent: Pausing audio via global context');
      globalPause();
      // Don't manually set isPlaying - let the global state sync handle it
    } else {
      console.log('🎵 BibleChapterContent: Starting audio playback');  
      // Always restart from beginning; stop then play in the same gesture
      try { globalStop(); } catch {}
      handleAudioPlay();
      // Don't manually set isPlaying - let the global state sync handle it
    }
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
      <div className="bible-header-full">
        <div className="bible-header-buttons-full">
          <button 
            className="bible-book-button-full"
            onClick={onBackToChapters}
          >
            {getBookDisplayName()} {selectedChapter}
          </button>
          <button 
            className="bible-version-button-full"
            onClick={() => {
              onVersionSelectorOpen?.();
            }}
          >
            {getVersionDisplayName(selectedVersion)}
          </button>
        </div>
            
        <div className="bible-header-icons-full">
          <button 
            className="bible-header-icon-full"
            onClick={() => {
              if (showPauseButton && !isLoadingActive) {
                globalPause();
              } else {
                try { globalStop(); } catch {}
                handleAudioPlay();
              }
            }}
            disabled={loading}
            title={showPauseButton ? 'Pause' : 'Play'}
          >
            {(isLoadingActive || showPauseButton) ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button 
            className="bible-header-icon-full"
            onClick={() => navigate('/bible-notes')}
            title="Go to Bible Notes Hub"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button 
            className="bible-header-icon-full"
            onClick={() => setShowHighlightsList(true)}
            title="View your highlights"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button 
            className="bible-header-icon-full"
            onClick={() => {
              onSearchOpen?.();
            }}
          >
            <Search className="w-4 h-4" />
          </button>
          <button 
            className="bible-header-icon-full"
            onClick={() => {
              onMenuOpen?.();
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
              
      {/* Main Content Area */}
      <div className="bible-main-content-full">
          {loading ? (
            <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : chapterContent ? (
            <div className="max-w-4xl mx-auto px-4 py-6">
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
                   
                   // Handle click: copy verse text to clipboard, then open highlight dialog
                   const handleVerseClick = async () => {
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
                         try { document.execCommand('copy'); } catch {}
                         document.body.removeChild(ta);
                       }
                       toast({ title: 'Verse copied', description: reference });
                     } catch (e) {
                       console.error('Copy to clipboard failed:', e);
                       toast({ title: 'Copy failed', description: 'Unable to copy verse', variant: 'destructive' });
                     }
                     setSelectedVerse(verseNumber);
                     setShowHighlightDialog(true);
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
                       return { __html: formattedText };
                     }
                     return { __html: cleanText };
                   };
                   
                   const verseStyle = { fontSize: `${effectiveFontSize}px`, lineHeight: '1.6' };
                   
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
                    
                    return (
                    <p 
                      key={`${settingsKey}-${index}`} 
                      className={`leading-relaxed text-foreground mb-4 ${highlightClass} cursor-pointer select-none`}
                      style={verseStyle}
                      onClick={handleVerseClick}
                    >
                        {/* Always show verse numbers beside each verse */}
                        {shouldShowUIVerseNumber && (
                          <sup className="text-sm font-medium text-muted-foreground mr-2">
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

                    {/* Bible Navigation Controls */}
       <div className="bible-navigation-controls">
         <div className="flex items-center justify-center space-x-4">
           <button 
             onClick={handlePreviousChapter}
             disabled={selectedChapter <= 1 && allBooks.findIndex(b => b.apiName === selectedBook) <= 0}
              className="p-2 rounded-lg bg-background border border-border hover:bg-accent disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            
            <button 
              onClick={() => {
                const isCurrentGlobalChapter = globalAudioState.currentBook === normalizedSelectedBook && globalAudioState.currentChapter === selectedChapter;
                const shouldPause = isCurrentGlobalChapter && (globalAudioState.isPlaying || globalAudioState.isLoading || audioLoading);
                if (shouldPause) {
                  globalPause();
                } else {
                  try { globalStop(); } catch {}
                  handleAudioPlay();
                }
              }}
              disabled={loading}
              className="p-3 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 disabled:opacity-50"
              title={(() => {
                // Check if this is the currently playing chapter in global context
                const isCurrentGlobalChapter = globalAudioState.currentBook === normalizedSelectedBook && globalAudioState.currentChapter === selectedChapter;
                
                if (isCurrentGlobalChapter) {
                  // Use global state for current chapter
                  const globalStatus = globalAudioState.isLoading ? 'Loading' : globalAudioState.isPlaying ? 'Playing' : globalAudioState.isPaused ? 'Paused' : 'Stopped';
                  return `Audio: ${globalStatus} | Global: ${globalStatus}`;
                } else {
                  // Use local state for other chapters
                  const localStatus = audioLoading ? 'Loading' : isPlaying ? 'Playing' : 'Stopped';
                  const globalStatus = globalAudioState.isPlaying ? 'Playing' : globalAudioState.isLoading ? 'Loading' : 'Stopped';
                  return `Audio: ${localStatus} | Global: ${globalStatus}`;
                }
              })()}
            >
              {(() => {
                const isCurrent = globalAudioState.currentBook === normalizedSelectedBook && globalAudioState.currentChapter === selectedChapter;
                const showPause = (isCurrent && (globalAudioState.isLoading || globalAudioState.isPlaying)) || audioLoading;
                return showPause ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                );
              })()}
            </button>
            
            <button 
              onClick={handleNextChapter}
              disabled={!book || (selectedChapter >= book.chapters && allBooks.findIndex(b => b.apiName === selectedBook) >= allBooks.length - 1)}
              className="p-2 rounded-lg bg-background border border-border hover:bg-accent disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
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
                Highlight Verse {selectedVerse}
              </DialogTitle>
              <DialogDescription>
                Choose a highlight color for this Bible verse to help with your study and reference.
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
                      // Remove highlight
                      const existingHighlight = getHighlightForVerse(selectedVerse!);
                      if (existingHighlight) {
                        try {
                          const { error } = await supabase
                            .from('bible_highlights')
                            .delete()
                            .eq('id', existingHighlight.id);
                          if (!error) {
                            await refetchHighlights();
                            toast({ title: "Highlight Removed" });
                          }
                        } catch (error) {
                          console.error('Error removing highlight:', error);
                        }
                      }
                    } else {
                      // Add/update highlight
                      try {
                        const { error } = await supabase
                          .from('bible_highlights')
                          .upsert({
                            user_id: user?.id,
                            book: selectedBook,
                            chapter: selectedChapter,
                            verse: selectedVerse,
                            highlight_color: color.value,
                          });
                        if (!error) {
                          await refetchHighlights();
                          toast({ title: "Verse Highlighted", description: `Highlighted in ${color.name}` });
                        }
                      } catch (error) {
                        console.error('Error adding highlight:', error);
                      }
                    }
                    setShowHighlightDialog(false);
                  }}
                >
                  {color.name}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>


      </div>
    );
};
