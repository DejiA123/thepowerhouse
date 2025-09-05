
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, Play, Pause, Youtube, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VideoModal from "./VideoModal";

interface DailyVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle?: string;
  duration: string;
}

interface VideoResponse {
  video: DailyVideo;
  totalShortVideos: number;
  error?: string;
  fallbackUrl?: string;
  isFallback?: boolean;
  success?: boolean;
}

const DailyScripture = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [dailyVideo, setDailyVideo] = useState<DailyVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Array of scriptures for different days
  const dailyScriptures = [
    {
      verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
      reference: "Jeremiah 29:11"
    },
    {
      verse: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
      reference: "Proverbs 3:5-6"
    },
    {
      verse: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
      reference: "Romans 8:28"
    },
    {
      verse: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
      reference: "Joshua 1:9"
    },
    {
      verse: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.",
      reference: "Matthew 6:34"
    },
    {
      verse: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.",
      reference: "Zephaniah 3:17"
    },
    {
      verse: "Cast all your anxiety on him because he cares for you.",
      reference: "1 Peter 5:7"
    }
  ];

  // Get today's scripture based on day of year
  const getTodaysScripture = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return dailyScriptures[dayOfYear % dailyScriptures.length];
  };

  const todaysScripture = getTodaysScripture();

  const fetchDailyVideo = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('DailyScripture: Starting to fetch daily video...');

      const { data, error: functionError } = await supabase.functions.invoke('fetch-daily-scripture-video');
      
      console.log('DailyScripture: Function response:', { data, functionError });
      
      if (functionError) {
        console.error('DailyScripture: Function error:', functionError);
        throw new Error(`Failed to fetch daily video: ${functionError.message}`);
      }

      if (!data) {
        console.error('DailyScripture: No data returned from function');
        throw new Error('No data returned from function');
      }

      const response = data as VideoResponse;
      console.log('DailyScripture: Parsed response:', response);
      
      if (response.success && response.video) {
        console.log('DailyScripture: Successfully got video:', response.video.title, 'Fallback:', response.isFallback);
        setDailyVideo(response.video);
        // If it's a fallback video, show a subtle indicator but don't treat it as an error
        if (response.isFallback) {
          console.log('DailyScripture: Using fallback video due to API issues');
        }
      } else if (response.error) {
        console.log('DailyScripture: API error:', response.error);
        setError(response.error);
      } else {
        console.log('DailyScripture: Unexpected response format');
        setError('Unable to load daily video from The Power House International');
      }
    } catch (err) {
      console.error('DailyScripture: Error fetching daily video:', err);
      setError('Unable to load daily video. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyVideo();
  }, []);

  const toggleVideo = () => {
    if (dailyVideo) {
      setIsModalOpen(true);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Book className="w-5 h-5" />
            <span>Today's Scripture</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVideo}
            className="text-white hover:bg-white/20"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg italic mb-2">"{todaysScripture.verse}"</p>
        <p className="text-blue-100">- {todaysScripture.reference}</p>
        
        <div className="mt-4 bg-white/10 rounded-lg p-3">
          <p className="text-sm mb-2">Daily Christian Inspiration</p>
          
          {loading && (
            <div className="aspect-video bg-black/20 rounded overflow-hidden mb-2 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}

          {!loading && dailyVideo && (
            <div 
              className="aspect-video bg-black/20 rounded overflow-hidden mb-2 cursor-pointer group relative"
              onClick={() => setIsModalOpen(true)}
            >
              <img 
                src={dailyVideo.thumbnail} 
                alt={dailyVideo.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="w-12 h-12 text-white" />
              </div>
            </div>
          )}

          {!loading && dailyVideo && (
            <div className="text-xs text-white/80">
              <p className="font-medium mb-1">{dailyVideo.title}</p>
              <p className="text-white/60">{dailyVideo.channelTitle}</p>
            </div>
          )}

          {error && !dailyVideo && (
            <div className="aspect-video bg-black/20 rounded overflow-hidden mb-2 flex flex-col items-center justify-center text-center p-4">
              <Youtube className="w-8 h-8 text-white/60 mb-2" />
              <p className="text-xs text-white/80 mb-2">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('https://www.youtube.com/@thepowerhouseintl', '_blank')}
                className="text-white hover:bg-white/20 text-xs"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Visit Channel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      
      <VideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoId={dailyVideo?.id || ""}
        title={dailyVideo?.title || "Daily Christian Inspiration"}
      />
    </Card>
  );
};

export default DailyScripture;
