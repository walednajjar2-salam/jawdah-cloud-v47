@echo off
chcp 65001 >nul
title تثبيت جودة الانطلاقة على سطح المكتب
cd /d "%~dp0"

echo.
echo ============================================
echo   🏛️ جودة الانطلاقة — تثبيت سطح المكتب
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Desktop-Shortcut.ps1"
if errorlevel 1 goto :fallback
goto :done

:fallback
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$here='%~dp0'; $d=[Environment]::GetFolderPath('Desktop'); $exe=Join-Path $here 'LaunchQuality.exe'; $ico=Join-Path $here 'AppIcon.ico'; $name='🏛️ جودة الانطلاقة.lnk'; $p=Join-Path $d $name; $s=(New-Object -ComObject WScript.Shell).CreateShortcut($p); $s.TargetPath=$exe; $s.WorkingDirectory=$here; if(Test-Path $ico){$s.IconLocation=$ico+',0'}; $s.Description='🏛️ جودة الانطلاقة'; $s.Save(); Write-Host 'تم التثبيت'; Start-Process $exe"

:done
echo.
echo تم. افتح من سطح المكتب: 🏛️ جودة الانطلاقة
echo.
timeout /t 4 >nul
exit /b 0
