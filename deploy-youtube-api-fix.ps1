# YouTube API Continuous Operation Fix - PowerShell Deployment Script
# Run this script in PowerShell to deploy the YouTube API improvements

Write-Host "🚀 YouTube API Continuous Operation Fix - Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Supabase CLI is installed
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Success "Supabase CLI found"
} catch {
    Write-Error "Supabase CLI is not installed or not in PATH"
    Write-Host "Please install it from: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

# Step 1: Deploy the enhanced Edge Functions
Write-Status "Step 1: Deploying enhanced YouTube API Edge Functions..."

Write-Status "Deploying fetch-youtube-videos function..."
try {
    supabase functions deploy fetch-youtube-videos
    Write-Success "fetch-youtube-videos function deployed successfully"
} catch {
    Write-Error "Failed to deploy fetch-youtube-videos function"
    exit 1
}

Write-Status "Deploying fetch-daily-scripture-video function..."
try {
    supabase functions deploy fetch-daily-scripture-video
    Write-Success "fetch-daily-scripture-video function deployed successfully"
} catch {
    Write-Error "Failed to deploy fetch-daily-scripture-video function"
    exit 1
}

# Step 2: Apply database changes
Write-Status "Step 2: Applying database improvements..."
try {
    supabase db push
    Write-Success "Database changes applied successfully"
} catch {
    Write-Error "Failed to apply database changes"
    exit 1
}

# Step 3: Instructions for SQL script
Write-Host ""
Write-Status "Step 3: Database Monitoring Setup"
Write-Host "========================================" -ForegroundColor Cyan
Write-Warning "IMPORTANT: You need to run the SQL script manually in Supabase SQL Editor"
Write-Host ""
Write-Host "1. Go to your Supabase Dashboard" -ForegroundColor White
Write-Host "2. Navigate to SQL Editor" -ForegroundColor White
Write-Host "3. Copy and paste the contents of 'fix-youtube-api-complete.sql'" -ForegroundColor White
Write-Host "4. Click 'Run' to execute the script" -ForegroundColor White
Write-Host ""

# Step 4: Verify environment variables
Write-Status "Step 4: Checking environment variables..."
Write-Host ""

# Check if YOUTUBE_API_KEY is set
if (-not $env:YOUTUBE_API_KEY) {
    Write-Warning "YOUTUBE_API_KEY environment variable is not set"
    Write-Host "Please ensure it's configured in your Supabase project:" -ForegroundColor White
    Write-Host "1. Go to Supabase Dashboard > Settings > Edge Functions" -ForegroundColor White
    Write-Host "2. Add YOUTUBE_API_KEY with your YouTube Data API v3 key" -ForegroundColor White
    Write-Host ""
} else {
    Write-Success "YOUTUBE_API_KEY is configured"
}

# Step 5: Test the functions
Write-Status "Step 5: Testing YouTube API functions..."
Write-Host ""

# Get the project URL
try {
    $statusOutput = supabase status --output json
    $projectUrl = ($statusOutput | ConvertFrom-Json).api_url
    
    if ($projectUrl) {
        Write-Status "Testing fetch-youtube-videos function..."
        $testUrl = "$projectUrl/functions/v1/fetch-youtube-videos"
        
        try {
            $response = Invoke-RestMethod -Uri $testUrl -Method Get -ErrorAction Stop
            Write-Success "YouTube API function is working correctly"
            Write-Host "Response preview:" -ForegroundColor White
            $responseJson = $response | ConvertTo-Json -Depth 1
            Write-Host $responseJson.Substring(0, [Math]::Min(200, $responseJson.Length)) -ForegroundColor Gray
            Write-Host "..." -ForegroundColor Gray
        } catch {
            Write-Warning "YouTube API function test failed"
            Write-Host "This might be normal if the API key is not configured or quota is exceeded" -ForegroundColor Yellow
            Write-Host "The function should still return fallback videos" -ForegroundColor Yellow
        }
    } else {
        Write-Warning "Could not determine project URL. Please test manually:"
        Write-Host "1. Go to your app and try to load YouTube videos" -ForegroundColor White
        Write-Host "2. Check the browser console for any errors" -ForegroundColor White
        Write-Host "3. Monitor the YouTube API usage in the dashboard" -ForegroundColor White
    }
} catch {
    Write-Warning "Could not test functions automatically. Please test manually."
}

# Step 6: Final instructions
Write-Host ""
Write-Status "Step 6: Final Setup Instructions"
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Success "YouTube API improvements have been deployed!"
Write-Host ""
Write-Host "📊 What's been improved:" -ForegroundColor White
Write-Host "   ✅ Enhanced caching system (1-hour cache for videos)" -ForegroundColor Green
Write-Host "   ✅ Rate limiting (1-minute between API calls)" -ForegroundColor Green
Write-Host "   ✅ Multiple fallback levels (cached + hardcoded videos)" -ForegroundColor Green
Write-Host "   ✅ Database monitoring and logging" -ForegroundColor Green
Write-Host "   ✅ Better error handling and graceful degradation" -ForegroundColor Green
Write-Host "   ✅ YouTube API Monitor component for tracking usage" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor White
Write-Host "   1. Run the SQL script in Supabase SQL Editor (fix-youtube-api-complete.sql)" -ForegroundColor Yellow
Write-Host "   2. Add YouTubeApiMonitor component to your admin dashboard" -ForegroundColor Yellow
Write-Host "   3. Monitor API usage to ensure quota limits aren't exceeded" -ForegroundColor Yellow
Write-Host "   4. Test the app to ensure videos load properly" -ForegroundColor Yellow
Write-Host ""
Write-Host "📈 Expected behavior:" -ForegroundColor White
Write-Host "   • Videos will load from cache when available (faster loading)" -ForegroundColor Cyan
Write-Host "   • If API fails, fallback videos will be shown immediately" -ForegroundColor Cyan
Write-Host "   • No more videos disappearing after SQL operations or user registration" -ForegroundColor Cyan
Write-Host "   • Continuous operation even when YouTube API quota is exceeded" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚨 Monitoring:" -ForegroundColor White
Write-Host "   • Check the YouTube API Monitor dashboard for usage statistics" -ForegroundColor Cyan
Write-Host "   • Monitor quota consumption to avoid hitting daily limits" -ForegroundColor Cyan
Write-Host "   • Set up alerts if quota usage exceeds 80%" -ForegroundColor Cyan
Write-Host ""
Write-Success "Your YouTube videos should now work continuously without disappearing!"
Write-Host ""
Write-Host "For support or issues, check:" -ForegroundColor White
Write-Host "   • Supabase Edge Function logs" -ForegroundColor Gray
Write-Host "   • YouTube API Monitor dashboard" -ForegroundColor Gray
Write-Host "   • Browser console for any errors" -ForegroundColor Gray 