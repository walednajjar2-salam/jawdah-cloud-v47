# One-click Windows install: download/use local package + large emoji desktop icon
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$appUrl = "https://web-production-08d73.up.railway.app/app.html"
$portableUrl = "https://web-production-08d73.up.railway.app/lq-portable.zip"
$exeUrl = "https://web-production-08d73.up.railway.app/LaunchQuality.exe"
$work = Join-Path $env:LOCALAPPDATA "LaunchQuality"
$desktop = [Environment]::GetFolderPath("Desktop")
New-Item -ItemType Directory -Force -Path $work | Out-Null

Write-Host "جاري تثبيت جودة الانطلاقة على سطح المكتب..." -ForegroundColor Cyan

function New-DesktopIcon([string]$target, [string]$workDir, [string]$iconPath) {
  $name = "🏛️ جودة الانطلاقة.lnk"
  $path = Join-Path $desktop $name
  foreach ($old in @("Launch Quality.lnk", "LaunchQuality.lnk")) {
    $p = Join-Path $desktop $old
    if (Test-Path $p) { Remove-Item $p -Force -ErrorAction SilentlyContinue }
  }
  $wsh = New-Object -ComObject WScript.Shell
  $s = $wsh.CreateShortcut($path)
  $s.TargetPath = $target
  $s.WorkingDirectory = $workDir
  $s.WindowStyle = 1
  $s.Description = "🏛️ جودة الانطلاقة · Launch Quality ERP"
  if ($iconPath -and (Test-Path $iconPath)) { $s.IconLocation = "$iconPath,0" }
  $s.Save()
  return $path
}

try {
  $exePath = Join-Path $work "LaunchQuality.exe"
  $icoPath = Join-Path $work "AppIcon.ico"
  Invoke-WebRequest -Uri $exeUrl -OutFile $exePath -UseBasicParsing
  try {
    Invoke-WebRequest -Uri "https://web-production-08d73.up.railway.app/releases/windows/portable/AppIcon.ico" -OutFile $icoPath -UseBasicParsing
  } catch {}

  $shortcut = New-DesktopIcon -target $exePath -workDir $work -iconPath $icoPath
  Start-Process -FilePath $exePath
  Write-Host "تم التثبيت بنجاح: $shortcut" -ForegroundColor Green
}
catch {
  Write-Host "محاولة عبر ZIP..." -ForegroundColor Yellow
  try {
    $zipPath = Join-Path $work "LaunchQuality-Portable.zip"
    Invoke-WebRequest -Uri $portableUrl -OutFile $zipPath -UseBasicParsing
    $extract = Join-Path $work "app"
    if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
    Expand-Archive -Path $zipPath -DestinationPath $extract -Force
    $exe = Get-ChildItem -Path $extract -Filter "LaunchQuality.exe" -Recurse | Select-Object -First 1
    $ico = Get-ChildItem -Path $extract -Filter "AppIcon.ico" -Recurse | Select-Object -First 1
    if (-not $exe) { throw "EXE missing in zip" }
    $shortcut = New-DesktopIcon -target $exe.FullName -workDir $exe.DirectoryName -iconPath $(if ($ico) { $ico.FullName } else { "" })
    Start-Process -FilePath $exe.FullName
    Write-Host "تم التثبيت عبر ZIP: $shortcut" -ForegroundColor Green
  }
  catch {
    Write-Host "تعذر التثبيت — فتح النظام في المتصفح" -ForegroundColor Red
    Start-Process $appUrl
    throw
  }
}
