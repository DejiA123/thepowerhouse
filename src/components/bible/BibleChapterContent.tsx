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
  
  // Use preferences.fontSize as the single source of truth, fallback to prop if not loaded
  const effectiveFontSize = isLoaded ? preferences.fontSize : fontSize;
  
  console.log('🔍 BibleChapterContent: Font size source of truth:', {
    preferencesFontSize: preferences?.fontSize,
    propFontSize: fontSize,
    effectiveFontSize: effectiveFontSize,
    isLoaded: isLoaded
  });

  // Debug: Log font size initialization and changes
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  console.log('🔍 BibleChapterContent: Font size state:', {
    preferencesFontSize: preferences?.fontSize,
    propFontSize: fontSize,
    effectiveFontSize: effectiveFontSize,
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
  const [forceUpdate, setForceUpdate] = useState(0);

  // Force re-render when font size or menu settings change
  useEffect(() => {
    console.log('🔍 BibleChapterContent: Font size changed to:', effectiveFontSize, 'menuSettingsVersion:', menuSettingsVersion);
    console.log('🔍 BibleChapterContent: preferences.fontSize:', preferences?.fontSize, 'prop fontSize:', fontSize);
    console.log('🔍 BibleChapterContent: selectedBook:', selectedBook, 'selectedChapter:', selectedChapter);
    
    // Force a re-render by updating a state variable
    setForceUpdate(prev => prev + 1);
  }, [effectiveFontSize, menuSettingsVersion, selectedBook, selectedChapter]);

  // Update CSS custom property for immediate font size changes
  useEffect(() => {
    document.documentElement.style.setProperty('--bible-font-size', `${effectiveFontSize}px`);
    console.log('🔍 BibleChapterContent: Set CSS custom property --bible-font-size to:', `${effectiveFontSize}px`);
  }, [effectiveFontSize]);

  // Force re-render when preferences change
  useEffect(() => {
    console.log('🔍 BibleChapterContent: Preferences changed, forcing re-render');
    setForceUpdate(prev => prev + 1);
  }, [preferences]);

  // Listen for custom font size change events from the modal
  useEffect(() => {
    const handleFontSizeChange = (event: CustomEvent) => {
      const newFontSize = event.detail.fontSize;
      console.log('🔍 BibleChapterContent: Received font size change event:', {
        newFontSize: newFontSize,
        currentPreferencesFontSize: preferences.fontSize,
        currentEffectiveFontSize: effectiveFontSize,
        selectedBook: selectedBook,
        selectedChapter: selectedChapter
      });
      
      // Force a re-render to apply the new font size immediately
      setForceUpdate(prev => prev + 1);
      
      // Also update CSS property immediately
      document.documentElement.style.setProperty('--bible-font-size', `${newFontSize}px`);
    };

    // Listen for custom events
    window.addEventListener('fontSizeChanged', handleFontSizeChange as EventListener);
    console.log('🔍 BibleChapterContent: Added fontSizeChanged event listener');

    return () => {
      window.removeEventListener('fontSizeChanged', handleFontSizeChange as EventListener);
      console.log('🔍 BibleChapterContent: Removed fontSizeChanged event listener');
    };
  }, [preferences.fontSize, effectiveFontSize, selectedBook, selectedChapter]);


  
  // Create a key that changes when any setting changes to force re-render
  const settingsKey = `fontSize-${effectiveFontSize}-pitch-${pitch}-rate-${rate}-redLetters-${redLetters}-menu${menuSettingsVersion}-force${forceUpdate}`;
  
  // MP3 Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Media Session API for background audio playback
  const updateMediaSession = () => {
    if ('mediaSession' in navigator && audioRef.current) {
      const bookName = getBookDisplayName();
      const versionName = getVersionDisplayName(selectedVersion);
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${bookName} ${selectedChapter}`,
        artist: `Bible Audio - ${versionName}`,
        album: 'PowerHouse Connect',
        artwork: [
          { src: '/bible-icon.svg', sizes: '96x96', type: 'image/svg+xml' },
          { src: '/bible-icon.svg', sizes: '128x128', type: 'image/svg+xml' },
          { src: '/bible-icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/bible-icon.svg', sizes: '256x256', type: 'image/svg+xml' },
          { src: '/bible-icon.svg', sizes: '384x384', type: 'image/svg+xml' },
          { src: '/bible-icon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });

      // Set up media session action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('🎵 Media Session: Play action triggered');
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('🎵 Media Session: Pause action triggered');
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('🎵 Media Session: Previous track action triggered');
        handlePreviousChapter();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('🎵 Media Session: Next track action triggered');
        handleNextChapter();
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        console.log('🎵 Media Session: Seek backward action triggered', details);
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10;
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skipTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        console.log('🎵 Media Session: Seek forward action triggered', details);
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10;
          audioRef.current.currentTime = Math.min(
            audioRef.current.duration, 
            audioRef.current.currentTime + skipTime
          );
        }
      });

      // Update playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      
      console.log('🎵 Media Session updated:', {
        title: `${bookName} ${selectedChapter}`,
        artist: `Bible Audio - ${versionName}`,
        isPlaying: isPlaying
      });
    }
  };

  // Update media session when audio state changes
  useEffect(() => {
    updateMediaSession();
  }, [isPlaying, selectedBook, selectedChapter, selectedVersion]);

  // Service Worker communication for background audio
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Send audio state to service worker
      navigator.serviceWorker.controller.postMessage({
        type: 'AUDIO_STATE_UPDATE',
        autoPlayNext: autoPlayNext,
        loopChapter: false, // We don't have loop chapter in this component
        book: selectedBook,
        chapter: selectedChapter,
        isPlaying: isPlaying,
        timestamp: Date.now()
      });
    }
  }, [isPlaying, selectedBook, selectedChapter, autoPlayNext]);

  // Listen for service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'AUDIO_CONTROL') {
          console.log('🎵 Received audio control from service worker:', event.data.action);
          
          switch (event.data.action) {
            case 'play':
              if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play();
              }
              break;
            case 'pause':
              if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
              }
              break;
            case 'next':
              handleNextChapter();
              break;
            case 'previous':
              handlePreviousChapter();
              break;
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

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

  // Auto-play MP3 audio when audio URL is loaded and shouldAutoPlay is true
  useEffect(() => {
    console.log('🔍 Audio auto-play effect triggered:', { 
      shouldAutoPlay, 
      hasAudioUrl: !!audioUrl, 
      hasAudioRef: !!audioRef.current, 
      isLoading,
      isPlaying,
      audioError: !!audioError 
    });
    
    if (shouldAutoPlay && audioUrl && audioRef.current && !isLoading && !audioError && !isPlaying) {
      console.log('🎵 BibleChapterContent: Auto-playing MP3 audio for next chapter');
      
      // Wait a small amount to ensure audio element is ready
      const playTimeout = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play()
            .then(() => {
              console.log('✅ Auto-play successful');
              setIsPlaying(true);
              // Reset shouldAutoPlay flag after successfully starting playback
              onAutoPlayTriggered?.();
            })
            .catch(error => {
              console.error('❌ Error auto-playing audio:', error);
              // Still reset the flag even if auto-play fails
              onAutoPlayTriggered?.();
            });
        }
      }, 100);
      
      return () => clearTimeout(playTimeout);
    }
  }, [shouldAutoPlay, audioUrl, isLoading, audioError, isPlaying, onAutoPlayTriggered]);

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
      
      console.log('🔍 Loading MP3 audio with params:', {
        selectedBook,
        selectedChapter,
        selectedVersion
      });
      
      setIsLoading(true);
      setAudioError(null);
      
      try {
        // Generate the expected filename
        const fileName = supabaseAudioService.generateFileName(selectedBook, selectedChapter, selectedVersion);
        console.log('🔍 Generated filename:', fileName);
        
        // Directly get the audio URL - much faster than full bucket listing
        console.log('🔍 Getting audio URL directly...');
        
        const url = await supabaseAudioService.getAudioUrl(selectedBook, selectedChapter, selectedVersion);
        console.log('🔍 Generated URL:', url);
        
        if (url) {
          setAudioUrl(url);
          console.log(`🎵 MP3 audio loaded: ${url}`);
          console.log(`🔍 Audio URL set, shouldAutoPlay: ${shouldAutoPlay}, isLoading: ${isLoading}`);
          
          // Test if the URL actually works
          try {
            const response = await fetch(url, { method: 'HEAD' });
            console.log('🔍 URL test response status:', response.status);
            if (!response.ok) {
              console.error('❌ URL is not accessible:', response.status, response.statusText);
              setAudioError(`Audio file not accessible (${response.status})`);
              setAudioUrl(null);
            } else {
              console.log('✅ URL is accessible! Audio should work.');
            }
          } catch (fetchError) {
            console.error('❌ Error testing URL:', fetchError);
            setAudioError('Audio file URL test failed');
            setAudioUrl(null);
          }
        } else {
          const errorMsg = `No MP3 audio available for ${selectedBook} ${selectedChapter} (${selectedVersion})`;
          console.log('❌', errorMsg);
          setAudioError(errorMsg);
        }
      } catch (error) {
        console.error('❌ Error loading MP3 audio:', error);
        setAudioError('Failed to load MP3 audio');
      } finally {
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [selectedBook, selectedChapter, selectedVersion]);

  // Handle MP3 audio playback
  const handlePlayPause = async () => {
    // First, let's check if the bucket has ANY files at all using the same pagination logic
    try {
      // Use the same pagination function to get all files
      const getAllFiles = async () => {
        let allFiles: any[] = [];
        
        // Get files by prefix patterns to work around Supabase limitations
        const prefixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        
        for (const prefix of prefixes) {
          try {
            const { data: batch, error: batchError } = await supabase.storage
              .from('audio-bible')
              .list('', { 
                limit: 1000,
                sortBy: { column: 'name', order: 'asc' },
                search: prefix
              });
            
            if (batchError) {
              console.error(`❌ Error fetching files with prefix ${prefix}:`, batchError);
              continue;
            }
            
            if (batch && batch.length > 0) {
              allFiles = [...allFiles, ...batch];
              console.log(`🔍 BUCKET CHECK - Fetched ${batch.length} files with prefix ${prefix}, total so far: ${allFiles.length}`);
            }
          } catch (error) {
            console.error(`❌ Error processing prefix ${prefix}:`, error);
          }
        }
        
        // Remove duplicates and sort
        const uniqueFiles = allFiles.filter((file, index, self) => 
          index === self.findIndex(f => f.name === file.name)
        ).sort((a, b) => a.name.localeCompare(b.name));
        
        return uniqueFiles;
      };
      
      const allFiles = await getAllFiles();
      
      console.log('🔍 BUCKET CHECK - Error: null');
      console.log('🔍 BUCKET CHECK - Total files:', allFiles.length);
      console.log('🔍 BUCKET CHECK - Files:', allFiles.map(f => f.name));
      
      if (!allFiles || allFiles.length === 0) {
        toast({
          title: "No Audio Files Found",
          description: "The audio-bible bucket is empty. Please upload MP3 files to Supabase Storage.",
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      console.error('🔍 BUCKET CHECK - Error accessing bucket:', error);
      toast({
        title: "Bucket Access Error", 
        description: "Cannot access the audio-bible bucket. Check permissions.",
        variant: "destructive"
      });
      return;
    }

    if (!audioUrl) {
      toast({
        title: "Audio Not Available",
        description: audioError || "No MP3 audio file found for this chapter",
        variant: "destructive"
      });
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
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Error playing audio:', error);
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
      {/* Hidden audio element for MP3 playback with background support */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onEnded={() => {
          console.log(`🎵 Audio ended for ${selectedBook} ${selectedChapter}`);
          setIsPlaying(false);
          
          // Auto-play next chapter if enabled
          if (autoPlayNext && onChapterChange) {
            console.log(`🎵 Auto-playing next chapter from ${selectedBook} ${selectedChapter}`);
            
            // Use setTimeout to ensure the state update happens even in background
            setTimeout(() => {
              const nextChapter = selectedChapter + 1;
              console.log(`🎵 Triggering chapter change to ${selectedBook} ${nextChapter}`);
              onChapterChange(nextChapter, true); // true indicates this is auto-play
            }, 100);
          }
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => {
          setIsPlaying(true);
          // Update media session when playing
          updateMediaSession();
        }}
        onError={() => {
          setIsPlaying(false);
          setAudioError('Failed to play audio file');
        }}
        preload="metadata"
        // Background audio attributes
        crossOrigin="anonymous"
        playsInline={true}
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
          {/* Debug font size display - mobile optimized */}
          <div className="text-xs text-muted-foreground px-2 select-none touch-manipulation">
            Font: {effectiveFontSize}px
          </div>
          <button 
            className="bible-header-icon-full"
            onClick={handlePlayPause}
            disabled={isLoading}
            title={isLoading ? "Loading audio..." : (isPlaying ? "Pause audio" : "Play audio")}
          >
            {isLoading ? (
              <Volume2 className="w-4 h-4 opacity-50" />
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
                   
                   const verseStyle = { 
                     fontSize: `${effectiveFontSize}px`, 
                     lineHeight: '1.6',
                     '--font-size': `${effectiveFontSize}px`,
                     '--bible-font-size': `${effectiveFontSize}px`
                   } as React.CSSProperties;
                   console.log(`🔍 Rendering verse ${verseNumber} with fontSize: ${effectiveFontSize}px, style:`, verseStyle);
                   
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
                      className={`text-foreground mb-4 ${highlightClass} cursor-pointer select-none`}
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
                <Volume2 className="w-5 h-5 opacity-50" />
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
