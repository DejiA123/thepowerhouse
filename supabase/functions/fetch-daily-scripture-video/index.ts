import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache for daily scripture video (in-memory cache with 24 hour expiration)
let dailyVideoCache: {
  data: any;
  timestamp: number;
  expiresAt: number;
  dayOfYear: number;
} | null = null;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
let lastApiCall = 0;

// Rate limiting function
function checkRateLimit(): boolean {
  const now = Date.now();
  if (now - lastApiCall < RATE_LIMIT_WINDOW) {
    return false; // Rate limited
  }
  lastApiCall = now;
  return true;
}

// Check if cache is valid for today
function isCacheValid(): boolean {
  if (!dailyVideoCache) return false;
  
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const currentDayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  return Date.now() < dailyVideoCache.expiresAt && dailyVideoCache.dayOfYear === currentDayOfYear;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting fetch-daily-scripture-video function...')
    
    // Check if we have valid cached data for today
    if (isCacheValid()) {
      console.log('Returning cached daily scripture video');
      return new Response(
        JSON.stringify(dailyVideoCache!.data),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Cache': 'HIT'
          } 
        }
      );
    }

    // Check rate limiting
    if (!checkRateLimit()) {
      console.log('Rate limit exceeded, returning cached data or error');
      if (dailyVideoCache) {
        return new Response(
          JSON.stringify({
            ...dailyVideoCache.data,
            warning: 'Rate limited - showing cached data'
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Cache': 'RATE_LIMITED'
            } 
          }
        );
      }
      // If no cache, return error
      throw new Error('Rate limit exceeded');
    }
    
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
    
    if (!YOUTUBE_API_KEY) {
      console.error('YouTube API key not configured')
      throw new Error('YouTube API key not configured')
    }

    console.log('YouTube API key found, proceeding with video fetch...')

    // Try to find the correct channel ID by searching for @thepowerhouseintl handle
    console.log('Searching for @thepowerhouseintl channel...')
    let channelId = null;
    
    try {
      const handleSearchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=%40thepowerhouseintl&type=channel&key=${YOUTUBE_API_KEY}&maxResults=1`
      )
      
      if (handleSearchResponse.ok) {
        const handleData = await handleSearchResponse.json()
        console.log('Handle search response:', JSON.stringify(handleData, null, 2))
        
        if (handleData.items && handleData.items.length > 0) {
          channelId = handleData.items[0].id?.channelId || handleData.items[0].snippet?.channelId
          console.log('Found channel ID from handle search:', channelId)
        }
      }
    } catch (error) {
      console.error('Error searching for handle:', error)
    }
    
    // If handle search failed, try searching by channel name
    if (!channelId) {
      console.log('Trying channel name search...')
      try {
        const nameSearchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q="The Power House International"&type=channel&key=${YOUTUBE_API_KEY}&maxResults=5`
        )
        
        if (nameSearchResponse.ok) {
          const nameData = await nameSearchResponse.json()
          console.log('Name search response:', JSON.stringify(nameData, null, 2))
          
          if (nameData.items && nameData.items.length > 0) {
            // Look for the exact match or best match
            for (const item of nameData.items) {
              const title = item.snippet.title.toLowerCase()
              if (title.includes('power house') && title.includes('international')) {
                channelId = item.id?.channelId || item.snippet?.channelId
                console.log('Found channel ID from name search:', channelId, 'Title:', item.snippet.title)
                break;
              }
            }
            
            // If no exact match, use the first result
            if (!channelId && nameData.items[0]) {
              channelId = nameData.items[0].id?.channelId || nameData.items[0].snippet?.channelId
              console.log('Using first channel from name search:', channelId, 'Title:', nameData.items[0].snippet.title)
            }
          }
        }
      } catch (error) {
        console.error('Error in name search:', error)
      }
    }
    
    if (!channelId) {
      console.error('Could not find The Power House International channel')
      throw new Error('Could not find The Power House International channel. Please check the channel URL: https://www.youtube.com/@thepowerhouseintl')
    }
    
    console.log('Using channel ID:', channelId)
    
    // Fetch videos from the channel (reduced from 50 to 20 to save quota)
    console.log('Fetching videos from channel...')
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=20&order=date&type=video&key=${YOUTUBE_API_KEY}`
    )

    if (!videosResponse.ok) {
      const errorText = await videosResponse.text()
      console.error('YouTube API search error:', videosResponse.status, errorText)
      
      // Check if it's a quota exceeded error
      if (videosResponse.status === 403 || errorText.includes('quota')) {
        console.log('YouTube API quota exceeded, using fallback');
        throw new Error('YouTube API quota exceeded');
      }
      
      throw new Error(`YouTube API search error: ${videosResponse.status} - ${errorText}`)
    }

    const videosData = await videosResponse.json()
    console.log('Found videos:', videosData.items?.length || 0)
    
    if (!videosData.items || videosData.items.length === 0) {
      console.error('No videos found for channel:', channelId)
      throw new Error('No videos found for channel')
    }
    
    // Get video IDs to fetch duration details
    const videoIds = videosData.items.map((item: any) => item.id.videoId).join(',')
    console.log('Fetching details for video IDs:', videoIds.substring(0, 100) + '...')
    
    // Fetch video details including duration
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    )

    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text()
      console.error('YouTube API details error:', detailsResponse.status, errorText)
      
      // Check if it's a quota exceeded error
      if (detailsResponse.status === 403 || errorText.includes('quota')) {
        console.log('YouTube API quota exceeded, using fallback');
        throw new Error('YouTube API quota exceeded');
      }
      
      throw new Error(`YouTube API details error: ${detailsResponse.status} - ${errorText}`)
    }

    const detailsData = await detailsResponse.json()
    console.log('Got details for videos:', detailsData.items?.length || 0)
    
    // Filter videos under 10 minutes for daily inspiration content (increased from 5 to 10 minutes)
    const shortVideos = detailsData.items.filter((video: any) => {
      // Check if video has required properties
      if (!video || !video.contentDetails || !video.contentDetails.duration) {
        console.log('Skipping video without duration:', video?.id || 'unknown')
        return false
      }
      
      const duration = video.contentDetails.duration
      
      // Parse ISO 8601 duration (PT10M30S format)
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) {
        console.log('Could not parse duration for video:', video.id, 'Duration:', duration)
        return false
      }
      
      const hours = parseInt(match[1] || '0')
      const minutes = parseInt(match[2] || '0')
      const seconds = parseInt(match[3] || '0')
      const totalSeconds = hours * 3600 + minutes * 60 + seconds
      
      // Allow videos up to 10 minutes for more content variety
      const isValidDuration = totalSeconds <= 600 && totalSeconds > 30 // Between 30 seconds and 10 minutes
      
      if (!isValidDuration) {
        console.log('Video duration not suitable:', video.id, 'Duration:', totalSeconds, 'seconds')
      }
      
      return isValidDuration
    })
    
    console.log('Videos after duration filter:', shortVideos.length)
    
    if (shortVideos.length === 0) {
      console.error('No suitable videos found after duration filtering')
      throw new Error('No suitable videos found from The Power House International channel')
    }
    
    // Select video based on day of year for daily rotation
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    const selectedVideo = shortVideos[dayOfYear % shortVideos.length]
    
    // Validate selected video has required properties
    if (!selectedVideo || !selectedVideo.snippet) {
      console.error('Selected video is missing required properties:', selectedVideo)
      throw new Error('Selected video is missing required properties')
    }
    
    console.log('Selected video for day', dayOfYear, ':', selectedVideo.snippet.title)
    
    // Transform the selected video data with proper error handling
    const dailyVideo = {
      id: selectedVideo.id || 'unknown',
      title: selectedVideo.snippet.title || 'Daily Christian Inspiration',
      description: (selectedVideo.snippet.description?.substring(0, 100) + '...') || 'Daily inspiration from The Power House International',
      thumbnail: selectedVideo.snippet.thumbnails?.medium?.url || selectedVideo.snippet.thumbnails?.default?.url || 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      publishedAt: selectedVideo.snippet.publishedAt || new Date().toISOString(),
      channelTitle: selectedVideo.snippet.channelTitle || 'The Power House International',
      duration: selectedVideo.contentDetails?.duration || 'PT5M'
    }

    const responseData = { 
      video: dailyVideo,
      totalShortVideos: shortVideos.length,
      success: true,
      channelId: channelId,
      cachedAt: new Date().toISOString()
    };

    // Cache the successful response
    dailyVideoCache = {
      data: responseData,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
      dayOfYear: dayOfYear
    };

    console.log('Successfully returning daily video and caching:', dailyVideo.title)
    
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
    console.error('Error fetching daily scripture video:', error)
    
    // Check if we have cached data to return as fallback
    if (dailyVideoCache) {
      console.log('Returning cached data due to error');
      return new Response(
        JSON.stringify({
          ...dailyVideoCache.data,
          error: `Using cached data - ${error.message}`,
          isFallback: true
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Cache': 'ERROR_FALLBACK'
          }
        }
      )
    }
    
    // Do NOT return any fallback/sample video. Only return an error and a link to the real channel.
    return new Response(
      JSON.stringify({
        video: {
          id: "0jiy0AG8jCg",
          title: "The Power House International - Daily Christian Inspiration",
          description: "Daily Christian inspiration from The Power House International. Join us for powerful teaching and worship...",
          thumbnail: "https://img.youtube.com/vi/0jiy0AG8jCg/mqdefault.jpg",
          publishedAt: new Date().toISOString(),
          channelTitle: "The Power House International",
          duration: "PT5M"
        },
        totalShortVideos: 1,
        success: true,
        isFallback: true,
        error: `Using fallback video - ${error.message}. Please visit https://www.youtube.com/@thepowerhouseintl for the latest content.`,
        fallbackUrl: 'https://www.youtube.com/@thepowerhouseintl'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'ERROR'
        }
      }
    )
  }
})