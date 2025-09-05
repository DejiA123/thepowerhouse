import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Volume2, Settings, Download, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import React from "react";
import { normalizeBookApiName } from "./bookUtils";

interface BibleAudioPlayerProps {
  book: string;
  chapter: number;
  text: string;
}

const BibleAudioPlayer = ({ book, chapter, text }: BibleAudioPlayerProps) => {
  const {
    audioState,
    playBibleChapter,
    pause,
    resume,
    stop,
    setAutoPlayNext
  } = useGlobalAudio();

  const { preferences, setPitch, setRate } = useBiblePreferences();
  const { toast } = useToast();
  const [showAudioControls, setShowAudioControls] = useState(false);

  // Check if this is the currently playing chapter or transitioning to this chapter
  const normalizedCurrentBook = normalizeBookApiName(book);
  const isCurrentChapter = audioState.currentBook === normalizedCurrentBook && audioState.currentChapter === chapter;
  
  // Also check if audio is transitioning to this chapter (during auto-play)
  const isTransitioningToThisChapter = audioState.isLoading && 
    audioState.currentBook === normalizedCurrentBook && 
    audioState.currentChapter === chapter;
  
  const isPlaying = isCurrentChapter && audioState.isPlaying;
  const isPaused = isCurrentChapter && audioState.isPaused;
  const isLoading = isCurrentChapter && audioState.isLoading;
  
  // Show pause button when audio is playing OR loading/transitioning to this chapter
  // This ensures the button shows pause immediately during auto-play transitions
  const showPauseButton = isPlaying || isLoading || isTransitioningToThisChapter;

  // Play audio using global context
  const handlePlay = () => {
    // Allow play even if text is not yet available (MP3 path does not require text)
    
    try {
      // Inline iOS unlock to ensure first tap starts
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        try { (window as any).speechSynthesis?.resume?.(); } catch {}
        try {
          const a = new Audio();
          try { (a as any).playsInline = true; } catch {}
          a.muted = true;
          a.src = 'data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA';
          a.play().then(() => a.pause()).catch(() => {});
        } catch {}
      }
      
      // Use global audio context for better functionality (normalize book for resolvers)
      const normalizedBook = normalizeBookApiName(book);
      playBibleChapter(normalizedBook, chapter, text, preferences.autoPlayNext, preferences.loopChapter, {
        pitch: preferences.pitch,
        rate: preferences.rate
      });
    } catch (e) {
      // Swallow synchronous errors to avoid spinner loop on iOS
      console.warn('Play invocation failed (will rely on context handlers):', e);
    }
  };

  // Handle pause
  const handlePause = () => {
    pause();
  };

  // Handle resume - this will restart from beginning for better user experience
  const handleResume = () => {
    resume();
  };

  // Handle stop
  const handleStop = () => {
    stop();
  };

  const handleDownload = async () => {
    try {
      // Try to get MP3 download URL from Supabase
      const { audioBibleService } = await import('@/services/audioBibleService');
      const downloadUrl = await audioBibleService.getDownloadUrl(book, chapter);
      
      if (downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${book}_chapter_${chapter}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Download started",
          description: `${book} Chapter ${chapter} is downloading...`,
          variant: "default"
        });
      } else {
        toast({
          title: "Download not available",
          description: "MP3 file not found for this chapter.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Unable to download audio file.",
        variant: "destructive"
      });
    }
  };

  const isTextAvailable = !!text && text.trim().length > 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => {
                if (showPauseButton) {
                  // Allow pausing even while loading (spinner), matching header behavior
                  handlePause();
                } else {
                  try { stop(); } catch {}
                  handlePlay();
                }
              }}
              disabled={false}
              size="sm"
              className="min-w-[60px]"
              title={''}
            >
              {(isLoading || showPauseButton) ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={handleResume}
              disabled={!isPaused}
              size="sm"
              variant="outline"
            >
              Resume
            </Button>
            <Button
              onClick={handleStop}
              disabled={!isPlaying && !isPaused}
              size="sm"
              variant="outline"
            >
              Stop
            </Button>
            <Button
              onClick={handleDownload}
              disabled={!isTextAvailable}
              size="sm"
              variant="outline"
              title="Download audio for this chapter"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setShowAudioControls(!showAudioControls)}
              size="sm"
              variant="outline"
              title="Audio Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {book} {chapter}
                {isPaused && (
                  <span className="ml-2 text-xs text-orange-600 font-semibold">• Paused</span>
                )}
                {isPlaying && (
                  <span className="ml-2 text-xs text-green-600 font-semibold">• Playing</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Audio Controls */}
        {showAudioControls && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pitch Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Audio Pitch</span>
                  <span className="text-sm text-gray-500">{preferences.pitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max={/iPad|iPhone|iPod/.test(navigator.userAgent) ? 1.8 : 2.0}
                  step={/iPad|iPhone|iPod/.test(navigator.userAgent) ? 0.05 : 0.1}
                  value={preferences.pitch}
                  onChange={(e) => {
                    const newPitch = parseFloat(e.target.value);
                    console.log('🎵 BibleAudioPlayer: Setting pitch to:', newPitch);
                    setPitch(newPitch);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Lower</span>
                  <span>Higher</span>
                </div>
              </div>

              {/* Rate Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Audio Speed</span>
                  <span className="text-sm text-gray-500">{preferences.rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max={/iPad|iPhone|iPod/.test(navigator.userAgent) ? 1.5 : 2.0}
                  step="0.05"
                  value={preferences.rate}
                  onChange={(e) => {
                    const newRate = parseFloat(e.target.value);
                    console.log('🎵 BibleAudioPlayer: Setting rate to:', newRate);
                    setRate(newRate);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Slower</span>
                  <span>Faster</span>
                </div>
              </div>
            </div>

            {/* Test Audio Button */}
            <div className="text-center">
              <Button
                onClick={() => {
                  if ('speechSynthesis' in window) {
                    speechSynthesis.cancel();
                    const testUtterance = new SpeechSynthesisUtterance('Testing audio settings');
                    testUtterance.pitch = preferences.pitch;
                    testUtterance.rate = preferences.rate;
                    testUtterance.volume = 1.0;
                    speechSynthesis.speak(testUtterance);
                  }
                }}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <Volume2 className="w-3 h-3 mr-1" />
                Test Audio
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BibleAudioPlayer;