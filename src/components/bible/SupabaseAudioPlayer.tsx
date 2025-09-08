import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import { supabaseAudioService, type AudioFileInfo } from "@/services/supabaseAudioService";
import { useToast } from "@/hooks/use-toast";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";

interface SupabaseAudioPlayerProps {
  book: string;
  chapter: number;
  version: string;
  onChapterComplete?: () => void;
  onError?: (error: string) => void;
}

export const SupabaseAudioPlayer = ({
  book,
  chapter,
  version,
  onChapterComplete,
  onError
}: SupabaseAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [audioFileInfo, setAudioFileInfo] = useState<AudioFileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const { preferences } = useBiblePreferences();

  // Update volume from preferences (if available)
  useEffect(() => {
    // Default volume to 80 if no preference set
    setVolume(80);
  }, []);

  // Load audio file when book, chapter, or version changes
  useEffect(() => {
    const loadAudioFile = async () => {
      console.log('🎵 SupabaseAudioPlayer: Loading audio for', { book, chapter, version });
      setIsLoading(true);
      setError(null);
      
      try {
        const audioInfo = await supabaseAudioService.getAudioFileInfo(book, chapter, version);
        
        if (audioInfo) {
          console.log('🎵 SupabaseAudioPlayer: Audio file loaded:', audioInfo);
          setAudioFileInfo(audioInfo);
          
          // Set the audio source
          if (audioRef.current) {
            audioRef.current.src = audioInfo.url;
          }
        } else {
          const errorMsg = `No audio available for ${book} chapter ${chapter}`;
          console.warn('🎵 SupabaseAudioPlayer:', errorMsg);
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } catch (err) {
        console.error('🎵 SupabaseAudioPlayer: Error loading audio:', err);
        const errorMsg = 'Failed to load audio file';
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadAudioFile();
  }, [book, chapter, version, onError]);

  // Audio event handlers
  const togglePlayPause = async () => {
    if (!audioRef.current || !audioFileInfo) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('🎵 SupabaseAudioPlayer: Playback error:', err);
      toast({
        title: "Audio Error",
        description: "Failed to play audio",
        variant: "destructive"
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    onChapterComplete?.();
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleSeek = (newTime: number[]) => {
    if (audioRef.current && newTime.length > 0) {
      audioRef.current.currentTime = newTime[0];
      setCurrentTime(newTime[0]);
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    if (audioRef.current && newVolume.length > 0) {
      const vol = newVolume[0];
      setVolume(vol);
      audioRef.current.volume = vol / 100;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume / 100;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
    }
  };

  const restart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Error state
  if (error) {
    return (
      <div className="bg-card border rounded-lg p-4 space-y-3">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              const loadAudioFile = async () => {
                setIsLoading(true);
                try {
                  const audioInfo = await supabaseAudioService.getAudioFileInfo(book, chapter, version);
                  if (audioInfo) {
                    setAudioFileInfo(audioInfo);
                    if (audioRef.current) {
                      audioRef.current.src = audioInfo.url;
                    }
                  }
                } catch (err) {
                  setError('Failed to load audio file');
                } finally {
                  setIsLoading(false);
                }
              };
              loadAudioFile();
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Loading audio...</span>
        </div>
      </div>
    );
  }

  // No audio available
  if (!audioFileInfo) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No Audio Available</p>
          <p className="text-xs text-muted-foreground mt-1">
            Audio not found for {book} chapter {chapter}
          </p>
        </div>
      </div>
    );
  }

  // Main player interface
  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Audio file info */}
      <div className="text-center">
        <h4 className="font-medium text-sm">
          {audioFileInfo.book} Chapter {audioFileInfo.chapter}
        </h4>
        <p className="text-xs text-muted-foreground">
          {audioFileInfo.fileName}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-2">
        <Button variant="ghost" size="sm" onClick={restart}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button variant="ghost" size="sm" onClick={skipBackward}>
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button onClick={togglePlayPause} size="sm" className="h-8 w-8 p-0">
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <Button variant="ghost" size="sm" onClick={skipForward}>
          <SkipForward className="h-4 w-4" />
        </Button>

        <div className="flex items-center space-x-2 ml-4">
          <Button variant="ghost" size="sm" onClick={toggleMute}>
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="w-16"
          />
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        preload="metadata"
      />
    </div>
  );
};