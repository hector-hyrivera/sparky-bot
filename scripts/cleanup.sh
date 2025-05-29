#!/bin/bash

# Cleanup script for the project
# Removes unused files and temporary artifacts

# Go to project root
cd "$(dirname "$0")/.."

echo "🧹 Cleaning up project folder..."

# Remove AWS specific files
rm -f serverless.yml 2>/dev/null
echo "✅ Removed AWS serverless config (if it existed)"

# Remove old handler file
rm -f handler.js 2>/dev/null
echo "✅ Removed old Lambda handler (if it existed)"

# Remove build artifacts
rm -rf dist/ 2>/dev/null
rm -rf .wrangler/ 2>/dev/null
echo "✅ Removed build artifacts (if they existed)"

# Fix permissions
chmod +x scripts/*.sh
echo "✅ Fixed script permissions"

echo "✨ Cleanup complete!"
echo "Run 'pnpm install' to ensure dependencies are up to date." 