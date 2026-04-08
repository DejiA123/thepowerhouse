import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { bibleBooks } from "./BibleBookList";

interface BibleBrainAudioPlayerProps {
  version: string;
  book: string;
  chapter: number;
  onChapterChange?: (chapter: number) => void;
  onBookChange?: (book: string, chapter: number) => void;
  autoPlay?: boolean;
}

export const BibleBrainAudioPlayer = ({
  version,
  book,
  chapter,
  onChapterChange,
  onBookChange,
  autoPlay = false
}: BibleBrainAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const { preferences } = useBiblePreferences();

  // Load audio when version, book, or chapter changes
  useEffect(() => {
    loadAudio();
  }, [version, book, chapter]);

  // Auto play if requested
  useEffect(() => {
    if (autoPlay && hasAudio && audioUrl && !isLoading) {
      handlePlay();
    }
  }, [autoPlay, hasAudio, audioUrl, isLoading]);

  // Setup Media Session API for iPhone control center integration
  useEffect(() => {
    if ('mediaSession' in navigator && hasAudio) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${book} Chapter ${chapter}`,
        artist: 'The PowerHouse',
        album: version,
        artwork: [
          { src: '/favicon.png', sizes: '192x192', type: 'image/png' }
        ]
      });

      // Set up action handlers for iPhone control center
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current) {
          audioRef.current.play().catch(console.error);
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePreviousChapter();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNextChapter();
      });

      navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', () => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
        }
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime != null) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [hasAudio, book, chapter, version, duration]);

  // Update Media Session playback state
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Update Media Session position state
  useEffect(() => {
    if ('mediaSession' in navigator && duration > 0) {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: currentTime
      });
    }
  }, [currentTime, duration]);

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);

      // Auto play next chapter if enabled
      if (preferences.autoPlayNext) {
        const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
        const currentBookInfo = allBooks.find(b => b.apiName === book);
        const nextChapter = chapter + 1;

        // Check if we need to move to the next book
        if (currentBookInfo && nextChapter > currentBookInfo.chapters) {
          if (preferences.loopBook && onChapterChange) {
            // Loop Book is ON — restart from chapter 1 of this book
            console.log(`🔁 Loop Book: Restarting ${book} from chapter 1`);
            onChapterChange(1);
          } else {
            const currentBookIndex = allBooks.findIndex(b => b.apiName === book);
            if (currentBookIndex < allBooks.length - 1 && onBookChange) {
              const nextBook = allBooks[currentBookIndex + 1];
              console.log(`🎵 Moving to next book: ${nextBook.name} chapter 1`);
              onBookChange(nextBook.apiName, 1);
            } else {
              console.log(`🎵 Reached end of Bible - no more books to auto-play`);
            }
          }
        } else if (onChapterChange) {
          onChapterChange(nextChapter);
        }
      }
    };

    const handleError = () => {
      setError('Audio playback failed');
      setIsPlaying(false);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
    // Note: onChapterChange and onBookChange are now wrapped in useCallback in BiblePage.tsx 
    // to ensure stable references, preventing unnecessary re-creation of event listeners
  }, [book, chapter, onChapterChange, onBookChange, preferences.autoPlayNext, preferences.loopBook]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setHasAudio(false);
      setAudioUrl(null);

      console.log(`🎵 Loading Bible Brain audio for ${book} chapter ${chapter} (${version})`);

      const url = await enhancedApiBibleService.getAudio(version, book, chapter);

      if (url) {
        setAudioUrl(url);
        setHasAudio(true);
        console.log(`✅ Audio loaded: ${url}`);
      } else {
        console.log(`⚠️ No audio available for ${book} chapter ${chapter}`);
        setHasAudio(false);
      }
    } catch (error) {
      console.error('❌ Error loading audio:', error);
      setError('Failed to load audio');
      setHasAudio(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!audioRef.current || !audioUrl) return;

    try {
      setIsLoading(true);
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      setError('Playback failed');
      toast({
        title: "Audio Error",
        description: "Failed to play audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const handleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      audioRef.current.volume = newMuted ? 0 : volume;
    }
  };

  const handlePreviousChapter = () => {
    if (chapter > 1 && onChapterChange) {
      onChapterChange(chapter - 1);
    }
  };

  const handleNextChapter = () => {
    if (onChapterChange) {
      onChapterChange(chapter + 1);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `${book}-chapter-${chapter}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (isLoading && !hasAudio) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Checking for audio...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasAudio && !isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No audio available for this chapter</p>
            <Badge variant="outline" className="mt-2">
              {version} - {book} {chapter}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-destructive">
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAudio}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">{book} Chapter {chapter}</h3>
              <Badge variant="secondary" className="text-xs">
                {version} Audio
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              {audioUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  title="Download audio"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {duration > 0 && (
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                max={duration}
                step={1}
                onValueChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousChapter}
                disabled={chapter <= 1}
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handlePlayPause}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextChapter}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMute}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>
          </div>
        </div>

        {/* Hidden Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            className="sr-only"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </CardContent>
    </Card>
  );
};