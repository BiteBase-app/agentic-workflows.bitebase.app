# PowerShell Deployment script for Agentic Workflow TS
param(
    [switch]$NoTests
)

Write-Host "Starting deployment process..." -ForegroundColor Cyan

# Step 1: Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path -Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
}
Write-Host "✓ Clean completed" -ForegroundColor Green

# Step 2: Run the build process
Write-Host "Building the project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Aborting deployment." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build completed successfully" -ForegroundColor Green

# Step 3: Run tests (skip if using -NoTests flag)
if (-not $NoTests) {
    Write-Host "Running tests..." -ForegroundColor Yellow
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Some tests failed. Continue with deployment? (y/n)" -ForegroundColor Yellow
        $continue = Read-Host
        if ($continue -ne "y") {
            Write-Host "Aborting deployment." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✓ All tests passed" -ForegroundColor Green
    }
} else {
    Write-Host "Skipping tests (-NoTests flag detected)" -ForegroundColor Yellow
}

# Step 4: Deploy with Wrangler
Write-Host "Deploying with Wrangler..." -ForegroundColor Yellow
npm run deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Deployment completed successfully!" -ForegroundColor Green
Write-Host "Your application has been deployed." -ForegroundColor Cyan 