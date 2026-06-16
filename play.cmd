@echo off
setlocal enabledelayedexpansion
title Regicide launcher
cd /d "%~dp0"

echo ============================================
echo   REGICIDE - launch
echo ============================================

echo [1/4] Freeing ports 3001 / 5173...
for %%P in (3001 5173) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":%%P .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
  )
)

echo [2/4] Branch check (pulls are DELIBERATE - this launcher never pulls on its own)...
for /f %%b in ('git branch --show-current') do set BRANCH=%%b
echo     on branch: !BRANCH!
if /i "!BRANCH!"=="master" (
  echo.
  echo   ^^!^^! You are on MASTER - read-only by convention, never commit/pull here.
  echo   ^^!^^! Switch to the working branch:  git checkout Design_V2
  echo.
)
if /i "%~1"=="update" (
  if /i "!BRANCH!"=="Design_V2" (
    echo     update requested - pulling latest Design_V2...
    git pull --ff-only origin Design_V2
    if errorlevel 1 (
      echo   ^^! Pull failed ^(offline, no remote branch yet, or local conflicts^).
      echo   ^^! Launching the version already on this machine.
    )
  ) else (
    echo   ^^! Refusing to pull: updates only happen on Design_V2 ^(you are on !BRANCH!^).
  )
) else (
  echo     ^(to update first: run  "play.cmd update"  while on Design_V2^)
)

echo [3/4] Checking dependencies...
call npm run install:all
if errorlevel 1 (
  echo   ^^! Dependency install reported a problem - trying to launch anyway.
)

echo [4/4] Starting the game server (separate window)...
start "Regicide dev server" cmd /c "npm run dev"

echo     Waiting for the client to come up at http://localhost:5173 ...
set tries=0
:wait
set /a tries+=1
if !tries! gtr 90 (
  echo   ^^! The client did not come up after 90s.
  echo   ^^! Check the "Regicide dev server" window for errors.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
netstat -ano | findstr /r /c:":5173 .*LISTENING" >nul 2>&1
if errorlevel 1 goto wait

start "" http://localhost:5173
echo.
echo   Game is up - browser opened.
echo   Leave the "Regicide dev server" window open while playing;
echo   close it (or run this launcher again) to stop/restart.
timeout /t 5 >nul
endlocal
