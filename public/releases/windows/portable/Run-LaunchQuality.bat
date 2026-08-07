@echo off
chcp 65001 >nul
title Launch Quality
REM Old ERP (/app.html) is retired — open NAJJAR staff login only.
set "APP_URL=https://web-production-08d73.up.railway.app/najjar/login.html"

REM Prefer native launcher EXE when present
if exist "%~dp0LaunchQuality.exe" (
  start "" "%~dp0LaunchQuality.exe"
  exit /b 0
)

REM Open a NORMAL full browser window (not tiny --app mode)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --new-window --start-maximized "%APP_URL%"
  exit /b 0
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --new-window --start-maximized "%APP_URL%"
  exit /b 0
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --new-window --start-maximized "%APP_URL%"
  exit /b 0
)

start "" "%APP_URL%"
exit /b 0
