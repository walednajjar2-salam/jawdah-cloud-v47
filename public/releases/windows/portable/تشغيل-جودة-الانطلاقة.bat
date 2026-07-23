@echo off
chcp 65001 >nul
title Launch Quality
set "APP_URL=https://web-production-08d73.up.railway.app/app.html"

where msedge >nul 2>nul
if %ERRORLEVEL%==0 (
  start "" msedge --app="%APP_URL%"
  exit /b 0
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%"
  exit /b 0
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%"
  exit /b 0
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%APP_URL%"
  exit /b 0
)

start "" "%APP_URL%"
exit /b 0
