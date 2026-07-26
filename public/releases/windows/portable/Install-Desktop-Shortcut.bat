@echo off
chcp 65001 >nul
title تثبيت أيقونة سطح المكتب — جودة الانطلاقة
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Desktop-Shortcut.ps1"
if errorlevel 1 (
  echo تعذر التثبيت التلقائي — محاولة بديلة...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$d=[Environment]::GetFolderPath('Desktop'); ^
     $s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d '🏛️ جودة الانطلاقة.lnk')); ^
     $exe=Join-Path '%~dp0' 'LaunchQuality.exe'; ^
     if(Test-Path $exe){$s.TargetPath=$exe}else{$s.TargetPath=(Join-Path '%~dp0' 'Run-LaunchQuality.bat')}; ^
     $s.WorkingDirectory='%~dp0'; ^
     $ico=Join-Path '%~dp0' 'AppIcon.ico'; ^
     if(Test-Path $ico){$s.IconLocation=$ico+',0'}; ^
     $s.Description='🏛️ جودة الانطلاقة · Launch Quality ERP'; ^
     $s.Save(); Write-Host 'OK'"
)
echo.
echo تم. ستجد على سطح المكتب: 🏛️ جودة الانطلاقة
echo الأيقونة كبيرة بنفس مقاس تطبيقات ويندوز (256).
pause
