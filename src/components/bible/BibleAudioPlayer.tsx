import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Music, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { SupabaseAudioPlayer } from "./SupabaseAudioPlayer";
import { BibleBrainAudioPlayer } from "./BibleBrainAudioPlayer";
import { supabaseAudioService } from "@/services/supabaseAudioService";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";

interface BibleAudioPlayerProps {
  book: string;
  chapter: number;
  selectedVersion?: string;
}

const BibleAudioPlayer = ({ book, chapter, selectedVersion }: BibleAudioPlayerProps) => {
  const { toast } = useToast();
  const [mp3Available, setMp3Available] = useState(false);
  const [bibleBrainAvailable, setBibleBrainAvailable] = useState(false);
  const [checkingAudio, setCheckingAudio] = useState(false);

  // Check for audio availability from both sources when book, chapter, or version changes
  useEffect(() => {
    const checkAudioAvailability = async () => {
      if (!selectedVersion) return;
      
      setCheckingAudio(true);
      try {
        // Check Supabase MP3 storage first (higher quality)
        const mp3Exists = await supabaseAudioService.checkAudioExists(book, chapter, selectedVersion);
        setMp3Available(mp3Exists);
        console.log(`MP3 audio available for ${book} ${chapter}:`, mp3Exists);
        
        // If no MP3, check Bible Brain API (fallback for all translations)
        if (!mp3Exists) {
          const bibleBrainUrl = await enhancedApiBibleService.getAudio(selectedVersion, book, chapter);
          const hasBibleBrain = !!bibleBrainUrl;
          setBibleBrainAvailable(hasBibleBrain);
          console.log(`Bible Brain audio available for ${book} ${chapter}:`, hasBibleBrain);
        } else {
          setBibleBrainAvailable(false);
        }
      } catch (error) {
        console.error('Error checking audio availability:', error);
        setMp3Available(false);
        setBibleBrainAvailable(false);
      } finally {
        setCheckingAudio(false);
      }
    };

    checkAudioAvailability();
  }, [book, chapter, selectedVersion]);

  // Show loading state while checking for audio availability
  if (checkingAudio) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Music className="w-5 h-5 animate-pulse" />
            <span className="font-medium">Checking Audio...</span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Checking for audio for {book} {chapter}...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show error if no audio is available from any source
  if (!mp3Available && !bibleBrainAvailable) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <VolumeX className="w-5 h-5" />
            <span className="font-medium">Audio Not Available</span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            No audio available for {book} {chapter} ({selectedVersion})
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show MP3 audio player (preferred - higher quality)
  if (mp3Available) {
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
  }

  // Show Bible Brain audio player (fallback - works for all translations)
  return (
    <BibleBrainAudioPlayer
      version={selectedVersion!}
      book={book}
      chapter={chapter}
    />
  );
};

export default BibleAudioPlayer;