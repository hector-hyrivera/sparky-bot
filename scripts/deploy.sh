#!/bin/bash

# Go to project root
cd "$(dirname "$0")/.."

# Check if Wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Wrangler not found. Installing..."
    npm install -g wrangler
fi

# Install project dependencies
echo "Installing dependencies..."
npm install

# Check for .env file
if [ ! -f .env ]; then
    echo "No .env file found. Creating from template..."
    cp env.example .env
    echo "Please edit .env file with your credentials before deploying."
    exit 1
fi

# Deploy the worker
echo "Deploying Cloudflare Worker..."
npm run deploy

# Register commands
echo "Registering commands..."
npm run register

echo "Deployment completed!" 