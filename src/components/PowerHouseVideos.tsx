import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VideoModal from "./VideoModal";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle?: string;
}

interface VideoResponse {
  videos: Video[];
  channelId?: string;
  error?: string;
  fallbackUrl?: string;
  isFallback?: boolean; // Added for debugging
}

const PowerHouseVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string>('https://www.youtube.com/@thepowerhouseintl/shorts');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('PowerHouseVideos: Starting to fetch videos...');

      // Force fresh fetch by adding timestamp
      const { data, error: functionError } = await supabase.functions.invoke('fetch-youtube-videos', {
        body: { timestamp: Date.now() } // Force cache bust
      });
      
      console.log('PowerHouseVideos: Function response:', { data, functionError });
      console.log('PowerHouseVideos: Data type:', typeof data);
      console.log('PowerHouseVideos: Data keys:', data ? Object.keys(data) : 'No data');
      
      if (functionError) {
        console.error('PowerHouseVideos: Function error:', functionError);
        throw new Error(`Failed to fetch videos: ${functionError.message}`);
      }

      const response = data as VideoResponse;
      console.log('PowerHouseVideos: Parsed response:', response);
      console.log('PowerHouseVideos: Response videos:', response.videos);
      console.log('PowerHouseVideos: Response error:', response.error);
      console.log('PowerHouseVideos: Response isFallback:', response.isFallback);
      
      // Check if we have videos even if there's an error (fallback videos)
      if (response.videos && response.videos.length > 0) {
        console.log('PowerHouseVideos: Setting videos:', response.videos.length, 'videos');
        console.log('PowerHouseVideos: Video IDs:', response.videos.map(v => v.id));
        console.log('PowerHouseVideos: Video titles:', response.videos.map(v => v.title));
        setVideos(response.videos);
        // If there's an error but we have fallback videos, show a subtle warning
        if (response.error) {
          console.log('PowerHouseVideos: API error but showing fallback videos:', response.error);
          // Clean up the error message to avoid duplication
          const cleanError = response.error.replace('Using fallback videos - ', '').replace('Using fallback videos - ', '');
          setError(`Unable to load videos: ${cleanError}`);
        } else {
          // Clear any previous error if we have videos and no error
          setError(null);
        }
      } else if (response.error) {
        console.log('PowerHouseVideos: API error and no videos:', response.error);
        setError(response.error);
        if (response.fallbackUrl) {
          setFallbackUrl(response.fallbackUrl);
        }
      } else {
        console.log('PowerHouseVideos: No videos and no error');
        setVideos([]);
        setError(null);
      }
    } catch (err) {
      console.error('PowerHouseVideos: Error fetching videos:', err);
      setError('Unable to load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };

  const handleChannelClick = () => {
    window.open(fallbackUrl, '_blank');
  };

  return (
    <div className="bg-card rounded-lg p-6 border-2 border-primary/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold">The Power House International</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchVideos}
            disabled={loading}
            className="border-primary text-primary hover:bg-primary hover:text-white rounded-full w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleChannelClick}
            className="border-primary text-primary hover:bg-primary hover:text-black rounded-full w-full sm:w-auto"
          >
            <span>View Channel</span>
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
      
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading latest videos...</p>
        </div>
      )}

      {error && videos.length === 0 && (
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">Unable to Load Videos</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button 
            onClick={handleChannelClick}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-full"
          >
            Visit YouTube Channel
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">No Videos Found</h3>
          <p className="text-muted-foreground mb-4">
            We couldn't find any videos right now. Visit the channel directly to see the latest content.
          </p>
          <Button 
            onClick={handleChannelClick}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-full"
          >
            Visit YouTube Channel
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Show subtle warning when using fallback videos */}
      {error && videos.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <p className="text-sm text-yellow-800">
              Showing available content.
            </p>
          </div>
        </div>
      )}

      {/* Show videos when we have them (regardless of error for fallback case) */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <Card 
              key={video.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleVideoClick(video)}
            >
              <div className="relative">
                <img 
                  src={video.thumbnail.replace('mqdefault.jpg', 'maxresdefault.jpg').replace('hqdefault.jpg', 'maxresdefault.jpg')} 
                  alt={video.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                  onError={(e) => {
                    // Fallback to original thumbnail if HD version fails
                    const img = e.target as HTMLImageElement;
                    if (img.src.includes('maxresdefault.jpg')) {
                      img.src = video.thumbnail;
                    } else {
                      img.src = '/placeholder.svg';
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-t-lg">
                  <Play className="w-12 h-12 text-white" />
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-2 line-clamp-2 dark:text-white">
                  {video.title}
                </h3>
                <p className="text-xs text-foreground dark:text-white line-clamp-2">
                  {video.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(video.publishedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Show "View All Videos" button when we have videos */}
      {!loading && videos.length > 0 && (
        <div className="text-center mt-6">
          <Button 
            variant="outline" 
            onClick={handleChannelClick}
            className="border-primary text-primary hover:bg-primary hover:text-black rounded-full"
          >
            View All Videos
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      <VideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoId={selectedVideo?.id || ""}
        title={selectedVideo?.title || ""}
      />
    </div>
  );
};

export default PowerHouseVideos;