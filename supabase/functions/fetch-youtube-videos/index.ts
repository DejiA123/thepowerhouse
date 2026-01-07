
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced cache with multiple fallback levels
let videoCache: {
  data: any;
  timestamp: number;
  expiresAt: number;
  isFallback: boolean;
} | null = null;

let fallbackCache: {
  data: any;
  timestamp: number;
  expiresAt: number;
} | null = null;

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const FALLBACK_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for fallback
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
let lastApiCall = 0;

// Rate limiting function with exponential backoff
function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - lastApiCall < RATE_LIMIT_WINDOW) {
    return false; // Rate limited
  }
  lastApiCall = now;
  return true;
}

// Check if cache is valid
function isCacheValid(cache: any, duration: number): boolean {
  return cache !== null && Date.now() < cache.expiresAt;
}

// Enhanced logging function
async function logApiUsage(functionName: string, apiCalls: number, quotaUnits: number, success: boolean, errorMessage?: string, cachedResponse: boolean = false) {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    await supabaseClient.rpc('log_youtube_api_usage', {
      _function_name: functionName,
      _api_calls_made: apiCalls,
      _quota_units_used: quotaUnits,
      _success: success,
      _error_message: errorMessage,
      _cached_response: cachedResponse
    })
  } catch (logError) {
    console.error('Failed to log API usage:', logError)
  }
}

// Fallback videos that are always available
const getFallbackVideos = () => [
  {
    id: "b3BstGR_mvQ",
    title: "The Power House International - Sunday Service",
    description: "Join us for an inspiring Sunday service filled with worship and powerful teaching from God's Word at The Power House International...",
    thumbnail: "https://img.youtube.com/vi/b3BstGR_mvQ/mqdefault.jpg",
    publishedAt: new Date().toISOString(),
    channelTitle: "The Power House International"
  },
  {
    id: "dQjzVjtd7V8",
    title: "The Power House International - Bible Study",
    description: "Deep dive into Scripture with interactive Bible study and discussion at The Power House International...",
    thumbnail: "https://img.youtube.com/vi/dQjzVjtd7V8/mqdefault.jpg",
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    channelTitle: "The Power House International"
  },
  {
    id: "PtgkWFryLN8",
    title: "The Power House International - Shorts",
    description: "Quick inspiration and powerful moments from The Power House International...",
    thumbnail: "https://img.youtube.com/vi/PtgkWFryLN8/mqdefault.jpg",
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    channelTitle: "The Power House International"
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if we have valid cached data
    if (isCacheValid(videoCache, CACHE_DURATION)) {
      console.log('Returning cached YouTube videos');
      await logApiUsage('fetch-youtube-videos', 0, 0, true, undefined, true);
      
      return new Response(
        JSON.stringify(videoCache!.data),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'HIT'
          } 
        }
      );
    }

    // Check if we have valid fallback cache
    if (isCacheValid(fallbackCache, FALLBACK_CACHE_DURATION)) {
      console.log('Returning fallback cached data');
      await logApiUsage('fetch-youtube-videos', 0, 0, true, 'Using fallback cache', true);
      
      return new Response(
        JSON.stringify(fallbackCache!.data),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'FALLBACK_HIT'
          } 
        }
      );
    }

    // Check rate limiting
    if (!checkRateLimit()) {
      console.log('Rate limit exceeded, returning fallback data');
      
      // Return fallback videos immediately
      const fallbackData = { 
        videos: getFallbackVideos(),
        error: 'Rate limited - showing fallback videos',
        fallbackUrl: 'https://www.youtube.com/@thepowerhouseintl/shorts',
        isFallback: true,
        cachedAt: new Date().toISOString()
      };
      
      await logApiUsage('fetch-youtube-videos', 0, 0, true, 'Rate limited', false);
      
      return new Response(
        JSON.stringify(fallbackData),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'RATE_LIMITED'
          } 
        }
      );
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
    
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured')
    }

    // First try to get channel ID from the handle
    let channelId = ''
    try {
      // Get channel info from handle
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=@thepowerhouseintl&type=channel&key=${YOUTUBE_API_KEY}`
      )
      if (channelResponse.ok) {
        const channelData = await channelResponse.json()
        if (channelData.items && channelData.items.length > 0) {
          channelId = channelData.items[0].snippet.channelId
        }
      }
    } catch (error) {
      console.log('Could not resolve channel ID from handle:', error)
    }
    
    // If we couldn't get the channel ID, use the direct channel search
    if (!channelId) {
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q="The Power House International"&type=channel&key=${YOUTUBE_API_KEY}`
      )
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (searchData.items && searchData.items.length > 0) {
          channelId = searchData.items[0].snippet.channelId
        }
      }
    }
    
    if (!channelId) {
      throw new Error('Could not find The Power House International channel')
    }
    
    // Fetch latest shorts/videos from the channel
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=6&order=date&type=video&key=${YOUTUBE_API_KEY}`
    )

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', response.status, errorText);
      
      // Check if it's a quota exceeded error
      if (response.status === 403 || errorText.includes('quota')) {
        console.log('YouTube API quota exceeded, using fallback');
        await logApiUsage('fetch-youtube-videos', 2, 200, false, 'Quota exceeded', false);
        throw new Error('YouTube API quota exceeded');
      }
      
      await logApiUsage('fetch-youtube-videos', 2, 200, false, `API error: ${response.status}`, false);
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Transform the data to match our component's expected format
    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description.substring(0, 100) + '...',
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle
    }))

    const responseData = { 
      videos: videos,
      channelId: channelId,
      cachedAt: new Date().toISOString()
    };

    // Cache the successful response
    videoCache = {
      data: responseData,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
      isFallback: false
    };

    // Log successful API usage
    await logApiUsage('fetch-youtube-videos', 2, 200, true, undefined, false);

    console.log('YouTube videos fetched successfully and cached');

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'MISS'
        } 
      }
    )

  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log error to database
    await logApiUsage('fetch-youtube-videos', 0, 0, false, errorMessage, false);
    
    // Return fallback videos when API fails
    const fallbackVideos = getFallbackVideos();
    
    const fallbackData = { 
      videos: fallbackVideos,
      error: 'Using fallback videos - YouTube API unavailable',
      fallbackUrl: 'https://www.youtube.com/@thepowerhouseintl/shorts',
      isFallback: true,
      cachedAt: new Date().toISOString()
    };

    // Cache fallback data for a shorter period
    fallbackCache = {
      data: fallbackData,
      timestamp: Date.now(),
      expiresAt: Date.now() + FALLBACK_CACHE_DURATION
    };
    
    return new Response(
      JSON.stringify(fallbackData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'FALLBACK'
        } 
      }
    )
  }
})
