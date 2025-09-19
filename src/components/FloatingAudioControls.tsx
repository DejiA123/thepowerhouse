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
  X,
  MoreVertical
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

  // Show floating controls when audio is active for background audio support
  const { 
    hasAudio,
    isPlaying,
    isPaused,
    isLoading,
    currentBook,
    currentChapter,
    autoPlayNext 
  } = audioState;

  // Don't show if no audio is active OR if audio is currently playing
  if ((!hasAudio && !isPlaying && !isPaused && !isLoading) || isPlaying) {
    return null;
  }

  const toggleExpanded = () => setIsExpanded(!isExpanded);
  const toggleSettings = () => setShowSettings(!showSettings);

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 z-50 transition-all duration-300",
      isExpanded ? "bg-background/95 backdrop-blur-sm" : "bg-background/90 backdrop-blur-sm",
      className
    )}>
      <Card className="border-border/50 shadow-lg">
        <CardContent className="p-3">
          {/* Compact View */}
          {!isExpanded && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {currentBook} {currentChapter}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isLoading ? 'Loading...' : isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Ready'}
                    {autoPlayNext && ' • Auto-play enabled'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isLoading ? (
                  <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isPlaying ? pause : resume}
                    className="w-8 h-8 p-0"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExpanded}
                  className="w-8 h-8 p-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Expanded View */}
          {isExpanded && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{currentBook} {currentChapter}</p>
                    <p className="text-sm text-muted-foreground">Bible Audio</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSettings}
                    className="w-8 h-8 p-0"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stop}
                    className="w-8 h-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPreviousChapter}
                  className="w-10 h-10 p-0"
                >
                  <SkipBack className="w-5 h-5" />
                </Button>

                {isLoading ? (
                  <div className="w-12 h-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={isPlaying ? pause : resume}
                    className="w-12 h-12 p-0 rounded-full"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextChapter}
                  className="w-10 h-10 p-0"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <div className="border-t pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoplay" className="text-sm">Auto-play next chapter</Label>
                    <Switch
                      id="autoplay"
                      checked={autoPlayNext}
                      onCheckedChange={setAutoPlayNext}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FloatingAudioControls;
