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

  // Hide the floating controls completely
  // The audio functionality will still work through the GlobalAudioContext
  // and media session controls (lock screen, notification center, etc.)
  return null;
};

export default FloatingAudioControls;
