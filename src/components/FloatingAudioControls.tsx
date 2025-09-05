import React, { useState, useEffect } from 'react';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Settings,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingAudioControlsProps {
  className?: string;
}

export const FloatingAudioControls: React.FC<FloatingAudioControlsProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Safely get the global audio context with error handling
  const audioContext = useGlobalAudio();
  
  // Don't render if context is not available
  if (!audioContext) {
    return null;
  }
  
  // Auto-hide expanded view after 5 seconds of inactivity
  useEffect(() => {
    if (isExpanded && !audioContext.audioState.isLoading) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, audioContext.audioState.isLoading]);
  
  const { 
    audioState, 
    pause, 
    resume, 
    stop, 
    goToNextChapter, 
    goToPreviousChapter,
    setAutoPlayNext 
  } = audioContext;

  // Don't render if no audio is playing - this makes it completely invisible
  if (!audioState.isPlaying && !audioState.isPaused && !audioState.isLoading) {
    return null;
  }

  // Return null to make the component completely invisible
  // The audio functionality will still work through the GlobalAudioContext
  // and media session controls (lock screen, notification center, etc.)
  return null;

  // Note: The code below is kept for reference but never executed
  // This ensures the audio controls logic is preserved for future use
  /*
  const handlePlayPause = () => {
    if (audioState.isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleNextChapter = () => {
    goToNextChapter();
    setIsExpanded(false);
  };

  const handlePreviousChapter = () => {
    goToPreviousChapter();
    setIsExpanded(false);
  };

  const handleStop = () => {
    stop();
    setIsExpanded(false);
    setShowSettings(false);
  };

  const toggleAutoPlay = (enabled: boolean) => {
    setAutoPlayNext(enabled);
  };

  const formatBookName = (book: string) => {
    return book.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className={cn(
      "fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300",
      "lg:bottom-4 lg:left-4 lg:transform-none",
      className
    )}>
      <Card className={cn(
        "shadow-lg border-2 transition-all duration-300",
        audioState.isPlaying ? "border-primary" : "border-muted",
        isExpanded ? "w-80" : "w-64"
      )}>
        <CardContent className="p-3">
          <div className="text-center text-sm text-muted-foreground">
            Audio controls are now invisible but fully functional.
            <br />
            Use device controls (lock screen, notification center) to control audio.
          </div>
        </CardContent>
      </Card>
    </div>
  );
  */
};

export default FloatingAudioControls;
