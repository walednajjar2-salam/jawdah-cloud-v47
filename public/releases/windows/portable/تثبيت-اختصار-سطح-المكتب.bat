@echo off
chcp 65001 >nul
title تثبيت اختصار Launch Quality
set "APP_URL=https://web-production-08d73.up.railway.app/app.html"
set "DESKTOP=%USERPROFILE%\Desktop"
set "BAT=%~dp0تشغيل-جودة-الانطلاقة.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%DESKTOP%\Launch Quality.lnk'); ^
   $s.TargetPath='%~dp0تشغيل-جودة-الانطلاقة.bat'; ^
   $s.WorkingDirectory='%~dp0'; ^
   $s.WindowStyle=7; ^
   $s.Description='Launch Quality ERP'; ^
   $s.Save(); ^
   Write-Host 'تم إنشاء اختصار سطح المكتب بنجاح'"

echo.
echo تم التثبيت. يمكنك الآن فتح Launch Quality من سطح المكتب.
pause
