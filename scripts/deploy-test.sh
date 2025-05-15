#!/bin/bash

# This script tests the deployment process in a way similar to CI/CD

# Go to project root
cd "$(dirname "$0")/.."

echo "🚀 Testing deployment process..."

# Clean up previous builds
rm -rf dist/
rm -rf .wrangler/

# Install dependencies (as CI would)
echo "📦 Installing dependencies..."
npm ci

# Build the worker
echo "🔨 Building worker..."
npm run build

# Check if build succeeded
if [ -f "dist/cloudflare-worker.js" ]; then
  echo "✅ Build successful! Output file exists."
  echo "📊 Output file size: $(du -h dist/cloudflare-worker.js | cut -f1)"
else
  echo "❌ Build failed! No output file was created."
  exit 1
fi

echo "✨ Deployment test completed successfully!"
echo "You can now run 'npm run deploy' to deploy to Cloudflare Workers." 