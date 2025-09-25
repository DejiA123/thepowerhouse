import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { supabaseAudioService, type AudioFileInfo } from '@/services/supabaseAudioService';
import { useBiblePreferences } from '@/hooks/useBiblePreferences';

interface SupabaseAudioPlayerProps {
  book: string;
  chapter: number;
  version: string;
  onChapterComplete?: () => void;
  onError?: (error: string) => void;
}

export const SupabaseAudioPlayer: React.FC<SupabaseAudioPlayerProps> = ({
  book,
  chapter,
  version,
  onChapterComplete,
  onError
}) => {
  const { preferences } = useBiblePreferences();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(preferences?.pitch || 1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioFileInfo, setAudioFileInfo] = useState<AudioFileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load audio file when book, chapter, or version changes
  useEffect(() => {
    loadAudioFile();
  }, [book, chapter, version]);

  // Update volume when preferences change
  useEffect(() => {
    if (audioRef.current && preferences?.pitch) {
      audioRef.current.volume = Math.min(Math.max(preferences.pitch, 0), 1);
      setVolume(preferences.pitch);
    }
  }, [preferences?.pitch]);

  // Setup Media Session API for iPhone control center integration
  useEffect(() => {
    if ('mediaSession' in navigator && audioFileInfo) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${book} Chapter ${chapter}`,
        artist: 'The PowerHouse',
        album: version,
        artwork: [
          { src: '/bible-icon.svg', sizes: '192x192', type: 'image/svg+xml' }
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

      navigator.mediaSession.setActionHandler('seekbackward', () => {
        skipBackward();
      });

      navigator.mediaSession.setActionHandler('seekforward', () => {
        skipForward();
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
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [audioFileInfo, book, chapter, version]);

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

  const loadAudioFile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Loading audio for ${book} ${chapter} (${version})`);
      
      const fileInfo = await supabaseAudioService.getAudioFileInfo(book, chapter, version);
      
      if (!fileInfo) {
        const errorMsg = `No audio file found for ${book} ${chapter} (${version})`;
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setAudioFileInfo(fileInfo);
      
      if (audioRef.current) {
        audioRef.current.src = fileInfo.url;
        audioRef.current.load();
      }
      
      console.log(`Audio loaded: ${fileInfo.fileName}`);
    } catch (err) {
      const errorMsg = `Failed to load audio: ${err}`;
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('Error loading audio:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
        setError(`Playback error: ${err.message}`);
      });
      setIsPlaying(true);
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
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <VolumeX className="w-5 h-5" />
          <span className="font-medium">Audio Not Available</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <Button 
          onClick={loadAudioFile} 
          variant="outline" 
          size="sm" 
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-800">
          <Volume2 className="w-5 h-5 animate-pulse" />
          <span className="font-medium">Loading Audio...</span>
        </div>
        <p className="text-blue-600 text-sm mt-1">
          Loading {book} {chapter} audio...
        </p>
      </div>
    );
  }

  if (!audioFileInfo) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-800">
          <VolumeX className="w-5 h-5" />
          <span className="font-medium">No Audio Available</span>
        </div>
        <p className="text-gray-600 text-sm mt-1">
          Audio file not found for {book} {chapter}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Audio File Info */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-gray-800">
          <Volume2 className="w-5 h-5" />
          <span className="font-medium">{book} {chapter}</span>
          <span className="text-sm text-gray-500">({audioFileInfo.fileName})</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Slider
          value={[currentTime]}
          onValueChange={handleSeek}
          max={duration || 100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={skipBackward}
            variant="outline"
            size="sm"
            className="p-2"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={restart}
            variant="outline"
            size="sm"
            className="p-2"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={togglePlayPause}
            size="sm"
            className="px-4"
            disabled={isLoading}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            onClick={skipForward}
            variant="outline"
            size="sm"
            className="p-2"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <Button
            onClick={toggleMute}
            variant="outline"
            size="sm"
            className="p-2"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          
          <div className="w-20">
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />
    </div>
  );
};
