@echo off
setlocal

cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not available in PATH.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository.
  pause
  exit /b 1
)

set "BRANCH=campaign"

git show-ref --verify --quiet refs/heads/%BRANCH%
if errorlevel 1 (
  echo Creating branch %BRANCH%...
  git checkout -b %BRANCH%
) else (
  echo Switching to branch %BRANCH%...
  git checkout %BRANCH%
)
if errorlevel 1 (
  echo [ERROR] Failed to switch branches.
  pause
  exit /b 1
)

echo Staging all changes...
git add -A

set /p COMMIT_MSG=Enter commit message (leave blank for default): 
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=Update campaign files"

git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
  echo.
  echo [INFO] Commit not created. This usually means there are no staged changes.
  pause
  exit /b 0
)

echo.
echo Commit created successfully on branch %BRANCH%.
echo Run: git push -u origin %BRANCH%  (first push only)
pause
