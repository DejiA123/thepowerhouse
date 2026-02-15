#!/bin/bash

# Setup script for Lyrics R2 Image Upload
# Run this script to set secrets and deploy the Edge Function

echo "🚀 Starting setup for Lyrics R2 Image Upload..."

# Prompt for secrets (or user can edit them here)
# R2_ENDPOINT: The S3 endpoint for your Cloudflare R2 bucket
# R2_ACCESS_KEY_ID: Your R2 Access Key ID
# R2_SECRET_ACCESS_KEY: Your R2 Secret Access Key
# R2_BUCKET_NAME: Your R2 Bucket Name
# R2_PUBLIC_DOMAIN: The public URL of your R2 bucket (e.g. https://pub-xxx.r2.dev)

echo "🔐 Setting Supabase secrets..."
# Replace the values below or run the command manually if you prefer
npx supabase secrets set \
  R2_ENDPOINT="https://fd8da334e22fd77aac270568eec810bc.r2.cloudflarestorage.com" \
  R2_ACCESS_KEY_ID="ae64939fb6145a80460e8bb217bcee76" \
  R2_SECRET_ACCESS_KEY="0ccb58ced132df3b20d8523e1c990ef7f9efd810a538c179e910066d5c72029d" \
  R2_BUCKET_NAME="media" \
  R2_PUBLIC_DOMAIN="https://pub-e59dafe72724404d8ae7af425d1dfbdc.r2.dev"

echo "📦 Deploying get-r2-upload-url function..."
npx supabase functions deploy get-r2-upload-url --project-ref swjzhzmhqyvwfwevijja

echo "✅ Setup complete! You can now upload lyrics images in the Choir Portal."
