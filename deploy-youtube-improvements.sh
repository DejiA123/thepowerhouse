#!/bin/bash

echo "🚀 Deploying YouTube API improvements..."

# Deploy the updated Edge Functions
echo "📦 Deploying updated Edge Functions..."
supabase functions deploy fetch-youtube-videos
supabase functions deploy fetch-daily-scripture-video

# Apply the database improvements
echo "🗄️ Applying database improvements..."
supabase db push

echo "✅ YouTube API improvements deployed successfully!"
echo ""
echo "📊 What was improved:"
echo "   • Added caching to prevent API quota exhaustion"
echo "   • Implemented rate limiting (1 minute between calls)"
echo "   • Added database logging for API usage monitoring"
echo "   • Created YouTube API Monitor component"
echo "   • Better error handling and fallback mechanisms"
echo ""
echo "🔧 Next steps:"
echo "   1. Run the fix_profiles_table.sql script in Supabase SQL Editor"
echo "   2. Add the YouTubeApiMonitor component to your admin dashboard"
echo "   3. Monitor the API usage to ensure quota limits aren't exceeded"
echo ""
echo "📈 The YouTube videos should now work continuously without disappearing!" 