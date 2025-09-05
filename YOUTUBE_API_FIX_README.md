# YouTube API Quota Exhaustion Fix

## Problem Description

The YouTube videos in your app were disappearing after running SQL queries or when new users registered. This was caused by **YouTube API quota exhaustion** - the YouTube API has a daily limit of 10,000 quota units, and each API call consumes quota units.

### Root Causes:
1. **No Caching**: Every request to fetch YouTube videos made fresh API calls
2. **No Rate Limiting**: Multiple rapid requests could exhaust quota quickly
3. **Database Triggers**: User registration triggers might have caused additional API calls
4. **No Monitoring**: No way to track API usage or detect quota issues

## Solution Implemented

### 1. **Caching System**
- **In-memory cache** with 1-hour expiration for video lists
- **24-hour cache** for daily scripture videos
- **Cache hit tracking** to monitor efficiency

### 2. **Rate Limiting**
- **1-minute window** between API calls
- **Automatic fallback** to cached data when rate limited
- **Graceful degradation** when quota is exceeded

### 3. **Database Monitoring**
- **YouTube API usage tracking table** (`youtube_api_usage`)
- **Usage logging functions** for all API calls
- **Quota monitoring** with alerts for high usage

### 4. **Improved Error Handling**
- **Quota exceeded detection** (HTTP 403 errors)
- **Fallback to cached data** when API fails
- **Better error messages** for debugging

### 5. **Monitoring Dashboard**
- **YouTubeApiMonitor component** for real-time monitoring
- **Usage statistics** and trends
- **Quota consumption alerts**

## Files Modified/Created

### Edge Functions
- `supabase/functions/fetch-youtube-videos/index.ts` - Added caching, rate limiting, and logging
- `supabase/functions/fetch-daily-scripture-video/index.ts` - Added caching and monitoring

### Database
- `fix_profiles_table.sql` - Added YouTube API monitoring tables and functions

### Components
- `src/components/YouTubeApiMonitor.tsx` - New monitoring dashboard component

### Scripts
- `deploy-youtube-improvements.sh` - Deployment script

## How to Deploy

### Option 1: Using the Deployment Script
```bash
chmod +x deploy-youtube-improvements.sh
./deploy-youtube-improvements.sh
```

### Option 2: Manual Deployment
```bash
# Deploy Edge Functions
supabase functions deploy fetch-youtube-videos
supabase functions deploy fetch-daily-scripture-video

# Apply database changes
supabase db push

# Run the SQL script in Supabase SQL Editor
# Copy and paste the contents of fix_profiles_table.sql
```

## How It Works

### Caching Flow
1. **First Request**: Makes API call, caches response for 1 hour
2. **Subsequent Requests**: Returns cached data, no API call needed
3. **Cache Expired**: Makes new API call, updates cache
4. **API Failure**: Returns cached data if available, otherwise fallback

### Rate Limiting
1. **Request Received**: Checks if enough time has passed since last API call
2. **Rate Limited**: Returns cached data with warning
3. **Normal Flow**: Proceeds with API call if allowed

### Monitoring
1. **Every API Call**: Logged to database with success/failure status
2. **Cache Hits**: Tracked separately to measure efficiency
3. **Quota Usage**: Monitored to prevent exhaustion

## Benefits

### ✅ **Continuous Operation**
- Videos will no longer disappear after SQL operations
- App remains functional even when API quota is exhausted

### ✅ **Cost Optimization**
- Reduced API calls through caching
- Better quota management and monitoring

### ✅ **Better User Experience**
- Faster video loading (cached responses)
- Consistent availability of content
- Graceful fallbacks when issues occur

### ✅ **Developer Insights**
- Real-time monitoring of API usage
- Early warning system for quota issues
- Detailed analytics and trends

## Monitoring Dashboard

Add the `YouTubeApiMonitor` component to your admin dashboard:

```tsx
import YouTubeApiMonitor from '@/components/YouTubeApiMonitor';

// In your admin page
<YouTubeApiMonitor />
```

The dashboard shows:
- **Total quota used** (with percentage of daily limit)
- **API call statistics** (success rate, cache hit rate)
- **Function-specific usage** (detailed breakdown)
- **Alerts** for high usage or issues

## Troubleshooting

### Videos Still Not Showing
1. Check the YouTube API Monitor for quota usage
2. Verify the YouTube API key is configured correctly
3. Check Supabase Edge Function logs for errors

### High Quota Usage
1. Monitor the cache hit rate - should be >80%
2. Check for excessive API calls in the monitoring dashboard
3. Consider increasing cache duration if appropriate

### Cache Issues
1. Clear cache by restarting Edge Functions
2. Check cache hit rate in monitoring dashboard
3. Verify cache expiration settings

## Future Improvements

1. **Persistent Cache**: Use Redis or database for longer-term caching
2. **Smart Caching**: Cache based on video popularity
3. **Quota Alerts**: Email notifications when quota is high
4. **Auto-scaling**: Adjust cache duration based on usage patterns

## Support

If you continue to experience issues:
1. Check the YouTube API Monitor dashboard
2. Review Supabase Edge Function logs
3. Verify YouTube API key configuration
4. Monitor quota usage in Google Cloud Console 