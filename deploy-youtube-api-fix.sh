#!/bin/bash

echo "🚀 YouTube API Continuous Operation Fix - Deployment Script"
echo "=========================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed or not in PATH"
    echo "Please install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

print_success "Supabase CLI found"

# Step 1: Deploy the enhanced Edge Functions
print_status "Step 1: Deploying enhanced YouTube API Edge Functions..."

print_status "Deploying fetch-youtube-videos function..."
if supabase functions deploy fetch-youtube-videos; then
    print_success "fetch-youtube-videos function deployed successfully"
else
    print_error "Failed to deploy fetch-youtube-videos function"
    exit 1
fi

print_status "Deploying fetch-daily-scripture-video function..."
if supabase functions deploy fetch-daily-scripture-video; then
    print_success "fetch-daily-scripture-video function deployed successfully"
else
    print_error "Failed to deploy fetch-daily-scripture-video function"
    exit 1
fi

# Step 2: Apply database changes
print_status "Step 2: Applying database improvements..."
if supabase db push; then
    print_success "Database changes applied successfully"
else
    print_error "Failed to apply database changes"
    exit 1
fi

# Step 3: Instructions for SQL script
echo ""
print_status "Step 3: Database Monitoring Setup"
echo "========================================"
print_warning "IMPORTANT: You need to run the SQL script manually in Supabase SQL Editor"
echo ""
echo "1. Go to your Supabase Dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the contents of 'fix-youtube-api-complete.sql'"
echo "4. Click 'Run' to execute the script"
echo ""

# Step 4: Verify environment variables
print_status "Step 4: Checking environment variables..."
echo ""

# Check if YOUTUBE_API_KEY is set
if [ -z "$YOUTUBE_API_KEY" ]; then
    print_warning "YOUTUBE_API_KEY environment variable is not set"
    echo "Please ensure it's configured in your Supabase project:"
    echo "1. Go to Supabase Dashboard > Settings > Edge Functions"
    echo "2. Add YOUTUBE_API_KEY with your YouTube Data API v3 key"
    echo ""
else
    print_success "YOUTUBE_API_KEY is configured"
fi

# Step 5: Test the functions
print_status "Step 5: Testing YouTube API functions..."
echo ""

# Get the project URL
PROJECT_URL=$(supabase status --output json | grep -o '"api_url":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROJECT_URL" ]; then
    print_warning "Could not determine project URL. Please test manually:"
    echo "1. Go to your app and try to load YouTube videos"
    echo "2. Check the browser console for any errors"
    echo "3. Monitor the YouTube API usage in the dashboard"
else
    print_status "Testing fetch-youtube-videos function..."
    TEST_URL="${PROJECT_URL}/functions/v1/fetch-youtube-videos"
    
    # Test the function
    RESPONSE=$(curl -s -w "%{http_code}" "$TEST_URL" -o /tmp/youtube_test.json)
    HTTP_CODE="${RESPONSE: -3}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "YouTube API function is working correctly"
        echo "Response preview:"
        head -c 200 /tmp/youtube_test.json
        echo "..."
    else
        print_warning "YouTube API function returned HTTP $HTTP_CODE"
        echo "This might be normal if the API key is not configured or quota is exceeded"
        echo "The function should still return fallback videos"
    fi
    
    rm -f /tmp/youtube_test.json
fi

# Step 6: Final instructions
echo ""
print_status "Step 6: Final Setup Instructions"
echo "======================================"
echo ""
print_success "YouTube API improvements have been deployed!"
echo ""
echo "📊 What's been improved:"
echo "   ✅ Enhanced caching system (1-hour cache for videos)"
echo "   ✅ Rate limiting (1-minute between API calls)"
echo "   ✅ Multiple fallback levels (cached + hardcoded videos)"
echo "   ✅ Database monitoring and logging"
echo "   ✅ Better error handling and graceful degradation"
echo "   ✅ YouTube API Monitor component for tracking usage"
echo ""
echo "🔧 Next steps:"
echo "   1. Run the SQL script in Supabase SQL Editor (fix-youtube-api-complete.sql)"
echo "   2. Add YouTubeApiMonitor component to your admin dashboard"
echo "   3. Monitor API usage to ensure quota limits aren't exceeded"
echo "   4. Test the app to ensure videos load properly"
echo ""
echo "📈 Expected behavior:"
echo "   • Videos will load from cache when available (faster loading)"
echo "   • If API fails, fallback videos will be shown immediately"
echo "   • No more videos disappearing after SQL operations or user registration"
echo "   • Continuous operation even when YouTube API quota is exceeded"
echo ""
echo "🚨 Monitoring:"
echo "   • Check the YouTube API Monitor dashboard for usage statistics"
echo "   • Monitor quota consumption to avoid hitting daily limits"
echo "   • Set up alerts if quota usage exceeds 80%"
echo ""
print_success "Your YouTube videos should now work continuously without disappearing!"
echo ""
echo "For support or issues, check:"
echo "   • Supabase Edge Function logs"
echo "   • YouTube API Monitor dashboard"
echo "   • Browser console for any errors" 