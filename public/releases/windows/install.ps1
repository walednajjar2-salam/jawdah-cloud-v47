# Launch Quality — one-click Windows install helper
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$appUrl = "https://web-production-08d73.up.railway.app/app.html"
$installerUrl = "https://web-production-08d73.up.railway.app/lq-setup.exe"
$portableUrl = "https://web-production-08d73.up.railway.app/lq-portable.zip"
$work = Join-Path $env:LOCALAPPDATA "LaunchQuality"
New-Item -ItemType Directory -Force -Path $work | Out-Null

Write-Host "جاري تجهيز Launch Quality..." -ForegroundColor Cyan

try {
    $zipPath = Join-Path $work "LaunchQuality-Portable.zip"
    Invoke-WebRequest -Uri $portableUrl -OutFile $zipPath -UseBasicParsing
    $extract = Join-Path $work "portable"
    if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
    Expand-Archive -Path $zipPath -DestinationPath $extract -Force

    $bat = Get-ChildItem -Path $extract -Filter "*.bat" -Recurse |
        Where-Object { $_.Name -like "*تشغيل*" -or $_.Name -eq "run.bat" } |
        Select-Object -First 1

    if (-not $bat) {
        # fallback: create runner
        $batPath = Join-Path $extract "run.bat"
        @"
@echo off
start "" msedge --app=$appUrl
"@ | Set-Content -Path $batPath -Encoding ASCII
        $bat = Get-Item $batPath
    }

    $wsh = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath("Desktop")
    $lnk = $wsh.CreateShortcut((Join-Path $desktop "Launch Quality.lnk"))
    $lnk.TargetPath = $bat.FullName
    $lnk.WorkingDirectory = $bat.DirectoryName
    $lnk.WindowStyle = 7
    $lnk.Save()

    Start-Process -FilePath $bat.FullName
    Write-Host "تم التثبيت بنجاح. تم إنشاء اختصار سطح المكتب." -ForegroundColor Green
}
catch {
    Write-Host "تعذر التثبيت التلقائي، سيتم فتح النظام في المتصفح..." -ForegroundColor Yellow
    Start-Process $appUrl
    throw
}
