import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Music, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { SupabaseAudioPlayer } from "./SupabaseAudioPlayer";
import { supabaseAudioService } from "@/services/supabaseAudioService";

interface BibleAudioPlayerProps {
  book: string;
  chapter: number;
  selectedVersion?: string;
}

const BibleAudioPlayer = ({ book, chapter, selectedVersion }: BibleAudioPlayerProps) => {
  const { toast } = useToast();
  const [mp3Available, setMp3Available] = useState(false);
  const [checkingMp3, setCheckingMp3] = useState(false);

  // Check for MP3 availability when book, chapter, or version changes
  useEffect(() => {
    const checkMp3Availability = async () => {
      if (!selectedVersion) return;
      
      setCheckingMp3(true);
      try {
        // Force a small delay for PWA to ensure network is ready
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        if (isPWA) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        const available = await supabaseAudioService.checkAudioExists(book, chapter, selectedVersion);
        setMp3Available(available);
        console.log(`MP3 audio check for ${book} ${chapter} (${selectedVersion}):`, available);
      } catch (error) {
        console.error('Error checking MP3 availability:', error);
        setMp3Available(false);
      } finally {
        setCheckingMp3(false);
      }
    };

    checkMp3Availability();
  }, [book, chapter, selectedVersion]);

  // Show loading state while checking for MP3 availability
  if (checkingMp3) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Music className="w-5 h-5 animate-pulse" />
            <span className="font-medium">Checking Audio...</span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Checking for MP3 audio for {book} {chapter}...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show error if no MP3 is available
  if (!mp3Available) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <VolumeX className="w-5 h-5" />
            <span className="font-medium">Audio Not Available</span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            No MP3 audio file found for {book} {chapter} ({selectedVersion})
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Make sure you have uploaded the MP3 file to your audio-bible bucket with the correct naming format.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show MP3 audio player
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-primary" />
          <span className="font-medium">MP3 Audio</span>
        </div>
        <SupabaseAudioPlayer
          book={book}
          chapter={chapter}
          version={selectedVersion!}
          onChapterComplete={() => {
            console.log(`MP3 audio completed for ${book} ${chapter}`);
          }}
          onError={(error) => {
            toast({
              title: "Audio Error",
              description: error,
              variant: "destructive"
            });
          }}
        />
      </CardContent>
    </Card>
  );
};

export default BibleAudioPlayer;