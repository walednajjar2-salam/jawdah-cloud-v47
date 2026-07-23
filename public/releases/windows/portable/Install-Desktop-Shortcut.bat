@echo off
chcp 65001 >nul
title Install Launch Quality shortcut
set "DESKTOP=%USERPROFILE%\Desktop"
set "TARGET=%~dp0Run-LaunchQuality.vbs"
if not exist "%TARGET%" set "TARGET=%~dp0Run-LaunchQuality.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%DESKTOP%\Launch Quality.lnk'); ^
   $s.TargetPath='%TARGET%'; ^
   $s.WorkingDirectory='%~dp0'; ^
   $s.WindowStyle=1; ^
   $s.Description='Launch Quality ERP - جودة الانطلاقة'; ^
   $s.Save(); ^
   Write-Host 'تم إنشاء اختصار سطح المكتب'"

echo.
echo Done. Use desktop shortcut: Launch Quality
pause
