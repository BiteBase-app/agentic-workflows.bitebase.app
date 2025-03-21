#!/bin/bash

# Agentic Workflow TypeScript Deployment Script
# This script builds and deploys the application to Cloudflare Workers

set -e

echo "Starting deployment process..."

# Step 1: Install dependencies
echo "Installing dependencies..."
npm install

# Step 2: Run tests (optional)
if [ "$1" = "--test" ]; then
  echo "Running tests..."
  npm test
fi

# Step 3: Build the application
echo "Building application..."
npm run build

# Step 4: Deploy to Cloudflare Workers
echo "Deploying to Cloudflare Workers..."
npx wrangler deploy

echo "Deployment completed successfully!" 