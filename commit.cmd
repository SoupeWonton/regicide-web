@echo off
setlocal enabledelayedexpansion
title Regicide commit
cd /d "%~dp0"

echo ============================================
echo   REGICIDE - commit to Design_V2
echo ============================================

rem -- git available? --
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not on PATH.
  pause
  exit /b 1
)

rem -- inside a repo? --
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository.
  pause
  exit /b 1
)

rem -- branch guard: all work happens on Design_V2; master is read-only --
for /f %%b in ('git branch --show-current') do set "BRANCH=%%b"
if /i "!BRANCH!"=="master" (
  echo [ERROR] You are on MASTER ^(read-only by convention^). Switch first:
  echo            git checkout Design_V2
  pause
  exit /b 1
)
if /i not "!BRANCH!"=="Design_V2" (
  echo [ERROR] You are on "!BRANCH!", not Design_V2.
  echo         Switch first:  git checkout Design_V2   ^(commit or stash changes first^)
  pause
  exit /b 1
)

echo On branch Design_V2. Pending changes:
echo --------------------------------------------
git status --short
echo --------------------------------------------

echo Staging all changes ^(git add -A^)...
git add -A

rem -- nothing staged? bail cleanly --
git diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo [INFO] Nothing to commit - working tree clean.
  pause
  exit /b 0
)

echo.
set /p COMMIT_MSG=Commit message (blank = "WIP: Design_V2 update"):
if "!COMMIT_MSG!"=="" set "COMMIT_MSG=WIP: Design_V2 update"

rem -- hooks run here (master block, etc.); never bypass them --
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
  echo.
  echo [ERROR] Commit failed ^(a hook may have rejected it^). Nothing was pushed.
  pause
  exit /b 1
)

echo.
echo Commit created on Design_V2.
set /p DOPUSH=Push to origin/Design_V2 now? [y/N]:
if /i "!DOPUSH!"=="y" (
  echo Pushing...
  git push -u origin Design_V2
  if errorlevel 1 (
    echo   [WARN] Push failed ^(offline, no remote, or rejected^). Commit is saved locally.
  ) else (
    echo   Pushed.
  )
) else (
  echo Skipped push. To push later:  git push -u origin Design_V2
)

echo.
echo Done.
pause
endlocal
