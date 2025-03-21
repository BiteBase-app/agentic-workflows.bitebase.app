#!/bin/bash

# Deployment script for Agentic Workflow TS
echo "Starting deployment process..."

# Step 1: Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist
echo "✓ Clean completed"

# Step 2: Run the build process
echo "Building the project..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Aborting deployment."
  exit 1
fi
echo "✓ Build completed successfully"

# Step 3: Run tests (skip if using --no-tests flag)
if [[ "$*" != *"--no-tests"* ]]; then
  echo "Running tests..."
  npm test
  if [ $? -ne 0 ]; then
    echo "⚠️ Some tests failed. Continue with deployment? (y/n)"
    read continue
    if [ "$continue" != "y" ]; then
      echo "Aborting deployment."
      exit 1
    fi
  else
    echo "✓ All tests passed"
  fi
else
  echo "Skipping tests (--no-tests flag detected)"
fi

# Step 4: Deploy with Wrangler
echo "Deploying with Wrangler..."
npm run deploy

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed."
  exit 1
fi

echo "✓ Deployment completed successfully!"
echo "Your application has been deployed." 