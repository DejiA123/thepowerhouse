#!/bin/bash

# Clean build script for Lovable deployment

echo "🧹 Cleaning previous build artifacts..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .cache

echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit --no-fund

echo "🔨 Building application..."
npm run build

echo "✅ Build complete!"
ls -la dist/