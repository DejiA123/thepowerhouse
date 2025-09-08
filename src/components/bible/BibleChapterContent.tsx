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
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
// Import BibleNotesDialog for notes functionality
import { BibleNotesDialog } from "./BibleNotesDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AllHighlightsList from "./AllHighlightsList";
import { supabaseAudioService } from "@/services/supabaseAudioService";


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
    console.log('🔍 BibleChapterContent: Font size changed to:', effectiveFontSize, 'menuSettingsVersion:', menuSettingsVersion);
    console.log('🔍 BibleChapterContent: preferences.fontSize:', preferences?.fontSize, 'prop fontSize:', fontSize);
    console.log('🔍 BibleChapterContent: selectedBook:', selectedBook, 'selectedChapter:', selectedChapter);
  }, [effectiveFontSize, menuSettingsVersion, selectedBook, selectedChapter]);
  
  // Create a key that changes when any setting changes to force re-render
  const settingsKey = `fontSize-${effectiveFontSize}-pitch-${pitch}-rate-${rate}-redLetters-${redLetters}-menu${menuSettingsVersion}`;
  
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showHighlightDialog, setShowHighlightDialog] = useState(false);
  const [showHighlightsList, setShowHighlightsList] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  
  // MP3 Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Highlights state
  const [highlights, setHighlights] = useState<any[]>([]);


  // Fetch highlights for current chapter
  useEffect(() => {
    if (user) {
      fetchHighlights();
    }
  }, [user, selectedBook, selectedChapter]);

  // Auto-play effect: Reset shouldAutoPlay flag when triggered
  useEffect(() => {
    if (shouldAutoPlay && chapterContent && !loading) {
      console.log('🎵 BibleChapterContent: shouldAutoPlay triggered, but TTS is disabled - only MP3 audio available');
      // Reset shouldAutoPlay flag by calling the callback
      onAutoPlayTriggered?.();
    }
  }, [shouldAutoPlay, chapterContent, loading]);

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

  // Load MP3 audio when book, chapter, or version changes
  useEffect(() => {
    const loadAudio = async () => {
      if (!selectedVersion) {
        console.log('🔍 No selectedVersion available');
        return;
      }
      
      console.log('🔍 === AUDIO LOADING DEBUG START ===');
      console.log('🔍 Loading MP3 audio with params:', {
        selectedBook,
        selectedChapter,
        selectedVersion
      });
      
      // Test the exact filename generation
      console.log('🔍 Testing filename generation...');
      const testFileName = supabaseAudioService.generateFileName(selectedBook, selectedChapter, selectedVersion);
      console.log('🔍 Generated test filename:', testFileName);
      console.log('🔍 Expected filename from user:', 'B01___01_Matthew_____ENGKJVN1DA.mp3');
      console.log('🔍 Do they match?', testFileName === 'B01___01_Matthew_____ENGKJVN1DA.mp3');
      
      setIsLoading(true);
      setAudioError(null);
      
      try {
        // First, let's check what filename would be generated
        const fileName = supabaseAudioService.generateFileName(selectedBook, selectedChapter, selectedVersion);
        console.log('🔍 Generated filename:', fileName);
        
        // Let's check what files are actually in the bucket with more detail
        try {
          console.log('🔍 Checking bucket contents...');
          const { data: files, error: listError } = await supabase.storage
            .from('audio-bible')
            .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
          
          if (listError) {
            console.error('❌ Error listing bucket files:', listError);
          } else {
            console.log('🔍 Total files in audio-bible bucket:', files?.length || 0);
            console.log('🔍 All files in bucket:', files?.map(f => f.name) || []);
            
            // Check for exact match
            const exactMatch = files?.find(f => f.name === fileName);
            console.log('🔍 Looking for exact filename:', fileName);
            console.log('🔍 Exact match found:', !!exactMatch);
            
            if (!exactMatch) {
              console.log('❌ No exact match found');
              // Look for files that contain Matthew or B01
              const matthewFiles = files?.filter(f => 
                f.name.toLowerCase().includes('matthew') || 
                f.name.includes('B01')
              ) || [];
              console.log('🔍 Matthew/B01 files found:', matthewFiles.map(f => f.name));
            }
          }
        } catch (listErr) {
          console.error('❌ Error accessing bucket:', listErr);
        }
        
        console.log('🔍 About to call supabaseAudioService.getAudioUrl...');
        const url = await supabaseAudioService.getAudioUrl(selectedBook, selectedChapter, selectedVersion);
        console.log('🔍 Generated URL result:', url);
        
        if (url) {
          console.log('✅ URL generated successfully:', url);
          setAudioUrl(url);
          setAudioError(null);
          
          // Test if URL is accessible
          try {
            console.log('🔍 Testing URL accessibility...');
            const response = await fetch(url, { method: 'HEAD' });
            console.log('🔍 URL test response status:', response.status);
            console.log('🔍 URL test response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
              console.error('❌ URL is not accessible:', response.status, response.statusText);
              setAudioError(`Audio file not accessible (${response.status})`);
              setAudioUrl(null);
            } else {
              console.log('✅ URL is accessible!');
            }
          } catch (fetchError) {
            console.error('❌ Error testing URL:', fetchError);
            setAudioError('Audio file URL test failed');
            setAudioUrl(null);
          }
        } else {
          const errorMsg = `No MP3 audio available for ${selectedBook} ${selectedChapter}`;
          console.error('❌', errorMsg);
          setAudioError(errorMsg);
        }
        
        console.log('🔍 === AUDIO LOADING DEBUG END ===');
      } catch (error) {
        console.error('❌ Error loading MP3 audio:', error);
        setAudioError('Failed to load MP3 audio');
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [selectedBook, selectedChapter, selectedVersion]);

  // Update audio element when audioUrl changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      console.log('🎵 Setting audio src to:', audioUrl);
      audioRef.current.src = audioUrl;
    }
  }, [audioUrl]);

  // Handle MP3 audio playback
  const handlePlayPause = async () => {
    console.log('🎵 handlePlayPause called - checking conditions...');
    console.log('🎵 audioUrl:', audioUrl);
    console.log('🎵 audioError:', audioError);
    console.log('🎵 isLoading:', isLoading);
    console.log('🎵 isPlaying:', isPlaying);

    if (!audioUrl) {
      // Try to reload the audio first
      console.log('🎵 No audioUrl - attempting to reload audio...');
      setIsLoading(true);
      setAudioError(null);
      
      try {
        const url = await supabaseAudioService.getAudioUrl(selectedBook, selectedChapter, selectedVersion);
        console.log('🎵 Reloaded URL:', url);
        
        if (url) {
          setAudioUrl(url);
          // Try to play immediately after setting URL
          if (audioRef.current) {
            audioRef.current.src = url;
            await audioRef.current.play();
            setIsPlaying(true);
          }
        } else {
          toast({
            title: "Audio Not Available",
            description: `No MP3 audio available for ${selectedBook} chapter ${selectedChapter}`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('🎵 Error reloading audio:', error);
        toast({
          title: "Audio Error",
          description: "Failed to load audio file",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (isPlaying) {
      // Pause audio
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // Play audio
      if (audioRef.current) {
        try {
          console.log('🎵 Attempting to play audio:', audioUrl);
          await audioRef.current.play();
          setIsPlaying(true);
          console.log('🎵 Audio playing successfully');
        } catch (error) {
          console.error('🎵 Error playing audio:', error);
          toast({
            title: "Audio Error",
            description: "Failed to play audio",
            variant: "destructive"
          });
        }
      }
    }
  };


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
      {/* Hidden audio element for MP3 playback */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={() => {
          setIsPlaying(false);
          setAudioError('Failed to play audio file');
        }}
        preload="metadata"
      />
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
            onClick={handlePlayPause}
            disabled={isLoading}
            title={isLoading ? "Loading audio..." : (isPlaying ? "Pause audio" : "Play audio")}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
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
              onClick={handlePlayPause}
              disabled={isLoading}
              className="p-3 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 disabled:opacity-50"
              title={isLoading ? "Loading audio..." : (isPlaying ? "Pause audio" : "Play audio")}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
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
