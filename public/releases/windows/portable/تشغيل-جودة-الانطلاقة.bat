@echo off
chcp 65001 >nul
title جودة الانطلاقة
cd /d "%~dp0"
if exist "%~dp0LaunchQuality.exe" (
  start "" "%~dp0LaunchQuality.exe"
  exit /b 0
)
call "%~dp0Run-LaunchQuality.bat"
