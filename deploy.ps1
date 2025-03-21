# Agentic Workflow TypeScript Deployment Script for PowerShell
# This script builds and deploys the application to Cloudflare Workers

Write-Host "Starting deployment process..." -ForegroundColor Cyan

# Step 1: Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Step 2: Run tests (optional)
if ($args -contains "--test") {
    Write-Host "Running tests..." -ForegroundColor Yellow
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Some tests failed. Continue anyway? (y/n)" -ForegroundColor Yellow
        $continue = Read-Host
        if ($continue -ne "y") {
            Write-Host "Deployment aborted." -ForegroundColor Red
            exit 1
        }
    }
}

# Step 3: Build the application
Write-Host "Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Aborting deployment." -ForegroundColor Red
    exit 1
}

# Step 4: Deploy to Cloudflare Workers
Write-Host "Deploying to Cloudflare Workers..." -ForegroundColor Yellow
npx wrangler deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed." -ForegroundColor Red
    exit 1
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green 