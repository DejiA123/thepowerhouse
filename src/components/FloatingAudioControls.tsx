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
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const audioContext = useGlobalAudio();

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (audioContext?.audioState.hasAudio) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setIsExpanded(false); // Collapse when not visible
    }
  }, [audioContext?.audioState.hasAudio]);

  if (!audioContext || !isVisible) {
    return null;
  }

  const { 
    audioState, 
    pause, 
    resume, 
    stop, 
    goToNextChapter, 
    goToPreviousChapter,
    setAutoPlayNext 
  } = audioContext;

  const { 
    isPlaying,
    isLoading,
    currentBook,
    currentChapter,
    autoPlayNext
  } = audioState;

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
          {!isExpanded ? (
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
                    {isLoading ? 'Loading...' : isPlaying ? 'Playing' : 'Paused'}
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
          ) : (
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
