#!/bin/bash

# Deploy Supabase Edge Function for Bible Brain API
echo "🚀 Deploying Bible Brain API Edge Function..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   Visit: https://supabase.com/docs/guides/functions/getting-started"
    echo "   Or use the Supabase Dashboard method (Method 1)"
    exit 1
fi

# Login to Supabase (if not already logged in)
echo "🔐 Logging into Supabase..."
supabase login

# Link to your project
echo "🔗 Linking to project..."
supabase link --project-ref swjzhzmhqyvwfwevijja

# Deploy the function
echo "📦 Deploying bible-brain-api function..."
supabase functions deploy bible-brain-api

echo "✅ Deployment complete!"
echo "🌐 Your Edge Function is now available at:"
echo "   https://swjzhzmhqyvwfwevijja.supabase.co/functions/v1/bible-brain-api"