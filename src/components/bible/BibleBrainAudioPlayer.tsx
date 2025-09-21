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

  // Set up audio event listeners and Media Session
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set up Media Session metadata
    if ('mediaSession' in navigator && audioUrl) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${book} Chapter ${chapter}`,
        artist: 'Bible Audio',
        album: version || 'Bible',
        artwork: [
          { src: '/bible-icon.svg', sizes: '96x96', type: 'image/svg+xml' },
          { src: '/bible-icon.svg', sizes: '128x128', type: 'image/svg+xml' },
          { src: '/bible-icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/bible-icon.svg', sizes: '256x256', type: 'image/svg+xml' },
          { src: '/bible-icon.svg', sizes: '384x384', type: 'image/svg+xml' },
          { src: '/bible-icon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });

      // Set up Media Session action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('🎵 Media Session: Play from control center');
        handlePlay();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('🎵 Media Session: Pause from control center');
        handlePause();
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        console.log('🎵 Media Session: Stop from control center');
        handlePause();
        if (audio) {
          audio.currentTime = 0;
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('🎵 Media Session: Previous chapter from control center');
        handlePreviousChapter();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('🎵 Media Session: Next chapter from control center');
        handleNextChapter();
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (audio) {
          audio.currentTime = Math.max(0, audio.currentTime - skipTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (audio) {
          audio.currentTime = Math.min(audio.duration, audio.currentTime + skipTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && audio) {
          audio.currentTime = details.seekTime;
        }
      });

      // Set initial playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      
      // Update Media Session position state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: audio.currentTime
        });
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Update Media Session position
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: audio.currentTime
        });
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      
      // Update Media Session state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      
      // Auto play next chapter if enabled
      if (preferences.autoPlayNext) {
        const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
        const currentBookInfo = allBooks.find(b => b.apiName === book);
        const nextChapter = chapter + 1;
        
        // Check if we need to move to the next book
        if (currentBookInfo && nextChapter > currentBookInfo.chapters) {
          const currentBookIndex = allBooks.findIndex(b => b.apiName === book);
          if (currentBookIndex < allBooks.length - 1 && onBookChange) {
            const nextBook = allBooks[currentBookIndex + 1];
            console.log(`🎵 Moving to next book: ${nextBook.name} chapter 1`);
            onBookChange(nextBook.apiName, 1);
          } else {
            console.log(`🎵 Reached end of Bible - no more books to auto-play`);
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
      
      // Update Media Session state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      
      // Update Media Session state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const handlePauseEvent = () => {
      setIsPlaying(false);
      
      // Update Media Session state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePauseEvent);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePauseEvent);
    };
  }, [chapter, onChapterChange, preferences.autoPlayNext, audioUrl, book, version, isPlaying]);

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
            className="hidden"
          />
        )}
      </CardContent>
    </Card>
  );
};