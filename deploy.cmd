@echo off
REM Deployment script for Agentic Workflow TS
echo Starting deployment process...

REM Step 1: Clean previous builds
echo Cleaning previous builds...
if exist dist (
  rmdir /s /q dist
)
echo ✓ Clean completed

REM Step 2: Run the build process
echo Building the project...
call npm run build
if %ERRORLEVEL% neq 0 (
  echo ❌ Build failed. Aborting deployment.
  exit /b 1
)
echo ✓ Build completed successfully

REM Step 3: Run tests (skip if using --no-tests flag)
echo %* | findstr /C:"--no-tests" >nul
if %ERRORLEVEL% neq 0 (
  echo Running tests...
  call npm test
  if %ERRORLEVEL% neq 0 (
    echo ⚠️ Some tests failed. Continue with deployment? (y/n)
    set /p continue=
    if /I not "%continue%"=="y" (
      echo Aborting deployment.
      exit /b 1
    )
  ) else (
    echo ✓ All tests passed
  )
) else (
  echo Skipping tests (--no-tests flag detected)
)

REM Step 4: Deploy with Wrangler
echo Deploying with Wrangler...
call npm run deploy

if %ERRORLEVEL% neq 0 (
  echo ❌ Deployment failed.
  exit /b 1
)

echo ✓ Deployment completed successfully!
echo Your application has been deployed. 